import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "./trusted-checkpoint-validator.mjs";

export const TRUSTED_CHECKPOINT_STORE_SCHEMA_V01 = "nexus-atlas.trusted-checkpoint-store.v0.1";

export class TrustedCheckpointStoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TrustedCheckpointStoreError";
    this.code = code;
    this.details = { ...details };
  }
}

function fail(code, message, details = {}) {
  throw new TrustedCheckpointStoreError(code, message, details);
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function exactObject(value, keys, code, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${field} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${field} has an invalid field set.`, { field, actual, expected });
}

function boundedString(value, code, field, max = 500) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max) fail(code, `${field} must be a non-empty trimmed string.`, { field });
  return value;
}

function digestCheckpoint(checkpoint) {
  return createHash("sha256").update(JSON.stringify(checkpoint)).digest("hex");
}

function normalizeAllowlist(allowedProjectRefs) {
  if (!Array.isArray(allowedProjectRefs) || allowedProjectRefs.length === 0) fail("INVALID_STORE_OPTIONS", "allowedProjectRefs must be a non-empty array.");
  const normalized = allowedProjectRefs.map((value, index) => boundedString(value, "INVALID_STORE_OPTIONS", `allowedProjectRefs[${index}]`));
  if (new Set(normalized).size !== normalized.length) fail("INVALID_STORE_OPTIONS", "allowedProjectRefs must be unique.");
  return [...normalized].sort();
}

function emptyState() {
  return { storeVersion: TRUSTED_CHECKPOINT_STORE_SCHEMA_V01, projects: [] };
}

function normalizeReceipt(receipt, checkpointById, field) {
  exactObject(receipt, ["idempotencyKey", "checkpointId", "checkpointDigest"], "INVALID_STORE_STATE", field);
  const idempotencyKey = boundedString(receipt.idempotencyKey, "INVALID_STORE_STATE", `${field}.idempotencyKey`);
  const checkpointId = boundedString(receipt.checkpointId, "INVALID_STORE_STATE", `${field}.checkpointId`);
  const checkpointDigest = boundedString(receipt.checkpointDigest, "INVALID_STORE_STATE", `${field}.checkpointDigest`, 64);
  if (!/^[0-9a-f]{64}$/.test(checkpointDigest)) fail("INVALID_STORE_STATE", `${field}.checkpointDigest must be a SHA-256 hex digest.`);
  const checkpoint = checkpointById.get(checkpointId);
  if (!checkpoint || digestCheckpoint(checkpoint) !== checkpointDigest) fail("INVALID_STORE_STATE", `${field} does not resolve to the recorded checkpoint.`);
  return { idempotencyKey, checkpointId, checkpointDigest };
}

export function validateTrustedCheckpointStoreStateV01(value, { allowedProjectRefs } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  exactObject(value, ["storeVersion", "projects"], "INVALID_STORE_STATE", "state");
  if (value.storeVersion !== TRUSTED_CHECKPOINT_STORE_SCHEMA_V01) fail("INVALID_STORE_STATE", `storeVersion must be ${TRUSTED_CHECKPOINT_STORE_SCHEMA_V01}.`);
  if (!Array.isArray(value.projects)) fail("INVALID_STORE_STATE", "state.projects must be an array.");

  const seenProjects = new Set();
  const projects = value.projects.map((project, projectIndex) => {
    const field = `projects[${projectIndex}]`;
    exactObject(project, ["projectRef", "checkpoints", "receipts"], "INVALID_STORE_STATE", field);
    const projectRef = boundedString(project.projectRef, "INVALID_STORE_STATE", `${field}.projectRef`);
    if (!allowlist.includes(projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Stored project is outside the configured allowlist.", { projectRef });
    if (seenProjects.has(projectRef)) fail("INVALID_STORE_STATE", "Duplicate projectRef in store state.", { projectRef });
    seenProjects.add(projectRef);
    if (!Array.isArray(project.checkpoints) || !Array.isArray(project.receipts)) fail("INVALID_STORE_STATE", `${field} checkpoints and receipts must be arrays.`);

    const checkpointIds = new Set();
    const checkpoints = project.checkpoints.map((candidate, index) => {
      let checkpoint;
      try { checkpoint = validateTrustedCheckpointV01(candidate); }
      catch (error) { fail("INVALID_STORE_STATE", `Invalid checkpoint at ${field}.checkpoints[${index}].`, { causeCode: error.code ?? null }); }
      if (checkpoint.projectRef !== projectRef) fail("INVALID_STORE_STATE", "Stored checkpoint projectRef mismatch.", { projectRef, checkpointId: checkpoint.checkpointId });
      if (checkpoint.version !== index + 1) fail("INVALID_STORE_STATE", "Stored checkpoint versions must be contiguous from 1.", { projectRef, expectedVersion: index + 1, actualVersion: checkpoint.version });
      if (checkpointIds.has(checkpoint.checkpointId)) fail("INVALID_STORE_STATE", "Duplicate checkpointId in project history.", { checkpointId: checkpoint.checkpointId });
      checkpointIds.add(checkpoint.checkpointId);
      return checkpoint;
    });

    const checkpointById = new Map(checkpoints.map(checkpoint => [checkpoint.checkpointId, checkpoint]));
    const receiptKeys = new Set();
    const receipts = project.receipts.map((receipt, index) => {
      const normalized = normalizeReceipt(receipt, checkpointById, `${field}.receipts[${index}]`);
      if (receiptKeys.has(normalized.idempotencyKey)) fail("INVALID_STORE_STATE", "Duplicate idempotencyKey in project receipts.", { projectRef, idempotencyKey: normalized.idempotencyKey });
      receiptKeys.add(normalized.idempotencyKey);
      return normalized;
    });

    return { projectRef, checkpoints, receipts };
  }).sort((a, b) => a.projectRef.localeCompare(b.projectRef));

  return deepFreeze(clone({ storeVersion: TRUSTED_CHECKPOINT_STORE_SCHEMA_V01, projects }));
}

export function createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs } = {}) {
  return validateTrustedCheckpointStoreStateV01(emptyState(), { allowedProjectRefs });
}

function normalizeWriteInput({ checkpoint, expectedVersion, idempotencyKey } = {}, allowedProjectRefs) {
  let accepted;
  try { accepted = validateTrustedCheckpointV01(checkpoint); }
  catch (error) { fail("INVALID_CHECKPOINT_WRITE", "checkpoint is invalid.", { causeCode: error.code ?? null }); }
  if (!allowedProjectRefs.includes(accepted.projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Checkpoint project is outside the configured allowlist.", { projectRef: accepted.projectRef });
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) fail("INVALID_CHECKPOINT_WRITE", "expectedVersion must be a non-negative safe integer.");
  const key = boundedString(idempotencyKey, "INVALID_CHECKPOINT_WRITE", "idempotencyKey");
  return { checkpoint: accepted, expectedVersion, idempotencyKey: key, checkpointDigest: digestCheckpoint(accepted) };
}

export function applyTrustedCheckpointWriteV01({ state, checkpoint, expectedVersion, idempotencyKey, allowedProjectRefs } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  const acceptedState = validateTrustedCheckpointStoreStateV01(state, { allowedProjectRefs: allowlist });
  const write = normalizeWriteInput({ checkpoint, expectedVersion, idempotencyKey }, allowlist);
  const next = clone(acceptedState);
  let project = next.projects.find(item => item.projectRef === write.checkpoint.projectRef);
  if (!project) {
    project = { projectRef: write.checkpoint.projectRef, checkpoints: [], receipts: [] };
    next.projects.push(project);
    next.projects.sort((a, b) => a.projectRef.localeCompare(b.projectRef));
  }

  const priorReceipt = project.receipts.find(receipt => receipt.idempotencyKey === write.idempotencyKey);
  if (priorReceipt) {
    if (priorReceipt.checkpointDigest !== write.checkpointDigest || priorReceipt.checkpointId !== write.checkpoint.checkpointId) fail("IDEMPOTENCY_CONFLICT", "idempotencyKey was already used for different checkpoint content.", { idempotencyKey: write.idempotencyKey });
    const stored = project.checkpoints.find(item => item.checkpointId === priorReceipt.checkpointId);
    return deepFreeze({ state: acceptedState, checkpoint: clone(stored), replayed: true });
  }

  const currentVersion = project.checkpoints.at(-1)?.version ?? 0;
  if (write.expectedVersion !== currentVersion) fail("CHECKPOINT_VERSION_CONFLICT", "expectedVersion does not match current trusted checkpoint version.", { expectedVersion: write.expectedVersion, currentVersion });
  if (write.checkpoint.version !== currentVersion + 1) fail("CHECKPOINT_VERSION_MISMATCH", "checkpoint.version must advance the current version by exactly one.", { checkpointVersion: write.checkpoint.version, currentVersion });
  if (project.checkpoints.some(item => item.checkpointId === write.checkpoint.checkpointId)) fail("DUPLICATE_CHECKPOINT_ID", "checkpointId already exists without the supplied idempotency receipt.", { checkpointId: write.checkpoint.checkpointId });

  project.checkpoints.push(clone(write.checkpoint));
  project.receipts.push({ idempotencyKey: write.idempotencyKey, checkpointId: write.checkpoint.checkpointId, checkpointDigest: write.checkpointDigest });
  const validatedNext = validateTrustedCheckpointStoreStateV01(next, { allowedProjectRefs: allowlist });
  return deepFreeze({ state: validatedNext, checkpoint: clone(write.checkpoint), replayed: false });
}

export function createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs, initialState } = {}) {
  const allowlist = normalizeAllowlist(allowedProjectRefs);
  let state = initialState === undefined
    ? createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs: allowlist })
    : validateTrustedCheckpointStoreStateV01(initialState, { allowedProjectRefs: allowlist });

  return Object.freeze({
    async readLatest({ projectRef } = {}) {
      const ref = boundedString(projectRef, "INVALID_STORE_READ", "projectRef");
      if (!allowlist.includes(ref)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Read project is outside the configured allowlist.", { projectRef: ref });
      const project = state.projects.find(item => item.projectRef === ref);
      const checkpoint = project?.checkpoints.at(-1) ?? null;
      return checkpoint === null ? null : deepFreeze(clone(checkpoint));
    },
    async writeCheckpoint(input) {
      const result = applyTrustedCheckpointWriteV01({ state, ...input, allowedProjectRefs: allowlist });
      state = result.state;
      const readBack = state.projects.find(item => item.projectRef === result.checkpoint.projectRef)?.checkpoints.at(-1) ?? null;
      if (!result.replayed && (!readBack || digestCheckpoint(readBack) !== digestCheckpoint(result.checkpoint))) fail("WRITE_VERIFICATION_FAILED", "In-memory checkpoint write failed read-after-write verification.");
      return deepFreeze({ checkpoint: clone(result.checkpoint), replayed: result.replayed });
    },
    async exportState() {
      return deepFreeze(clone(state));
    },
  });
}
