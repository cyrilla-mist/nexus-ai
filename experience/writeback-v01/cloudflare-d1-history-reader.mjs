import { createHash } from "node:crypto";

import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { validateTrustedCheckpointV01 } from "../continuity-loop-v01/trusted-checkpoint-validator.mjs";

export const D1_HISTORY_SQL_V01 = Object.freeze({
  outcomeCursor: "SELECT outcome_id, recorded_at FROM nexus_writeback_outcomes_v01 WHERE project_ref = ?1 AND outcome_id = ?2 LIMIT 1",
  outcomeFirstPage: "SELECT project_ref, outcome_id, payload_json, outcome_digest, recorded_at FROM nexus_writeback_outcomes_v01 WHERE project_ref = ?1 ORDER BY recorded_at DESC, outcome_id DESC LIMIT ?2",
  outcomeAfterCursor: "SELECT project_ref, outcome_id, payload_json, outcome_digest, recorded_at FROM nexus_writeback_outcomes_v01 WHERE project_ref = ?1 AND (recorded_at < ?2 OR (recorded_at = ?2 AND outcome_id < ?3)) ORDER BY recorded_at DESC, outcome_id DESC LIMIT ?4",
  checkpointCursor: "SELECT checkpoint_id, version FROM nexus_writeback_checkpoints_v01 WHERE project_ref = ?1 AND checkpoint_id = ?2 LIMIT 1",
  checkpointFirstPage: "SELECT project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at FROM nexus_writeback_checkpoints_v01 WHERE project_ref = ?1 ORDER BY version DESC LIMIT ?2",
  checkpointAfterCursor: "SELECT project_ref, version, checkpoint_id, payload_json, checkpoint_digest, created_at FROM nexus_writeback_checkpoints_v01 WHERE project_ref = ?1 AND version < ?2 ORDER BY version DESC LIMIT ?3",
});

export class CloudflareD1HistoryReaderError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CloudflareD1HistoryReaderError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (code, message, details = {}) => { throw new CloudflareD1HistoryReaderError(code, message, details); };

function normalizeProjectRefs(values) {
  if (!Array.isArray(values) || values.length === 0) fail("INVALID_D1_HISTORY_OPTIONS", "projectRefs must be a non-empty array.");
  const normalized = values.map((value, index) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim()) fail("INVALID_D1_HISTORY_OPTIONS", `projectRefs[${index}] is invalid.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) fail("INVALID_D1_HISTORY_OPTIONS", "projectRefs must be unique.");
  return [...normalized].sort();
}

function validateDatabase(db) {
  if (!db || typeof db !== "object" || typeof db.withSession !== "function") fail("INVALID_D1_HISTORY_OPTIONS", "db must expose withSession().");
}

function sessionFor(db) {
  let session;
  try { session = db.withSession("first-primary"); }
  catch { fail("D1_HISTORY_SESSION_ERROR", "Unable to open first-primary D1 history session."); }
  if (!session || typeof session.prepare !== "function") fail("D1_HISTORY_SESSION_ERROR", "D1 history session must expose prepare().");
  return session;
}

function statement(session, sql, params) {
  let prepared;
  try { prepared = session.prepare(sql); }
  catch { fail("D1_HISTORY_QUERY_ERROR", "Unable to prepare D1 history statement."); }
  if (!prepared || typeof prepared.bind !== "function") fail("D1_HISTORY_QUERY_ERROR", "D1 history statement does not expose bind().");
  return prepared.bind(...params);
}

async function first(session, sql, params) {
  const prepared = statement(session, sql, params);
  if (typeof prepared.first !== "function") fail("D1_HISTORY_QUERY_ERROR", "D1 history statement does not expose first().");
  try { return await prepared.first(); }
  catch { fail("D1_HISTORY_QUERY_ERROR", "D1 history cursor read failed."); }
}

async function rows(session, sql, params) {
  const prepared = statement(session, sql, params);
  if (typeof prepared.run !== "function") fail("D1_HISTORY_QUERY_ERROR", "D1 history statement does not expose run().");
  let result;
  try { result = await prepared.run(); }
  catch { fail("D1_HISTORY_QUERY_ERROR", "D1 history page read failed."); }
  if (!result || result.success !== true || !Array.isArray(result.results)) fail("D1_HISTORY_QUERY_ERROR", "D1 history page response is invalid.");
  return result.results;
}

function normalizeQuery({ projectRef, limit, cursor }, allowlist) {
  if (typeof projectRef !== "string" || !projectRef.trim() || projectRef !== projectRef.trim()) fail("INVALID_D1_HISTORY_QUERY", "projectRef is invalid.");
  if (!allowlist.includes(projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "History project is outside the configured D1 allowlist.", { projectRef });
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("INVALID_D1_HISTORY_QUERY", "limit must be an integer from 1 to 100.");
  if (cursor !== null && cursor !== undefined && (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 500 || cursor !== cursor.trim())) fail("INVALID_D1_HISTORY_QUERY", "cursor is invalid.");
  return { projectRef, limit, cursor: cursor ?? null };
}

function decodeOutcome(row, projectRef) {
  if (!object(row) || row.project_ref !== projectRef || typeof row.outcome_id !== "string" || typeof row.outcome_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.outcome_digest) || typeof row.payload_json !== "string") fail("INVALID_D1_HISTORY_ROW", "Outcome history row is invalid.");
  let parsed;
  try { parsed = JSON.parse(row.payload_json); }
  catch { fail("INVALID_D1_HISTORY_ROW", "Outcome history payload is invalid JSON."); }
  let accepted;
  try { accepted = validateOutcomeRecordV01(parsed); }
  catch (error) { fail("INVALID_D1_HISTORY_ROW", "Outcome history payload failed the frozen validator.", { causeCode: error?.code ?? null }); }
  if (accepted.projectRef !== projectRef || accepted.outcomeId !== row.outcome_id || accepted.recordedAt !== row.recorded_at || digest(accepted) !== row.outcome_digest) fail("INVALID_D1_HISTORY_ROW", "Outcome history row does not bind its accepted payload.");
  return accepted;
}

function decodeCheckpoint(row, projectRef) {
  if (!object(row) || row.project_ref !== projectRef || !Number.isSafeInteger(row.version) || row.version < 1 || typeof row.checkpoint_id !== "string" || typeof row.checkpoint_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.checkpoint_digest) || typeof row.payload_json !== "string") fail("INVALID_D1_HISTORY_ROW", "Checkpoint history row is invalid.");
  let parsed;
  try { parsed = JSON.parse(row.payload_json); }
  catch { fail("INVALID_D1_HISTORY_ROW", "Checkpoint history payload is invalid JSON."); }
  let accepted;
  try { accepted = validateTrustedCheckpointV01(parsed); }
  catch (error) { fail("INVALID_D1_HISTORY_ROW", "Checkpoint history payload failed the frozen validator.", { causeCode: error?.code ?? null }); }
  if (accepted.projectRef !== projectRef || accepted.checkpointId !== row.checkpoint_id || accepted.version !== row.version || accepted.createdAt !== row.created_at || digest(accepted) !== row.checkpoint_digest) fail("INVALID_D1_HISTORY_ROW", "Checkpoint history row does not bind its accepted payload.");
  return accepted;
}

function page(items, limit, identityOf) {
  const hasMore = items.length > limit;
  const visible = hasMore ? items.slice(0, limit) : items;
  return deepFreeze({
    items: clone(visible),
    nextCursor: hasMore && visible.length > 0 ? identityOf(visible.at(-1)) : null,
  });
}

export function createCloudflareD1HistoryReaderV01({ db, projectRefs } = {}) {
  validateDatabase(db);
  const allowlist = normalizeProjectRefs(projectRefs);

  return Object.freeze({
    async listOutcomes(input = {}) {
      const query = normalizeQuery(input, allowlist);
      const session = sessionFor(db);
      let resultRows;
      if (query.cursor === null) {
        resultRows = await rows(session, D1_HISTORY_SQL_V01.outcomeFirstPage, [query.projectRef, query.limit + 1]);
      } else {
        const anchor = await first(session, D1_HISTORY_SQL_V01.outcomeCursor, [query.projectRef, query.cursor]);
        if (!anchor || anchor.outcome_id !== query.cursor || typeof anchor.recorded_at !== "string") fail("HISTORY_CURSOR_INVALID", "Outcome cursor does not resolve within retained project history.", { cursor: query.cursor });
        resultRows = await rows(session, D1_HISTORY_SQL_V01.outcomeAfterCursor, [query.projectRef, anchor.recorded_at, query.cursor, query.limit + 1]);
      }
      const outcomes = resultRows.map(row => decodeOutcome(row, query.projectRef));
      return page(outcomes, query.limit, item => item.outcomeId);
    },
    async listCheckpoints(input = {}) {
      const query = normalizeQuery(input, allowlist);
      const session = sessionFor(db);
      let resultRows;
      if (query.cursor === null) {
        resultRows = await rows(session, D1_HISTORY_SQL_V01.checkpointFirstPage, [query.projectRef, query.limit + 1]);
      } else {
        const anchor = await first(session, D1_HISTORY_SQL_V01.checkpointCursor, [query.projectRef, query.cursor]);
        if (!anchor || anchor.checkpoint_id !== query.cursor || !Number.isSafeInteger(anchor.version)) fail("HISTORY_CURSOR_INVALID", "Checkpoint cursor does not resolve within retained project history.", { cursor: query.cursor });
        resultRows = await rows(session, D1_HISTORY_SQL_V01.checkpointAfterCursor, [query.projectRef, anchor.version, query.limit + 1]);
      }
      const checkpoints = resultRows.map(row => decodeCheckpoint(row, query.projectRef));
      return page(checkpoints, query.limit, item => item.checkpointId);
    },
  });
}
