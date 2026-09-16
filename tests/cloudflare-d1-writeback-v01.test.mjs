import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  OUTCOME_RECORD_AUTHORITY_V01,
  OUTCOME_RECORD_VERSION_V01,
  validateOutcomeRecordV01,
} from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import {
  TRUSTED_CHECKPOINT_SCHEMA_V01,
  validateTrustedCheckpointV01,
} from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
import {
  CLOUDFLARE_D1_TARGET_KIND_V01,
  CloudflareD1WritebackError,
  D1_WRITEBACK_SCHEMA_SQL_V01,
  D1_WRITEBACK_SQL_V01,
  createCloudflareD1WritebackTargetV01,
  initializeD1WritebackSchemaV01,
} from "../experience/writeback-v01/cloudflare-d1-writeback-adapter.mjs";
import { bindWritebackTargetV01 } from "../experience/writeback-v01/writeback-capability-gate.mjs";
import { buildWritebackPolicyV01 } from "../experience/writeback-v01/writeback-policy.mjs";

const PROJECT = "project:nexus-atlas";
const OTHER = "project:other";
const REPOSITORY = "cyrilla-mist/nexus-ai";
const BASE = "a".repeat(40);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

class FakeD1PreparedStatement {
  constructor(database, sql, params = []) {
    this.database = database;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) { return new FakeD1PreparedStatement(this.database, this.sql, params); }
  async first() { return this.database.first(this.sql, this.params); }
  async run() { return this.database.execute(this.sql, this.params, this.database.state); }
}

class FakeD1Session {
  constructor(database) { this.database = database; }
  prepare(sql) { return new FakeD1PreparedStatement(this.database, sql); }
  async batch(statements) { return this.database.batch(statements); }
}

class FakeD1Database {
  constructor() {
    this.state = { outcomes: [], outcomeReceipts: [], checkpoints: [], checkpointReceipts: [] };
    this.sessionBookmarks = [];
    this.execCalls = [];
    this.failNextBatch = false;
  }
  withSession(bookmark) {
    this.sessionBookmarks.push(bookmark);
    return new FakeD1Session(this);
  }
  async exec(sql) {
    this.execCalls.push(sql);
    return { count: 4, duration: 1 };
  }
  prepare(sql) { return new FakeD1PreparedStatement(this, sql); }
  async first(sql, params) {
    const [projectRef, second] = params;
    if (sql === D1_WRITEBACK_SQL_V01.selectOutcomeReceipt) {
      const row = this.state.outcomeReceipts.find(item => item.project_ref === projectRef && item.idempotency_key === second);
      return row ? { outcome_id: row.outcome_id, outcome_digest: row.outcome_digest } : null;
    }
    if (sql === D1_WRITEBACK_SQL_V01.selectOutcome) {
      const row = this.state.outcomes.find(item => item.project_ref === projectRef && item.outcome_id === second);
      return row ? clone(row) : null;
    }
    if (sql === D1_WRITEBACK_SQL_V01.selectCheckpointReceipt) {
      const row = this.state.checkpointReceipts.find(item => item.project_ref === projectRef && item.idempotency_key === second);
      return row ? { checkpoint_id: row.checkpoint_id, checkpoint_digest: row.checkpoint_digest } : null;
    }
    if (sql === D1_WRITEBACK_SQL_V01.selectCheckpoint) {
      const row = this.state.checkpoints.find(item => item.project_ref === projectRef && item.checkpoint_id === second);
      return row ? clone(row) : null;
    }
    if (sql === D1_WRITEBACK_SQL_V01.selectLatestCheckpoint) {
      const rows = this.state.checkpoints.filter(item => item.project_ref === projectRef).sort((a, b) => b.version - a.version);
      return rows.length ? clone(rows[0]) : null;
    }
    throw new Error(`Unsupported SELECT: ${sql}`);
  }
  execute(sql, params, state) {
    if (sql === D1_WRITEBACK_SQL_V01.insertOutcome) {
      const [project_ref, outcome_id, payload_json, outcome_digest, recorded_at] = params;
      if (state.outcomes.some(item => item.project_ref === project_ref && item.outcome_id === outcome_id)) throw new Error("UNIQUE outcome");
      state.outcomes.push({ project_ref, outcome_id, payload_json, outcome_digest, recorded_at });
      return { success: true };
    }
    if (sql === D1_WRITEBACK_SQL_V01.insertOutcomeReceipt) {
      const [project_ref, idempotency_key, outcome_id, outcome_digest] = params;
      if (state.outcomeReceipts.some(item => item.project_ref === project_ref && item.idempotency_key === idempotency_key)) throw new Error("UNIQUE outcome receipt");
      state.outcomeReceipts.push({ project_ref, idempotency_key, outcome_id, outcome_digest });
      return { success: true };
    }
    if (sql === D1_WRITEBACK_SQL_V01.insertCheckpoint) {
      const [project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at] = params;
      if (state.checkpoints.some(item => item.project_ref === project_ref && (item.version === version || item.checkpoint_id === checkpoint_id))) throw new Error("UNIQUE checkpoint");
      state.checkpoints.push({ project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at });
      return { success: true };
    }
    if (sql === D1_WRITEBACK_SQL_V01.insertCheckpointReceipt) {
      const [project_ref, idempotency_key, checkpoint_id, checkpoint_digest] = params;
      if (state.checkpointReceipts.some(item => item.project_ref === project_ref && item.idempotency_key === idempotency_key)) throw new Error("UNIQUE checkpoint receipt");
      state.checkpointReceipts.push({ project_ref, idempotency_key, checkpoint_id, checkpoint_digest });
      return { success: true };
    }
    throw new Error(`Unsupported mutation: ${sql}`);
  }
  async batch(statements) {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      throw new Error("synthetic D1 batch failure");
    }
    const working = clone(this.state);
    const results = [];
    for (const statement of statements) results.push(this.execute(statement.sql, statement.params, working));
    this.state = working;
    return results;
  }
}

function outcomePayload(index = 1) {
  const minute = String(index).padStart(2, "0");
  return {
    outcomeVersion: OUTCOME_RECORD_VERSION_V01,
    projectRef: PROJECT,
    reentryRef: `reentry-package:test-${index}`,
    verificationEnvelopeRef: `verification-envelope:test-${index}`,
    actionObservationRef: `action-observation:test-${index}`,
    verificationRef: `outcome-verification:test-${index}`,
    actionRef: `action:test-${index}`,
    attemptedAt: `2026-09-16T12:${minute}:00Z`,
    executionActor: "external:test-runtime",
    expectedPostcondition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
    observedPostcondition: { baselineHead: BASE, observedHead: BASE, lineage: "identical", expectedValueObserved: null },
    verificationState: "failed",
    verificationEvidenceRefs: [],
    failureReason: "Fresh GitHub evidence did not prove the expected head advancement.",
    recordedAt: `2026-09-16T13:${minute}:00Z`,
    authority: OUTCOME_RECORD_AUTHORITY_V01,
    capabilities: { persistAllowed: true, nextCheckpointAllowed: false },
  };
}

function makeOutcome(index = 1) {
  const payload = outcomePayload(index);
  const outcomeId = `outcome:${digest(payload).slice(0, 24)}`;
  const value = {
    outcomeVersion: payload.outcomeVersion,
    outcomeId,
    projectRef: payload.projectRef,
    reentryRef: payload.reentryRef,
    verificationEnvelopeRef: payload.verificationEnvelopeRef,
    actionObservationRef: payload.actionObservationRef,
    verificationRef: payload.verificationRef,
    actionRef: payload.actionRef,
    attemptedAt: payload.attemptedAt,
    executionActor: payload.executionActor,
    expectedPostcondition: payload.expectedPostcondition,
    observedPostcondition: payload.observedPostcondition,
    verificationState: payload.verificationState,
    verificationEvidenceRefs: payload.verificationEvidenceRefs,
    failureReason: payload.failureReason,
    recordedAt: payload.recordedAt,
    authority: payload.authority,
    capabilities: payload.capabilities,
  };
  return validateOutcomeRecordV01(value);
}

function makeCheckpoint(version, { id = `checkpoint:d1-test-${version}`, head = String(version).repeat(40) } = {}) {
  const createdAt = `2026-09-16T14:${String(version).padStart(2, "0")}:00Z`;
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: TRUSTED_CHECKPOINT_SCHEMA_V01,
    checkpointId: id,
    projectRef: PROJECT,
    version,
    createdAt,
    trustedDirection: "Preserve the accepted Nexus continuity direction.",
    activeObjective: "Prove durable write-back without weakening Phase 6 semantics.",
    acceptedNextAction: {
      actionRef: `action:d1-next-${version}`,
      summary: "Continue the bounded durable write-back acceptance sequence.",
      basisRefs: ["decision:phase7-writeback-generalization"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REPOSITORY,
      cursorType: "default-branch-head",
      value: head,
      capturedAt: createdAt,
    },
    governingRefs: ["decision:phase7-writeback-generalization"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-phase7c-test",
      authority: version === 1 ? "human-confirmed-bootstrap" : "verified-outcome",
      references: [`evidence:d1-test-${version}`],
    },
    confirmation: {
      state: "confirmed",
      authority: version === 1 ? "human" : "verified-outcome",
      actorRef: version === 1 ? "user:test" : "system:nexus-continuity-closure-v01",
      confirmedAt: createdAt,
      basisRef: version === 1 ? "alignment:test" : `outcome:test-${version - 1}`,
    },
  });
}

function adapter(db = new FakeD1Database()) {
  return { db, adapter: createCloudflareD1WritebackTargetV01({ db, projectRefs: [PROJECT] }) };
}

function d1Error(code) {
  return error => error instanceof CloudflareD1WritebackError && error.code === code;
}

test("7C-A01 D1 schema initializer uses the explicit schema and no target metadata", async () => {
  const db = new FakeD1Database();
  const result = await initializeD1WritebackSchemaV01({ db });
  assert.equal(result.initialized, true);
  assert.equal(db.execCalls.length, 1);
  assert.equal(db.execCalls[0], D1_WRITEBACK_SCHEMA_SQL_V01);
  assert.match(db.execCalls[0], /nexus_writeback_outcomes_v01/);
  assert.match(db.execCalls[0], /nexus_writeback_checkpoints_v01/);
});

test("7C-A02 D1 target is durable, capability-complete and contains no database identity", () => {
  const { adapter: value } = adapter();
  assert.equal(value.target.providerKind, CLOUDFLARE_D1_TARGET_KIND_V01);
  assert.equal(value.target.durability, "durable");
  assert.deepEqual(value.target.artifactKinds, ["outcome-record", "trusted-checkpoint"]);
  assert.deepEqual(value.target.capabilities, {
    projectScopeEnforced: true,
    idempotentOutcomeAppend: true,
    checkpointCompareAndSwap: true,
    exactReadAfterWrite: true,
  });
  const serialized = JSON.stringify(value.target);
  assert.equal(serialized.includes("database"), false);
  assert.equal(serialized.includes("binding"), false);
});

test("7C-A03 D1 target passes the accepted Phase 7B policy/capability gate", () => {
  const { adapter: value } = adapter();
  const policy = buildWritebackPolicyV01({ projectRefs: [PROJECT], targetRef: value.target.targetId, artifactKinds: ["outcome-record", "trusted-checkpoint"] });
  const bound = bindWritebackTargetV01({ target: value.target, policy, outcomeStore: value.outcomeStore, checkpointStore: value.checkpointStore });
  assert.equal(bound.binding.targetRef, value.target.targetId);
});

test("7C-A04 every D1 runtime read/write session starts first-primary", async () => {
  const { db, adapter: value } = adapter();
  await value.outcomeStore.readOutcome({ projectRef: PROJECT, outcomeId: "outcome:missing" });
  await value.checkpointStore.readLatest({ projectRef: PROJECT });
  assert.ok(db.sessionBookmarks.length >= 2);
  assert.deepEqual(new Set(db.sessionBookmarks), new Set(["first-primary"]));
});

test("7C-B01 Outcome append is durable, exact-read-back verified and replay-safe", async () => {
  const { adapter: value } = adapter();
  const outcome = makeOutcome(1);
  const first = await value.outcomeStore.appendOutcome({ outcome, idempotencyKey: "outcome:attempt-1" });
  assert.equal(first.replayed, false);
  assert.deepEqual(first.outcome, outcome);
  const read = await value.outcomeStore.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId });
  assert.deepEqual(read, outcome);
  const replay = await value.outcomeStore.appendOutcome({ outcome, idempotencyKey: "outcome:attempt-1" });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.outcome, outcome);
});

test("7C-B02 Outcome idempotency key cannot be reused for different accepted content", async () => {
  const { adapter: value } = adapter();
  await value.outcomeStore.appendOutcome({ outcome: makeOutcome(1), idempotencyKey: "outcome:same-key" });
  await assert.rejects(() => value.outcomeStore.appendOutcome({ outcome: makeOutcome(2), idempotencyKey: "outcome:same-key" }), d1Error("IDEMPOTENCY_CONFLICT"));
});

test("7C-B03 same Outcome identity under another idempotency key is rejected", async () => {
  const { adapter: value } = adapter();
  const outcome = makeOutcome(1);
  await value.outcomeStore.appendOutcome({ outcome, idempotencyKey: "outcome:key-a" });
  await assert.rejects(() => value.outcomeStore.appendOutcome({ outcome, idempotencyKey: "outcome:key-b" }), d1Error("DUPLICATE_OUTCOME_ID"));
});

test("7C-B04 project scope is enforced before Outcome access", async () => {
  const { adapter: value } = adapter();
  await assert.rejects(() => value.outcomeStore.readOutcome({ projectRef: OTHER, outcomeId: "outcome:any" }), d1Error("PROJECT_SCOPE_NOT_ALLOWED"));
  const otherOutcome = clone(makeOutcome(1));
  otherOutcome.projectRef = OTHER;
  await assert.rejects(() => value.outcomeStore.appendOutcome({ outcome: otherOutcome, idempotencyKey: "outcome:other" }), d1Error("INVALID_OUTCOME_APPEND"));
});

test("7C-B05 failed D1 Outcome batch does not leave a partial artifact", async () => {
  const { db, adapter: value } = adapter();
  const outcome = makeOutcome(1);
  db.failNextBatch = true;
  await assert.rejects(() => value.outcomeStore.appendOutcome({ outcome, idempotencyKey: "outcome:batch-fail" }), d1Error("D1_WRITE_ERROR"));
  assert.equal(await value.outcomeStore.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId }), null);
  assert.equal(db.state.outcomeReceipts.length, 0);
});

test("7C-C01 initial Checkpoint writes at expectedVersion=0 and replays safely", async () => {
  const { adapter: value } = adapter();
  const checkpoint = makeCheckpoint(1);
  const first = await value.checkpointStore.writeCheckpoint({ checkpoint, expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  assert.equal(first.replayed, false);
  assert.deepEqual(first.checkpoint, checkpoint);
  assert.deepEqual(await value.checkpointStore.readLatest({ projectRef: PROJECT }), checkpoint);
  const replay = await value.checkpointStore.writeCheckpoint({ checkpoint, expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  assert.equal(replay.replayed, true);
});

test("7C-C02 Checkpoint expectedVersion remains compare-and-swap protected", async () => {
  const { adapter: value } = adapter();
  await value.checkpointStore.writeCheckpoint({ checkpoint: makeCheckpoint(1), expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  await assert.rejects(() => value.checkpointStore.writeCheckpoint({ checkpoint: makeCheckpoint(2), expectedVersion: 0, idempotencyKey: "checkpoint:v2" }), d1Error("CHECKPOINT_VERSION_CONFLICT"));
});

test("7C-C03 Checkpoint version must advance exactly one", async () => {
  const { adapter: value } = adapter();
  await value.checkpointStore.writeCheckpoint({ checkpoint: makeCheckpoint(1), expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  const skipped = makeCheckpoint(3);
  await assert.rejects(() => value.checkpointStore.writeCheckpoint({ checkpoint: skipped, expectedVersion: 1, idempotencyKey: "checkpoint:v3" }), d1Error("CHECKPOINT_VERSION_MISMATCH"));
});

test("7C-C04 Checkpoint idempotency key cannot bind different content", async () => {
  const { adapter: value } = adapter();
  const first = makeCheckpoint(1);
  await value.checkpointStore.writeCheckpoint({ checkpoint: first, expectedVersion: 0, idempotencyKey: "checkpoint:same-key" });
  const different = makeCheckpoint(1, { id: "checkpoint:d1-test-alternate", head: "b".repeat(40) });
  await assert.rejects(() => value.checkpointStore.writeCheckpoint({ checkpoint: different, expectedVersion: 0, idempotencyKey: "checkpoint:same-key" }), d1Error("IDEMPOTENCY_CONFLICT"));
});

test("7C-C05 same Checkpoint identity under another idempotency key is rejected after version binding", async () => {
  const { adapter: value } = adapter();
  const checkpoint = makeCheckpoint(1);
  await value.checkpointStore.writeCheckpoint({ checkpoint, expectedVersion: 0, idempotencyKey: "checkpoint:key-a" });
  await assert.rejects(() => value.checkpointStore.writeCheckpoint({ checkpoint, expectedVersion: 1, idempotencyKey: "checkpoint:key-b" }), d1Error("CHECKPOINT_VERSION_MISMATCH"));
});

test("7C-C06 valid v2 Checkpoint advances and becomes latest", async () => {
  const { adapter: value } = adapter();
  const first = makeCheckpoint(1);
  const second = makeCheckpoint(2, { head: "b".repeat(40) });
  await value.checkpointStore.writeCheckpoint({ checkpoint: first, expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  await value.checkpointStore.writeCheckpoint({ checkpoint: second, expectedVersion: 1, idempotencyKey: "checkpoint:v2" });
  assert.deepEqual(await value.checkpointStore.readLatest({ projectRef: PROJECT }), second);
});

test("7C-C07 project scope is enforced for Checkpoint reads", async () => {
  const { adapter: value } = adapter();
  await assert.rejects(() => value.checkpointStore.readLatest({ projectRef: OTHER }), d1Error("PROJECT_SCOPE_NOT_ALLOWED"));
});

test("7C-C08 failed D1 Checkpoint batch leaves current trusted state unchanged", async () => {
  const { db, adapter: value } = adapter();
  const first = makeCheckpoint(1);
  await value.checkpointStore.writeCheckpoint({ checkpoint: first, expectedVersion: 0, idempotencyKey: "checkpoint:v1" });
  db.failNextBatch = true;
  await assert.rejects(() => value.checkpointStore.writeCheckpoint({ checkpoint: makeCheckpoint(2, { head: "b".repeat(40) }), expectedVersion: 1, idempotencyKey: "checkpoint:v2-fail" }), d1Error("D1_WRITE_ERROR"));
  assert.deepEqual(await value.checkpointStore.readLatest({ projectRef: PROJECT }), first);
  assert.equal(db.state.checkpointReceipts.length, 1);
});

test("7C-D01 D1 adapter preserves separate Outcome and Checkpoint tables", () => {
  assert.notEqual(D1_WRITEBACK_SQL_V01.insertOutcome, D1_WRITEBACK_SQL_V01.insertCheckpoint);
  assert.match(D1_WRITEBACK_SQL_V01.insertOutcome, /nexus_writeback_outcomes_v01/);
  assert.match(D1_WRITEBACK_SQL_V01.insertCheckpoint, /nexus_writeback_checkpoints_v01/);
});

test("7C-D02 D1 adapter exposes no delete/update lifecycle operation in v0.1", () => {
  const { adapter: value } = adapter();
  assert.deepEqual(Object.keys(value.outcomeStore).sort(), ["appendOutcome", "readOutcome"]);
  assert.deepEqual(Object.keys(value.checkpointStore).sort(), ["readLatest", "writeCheckpoint"]);
});
