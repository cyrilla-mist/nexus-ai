import { createHash } from "node:crypto";

import { validateWritebackTargetV01 } from "./writeback-target-validator.mjs";
import { validateWritebackPolicyV01 } from "./writeback-policy.mjs";
import { validateWritebackRetentionPolicyV01 } from "./writeback-retention-policy.mjs";
import { validateWritebackHistoryPageV01 } from "./writeback-history.mjs";
import { validateCrossSourceVerificationV01 } from "./cross-source-postcondition.mjs";

export const WRITEBACK_MANAGEMENT_SURFACE_VERSION_V01 = "nexus-atlas.writeback-management-surface.v0.1";

const SURFACE_KEYS = [
  "surfaceVersion",
  "surfaceId",
  "projectRef",
  "generatedAt",
  "target",
  "policy",
  "retention",
  "history",
  "verificationSummary",
  "capabilities",
];
const TARGET_KEYS = ["targetRef", "providerKind", "durability", "artifactKinds", "capabilities"];
const POLICY_KEYS = ["policyRef", "artifactKinds", "requireVerifiedOutcomeForCheckpointAdvance", "requireExactReadAfterWrite"];
const RETENTION_KEYS = ["policyRef", "retentionMode", "retainOutcomeStates", "retainCheckpointHistory", "deletionAllowed", "maxHistoryPageSize"];
const HISTORY_KEYS = ["outcomes", "checkpoints"];
const HISTORY_SECTION_KEYS = ["historyRef", "count", "truncated", "nextCursor", "records"];
const OUTCOME_SUMMARY_KEYS = ["outcomeRef", "verificationState", "recordedAt", "actionRef"];
const CHECKPOINT_SUMMARY_KEYS = ["checkpointRef", "version", "createdAt", "nextActionRef"];
const VERIFICATION_SUMMARY_KEYS = ["total", "states", "sourceProfiles"];
const VERIFICATION_STATES_KEYS = ["verified", "failed", "indeterminate"];
const PROFILE_KEYS = ["provider", "profile", "count"];
const CAPABILITY_KEYS = ["readOnly", "writeAllowed", "deleteAllowed", "productionProvisioningAllowed", "canonicalContextWriteAllowed"];

export class WritebackManagementSurfaceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackManagementSurfaceError";
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
const fail = (code, message, details = {}) => { throw new WritebackManagementSurfaceError(code, message, details); };

function boundedText(value, field, max = 1000) {
  if (typeof value !== "string" || !value.length || value !== value.trim() || value.length > max || /[\r\n]/.test(value)) {
    fail("INVALID_WRITEBACK_MANAGEMENT_SURFACE", `${field} is invalid.`, { field });
  }
  return value;
}

function strictIso(value, field) {
  boundedText(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    fail("INVALID_WRITEBACK_MANAGEMENT_SURFACE", `${field} must be a strict offset ISO timestamp.`, { field });
  }
  return value;
}

function acceptedTarget(value) {
  try { return validateWritebackTargetV01(value); }
  catch (error) { fail("INVALID_WRITEBACK_TARGET", "target failed the accepted Phase 7B validator.", { causeCode: error?.code ?? null }); }
}
function acceptedPolicy(value) {
  try { return validateWritebackPolicyV01(value); }
  catch (error) { fail("INVALID_WRITEBACK_POLICY", "writebackPolicy failed the accepted Phase 7B validator.", { causeCode: error?.code ?? null }); }
}
function acceptedRetention(value) {
  try { return validateWritebackRetentionPolicyV01(value); }
  catch (error) { fail("INVALID_WRITEBACK_RETENTION_POLICY", "retentionPolicy failed the accepted Phase 7D validator.", { causeCode: error?.code ?? null }); }
}
function acceptedHistory(value, expectedKind) {
  let page;
  try { page = validateWritebackHistoryPageV01(value); }
  catch (error) { fail("INVALID_WRITEBACK_HISTORY_PAGE", "history page failed the accepted Phase 7D validator.", { causeCode: error?.code ?? null }); }
  if (page.artifactKind !== expectedKind) fail("WRITEBACK_MANAGEMENT_HISTORY_KIND_MISMATCH", "History page has the wrong artifact kind.", { expectedKind, actualKind: page.artifactKind });
  return page;
}
function acceptedVerification(value) {
  try { return validateCrossSourceVerificationV01(value); }
  catch (error) { fail("INVALID_CROSS_SOURCE_VERIFICATION", "cross-source verification failed the accepted Phase 7F validator.", { causeCode: error?.code ?? null }); }
}

function summarizeOutcomes(page) {
  return {
    historyRef: page.historyId,
    count: page.items.length,
    truncated: page.truncated,
    nextCursor: page.nextCursor,
    records: page.items.map(item => ({
      outcomeRef: item.outcomeId,
      verificationState: item.verificationState,
      recordedAt: item.recordedAt,
      actionRef: item.actionRef,
    })),
  };
}

function summarizeCheckpoints(page) {
  return {
    historyRef: page.historyId,
    count: page.items.length,
    truncated: page.truncated,
    nextCursor: page.nextCursor,
    records: page.items.map(item => ({
      checkpointRef: item.checkpointId,
      version: item.version,
      createdAt: item.createdAt,
      nextActionRef: item.acceptedNextAction.actionRef,
    })),
  };
}

function summarizeVerifications(values, projectRef) {
  const accepted = values.map((candidate, index) => {
    const value = acceptedVerification(candidate);
    if (value.projectRef !== projectRef) fail("WRITEBACK_MANAGEMENT_SCOPE_MISMATCH", "Cross-source verification crossed project scope.", { index, verificationId: value.verificationId });
    return value;
  });
  const ids = accepted.map(item => item.verificationId);
  if (new Set(ids).size !== ids.length) fail("INVALID_WRITEBACK_MANAGEMENT_SURFACE", "crossSourceVerifications contains duplicate identities.");

  const states = { verified: 0, failed: 0, indeterminate: 0 };
  const profiles = new Map();
  for (const item of accepted) {
    states[item.verificationState] += 1;
    const key = `${item.provider}\u0000${item.profile}`;
    const current = profiles.get(key) ?? { provider: item.provider, profile: item.profile, count: 0 };
    current.count += 1;
    profiles.set(key, current);
  }
  return {
    total: accepted.length,
    states,
    sourceProfiles: [...profiles.values()].sort((left, right) => left.provider.localeCompare(right.provider) || left.profile.localeCompare(right.profile)),
  };
}

function surfacePayload(value) {
  const { surfaceId: _surfaceId, ...payload } = value;
  return payload;
}

export function validateWritebackManagementSurfaceV01(value) {
  const code = "INVALID_WRITEBACK_MANAGEMENT_SURFACE";
  if (!exact(value, SURFACE_KEYS) || value.surfaceVersion !== WRITEBACK_MANAGEMENT_SURFACE_VERSION_V01) fail(code, "surface field set/version is invalid.");
  if (typeof value.surfaceId !== "string" || !/^writeback-management:[0-9a-f]{24}$/.test(value.surfaceId)) fail(code, "surfaceId is invalid.");
  boundedText(value.projectRef, "projectRef", 500);
  strictIso(value.generatedAt, "generatedAt");

  if (!exact(value.target, TARGET_KEYS)) fail(code, "target summary field set is invalid.");
  for (const field of ["targetRef", "providerKind", "durability"]) boundedText(value.target[field], `target.${field}`, 500);
  if (!Array.isArray(value.target.artifactKinds) || !object(value.target.capabilities)) fail(code, "target summary is invalid.");

  if (!exact(value.policy, POLICY_KEYS)) fail(code, "policy summary field set is invalid.");
  boundedText(value.policy.policyRef, "policy.policyRef", 500);
  if (!Array.isArray(value.policy.artifactKinds) || value.policy.requireVerifiedOutcomeForCheckpointAdvance !== true || value.policy.requireExactReadAfterWrite !== true) fail(code, "policy summary weakens frozen safety requirements.");

  if (!exact(value.retention, RETENTION_KEYS)) fail(code, "retention summary field set is invalid.");
  boundedText(value.retention.policyRef, "retention.policyRef", 500);
  if (value.retention.retentionMode !== "retain-all" || !Array.isArray(value.retention.retainOutcomeStates) || value.retention.retainCheckpointHistory !== true || value.retention.deletionAllowed !== false || !Number.isSafeInteger(value.retention.maxHistoryPageSize)) fail(code, "retention summary is invalid.");

  if (!exact(value.history, HISTORY_KEYS)) fail(code, "history field set is invalid.");
  if (!exact(value.history.outcomes, HISTORY_SECTION_KEYS) || !exact(value.history.checkpoints, HISTORY_SECTION_KEYS)) fail(code, "history section field set is invalid.");
  for (const [name, section, recordKeys] of [
    ["outcomes", value.history.outcomes, OUTCOME_SUMMARY_KEYS],
    ["checkpoints", value.history.checkpoints, CHECKPOINT_SUMMARY_KEYS],
  ]) {
    boundedText(section.historyRef, `history.${name}.historyRef`, 500);
    if (!Number.isSafeInteger(section.count) || section.count < 0 || typeof section.truncated !== "boolean" || (section.nextCursor !== null && typeof section.nextCursor !== "string") || !Array.isArray(section.records) || section.records.length !== section.count) fail(code, `history.${name} summary is invalid.`);
    for (const [index, record] of section.records.entries()) {
      if (!exact(record, recordKeys)) fail(code, `history.${name}.records[${index}] field set is invalid.`);
    }
  }

  if (!exact(value.verificationSummary, VERIFICATION_SUMMARY_KEYS) || !exact(value.verificationSummary.states, VERIFICATION_STATES_KEYS) || !Array.isArray(value.verificationSummary.sourceProfiles)) fail(code, "verificationSummary is invalid.");
  if (!Number.isSafeInteger(value.verificationSummary.total) || value.verificationSummary.total < 0) fail(code, "verificationSummary.total is invalid.");
  const stateTotal = VERIFICATION_STATES_KEYS.reduce((sum, key) => {
    const count = value.verificationSummary.states[key];
    if (!Number.isSafeInteger(count) || count < 0) fail(code, `verificationSummary.states.${key} is invalid.`);
    return sum + count;
  }, 0);
  if (stateTotal !== value.verificationSummary.total) fail(code, "verificationSummary state counts do not add to total.");
  let profileTotal = 0;
  for (const [index, profile] of value.verificationSummary.sourceProfiles.entries()) {
    if (!exact(profile, PROFILE_KEYS)) fail(code, `verificationSummary.sourceProfiles[${index}] is invalid.`);
    boundedText(profile.provider, `verificationSummary.sourceProfiles[${index}].provider`, 100);
    boundedText(profile.profile, `verificationSummary.sourceProfiles[${index}].profile`, 100);
    if (!Number.isSafeInteger(profile.count) || profile.count < 1) fail(code, `verificationSummary.sourceProfiles[${index}].count is invalid.`);
    profileTotal += profile.count;
  }
  if (profileTotal !== value.verificationSummary.total) fail(code, "verificationSummary profile counts do not add to total.");

  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail(code, "surface capabilities field set is invalid.");
  if (
    value.capabilities.readOnly !== true
    || value.capabilities.writeAllowed !== false
    || value.capabilities.deleteAllowed !== false
    || value.capabilities.productionProvisioningAllowed !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
  ) fail(code, "management surface must remain read-only and non-authoritative.");

  const expectedId = `writeback-management:${digest(surfacePayload(value)).slice(0, 24)}`;
  if (value.surfaceId !== expectedId) fail(code, "surfaceId does not bind normalized surface content.");
  return deepFreeze(clone(value));
}

export function buildWritebackManagementSurfaceV01({
  target,
  writebackPolicy,
  retentionPolicy,
  projectRef,
  outcomeHistoryPage,
  checkpointHistoryPage,
  crossSourceVerifications = [],
  generatedAt,
} = {}) {
  const acceptedTargetValue = acceptedTarget(target);
  const policy = acceptedPolicy(writebackPolicy);
  const retention = acceptedRetention(retentionPolicy);
  const ref = boundedText(projectRef, "projectRef", 500);
  const at = strictIso(generatedAt, "generatedAt");
  const outcomes = acceptedHistory(outcomeHistoryPage, "outcome-record");
  const checkpoints = acceptedHistory(checkpointHistoryPage, "trusted-checkpoint");

  if (policy.targetRef !== acceptedTargetValue.targetId) fail("WRITEBACK_MANAGEMENT_TARGET_POLICY_MISMATCH", "Writeback Policy does not bind the supplied target.");
  if (!policy.projectRefs.includes(ref) || !retention.projectRefs.includes(ref)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Management project is outside accepted write-back/retention policy scope.", { projectRef: ref });
  if (!policy.artifactKinds.includes("outcome-record") || !policy.artifactKinds.includes("trusted-checkpoint")) fail("WRITEBACK_MANAGEMENT_ARTIFACT_POLICY_MISMATCH", "Management surface requires Outcome and Trusted Checkpoint artifact kinds.");
  if (!acceptedTargetValue.artifactKinds.includes("outcome-record") || !acceptedTargetValue.artifactKinds.includes("trusted-checkpoint")) fail("WRITEBACK_MANAGEMENT_ARTIFACT_POLICY_MISMATCH", "Target does not declare both managed artifact kinds.");
  for (const [name, page] of [["outcome", outcomes], ["checkpoint", checkpoints]]) {
    if (page.projectRef !== ref) fail("WRITEBACK_MANAGEMENT_SCOPE_MISMATCH", `${name} history page crossed project scope.`, { expectedProjectRef: ref, actualProjectRef: page.projectRef });
    if (page.retentionPolicyRef !== retention.policyId) fail("WRITEBACK_MANAGEMENT_RETENTION_MISMATCH", `${name} history page does not bind the supplied retention policy.`);
  }

  const payload = {
    surfaceVersion: WRITEBACK_MANAGEMENT_SURFACE_VERSION_V01,
    projectRef: ref,
    generatedAt: at,
    target: {
      targetRef: acceptedTargetValue.targetId,
      providerKind: acceptedTargetValue.providerKind,
      durability: acceptedTargetValue.durability,
      artifactKinds: clone(acceptedTargetValue.artifactKinds),
      capabilities: clone(acceptedTargetValue.capabilities),
    },
    policy: {
      policyRef: policy.policyId,
      artifactKinds: clone(policy.artifactKinds),
      requireVerifiedOutcomeForCheckpointAdvance: policy.requireVerifiedOutcomeForCheckpointAdvance,
      requireExactReadAfterWrite: policy.requireExactReadAfterWrite,
    },
    retention: {
      policyRef: retention.policyId,
      retentionMode: retention.retentionMode,
      retainOutcomeStates: clone(retention.retainOutcomeStates),
      retainCheckpointHistory: retention.retainCheckpointHistory,
      deletionAllowed: retention.deletionAllowed,
      maxHistoryPageSize: retention.maxHistoryPageSize,
    },
    history: {
      outcomes: summarizeOutcomes(outcomes),
      checkpoints: summarizeCheckpoints(checkpoints),
    },
    verificationSummary: summarizeVerifications(crossSourceVerifications, ref),
    capabilities: {
      readOnly: true,
      writeAllowed: false,
      deleteAllowed: false,
      productionProvisioningAllowed: false,
      canonicalContextWriteAllowed: false,
    },
  };
  return validateWritebackManagementSurfaceV01({
    ...payload,
    surfaceId: `writeback-management:${digest(payload).slice(0, 24)}`,
  });
}
