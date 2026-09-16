import { createHash } from "node:crypto";

import { validateWritebackPolicyV01 } from "./writeback-policy.mjs";
import {
  WRITEBACK_CAPABILITY_KEYS_V01,
  validateWritebackTargetV01,
} from "./writeback-target-validator.mjs";

export const WRITEBACK_BINDING_VERSION_V01 = "nexus-atlas.writeback-binding.v0.1";

const BINDING_KEYS = [
  "bindingVersion",
  "bindingId",
  "targetRef",
  "policyRef",
  "projectRefs",
  "artifactKinds",
  "capabilities",
];
const REQUIRED_CAPABILITIES = Object.freeze([...WRITEBACK_CAPABILITY_KEYS_V01]);

export class WritebackCapabilityGateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackCapabilityGateError";
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
const fail = (code, message, details = {}) => { throw new WritebackCapabilityGateError(code, message, details); };

function payloadOf(binding) {
  const { bindingId: _bindingId, ...payload } = binding;
  return payload;
}

function validateStoreMethods({ artifactKinds, outcomeStore, checkpointStore }) {
  if (artifactKinds.includes("outcome-record")) {
    if (!outcomeStore || typeof outcomeStore.appendOutcome !== "function" || typeof outcomeStore.readOutcome !== "function") {
      fail("WRITEBACK_STORE_BOUNDARY_INVALID", "Outcome target must expose appendOutcome and readOutcome.");
    }
  }
  if (artifactKinds.includes("trusted-checkpoint")) {
    if (!checkpointStore || typeof checkpointStore.writeCheckpoint !== "function" || typeof checkpointStore.readLatest !== "function") {
      fail("WRITEBACK_STORE_BOUNDARY_INVALID", "Checkpoint target must expose writeCheckpoint and readLatest.");
    }
  }
}

export function validateWritebackBindingV01(value) {
  if (!exact(value, BINDING_KEYS) || value.bindingVersion !== WRITEBACK_BINDING_VERSION_V01) fail("INVALID_WRITEBACK_BINDING", "binding field set/version is invalid.");
  if (typeof value.bindingId !== "string" || !/^writeback-binding:[0-9a-f]{24}$/.test(value.bindingId)) fail("INVALID_WRITEBACK_BINDING", "bindingId is invalid.");
  if (typeof value.targetRef !== "string" || !/^writeback-target:[0-9a-f]{24}$/.test(value.targetRef)) fail("INVALID_WRITEBACK_BINDING", "targetRef is invalid.");
  if (typeof value.policyRef !== "string" || !/^writeback-policy:[0-9a-f]{24}$/.test(value.policyRef)) fail("INVALID_WRITEBACK_BINDING", "policyRef is invalid.");
  if (!Array.isArray(value.projectRefs) || value.projectRefs.length === 0 || !Array.isArray(value.artifactKinds) || value.artifactKinds.length === 0) fail("INVALID_WRITEBACK_BINDING", "binding scope arrays are invalid.");
  if (!exact(value.capabilities, REQUIRED_CAPABILITIES)) fail("INVALID_WRITEBACK_BINDING", "binding capabilities field set is invalid.");
  for (const key of REQUIRED_CAPABILITIES) if (value.capabilities[key] !== true) fail("INVALID_WRITEBACK_BINDING", `binding capability ${key} must remain true.`);

  const normalized = clone(value);
  const expectedId = `writeback-binding:${digest(payloadOf(normalized)).slice(0, 24)}`;
  if (value.bindingId !== expectedId) fail("INVALID_WRITEBACK_BINDING", "bindingId does not bind normalized binding content.");
  return deepFreeze(normalized);
}

export function bindWritebackTargetV01({ target, policy, outcomeStore = null, checkpointStore = null } = {}) {
  let acceptedTarget;
  let acceptedPolicy;
  try { acceptedTarget = validateWritebackTargetV01(target); }
  catch (error) { fail("WRITEBACK_TARGET_INVALID", "target failed the accepted Writeback Target validator.", { causeCode: error?.code ?? null }); }
  try { acceptedPolicy = validateWritebackPolicyV01(policy); }
  catch (error) { fail("WRITEBACK_POLICY_INVALID", "policy failed the accepted Writeback Policy validator.", { causeCode: error?.code ?? null }); }

  if (acceptedPolicy.targetRef !== acceptedTarget.targetId) fail("WRITEBACK_TARGET_POLICY_MISMATCH", "policy targets a different Writeback Target.");
  const targetKinds = new Set(acceptedTarget.artifactKinds);
  for (const artifactKind of acceptedPolicy.artifactKinds) {
    if (!targetKinds.has(artifactKind)) fail("WRITEBACK_TARGET_CAPABILITY_MISMATCH", "policy requires an artifact kind not supported by the target.", { artifactKind });
  }
  for (const capability of REQUIRED_CAPABILITIES) {
    if (acceptedTarget.capabilities[capability] !== true) fail("WRITEBACK_TARGET_CAPABILITY_MISMATCH", "target is missing a frozen Phase 6 write-back capability.", { capability });
  }
  validateStoreMethods({ artifactKinds: acceptedPolicy.artifactKinds, outcomeStore, checkpointStore });

  const payload = {
    bindingVersion: WRITEBACK_BINDING_VERSION_V01,
    targetRef: acceptedTarget.targetId,
    policyRef: acceptedPolicy.policyId,
    projectRefs: clone(acceptedPolicy.projectRefs),
    artifactKinds: clone(acceptedPolicy.artifactKinds),
    capabilities: clone(acceptedTarget.capabilities),
  };
  const binding = validateWritebackBindingV01({ ...payload, bindingId: `writeback-binding:${digest(payload).slice(0, 24)}` });

  return Object.freeze({ binding, outcomeStore, checkpointStore });
}
