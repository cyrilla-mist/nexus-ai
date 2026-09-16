import { createHash } from "node:crypto";

export const OUTCOME_CATEGORY_VERSION_V01 = "nexus-atlas.outcome-category.v0.1";
export const OUTCOME_CATEGORY_PROPOSAL_VERSION_V01 = "nexus-atlas.outcome-category-proposal.v0.1";

const CATEGORIES = Object.freeze({
  "action-execution": Object.freeze({
    contextKind: "action",
    semantics: "Observed result of a bounded action attempt.",
    humanAuthority: "conditional",
  }),
  "milestone-transition": Object.freeze({
    contextKind: "milestone",
    semantics: "Observed transition of a bounded project milestone state.",
    humanAuthority: "conditional",
  }),
  "decision-transition": Object.freeze({
    contextKind: "decision",
    semantics: "Explicit resolution, supersession, or revocation of a governed decision.",
    humanAuthority: "required",
  }),
  "evidence-refresh": Object.freeze({
    contextKind: "evidence",
    semantics: "Fresh verification that updates the observed applicability or result of evidence.",
    humanAuthority: "not-required",
  }),
});

const DESCRIPTOR_KEYS = [
  "categoryVersion",
  "categoryId",
  "category",
  "contextKind",
  "semantics",
  "requirements",
  "capabilities",
];
const REQUIREMENT_KEYS = [
  "freshAuthoritativeVerification",
  "humanAuthority",
  "canonicalAdmissionForContextWrite",
];
const CAPABILITY_KEYS = [
  "classificationOnly",
  "checkpointAdvanceAuthority",
  "canonicalContextWriteAllowed",
];
const PROPOSAL_KEYS = [
  "proposalVersion",
  "proposalId",
  "projectRef",
  "category",
  "subjectRef",
  "proposedAt",
  "basisRefs",
  "evidenceRefs",
  "humanAuthorityRef",
  "explanation",
];

export class OutcomeCategoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutcomeCategoryError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => Array.isArray(value)
  ? value.map(clone)
  : isObject(value)
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
const fail = (code, message, details = {}) => { throw new OutcomeCategoryError(code, message, details); };

function exact(value, keys) {
  return isObject(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

function boundedText(value, field, max = 1000) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > max
    || value !== value.trim()
    || /[\r\n]/.test(value)
  ) fail("INVALID_OUTCOME_CATEGORY_INPUT", `${field} is invalid.`, { field });
  return value;
}

function strictIso(value, field) {
  boundedText(value, field, 64);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || Number.isNaN(Date.parse(value))
  ) fail("INVALID_OUTCOME_CATEGORY_INPUT", `${field} must be a strict offset ISO timestamp.`, { field });
  return value;
}

function uniqueRefs(value, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail("INVALID_OUTCOME_CATEGORY_INPUT", `${field} must be ${allowEmpty ? "an array" : "a non-empty array"}.`, { field });
  }
  const normalized = value.map((item, index) => boundedText(item, `${field}[${index}]`, 500));
  if (new Set(normalized).size !== normalized.length) fail("INVALID_OUTCOME_CATEGORY_INPUT", `${field} must contain unique refs.`, { field });
  return normalized;
}

function descriptorPayload(category) {
  const spec = CATEGORIES[category];
  if (!spec) fail("UNSUPPORTED_OUTCOME_CATEGORY", "Outcome category is unsupported.", { category });
  return {
    categoryVersion: OUTCOME_CATEGORY_VERSION_V01,
    category,
    contextKind: spec.contextKind,
    semantics: spec.semantics,
    requirements: {
      freshAuthoritativeVerification: true,
      humanAuthority: spec.humanAuthority,
      canonicalAdmissionForContextWrite: true,
    },
    capabilities: {
      classificationOnly: true,
      checkpointAdvanceAuthority: false,
      canonicalContextWriteAllowed: false,
    },
  };
}

export function validateOutcomeCategoryDescriptorV01(value) {
  const code = "INVALID_OUTCOME_CATEGORY_DESCRIPTOR";
  if (!exact(value, DESCRIPTOR_KEYS) || value.categoryVersion !== OUTCOME_CATEGORY_VERSION_V01) fail(code, "Outcome category descriptor field set/version is invalid.");
  const expected = descriptorPayload(value.category);
  if (value.contextKind !== expected.contextKind || value.semantics !== expected.semantics) fail(code, "Outcome category semantics do not match the frozen registry.");
  if (!exact(value.requirements, REQUIREMENT_KEYS)) fail(code, "Outcome category requirements field set is invalid.");
  if (
    value.requirements.freshAuthoritativeVerification !== true
    || value.requirements.humanAuthority !== expected.requirements.humanAuthority
    || value.requirements.canonicalAdmissionForContextWrite !== true
  ) fail(code, "Outcome category requirements weaken or alter the frozen registry.");
  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail(code, "Outcome category capabilities field set is invalid.");
  if (
    value.capabilities.classificationOnly !== true
    || value.capabilities.checkpointAdvanceAuthority !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
  ) fail(code, "Outcome category capabilities must remain non-authoritative.");
  const payload = { ...expected };
  const expectedId = `outcome-category:${digest(payload).slice(0, 24)}`;
  if (value.categoryId !== expectedId) fail(code, "categoryId does not bind normalized category content.");
  return deepFreeze(clone(value));
}

export function getOutcomeCategoryDescriptorV01(category) {
  boundedText(category, "category", 100);
  const payload = descriptorPayload(category);
  return validateOutcomeCategoryDescriptorV01({
    ...payload,
    categoryId: `outcome-category:${digest(payload).slice(0, 24)}`,
  });
}

export function listOutcomeCategoryDescriptorsV01() {
  return deepFreeze(Object.keys(CATEGORIES).sort().map(getOutcomeCategoryDescriptorV01));
}

function proposalPayload(value) {
  const { proposalId: _proposalId, ...payload } = value;
  return payload;
}

export function validateOutcomeCategoryProposalV01(value) {
  const code = "INVALID_OUTCOME_CATEGORY_PROPOSAL";
  if (!exact(value, PROPOSAL_KEYS) || value.proposalVersion !== OUTCOME_CATEGORY_PROPOSAL_VERSION_V01) fail(code, "Outcome category proposal field set/version is invalid.");
  const descriptor = getOutcomeCategoryDescriptorV01(value.category);
  boundedText(value.proposalId, "proposalId", 500);
  boundedText(value.projectRef, "projectRef", 500);
  boundedText(value.subjectRef, "subjectRef", 500);
  strictIso(value.proposedAt, "proposedAt");
  uniqueRefs(value.basisRefs, "basisRefs");
  uniqueRefs(value.evidenceRefs, "evidenceRefs", { allowEmpty: true });
  boundedText(value.explanation, "explanation", 1800);
  if (value.humanAuthorityRef !== null) boundedText(value.humanAuthorityRef, "humanAuthorityRef", 500);
  if (descriptor.requirements.humanAuthority === "required" && value.humanAuthorityRef === null) {
    fail("HUMAN_AUTHORITY_REQUIRED", "This Outcome category requires an explicit Human Authority reference.", { category: value.category });
  }
  const expectedId = `outcome-category-proposal:${digest(proposalPayload(value)).slice(0, 24)}`;
  if (value.proposalId !== expectedId) fail(code, "proposalId does not bind normalized proposal content.");
  return deepFreeze(clone(value));
}

export function buildOutcomeCategoryProposalV01({
  projectRef,
  category,
  subjectRef,
  proposedAt,
  basisRefs,
  evidenceRefs = [],
  humanAuthorityRef = null,
  explanation,
} = {}) {
  getOutcomeCategoryDescriptorV01(category);
  const payload = {
    proposalVersion: OUTCOME_CATEGORY_PROPOSAL_VERSION_V01,
    projectRef: boundedText(projectRef, "projectRef", 500),
    category,
    subjectRef: boundedText(subjectRef, "subjectRef", 500),
    proposedAt: strictIso(proposedAt, "proposedAt"),
    basisRefs: uniqueRefs(basisRefs, "basisRefs"),
    evidenceRefs: uniqueRefs(evidenceRefs, "evidenceRefs", { allowEmpty: true }),
    humanAuthorityRef: humanAuthorityRef === null ? null : boundedText(humanAuthorityRef, "humanAuthorityRef", 500),
    explanation: boundedText(explanation, "explanation", 1800),
  };
  return validateOutcomeCategoryProposalV01({
    ...payload,
    proposalId: `outcome-category-proposal:${digest(payload).slice(0, 24)}`,
  });
}
