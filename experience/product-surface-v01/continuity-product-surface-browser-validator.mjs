export const CONTINUITY_PRODUCT_SURFACE_BROWSER_VERSION_V01 = "nexus-atlas.continuity-product-surface.v0.1";

const SURFACE_KEYS = [
  "version",
  "projectRef",
  "generatedAt",
  "resumeState",
  "continuity",
  "trustedCheckpoint",
  "latestOutcome",
  "history",
  "verification",
  "writebackSafety",
  "capabilities",
  "surfaceId",
];
const RESUME_KEYS = ["trustedDirection", "activeObjective", "nextActionRef", "nextActionSummary"];
const CONTINUITY_KEYS = ["assessmentRef", "validity", "humanAuthorityRequired", "reentryPackageAllowed"];
const CHECKPOINT_KEYS = ["checkpointRef", "version", "createdAt", "evidenceCursor", "confirmationAuthority"];
const CURSOR_KEYS = ["provider", "scopeRef", "cursorType", "capturedAt"];
const OUTCOME_KEYS = ["outcomeRef", "verificationState", "recordedAt", "actionRef", "failureReason"];
const HISTORY_KEYS = ["outcomes", "checkpoints"];
const HISTORY_SECTION_KEYS = ["historyRef", "count", "truncated", "nextCursor", "records"];
const OUTCOME_SUMMARY_KEYS = ["outcomeRef", "verificationState", "recordedAt", "actionRef"];
const CHECKPOINT_SUMMARY_KEYS = ["checkpointRef", "version", "createdAt", "nextActionRef"];
const VERIFICATION_KEYS = ["total", "states", "sourceProfiles"];
const VERIFICATION_STATE_KEYS = ["verified", "failed", "indeterminate"];
const SOURCE_PROFILE_KEYS = ["provider", "profile", "count"];
const WRITEBACK_KEYS = [
  "targetRef",
  "providerKind",
  "durability",
  "requireVerifiedOutcomeForCheckpointAdvance",
  "requireExactReadAfterWrite",
  "retentionMode",
  "deletionAllowed",
];
const CAPABILITY_KEYS = [
  "readOnly",
  "writeAllowed",
  "deleteAllowed",
  "productionProvisioningAllowed",
  "canonicalContextWriteAllowed",
  "autonomousExecutionAllowed",
  "humanAuthorityDecisionAllowed",
];

export class ContinuityBrowserSurfaceValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContinuityBrowserSurfaceValidationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value)
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
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
const fail = (message, details = {}) => {
  throw new ContinuityBrowserSurfaceValidationError(
    "INVALID_CONTINUITY_BROWSER_SURFACE",
    message,
    details,
  );
};

function boundedText(value, field, max = 2000) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > max
    || /[\r\n]/.test(value)
  ) {
    fail(`${field} is invalid.`, { field });
  }
  return value;
}

function strictIso(value, field) {
  boundedText(value, field, 64);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    fail(`${field} must be a strict offset ISO timestamp.`, { field });
  }
  return value;
}

function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${field} is invalid.`, { field });
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${field} is invalid.`, { field });
  return value;
}

function validateHistorySection(section, kind) {
  if (!exact(section, HISTORY_SECTION_KEYS)) fail(`history.${kind} field set is invalid.`);
  boundedText(section.historyRef, `history.${kind}.historyRef`, 500);
  nonNegativeInteger(section.count, `history.${kind}.count`);
  if (typeof section.truncated !== "boolean") fail(`history.${kind}.truncated is invalid.`);
  if (section.nextCursor !== null) boundedText(section.nextCursor, `history.${kind}.nextCursor`, 1000);
  if (!Array.isArray(section.records) || section.records.length !== section.count) {
    fail(`history.${kind}.records/count mismatch.`);
  }

  if (kind === "outcomes") {
    for (const [index, record] of section.records.entries()) {
      if (!exact(record, OUTCOME_SUMMARY_KEYS)) fail(`history.outcomes.records[${index}] field set is invalid.`);
      boundedText(record.outcomeRef, `history.outcomes.records[${index}].outcomeRef`, 500);
      if (!["verified", "failed", "indeterminate"].includes(record.verificationState)) {
        fail(`history.outcomes.records[${index}].verificationState is invalid.`);
      }
      strictIso(record.recordedAt, `history.outcomes.records[${index}].recordedAt`);
      boundedText(record.actionRef, `history.outcomes.records[${index}].actionRef`, 500);
    }
    return;
  }

  for (const [index, record] of section.records.entries()) {
    if (!exact(record, CHECKPOINT_SUMMARY_KEYS)) fail(`history.checkpoints.records[${index}] field set is invalid.`);
    boundedText(record.checkpointRef, `history.checkpoints.records[${index}].checkpointRef`, 500);
    positiveInteger(record.version, `history.checkpoints.records[${index}].version`);
    strictIso(record.createdAt, `history.checkpoints.records[${index}].createdAt`);
    boundedText(record.nextActionRef, `history.checkpoints.records[${index}].nextActionRef`, 500);
  }
}

async function sha256Hex(value, cryptoImpl) {
  if (!cryptoImpl?.subtle || typeof cryptoImpl.subtle.digest !== "function") {
    throw new ContinuityBrowserSurfaceValidationError(
      "CONTINUITY_BROWSER_CRYPTO_UNAVAILABLE",
      "Web Crypto SHA-256 is required to validate a Continuity Product Surface identity.",
    );
  }
  const bytes = new TextEncoder().encode(value);
  const result = await cryptoImpl.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateContinuityProductSurfaceBrowserV01(
  value,
  { cryptoImpl = globalThis.crypto } = {},
) {
  if (!exact(value, SURFACE_KEYS)) fail("surface field set is invalid.");
  if (value.version !== CONTINUITY_PRODUCT_SURFACE_BROWSER_VERSION_V01) fail("surface version is invalid.");
  if (typeof value.surfaceId !== "string" || !/^continuity-product-surface:[0-9a-f]{24}$/.test(value.surfaceId)) {
    fail("surfaceId is invalid.");
  }
  boundedText(value.projectRef, "projectRef", 500);
  strictIso(value.generatedAt, "generatedAt");

  if (!exact(value.resumeState, RESUME_KEYS)) fail("resumeState field set is invalid.");
  for (const key of RESUME_KEYS) boundedText(value.resumeState[key], `resumeState.${key}`, 2000);

  if (!exact(value.continuity, CONTINUITY_KEYS)) fail("continuity field set is invalid.");
  boundedText(value.continuity.assessmentRef, "continuity.assessmentRef", 500);
  if (!["VALID", "INVALID", "AMBIGUOUS"].includes(value.continuity.validity)) fail("continuity.validity is invalid.");
  if (
    typeof value.continuity.humanAuthorityRequired !== "boolean"
    || typeof value.continuity.reentryPackageAllowed !== "boolean"
  ) fail("continuity capability flags are invalid.");
  const humanRequired = value.continuity.validity === "AMBIGUOUS";
  if (
    value.continuity.humanAuthorityRequired !== humanRequired
    || value.continuity.reentryPackageAllowed !== !humanRequired
  ) fail("continuity capability flags do not match validity.");

  if (!exact(value.trustedCheckpoint, CHECKPOINT_KEYS)) fail("trustedCheckpoint field set is invalid.");
  boundedText(value.trustedCheckpoint.checkpointRef, "trustedCheckpoint.checkpointRef", 500);
  positiveInteger(value.trustedCheckpoint.version, "trustedCheckpoint.version");
  strictIso(value.trustedCheckpoint.createdAt, "trustedCheckpoint.createdAt");
  boundedText(value.trustedCheckpoint.confirmationAuthority, "trustedCheckpoint.confirmationAuthority", 200);
  if (!exact(value.trustedCheckpoint.evidenceCursor, CURSOR_KEYS)) fail("trustedCheckpoint.evidenceCursor field set is invalid.");
  for (const key of ["provider", "scopeRef", "cursorType"]) {
    boundedText(value.trustedCheckpoint.evidenceCursor[key], `trustedCheckpoint.evidenceCursor.${key}`, 500);
  }
  strictIso(value.trustedCheckpoint.evidenceCursor.capturedAt, "trustedCheckpoint.evidenceCursor.capturedAt");

  if (value.latestOutcome !== null) {
    if (!exact(value.latestOutcome, OUTCOME_KEYS)) fail("latestOutcome field set is invalid.");
    boundedText(value.latestOutcome.outcomeRef, "latestOutcome.outcomeRef", 500);
    boundedText(value.latestOutcome.actionRef, "latestOutcome.actionRef", 500);
    if (!["verified", "failed", "indeterminate"].includes(value.latestOutcome.verificationState)) {
      fail("latestOutcome.verificationState is invalid.");
    }
    strictIso(value.latestOutcome.recordedAt, "latestOutcome.recordedAt");
    if (value.latestOutcome.failureReason !== null) boundedText(value.latestOutcome.failureReason, "latestOutcome.failureReason", 2000);
    if (value.latestOutcome.verificationState === "verified" && value.latestOutcome.failureReason !== null) {
      fail("verified latestOutcome cannot expose a failureReason.");
    }
  }

  if (!exact(value.history, HISTORY_KEYS)) fail("history field set is invalid.");
  validateHistorySection(value.history.outcomes, "outcomes");
  validateHistorySection(value.history.checkpoints, "checkpoints");

  if (!exact(value.verification, VERIFICATION_KEYS) || !exact(value.verification.states, VERIFICATION_STATE_KEYS)) {
    fail("verification field set is invalid.");
  }
  nonNegativeInteger(value.verification.total, "verification.total");
  const stateTotal = VERIFICATION_STATE_KEYS.reduce((sum, key) => {
    return sum + nonNegativeInteger(value.verification.states[key], `verification.states.${key}`);
  }, 0);
  if (stateTotal !== value.verification.total) fail("verification state counts do not add to total.");
  if (!Array.isArray(value.verification.sourceProfiles)) fail("verification.sourceProfiles is invalid.");
  let profileTotal = 0;
  for (const [index, profile] of value.verification.sourceProfiles.entries()) {
    if (!exact(profile, SOURCE_PROFILE_KEYS)) fail(`verification.sourceProfiles[${index}] field set is invalid.`);
    boundedText(profile.provider, `verification.sourceProfiles[${index}].provider`, 100);
    boundedText(profile.profile, `verification.sourceProfiles[${index}].profile`, 100);
    profileTotal += positiveInteger(profile.count, `verification.sourceProfiles[${index}].count`);
  }
  if (profileTotal !== value.verification.total) fail("verification source-profile counts do not add to total.");

  if (!exact(value.writebackSafety, WRITEBACK_KEYS)) fail("writebackSafety field set is invalid.");
  for (const key of ["targetRef", "providerKind", "durability", "retentionMode"]) {
    boundedText(value.writebackSafety[key], `writebackSafety.${key}`, 500);
  }
  if (
    value.writebackSafety.requireVerifiedOutcomeForCheckpointAdvance !== true
    || value.writebackSafety.requireExactReadAfterWrite !== true
    || value.writebackSafety.deletionAllowed !== false
  ) fail("writebackSafety weakened accepted safety requirements.");

  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail("capabilities field set is invalid.");
  if (
    value.capabilities.readOnly !== true
    || value.capabilities.writeAllowed !== false
    || value.capabilities.deleteAllowed !== false
    || value.capabilities.productionProvisioningAllowed !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
    || value.capabilities.autonomousExecutionAllowed !== false
    || value.capabilities.humanAuthorityDecisionAllowed !== false
  ) fail("browser capabilities exceed the accepted read-only boundary.");

  const { surfaceId: _surfaceId, ...payload } = value;
  const expectedId = `continuity-product-surface:${(await sha256Hex(JSON.stringify(payload), cryptoImpl)).slice(0, 24)}`;
  if (value.surfaceId !== expectedId) fail("surfaceId does not bind the received projected content.");

  return deepFreeze(clone(value));
}
