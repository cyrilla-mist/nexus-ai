import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_ALIGNMENT_SCHEMA_V01,
  TRUSTED_CHECKPOINT_SCHEMA_V01,
  TrustedCheckpointValidationError,
  validateInitialAlignmentProposalV01,
  validateTrustedCheckpointV01,
} from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
import {
  InitialAlignmentError,
  buildInitialAlignmentProposalV01,
  confirmAndPersistInitialAlignmentV01,
  confirmInitialAlignmentV01,
} from "../experience/continuity-loop-v01/initial-alignment.mjs";
import {
  TRUSTED_CHECKPOINT_STORE_SCHEMA_V01,
  TrustedCheckpointStoreError,
  applyTrustedCheckpointWriteV01,
  createEmptyTrustedCheckpointStoreStateV01,
  createInMemoryTrustedCheckpointStoreV01,
  validateTrustedCheckpointStoreStateV01,
} from "../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";

const PROJECT = "project:nexus-atlas";

function alignmentInput() {
  return {
    projectRef: PROJECT,
    proposedAt: "2026-09-14T13:30:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Establish the first durable trusted continuation boundary for Nexus Atlas.",
    acceptedNextAction: {
      actionRef: "action:phase6c-fresh-evidence",
      summary: "Collect bounded fresh GitHub evidence after the accepted checkpoint cursor.",
      basisRefs: ["decision:phase6-single-real-loop", "docs:phase6-entry-audit"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: "cyrilla-mist/nexus-ai",
      cursorType: "default-branch-head",
      value: "586980fbc9c064a93551d0467d480840c7418a28",
      capturedAt: "2026-09-14T13:29:00Z",
    },
    governingRefs: ["decision:phase6-single-real-loop", "decision:validate-before-recover"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-self-context",
      authority: "accepted-context-plus-human-alignment",
      references: ["docs:Nexus-Atlas-v0.1-Real-Continuity-Loop-Contract", "docs:Nexus-Atlas-Phase6-Entry-Audit"],
    },
  };
}

function proposal() {
  return buildInitialAlignmentProposalV01(alignmentInput());
}

function confirmation(overrides = {}) {
  const accepted = proposal();
  return {
    proposalId: accepted.proposalId,
    accepted: true,
    actorRef: "user:cyrilla",
    confirmedAt: "2026-09-14T13:31:00Z",
    ...overrides,
  };
}

function checkpoint() {
  const acceptedProposal = proposal();
  return confirmInitialAlignmentV01({ proposal: acceptedProposal, confirmation: confirmation() });
}

function checkpointV2() {
  const first = checkpoint();
  return validateTrustedCheckpointV01({
    ...structuredClone(first),
    checkpointId: "checkpoint:verified-outcome-phase6b-test",
    version: 2,
    createdAt: "2026-09-14T14:00:00Z",
    activeObjective: "Continue from a verified postcondition.",
    evidenceCursor: {
      ...structuredClone(first.evidenceCursor),
      value: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      capturedAt: "2026-09-14T13:59:00Z",
    },
    confirmation: {
      state: "confirmed",
      authority: "verified-outcome",
      actorRef: "system:continuity-loop",
      confirmedAt: "2026-09-14T14:00:00Z",
      basisRef: "outcome:phase6b-test",
    },
  });
}

const expectValidationCode = (fn, code) => assert.throws(fn, error => error instanceof TrustedCheckpointValidationError && error.code === code);
const expectAlignmentCode = (fn, code) => assert.throws(fn, error => error instanceof InitialAlignmentError && error.code === code);
const expectStoreCode = async (promise, code) => assert.rejects(promise, error => error instanceof TrustedCheckpointStoreError && error.code === code);

test("6B-A01 Initial Alignment proposal is deterministic", () => {
  assert.deepEqual(proposal(), proposal());
  assert.match(proposal().proposalId, /^initial-alignment:[0-9a-f]{24}$/);
});

test("6B-A02 proposal preserves only the bounded accepted continuation fields", () => {
  const value = proposal();
  assert.equal(value.proposalVersion, INITIAL_ALIGNMENT_SCHEMA_V01);
  assert.equal(value.projectRef, PROJECT);
  assert.deepEqual(Object.keys(value).sort(), ["acceptedNextAction", "activeObjective", "evidenceCursor", "governingRefs", "projectRef", "proposalId", "proposalVersion", "proposedAt", "provenance", "trustedDirection", "unresolvedProtectedAmbiguities"].sort());
});

test("6B-A03 proposal output is deeply immutable and input is not mutated", () => {
  const input = alignmentInput();
  const before = structuredClone(input);
  const value = buildInitialAlignmentProposalV01(input);
  assert.deepEqual(input, before);
  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.acceptedNextAction));
  assert(Object.isFrozen(value.evidenceCursor));
});

test("6B-A04 proposal rejects unknown convenience fields", () => {
  expectAlignmentCode(() => buildInitialAlignmentProposalV01({ ...alignmentInput(), live: true }), "INVALID_INITIAL_ALIGNMENT_INPUT");
});

test("6B-A05 proposal validator rejects malformed evidence cursor", () => {
  const value = structuredClone(proposal());
  value.evidenceCursor.capturedAt = "today";
  expectValidationCode(() => validateInitialAlignmentProposalV01(value), "INVALID_EVIDENCE_CURSOR");
});

test("6B-B01 explicit acceptance creates version-1 Trusted Checkpoint", () => {
  const value = checkpoint();
  assert.equal(value.checkpointSchemaVersion, TRUSTED_CHECKPOINT_SCHEMA_V01);
  assert.equal(value.version, 1);
  assert.equal(value.projectRef, PROJECT);
  assert.equal(value.confirmation.authority, "human");
  assert.equal(value.confirmation.basisRef, proposal().proposalId);
});

test("6B-B02 checkpoint identity is deterministic for the same accepted confirmation", () => {
  assert.equal(checkpoint().checkpointId, checkpoint().checkpointId);
  assert.match(checkpoint().checkpointId, /^checkpoint:[0-9a-f]{24}$/);
});

test("6B-B03 Initial Alignment rejects implicit or negative consent", () => {
  expectAlignmentCode(() => confirmInitialAlignmentV01({ proposal: proposal(), confirmation: confirmation({ accepted: false }) }), "INITIAL_ALIGNMENT_NOT_ACCEPTED");
});

test("6B-B04 confirmation is bound to exactly the accepted proposal", () => {
  expectAlignmentCode(() => confirmInitialAlignmentV01({ proposal: proposal(), confirmation: confirmation({ proposalId: "initial-alignment:other" }) }), "INITIAL_ALIGNMENT_BINDING_MISMATCH");
});

test("6B-B05 confirmation cannot predate the proposal", () => {
  expectAlignmentCode(() => confirmInitialAlignmentV01({ proposal: proposal(), confirmation: confirmation({ confirmedAt: "2026-09-14T13:00:00Z" }) }), "INVALID_INITIAL_ALIGNMENT_CONFIRMATION");
});

test("6B-B06 checkpoint confirmation separates authority from its basis reference", () => {
  const value = checkpointV2();
  assert.deepEqual(value.confirmation, {
    state: "confirmed",
    authority: "verified-outcome",
    actorRef: "system:continuity-loop",
    confirmedAt: "2026-09-14T14:00:00Z",
    basisRef: "outcome:phase6b-test",
  });
});

test("6B-B07 checkpoint validator rejects unsupported confirmation authority", () => {
  const value = structuredClone(checkpoint());
  value.confirmation.authority = "model";
  expectValidationCode(() => validateTrustedCheckpointV01(value), "INVALID_CHECKPOINT_CONFIRMATION");
});

test("6B-B08 confirmedAt and createdAt must bind exactly", () => {
  const value = structuredClone(checkpoint());
  value.createdAt = "2026-09-14T13:32:00Z";
  expectValidationCode(() => validateTrustedCheckpointV01(value), "INVALID_CHECKPOINT_CONFIRMATION");
});

test("6B-B09 accepted action requires inspectable basis references", () => {
  const value = structuredClone(checkpoint());
  value.acceptedNextAction.basisRefs = [];
  expectValidationCode(() => validateTrustedCheckpointV01(value), "INVALID_ACCEPTED_NEXT_ACTION");
});

test("6B-B10 checkpoint is deeply immutable", () => {
  const value = checkpoint();
  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.confirmation));
  assert(Object.isFrozen(value.provenance.references));
});

test("6B-C01 empty store state is deterministic and scoped", () => {
  const state = createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs: [PROJECT] });
  assert.deepEqual(state, { storeVersion: TRUSTED_CHECKPOINT_STORE_SCHEMA_V01, projects: [] });
  assert(Object.isFrozen(state));
});

test("6B-C02 first write requires expectedVersion zero and advances to version one", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  const result = await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  assert.equal(result.replayed, false);
  assert.equal((await store.readLatest({ projectRef: PROJECT })).version, 1);
});

test("6B-C03 stale expectedVersion cannot overwrite current trusted state", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  await expectStoreCode(store.writeCheckpoint({ checkpoint: checkpointV2(), expectedVersion: 0, idempotencyKey: "outcome:two" }), "CHECKPOINT_VERSION_CONFLICT");
  assert.equal((await store.readLatest({ projectRef: PROJECT })).version, 1);
});

test("6B-C04 next checkpoint must advance version exactly once", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  const broken = structuredClone(checkpointV2());
  broken.version = 3;
  await expectStoreCode(store.writeCheckpoint({ checkpoint: broken, expectedVersion: 1, idempotencyKey: "outcome:three" }), "CHECKPOINT_VERSION_MISMATCH");
});

test("6B-C05 successful replay with the same idempotency key is a no-op", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  const first = await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  const replay = await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal((await store.exportState()).projects[0].checkpoints.length, 1);
});

test("6B-C06 reusing an idempotency key for different content fails closed", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "same-key" });
  await expectStoreCode(store.writeCheckpoint({ checkpoint: checkpointV2(), expectedVersion: 1, idempotencyKey: "same-key" }), "IDEMPOTENCY_CONFLICT");
});

test("6B-C07 configured project allowlist blocks cross-project writes", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: ["project:other"] });
  await expectStoreCode(store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" }), "PROJECT_SCOPE_NOT_ALLOWED");
});

test("6B-C08 configured project allowlist blocks cross-project reads", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await expectStoreCode(store.readLatest({ projectRef: "project:other" }), "PROJECT_SCOPE_NOT_ALLOWED");
});

test("6B-C09 second accepted checkpoint preserves append-only checkpoint history", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  await store.writeCheckpoint({ checkpoint: checkpointV2(), expectedVersion: 1, idempotencyKey: "outcome:two" });
  const state = await store.exportState();
  assert.deepEqual(state.projects[0].checkpoints.map(item => item.version), [1, 2]);
  assert.equal((await store.readLatest({ projectRef: PROJECT })).checkpointId, checkpointV2().checkpointId);
});

test("6B-C10 exported state cannot mutate the store", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one" });
  const exported = await store.exportState();
  assert(Object.isFrozen(exported));
  assert.throws(() => { exported.projects[0].checkpoints[0].version = 99; }, TypeError);
  assert.equal((await store.readLatest({ projectRef: PROJECT })).version, 1);
});

test("6B-C11 malformed persisted state is rejected before use", () => {
  const state = structuredClone(createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs: [PROJECT] }));
  state.storeVersion = "other";
  assert.throws(() => validateTrustedCheckpointStoreStateV01(state, { allowedProjectRefs: [PROJECT] }), error => error instanceof TrustedCheckpointStoreError && error.code === "INVALID_STORE_STATE");
});

test("6B-C12 deterministic write reducer does not mutate accepted input state", () => {
  const state = createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs: [PROJECT] });
  const before = structuredClone(state);
  const result = applyTrustedCheckpointWriteV01({ state, checkpoint: checkpoint(), expectedVersion: 0, idempotencyKey: "alignment:one", allowedProjectRefs: [PROJECT] });
  assert.deepEqual(state, before);
  assert.equal(result.state.projects[0].checkpoints.length, 1);
});

test("6B-D01 Initial Alignment helper persists then reads back the accepted checkpoint", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  const result = await confirmAndPersistInitialAlignmentV01({ proposal: proposal(), confirmation: confirmation(), store, idempotencyKey: "initial-alignment:nexus-atlas" });
  assert.equal(result.replayed, false);
  assert.deepEqual(await store.readLatest({ projectRef: PROJECT }), result.checkpoint);
});

test("6B-D02 Initial Alignment persistence is replay-safe", async () => {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  const input = { proposal: proposal(), confirmation: confirmation(), store, idempotencyKey: "initial-alignment:nexus-atlas" };
  assert.equal((await confirmAndPersistInitialAlignmentV01(input)).replayed, false);
  assert.equal((await confirmAndPersistInitialAlignmentV01(input)).replayed, true);
  assert.equal((await store.exportState()).projects[0].checkpoints.length, 1);
});

test("6B-D03 Initial Alignment helper refuses stores without bounded read/write contract", async () => {
  await assert.rejects(confirmAndPersistInitialAlignmentV01({ proposal: proposal(), confirmation: confirmation(), store: {}, idempotencyKey: "x" }), error => error instanceof InitialAlignmentError && error.code === "INVALID_INITIAL_ALIGNMENT_STORE");
});
