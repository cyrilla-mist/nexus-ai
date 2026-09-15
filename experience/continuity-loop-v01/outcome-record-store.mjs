import { createHash } from "node:crypto";

import { validateOutcomeRecordV01 } from "./outcome-verifier.mjs";

export const OUTCOME_RECORD_STORE_SCHEMA_V01 = "nexus-atlas.outcome-record-store.v0.1";

export class OutcomeRecordStoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutcomeRecordStoreError";
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
const fail = (code, message, details = {}) => { throw new OutcomeRecordStoreError(code, message, details); };

function exactObject(value, keys, code, field) {
  if (!object(value)) fail(code, `${field} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${field} has an invalid field set.`, { field, actual, expected });
}

function boundedString(value, code, field, max = 500) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim()) fail(code, `${field} must be a non-empty trimmed string.`, { field });
  return value;
}

function normalizeAllowlist(allowedProjectRefs) {
  if (!Array.isArray(allowedProjectRefs) || allowedProjectRefs.length === 0) fail("INVALID_OUTCOME_STORE_OPTIONS", "allowedProjectRefs must be a non-empty array.");
  const normalized = allowedProjectRefs.map((value, index) => boundedString(value, "INVALID_OUTCOME_STORE_OPTIONS", `allowedProjectRefs[${index}]`));
  if (new Set(normalized).size !== normalized.length) fail("INVALID_OUTCOME_STORE_OPTIONS", "allowedProjectRefs must be unique.");
  return [...normalized].sort();
}

function emptyState() {
  return { storeVersion: OUTCOME_RECORD_STORE_SCHEMA_V01, projects: [] };
}

function outcomeDigest(outcome) {
  return digest(outcome);
}

function normalizeReceipt(receipt, outcomeById, field) {
  exactObject(receipt, ["idempotencyKey", "outcomeId", "outcomeDigest"], "INVALID_OUTCOME_STORE_STATE", field);
  const idempotencyKey = boundedString(receipt.idempotencyKey, "INVALID_OUTCOME_STORE_STATE", `${field}.idempotencyKey`);
  const outcomeId = boundedString(receipt.outcomeId, "INVALID_OUTCOME_STORE_STATE", `${field}.outcomeId`);
  const digestValue = boundedString(receipt.outcomeDigest, "INVALID_OUTCOME_STORE_STATE", `${field}.outcomeDigest`, 64);
  if (!/^[0-9a-f]{64}$/.test(digestValue)) fail("INVALID_OUTCOME_STORE_STATE", `${field}.outcomeDigest must be a SHA-256 hex digest.`);
  const outcome = outcomeById.get(outcomeId);
  if (!outcome || outcomeDigest(outcome) !== digestValue) fail("INVALID_OUTCOME_STORE_STATE", `${field} does not resolve to the recorded Outcome Record.`);
  return { idempotencyKey, outcomeId, outcomeDigest: digestValue };
}

export function validateOutcomeRecordStoreStateV01(value, { allowedProjectRefs } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  exactObject(value, ["storeVersion", "projects"], "INVALID_OUTCOME_STORE_STATE", "state");
  if (value.storeVersion !== OUTCOME_RECORD_STORE_SCHEMA_V01) fail("INVALID_OUTCOME_STORE_STATE", `storeVersion must be ${OUTCOME_RECORD_STORE_SCHEMA_V01}.`);
  if (!Array.isArray(value.projects)) fail("INVALID_OUTCOME_STORE_STATE", "state.projects must be an array.");

  const seenProjects = new Set();
  const projects = value.projects.map((project, projectIndex) => {
    const field = `projects[${projectIndex}]`;
    exactObject(project, ["projectRef", "outcomes", "receipts"], "INVALID_OUTCOME_STORE_STATE", field);
    const projectRef = boundedString(project.projectRef, "INVALID_OUTCOME_STORE_STATE", `${field}.projectRef`);
    if (!allowlist.includes(projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Stored project is outside the configured Outcome store allowlist.", { projectRef });
    if (seenProjects.has(projectRef)) fail("INVALID_OUTCOME_STORE_STATE", "Duplicate projectRef in Outcome store state.", { projectRef });
    seenProjects.add(projectRef);
    if (!Array.isArray(project.outcomes) || !Array.isArray(project.receipts)) fail("INVALID_OUTCOME_STORE_STATE", `${field}.outcomes and receipts must be arrays.`);

    const outcomeIds = new Set();
    const outcomes = project.outcomes.map((candidate, index) => {
      let outcome;
      try { outcome = validateOutcomeRecordV01(candidate); }
      catch (error) { fail("INVALID_OUTCOME_STORE_STATE", `Invalid Outcome Record at ${field}.outcomes[${index}].`, { causeCode: error?.code ?? null }); }
      if (outcome.projectRef !== projectRef) fail("INVALID_OUTCOME_STORE_STATE", "Stored Outcome Record projectRef mismatch.", { projectRef, outcomeId: outcome.outcomeId });
      if (outcomeIds.has(outcome.outcomeId)) fail("INVALID_OUTCOME_STORE_STATE", "Duplicate outcomeId in project history.", { outcomeId: outcome.outcomeId });
      outcomeIds.add(outcome.outcomeId);
      return outcome;
    });

    const outcomeById = new Map(outcomes.map(outcome => [outcome.outcomeId, outcome]));
    const receiptKeys = new Set();
    const receipts = project.receipts.map((receipt, index) => {
      const normalized = normalizeReceipt(receipt, outcomeById, `${field}.receipts[${index}]`);
      if (receiptKeys.has(normalized.idempotencyKey)) fail("INVALID_OUTCOME_STORE_STATE", "Duplicate idempotencyKey in Outcome store receipts.", { projectRef, idempotencyKey: normalized.idempotencyKey });
      receiptKeys.add(normalized.idempotencyKey);
      return normalized;
    });

    return { projectRef, outcomes, receipts };
  }).sort((left, right) => left.projectRef.localeCompare(right.projectRef));

  return deepFreeze(clone({ storeVersion: OUTCOME_RECORD_STORE_SCHEMA_V01, projects }));
}

export function createEmptyOutcomeRecordStoreStateV01({ allowedProjectRefs } = {}) {
  return validateOutcomeRecordStoreStateV01(emptyState(), { allowedProjectRefs });
}

function normalizeAppendInput({ outcome, idempotencyKey } = {}, allowedProjectRefs) {
  let accepted;
  try { accepted = validateOutcomeRecordV01(outcome); }
  catch (error) { fail("INVALID_OUTCOME_APPEND", "outcome is invalid.", { causeCode: error?.code ?? null }); }
  if (!allowedProjectRefs.includes(accepted.projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Outcome project is outside the configured allowlist.", { projectRef: accepted.projectRef });
  const key = boundedString(idempotencyKey, "INVALID_OUTCOME_APPEND", "idempotencyKey");
  return { outcome: accepted, idempotencyKey: key, outcomeDigest: outcomeDigest(accepted) };
}

export function applyOutcomeRecordAppendV01({ state, outcome, idempotencyKey, allowedProjectRefs } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  const acceptedState = validateOutcomeRecordStoreStateV01(state, { allowedProjectRefs: allowlist });
  const append = normalizeAppendInput({ outcome, idempotencyKey }, allowlist);
  const next = clone(acceptedState);
  let project = next.projects.find(item => item.projectRef === append.outcome.projectRef);
  if (!project) {
    project = { projectRef: append.outcome.projectRef, outcomes: [], receipts: [] };
    next.projects.push(project);
    next.projects.sort((left, right) => left.projectRef.localeCompare(right.projectRef));
  }

  const priorReceipt = project.receipts.find(receipt => receipt.idempotencyKey === append.idempotencyKey);
  if (priorReceipt) {
    if (priorReceipt.outcomeDigest !== append.outcomeDigest || priorReceipt.outcomeId !== append.outcome.outcomeId) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different Outcome Record content.", { idempotencyKey: append.idempotencyKey });
    const stored = project.outcomes.find(item => item.outcomeId === priorReceipt.outcomeId);
    return deepFreeze({ state: acceptedState, outcome: clone(stored), replayed: true });
  }

  if (project.outcomes.some(item => item.outcomeId === append.outcome.outcomeId)) fail("DUPLICATE_OUTCOME_ID", "outcomeId already exists without the supplied idempotency receipt.", { outcomeId: append.outcome.outcomeId });
  project.outcomes.push(clone(append.outcome));
  project.receipts.push({ idempotencyKey: append.idempotencyKey, outcomeId: append.outcome.outcomeId, outcomeDigest: append.outcomeDigest });
  const validatedNext = validateOutcomeRecordStoreStateV01(next, { allowedProjectRefs: allowlist });
  return deepFreeze({ state: validatedNext, outcome: clone(append.outcome), replayed: false });
}

export function createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs, initialState } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  let state = initialState === undefined
    ? createEmptyOutcomeRecordStoreStateV01({ allowedProjectRefs: allowlist })
    : validateOutcomeRecordStoreStateV01(initialState, { allowedProjectRefs: allowlist });

  return Object.freeze({
    async readOutcome({ projectRef, outcomeId } = {}) {
      const ref = boundedString(projectRef, "INVALID_OUTCOME_STORE_READ", "projectRef");
      const id = boundedString(outcomeId, "INVALID_OUTCOME_STORE_READ", "outcomeId");
      if (!allowlist.includes(ref)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Read project is outside the configured Outcome store allowlist.", { projectRef: ref });
      const outcome = state.projects.find(item => item.projectRef === ref)?.outcomes.find(item => item.outcomeId === id) ?? null;
      return outcome === null ? null : deepFreeze(clone(outcome));
    },
    async appendOutcome(input) {
      const result = applyOutcomeRecordAppendV01({ state, ...input, allowedProjectRefs: allowlist });
      state = result.state;
      const readBack = state.projects.find(item => item.projectRef === result.outcome.projectRef)?.outcomes.find(item => item.outcomeId === result.outcome.outcomeId) ?? null;
      if (!readBack || outcomeDigest(readBack) !== outcomeDigest(result.outcome)) fail("WRITE_VERIFICATION_FAILED", "In-memory Outcome Record append failed read-after-write verification.");
      return deepFreeze({ outcome: clone(result.outcome), replayed: result.replayed });
    },
    async exportState() {
      return deepFreeze(clone(state));
    },
  });
}
