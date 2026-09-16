import { createHash } from "node:crypto";

import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { validateTrustedCheckpointV01 } from "../continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { buildWritebackTargetV01 } from "./writeback-target-validator.mjs";

export const CLOUDFLARE_D1_TARGET_KIND_V01 = "cloudflare-d1";

export const D1_WRITEBACK_SCHEMA_SQL_V01 = `
CREATE TABLE IF NOT EXISTS nexus_writeback_outcomes_v01 (
  project_ref TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  outcome_digest TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (project_ref, outcome_id)
);
CREATE TABLE IF NOT EXISTS nexus_writeback_outcome_receipts_v01 (
  project_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  outcome_digest TEXT NOT NULL,
  PRIMARY KEY (project_ref, idempotency_key)
);
CREATE TABLE IF NOT EXISTS nexus_writeback_checkpoints_v01 (
  project_ref TEXT NOT NULL,
  version INTEGER NOT NULL,
  checkpoint_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  checkpoint_digest TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_ref, version),
  UNIQUE (project_ref, checkpoint_id)
);
CREATE TABLE IF NOT EXISTS nexus_writeback_checkpoint_receipts_v01 (
  project_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  checkpoint_digest TEXT NOT NULL,
  PRIMARY KEY (project_ref, idempotency_key)
);
`;

export const D1_WRITEBACK_SQL_V01 = Object.freeze({
  selectOutcomeReceipt: "SELECT outcome_id, outcome_digest FROM nexus_writeback_outcome_receipts_v01 WHERE project_ref = ?1 AND idempotency_key = ?2 LIMIT 1",
  selectOutcome: "SELECT project_ref, outcome_id, payload_json, outcome_digest, recorded_at FROM nexus_writeback_outcomes_v01 WHERE project_ref = ?1 AND outcome_id = ?2 LIMIT 1",
  insertOutcome: "INSERT INTO nexus_writeback_outcomes_v01 (project_ref, outcome_id, payload_json, outcome_digest, recorded_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  insertOutcomeReceipt: "INSERT INTO nexus_writeback_outcome_receipts_v01 (project_ref, idempotency_key, outcome_id, outcome_digest) VALUES (?1, ?2, ?3, ?4)",
  selectCheckpointReceipt: "SELECT checkpoint_id, checkpoint_digest FROM nexus_writeback_checkpoint_receipts_v01 WHERE project_ref = ?1 AND idempotency_key = ?2 LIMIT 1",
  selectCheckpoint: "SELECT project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at FROM nexus_writeback_checkpoints_v01 WHERE project_ref = ?1 AND checkpoint_id = ?2 LIMIT 1",
  selectLatestCheckpoint: "SELECT project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at FROM nexus_writeback_checkpoints_v01 WHERE project_ref = ?1 ORDER BY version DESC LIMIT 1",
  insertCheckpoint: "INSERT INTO nexus_writeback_checkpoints_v01 (project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  insertCheckpointReceipt: "INSERT INTO nexus_writeback_checkpoint_receipts_v01 (project_ref, idempotency_key, checkpoint_id, checkpoint_digest) VALUES (?1, ?2, ?3, ?4)",
});

export class CloudflareD1WritebackError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CloudflareD1WritebackError";
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
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code, message, details = {}) => { throw new CloudflareD1WritebackError(code, message, details); };

function boundedString(value, code, field, max = 500) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${field} is invalid.`);
  return value;
}

function normalizeProjectRefs(projectRefs) {
  if (!Array.isArray(projectRefs) || projectRefs.length === 0) fail("INVALID_D1_WRITEBACK_OPTIONS", "projectRefs must be a non-empty array.");
  const values = projectRefs.map((value, index) => boundedString(value, "INVALID_D1_WRITEBACK_OPTIONS", `projectRefs[${index}]`));
  if (new Set(values).size !== values.length) fail("INVALID_D1_WRITEBACK_OPTIONS", "projectRefs must be unique.");
  return [...values].sort();
}

function validateDatabase(db) {
  if (!db || typeof db !== "object" || typeof db.withSession !== "function") fail("INVALID_D1_WRITEBACK_OPTIONS", "db must expose Cloudflare D1 withSession().");
  return db;
}

function primarySession(db) {
  let session;
  try { session = db.withSession("first-primary"); }
  catch { fail("D1_SESSION_ERROR", "Unable to open a first-primary D1 session."); }
  if (!session || typeof session.prepare !== "function" || typeof session.batch !== "function") fail("D1_SESSION_ERROR", "D1 session must expose prepare() and batch().");
  return session;
}

function prepared(session, sql, params) {
  let statement;
  try { statement = session.prepare(sql); }
  catch { fail("D1_QUERY_ERROR", "Unable to prepare D1 statement."); }
  if (!statement || typeof statement.bind !== "function") fail("D1_QUERY_ERROR", "D1 prepared statement does not expose bind().");
  return statement.bind(...params);
}

async function first(session, sql, params) {
  const statement = prepared(session, sql, params);
  if (typeof statement.first !== "function") fail("D1_QUERY_ERROR", "D1 prepared statement does not expose first().");
  try { return await statement.first(); }
  catch { fail("D1_QUERY_ERROR", "D1 read failed."); }
}

async function batch(session, statements) {
  let results;
  try { results = await session.batch(statements); }
  catch (error) { throw error; }
  if (!Array.isArray(results) || results.length !== statements.length || results.some(result => result?.success === false)) {
    fail("D1_WRITE_ERROR", "D1 batch did not confirm every statement.");
  }
  return results;
}

function ensureProjectAllowed(projectRef, allowlist, code) {
  const ref = boundedString(projectRef, code, "projectRef");
  if (!allowlist.includes(ref)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Project is outside the configured D1 write-back allowlist.", { projectRef: ref });
  return ref;
}

function parsePayload(text, code, field) {
  if (typeof text !== "string" || text.length === 0) fail(code, `${field} is missing.`);
  try { return JSON.parse(text); }
  catch { fail(code, `${field} is not valid JSON.`); }
}

function acceptedOutcome(outcome) {
  try { return validateOutcomeRecordV01(outcome); }
  catch (error) { fail("INVALID_OUTCOME_APPEND", "Outcome Record failed the frozen validator.", { causeCode: error?.code ?? null }); }
}

function acceptedCheckpoint(checkpoint) {
  try { return validateTrustedCheckpointV01(checkpoint); }
  catch (error) { fail("INVALID_CHECKPOINT_WRITE", "Trusted Checkpoint failed the frozen validator.", { causeCode: error?.code ?? null }); }
}

function normalizeIdempotencyKey(value, code) {
  return boundedString(value, code, "idempotencyKey");
}

function normalizeExpectedVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_CHECKPOINT_WRITE", "expectedVersion must be a non-negative safe integer.");
  return value;
}

function decodeOutcomeRow(row, projectRef, outcomeId) {
  if (row === null || row === undefined) return null;
  if (!object(row) || row.project_ref !== projectRef || row.outcome_id !== outcomeId || typeof row.outcome_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.outcome_digest)) fail("INVALID_D1_STORED_OUTCOME", "Stored Outcome row is invalid.");
  const parsed = parsePayload(row.payload_json, "INVALID_D1_STORED_OUTCOME", "payload_json");
  let accepted;
  try { accepted = validateOutcomeRecordV01(parsed); }
  catch (error) { fail("INVALID_D1_STORED_OUTCOME", "Stored Outcome payload failed the frozen validator.", { causeCode: error?.code ?? null }); }
  if (accepted.projectRef !== projectRef || accepted.outcomeId !== outcomeId || digest(accepted) !== row.outcome_digest || row.recorded_at !== accepted.recordedAt) fail("INVALID_D1_STORED_OUTCOME", "Stored Outcome row does not bind its payload.");
  return accepted;
}

function decodeCheckpointRow(row, projectRef) {
  if (row === null || row === undefined) return null;
  if (!object(row) || row.project_ref !== projectRef || !Number.isSafeInteger(row.version) || row.version < 1 || typeof row.checkpoint_id !== "string" || typeof row.checkpoint_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.checkpoint_digest)) fail("INVALID_D1_STORED_CHECKPOINT", "Stored Checkpoint row is invalid.");
  const parsed = parsePayload(row.payload_json, "INVALID_D1_STORED_CHECKPOINT", "payload_json");
  let accepted;
  try { accepted = validateTrustedCheckpointV01(parsed); }
  catch (error) { fail("INVALID_D1_STORED_CHECKPOINT", "Stored Checkpoint payload failed the frozen validator.", { causeCode: error?.code ?? null }); }
  if (accepted.projectRef !== projectRef || accepted.checkpointId !== row.checkpoint_id || accepted.version !== row.version || digest(accepted) !== row.checkpoint_digest || row.created_at !== accepted.createdAt) fail("INVALID_D1_STORED_CHECKPOINT", "Stored Checkpoint row does not bind its payload.");
  return accepted;
}

async function readOutcomeFrom(session, projectRef, outcomeId) {
  const row = await first(session, D1_WRITEBACK_SQL_V01.selectOutcome, [projectRef, outcomeId]);
  return decodeOutcomeRow(row, projectRef, outcomeId);
}

async function readCheckpointFrom(session, projectRef, checkpointId) {
  const row = await first(session, D1_WRITEBACK_SQL_V01.selectCheckpoint, [projectRef, checkpointId]);
  const accepted = decodeCheckpointRow(row, projectRef);
  if (accepted !== null && accepted.checkpointId !== checkpointId) fail("INVALID_D1_STORED_CHECKPOINT", "Stored Checkpoint lookup returned another identity.");
  return accepted;
}

async function readLatestFrom(session, projectRef) {
  const row = await first(session, D1_WRITEBACK_SQL_V01.selectLatestCheckpoint, [projectRef]);
  return decodeCheckpointRow(row, projectRef);
}

function outcomeReceiptMatches(receipt, outcome) {
  return receipt?.outcome_id === outcome.outcomeId && receipt?.outcome_digest === digest(outcome);
}

function checkpointReceiptMatches(receipt, checkpoint) {
  return receipt?.checkpoint_id === checkpoint.checkpointId && receipt?.checkpoint_digest === digest(checkpoint);
}

async function resolveOutcomeWriteRace(db, outcome, idempotencyKey) {
  const session = primarySession(db);
  const receipt = await first(session, D1_WRITEBACK_SQL_V01.selectOutcomeReceipt, [outcome.projectRef, idempotencyKey]);
  if (receipt) {
    if (!outcomeReceiptMatches(receipt, outcome)) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different Outcome content.", { idempotencyKey });
    const stored = await readOutcomeFrom(session, outcome.projectRef, outcome.outcomeId);
    if (!stored || !same(stored, outcome)) fail("WRITE_VERIFICATION_FAILED", "Replayed Outcome receipt does not resolve to exact stored content.");
    return deepFreeze({ outcome: clone(stored), replayed: true });
  }
  const duplicate = await readOutcomeFrom(session, outcome.projectRef, outcome.outcomeId);
  if (duplicate) fail("DUPLICATE_OUTCOME_ID", "outcomeId already exists without the supplied idempotency receipt.", { outcomeId: outcome.outcomeId });
  fail("D1_WRITE_ERROR", "D1 Outcome append failed without an accepted replay state.");
}

async function resolveCheckpointWriteRace(db, checkpoint, expectedVersion, idempotencyKey) {
  const session = primarySession(db);
  const receipt = await first(session, D1_WRITEBACK_SQL_V01.selectCheckpointReceipt, [checkpoint.projectRef, idempotencyKey]);
  if (receipt) {
    if (!checkpointReceiptMatches(receipt, checkpoint)) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different Checkpoint content.", { idempotencyKey });
    const stored = await readCheckpointFrom(session, checkpoint.projectRef, checkpoint.checkpointId);
    if (!stored || !same(stored, checkpoint)) fail("WRITE_VERIFICATION_FAILED", "Replayed Checkpoint receipt does not resolve to exact stored content.");
    return deepFreeze({ checkpoint: clone(stored), replayed: true });
  }
  const duplicate = await readCheckpointFrom(session, checkpoint.projectRef, checkpoint.checkpointId);
  if (duplicate) fail("DUPLICATE_CHECKPOINT_ID", "checkpointId already exists without the supplied idempotency receipt.", { checkpointId: checkpoint.checkpointId });
  const latest = await readLatestFrom(session, checkpoint.projectRef);
  const currentVersion = latest?.version ?? 0;
  if (currentVersion !== expectedVersion) fail("CHECKPOINT_VERSION_CONFLICT", "expectedVersion no longer matches current durable checkpoint version.", { expectedVersion, currentVersion });
  fail("D1_WRITE_ERROR", "D1 Checkpoint write failed without an accepted replay state.");
}

export async function initializeD1WritebackSchemaV01({ db } = {}) {
  if (!db || typeof db.exec !== "function") fail("INVALID_D1_WRITEBACK_OPTIONS", "D1 schema initialization requires db.exec().");
  try { await db.exec(D1_WRITEBACK_SCHEMA_SQL_V01); }
  catch { fail("D1_SCHEMA_INITIALIZATION_FAILED", "Unable to initialize D1 write-back schema."); }
  return Object.freeze({ schemaVersion: "nexus-atlas.cloudflare-d1-writeback-schema.v0.1", initialized: true });
}

export function createCloudflareD1WritebackTargetV01({ db, projectRefs } = {}) {
  validateDatabase(db);
  const allowlist = normalizeProjectRefs(projectRefs);
  const target = buildWritebackTargetV01({
    providerKind: CLOUDFLARE_D1_TARGET_KIND_V01,
    durability: "durable",
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    capabilities: {
      projectScopeEnforced: true,
      idempotentOutcomeAppend: true,
      checkpointCompareAndSwap: true,
      exactReadAfterWrite: true,
    },
  });

  const outcomeStore = Object.freeze({
    async readOutcome({ projectRef, outcomeId } = {}) {
      const ref = ensureProjectAllowed(projectRef, allowlist, "INVALID_OUTCOME_STORE_READ");
      const id = boundedString(outcomeId, "INVALID_OUTCOME_STORE_READ", "outcomeId");
      const stored = await readOutcomeFrom(primarySession(db), ref, id);
      return stored === null ? null : deepFreeze(clone(stored));
    },
    async appendOutcome({ outcome, idempotencyKey } = {}) {
      const accepted = acceptedOutcome(outcome);
      ensureProjectAllowed(accepted.projectRef, allowlist, "INVALID_OUTCOME_APPEND");
      const key = normalizeIdempotencyKey(idempotencyKey, "INVALID_OUTCOME_APPEND");
      const outcomeDigest = digest(accepted);
      const session = primarySession(db);
      const receipt = await first(session, D1_WRITEBACK_SQL_V01.selectOutcomeReceipt, [accepted.projectRef, key]);
      if (receipt) {
        if (!outcomeReceiptMatches(receipt, accepted)) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different Outcome content.", { idempotencyKey: key });
        const stored = await readOutcomeFrom(session, accepted.projectRef, accepted.outcomeId);
        if (!stored || !same(stored, accepted)) fail("WRITE_VERIFICATION_FAILED", "Replayed Outcome receipt does not resolve to exact stored content.");
        return deepFreeze({ outcome: clone(stored), replayed: true });
      }
      const duplicate = await readOutcomeFrom(session, accepted.projectRef, accepted.outcomeId);
      if (duplicate) fail("DUPLICATE_OUTCOME_ID", "outcomeId already exists without the supplied idempotency receipt.", { outcomeId: accepted.outcomeId });
      const statements = [
        prepared(session, D1_WRITEBACK_SQL_V01.insertOutcome, [accepted.projectRef, accepted.outcomeId, JSON.stringify(accepted), outcomeDigest, accepted.recordedAt]),
        prepared(session, D1_WRITEBACK_SQL_V01.insertOutcomeReceipt, [accepted.projectRef, key, accepted.outcomeId, outcomeDigest]),
      ];
      try { await batch(session, statements); }
      catch { return resolveOutcomeWriteRace(db, accepted, key); }
      const readBack = await readOutcomeFrom(session, accepted.projectRef, accepted.outcomeId);
      if (!readBack || !same(readBack, accepted)) fail("WRITE_VERIFICATION_FAILED", "D1 Outcome append failed exact read-after-write verification.");
      return deepFreeze({ outcome: clone(readBack), replayed: false });
    },
  });

  const checkpointStore = Object.freeze({
    async readLatest({ projectRef } = {}) {
      const ref = ensureProjectAllowed(projectRef, allowlist, "INVALID_STORE_READ");
      const stored = await readLatestFrom(primarySession(db), ref);
      return stored === null ? null : deepFreeze(clone(stored));
    },
    async writeCheckpoint({ checkpoint, expectedVersion, idempotencyKey } = {}) {
      const accepted = acceptedCheckpoint(checkpoint);
      ensureProjectAllowed(accepted.projectRef, allowlist, "INVALID_CHECKPOINT_WRITE");
      const expected = normalizeExpectedVersion(expectedVersion);
      const key = normalizeIdempotencyKey(idempotencyKey, "INVALID_CHECKPOINT_WRITE");
      const checkpointDigest = digest(accepted);
      const session = primarySession(db);
      const receipt = await first(session, D1_WRITEBACK_SQL_V01.selectCheckpointReceipt, [accepted.projectRef, key]);
      if (receipt) {
        if (!checkpointReceiptMatches(receipt, accepted)) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different Checkpoint content.", { idempotencyKey: key });
        const stored = await readCheckpointFrom(session, accepted.projectRef, accepted.checkpointId);
        if (!stored || !same(stored, accepted)) fail("WRITE_VERIFICATION_FAILED", "Replayed Checkpoint receipt does not resolve to exact stored content.");
        return deepFreeze({ checkpoint: clone(stored), replayed: true });
      }
      const latest = await readLatestFrom(session, accepted.projectRef);
      const currentVersion = latest?.version ?? 0;
      if (expected !== currentVersion) fail("CHECKPOINT_VERSION_CONFLICT", "expectedVersion does not match current durable checkpoint version.", { expectedVersion: expected, currentVersion });
      if (accepted.version !== currentVersion + 1) fail("CHECKPOINT_VERSION_MISMATCH", "checkpoint.version must advance the current version by exactly one.", { checkpointVersion: accepted.version, currentVersion });
      const duplicate = await readCheckpointFrom(session, accepted.projectRef, accepted.checkpointId);
      if (duplicate) fail("DUPLICATE_CHECKPOINT_ID", "checkpointId already exists without the supplied idempotency receipt.", { checkpointId: accepted.checkpointId });
      const statements = [
        prepared(session, D1_WRITEBACK_SQL_V01.insertCheckpoint, [accepted.projectRef, accepted.version, accepted.checkpointId, JSON.stringify(accepted), checkpointDigest, accepted.createdAt]),
        prepared(session, D1_WRITEBACK_SQL_V01.insertCheckpointReceipt, [accepted.projectRef, key, accepted.checkpointId, checkpointDigest]),
      ];
      try { await batch(session, statements); }
      catch { return resolveCheckpointWriteRace(db, accepted, expected, key); }
      const readBack = await readLatestFrom(session, accepted.projectRef);
      if (!readBack || !same(readBack, accepted)) fail("WRITE_VERIFICATION_FAILED", "D1 Checkpoint write failed exact read-after-write verification.");
      return deepFreeze({ checkpoint: clone(readBack), replayed: false });
    },
  });

  return Object.freeze({ target, outcomeStore, checkpointStore });
}
