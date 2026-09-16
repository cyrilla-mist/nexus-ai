import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { validateOutcomeRecordV01 } from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { createInMemoryOutcomeRecordStoreV01 } from "../experience/continuity-loop-v01/outcome-record-store.mjs";
import { createInMemoryTrustedCheckpointStoreV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";
import { validateTrustedCheckpointV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { buildWritebackTargetV01 } from "../experience/writeback-v01/writeback-target-validator.mjs";
import { buildWritebackPolicyV01 } from "../experience/writeback-v01/writeback-policy.mjs";
import { buildWritebackRetentionPolicyV01 } from "../experience/writeback-v01/writeback-retention-policy.mjs";
import { createPhase6HistoryReaderV01 } from "../experience/writeback-v01/phase6-history-reader-adapter.mjs";
import { readWritebackHistoryV01 } from "../experience/writeback-v01/writeback-history.mjs";
import {
  WritebackManagementSurfaceError,
  buildWritebackManagementSurfaceV01,
  validateWritebackManagementSurfaceV01,
} from "../experience/writeback-v01/writeback-management-surface.mjs";
import { buildOutcomeCategoryProposalV01 } from "../experience/writeback-v01/writeback-outcome-category.mjs";
import {
  buildBoundPostconditionProofV01,
  buildCrossSourcePostconditionProposalV01,
  buildCrossSourceVerificationV01,
} from "../experience/writeback-v01/cross-source-postcondition.mjs";

const A = "project:nexus-atlas";
const B = "project:phase7g-reference";
const REF = "cyrilla-mist/nexus-ai";
const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CHECKPOINT_AT = "2026-09-16T14:20:00Z";
const OUTCOME_AT = "2026-09-16T14:30:00Z";
const CATEGORY_AT = "2026-09-16T14:31:00Z";
const DECLARED_AT = "2026-09-16T14:32:00Z";
const OBSERVED_AT = "2026-09-16T14:33:00Z";
const VERIFIED_AT = "2026-09-16T14:34:00Z";
const GENERATED_AT = "2026-09-16T14:35:00Z";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

function checkpoint(projectRef, suffix) {
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: "nexus-atlas.trusted-checkpoint.v0.1",
    checkpointId: `checkpoint:phase7g:${suffix}`,
    projectRef,
    version: 1,
    createdAt: CHECKPOINT_AT,
    trustedDirection: `Preserve trusted direction for ${projectRef}.`,
    activeObjective: `Prove isolated write-back management for ${projectRef}.`,
    acceptedNextAction: {
      actionRef: `action:phase7g:${suffix}`,
      summary: `Run the bounded Phase 7G reference proof for ${projectRef}.`,
      basisRefs: [`decision:phase7g:${suffix}`],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REF,
      cursorType: "default-branch-head",
      value: BASE,
      capturedAt: CHECKPOINT_AT,
    },
    governingRefs: [`decision:phase7g:${suffix}`],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "phase7g-reference-fixture",
      authority: "bounded-acceptance-fixture",
      references: [`fixture:phase7g:${suffix}`],
    },
    confirmation: {
      state: "confirmed",
      authority: "human",
      actorRef: "user:phase7g-fixture-owner",
      confirmedAt: CHECKPOINT_AT,
      basisRef: `fixture:phase7g:${suffix}`,
    },
  });
}

function outcome(projectRef, suffix, state = "verified") {
  const verified = state === "verified";
  const payload = {
    outcomeVersion: "nexus-atlas.outcome-record.v0.1",
    projectRef,
    reentryRef: `reentry-package:phase7g:${suffix}`,
    verificationEnvelopeRef: `verification-envelope:phase7g:${suffix}`,
    actionObservationRef: `action-observation:phase7g:${suffix}`,
    verificationRef: `outcome-verification:phase7g:${suffix}`,
    actionRef: `action:phase7g:${suffix}`,
    attemptedAt: "2026-09-16T14:25:00Z",
    executionActor: "external:phase7g-fixture-runner",
    expectedPostcondition: {
      conditionType: "github-default-branch-head-advanced",
      expectedValue: null,
    },
    observedPostcondition: {
      baselineHead: BASE,
      observedHead: verified ? HEAD : BASE,
      lineage: verified ? "ahead" : "identical",
      expectedValueObserved: null,
    },
    verificationState: state,
    verificationEvidenceRefs: verified ? [`github:commit:${REF}:${HEAD}`] : [],
    failureReason: verified ? null : "The bounded acceptance fixture did not satisfy the postcondition.",
    recordedAt: OUTCOME_AT,
    authority: "derived-outcome-record",
    capabilities: {
      persistAllowed: true,
      nextCheckpointAllowed: verified,
    },
  };
  return validateOutcomeRecordV01({
    ...payload,
    outcomeId: `outcome:${digest(payload).slice(0, 24)}`,
  });
}

function target() {
  return buildWritebackTargetV01({
    providerKind: "phase7g-reference-memory",
    durability: "memory",
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    capabilities: {
      projectScopeEnforced: true,
      idempotentOutcomeAppend: true,
      checkpointCompareAndSwap: true,
      exactReadAfterWrite: true,
    },
  });
}

function policies() {
  const t = target();
  return {
    target: t,
    writebackPolicy: buildWritebackPolicyV01({
      projectRefs: [A, B],
      targetRef: t.targetId,
      artifactKinds: ["outcome-record", "trusted-checkpoint"],
    }),
    retentionPolicy: buildWritebackRetentionPolicyV01({
      projectRefs: [A, B],
      maxHistoryPageSize: 20,
    }),
  };
}

async function histories() {
  const outcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [A, B] });
  const checkpointStore = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [A, B] });
  const cpA = checkpoint(A, "a");
  const cpB = checkpoint(B, "b");
  const outA = outcome(A, "a");
  const outB = outcome(B, "b", "failed");
  await outcomeStore.appendOutcome({ outcome: outA, idempotencyKey: "phase7g:outcome:a" });
  await outcomeStore.appendOutcome({ outcome: outB, idempotencyKey: "phase7g:outcome:b" });
  await checkpointStore.writeCheckpoint({ checkpoint: cpA, expectedVersion: 0, idempotencyKey: "phase7g:checkpoint:a" });
  await checkpointStore.writeCheckpoint({ checkpoint: cpB, expectedVersion: 0, idempotencyKey: "phase7g:checkpoint:b" });
  const reader = createPhase6HistoryReaderV01({ outcomeStore, checkpointStore, projectRefs: [A, B] });
  const { retentionPolicy } = policies();
  return {
    outcomeStore,
    checkpointStore,
    reader,
    A: {
      outcomes: await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: A, artifactKind: "outcome-record", limit: 20 }),
      checkpoints: await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: A, artifactKind: "trusted-checkpoint", limit: 20 }),
    },
    B: {
      outcomes: await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: B, artifactKind: "outcome-record", limit: 20 }),
      checkpoints: await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: B, artifactKind: "trusted-checkpoint", limit: 20 }),
    },
  };
}

function verification(projectRef = A) {
  const category = buildOutcomeCategoryProposalV01({
    projectRef,
    category: "milestone-transition",
    subjectRef: "milestone:phase7g",
    proposedAt: CATEGORY_AT,
    basisRefs: ["decision:phase7g-management-proof"],
    evidenceRefs: [],
    explanation: "Verify a bounded management-surface reference milestone.",
  });
  const postcondition = buildCrossSourcePostconditionProposalV01({
    categoryProposal: category,
    provider: "datahub",
    profile: "continuity-mcp-v0.9.5",
    scopeRef: "datahub:continuity:project-nexus-ai",
    declaredAt: DECLARED_AT,
    condition: { conditionType: "datahub-entity-status-equals", expectedValue: "completed" },
    explanation: "Use a bounded accepted source profile for management summary testing.",
  });
  const proof = buildBoundPostconditionProofV01({
    postconditionProposal: postcondition,
    observedAt: OBSERVED_AT,
    result: "satisfied",
    observedValue: "completed",
    evidenceRefs: ["datahub:continuity-entity:milestone:phase7g"],
    sourceAuthority: "datahub-read-only-metadata-state",
  });
  return buildCrossSourceVerificationV01({
    categoryProposal: category,
    postconditionProposal: postcondition,
    proof,
    verifiedAt: VERIFIED_AT,
  });
}

async function surface(projectRef = A, overrides = {}) {
  const p = policies();
  const h = await histories();
  const pages = h[projectRef === A ? "A" : "B"];
  return buildWritebackManagementSurfaceV01({
    target: p.target,
    writebackPolicy: p.writebackPolicy,
    retentionPolicy: p.retentionPolicy,
    projectRef,
    outcomeHistoryPage: pages.outcomes,
    checkpointHistoryPage: pages.checkpoints,
    crossSourceVerifications: projectRef === A ? [verification(A)] : [],
    generatedAt: GENERATED_AT,
    ...overrides,
  });
}

test("7G-A01 management surface is deterministic and deeply immutable", async () => {
  const first = await surface(A);
  const second = await surface(A);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.history), true);
  assert.equal(Object.isFrozen(first.verificationSummary), true);
});

test("7G-A02 management surface remains explicitly read-only", async () => {
  const value = await surface(A);
  assert.deepEqual(value.capabilities, {
    readOnly: true,
    writeAllowed: false,
    deleteAllowed: false,
    productionProvisioningAllowed: false,
    canonicalContextWriteAllowed: false,
  });
});

test("7G-A03 target summary preserves logical capabilities without connection metadata", async () => {
  const value = await surface(A);
  assert.equal(value.target.providerKind, "phase7g-reference-memory");
  assert.equal(value.target.capabilities.checkpointCompareAndSwap, true);
  assert.equal(JSON.stringify(value).includes("database_id"), false);
  assert.equal(JSON.stringify(value).includes("filePath"), false);
});

test("7G-A04 writeback policy safety requirements remain visible and true", async () => {
  const value = await surface(A);
  assert.equal(value.policy.requireVerifiedOutcomeForCheckpointAdvance, true);
  assert.equal(value.policy.requireExactReadAfterWrite, true);
});

test("7G-A05 retention surface preserves retain-all and no-deletion policy", async () => {
  const value = await surface(A);
  assert.equal(value.retention.retentionMode, "retain-all");
  assert.deepEqual(value.retention.retainOutcomeStates, ["verified", "failed", "indeterminate"]);
  assert.equal(value.retention.deletionAllowed, false);
});

test("7G-A06 management history exposes summaries rather than full Outcome payloads", async () => {
  const value = await surface(A);
  assert.equal(value.history.outcomes.count, 1);
  assert.deepEqual(Object.keys(value.history.outcomes.records[0]), ["outcomeRef", "verificationState", "recordedAt", "actionRef"]);
  assert.equal(Object.hasOwn(value.history.outcomes.records[0], "observedPostcondition"), false);
});

test("7G-A07 checkpoint management history exposes only bounded summary fields", async () => {
  const value = await surface(A);
  assert.deepEqual(Object.keys(value.history.checkpoints.records[0]), ["checkpointRef", "version", "createdAt", "nextActionRef"]);
  assert.equal(Object.hasOwn(value.history.checkpoints.records[0], "trustedDirection"), false);
});

test("7G-A08 cross-source verification is summarized by state and source profile", async () => {
  const value = await surface(A);
  assert.deepEqual(value.verificationSummary.states, { verified: 1, failed: 0, indeterminate: 0 });
  assert.deepEqual(value.verificationSummary.sourceProfiles, [{ provider: "datahub", profile: "continuity-mcp-v0.9.5", count: 1 }]);
});

test("7G-A09 management surface identity binds project-scoped content", async () => {
  const a = await surface(A);
  const b = await surface(B);
  assert.notEqual(a.surfaceId, b.surfaceId);
});

test("7G-B01 two-project Outcome history remains isolated", async () => {
  const h = await histories();
  assert.equal(h.A.outcomes.items.length, 1);
  assert.equal(h.A.outcomes.items[0].projectRef, A);
  assert.equal(h.B.outcomes.items.length, 1);
  assert.equal(h.B.outcomes.items[0].projectRef, B);
  assert.notEqual(h.A.outcomes.items[0].outcomeId, h.B.outcomes.items[0].outcomeId);
});

test("7G-B02 two-project Checkpoint history remains isolated", async () => {
  const h = await histories();
  assert.equal(h.A.checkpoints.items[0].projectRef, A);
  assert.equal(h.B.checkpoints.items[0].projectRef, B);
  assert.notEqual(h.A.checkpoints.items[0].checkpointId, h.B.checkpoints.items[0].checkpointId);
});

test("7G-B03 project A history cannot be used to build project B management surface", async () => {
  const p = policies();
  const h = await histories();
  assert.throws(
    () => buildWritebackManagementSurfaceV01({
      target: p.target,
      writebackPolicy: p.writebackPolicy,
      retentionPolicy: p.retentionPolicy,
      projectRef: B,
      outcomeHistoryPage: h.A.outcomes,
      checkpointHistoryPage: h.B.checkpoints,
      crossSourceVerifications: [],
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof WritebackManagementSurfaceError && error.code === "WRITEBACK_MANAGEMENT_SCOPE_MISMATCH",
  );
});

test("7G-B04 project A verification cannot leak into project B summary", async () => {
  const p = policies();
  const h = await histories();
  assert.throws(
    () => buildWritebackManagementSurfaceV01({
      target: p.target,
      writebackPolicy: p.writebackPolicy,
      retentionPolicy: p.retentionPolicy,
      projectRef: B,
      outcomeHistoryPage: h.B.outcomes,
      checkpointHistoryPage: h.B.checkpoints,
      crossSourceVerifications: [verification(A)],
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof WritebackManagementSurfaceError && error.code === "WRITEBACK_MANAGEMENT_SCOPE_MISMATCH",
  );
});

test("7G-B05 project excluded from writeback policy fails closed", async () => {
  const p = policies();
  const h = await histories();
  const restricted = buildWritebackPolicyV01({
    projectRefs: [A],
    targetRef: p.target.targetId,
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
  });
  assert.throws(
    () => buildWritebackManagementSurfaceV01({
      target: p.target,
      writebackPolicy: restricted,
      retentionPolicy: p.retentionPolicy,
      projectRef: B,
      outcomeHistoryPage: h.B.outcomes,
      checkpointHistoryPage: h.B.checkpoints,
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof WritebackManagementSurfaceError && error.code === "PROJECT_SCOPE_NOT_ALLOWED",
  );
});

test("7G-B06 project excluded from retention policy fails closed", async () => {
  const p = policies();
  const h = await histories();
  const restricted = buildWritebackRetentionPolicyV01({ projectRefs: [A], maxHistoryPageSize: 20 });
  assert.throws(() => buildWritebackManagementSurfaceV01({
    target: p.target,
    writebackPolicy: p.writebackPolicy,
    retentionPolicy: restricted,
    projectRef: B,
    outcomeHistoryPage: h.B.outcomes,
    checkpointHistoryPage: h.B.checkpoints,
    generatedAt: GENERATED_AT,
  }));
});

test("7G-B07 policy targeting another Writeback Target fails closed", async () => {
  const p = policies();
  const h = await histories();
  const otherTarget = buildWritebackTargetV01({
    providerKind: "another-reference-target",
    durability: "memory",
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    capabilities: {
      projectScopeEnforced: true,
      idempotentOutcomeAppend: true,
      checkpointCompareAndSwap: true,
      exactReadAfterWrite: true,
    },
  });
  assert.throws(
    () => buildWritebackManagementSurfaceV01({
      target: otherTarget,
      writebackPolicy: p.writebackPolicy,
      retentionPolicy: p.retentionPolicy,
      projectRef: A,
      outcomeHistoryPage: h.A.outcomes,
      checkpointHistoryPage: h.A.checkpoints,
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof WritebackManagementSurfaceError && error.code === "WRITEBACK_MANAGEMENT_TARGET_POLICY_MISMATCH",
  );
});

test("7G-B08 history page bound to another retention policy fails closed", async () => {
  const p = policies();
  const h = await histories();
  const otherRetention = buildWritebackRetentionPolicyV01({ projectRefs: [A, B], maxHistoryPageSize: 10 });
  assert.throws(
    () => buildWritebackManagementSurfaceV01({
      target: p.target,
      writebackPolicy: p.writebackPolicy,
      retentionPolicy: otherRetention,
      projectRef: A,
      outcomeHistoryPage: h.A.outcomes,
      checkpointHistoryPage: h.A.checkpoints,
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof WritebackManagementSurfaceError && error.code === "WRITEBACK_MANAGEMENT_RETENTION_MISMATCH",
  );
});

test("7G-C01 management projection does not mutate accepted upstream artifacts", async () => {
  const p = policies();
  const h = await histories();
  const v = verification(A);
  const inputs = {
    target: p.target,
    writebackPolicy: p.writebackPolicy,
    retentionPolicy: p.retentionPolicy,
    outcomeHistoryPage: h.A.outcomes,
    checkpointHistoryPage: h.A.checkpoints,
    crossSourceVerifications: [v],
  };
  const before = clone(inputs);
  buildWritebackManagementSurfaceV01({ ...inputs, projectRef: A, generatedAt: GENERATED_AT });
  assert.deepEqual(inputs, before);
});

test("7G-C02 tampered surface identity fails closed", async () => {
  const value = clone(await surface(A));
  value.surfaceId = "writeback-management:000000000000000000000000";
  assert.throws(() => validateWritebackManagementSurfaceV01(value));
});

test("7G-C03 read-only management surface has no method/capability implying delete or write", async () => {
  const value = await surface(A);
  const serialized = JSON.stringify(value);
  assert.equal(value.capabilities.writeAllowed, false);
  assert.equal(value.capabilities.deleteAllowed, false);
  assert.equal(serialized.includes("deleteAction"), false);
  assert.equal(serialized.includes("writeAction"), false);
});

test("7G-C04 second project is an in-repository synthetic acceptance fixture only", async () => {
  const value = await surface(B);
  assert.equal(value.projectRef, B);
  assert.equal(value.verificationSummary.total, 0);
  assert.equal(value.capabilities.productionProvisioningAllowed, false);
});
