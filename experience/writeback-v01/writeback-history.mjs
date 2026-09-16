import { createHash } from "node:crypto";

import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { validateTrustedCheckpointV01 } from "../continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { validateWritebackRetentionPolicyV01 } from "./writeback-retention-policy.mjs";

export const WRITEBACK_HISTORY_VERSION_V01 = "nexus-atlas.writeback-history-page.v0.1";
export const WRITEBACK_HISTORY_ARTIFACT_KINDS_V01 = Object.freeze(["outcome-record", "trusted-checkpoint"]);

const PAGE_KEYS = [
  "historyVersion",
  "historyId",
  "retentionPolicyRef",
  "projectRef",
  "artifactKind",
  "order",
  "limit",
  "cursorFrom",
  "items",
  "nextCursor",
  "truncated",
];
const READER_RESULT_KEYS = ["items", "nextCursor"];

export class WritebackHistoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WritebackHistoryError";
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
const fail = (code, message, details = {}) => { throw new WritebackHistoryError(code, message, details); };

function bounded(value, code, field, max = 500) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${field} is invalid.`);
  return value;
}

function cursor(value, code, field) {
  if (value === null || value === undefined) return null;
  return bounded(value, code, field, 500);
}

function acceptedPolicy(policy) {
  try { return validateWritebackRetentionPolicyV01(policy); }
  catch (error) { fail("INVALID_WRITEBACK_HISTORY_POLICY", "retentionPolicy failed the accepted validator.", { causeCode: error?.code ?? null }); }
}

function validateReader(historyReader, artifactKind) {
  if (!historyReader || typeof historyReader !== "object") fail("INVALID_WRITEBACK_HISTORY_READER", "historyReader is required.");
  const method = artifactKind === "outcome-record" ? "listOutcomes" : "listCheckpoints";
  if (typeof historyReader[method] !== "function") fail("INVALID_WRITEBACK_HISTORY_READER", `${method} is required for ${artifactKind}.`);
  return method;
}

function validateOutcomes(items, projectRef, policy) {
  const accepted = items.map((candidate, index) => {
    let outcome;
    try { outcome = validateOutcomeRecordV01(candidate); }
    catch (error) { fail("INVALID_WRITEBACK_HISTORY_RESULT", `items[${index}] is not an accepted Outcome Record.`, { causeCode: error?.code ?? null }); }
    if (outcome.projectRef !== projectRef) fail("WRITEBACK_HISTORY_SCOPE_MISMATCH", "Outcome history crossed project scope.", { outcomeId: outcome.outcomeId });
    if (!policy.retainOutcomeStates.includes(outcome.verificationState)) fail("WRITEBACK_HISTORY_RETENTION_MISMATCH", "Reader returned an Outcome excluded by retention policy.", { outcomeId: outcome.outcomeId });
    return outcome;
  });
  const ids = accepted.map(item => item.outcomeId);
  if (new Set(ids).size !== ids.length) fail("INVALID_WRITEBACK_HISTORY_RESULT", "Outcome history contains duplicate identities.");
  for (let index = 1; index < accepted.length; index += 1) {
    const previous = accepted[index - 1];
    const current = accepted[index];
    if (previous.recordedAt < current.recordedAt || (previous.recordedAt === current.recordedAt && previous.outcomeId < current.outcomeId)) {
      fail("INVALID_WRITEBACK_HISTORY_ORDER", "Outcome history must be newest-first with deterministic identity tie-break.");
    }
  }
  return accepted;
}

function validateCheckpoints(items, projectRef) {
  const accepted = items.map((candidate, index) => {
    let checkpoint;
    try { checkpoint = validateTrustedCheckpointV01(candidate); }
    catch (error) { fail("INVALID_WRITEBACK_HISTORY_RESULT", `items[${index}] is not an accepted Trusted Checkpoint.`, { causeCode: error?.code ?? null }); }
    if (checkpoint.projectRef !== projectRef) fail("WRITEBACK_HISTORY_SCOPE_MISMATCH", "Checkpoint history crossed project scope.", { checkpointId: checkpoint.checkpointId });
    return checkpoint;
  });
  const ids = accepted.map(item => item.checkpointId);
  if (new Set(ids).size !== ids.length) fail("INVALID_WRITEBACK_HISTORY_RESULT", "Checkpoint history contains duplicate identities.");
  for (let index = 1; index < accepted.length; index += 1) {
    if (accepted[index - 1].version <= accepted[index].version) fail("INVALID_WRITEBACK_HISTORY_ORDER", "Checkpoint history must be strictly newest-version-first.");
  }
  return accepted;
}

function payloadOf(page) {
  const { historyId: _historyId, ...payload } = page;
  return payload;
}

export function validateWritebackHistoryPageV01(page) {
  if (!exact(page, PAGE_KEYS) || page.historyVersion !== WRITEBACK_HISTORY_VERSION_V01) fail("INVALID_WRITEBACK_HISTORY_PAGE", "history page field set/version is invalid.");
  if (typeof page.historyId !== "string" || !/^writeback-history:[0-9a-f]{24}$/.test(page.historyId)) fail("INVALID_WRITEBACK_HISTORY_PAGE", "historyId is invalid.");
  bounded(page.retentionPolicyRef, "INVALID_WRITEBACK_HISTORY_PAGE", "retentionPolicyRef");
  bounded(page.projectRef, "INVALID_WRITEBACK_HISTORY_PAGE", "projectRef");
  if (!WRITEBACK_HISTORY_ARTIFACT_KINDS_V01.includes(page.artifactKind) || page.order !== "newest-first") fail("INVALID_WRITEBACK_HISTORY_PAGE", "artifactKind/order is invalid.");
  if (!Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 100) fail("INVALID_WRITEBACK_HISTORY_PAGE", "limit is invalid.");
  cursor(page.cursorFrom, "INVALID_WRITEBACK_HISTORY_PAGE", "cursorFrom");
  cursor(page.nextCursor, "INVALID_WRITEBACK_HISTORY_PAGE", "nextCursor");
  if (!Array.isArray(page.items) || page.items.length > page.limit || typeof page.truncated !== "boolean" || page.truncated !== (page.nextCursor !== null)) fail("INVALID_WRITEBACK_HISTORY_PAGE", "items/truncation is invalid.");
  const expectedId = `writeback-history:${digest(payloadOf(page)).slice(0, 24)}`;
  if (page.historyId !== expectedId) fail("INVALID_WRITEBACK_HISTORY_PAGE", "historyId does not bind normalized page content.");
  return deepFreeze(clone(page));
}

export async function readWritebackHistoryV01({ historyReader, retentionPolicy, projectRef, artifactKind, limit = 20, cursor: cursorFrom = null } = {}) {
  const policy = acceptedPolicy(retentionPolicy);
  const ref = bounded(projectRef, "INVALID_WRITEBACK_HISTORY_QUERY", "projectRef");
  if (!policy.projectRefs.includes(ref)) fail("PROJECT_SCOPE_NOT_ALLOWED", "History query project is outside the retention policy scope.", { projectRef: ref });
  if (!WRITEBACK_HISTORY_ARTIFACT_KINDS_V01.includes(artifactKind)) fail("INVALID_WRITEBACK_HISTORY_QUERY", "artifactKind is unsupported.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > policy.maxHistoryPageSize) fail("INVALID_WRITEBACK_HISTORY_QUERY", "limit exceeds the accepted retention policy bound.");
  const normalizedCursor = cursor(cursorFrom, "INVALID_WRITEBACK_HISTORY_QUERY", "cursor");
  const method = validateReader(historyReader, artifactKind);

  let result;
  try { result = await historyReader[method]({ projectRef: ref, limit, cursor: normalizedCursor }); }
  catch (error) {
    if (error instanceof WritebackHistoryError) throw error;
    fail("WRITEBACK_HISTORY_READ_FAILED", "History reader failed.", { causeCode: error?.code ?? null });
  }
  if (!exact(result, READER_RESULT_KEYS) || !Array.isArray(result.items)) fail("INVALID_WRITEBACK_HISTORY_RESULT", "History reader returned an invalid field set.");
  const nextCursor = cursor(result.nextCursor, "INVALID_WRITEBACK_HISTORY_RESULT", "nextCursor");
  if (result.items.length > limit || (nextCursor !== null && result.items.length !== limit)) fail("INVALID_WRITEBACK_HISTORY_RESULT", "History reader page size/continuation is inconsistent.");
  const items = artifactKind === "outcome-record"
    ? validateOutcomes(result.items, ref, policy)
    : validateCheckpoints(result.items, ref);

  const payload = {
    historyVersion: WRITEBACK_HISTORY_VERSION_V01,
    retentionPolicyRef: policy.policyId,
    projectRef: ref,
    artifactKind,
    order: "newest-first",
    limit,
    cursorFrom: normalizedCursor,
    items: clone(items),
    nextCursor,
    truncated: nextCursor !== null,
  };
  return validateWritebackHistoryPageV01({ ...payload, historyId: `writeback-history:${digest(payload).slice(0, 24)}` });
}
