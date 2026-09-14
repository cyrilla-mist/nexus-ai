export const TRUSTED_CHECKPOINT_SCHEMA_V01 = "nexus-atlas.trusted-checkpoint.v0.1";
export const INITIAL_ALIGNMENT_SCHEMA_V01 = "nexus-atlas.initial-alignment.v0.1";

const CHECKPOINT_KEYS = [
  "checkpointSchemaVersion",
  "checkpointId",
  "projectRef",
  "version",
  "createdAt",
  "trustedDirection",
  "activeObjective",
  "acceptedNextAction",
  "evidenceCursor",
  "governingRefs",
  "unresolvedProtectedAmbiguities",
  "provenance",
  "confirmation",
];

const PROPOSAL_KEYS = [
  "proposalVersion",
  "proposalId",
  "projectRef",
  "proposedAt",
  "trustedDirection",
  "activeObjective",
  "acceptedNextAction",
  "evidenceCursor",
  "governingRefs",
  "unresolvedProtectedAmbiguities",
  "provenance",
];

const CONFIRMATION_AUTHORITIES = new Set(["human", "verified-outcome"]);

export class TrustedCheckpointValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TrustedCheckpointValidationError";
    this.code = code;
    this.details = { ...details };
  }
}

function fail(code, message, details = {}) {
  throw new TrustedCheckpointValidationError(code, message, details);
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function exactObject(value, keys, code, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${field} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${field} has an invalid field set.`, { field, actual, expected });
}

function boundedString(value, code, field, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max) fail(code, `${field} must be a non-empty trimmed string.`, { field });
  return value;
}

function strictIso(value, code, field) {
  boundedString(value, code, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(code, `${field} must be a strict offset ISO timestamp.`, { field });
  return value;
}

function refs(value, code, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) fail(code, `${field} must be ${allowEmpty ? "an" : "a non-empty"} array.`, { field });
  const normalized = value.map((item, index) => boundedString(item, code, `${field}[${index}]`, 500));
  if (new Set(normalized).size !== normalized.length) fail(code, `${field} must contain unique references.`, { field });
  return normalized;
}

function normalizeAction(value) {
  exactObject(value, ["actionRef", "summary", "basisRefs"], "INVALID_ACCEPTED_NEXT_ACTION", "acceptedNextAction");
  const actionRef = value.actionRef === null ? null : boundedString(value.actionRef, "INVALID_ACCEPTED_NEXT_ACTION", "acceptedNextAction.actionRef", 500);
  return {
    actionRef,
    summary: boundedString(value.summary, "INVALID_ACCEPTED_NEXT_ACTION", "acceptedNextAction.summary"),
    basisRefs: refs(value.basisRefs, "INVALID_ACCEPTED_NEXT_ACTION", "acceptedNextAction.basisRefs"),
  };
}

function normalizeCursor(value) {
  exactObject(value, ["provider", "scopeRef", "cursorType", "value", "capturedAt"], "INVALID_EVIDENCE_CURSOR", "evidenceCursor");
  return {
    provider: boundedString(value.provider, "INVALID_EVIDENCE_CURSOR", "evidenceCursor.provider", 100),
    scopeRef: boundedString(value.scopeRef, "INVALID_EVIDENCE_CURSOR", "evidenceCursor.scopeRef", 500),
    cursorType: boundedString(value.cursorType, "INVALID_EVIDENCE_CURSOR", "evidenceCursor.cursorType", 100),
    value: boundedString(value.value, "INVALID_EVIDENCE_CURSOR", "evidenceCursor.value", 1000),
    capturedAt: strictIso(value.capturedAt, "INVALID_EVIDENCE_CURSOR", "evidenceCursor.capturedAt"),
  };
}

function normalizeAmbiguities(value) {
  if (!Array.isArray(value)) fail("INVALID_PROTECTED_AMBIGUITIES", "unresolvedProtectedAmbiguities must be an array.");
  const seen = new Set();
  return value.map((item, index) => {
    exactObject(item, ["ambiguityId", "summary", "evidenceRefs"], "INVALID_PROTECTED_AMBIGUITIES", `unresolvedProtectedAmbiguities[${index}]`);
    const ambiguityId = boundedString(item.ambiguityId, "INVALID_PROTECTED_AMBIGUITIES", `unresolvedProtectedAmbiguities[${index}].ambiguityId`, 500);
    if (seen.has(ambiguityId)) fail("INVALID_PROTECTED_AMBIGUITIES", "ambiguityId values must be unique.", { ambiguityId });
    seen.add(ambiguityId);
    return {
      ambiguityId,
      summary: boundedString(item.summary, "INVALID_PROTECTED_AMBIGUITIES", `unresolvedProtectedAmbiguities[${index}].summary`),
      evidenceRefs: refs(item.evidenceRefs, "INVALID_PROTECTED_AMBIGUITIES", `unresolvedProtectedAmbiguities[${index}].evidenceRefs`),
    };
  });
}

function normalizeProvenance(value) {
  exactObject(value, ["provider", "authority", "references"], "INVALID_CHECKPOINT_PROVENANCE", "provenance");
  return {
    provider: boundedString(value.provider, "INVALID_CHECKPOINT_PROVENANCE", "provenance.provider", 100),
    authority: boundedString(value.authority, "INVALID_CHECKPOINT_PROVENANCE", "provenance.authority", 200),
    references: refs(value.references, "INVALID_CHECKPOINT_PROVENANCE", "provenance.references"),
  };
}

function normalizeCore(value) {
  return {
    projectRef: boundedString(value.projectRef, "INVALID_PROJECT_REF", "projectRef", 500),
    trustedDirection: boundedString(value.trustedDirection, "INVALID_TRUSTED_DIRECTION", "trustedDirection"),
    activeObjective: boundedString(value.activeObjective, "INVALID_ACTIVE_OBJECTIVE", "activeObjective"),
    acceptedNextAction: normalizeAction(value.acceptedNextAction),
    evidenceCursor: normalizeCursor(value.evidenceCursor),
    governingRefs: refs(value.governingRefs, "INVALID_GOVERNING_REFS", "governingRefs"),
    unresolvedProtectedAmbiguities: normalizeAmbiguities(value.unresolvedProtectedAmbiguities),
    provenance: normalizeProvenance(value.provenance),
  };
}

export function validateInitialAlignmentProposalV01(value) {
  exactObject(value, PROPOSAL_KEYS, "INVALID_INITIAL_ALIGNMENT_PROPOSAL", "proposal");
  if (value.proposalVersion !== INITIAL_ALIGNMENT_SCHEMA_V01) fail("INVALID_INITIAL_ALIGNMENT_PROPOSAL", `proposalVersion must be ${INITIAL_ALIGNMENT_SCHEMA_V01}.`);
  const core = normalizeCore(value);
  const output = {
    proposalVersion: INITIAL_ALIGNMENT_SCHEMA_V01,
    proposalId: boundedString(value.proposalId, "INVALID_INITIAL_ALIGNMENT_PROPOSAL", "proposalId", 500),
    projectRef: core.projectRef,
    proposedAt: strictIso(value.proposedAt, "INVALID_INITIAL_ALIGNMENT_PROPOSAL", "proposedAt"),
    trustedDirection: core.trustedDirection,
    activeObjective: core.activeObjective,
    acceptedNextAction: core.acceptedNextAction,
    evidenceCursor: core.evidenceCursor,
    governingRefs: core.governingRefs,
    unresolvedProtectedAmbiguities: core.unresolvedProtectedAmbiguities,
    provenance: core.provenance,
  };
  return deepFreeze(clone(output));
}

export function validateTrustedCheckpointV01(value) {
  exactObject(value, CHECKPOINT_KEYS, "INVALID_TRUSTED_CHECKPOINT", "checkpoint");
  if (value.checkpointSchemaVersion !== TRUSTED_CHECKPOINT_SCHEMA_V01) fail("INVALID_TRUSTED_CHECKPOINT", `checkpointSchemaVersion must be ${TRUSTED_CHECKPOINT_SCHEMA_V01}.`);
  const core = normalizeCore(value);
  if (!Number.isSafeInteger(value.version) || value.version < 1) fail("INVALID_CHECKPOINT_VERSION", "version must be a positive safe integer.");
  exactObject(value.confirmation, ["state", "authority", "actorRef", "confirmedAt", "basisRef"], "INVALID_CHECKPOINT_CONFIRMATION", "confirmation");
  if (value.confirmation.state !== "confirmed") fail("INVALID_CHECKPOINT_CONFIRMATION", "confirmation.state must be confirmed.");
  if (!CONFIRMATION_AUTHORITIES.has(value.confirmation.authority)) fail("INVALID_CHECKPOINT_CONFIRMATION", "confirmation.authority is unsupported.");
  const createdAt = strictIso(value.createdAt, "INVALID_CHECKPOINT_TIMESTAMP", "createdAt");
  const confirmedAt = strictIso(value.confirmation.confirmedAt, "INVALID_CHECKPOINT_CONFIRMATION", "confirmation.confirmedAt");
  if (Date.parse(confirmedAt) !== Date.parse(createdAt)) fail("INVALID_CHECKPOINT_CONFIRMATION", "confirmation.confirmedAt must equal checkpoint createdAt.");
  const output = {
    checkpointSchemaVersion: TRUSTED_CHECKPOINT_SCHEMA_V01,
    checkpointId: boundedString(value.checkpointId, "INVALID_CHECKPOINT_ID", "checkpointId", 500),
    projectRef: core.projectRef,
    version: value.version,
    createdAt,
    trustedDirection: core.trustedDirection,
    activeObjective: core.activeObjective,
    acceptedNextAction: core.acceptedNextAction,
    evidenceCursor: core.evidenceCursor,
    governingRefs: core.governingRefs,
    unresolvedProtectedAmbiguities: core.unresolvedProtectedAmbiguities,
    provenance: core.provenance,
    confirmation: {
      state: "confirmed",
      authority: value.confirmation.authority,
      actorRef: boundedString(value.confirmation.actorRef, "INVALID_CHECKPOINT_CONFIRMATION", "confirmation.actorRef", 500),
      confirmedAt,
      basisRef: boundedString(value.confirmation.basisRef, "INVALID_CHECKPOINT_CONFIRMATION", "confirmation.basisRef", 500),
    },
  };
  return deepFreeze(clone(output));
}
