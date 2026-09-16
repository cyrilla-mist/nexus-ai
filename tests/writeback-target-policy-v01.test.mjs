import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PHASE6_FILE_TARGET_KIND_V01,
  PHASE6_MEMORY_TARGET_KIND_V01,
  Phase6StoreTargetAdapterError,
  createPhase6FileWritebackTargetV01,
  createPhase6MemoryWritebackTargetV01,
} from "../experience/writeback-v01/phase6-store-target-adapter.mjs";
import {
  WritebackCapabilityGateError,
  bindWritebackTargetV01,
  validateWritebackBindingV01,
} from "../experience/writeback-v01/writeback-capability-gate.mjs";
import {
  WritebackPolicyValidationError,
  buildWritebackPolicyV01,
  validateWritebackPolicyV01,
} from "../experience/writeback-v01/writeback-policy.mjs";
import {
  WritebackTargetValidationError,
  buildWritebackTargetV01,
  validateWritebackTargetV01,
} from "../experience/writeback-v01/writeback-target-validator.mjs";

const PROJECT = "project:nexus-atlas";
const OTHER = "project:other";
const clone = value => structuredClone(value);
const fullCaps = () => ({
  projectScopeEnforced: true,
  idempotentOutcomeAppend: true,
  checkpointCompareAndSwap: true,
  exactReadAfterWrite: true,
});

function target(overrides = {}) {
  return buildWritebackTargetV01({
    providerKind: "reference-target",
    durability: "durable",
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    capabilities: fullCaps(),
    ...overrides,
  });
}

function policy(targetValue, overrides = {}) {
  return buildWritebackPolicyV01({
    projectRefs: [PROJECT],
    targetRef: targetValue.targetId,
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    ...overrides,
  });
}

const outcomeStore = () => ({ async appendOutcome() {}, async readOutcome() {} });
const checkpointStore = () => ({ async writeCheckpoint() {}, async readLatest() {} });
const gateError = (fn, code) => assert.throws(fn, error => error instanceof WritebackCapabilityGateError && error.code === code);

test("7B-A01 target identity is deterministic over canonical content", () => {
  const first = target({ artifactKinds: ["trusted-checkpoint", "outcome-record"] });
  const second = target({ artifactKinds: ["outcome-record", "trusted-checkpoint"] });
  assert.equal(first.targetId, second.targetId);
  assert.deepEqual(first.artifactKinds, ["outcome-record", "trusted-checkpoint"]);
});

test("7B-A02 target output is deeply immutable", () => {
  const value = target();
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.capabilities), true);
  assert.equal(Object.isFrozen(value.artifactKinds), true);
});

test("7B-A03 target input is not mutated", () => {
  const input = { providerKind: "reference-target", durability: "durable", artifactKinds: ["trusted-checkpoint", "outcome-record"], capabilities: fullCaps() };
  const before = clone(input);
  buildWritebackTargetV01(input);
  assert.deepEqual(input, before);
});

test("7B-A04 providerKind rejects path/credential-shaped identifiers", () => {
  assert.throws(() => target({ providerKind: "postgres://user:secret@example" }), WritebackTargetValidationError);
  assert.throws(() => target({ providerKind: "/tmp/writeback.json" }), WritebackTargetValidationError);
});

test("7B-A05 tampered target identity is rejected", () => {
  const value = clone(target());
  value.targetId = "writeback-target:000000000000000000000000";
  assert.throws(() => validateWritebackTargetV01(value), WritebackTargetValidationError);
});

test("7B-A06 capability declaration may describe an insufficient target for fail-closed gating", () => {
  const value = target({ capabilities: { ...fullCaps(), exactReadAfterWrite: false } });
  assert.equal(value.capabilities.exactReadAfterWrite, false);
});

test("7B-B01 policy identity is deterministic over canonical project/artifact order", () => {
  const value = target();
  const first = buildWritebackPolicyV01({ projectRefs: [OTHER, PROJECT], targetRef: value.targetId, artifactKinds: ["trusted-checkpoint", "outcome-record"] });
  const second = buildWritebackPolicyV01({ projectRefs: [PROJECT, OTHER], targetRef: value.targetId, artifactKinds: ["outcome-record", "trusted-checkpoint"] });
  assert.equal(first.policyId, second.policyId);
  assert.deepEqual(first.projectRefs, [OTHER, PROJECT].sort());
});

test("7B-B02 policy output is deeply immutable and inputs remain unchanged", () => {
  const value = target();
  const input = { projectRefs: [OTHER, PROJECT], targetRef: value.targetId, artifactKinds: ["trusted-checkpoint", "outcome-record"] };
  const before = clone(input);
  const accepted = buildWritebackPolicyV01(input);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(accepted), true);
  assert.equal(Object.isFrozen(accepted.projectRefs), true);
});

test("7B-B03 policy cannot weaken verified-outcome checkpoint advancement", () => {
  const value = target();
  assert.throws(() => buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: value.targetId, artifactKinds: ["outcome-record"], requireVerifiedOutcomeForCheckpointAdvance: false }), WritebackPolicyValidationError);
});

test("7B-B04 policy cannot weaken exact read-after-write", () => {
  const value = target();
  assert.throws(() => buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: value.targetId, artifactKinds: ["outcome-record"], requireExactReadAfterWrite: false }), WritebackPolicyValidationError);
});

test("7B-B05 tampered policy identity is rejected", () => {
  const value = clone(policy(target()));
  value.policyId = "writeback-policy:000000000000000000000000";
  assert.throws(() => validateWritebackPolicyV01(value), WritebackPolicyValidationError);
});

test("7B-C01 matching target/policy/store pair produces deterministic binding", () => {
  const t = target();
  const p = policy(t);
  const first = bindWritebackTargetV01({ target: t, policy: p, outcomeStore: outcomeStore(), checkpointStore: checkpointStore() });
  const second = bindWritebackTargetV01({ target: t, policy: p, outcomeStore: outcomeStore(), checkpointStore: checkpointStore() });
  assert.equal(first.binding.bindingId, second.binding.bindingId);
  assert.deepEqual(validateWritebackBindingV01(first.binding), first.binding);
  assert.equal(Object.isFrozen(first.binding), true);
});

test("7B-C02 policy targeting another target fails closed", () => {
  const t = target();
  const other = buildWritebackTargetV01({ providerKind: "another-target", durability: "durable", artifactKinds: ["outcome-record", "trusted-checkpoint"], capabilities: fullCaps() });
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(other), outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_POLICY_MISMATCH");
});

test("7B-C03 unsupported policy artifact kind at target fails closed", () => {
  const t = target({ artifactKinds: ["outcome-record"] });
  const p = buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: t.targetId, artifactKinds: ["outcome-record", "trusted-checkpoint"] });
  gateError(() => bindWritebackTargetV01({ target: t, policy: p, outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_CAPABILITY_MISMATCH");
});

test("7B-C04 missing project-scope capability fails closed", () => {
  const t = target({ capabilities: { ...fullCaps(), projectScopeEnforced: false } });
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_CAPABILITY_MISMATCH");
});

test("7B-C05 missing idempotent Outcome append capability fails closed", () => {
  const t = target({ capabilities: { ...fullCaps(), idempotentOutcomeAppend: false } });
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_CAPABILITY_MISMATCH");
});

test("7B-C06 missing checkpoint CAS capability fails closed", () => {
  const t = target({ capabilities: { ...fullCaps(), checkpointCompareAndSwap: false } });
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_CAPABILITY_MISMATCH");
});

test("7B-C07 missing exact read-after-write capability fails closed", () => {
  const t = target({ capabilities: { ...fullCaps(), exactReadAfterWrite: false } });
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: outcomeStore(), checkpointStore: checkpointStore() }), "WRITEBACK_TARGET_CAPABILITY_MISMATCH");
});

test("7B-C08 required Outcome store methods are enforced", () => {
  const t = target();
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: { async appendOutcome() {} }, checkpointStore: checkpointStore() }), "WRITEBACK_STORE_BOUNDARY_INVALID");
});

test("7B-C09 required Checkpoint store methods are enforced", () => {
  const t = target();
  gateError(() => bindWritebackTargetV01({ target: t, policy: policy(t), outcomeStore: outcomeStore(), checkpointStore: { async readLatest() {} } }), "WRITEBACK_STORE_BOUNDARY_INVALID");
});

test("7B-C10 artifact-scoped policy does not require an unused store object", () => {
  const t = target();
  const outcomeOnly = buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: t.targetId, artifactKinds: ["outcome-record"] });
  const checkpointOnly = buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: t.targetId, artifactKinds: ["trusted-checkpoint"] });
  assert.doesNotThrow(() => bindWritebackTargetV01({ target: t, policy: outcomeOnly, outcomeStore: outcomeStore(), checkpointStore: null }));
  assert.doesNotThrow(() => bindWritebackTargetV01({ target: t, policy: checkpointOnly, outcomeStore: null, checkpointStore: checkpointStore() }));
});

test("7B-D01 accepted Phase 6 memory stores expose a safe reference target", async () => {
  const adapter = createPhase6MemoryWritebackTargetV01({ projectRefs: [PROJECT] });
  assert.equal(adapter.target.providerKind, PHASE6_MEMORY_TARGET_KIND_V01);
  assert.equal(adapter.target.durability, "memory");
  const p = policy(adapter.target);
  const bound = bindWritebackTargetV01({ target: adapter.target, policy: p, outcomeStore: adapter.outcomeStore, checkpointStore: adapter.checkpointStore });
  assert.equal(bound.binding.targetRef, adapter.target.targetId);
  await assert.rejects(() => adapter.outcomeStore.readOutcome({ projectRef: OTHER, outcomeId: "outcome:any" }), error => error?.code === "PROJECT_SCOPE_NOT_ALLOWED");
  await assert.rejects(() => adapter.checkpointStore.readLatest({ projectRef: OTHER }), error => error?.code === "PROJECT_SCOPE_NOT_ALLOWED");
});

test("7B-D02 file target descriptor does not expose local paths", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase7b-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = createPhase6FileWritebackTargetV01({
    projectRefs: [PROJECT],
    outcomeFilePath: path.join(root, "outcomes.json"),
    checkpointFilePath: path.join(root, "checkpoints.json"),
  });
  assert.equal(adapter.target.providerKind, PHASE6_FILE_TARGET_KIND_V01);
  assert.equal(adapter.target.durability, "durable");
  const serialized = JSON.stringify(adapter.target);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes("outcomes.json"), false);
  assert.equal(serialized.includes("checkpoints.json"), false);
});

test("7B-D03 file target identity is independent of machine-local file paths", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase7b-paths-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = createPhase6FileWritebackTargetV01({ projectRefs: [PROJECT], outcomeFilePath: path.join(root, "a-outcomes.json"), checkpointFilePath: path.join(root, "a-checkpoints.json") });
  const second = createPhase6FileWritebackTargetV01({ projectRefs: [PROJECT], outcomeFilePath: path.join(root, "b-outcomes.json"), checkpointFilePath: path.join(root, "b-checkpoints.json") });
  assert.equal(first.target.targetId, second.target.targetId);
});

test("7B-D04 file adapter rejects one path shared by both semantic stores", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase7b-shared-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const shared = path.join(root, "state.json");
  assert.throws(() => createPhase6FileWritebackTargetV01({ projectRefs: [PROJECT], outcomeFilePath: shared, checkpointFilePath: shared }), error => error instanceof Phase6StoreTargetAdapterError && error.code === "INVALID_PHASE6_TARGET_OPTIONS");
});
