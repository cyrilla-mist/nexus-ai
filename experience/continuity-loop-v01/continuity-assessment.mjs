import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "./trusted-checkpoint-validator.mjs";
import { validateFreshEvidenceWindowV01 } from "./fresh-evidence-window-validator.mjs";

export const CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01 = "nexus-atlas.continuity-assessment-proposal.v0.1";
export const CONTINUITY_ASSESSMENT_VERSION_V01 = "nexus-atlas.continuity-assessment.v0.1";
export const CONTINUITY_ASSESSMENT_AUTHORITY_V01 = "derived-continuity-assessment";

const VALIDITIES = new Set(["VALID", "INVALID", "AMBIGUOUS"]);
const CLAIM_TYPES = new Set(["trusted-direction", "active-objective", "accepted-next-action"]);
const AMBIGUITY_KINDS = new Set(["protected-intent-conflict", "consequential-choice"]);
const PROPOSAL_KEYS = [
  "proposalVersion",
  "checkpointRef",
  "evidenceWindowRef",
  "validity",
  "preservedClaims",
  "invalidatedClaims",
  "invalidatedNextActions",
  "unresolvedProtectedAmbiguity",
  "explanation",
];
const FINDING_KEYS = ["claimRef", "claimType", "summary", "evidenceRefs"];
const ACTION_KEYS = ["actionRef", "summary", "evidenceRefs"];
const AMBIGUITY_KEYS = ["ambiguityRef", "ambiguityKind", "protectedRef", "summary", "evidenceRefs"];
const ASSESSMENT_KEYS = [
  "assessmentVersion",
  "assessmentId",
  "projectRef",
  "checkpointRef",
  "evidenceWindowRef",
  "observedAt",
  "validity",
  "preservedClaims",
  "invalidatedClaims",
  "invalidatedNextActions",
  "unresolvedProtectedAmbiguity",
  "evidenceRefs",
  "explanation",
  "authority",
  "capabilities",
];
const CAPABILITY_KEYS = ["humanAuthorityRequired", "reentryPackageAllowed"];
const SUMMARY_MAX = 500;
const EXPLANATION_MAX = 2000;

export class ContinuityAssessmentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContinuityAssessmentError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (code, message, details = {}) => { throw new ContinuityAssessmentError(code, message, details); };
const boundedText = (value, max, label, code = "INVALID_ASSESSMENT_PROPOSAL") => {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim()) fail(code, `${label} is invalid.`);
  return value;
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function acceptedCheckpoint(checkpoint) {
  try {
    return validateTrustedCheckpointV01(checkpoint);
  } catch (error) {
    fail("INVALID_TRUSTED_CHECKPOINT", "checkpoint failed the accepted Trusted Checkpoint validator.", { causeCode: error?.code });
  }
}

function acceptedWindow(freshEvidenceWindow) {
  try {
    return validateFreshEvidenceWindowV01(freshEvidenceWindow);
  } catch (error) {
    fail("INVALID_FRESH_EVIDENCE_WINDOW", "freshEvidenceWindow failed the accepted Fresh Evidence Window validator.", { causeCode: error?.code });
  }
}

function surfaceRefs(checkpoint) {
  return Object.freeze({
    "trusted-direction": `${checkpoint.checkpointId}#trusted-direction`,
    "active-objective": `${checkpoint.checkpointId}#active-objective`,
    "accepted-next-action": `${checkpoint.checkpointId}#accepted-next-action`,
  });
}

function validateEvidenceRefs(refs, evidenceIds, label, code = "ASSESSMENT_EVIDENCE_INVALID") {
  if (!Array.isArray(refs) || refs.length === 0) fail(code, `${label} must contain accepted fresh evidence identities.`);
  const seen = new Set();
  for (const ref of refs) {
    if (typeof ref !== "string" || !evidenceIds.has(ref)) fail(code, `${label} contains an evidence identity outside the current Fresh Evidence Window.`, { evidenceRef: ref });
    if (seen.has(ref)) fail(code, `${label} contains duplicate evidence identities.`, { evidenceRef: ref });
    seen.add(ref);
  }
  return refs;
}

function validateFinding(raw, surfaces, evidenceIds, label) {
  if (!exact(raw, FINDING_KEYS)) fail("INVALID_ASSESSMENT_PROPOSAL", `${label} field set is invalid.`);
  if (!CLAIM_TYPES.has(raw.claimType)) fail("INVALID_ASSESSMENT_PROPOSAL", `${label}.claimType is invalid.`);
  if (raw.claimRef !== surfaces[raw.claimType]) fail("INVALID_ASSESSMENT_PROPOSAL", `${label}.claimRef does not match the accepted checkpoint surface.`);
  boundedText(raw.summary, SUMMARY_MAX, `${label}.summary`);
  validateEvidenceRefs(raw.evidenceRefs, evidenceIds, `${label}.evidenceRefs`);
  return clone(raw);
}

function validateAction(raw, checkpoint, evidenceIds, label) {
  if (!exact(raw, ACTION_KEYS)) fail("INVALID_ASSESSMENT_PROPOSAL", `${label} field set is invalid.`);
  if (raw.actionRef !== checkpoint.acceptedNextAction.actionRef) fail("INVALID_ASSESSMENT_PROPOSAL", `${label}.actionRef is not the checkpoint's accepted next action.`);
  boundedText(raw.summary, SUMMARY_MAX, `${label}.summary`);
  validateEvidenceRefs(raw.evidenceRefs, evidenceIds, `${label}.evidenceRefs`);
  return clone(raw);
}

function validateAmbiguity(raw, surfaces, evidenceIds) {
  if (raw === null) return null;
  if (!exact(raw, AMBIGUITY_KEYS)) fail("INVALID_ASSESSMENT_PROPOSAL", "unresolvedProtectedAmbiguity field set is invalid.");
  boundedText(raw.ambiguityRef, 200, "unresolvedProtectedAmbiguity.ambiguityRef");
  if (!AMBIGUITY_KINDS.has(raw.ambiguityKind)) fail("INVALID_ASSESSMENT_PROPOSAL", "unresolvedProtectedAmbiguity.ambiguityKind is invalid.");
  if (!Object.values(surfaces).includes(raw.protectedRef)) fail("INVALID_ASSESSMENT_PROPOSAL", "unresolvedProtectedAmbiguity.protectedRef is not an accepted checkpoint surface.");
  boundedText(raw.summary, SUMMARY_MAX, "unresolvedProtectedAmbiguity.summary");
  validateEvidenceRefs(raw.evidenceRefs, evidenceIds, "unresolvedProtectedAmbiguity.evidenceRefs");
  return clone(raw);
}

function claimTypeFromRef(ref, surfaces) {
  return Object.entries(surfaces).find(([, value]) => value === ref)?.[0] ?? null;
}

function assertNoDuplicateClaimTypes(findings, label) {
  const seen = new Set();
  for (const finding of findings) {
    if (seen.has(finding.claimType)) fail("INVALID_ASSESSMENT_PROPOSAL", `${label} contains a duplicate checkpoint surface.`, { claimType: finding.claimType });
    seen.add(finding.claimType);
  }
}

function stateSemantics({ validity, preservedClaims, invalidatedClaims, invalidatedNextActions, ambiguity, surfaces }) {
  const preserved = new Set(preservedClaims.map(item => item.claimType));
  const invalidated = new Set(invalidatedClaims.map(item => item.claimType));
  for (const type of preserved) if (invalidated.has(type)) fail("INVALID_ASSESSMENT_STATE", "a checkpoint surface cannot be both preserved and invalidated.", { claimType: type });
  if (invalidatedNextActions.length > 1) fail("INVALID_ASSESSMENT_STATE", "v0.1 accepts at most one invalidated next action.");

  const all = ["trusted-direction", "active-objective", "accepted-next-action"];
  if (validity === "VALID") {
    if (invalidatedClaims.length !== 0 || invalidatedNextActions.length !== 0 || ambiguity !== null || preservedClaims.length !== 3 || all.some(type => !preserved.has(type))) {
      fail("INVALID_ASSESSMENT_STATE", "VALID requires all continuation surfaces preserved and no invalidation/ambiguity.");
    }
    return;
  }

  if (validity === "INVALID") {
    if (ambiguity !== null || invalidatedNextActions.length !== 1 || !preserved.has("trusted-direction") || !preserved.has("active-objective") || preserved.has("accepted-next-action") || invalidated.has("trusted-direction") || invalidated.has("active-objective") || !invalidated.has("accepted-next-action")) {
      fail("INVALID_ASSESSMENT_STATE", "INVALID must preserve protected direction/objective and invalidate only the current next-action surface without ambiguity.");
    }
    return;
  }

  if (ambiguity === null) fail("INVALID_ASSESSMENT_STATE", "AMBIGUOUS requires exactly one unresolved protected ambiguity.");
  const protectedType = claimTypeFromRef(ambiguity.protectedRef, surfaces);
  if (ambiguity.ambiguityKind === "protected-intent-conflict") {
    if (!["trusted-direction", "active-objective"].includes(protectedType) || !invalidated.has(protectedType) || preserved.has(protectedType)) {
      fail("INVALID_ASSESSMENT_STATE", "protected-intent-conflict must point to the invalidated protected checkpoint surface.");
    }
    const protectedInvalidations = invalidatedClaims.filter(item => ["trusted-direction", "active-objective"].includes(item.claimType));
    if (protectedInvalidations.length !== 1 || protectedInvalidations[0].claimType !== protectedType) fail("INVALID_ASSESSMENT_STATE", "one bounded ambiguity cannot resolve multiple protected-intent conflicts.");
  } else {
    if (protectedType !== "accepted-next-action" || preserved.has("accepted-next-action")) fail("INVALID_ASSESSMENT_STATE", "consequential-choice must remain unresolved on the accepted-next-action surface.");
    if (invalidated.has("trusted-direction") || invalidated.has("active-objective")) fail("INVALID_ASSESSMENT_STATE", "consequential-choice cannot hide an unresolved protected direction/objective conflict.");
  }
}

function unionEvidence({ preservedClaims, invalidatedClaims, invalidatedNextActions, ambiguity }) {
  const result = [];
  const seen = new Set();
  const add = refs => {
    for (const ref of refs) if (!seen.has(ref)) {
      seen.add(ref);
      result.push(ref);
    }
  };
  for (const item of preservedClaims) add(item.evidenceRefs);
  for (const item of invalidatedClaims) add(item.evidenceRefs);
  for (const item of invalidatedNextActions) add(item.evidenceRefs);
  if (ambiguity) add(ambiguity.evidenceRefs);
  return result;
}

function outputPayload(assessment) {
  const { assessmentId: _assessmentId, ...payload } = assessment;
  return payload;
}

export function validateContinuityAssessmentV01(assessment) {
  if (!exact(assessment, ASSESSMENT_KEYS)) fail("INVALID_CONTINUITY_ASSESSMENT", "assessment field set is invalid.");
  if (assessment.assessmentVersion !== CONTINUITY_ASSESSMENT_VERSION_V01 || assessment.authority !== CONTINUITY_ASSESSMENT_AUTHORITY_V01 || !VALIDITIES.has(assessment.validity)) fail("INVALID_CONTINUITY_ASSESSMENT", "assessment version/authority/validity is invalid.");
  for (const key of ["projectRef", "checkpointRef", "evidenceWindowRef", "observedAt", "explanation"]) if (typeof assessment[key] !== "string" || assessment[key].length === 0) fail("INVALID_CONTINUITY_ASSESSMENT", `${key} is invalid.`);
  if (![assessment.preservedClaims, assessment.invalidatedClaims, assessment.invalidatedNextActions, assessment.evidenceRefs].every(Array.isArray)) fail("INVALID_CONTINUITY_ASSESSMENT", "assessment arrays are invalid.");
  if (!exact(assessment.capabilities, CAPABILITY_KEYS) || typeof assessment.capabilities.humanAuthorityRequired !== "boolean" || typeof assessment.capabilities.reentryPackageAllowed !== "boolean") fail("INVALID_CONTINUITY_ASSESSMENT", "assessment capabilities are invalid.");
  const humanRequired = assessment.validity === "AMBIGUOUS";
  if (assessment.capabilities.humanAuthorityRequired !== humanRequired || assessment.capabilities.reentryPackageAllowed !== !humanRequired) fail("INVALID_CONTINUITY_ASSESSMENT", "assessment capabilities do not match validity.");
  if (humanRequired !== (assessment.unresolvedProtectedAmbiguity !== null)) fail("INVALID_CONTINUITY_ASSESSMENT", "assessment ambiguity does not match validity.");
  const expectedId = `continuity-assessment:${digest(outputPayload(assessment)).slice(0, 24)}`;
  if (assessment.assessmentId !== expectedId) fail("INVALID_CONTINUITY_ASSESSMENT", "assessmentId does not bind the normalized assessment payload.");
  return deepFreeze(clone(assessment));
}

export function buildContinuityAssessmentV01({ checkpoint, freshEvidenceWindow, assessmentProposal } = {}) {
  const acceptedCheckpointValue = acceptedCheckpoint(checkpoint);
  const acceptedWindowValue = acceptedWindow(freshEvidenceWindow);
  if (acceptedWindowValue.status !== "complete" || acceptedWindowValue.capabilities.assessmentAllowed !== true) fail("ASSESSMENT_EVIDENCE_BLOCKED", "continuity assessment requires a complete Fresh Evidence Window.", { blockedReason: acceptedWindowValue.blockedReason });
  if (acceptedWindowValue.projectRef !== acceptedCheckpointValue.projectRef || acceptedWindowValue.checkpointRef !== acceptedCheckpointValue.checkpointId || !same(acceptedWindowValue.cursorFrom, acceptedCheckpointValue.evidenceCursor)) {
    fail("ASSESSMENT_BINDING_MISMATCH", "checkpoint and Fresh Evidence Window are not bound to the same continuation boundary.");
  }

  if (!exact(assessmentProposal, PROPOSAL_KEYS) || assessmentProposal.proposalVersion !== CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01 || !VALIDITIES.has(assessmentProposal.validity)) {
    fail("INVALID_ASSESSMENT_PROPOSAL", "assessmentProposal field set/version/validity is invalid.");
  }
  if (assessmentProposal.checkpointRef !== acceptedCheckpointValue.checkpointId || assessmentProposal.evidenceWindowRef !== acceptedWindowValue.windowId) fail("ASSESSMENT_BINDING_MISMATCH", "assessmentProposal does not target the accepted checkpoint/window.");
  boundedText(assessmentProposal.explanation, EXPLANATION_MAX, "assessmentProposal.explanation");
  if (!Array.isArray(assessmentProposal.preservedClaims) || !Array.isArray(assessmentProposal.invalidatedClaims) || !Array.isArray(assessmentProposal.invalidatedNextActions)) fail("INVALID_ASSESSMENT_PROPOSAL", "assessmentProposal finding arrays are invalid.");

  const surfaces = surfaceRefs(acceptedCheckpointValue);
  const evidenceIds = new Set(acceptedWindowValue.records.map(record => record.sourceRecordId));
  const preservedClaims = assessmentProposal.preservedClaims.map((raw, index) => validateFinding(raw, surfaces, evidenceIds, `preservedClaims[${index}]`));
  const invalidatedClaims = assessmentProposal.invalidatedClaims.map((raw, index) => validateFinding(raw, surfaces, evidenceIds, `invalidatedClaims[${index}]`));
  const invalidatedNextActions = assessmentProposal.invalidatedNextActions.map((raw, index) => validateAction(raw, acceptedCheckpointValue, evidenceIds, `invalidatedNextActions[${index}]`));
  const ambiguity = validateAmbiguity(assessmentProposal.unresolvedProtectedAmbiguity, surfaces, evidenceIds);
  assertNoDuplicateClaimTypes(preservedClaims, "preservedClaims");
  assertNoDuplicateClaimTypes(invalidatedClaims, "invalidatedClaims");

  stateSemantics({
    validity: assessmentProposal.validity,
    preservedClaims,
    invalidatedClaims,
    invalidatedNextActions,
    ambiguity,
    surfaces,
  });

  const evidenceRefs = unionEvidence({ preservedClaims, invalidatedClaims, invalidatedNextActions, ambiguity });
  if (evidenceRefs.length === 0) fail("ASSESSMENT_EVIDENCE_INVALID", "accepted assessment must contain fresh evidence linkage.");

  const payload = {
    assessmentVersion: CONTINUITY_ASSESSMENT_VERSION_V01,
    projectRef: acceptedCheckpointValue.projectRef,
    checkpointRef: acceptedCheckpointValue.checkpointId,
    evidenceWindowRef: acceptedWindowValue.windowId,
    observedAt: acceptedWindowValue.observedAt,
    validity: assessmentProposal.validity,
    preservedClaims,
    invalidatedClaims,
    invalidatedNextActions,
    unresolvedProtectedAmbiguity: ambiguity,
    evidenceRefs,
    explanation: assessmentProposal.explanation,
    authority: CONTINUITY_ASSESSMENT_AUTHORITY_V01,
    capabilities: {
      humanAuthorityRequired: assessmentProposal.validity === "AMBIGUOUS",
      reentryPackageAllowed: assessmentProposal.validity !== "AMBIGUOUS",
    },
  };

  return validateContinuityAssessmentV01({
    ...payload,
    assessmentId: `continuity-assessment:${digest(payload).slice(0, 24)}`,
  });
}
