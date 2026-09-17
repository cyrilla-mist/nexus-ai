import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "../continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { validateContinuityAssessmentV01 } from "../continuity-loop-v01/continuity-assessment.mjs";
import { validateWritebackManagementSurfaceV01 } from "../writeback-v01/writeback-management-surface.mjs";

export const CONTINUITY_PRODUCT_SURFACE_VERSION_V01 = "nexus-atlas.continuity-product-surface.v0.1";

const SURFACE_KEYS = [
  "version",
  "surfaceId",
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
];
const RESUME_KEYS = ["trustedDirection", "activeObjective", "nextActionRef", "nextActionSummary"];
const CONTINUITY_KEYS = ["assessmentRef", "validity", "humanAuthorityRequired", "reentryPackageAllowed"];
const CHECKPOINT_KEYS = ["checkpointRef", "version", "createdAt", "evidenceCursor", "confirmationAuthority"];
const CURSOR_KEYS = ["provider", "scopeRef", "cursorType", "capturedAt"];
const OUTCOME_KEYS = ["outcomeRef", "verificationState", "recordedAt", "actionRef", "failureReason"];
const HISTORY_KEYS = ["outcomes", "checkpoints"];
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

export class ContinuityProductSurfaceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContinuityProductSurfaceError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
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
const fail = (code, message, details = {}) => { throw new ContinuityProductSurfaceError(code, message, details); };

function boundedText(value, field, max = 2000) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > max || /[\r\n]/.test(value)) {
    fail("INVALID_CONTINUITY_PRODUCT_SURFACE", `${field} is invalid.`, { field });
  }
  return value;
}

function strictIso(value, field) {
  boundedText(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    fail("INVALID_CONTINUITY_PRODUCT_SURFACE", `${field} must be a strict offset ISO timestamp.`, { field });
  }
  return value;
}

function acceptedManagement(value) {
  try { return validateWritebackManagementSurfaceV01(value); }
  catch (error) { fail("INVALID_MANAGEMENT_SURFACE", "managementSurface failed the accepted Phase 7G validator.", { causeCode: error?.code ?? null }); }
}

function acceptedCheckpoint(value) {
  try { return validateTrustedCheckpointV01(value); }
  catch (error) { fail("INVALID_TRUSTED_CHECKPOINT", "trustedCheckpoint failed the accepted Phase 6 validator.", { causeCode: error?.code ?? null }); }
}

function acceptedOutcome(value) {
  if (value === null) return null;
  try { return validateOutcomeRecordV01(value); }
  catch (error) { fail("INVALID_OUTCOME_RECORD", "latestOutcome failed the accepted Phase 6 validator.", { causeCode: error?.code ?? null }); }
}

function acceptedAssessment(value) {
  try { return validateContinuityAssessmentV01(value); }
  catch (error) { fail("INVALID_CONTINUITY_ASSESSMENT", "continuityAssessment failed the accepted Phase 6 validator.", { causeCode: error?.code ?? null }); }
}

function outputPayload(surface) {
  const { surfaceId: _surfaceId, ...payload } = surface;
  return payload;
}

function validateHistorySection(section, field) {
  if (!object(section) || !Array.isArray(section.records) || !Number.isSafeInteger(section.count) || section.count !== section.records.length) {
    fail("INVALID_CONTINUITY_PRODUCT_SURFACE", `${field} history summary is invalid.`);
  }
}

export function validateContinuityProductSurfaceV01(value) {
  const code = "INVALID_CONTINUITY_PRODUCT_SURFACE";
  if (!exact(value, SURFACE_KEYS) || value.version !== CONTINUITY_PRODUCT_SURFACE_VERSION_V01) fail(code, "surface field set/version is invalid.");
  if (typeof value.surfaceId !== "string" || !/^continuity-product-surface:[0-9a-f]{24}$/.test(value.surfaceId)) fail(code, "surfaceId is invalid.");
  boundedText(value.projectRef, "projectRef", 500);
  strictIso(value.generatedAt, "generatedAt");

  if (!exact(value.resumeState, RESUME_KEYS)) fail(code, "resumeState field set is invalid.");
  for (const key of RESUME_KEYS) boundedText(value.resumeState[key], `resumeState.${key}`, 2000);

  if (!exact(value.continuity, CONTINUITY_KEYS) || !["VALID", "INVALID", "AMBIGUOUS"].includes(value.continuity.validity)) fail(code, "continuity field set/state is invalid.");
  boundedText(value.continuity.assessmentRef, "continuity.assessmentRef", 500);
  if (typeof value.continuity.humanAuthorityRequired !== "boolean" || typeof value.continuity.reentryPackageAllowed !== "boolean") fail(code, "continuity capabilities are invalid.");
  const expectedHuman = value.continuity.validity === "AMBIGUOUS";
  if (value.continuity.humanAuthorityRequired !== expectedHuman || value.continuity.reentryPackageAllowed !== !expectedHuman) fail(code, "continuity capabilities do not match validity.");

  if (!exact(value.trustedCheckpoint, CHECKPOINT_KEYS)) fail(code, "trustedCheckpoint field set is invalid.");
  boundedText(value.trustedCheckpoint.checkpointRef, "trustedCheckpoint.checkpointRef", 500);
  if (!Number.isSafeInteger(value.trustedCheckpoint.version) || value.trustedCheckpoint.version < 1) fail(code, "trustedCheckpoint.version is invalid.");
  strictIso(value.trustedCheckpoint.createdAt, "trustedCheckpoint.createdAt");
  boundedText(value.trustedCheckpoint.confirmationAuthority, "trustedCheckpoint.confirmationAuthority", 200);
  if (!exact(value.trustedCheckpoint.evidenceCursor, CURSOR_KEYS)) fail(code, "trustedCheckpoint.evidenceCursor field set is invalid.");
  for (const key of ["provider", "scopeRef", "cursorType"]) boundedText(value.trustedCheckpoint.evidenceCursor[key], `trustedCheckpoint.evidenceCursor.${key}`, 500);
  strictIso(value.trustedCheckpoint.evidenceCursor.capturedAt, "trustedCheckpoint.evidenceCursor.capturedAt");

  if (value.latestOutcome !== null) {
    if (!exact(value.latestOutcome, OUTCOME_KEYS) || !["verified", "failed", "indeterminate"].includes(value.latestOutcome.verificationState)) fail(code, "latestOutcome field set/state is invalid.");
    for (const key of ["outcomeRef", "actionRef"]) boundedText(value.latestOutcome[key], `latestOutcome.${key}`, 500);
    strictIso(value.latestOutcome.recordedAt, "latestOutcome.recordedAt");
    if (value.latestOutcome.failureReason !== null) boundedText(value.latestOutcome.failureReason, "latestOutcome.failureReason", 2000);
    if (value.latestOutcome.verificationState === "verified" && value.latestOutcome.failureReason !== null) fail(code, "verified latestOutcome cannot expose a failureReason.");
  }

  if (!exact(value.history, HISTORY_KEYS)) fail(code, "history field set is invalid.");
  validateHistorySection(value.history.outcomes, "history.outcomes");
  validateHistorySection(value.history.checkpoints, "history.checkpoints");

  if (!object(value.verification) || !Number.isSafeInteger(value.verification.total) || !object(value.verification.states) || !Array.isArray(value.verification.sourceProfiles)) fail(code, "verification summary is invalid.");

  if (!exact(value.writebackSafety, WRITEBACK_KEYS)) fail(code, "writebackSafety field set is invalid.");
  for (const key of ["targetRef", "providerKind", "durability", "retentionMode"]) boundedText(value.writebackSafety[key], `writebackSafety.${key}`, 500);
  if (value.writebackSafety.requireVerifiedOutcomeForCheckpointAdvance !== true || value.writebackSafety.requireExactReadAfterWrite !== true || value.writebackSafety.deletionAllowed !== false) fail(code, "writeback safety guarantees were weakened.");

  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail(code, "capabilities field set is invalid.");
  if (
    value.capabilities.readOnly !== true
    || value.capabilities.writeAllowed !== false
    || value.capabilities.deleteAllowed !== false
    || value.capabilities.productionProvisioningAllowed !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
    || value.capabilities.autonomousExecutionAllowed !== false
    || value.capabilities.humanAuthorityDecisionAllowed !== false
  ) fail(code, "browser capabilities exceed the accepted read-only boundary.");

  const expectedId = `continuity-product-surface:${digest(outputPayload(value)).slice(0, 24)}`;
  if (value.surfaceId !== expectedId) fail(code, "surfaceId does not bind normalized projected content.");
  return deepFreeze(clone(value));
}

export function buildContinuityProductSurfaceV01({
  managementSurface,
  trustedCheckpoint,
  latestOutcome = null,
  continuityAssessment,
  generatedAt,
} = {}) {
  const management = acceptedManagement(managementSurface);
  const checkpoint = acceptedCheckpoint(trustedCheckpoint);
  const outcome = acceptedOutcome(latestOutcome);
  const assessment = acceptedAssessment(continuityAssessment);
  const at = strictIso(generatedAt, "generatedAt");

  const projectRef = management.projectRef;
  if (checkpoint.projectRef !== projectRef || assessment.projectRef !== projectRef || (outcome && outcome.projectRef !== projectRef)) {
    fail("CONTINUITY_PRODUCT_SURFACE_SCOPE_MISMATCH", "Phase 8 inputs crossed project scope.");
  }
  if (assessment.checkpointRef !== checkpoint.checkpointId) {
    fail("CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH", "Continuity Assessment does not bind the supplied Trusted Checkpoint.");
  }

  const checkpointRecords = management.history.checkpoints.records;
  if (checkpointRecords.length === 0 || checkpointRecords[0].checkpointRef !== checkpoint.checkpointId || checkpointRecords[0].version !== checkpoint.version) {
    fail("CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH", "Trusted Checkpoint is not the newest management checkpoint record.");
  }

  const outcomeRecords = management.history.outcomes.records;
  if (outcomeRecords.length === 0 && outcome !== null) fail("CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH", "latestOutcome was supplied but management history has no Outcome.");
  if (outcomeRecords.length > 0 && outcome === null) fail("CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH", "management history has an Outcome but latestOutcome was not supplied.");
  if (outcome && (outcomeRecords[0].outcomeRef !== outcome.outcomeId || outcomeRecords[0].verificationState !== outcome.verificationState)) {
    fail("CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH", "latestOutcome is not the newest management Outcome record.");
  }

  const newestTimes = [checkpoint.createdAt, assessment.observedAt, outcome?.recordedAt].filter(Boolean).map(Date.parse);
  if (newestTimes.some(value => Number.isNaN(value)) || newestTimes.some(value => Date.parse(at) < value)) {
    fail("CONTINUITY_PRODUCT_SURFACE_STALE_PROJECTION", "generatedAt predates accepted continuity inputs.");
  }

  const payload = {
    version: CONTINUITY_PRODUCT_SURFACE_VERSION_V01,
    projectRef,
    generatedAt: at,
    resumeState: {
      trustedDirection: checkpoint.trustedDirection,
      activeObjective: checkpoint.activeObjective,
      nextActionRef: checkpoint.acceptedNextAction.actionRef,
      nextActionSummary: checkpoint.acceptedNextAction.summary,
    },
    continuity: {
      assessmentRef: assessment.assessmentId,
      validity: assessment.validity,
      humanAuthorityRequired: assessment.capabilities.humanAuthorityRequired,
      reentryPackageAllowed: assessment.capabilities.reentryPackageAllowed,
    },
    trustedCheckpoint: {
      checkpointRef: checkpoint.checkpointId,
      version: checkpoint.version,
      createdAt: checkpoint.createdAt,
      evidenceCursor: {
        provider: checkpoint.evidenceCursor.provider,
        scopeRef: checkpoint.evidenceCursor.scopeRef,
        cursorType: checkpoint.evidenceCursor.cursorType,
        capturedAt: checkpoint.evidenceCursor.capturedAt,
      },
      confirmationAuthority: checkpoint.confirmation.authority,
    },
    latestOutcome: outcome ? {
      outcomeRef: outcome.outcomeId,
      verificationState: outcome.verificationState,
      recordedAt: outcome.recordedAt,
      actionRef: outcome.actionRef,
      failureReason: outcome.failureReason,
    } : null,
    history: clone(management.history),
    verification: clone(management.verificationSummary),
    writebackSafety: {
      targetRef: management.target.targetRef,
      providerKind: management.target.providerKind,
      durability: management.target.durability,
      requireVerifiedOutcomeForCheckpointAdvance: management.policy.requireVerifiedOutcomeForCheckpointAdvance,
      requireExactReadAfterWrite: management.policy.requireExactReadAfterWrite,
      retentionMode: management.retention.retentionMode,
      deletionAllowed: management.retention.deletionAllowed,
    },
    capabilities: {
      readOnly: true,
      writeAllowed: false,
      deleteAllowed: false,
      productionProvisioningAllowed: false,
      canonicalContextWriteAllowed: false,
      autonomousExecutionAllowed: false,
      humanAuthorityDecisionAllowed: false,
    },
  };

  return validateContinuityProductSurfaceV01({
    ...payload,
    surfaceId: `continuity-product-surface:${digest(payload).slice(0, 24)}`,
  });
}
