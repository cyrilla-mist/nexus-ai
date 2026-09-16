export class Phase6HistoryReaderAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "Phase6HistoryReaderAdapterError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const fail = (code, message, details = {}) => { throw new Phase6HistoryReaderAdapterError(code, message, details); };
const clone = value => structuredClone(value);
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

function normalizeProjectRefs(values) {
  if (!Array.isArray(values) || values.length === 0) fail("INVALID_PHASE6_HISTORY_READER_OPTIONS", "projectRefs must be a non-empty array.");
  const normalized = values.map((value, index) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim()) fail("INVALID_PHASE6_HISTORY_READER_OPTIONS", `projectRefs[${index}] is invalid.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) fail("INVALID_PHASE6_HISTORY_READER_OPTIONS", "projectRefs must be unique.");
  return [...normalized].sort();
}

function validateStore(store, label) {
  if (!store || typeof store !== "object" || typeof store.exportState !== "function") fail("INVALID_PHASE6_HISTORY_READER_OPTIONS", `${label} must expose exportState().`);
  return store;
}

function normalizeQuery({ projectRef, limit, cursor }, allowlist) {
  if (typeof projectRef !== "string" || !projectRef.trim() || projectRef !== projectRef.trim()) fail("INVALID_HISTORY_QUERY", "projectRef is invalid.");
  if (!allowlist.includes(projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "History project is outside the configured allowlist.", { projectRef });
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("INVALID_HISTORY_QUERY", "limit must be an integer from 1 to 100.");
  if (cursor !== null && cursor !== undefined && (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 500 || cursor !== cursor.trim())) fail("INVALID_HISTORY_QUERY", "cursor is invalid.");
  return { projectRef, limit, cursor: cursor ?? null };
}

function pageFrom(items, query, identityOf) {
  let start = 0;
  if (query.cursor !== null) {
    const index = items.findIndex(item => identityOf(item) === query.cursor);
    if (index < 0) fail("HISTORY_CURSOR_INVALID", "cursor does not resolve within retained project history.", { cursor: query.cursor });
    start = index + 1;
  }
  const page = items.slice(start, start + query.limit);
  const hasMore = start + page.length < items.length;
  return deepFreeze({
    items: clone(page),
    nextCursor: hasMore && page.length > 0 ? identityOf(page.at(-1)) : null,
  });
}

export function createPhase6HistoryReaderV01({ outcomeStore, checkpointStore, projectRefs } = {}) {
  const allowlist = normalizeProjectRefs(projectRefs);
  const outcomes = validateStore(outcomeStore, "outcomeStore");
  const checkpoints = validateStore(checkpointStore, "checkpointStore");

  return Object.freeze({
    async listOutcomes(input = {}) {
      const query = normalizeQuery(input, allowlist);
      const state = await outcomes.exportState();
      const project = state.projects?.find(item => item.projectRef === query.projectRef);
      const items = [...(project?.outcomes ?? [])].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt) || right.outcomeId.localeCompare(left.outcomeId));
      return pageFrom(items, query, item => item.outcomeId);
    },
    async listCheckpoints(input = {}) {
      const query = normalizeQuery(input, allowlist);
      const state = await checkpoints.exportState();
      const project = state.projects?.find(item => item.projectRef === query.projectRef);
      const items = [...(project?.checkpoints ?? [])].sort((left, right) => right.version - left.version);
      return pageFrom(items, query, item => item.checkpointId);
    },
  });
}
