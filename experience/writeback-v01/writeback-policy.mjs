import { createHash } from "node:crypto";

import { WRITEBACK_ARTIFACT_KINDS_V01 } from "./writeback-target-validator.mjs";

export const WRITEBACK_POLICY_VERSION_V01 = "nexus-atlas.writeback-policy.v0.1";

const POLICY_KEYS = [
  "policyVersion",
  "policyId",
  "projectRefs",
  "targetRef",
  "artifactKinds",
  "requireVerifiedOutcomeForCheckpointAdvance",
  "requireExactReadAfterWrite",
];
const TARGET_REF = /^writeback-target:[0-9a-f]{24}$/;

export class WritebackPolicyValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackPolicyValidationError";
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
const fail = (code, message, details = {}) => { throw new WritebackPolicyValidationError(code, message, details); };

function normalizeProjectRefs(values) {
  if (!Array.isArray(values) || values.length === 0) fail("INVALID_WRITEBACK_POLICY", "projectRefs must be a non-empty array.");
  const normalized = values.map((value, index) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim() || /[\r\n]/.test(value)) fail("INVALID_WRITEBACK_POLICY", `projectRefs[${index}] is invalid.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) fail("INVALID_WRITEBACK_POLICY", "projectRefs must be unique.");
  return [...normalized].sort();
}

function normalizeArtifactKinds(value) {
  if (!Array.isArray(value) || value.length === 0) fail("INVALID_WRITEBACK_POLICY", "artifactKinds must be a non-empty array.");
  const rank = new Map(WRITEBACK_ARTIFACT_KINDS_V01.map((item, index) => [item, index]));
  const unique = new Set();
  for (const item of value) {
    if (!rank.has(item)) fail("INVALID_WRITEBACK_POLICY", "artifactKinds contains an unsupported artifact kind.", { artifactKind: item });
    if (unique.has(item)) fail("INVALID_WRITEBACK_POLICY", "artifactKinds must be unique.", { artifactKind: item });
    unique.add(item);
  }
  return [...unique].sort((left, right) => rank.get(left) - rank.get(right));
}

function normalizeTargetRef(value) {
  if (typeof value !== "string" || !TARGET_REF.test(value)) fail("INVALID_WRITEBACK_POLICY", "targetRef must reference an accepted Writeback Target identity.");
  return value;
}

function payloadOf(policy) {
  const { policyId: _policyId, ...payload } = policy;
  return payload;
}

export function validateWritebackPolicyV01(value) {
  if (!exact(value, POLICY_KEYS) || value.policyVersion !== WRITEBACK_POLICY_VERSION_V01) fail("INVALID_WRITEBACK_POLICY", "policy field set/version is invalid.");
  if (typeof value.policyId !== "string" || !/^writeback-policy:[0-9a-f]{24}$/.test(value.policyId)) fail("INVALID_WRITEBACK_POLICY", "policyId is invalid.");
  if (value.requireVerifiedOutcomeForCheckpointAdvance !== true) fail("INVALID_WRITEBACK_POLICY", "verified Outcome must remain mandatory for checkpoint advancement.");
  if (value.requireExactReadAfterWrite !== true) fail("INVALID_WRITEBACK_POLICY", "exact read-after-write must remain mandatory.");

  const normalized = {
    policyVersion: WRITEBACK_POLICY_VERSION_V01,
    policyId: value.policyId,
    projectRefs: normalizeProjectRefs(value.projectRefs),
    targetRef: normalizeTargetRef(value.targetRef),
    artifactKinds: normalizeArtifactKinds(value.artifactKinds),
    requireVerifiedOutcomeForCheckpointAdvance: true,
    requireExactReadAfterWrite: true,
  };

  if (JSON.stringify(normalized.projectRefs) !== JSON.stringify(value.projectRefs)) fail("INVALID_WRITEBACK_POLICY", "projectRefs must use canonical order.");
  if (JSON.stringify(normalized.artifactKinds) !== JSON.stringify(value.artifactKinds)) fail("INVALID_WRITEBACK_POLICY", "artifactKinds must use canonical order.");
  const expectedId = `writeback-policy:${digest(payloadOf(normalized)).slice(0, 24)}`;
  if (normalized.policyId !== expectedId) fail("INVALID_WRITEBACK_POLICY", "policyId does not bind normalized policy content.");
  return deepFreeze(clone(normalized));
}

export function buildWritebackPolicyV01({ projectRefs, targetRef, artifactKinds, requireVerifiedOutcomeForCheckpointAdvance = true, requireExactReadAfterWrite = true } = {}) {
  const payload = {
    policyVersion: WRITEBACK_POLICY_VERSION_V01,
    projectRefs: normalizeProjectRefs(projectRefs),
    targetRef: normalizeTargetRef(targetRef),
    artifactKinds: normalizeArtifactKinds(artifactKinds),
    requireVerifiedOutcomeForCheckpointAdvance,
    requireExactReadAfterWrite,
  };
  if (payload.requireVerifiedOutcomeForCheckpointAdvance !== true || payload.requireExactReadAfterWrite !== true) fail("INVALID_WRITEBACK_POLICY", "Phase 7B policy cannot weaken frozen Phase 6 write-back guarantees.");
  const policyId = `writeback-policy:${digest(payload).slice(0, 24)}`;
  return validateWritebackPolicyV01({ ...payload, policyId });
}
