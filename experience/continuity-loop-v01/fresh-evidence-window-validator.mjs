import { createHash } from "node:crypto";

import {
  isStrictOffsetIsoV01,
  normalizeRepositoryRefV01,
} from "../source-v01/source-snapshot-validator.mjs";
import {
  FRESH_EVIDENCE_WINDOW_VERSION_V01,
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
} from "./fresh-evidence-window.mjs";
import { GITHUB_COMMIT_RANGE_MAX_V01 } from "./github-commit-range-proof.mjs";

const WINDOW_KEYS = [
  "windowVersion",
  "projectRef",
  "checkpointRef",
  "observedAt",
  "source",
  "policy",
  "status",
  "blockedReason",
  "cursorFrom",
  "cursorTo",
  "lineage",
  "records",
  "diagnostics",
  "capabilities",
  "windowId",
];
const SOURCE_KEYS = ["provider", "repositoryRef", "reference", "authority"];
const POLICY_KEYS = ["policyVersion", "projectRef", "repositoryRef", "maxCommitRange"];
const CURSOR_KEYS = ["provider", "scopeRef", "cursorType", "value", "capturedAt"];
const RECORD_KEYS = ["sourceRecordId", "sourceType", "externalId", "observedState", "observedAt", "reference", "authority", "payload"];
const DIAGNOSTIC_KEYS = ["sourceSnapshotCapturedAt", "commitRangeProofId", "commitChangeCount"];
const CAPABILITY_KEYS = ["assessmentAllowed"];
const REPOSITORY_PAYLOAD_KEYS = ["name", "fullName", "defaultBranch", "archived", "visibility", "updatedAt"];
const BRANCH_PAYLOAD_KEYS = ["name", "headSha"];
const COMMIT_PAYLOAD_KEYS = ["sha", "authoredAt", "committedAt", "messageHeadline"];
const BLOCKED_REASONS = new Set(["evidence-scope-violation", "required-evidence-missing", "evidence-invalid", "evidence-window-incomplete"]);
const LINEAGES = new Set(["identical", "ahead", "behind", "diverged"]);
const SHA = /^[0-9a-f]{40}$/;

export class FreshEvidenceWindowValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FreshEvidenceWindowValidationError";
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
const fail = (message, details = {}) => { throw new FreshEvidenceWindowValidationError("INVALID_FRESH_EVIDENCE_WINDOW", message, details); };
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text = (value, label) => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) fail(`${label} is invalid.`);
  return value;
};
const sha = (value, label) => {
  if (typeof value !== "string" || !SHA.test(value)) fail(`${label} must be an exact lowercase 40-character SHA.`);
  return value;
};
const timestamp = (value, label) => {
  if (!isStrictOffsetIsoV01(value)) fail(`${label} must be a strict offset ISO timestamp.`);
  return value;
};

function normalizedRepositoryRef(value, label) {
  let normalized;
  try {
    normalized = normalizeRepositoryRefV01(value);
  } catch {
    fail(`${label} is invalid.`);
  }
  if (normalized !== value) fail(`${label} must already be normalized.`);
  return normalized;
}

function validateCursor(cursor, label) {
  if (!exact(cursor, CURSOR_KEYS)) fail(`${label} field set is invalid.`);
  if (cursor.provider !== "github" || cursor.cursorType !== "default-branch-head") fail(`${label} cursor language is invalid.`);
  normalizedRepositoryRef(cursor.scopeRef, `${label}.scopeRef`);
  sha(cursor.value, `${label}.value`);
  timestamp(cursor.capturedAt, `${label}.capturedAt`);
}

function validateRecord(record, repositoryRef) {
  if (!exact(record, RECORD_KEYS)) fail("record field set is invalid.");
  text(record.sourceRecordId, "record.sourceRecordId");
  text(record.externalId, "record.externalId");
  if (typeof record.reference !== "string" || !record.reference.startsWith("https://github.com/") || record.reference.includes("?") || record.reference.includes("#")) fail("record.reference is invalid.");
  if (record.observedAt !== null) timestamp(record.observedAt, "record.observedAt");

  if (record.sourceType === "repository") {
    if (record.authority !== "github-repository-state" || !exact(record.payload, REPOSITORY_PAYLOAD_KEYS)) fail("repository evidence record is invalid.");
    if (record.payload.fullName.toLowerCase() !== repositoryRef || record.payload.name !== repositoryRef.split("/")[1] || record.externalId !== repositoryRef || record.sourceRecordId !== `github:repo:${repositoryRef}`) fail("repository evidence identity is invalid.");
    if (typeof record.payload.defaultBranch !== "string" || record.payload.defaultBranch.length === 0 || typeof record.payload.archived !== "boolean" || !["public", "private"].includes(record.payload.visibility)) fail("repository evidence payload is invalid.");
    timestamp(record.payload.updatedAt, "repository.updatedAt");
    if (record.observedAt !== record.payload.updatedAt || record.observedState !== (record.payload.archived ? "archived" : "available")) fail("repository observed state is invalid.");
    return;
  }

  if (record.sourceType === "branch") {
    if (record.authority !== "github-ref-state" || !exact(record.payload, BRANCH_PAYLOAD_KEYS)) fail("branch evidence record is invalid.");
    text(record.payload.name, "branch.name");
    sha(record.payload.headSha, "branch.headSha");
    if (record.externalId !== record.payload.name || record.sourceRecordId !== `github:branch:${repositoryRef}:${record.payload.name}` || record.observedState !== "present" || record.observedAt !== null) fail("branch evidence identity is invalid.");
    return;
  }

  if (record.sourceType === "commit") {
    if (record.authority !== "github-commit-state" || !exact(record.payload, COMMIT_PAYLOAD_KEYS)) fail("commit evidence record is invalid.");
    sha(record.payload.sha, "commit.sha");
    if (record.payload.authoredAt !== null) timestamp(record.payload.authoredAt, "commit.authoredAt");
    timestamp(record.payload.committedAt, "commit.committedAt");
    if (typeof record.payload.messageHeadline !== "string" || record.payload.messageHeadline.length === 0 || /[\r\n]/.test(record.payload.messageHeadline)) fail("commit.messageHeadline is invalid.");
    if (record.externalId !== record.payload.sha || record.sourceRecordId !== `github:commit:${repositoryRef}:${record.payload.sha}` || record.observedState !== "present" || record.observedAt !== record.payload.committedAt) fail("commit evidence identity is invalid.");
    return;
  }

  fail("Fresh Evidence Window v0.1 accepts only repository, branch and commit records.");
}

function payloadForId(window) {
  const { windowId: _windowId, ...payload } = window;
  return payload;
}

export function validateFreshEvidenceWindowV01(window) {
  if (!exact(window, WINDOW_KEYS)) fail("window field set is invalid.");
  if (window.windowVersion !== FRESH_EVIDENCE_WINDOW_VERSION_V01) fail("windowVersion is invalid.");
  text(window.projectRef, "projectRef");
  text(window.checkpointRef, "checkpointRef");
  timestamp(window.observedAt, "observedAt");

  if (!exact(window.source, SOURCE_KEYS) || window.source.provider !== "github") fail("source is invalid.");
  const repositoryRef = normalizedRepositoryRef(window.source.repositoryRef, "source.repositoryRef");
  if (window.source.reference !== repositoryRef || typeof window.source.authority !== "string" || window.source.authority.length === 0) fail("source reference/authority is invalid.");

  if (!exact(window.policy, POLICY_KEYS) || window.policy.policyVersion !== GITHUB_DEFAULT_BRANCH_POLICY_V1) fail("policy is invalid.");
  text(window.policy.projectRef, "policy.projectRef");
  normalizedRepositoryRef(window.policy.repositoryRef, "policy.repositoryRef");
  if (!Number.isSafeInteger(window.policy.maxCommitRange) || window.policy.maxCommitRange <= 0 || window.policy.maxCommitRange > GITHUB_COMMIT_RANGE_MAX_V01) fail("policy.maxCommitRange is invalid.");

  validateCursor(window.cursorFrom, "cursorFrom");
  validateCursor(window.cursorTo, "cursorTo");
  if (window.cursorTo.capturedAt !== window.observedAt) fail("cursorTo.capturedAt must equal observedAt.");

  if (!["complete", "blocked"].includes(window.status)) fail("status is invalid.");
  if (window.status === "complete") {
    if (window.blockedReason !== null || !LINEAGES.has(window.lineage)) fail("complete window state is invalid.");
  } else {
    if (!BLOCKED_REASONS.has(window.blockedReason) || (window.lineage !== null && !LINEAGES.has(window.lineage))) fail("blocked window state is invalid.");
  }

  if (!Array.isArray(window.records) || window.records.length < 2) fail("records are invalid.");
  const ids = new Set();
  for (const record of window.records) {
    validateRecord(record, repositoryRef);
    if (ids.has(record.sourceRecordId)) fail("duplicate sourceRecordId in window.");
    ids.add(record.sourceRecordId);
  }
  const repositoryRecords = window.records.filter(record => record.sourceType === "repository");
  const branchRecords = window.records.filter(record => record.sourceType === "branch");
  if (repositoryRecords.length !== 1 || branchRecords.length !== 1) fail("window must contain exactly one repository and one branch record.");

  if (!exact(window.diagnostics, DIAGNOSTIC_KEYS)) fail("diagnostics are invalid.");
  timestamp(window.diagnostics.sourceSnapshotCapturedAt, "diagnostics.sourceSnapshotCapturedAt");
  if (window.diagnostics.sourceSnapshotCapturedAt !== window.observedAt) fail("source snapshot capture does not match observedAt.");
  if (window.diagnostics.commitRangeProofId !== null && (typeof window.diagnostics.commitRangeProofId !== "string" || !/^github-range:[0-9a-f]{24}$/.test(window.diagnostics.commitRangeProofId))) fail("commitRangeProofId is invalid.");
  if (!Number.isSafeInteger(window.diagnostics.commitChangeCount) || window.diagnostics.commitChangeCount < 0 || window.diagnostics.commitChangeCount !== window.records.filter(record => record.sourceType === "commit").length) fail("commitChangeCount is invalid.");

  if (!exact(window.capabilities, CAPABILITY_KEYS) || typeof window.capabilities.assessmentAllowed !== "boolean" || window.capabilities.assessmentAllowed !== (window.status === "complete")) fail("assessment capability does not match window status.");

  if (window.projectRef !== window.policy.projectRef || repositoryRef !== window.policy.repositoryRef || repositoryRef !== window.cursorFrom.scopeRef || repositoryRef !== window.cursorTo.scopeRef) fail("window project/source/policy/cursor scope binding is invalid.");
  const branch = branchRecords[0];
  if (branch.payload.headSha !== window.cursorTo.value) fail("cursorTo does not match branch head evidence.");
  if (window.lineage === "identical" && window.cursorFrom.value !== window.cursorTo.value) fail("identical lineage requires the same cursor SHA.");
  if (window.lineage !== null && window.lineage !== "identical" && window.cursorFrom.value === window.cursorTo.value) fail("non-identical lineage cannot use the same cursor SHA.");
  if (window.status === "complete" && window.lineage === "identical" && window.diagnostics.commitChangeCount !== 0) fail("identical window cannot contain commit changes.");
  if (window.status === "complete" && ["ahead", "diverged"].includes(window.lineage) && window.diagnostics.commitChangeCount === 0) fail("complete ahead/diverged window requires commit changes.");
  if (window.status === "complete" && window.lineage === "behind" && window.diagnostics.commitChangeCount !== 0) fail("complete behind window cannot contain head-side commit changes.");

  const expectedId = `fresh-window:${digest(payloadForId(window)).slice(0, 24)}`;
  if (window.windowId !== expectedId) fail("windowId does not bind the normalized window payload.");

  return deepFreeze(clone(window));
}
