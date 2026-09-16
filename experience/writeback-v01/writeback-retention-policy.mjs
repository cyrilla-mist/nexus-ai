import { createHash } from "node:crypto";

export const WRITEBACK_RETENTION_POLICY_VERSION_V01 = "nexus-atlas.writeback-retention-policy.v0.1";
export const WRITEBACK_RETENTION_MODE_V01 = "retain-all";
export const WRITEBACK_HISTORY_MAX_PAGE_SIZE_V01 = 100;

const POLICY_KEYS = [
  "policyVersion",
  "policyId",
  "projectRefs",
  "retentionMode",
  "retainOutcomeStates",
  "retainCheckpointHistory",
  "deletionAllowed",
  "maxHistoryPageSize",
];
const OUTCOME_STATES = ["verified", "failed", "indeterminate"];

export class WritebackRetentionPolicyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackRetentionPolicyError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (code, message, details = {}) => { throw new WritebackRetentionPolicyError(code, message, details); };

function normalizeProjectRefs(values) {
  if (!Array.isArray(values) || values.length === 0) fail("INVALID_WRITEBACK_RETENTION_POLICY", "projectRefs must be a non-empty array.");
  const normalized = values.map((value, index) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim() || /[\r\n]/.test(value)) fail("INVALID_WRITEBACK_RETENTION_POLICY", `projectRefs[${index}] is invalid.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) fail("INVALID_WRITEBACK_RETENTION_POLICY", "projectRefs must be unique.");
  return [...normalized].sort();
}

function normalizeOutcomeStates(values) {
  if (!Array.isArray(values) || values.length !== OUTCOME_STATES.length || new Set(values).size !== OUTCOME_STATES.length || OUTCOME_STATES.some(state => !values.includes(state))) {
    fail("INVALID_WRITEBACK_RETENTION_POLICY", "v0.1 must retain verified, failed and indeterminate Outcomes.");
  }
  return [...OUTCOME_STATES];
}

function payloadOf(policy) {
  const { policyId: _policyId, ...payload } = policy;
  return payload;
}

export function validateWritebackRetentionPolicyV01(value) {
  if (!exact(value, POLICY_KEYS) || value.policyVersion !== WRITEBACK_RETENTION_POLICY_VERSION_V01) fail("INVALID_WRITEBACK_RETENTION_POLICY", "retention policy field set/version is invalid.");
  if (typeof value.policyId !== "string" || !/^writeback-retention-policy:[0-9a-f]{24}$/.test(value.policyId)) fail("INVALID_WRITEBACK_RETENTION_POLICY", "policyId is invalid.");
  if (value.retentionMode !== WRITEBACK_RETENTION_MODE_V01) fail("INVALID_WRITEBACK_RETENTION_POLICY", "v0.1 supports retain-all only.");
  if (value.retainCheckpointHistory !== true) fail("INVALID_WRITEBACK_RETENTION_POLICY", "v0.1 must retain all Trusted Checkpoint versions.");
  if (value.deletionAllowed !== false) fail("INVALID_WRITEBACK_RETENTION_POLICY", "v0.1 does not authorize destructive lifecycle operations.");
  if (!Number.isSafeInteger(value.maxHistoryPageSize) || value.maxHistoryPageSize < 1 || value.maxHistoryPageSize > WRITEBACK_HISTORY_MAX_PAGE_SIZE_V01) fail("INVALID_WRITEBACK_RETENTION_POLICY", "maxHistoryPageSize is invalid.");

  const normalized = {
    policyVersion: WRITEBACK_RETENTION_POLICY_VERSION_V01,
    policyId: value.policyId,
    projectRefs: normalizeProjectRefs(value.projectRefs),
    retentionMode: WRITEBACK_RETENTION_MODE_V01,
    retainOutcomeStates: normalizeOutcomeStates(value.retainOutcomeStates),
    retainCheckpointHistory: true,
    deletionAllowed: false,
    maxHistoryPageSize: value.maxHistoryPageSize,
  };
  if (JSON.stringify(normalized.projectRefs) !== JSON.stringify(value.projectRefs)) fail("INVALID_WRITEBACK_RETENTION_POLICY", "projectRefs must use canonical order.");
  if (JSON.stringify(normalized.retainOutcomeStates) !== JSON.stringify(value.retainOutcomeStates)) fail("INVALID_WRITEBACK_RETENTION_POLICY", "retainOutcomeStates must use canonical order.");
  const expectedId = `writeback-retention-policy:${digest(payloadOf(normalized)).slice(0, 24)}`;
  if (value.policyId !== expectedId) fail("INVALID_WRITEBACK_RETENTION_POLICY", "policyId does not bind normalized retention policy content.");
  return deepFreeze(clone(normalized));
}

export function buildWritebackRetentionPolicyV01({ projectRefs, maxHistoryPageSize = 50 } = {}) {
  const payload = {
    policyVersion: WRITEBACK_RETENTION_POLICY_VERSION_V01,
    projectRefs: normalizeProjectRefs(projectRefs),
    retentionMode: WRITEBACK_RETENTION_MODE_V01,
    retainOutcomeStates: [...OUTCOME_STATES],
    retainCheckpointHistory: true,
    deletionAllowed: false,
    maxHistoryPageSize,
  };
  if (!Number.isSafeInteger(maxHistoryPageSize) || maxHistoryPageSize < 1 || maxHistoryPageSize > WRITEBACK_HISTORY_MAX_PAGE_SIZE_V01) fail("INVALID_WRITEBACK_RETENTION_POLICY", "maxHistoryPageSize is invalid.");
  const policyId = `writeback-retention-policy:${digest(payload).slice(0, 24)}`;
  return validateWritebackRetentionPolicyV01({ ...payload, policyId });
}
