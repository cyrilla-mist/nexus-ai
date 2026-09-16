import { createHash } from "node:crypto";

import {
  getOutcomeCategoryDescriptorV01,
  validateOutcomeCategoryProposalV01,
} from "./writeback-outcome-category.mjs";

export const CROSS_SOURCE_POSTCONDITION_VERSION_V01 = "nexus-atlas.cross-source-postcondition.v0.1";
export const POSTCONDITION_PROOF_VERSION_V01 = "nexus-atlas.postcondition-proof.v0.1";
export const CROSS_SOURCE_VERIFICATION_VERSION_V01 = "nexus-atlas.cross-source-verification.v0.1";
export const POSTCONDITION_PROOF_AUTHORITY_V01 = "source-postcondition-proof";
export const CROSS_SOURCE_VERIFICATION_AUTHORITY_V01 = "cross-source-postcondition-verification";

const PROFILES = Object.freeze({
  github: Object.freeze({
    "phase6-outcome-v0.1": Object.freeze({
      categories: Object.freeze(["action-execution"]),
      conditionTypes: Object.freeze([
        "github-default-branch-head-advanced",
        "github-commit-present-after-baseline",
      ]),
      sourceAuthority: "accepted-phase6-outcome-verification",
    }),
  }),
  datahub: Object.freeze({
    "continuity-mcp-v0.9.5": Object.freeze({
      categories: Object.freeze([
        "action-execution",
        "milestone-transition",
        "decision-transition",
        "evidence-refresh",
      ]),
      conditionTypes: Object.freeze(["datahub-entity-status-equals"]),
      sourceAuthority: "datahub-read-only-metadata-state",
    }),
  }),
});

const CONDITION_KEYS = ["conditionType", "expectedValue"];
const PROPOSAL_KEYS = [
  "postconditionVersion",
  "postconditionId",
  "categoryProposalRef",
  "projectRef",
  "category",
  "subjectRef",
  "provider",
  "profile",
  "scopeRef",
  "declaredAt",
  "condition",
  "explanation",
];
const PROOF_KEYS = [
  "proofVersion",
  "proofId",
  "postconditionRef",
  "projectRef",
  "categoryProposalRef",
  "category",
  "subjectRef",
  "provider",
  "profile",
  "scopeRef",
  "observedAt",
  "condition",
  "result",
  "observedValue",
  "evidenceRefs",
  "sourceAuthority",
  "authority",
];
const VERIFICATION_KEYS = [
  "verificationVersion",
  "verificationId",
  "projectRef",
  "categoryProposalRef",
  "postconditionRef",
  "proofRef",
  "category",
  "subjectRef",
  "provider",
  "profile",
  "verifiedAt",
  "verificationState",
  "evidenceRefs",
  "authority",
  "capabilities",
];
const CAPABILITY_KEYS = [
  "writebackOutcomeAllowed",
  "checkpointAdvanceAuthority",
  "canonicalContextWriteAllowed",
];
const RESULTS = new Set(["satisfied", "not-satisfied", "unknown"]);
const VERIFICATION_STATE = Object.freeze({
  satisfied: "verified",
  "not-satisfied": "failed",
  unknown: "indeterminate",
});
const SHA = /^[0-9a-f]{40}$/;

export class CrossSourcePostconditionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CrossSourcePostconditionError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => Array.isArray(value)
  ? value.map(clone)
  : object(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]))
    : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code, message, details = {}) => { throw new CrossSourcePostconditionError(code, message, details); };

function boundedText(value, field, max = 1000) {
  if (typeof value !== "string" || !value.length || value !== value.trim() || value.length > max || /[\r\n]/.test(value)) {
    fail("INVALID_CROSS_SOURCE_POSTCONDITION", `${field} is invalid.`, { field });
  }
  return value;
}

function strictIso(value, field) {
  boundedText(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    fail("INVALID_CROSS_SOURCE_POSTCONDITION", `${field} must be a strict offset ISO timestamp.`, { field });
  }
  return value;
}

function uniqueRefs(value, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) fail("INVALID_CROSS_SOURCE_POSTCONDITION", `${field} is invalid.`, { field });
  const normalized = value.map((item, index) => boundedText(item, `${field}[${index}]`, 500));
  if (new Set(normalized).size !== normalized.length) fail("INVALID_CROSS_SOURCE_POSTCONDITION", `${field} contains duplicates.`, { field });
  return normalized;
}

function acceptedCategoryProposal(value) {
  try { return validateOutcomeCategoryProposalV01(value); }
  catch (error) { fail("INVALID_OUTCOME_CATEGORY_PROPOSAL", "Outcome category proposal failed the accepted Phase 7E validator.", { causeCode: error?.code ?? null }); }
}

function acceptedProfile(provider, profile) {
  boundedText(provider, "provider", 100);
  boundedText(profile, "profile", 100);
  const accepted = PROFILES[provider]?.[profile];
  if (!accepted) fail("UNSUPPORTED_SOURCE_PROFILE", "Source provider/profile is unsupported.", { provider, profile });
  return accepted;
}

function normalizeCondition(value, provider, profile, category) {
  if (!exact(value, CONDITION_KEYS)) fail("INVALID_CROSS_SOURCE_POSTCONDITION", "condition field set is invalid.");
  const accepted = acceptedProfile(provider, profile);
  if (!accepted.categories.includes(category)) fail("CATEGORY_SOURCE_PROFILE_MISMATCH", "Outcome category is not supported by this source profile.", { provider, profile, category });
  if (!accepted.conditionTypes.includes(value.conditionType)) fail("CONDITION_SOURCE_PROFILE_MISMATCH", "Postcondition type is not supported by this source profile.", { provider, profile, conditionType: value.conditionType });
  if (value.conditionType === "github-default-branch-head-advanced") {
    if (value.expectedValue !== null) fail("INVALID_CROSS_SOURCE_POSTCONDITION", "GitHub head-advanced requires expectedValue=null.");
  } else if (value.conditionType === "github-commit-present-after-baseline") {
    if (typeof value.expectedValue !== "string" || !SHA.test(value.expectedValue)) fail("INVALID_CROSS_SOURCE_POSTCONDITION", "GitHub commit-present requires a lowercase 40-character SHA expectedValue.");
  } else {
    boundedText(value.expectedValue, "condition.expectedValue", 500);
  }
  return clone(value);
}

function proposalPayload(value) {
  const { postconditionId: _postconditionId, ...payload } = value;
  return payload;
}

export function validateCrossSourcePostconditionProposalV01(value) {
  const code = "INVALID_CROSS_SOURCE_POSTCONDITION_PROPOSAL";
  if (!exact(value, PROPOSAL_KEYS) || value.postconditionVersion !== CROSS_SOURCE_POSTCONDITION_VERSION_V01) fail(code, "Cross-source postcondition proposal field set/version is invalid.");
  for (const field of ["postconditionId", "categoryProposalRef", "projectRef", "category", "subjectRef", "provider", "profile", "scopeRef"]) boundedText(value[field], field, 500);
  strictIso(value.declaredAt, "declaredAt");
  boundedText(value.explanation, "explanation", 1800);
  getOutcomeCategoryDescriptorV01(value.category);
  normalizeCondition(value.condition, value.provider, value.profile, value.category);
  const expectedId = `cross-source-postcondition:${digest(proposalPayload(value)).slice(0, 24)}`;
  if (value.postconditionId !== expectedId) fail(code, "postconditionId does not bind normalized proposal content.");
  return deepFreeze(clone(value));
}

export function buildCrossSourcePostconditionProposalV01({
  categoryProposal,
  provider,
  profile,
  scopeRef,
  declaredAt,
  condition,
  explanation,
} = {}) {
  const category = acceptedCategoryProposal(categoryProposal);
  acceptedProfile(provider, profile);
  const payload = {
    postconditionVersion: CROSS_SOURCE_POSTCONDITION_VERSION_V01,
    categoryProposalRef: category.proposalId,
    projectRef: category.projectRef,
    category: category.category,
    subjectRef: category.subjectRef,
    provider: boundedText(provider, "provider", 100),
    profile: boundedText(profile, "profile", 100),
    scopeRef: boundedText(scopeRef, "scopeRef", 500),
    declaredAt: strictIso(declaredAt, "declaredAt"),
    condition: normalizeCondition(condition, provider, profile, category.category),
    explanation: boundedText(explanation, "explanation", 1800),
  };
  if (Date.parse(payload.declaredAt) < Date.parse(category.proposedAt)) fail("INVALID_CROSS_SOURCE_POSTCONDITION", "declaredAt cannot predate the Outcome category proposal.");
  return validateCrossSourcePostconditionProposalV01({
    ...payload,
    postconditionId: `cross-source-postcondition:${digest(payload).slice(0, 24)}`,
  });
}

function proofPayload(value) {
  const { proofId: _proofId, ...payload } = value;
  return payload;
}

export function validatePostconditionProofV01(value) {
  const code = "INVALID_POSTCONDITION_PROOF";
  if (!exact(value, PROOF_KEYS) || value.proofVersion !== POSTCONDITION_PROOF_VERSION_V01 || value.authority !== POSTCONDITION_PROOF_AUTHORITY_V01) fail(code, "Postcondition proof field set/version/authority is invalid.");
  for (const field of ["proofId", "postconditionRef", "projectRef", "categoryProposalRef", "category", "subjectRef", "provider", "profile", "scopeRef", "sourceAuthority"]) boundedText(value[field], field, 500);
  strictIso(value.observedAt, "observedAt");
  const profile = acceptedProfile(value.provider, value.profile);
  normalizeCondition(value.condition, value.provider, value.profile, value.category);
  if (value.sourceAuthority !== profile.sourceAuthority) fail(code, "sourceAuthority does not match the accepted source profile.");
  if (!RESULTS.has(value.result)) fail(code, "proof result is unsupported.");
  if (value.observedValue !== null) boundedText(value.observedValue, "observedValue", 1000);
  uniqueRefs(value.evidenceRefs, "evidenceRefs", { allowEmpty: true });
  if (value.result === "satisfied" && value.evidenceRefs.length === 0) fail(code, "Satisfied proof requires at least one source-local evidence reference.");
  const expectedId = `postcondition-proof:${digest(proofPayload(value)).slice(0, 24)}`;
  if (value.proofId !== expectedId) fail(code, "proofId does not bind normalized proof content.");
  return deepFreeze(clone(value));
}

export function buildBoundPostconditionProofV01({
  postconditionProposal,
  observedAt,
  result,
  observedValue,
  evidenceRefs = [],
  sourceAuthority,
} = {}) {
  const proposal = validateCrossSourcePostconditionProposalV01(postconditionProposal);
  const profile = acceptedProfile(proposal.provider, proposal.profile);
  if (sourceAuthority !== profile.sourceAuthority) fail("INVALID_POSTCONDITION_PROOF", "Provider adapter supplied the wrong sourceAuthority.");
  const payload = {
    proofVersion: POSTCONDITION_PROOF_VERSION_V01,
    postconditionRef: proposal.postconditionId,
    projectRef: proposal.projectRef,
    categoryProposalRef: proposal.categoryProposalRef,
    category: proposal.category,
    subjectRef: proposal.subjectRef,
    provider: proposal.provider,
    profile: proposal.profile,
    scopeRef: proposal.scopeRef,
    observedAt: strictIso(observedAt, "observedAt"),
    condition: clone(proposal.condition),
    result,
    observedValue: observedValue === null ? null : boundedText(observedValue, "observedValue", 1000),
    evidenceRefs: uniqueRefs(evidenceRefs, "evidenceRefs", { allowEmpty: true }),
    sourceAuthority,
    authority: POSTCONDITION_PROOF_AUTHORITY_V01,
  };
  return validatePostconditionProofV01({ ...payload, proofId: `postcondition-proof:${digest(payload).slice(0, 24)}` });
}

function verificationPayload(value) {
  const { verificationId: _verificationId, ...payload } = value;
  return payload;
}

export function validateCrossSourceVerificationV01(value) {
  const code = "INVALID_CROSS_SOURCE_VERIFICATION";
  if (!exact(value, VERIFICATION_KEYS) || value.verificationVersion !== CROSS_SOURCE_VERIFICATION_VERSION_V01 || value.authority !== CROSS_SOURCE_VERIFICATION_AUTHORITY_V01) fail(code, "Cross-source verification field set/version/authority is invalid.");
  for (const field of ["verificationId", "projectRef", "categoryProposalRef", "postconditionRef", "proofRef", "category", "subjectRef", "provider", "profile"]) boundedText(value[field], field, 500);
  strictIso(value.verifiedAt, "verifiedAt");
  if (!["verified", "failed", "indeterminate"].includes(value.verificationState)) fail(code, "verificationState is unsupported.");
  uniqueRefs(value.evidenceRefs, "evidenceRefs", { allowEmpty: true });
  if (value.verificationState === "verified" && value.evidenceRefs.length === 0) fail(code, "Verified cross-source result requires evidence.");
  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail(code, "capabilities field set is invalid.");
  if (
    value.capabilities.writebackOutcomeAllowed !== false
    || value.capabilities.checkpointAdvanceAuthority !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
  ) fail(code, "Phase 7F verification must remain non-writing and non-authoritative.");
  const expectedId = `cross-source-verification:${digest(verificationPayload(value)).slice(0, 24)}`;
  if (value.verificationId !== expectedId) fail(code, "verificationId does not bind normalized verification content.");
  return deepFreeze(clone(value));
}

export function buildCrossSourceVerificationV01({
  categoryProposal,
  postconditionProposal,
  proof,
  verifiedAt,
} = {}) {
  const category = acceptedCategoryProposal(categoryProposal);
  const postcondition = validateCrossSourcePostconditionProposalV01(postconditionProposal);
  const acceptedProof = validatePostconditionProofV01(proof);
  if (
    postcondition.categoryProposalRef !== category.proposalId
    || postcondition.projectRef !== category.projectRef
    || postcondition.category !== category.category
    || postcondition.subjectRef !== category.subjectRef
  ) fail("CROSS_SOURCE_BINDING_MISMATCH", "Postcondition does not bind the supplied Outcome category proposal.");
  if (
    acceptedProof.postconditionRef !== postcondition.postconditionId
    || acceptedProof.categoryProposalRef !== category.proposalId
    || acceptedProof.projectRef !== category.projectRef
    || acceptedProof.category !== category.category
    || acceptedProof.subjectRef !== category.subjectRef
    || acceptedProof.provider !== postcondition.provider
    || acceptedProof.profile !== postcondition.profile
    || acceptedProof.scopeRef !== postcondition.scopeRef
    || !same(acceptedProof.condition, postcondition.condition)
  ) fail("CROSS_SOURCE_BINDING_MISMATCH", "Proof does not bind the supplied postcondition/category boundary.");
  if (Date.parse(acceptedProof.observedAt) < Date.parse(postcondition.declaredAt)) fail("STALE_POSTCONDITION_PROOF", "Proof observation predates the declared postcondition boundary.");
  const at = strictIso(verifiedAt, "verifiedAt");
  if (Date.parse(at) < Date.parse(acceptedProof.observedAt)) fail("INVALID_CROSS_SOURCE_POSTCONDITION", "verifiedAt cannot predate proof observation.");
  const payload = {
    verificationVersion: CROSS_SOURCE_VERIFICATION_VERSION_V01,
    projectRef: category.projectRef,
    categoryProposalRef: category.proposalId,
    postconditionRef: postcondition.postconditionId,
    proofRef: acceptedProof.proofId,
    category: category.category,
    subjectRef: category.subjectRef,
    provider: postcondition.provider,
    profile: postcondition.profile,
    verifiedAt: at,
    verificationState: VERIFICATION_STATE[acceptedProof.result],
    evidenceRefs: clone(acceptedProof.evidenceRefs),
    authority: CROSS_SOURCE_VERIFICATION_AUTHORITY_V01,
    capabilities: {
      writebackOutcomeAllowed: false,
      checkpointAdvanceAuthority: false,
      canonicalContextWriteAllowed: false,
    },
  };
  return validateCrossSourceVerificationV01({
    ...payload,
    verificationId: `cross-source-verification:${digest(payload).slice(0, 24)}`,
  });
}
