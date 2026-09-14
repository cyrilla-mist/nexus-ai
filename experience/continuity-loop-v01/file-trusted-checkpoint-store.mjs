import { randomUUID } from "node:crypto";
import * as defaultFs from "node:fs/promises";
import path from "node:path";

import {
  TrustedCheckpointStoreError,
  applyTrustedCheckpointWriteV01,
  createEmptyTrustedCheckpointStoreStateV01,
  validateTrustedCheckpointStoreStateV01,
} from "./trusted-checkpoint-store.mjs";

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateOptions({ filePath, allowedProjectRefs, fsImpl, maxLockAttempts, lockRetryMs }) {
  if (typeof filePath !== "string" || !filePath.trim() || filePath !== filePath.trim()) fail("INVALID_FILE_STORE_OPTIONS", "filePath must be a non-empty trimmed string.");
  if (!path.isAbsolute(filePath)) fail("INVALID_FILE_STORE_OPTIONS", "filePath must be absolute.");
  createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs });
  if (!fsImpl || ["readFile", "writeFile", "rename", "mkdir", "open", "unlink"].some(method => typeof fsImpl[method] !== "function")) fail("INVALID_FILE_STORE_OPTIONS", "fsImpl is missing required filesystem methods.");
  if (!Number.isSafeInteger(maxLockAttempts) || maxLockAttempts < 1 || maxLockAttempts > 200) fail("INVALID_FILE_STORE_OPTIONS", "maxLockAttempts must be an integer from 1 to 200.");
  if (!Number.isSafeInteger(lockRetryMs) || lockRetryMs < 0 || lockRetryMs > 1000) fail("INVALID_FILE_STORE_OPTIONS", "lockRetryMs must be an integer from 0 to 1000.");
}

export function createFileTrustedCheckpointStoreV01({
  filePath,
  allowedProjectRefs,
  fsImpl = defaultFs,
  maxLockAttempts = 40,
  lockRetryMs = 25,
} = {}) {
  validateOptions({ filePath, allowedProjectRefs, fsImpl, maxLockAttempts, lockRetryMs });
  const allowlist = [...allowedProjectRefs];
  const directory = path.dirname(filePath);
  const lockPath = `${filePath}.lock`;

  async function readState() {
    let text;
    try {
      text = await fsImpl.readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return createEmptyTrustedCheckpointStoreStateV01({ allowedProjectRefs: allowlist });
      fail("FILE_STORE_IO_ERROR", "Unable to read Trusted Checkpoint store.", { operation: "read" });
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      fail("INVALID_STORE_STATE", "Trusted Checkpoint store is not valid JSON.");
    }
    return validateTrustedCheckpointStoreStateV01(parsed, { allowedProjectRefs: allowlist });
  }

  async function acquireLock() {
    await fsImpl.mkdir(directory, { recursive: true });
    for (let attempt = 1; attempt <= maxLockAttempts; attempt += 1) {
      try {
        return await fsImpl.open(lockPath, "wx");
      } catch (error) {
        if (error?.code !== "EEXIST") fail("FILE_STORE_IO_ERROR", "Unable to acquire Trusted Checkpoint store lock.", { operation: "lock" });
        if (attempt === maxLockAttempts) fail("FILE_STORE_LOCK_TIMEOUT", "Trusted Checkpoint store lock remained unavailable.", { attempts: maxLockAttempts });
        if (lockRetryMs > 0) await sleep(lockRetryMs);
      }
    }
    fail("FILE_STORE_LOCK_TIMEOUT", "Trusted Checkpoint store lock remained unavailable.");
  }

  async function releaseLock(handle) {
    try { await handle.close(); } catch {}
    try { await fsImpl.unlink(lockPath); } catch (error) { if (error?.code !== "ENOENT") fail("FILE_STORE_IO_ERROR", "Unable to release Trusted Checkpoint store lock.", { operation: "unlock" }); }
  }

  async function writeAtomic(state) {
    await fsImpl.mkdir(directory, { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fsImpl.writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await fsImpl.rename(tempPath, filePath);
    } catch (error) {
      try { await fsImpl.unlink(tempPath); } catch {}
      fail("FILE_STORE_IO_ERROR", "Unable to atomically persist Trusted Checkpoint store.", { operation: "write" });
    }
  }

  async function readLatest({ projectRef } = {}) {
    if (typeof projectRef !== "string" || !projectRef.trim() || projectRef !== projectRef.trim()) fail("INVALID_STORE_READ", "projectRef must be a non-empty trimmed string.");
    if (!allowlist.includes(projectRef)) fail("PROJECT_SCOPE_NOT_ALLOWED", "Read project is outside the configured allowlist.", { projectRef });
    const state = await readState();
    const checkpoint = state.projects.find(item => item.projectRef === projectRef)?.checkpoints.at(-1) ?? null;
    return checkpoint === null ? null : deepFreeze(clone(checkpoint));
  }

  return Object.freeze({
    readLatest,
    async writeCheckpoint(input) {
      const lock = await acquireLock();
      let primaryError = null;
      try {
        const state = await readState();
        const result = applyTrustedCheckpointWriteV01({ state, ...input, allowedProjectRefs: allowlist });
        if (!result.replayed) {
          await writeAtomic(result.state);
          const readBack = await readState();
          const latest = readBack.projects.find(item => item.projectRef === result.checkpoint.projectRef)?.checkpoints.at(-1) ?? null;
          if (!latest || JSON.stringify(latest) !== JSON.stringify(result.checkpoint)) fail("WRITE_VERIFICATION_FAILED", "Durable checkpoint write failed read-after-write verification.");
        }
        return deepFreeze({ checkpoint: clone(result.checkpoint), replayed: result.replayed });
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        try { await releaseLock(lock); }
        catch (releaseError) { if (!primaryError) throw releaseError; }
      }
    },
    async exportState() {
      return deepFreeze(clone(await readState()));
    },
  });
}
