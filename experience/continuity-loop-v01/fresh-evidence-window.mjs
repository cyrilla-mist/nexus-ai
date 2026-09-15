import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "./trusted-checkpoint-validator.mjs";
import {
  normalizeRepositoryRefV01,
  validateGitHubSourceSnapshotV01,
} from "../source-v01/source-snapshot-validator.mjs";
import {
  GITHUB_COMMIT_RANGE_MAX_V01,
  validateGitHubCommitRangeProofV01,
} from "./github-commit-range-proof.mjs";

export const FRESH_EVIDENCE_WINDOW_VERSION_V01 = "nexus-atlas.fresh-evidence-window.v0.1";
export const GITHUB_DEFAULT_BRANCH_POLICY_V1 = "nexus-atlas.github-default-branch.v1";

const POLICY_KEYS = ["policyVersion", "projectRef", "repositoryRef", "maxCommitRange"];
const BLOCKED_REASONS = new Set([
  "evidence-scope-violation",
  "required-evidence-missing",
  "evidence-invalid",
  "evidence-window-incomplete",
]);

export class FreshEvidenceWindowError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FreshEvidenceWindowError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (code, message, details = {}) => { throw new FreshEvidenceWindowError(code, message, details); };

function validatePolicy(policy) {
  if (!exact(policy, POLICY_KEYS) || policy.policyVersion !== GITHUB_DEFAULT_BRANCH_POLICY_V1) fail("INVALID_FRESH_EVIDENCE_POLICY", "requiredEvidencePolicy has an invalid field set or version.");
  if (typeof policy.projectRef !== "string" || !policy.projectRef.trim() || policy.projectRef !== policy.projectRef.trim()) fail("INVALID_FRESH_EVIDENCE_POLICY", "policy projectRef is invalid.");
  let repositoryRef;
  try {
    repositoryRef = normalizeRepositoryRefV01(policy.repositoryRef);
  } catch {
    fail("INVALID_FRESH_EVIDENCE_POLICY", "policy repositoryRef is invalid.");
  }
  if (repositoryRef !== policy.repositoryRef) fail("INVALID_FRESH_EVIDENCE_POLICY", "policy repositoryRef must already be normalized.");
  if (!Number.isSafeInteger(policy.maxCommitRange) || policy.maxCommitRange <= 0 || policy.maxCommitRange > GITHUB_COMMIT_RANGE_MAX_V01) fail("INVALID_FRESH_EVIDENCE_POLICY", "policy maxCommitRange is invalid.");
  return deepFreeze(clone(policy));
}

function validatedCheckpoint(checkpoint) {
  try {
    return validateTrustedCheckpointV01(checkpoint);
  } catch (error) {
    fail("INVALID_TRUSTED_CHECKPOINT", "checkpoint failed the accepted Trusted Checkpoint validator.", { causeCode: error?.code });
  }
}

function validatedSnapshot(sourceSnapshot) {
  try {
    return validateGitHubSourceSnapshotV01(sourceSnapshot);
  } catch (error) {
    fail("INVALID_SOURCE_SNAPSHOT", "sourceSnapshot failed the accepted GitHub Source Snapshot validator.", { causeCode: error?.code });
  }
}

function snapshotCore(snapshot) {
  const repository = snapshot.records.find(record => record.sourceType === "repository");
  const branch = snapshot.records.find(record => record.sourceType === "branch");
  if (!repository || !branch) fail("INVALID_SOURCE_SNAPSHOT", "sourceSnapshot does not contain accepted repository/branch observations.");
  return { repository, branch };
}

function cursorLanguage(checkpoint) {
  const cursor = checkpoint.evidenceCursor;
  if (cursor?.provider !== "github" || cursor?.cursorType !== "default-branch-head") fail("UNSUPPORTED_EVIDENCE_CURSOR", "Phase 6C supports only the GitHub default-branch-head cursor language.");
  if (typeof cursor.value !== "string" || !/^[0-9a-f]{40}$/.test(cursor.value)) fail("INVALID_EVIDENCE_CURSOR", "GitHub default-branch-head cursor value must be an exact lowercase 40-character SHA.");
  return cursor;
}

function projectEvidenceRecord(record) {
  if (record.sourceType === "repository") {
    return {
      sourceRecordId: record.sourceRecordId,
      sourceType: record.sourceType,
      externalId: record.externalId,
      observedState: record.observedState,
      observedAt: record.observedAt,
      reference: record.reference,
      authority: record.authority,
      payload: {
        name: record.payload.name,
        fullName: record.payload.fullName,
        defaultBranch: record.payload.defaultBranch,
        archived: record.payload.archived,
        visibility: record.payload.visibility,
        updatedAt: record.payload.updatedAt,
      },
    };
  }
  return {
    sourceRecordId: record.sourceRecordId,
    sourceType: record.sourceType,
    externalId: record.externalId,
    observedState: record.observedState,
    observedAt: record.observedAt,
    reference: record.reference,
    authority: record.authority,
    payload: {
      name: record.payload.name,
      headSha: record.payload.headSha,
    },
  };
}

function buildWindow({ checkpoint, snapshot, policy, repository, branch, status, blockedReason, lineage, commitRangeProof = null, commitRecords = [] }) {
  if (status === "blocked" && !BLOCKED_REASONS.has(blockedReason)) fail("INVALID_FRESH_EVIDENCE_WINDOW_STATE", "blockedReason is invalid.");
  if (status === "complete" && blockedReason !== null) fail("INVALID_FRESH_EVIDENCE_WINDOW_STATE", "complete window cannot have a blockedReason.");
  const cursor = checkpoint.evidenceCursor;
  const records = [projectEvidenceRecord(repository), projectEvidenceRecord(branch), ...commitRecords.map(clone)];
  const payload = {
    windowVersion: FRESH_EVIDENCE_WINDOW_VERSION_V01,
    projectRef: checkpoint.projectRef,
    checkpointRef: checkpoint.checkpointId,
    observedAt: snapshot.capturedAt,
    source: {
      provider: "github",
      repositoryRef: snapshot.scope.repositoryRef,
      reference: snapshot.source.reference,
      authority: snapshot.source.authority,
    },
    policy: clone(policy),
    status,
    blockedReason,
    cursorFrom: clone(cursor),
    cursorTo: {
      provider: "github",
      scopeRef: snapshot.scope.repositoryRef,
      cursorType: "default-branch-head",
      value: branch.payload.headSha,
      capturedAt: snapshot.capturedAt,
    },
    lineage,
    records,
    diagnostics: {
      sourceSnapshotCapturedAt: snapshot.capturedAt,
      commitRangeProofId: commitRangeProof?.proofId ?? null,
      commitChangeCount: commitRecords.length,
    },
    capabilities: {
      assessmentAllowed: status === "complete",
    },
  };
  return deepFreeze({
    ...payload,
    windowId: `fresh-window:${digest(payload).slice(0, 24)}`,
  });
}

export function buildFreshEvidenceWindowV01({ checkpoint, sourceSnapshot, commitRangeProof, requiredEvidencePolicy } = {}) {
  const acceptedCheckpoint = validatedCheckpoint(checkpoint);
  const acceptedSnapshot = validatedSnapshot(sourceSnapshot);
  const policy = validatePolicy(requiredEvidencePolicy);
  const cursor = cursorLanguage(acceptedCheckpoint);
  const { repository, branch } = snapshotCore(acceptedSnapshot);

  const common = {
    checkpoint: acceptedCheckpoint,
    snapshot: acceptedSnapshot,
    policy,
    repository,
    branch,
  };

  if (acceptedCheckpoint.projectRef !== policy.projectRef || cursor.scopeRef !== policy.repositoryRef || acceptedSnapshot.scope.repositoryRef !== policy.repositoryRef) {
    return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-scope-violation", lineage: null });
  }

  if (Date.parse(acceptedSnapshot.capturedAt) <= Date.parse(cursor.capturedAt)) {
    return buildWindow({ ...common, status: "blocked", blockedReason: "required-evidence-missing", lineage: null });
  }

  const observedHead = branch.payload.headSha;
  if (observedHead === cursor.value) {
    if (commitRangeProof !== undefined && commitRangeProof !== null) {
      let acceptedProof;
      try {
        acceptedProof = validateGitHubCommitRangeProofV01(commitRangeProof);
      } catch {
        return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-invalid", lineage: null });
      }
      if (acceptedProof.repositoryRef !== policy.repositoryRef || acceptedProof.baseSha !== cursor.value || acceptedProof.headSha !== observedHead || acceptedProof.capturedAt !== acceptedSnapshot.capturedAt || acceptedProof.relation !== "identical") {
        return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-invalid", lineage: null, commitRangeProof: acceptedProof });
      }
    }
    return buildWindow({ ...common, status: "complete", blockedReason: null, lineage: "identical" });
  }

  if (commitRangeProof === undefined || commitRangeProof === null) {
    return buildWindow({ ...common, status: "blocked", blockedReason: "required-evidence-missing", lineage: null });
  }

  let proof;
  try {
    proof = validateGitHubCommitRangeProofV01(commitRangeProof);
  } catch {
    return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-invalid", lineage: null });
  }

  if (proof.repositoryRef !== policy.repositoryRef || proof.baseSha !== cursor.value || proof.headSha !== observedHead || proof.capturedAt !== acceptedSnapshot.capturedAt || proof.diagnostics.requestedLimit > policy.maxCommitRange || proof.relation === "identical") {
    return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-invalid", lineage: null, commitRangeProof: proof });
  }

  if (!proof.complete) {
    return buildWindow({ ...common, status: "blocked", blockedReason: "evidence-window-incomplete", lineage: proof.relation, commitRangeProof: proof });
  }

  return buildWindow({
    ...common,
    status: "complete",
    blockedReason: null,
    lineage: proof.relation,
    commitRangeProof: proof,
    commitRecords: proof.commits,
  });
}
