import { createHash } from "node:crypto";

export const WRITEBACK_TARGET_VERSION_V01 = "nexus-atlas.writeback-target.v0.1";
export const WRITEBACK_ARTIFACT_KINDS_V01 = Object.freeze(["outcome-record", "trusted-checkpoint"]);
export const WRITEBACK_DURABILITY_V01 = Object.freeze(["memory", "durable"]);
export const WRITEBACK_CAPABILITY_KEYS_V01 = Object.freeze([
  "projectScopeEnforced",
  "idempotentOutcomeAppend",
  "checkpointCompareAndSwap",
  "exactReadAfterWrite",
]);

const TARGET_KEYS = ["targetVersion", "targetId", "providerKind", "durability", "artifactKinds", "capabilities"];
const PROVIDER_KIND = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const TARGET_ID = /^writeback-target:[0-9a-f]{24}$/;

export class WritebackTargetValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackTargetValidationError";
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
const fail = (code, message, details = {}) => { throw new WritebackTargetValidationError(code, message, details); };

function normalizeProviderKind(value) {
  if (typeof value !== "string" || !PROVIDER_KIND.test(value)) fail("INVALID_WRITEBACK_TARGET", "providerKind must be a lowercase logical adapter identifier.");
  return value;
}

function normalizeDurability(value) {
  if (!WRITEBACK_DURABILITY_V01.includes(value)) fail("INVALID_WRITEBACK_TARGET", "durability is unsupported.");
  return value;
}

function normalizeArtifactKinds(value) {
  if (!Array.isArray(value) || value.length === 0) fail("INVALID_WRITEBACK_TARGET", "artifactKinds must be a non-empty array.");
  const rank = new Map(WRITEBACK_ARTIFACT_KINDS_V01.map((item, index) => [item, index]));
  const unique = new Set();
  for (const item of value) {
    if (!rank.has(item)) fail("INVALID_WRITEBACK_TARGET", "artifactKinds contains an unsupported artifact kind.", { artifactKind: item });
    if (unique.has(item)) fail("INVALID_WRITEBACK_TARGET", "artifactKinds must be unique.", { artifactKind: item });
    unique.add(item);
  }
  return [...unique].sort((left, right) => rank.get(left) - rank.get(right));
}

function normalizeCapabilities(value) {
  if (!exact(value, WRITEBACK_CAPABILITY_KEYS_V01)) fail("INVALID_WRITEBACK_TARGET", "capabilities has an invalid field set.");
  const output = {};
  for (const key of WRITEBACK_CAPABILITY_KEYS_V01) {
    if (typeof value[key] !== "boolean") fail("INVALID_WRITEBACK_TARGET", `capabilities.${key} must be boolean.`);
    output[key] = value[key];
  }
  return output;
}

function payloadOf(target) {
  const { targetId: _targetId, ...payload } = target;
  return payload;
}

export function validateWritebackTargetV01(value) {
  if (!exact(value, TARGET_KEYS) || value.targetVersion !== WRITEBACK_TARGET_VERSION_V01) fail("INVALID_WRITEBACK_TARGET", "target field set/version is invalid.");
  if (typeof value.targetId !== "string" || !TARGET_ID.test(value.targetId)) fail("INVALID_WRITEBACK_TARGET", "targetId is invalid.");

  const normalized = {
    targetVersion: WRITEBACK_TARGET_VERSION_V01,
    targetId: value.targetId,
    providerKind: normalizeProviderKind(value.providerKind),
    durability: normalizeDurability(value.durability),
    artifactKinds: normalizeArtifactKinds(value.artifactKinds),
    capabilities: normalizeCapabilities(value.capabilities),
  };

  if (JSON.stringify(normalized.artifactKinds) !== JSON.stringify(value.artifactKinds)) fail("INVALID_WRITEBACK_TARGET", "artifactKinds must use canonical order.");
  const expectedId = `writeback-target:${digest(payloadOf(normalized)).slice(0, 24)}`;
  if (normalized.targetId !== expectedId) fail("INVALID_WRITEBACK_TARGET", "targetId does not bind normalized target content.");
  return deepFreeze(clone(normalized));
}

export function buildWritebackTargetV01({ providerKind, durability, artifactKinds, capabilities } = {}) {
  const normalizedPayload = {
    targetVersion: WRITEBACK_TARGET_VERSION_V01,
    providerKind: normalizeProviderKind(providerKind),
    durability: normalizeDurability(durability),
    artifactKinds: normalizeArtifactKinds(artifactKinds),
    capabilities: normalizeCapabilities(capabilities),
  };
  const targetId = `writeback-target:${digest(normalizedPayload).slice(0, 24)}`;
  return validateWritebackTargetV01({ ...normalizedPayload, targetId });
}
