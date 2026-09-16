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
  D1_HISTORY_SQL_V01,
  CloudflareD1HistoryReaderError,
  createCloudflareD1HistoryReaderV01,
} from "../experience/writeback-v01/cloudflare-d1-history-reader.mjs";
import { createPhase6HistoryReaderV01 } from "../experience/writeback-v01/phase6-history-reader-adapter.mjs";
import { createPhase6MemoryWritebackTargetV01 } from "../experience/writeback-v01/phase6-store-target-adapter.mjs";
import {
  WritebackHistoryError,
  readWritebackHistoryV01,
  validateWritebackHistoryPageV01,
} from "../experience/writeback-v01/writeback-history.mjs";
import {
  WritebackRetentionPolicyError,
  buildWritebackRetentionPolicyV01,
  validateWritebackRetentionPolicyV01,
} from "../experience/writeback-v01/writeback-retention-policy.mjs";

const PROJECT = "project:nexus-atlas";
const OTHER = "project:other";
const REPOSITORY = "cyrilla-mist/nexus-ai";
const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

function outcomePayload(index, state) {
  const minute = String(index).padStart(2, "0");
  const verified = state === "verified";
  const indeterminate = state === "indeterminate";
  return {
    outcomeVersion: OUTCOME_RECORD_VERSION_V01,
    projectRef: PROJECT,
    reentryRef: `reentry-package:history-${index}`,
    verificationEnvelopeRef: `verification-envelope:history-${index}`,
    actionObservationRef: `action-observation:history-${index}`,
    verificationRef: `outcome-verification:history-${index}`,
    actionRef: `action:history-${index}`,
    attemptedAt: `2026-09-16T10:${minute}:00Z`,
    executionActor: "external:history-test",
    expectedPostcondition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
    observedPostcondition: {
      baselineHead: BASE,
      observedHead: indeterminate ? null : (verified ? HEAD : BASE),
      lineage: indeterminate ? null : (verified ? "ahead" : "identical"),
      expectedValueObserved: null,
    },
    verificationState: state,
    verificationEvidenceRefs: verified ? [`github:commit:${REPOSITORY}:${HEAD}`] : [],
    failureReason: verified ? null : (indeterminate ? "Fresh verification source was unavailable." : "Fresh evidence did not prove the expected postcondition."),
    recordedAt: `2026-09-16T11:${minute}:00Z`,
    authority: OUTCOME_RECORD_AUTHORITY_V01,
    capabilities: { persistAllowed: true, nextCheckpointAllowed: verified },
  };
}

function makeOutcome(index, state) {
  const payload = outcomePayload(index, state);
  const outcomeId = `outcome:${digest(payload).slice(0, 24)}`;
  return validateOutcomeRecordV01({
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
  });
}

function makeCheckpoint(version) {
  const createdAt = `2026-09-16T12:${String(version).padStart(2, "0")}:00Z`;
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: TRUSTED_CHECKPOINT_SCHEMA_V01,
    checkpointId: `checkpoint:history-${version}`,
    projectRef: PROJECT,
    version,
    createdAt,
    trustedDirection: "Preserve verified Nexus continuity.",
    activeObjective: "Expose bounded retained write-back history.",
    acceptedNextAction: {
      actionRef: `action:history-next-${version}`,
      summary: "Continue the bounded history acceptance sequence.",
      basisRefs: ["decision:phase7-history-retention"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REPOSITORY,
      cursorType: "default-branch-head",
      value: String(version).repeat(40),
      capturedAt: createdAt,
    },
    governingRefs: ["decision:phase7-history-retention"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-phase7d-test",
      authority: version === 1 ? "human-confirmed-bootstrap" : "verified-outcome",
      references: [`evidence:history-${version}`],
    },
    confirmation: {
      state: "confirmed",
      authority: version === 1 ? "human" : "verified-outcome",
      actorRef: version === 1 ? "user:test" : "system:nexus-continuity-closure-v01",
      confirmedAt: createdAt,
      basisRef: version === 1 ? "alignment:history" : `outcome:history-${version - 1}`,
    },
  });
}

async function seededPhase6History() {
  const target = createPhase6MemoryWritebackTargetV01({ projectRefs: [PROJECT] });
  const outcomes = [makeOutcome(1, "verified"), makeOutcome(2, "failed"), makeOutcome(3, "indeterminate")];
  for (const [index, outcome] of outcomes.entries()) {
    await target.outcomeStore.appendOutcome({ outcome, idempotencyKey: `history-outcome-${index + 1}` });
  }
  for (let version = 1; version <= 3; version += 1) {
    await target.checkpointStore.writeCheckpoint({ checkpoint: makeCheckpoint(version), expectedVersion: version - 1, idempotencyKey: `history-checkpoint-${version}` });
  }
  return {
    outcomes,
    checkpoints: [makeCheckpoint(1), makeCheckpoint(2), makeCheckpoint(3)],
    reader: createPhase6HistoryReaderV01({ outcomeStore: target.outcomeStore, checkpointStore: target.checkpointStore, projectRefs: [PROJECT] }),
  };
}

class FakeHistoryStatement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) { return new FakeHistoryStatement(this.db, this.sql, params); }
  async first() { return this.db.first(this.sql, this.params); }
  async run() { return { success: true, results: this.db.rows(this.sql, this.params) }; }
}

class FakeHistorySession {
  constructor(db) { this.db = db; }
  prepare(sql) { return new FakeHistoryStatement(this.db, sql); }
}

class FakeHistoryD1 {
  constructor({ outcomes, checkpoints }) {
    this.sessionBookmarks = [];
    this.outcomes = outcomes.map(outcome => ({
      project_ref: outcome.projectRef,
      outcome_id: outcome.outcomeId,
      payload_json: JSON.stringify(outcome),
      outcome_digest: digest(outcome),
      recorded_at: outcome.recordedAt,
    }));
    this.checkpoints = checkpoints.map(checkpoint => ({
      project_ref: checkpoint.projectRef,
      version: checkpoint.version,
      checkpoint_id: checkpoint.checkpointId,
      payload_json: JSON.stringify(checkpoint),
      checkpoint_digest: digest(checkpoint),
      created_at: checkpoint.createdAt,
    }));
  }
  withSession(bookmark) { this.sessionBookmarks.push(bookmark); return new FakeHistorySession(this); }
  first(sql, params) {
    if (sql === D1_HISTORY_SQL_V01.outcomeCursor) {
      const row = this.outcomes.find(item => item.project_ref === params[0] && item.outcome_id === params[1]);
      return row ? { outcome_id: row.outcome_id, recorded_at: row.recorded_at } : null;
    }
    if (sql === D1_HISTORY_SQL_V01.checkpointCursor) {
      const row = this.checkpoints.find(item => item.project_ref === params[0] && item.checkpoint_id === params[1]);
      return row ? { checkpoint_id: row.checkpoint_id, version: row.version } : null;
    }
    throw new Error(`Unsupported first SQL: ${sql}`);
  }
  rows(sql, params) {
    if (sql === D1_HISTORY_SQL_V01.outcomeFirstPage) {
      return this.outcomes.filter(item => item.project_ref === params[0]).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.outcome_id.localeCompare(a.outcome_id)).slice(0, params[1]).map(clone);
    }
    if (sql === D1_HISTORY_SQL_V01.outcomeAfterCursor) {
      const [projectRef, recordedAt, outcomeId, limit] = params;
      return this.outcomes.filter(item => item.project_ref === projectRef && (item.recorded_at < recordedAt || (item.recorded_at === recordedAt && item.outcome_id < outcomeId))).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.outcome_id.localeCompare(a.outcome_id)).slice(0, limit).map(clone);
    }
    if (sql === D1_HISTORY_SQL_V01.checkpointFirstPage) {
      return this.checkpoints.filter(item => item.project_ref === params[0]).sort((a, b) => b.version - a.version).slice(0, params[1]).map(clone);
    }
    if (sql === D1_HISTORY_SQL_V01.checkpointAfterCursor) {
      const [projectRef, version, limit] = params;
      return this.checkpoints.filter(item => item.project_ref === projectRef && item.version < version).sort((a, b) => b.version - a.version).slice(0, limit).map(clone);
    }
    throw new Error(`Unsupported page SQL: ${sql}`);
  }
}

const historyError = code => error => error instanceof WritebackHistoryError && error.code === code;

test("7D-A01 retain-all policy is deterministic and deeply immutable", () => {
  const first = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 25 });
  const second = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 25 });
  assert.equal(first.policyId, second.policyId);
  assert.deepEqual(first.retainOutcomeStates, ["verified", "failed", "indeterminate"]);
  assert.equal(first.retainCheckpointHistory, true);
  assert.equal(first.deletionAllowed, false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.retainOutcomeStates), true);
});

test("7D-A02 retention policy cannot enable destructive deletion", () => {
  const accepted = clone(buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT] }));
  accepted.deletionAllowed = true;
  assert.throws(() => validateWritebackRetentionPolicyV01(accepted), WritebackRetentionPolicyError);
});

test("7D-A03 retention policy cannot drop failed or indeterminate Outcomes", () => {
  const accepted = clone(buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT] }));
  accepted.retainOutcomeStates = ["verified"];
  assert.throws(() => validateWritebackRetentionPolicyV01(accepted), WritebackRetentionPolicyError);
});

test("7D-A04 retention policy page bound is capped", () => {
  assert.throws(() => buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 101 }), WritebackRetentionPolicyError);
});

test("7D-B01 Phase 6 Outcome history is newest-first and paginated without dropping failure states", async () => {
  const { outcomes, reader } = await seededPhase6History();
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 2 });
  const first = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 2 });
  assert.deepEqual(first.items.map(item => item.outcomeId), [outcomes[2].outcomeId, outcomes[1].outcomeId]);
  assert.deepEqual(first.items.map(item => item.verificationState), ["indeterminate", "failed"]);
  assert.equal(first.nextCursor, outcomes[1].outcomeId);
  assert.equal(first.truncated, true);
  const second = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.items.map(item => item.outcomeId), [outcomes[0].outcomeId]);
  assert.equal(second.items[0].verificationState, "verified");
  assert.equal(second.nextCursor, null);
});

test("7D-B02 Phase 6 Checkpoint history is newest-version-first and bounded", async () => {
  const { checkpoints, reader } = await seededPhase6History();
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 2 });
  const first = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "trusted-checkpoint", limit: 2 });
  assert.deepEqual(first.items.map(item => item.version), [3, 2]);
  assert.equal(first.nextCursor, checkpoints[1].checkpointId);
  const second = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "trusted-checkpoint", limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.items.map(item => item.version), [1]);
});

test("7D-B03 history page identity is deterministic and page is deeply immutable", async () => {
  const { reader } = await seededPhase6History();
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 3 });
  const first = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 3 });
  const second = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 3 });
  assert.equal(first.historyId, second.historyId);
  assert.deepEqual(validateWritebackHistoryPageV01(first), first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.items), true);
});

test("7D-B04 retention policy project scope and page limit are enforced before reader access", async () => {
  const { reader } = await seededPhase6History();
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 2 });
  await assert.rejects(() => readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: OTHER, artifactKind: "outcome-record", limit: 1 }), historyError("PROJECT_SCOPE_NOT_ALLOWED"));
  await assert.rejects(() => readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 3 }), historyError("INVALID_WRITEBACK_HISTORY_QUERY"));
});

test("7D-B05 Phase 6 history reader exposes read-only lifecycle surface", async () => {
  const { reader } = await seededPhase6History();
  assert.deepEqual(Object.keys(reader).sort(), ["listCheckpoints", "listOutcomes"]);
});

test("7D-C01 D1 history reader matches Phase 6 Outcome ordering and pagination", async () => {
  const outcomes = [makeOutcome(1, "verified"), makeOutcome(2, "failed"), makeOutcome(3, "indeterminate")];
  const checkpoints = [makeCheckpoint(1), makeCheckpoint(2), makeCheckpoint(3)];
  const db = new FakeHistoryD1({ outcomes, checkpoints });
  const reader = createCloudflareD1HistoryReaderV01({ db, projectRefs: [PROJECT] });
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 2 });
  const first = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 2 });
  assert.deepEqual(first.items.map(item => item.outcomeId), [outcomes[2].outcomeId, outcomes[1].outcomeId]);
  const second = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "outcome-record", limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.items.map(item => item.outcomeId), [outcomes[0].outcomeId]);
  assert.deepEqual(new Set(db.sessionBookmarks), new Set(["first-primary"]));
});

test("7D-C02 D1 history reader matches newest Checkpoint version pagination", async () => {
  const outcomes = [makeOutcome(1, "verified")];
  const checkpoints = [makeCheckpoint(1), makeCheckpoint(2), makeCheckpoint(3)];
  const db = new FakeHistoryD1({ outcomes, checkpoints });
  const reader = createCloudflareD1HistoryReaderV01({ db, projectRefs: [PROJECT] });
  const policy = buildWritebackRetentionPolicyV01({ projectRefs: [PROJECT], maxHistoryPageSize: 2 });
  const first = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "trusted-checkpoint", limit: 2 });
  assert.deepEqual(first.items.map(item => item.version), [3, 2]);
  const second = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy: policy, projectRef: PROJECT, artifactKind: "trusted-checkpoint", limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.items.map(item => item.version), [1]);
});

test("7D-C03 D1 history cursor must resolve inside retained project history", async () => {
  const db = new FakeHistoryD1({ outcomes: [makeOutcome(1, "verified")], checkpoints: [makeCheckpoint(1)] });
  const reader = createCloudflareD1HistoryReaderV01({ db, projectRefs: [PROJECT] });
  await assert.rejects(() => reader.listOutcomes({ projectRef: PROJECT, limit: 1, cursor: "outcome:missing" }), error => error instanceof CloudflareD1HistoryReaderError && error.code === "HISTORY_CURSOR_INVALID");
  await assert.rejects(() => reader.listCheckpoints({ projectRef: PROJECT, limit: 1, cursor: "checkpoint:missing" }), error => error instanceof CloudflareD1HistoryReaderError && error.code === "HISTORY_CURSOR_INVALID");
});

test("7D-C04 D1 history reader validates stored digest before exposing history", async () => {
  const outcome = makeOutcome(1, "verified");
  const db = new FakeHistoryD1({ outcomes: [outcome], checkpoints: [makeCheckpoint(1)] });
  db.outcomes[0].outcome_digest = "0".repeat(64);
  const reader = createCloudflareD1HistoryReaderV01({ db, projectRefs: [PROJECT] });
  await assert.rejects(() => reader.listOutcomes({ projectRef: PROJECT, limit: 1, cursor: null }), error => error instanceof CloudflareD1HistoryReaderError && error.code === "INVALID_D1_HISTORY_ROW");
});
