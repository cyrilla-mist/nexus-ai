import {
  createFileOutcomeRecordStoreV01,
} from "../continuity-loop-v01/file-outcome-record-store.mjs";
import {
  createFileTrustedCheckpointStoreV01,
} from "../continuity-loop-v01/file-trusted-checkpoint-store.mjs";
import {
  createInMemoryOutcomeRecordStoreV01,
} from "../continuity-loop-v01/outcome-record-store.mjs";
import {
  createInMemoryTrustedCheckpointStoreV01,
} from "../continuity-loop-v01/trusted-checkpoint-store.mjs";
import { buildWritebackTargetV01 } from "./writeback-target-validator.mjs";

export const PHASE6_MEMORY_TARGET_KIND_V01 = "phase6-memory-pair";
export const PHASE6_FILE_TARGET_KIND_V01 = "phase6-file-pair";

export class Phase6StoreTargetAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "Phase6StoreTargetAdapterError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const fail = (code, message, details = {}) => { throw new Phase6StoreTargetAdapterError(code, message, details); };
const capabilities = () => ({
  projectScopeEnforced: true,
  idempotentOutcomeAppend: true,
  checkpointCompareAndSwap: true,
  exactReadAfterWrite: true,
});
const artifactKinds = () => ["outcome-record", "trusted-checkpoint"];

function validateProjectRefs(projectRefs) {
  if (!Array.isArray(projectRefs) || projectRefs.length === 0) fail("INVALID_PHASE6_TARGET_OPTIONS", "projectRefs must be a non-empty array.");
  const normalized = projectRefs.map((value, index) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim()) fail("INVALID_PHASE6_TARGET_OPTIONS", `projectRefs[${index}] is invalid.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) fail("INVALID_PHASE6_TARGET_OPTIONS", "projectRefs must be unique.");
  return [...normalized].sort();
}

function adapterResult(target, outcomeStore, checkpointStore) {
  return Object.freeze({ target, outcomeStore, checkpointStore });
}

export function createPhase6MemoryWritebackTargetV01({ projectRefs } = {}) {
  const allowlist = validateProjectRefs(projectRefs);
  const outcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: allowlist });
  const checkpointStore = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: allowlist });
  const target = buildWritebackTargetV01({
    providerKind: PHASE6_MEMORY_TARGET_KIND_V01,
    durability: "memory",
    artifactKinds: artifactKinds(),
    capabilities: capabilities(),
  });
  return adapterResult(target, outcomeStore, checkpointStore);
}

export function createPhase6FileWritebackTargetV01({
  projectRefs,
  outcomeFilePath,
  checkpointFilePath,
  fsImpl,
  maxLockAttempts = 40,
  lockRetryMs = 25,
} = {}) {
  const allowlist = validateProjectRefs(projectRefs);
  if (typeof outcomeFilePath !== "string" || typeof checkpointFilePath !== "string" || outcomeFilePath === checkpointFilePath) {
    fail("INVALID_PHASE6_TARGET_OPTIONS", "outcomeFilePath and checkpointFilePath must be distinct strings.");
  }

  const outcomeStore = createFileOutcomeRecordStoreV01({
    filePath: outcomeFilePath,
    allowedProjectRefs: allowlist,
    fsImpl,
    maxLockAttempts,
    lockRetryMs,
  });
  const checkpointStore = createFileTrustedCheckpointStoreV01({
    filePath: checkpointFilePath,
    allowedProjectRefs: allowlist,
    fsImpl,
    maxLockAttempts,
    lockRetryMs,
  });
  const target = buildWritebackTargetV01({
    providerKind: PHASE6_FILE_TARGET_KIND_V01,
    durability: "durable",
    artifactKinds: artifactKinds(),
    capabilities: capabilities(),
  });

  return adapterResult(target, outcomeStore, checkpointStore);
}
