export const SOURCE_SNAPSHOT_VERSION = "0.1";

const CODES = ["INVALID_REPOSITORY_REF", "INVALID_ADAPTER_OPTIONS", "INVALID_CAPTURED_AT", "SOURCE_AUTH_REQUIRED", "SOURCE_FORBIDDEN", "SOURCE_NOT_FOUND", "SOURCE_RATE_LIMITED", "SOURCE_UNAVAILABLE", "SOURCE_RESPONSE_INVALID", "SOURCE_SCOPE_MISMATCH", "SOURCE_RECORD_ID_INVALID", "SOURCE_PAGINATION_LIMIT", "SOURCE_SNAPSHOT_INVALID"];
const RETRYABLE = new Set(["SOURCE_RATE_LIMITED", "SOURCE_UNAVAILABLE"]);
const LIMIT_KEYS = ["commits", "issues", "pullRequests", "releases", "tags"];
const RECORD_KEYS = ["sourceRecordId", "sourceType", "externalId", "observedState", "observedAt", "reference", "authority", "payload"];
const TYPES = ["repository", "branch", "commit", "issue", "pull_request", "release", "tag"];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SHA = /^[0-9a-f]{40}$/;

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = value => Object.keys(value);
const exact = (value, expected) => isObject(value) && keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const fail = (code, message, details = {}) => { throw new SourceAdapterError(code, message, details); };
const safeClone = value => {
  if (Array.isArray(value)) return value.map(safeClone);
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, safeClone(item)]));
  return value;
};
const freeze = value => {
  if (isObject(value) || Array.isArray(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const string = (value, label, allowEmpty = false) => { if (typeof value !== "string" || (!allowEmpty && value.length === 0)) fail("SOURCE_SNAPSHOT_INVALID", `${label} invalid`); return value; };
const timestamp = (value, code = "SOURCE_SNAPSHOT_INVALID", label = "timestamp") => { if (typeof value !== "string" || !ISO.test(value) || Number.isNaN(Date.parse(value))) fail(code, `${label} invalid`); return value; };
const nullableTimestamp = (value, label) => value === null ? null : timestamp(value, "SOURCE_SNAPSHOT_INVALID", label);
const positiveInt = (value, label) => { if (!Number.isSafeInteger(value) || value <= 0) fail("SOURCE_SNAPSHOT_INVALID", `${label} invalid`); return value; };
const nonNegativeInt = (value, label) => { if (!Number.isSafeInteger(value) || value < 0) fail("SOURCE_SNAPSHOT_INVALID", `${label} invalid`); return value; };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export class SourceAdapterError extends Error {
  constructor(code, message = code, details = {}) {
    if (!CODES.includes(code)) code = "SOURCE_UNAVAILABLE";
    super(message);
    this.name = "SourceAdapterError";
    this.code = code;
    this.retryable = RETRYABLE.has(code);
    this.details = freeze(safeClone(isObject(details) ? details : {}));
    Object.freeze(this);
  }
}

export function normalizeRepositoryRefV01(value) {
  if (typeof value !== "string") fail("INVALID_REPOSITORY_REF", "repositoryRef must be a string");
  const ref = value.trim();
  if (ref.length < 1 || ref.length > 256 || ref.includes("://") || ref.includes("?") || ref.includes("#") || ref.includes("\\") || ref.includes("..") || ref.startsWith("/") || ref.endsWith("/") || ref.split("/").length !== 2) fail("INVALID_REPOSITORY_REF", "repositoryRef invalid");
  const parts = ref.split("/");
  if (parts.some(part => part.length < 1 || part.length > 128 || !/^[A-Za-z0-9._-]+$/.test(part))) fail("INVALID_REPOSITORY_REF", "repositoryRef segment invalid");
  return parts.map(part => part.toLowerCase()).join("/");
}

function validateLimits(value, code = "SOURCE_SNAPSHOT_INVALID") {
  if (!exact(value, LIMIT_KEYS)) fail(code, "requestedLimits invalid");
  for (const key of LIMIT_KEYS) if (!Number.isSafeInteger(value[key]) || value[key] < 0) fail(code, `${key} limit invalid`);
  return value;
}

function validateGenericRecord(record) {
  if (!exact(record, RECORD_KEYS)) fail("SOURCE_SNAPSHOT_INVALID", "record shape invalid");
  string(record.sourceRecordId, "sourceRecordId"); string(record.sourceType, "sourceType"); string(record.externalId, "externalId"); string(record.observedState, "observedState");
  if (record.observedAt !== null) timestamp(record.observedAt, "SOURCE_SNAPSHOT_INVALID", "observedAt");
  string(record.reference, "reference"); string(record.authority, "authority");
  if (!isObject(record.payload)) fail("SOURCE_SNAPSHOT_INVALID", "payload invalid");
}

function validateDiagnostics(value, limits, records) {
  if (!exact(value, ["complete", "collections"]) || typeof value.complete !== "boolean" || !exact(value.collections, LIMIT_KEYS)) fail("SOURCE_SNAPSHOT_INVALID", "diagnostics invalid");
  for (const key of LIMIT_KEYS) {
    const item = value.collections[key];
    if (!exact(item, ["requestedLimit", "appliedLimit", "itemsRead", "pagesRead", "truncated", "continuationAvailable"])) fail("SOURCE_SNAPSHOT_INVALID", "collection diagnostics invalid");
    for (const n of ["requestedLimit", "appliedLimit", "itemsRead", "pagesRead"]) nonNegativeInt(item[n], `${key}.${n}`);
    if (item.requestedLimit !== limits[key] || item.appliedLimit !== limits[key] || item.itemsRead > item.appliedLimit || typeof item.truncated !== "boolean" || typeof item.continuationAvailable !== "boolean") fail("SOURCE_SNAPSHOT_INVALID", "collection diagnostics mismatch");
    if (item.truncated && !item.continuationAvailable) fail("SOURCE_SNAPSHOT_INVALID", "truncated requires continuation");
    if (!item.continuationAvailable && item.truncated) fail("SOURCE_SNAPSHOT_INVALID", "continuation mismatch");
    if (item.requestedLimit === 0 && (item.appliedLimit !== 0 || item.itemsRead !== 0 || item.pagesRead !== 0 || item.truncated || item.continuationAvailable)) fail("SOURCE_SNAPSHOT_INVALID", "zero limit diagnostics mismatch");
    const type = key === "pullRequests" ? "pull_request" : key.slice(0, -1);
    const count = records.filter(record => record.sourceType === type).length;
    if (count !== item.itemsRead) fail("SOURCE_SNAPSHOT_INVALID", "diagnostic item count mismatch");
  }
}

export function validateSourceSnapshotV01(snapshot) {
  if (!exact(snapshot, ["snapshotVersion", "adapter", "capturedAt", "scope", "source", "records", "diagnostics"])) fail("SOURCE_SNAPSHOT_INVALID", "snapshot shape invalid");
  if (snapshot.snapshotVersion !== SOURCE_SNAPSHOT_VERSION) fail("SOURCE_SNAPSHOT_INVALID", "snapshot version invalid");
  string(snapshot.adapter, "adapter"); timestamp(snapshot.capturedAt, "INVALID_CAPTURED_AT", "capturedAt");
  if (!exact(snapshot.scope, ["type", "repositoryRef", "requestedLimits"]) || snapshot.scope.type !== "repository") fail("SOURCE_SNAPSHOT_INVALID", "scope invalid");
  const ref = normalizeRepositoryRefV01(snapshot.scope.repositoryRef);
  if (ref !== snapshot.scope.repositoryRef) fail("SOURCE_SNAPSHOT_INVALID", "repositoryRef must be normalized");
  validateLimits(snapshot.scope.requestedLimits);
  if (!exact(snapshot.source, ["provider", "reference", "retrievalMode", "authority", "state"]) || snapshot.source.state !== "available") fail("SOURCE_SNAPSHOT_INVALID", "source invalid");
  string(snapshot.source.provider, "provider"); string(snapshot.source.reference, "reference"); string(snapshot.source.retrievalMode, "retrievalMode"); string(snapshot.source.authority, "authority");
  if (!Array.isArray(snapshot.records)) fail("SOURCE_SNAPSHOT_INVALID", "records invalid");
  const ids = new Set(); for (const record of snapshot.records) { validateGenericRecord(record); if (ids.has(record.sourceRecordId)) fail("SOURCE_SNAPSHOT_INVALID", "duplicate sourceRecordId"); ids.add(record.sourceRecordId); }
  validateDiagnostics(snapshot.diagnostics, snapshot.scope.requestedLimits, snapshot.records);
  return freeze(safeClone(snapshot));
}

const authorityFor = { repository: "github-repository-state", branch: "github-ref-state", commit: "github-commit-state", issue: "github-issue-state", pull_request: "github-pull-request-state", release: "github-release-state", tag: "github-ref-state" };
const typeRank = { repository: 0, branch: 1, commit: 2, issue: 3, pull_request: 4, release: 5, tag: 6 };
function githubRecord(record, ref) {
  if (!TYPES.includes(record.sourceType) || record.authority !== authorityFor[record.sourceType]) fail("SOURCE_SNAPSHOT_INVALID", "GitHub record type or authority invalid");
  if (!record.reference.startsWith("https://github.com/") || record.reference.includes("?") || record.reference.includes("#")) fail("SOURCE_SNAPSHOT_INVALID", "reference invalid");
  const p = record.payload, t = record.sourceType;
  if (t === "repository") {
    if (!exact(p, ["name", "fullName", "defaultBranch", "archived", "visibility", "updatedAt"]) || typeof p.archived !== "boolean" || !["public", "private"].includes(p.visibility)) fail("SOURCE_SNAPSHOT_INVALID", "repository payload invalid");
    if (p.fullName.toLowerCase() !== ref) fail("SOURCE_SCOPE_MISMATCH", "repository outside scope");
    if (record.externalId !== ref || record.sourceRecordId !== `github:repo:${ref}` || record.observedState !== (p.archived ? "archived" : "available") || record.observedAt !== p.updatedAt) fail("SOURCE_RECORD_ID_INVALID", "repository identity invalid");
    timestamp(p.updatedAt, "SOURCE_SNAPSHOT_INVALID", "updatedAt"); string(p.name, "name"); string(p.defaultBranch, "defaultBranch");
  } else if (t === "branch") {
    if (!exact(p, ["name", "headSha"]) || !SHA.test(p.headSha) || record.sourceRecordId !== `github:branch:${ref}:${p.name}` || record.externalId !== p.name || record.observedState !== "present" || record.observedAt !== null) fail("SOURCE_SNAPSHOT_INVALID", "branch invalid");
  } else if (t === "commit") {
    if (!exact(p, ["sha", "authoredAt", "committedAt", "messageHeadline"]) || !SHA.test(p.sha) || typeof p.messageHeadline !== "string" || /[\r\n]/.test(p.messageHeadline) || record.externalId !== p.sha || record.sourceRecordId !== `github:commit:${ref}:${p.sha}` || record.observedAt !== p.committedAt) fail("SOURCE_SNAPSHOT_INVALID", "commit invalid");
    nullableTimestamp(p.authoredAt, "authoredAt"); timestamp(p.committedAt, "SOURCE_SNAPSHOT_INVALID", "committedAt");
  } else if (t === "issue" || t === "pull_request") {
    const base = t === "issue" ? ["number", "title", "state", "createdAt", "updatedAt", "closedAt"] : ["number", "title", "state", "draft", "merged", "createdAt", "updatedAt", "closedAt", "mergedAt", "headSha", "baseRef"];
    if (!exact(p, base) || !Number.isSafeInteger(p.number) || p.number <= 0 || !["open", "closed"].includes(p.state) || record.externalId !== String(p.number) || record.sourceRecordId !== `github:${t === "issue" ? "issue" : "pr"}:${ref}:${p.number}`) fail("SOURCE_SNAPSHOT_INVALID", "issue or PR invalid");
    string(p.title, "title"); timestamp(p.createdAt, "SOURCE_SNAPSHOT_INVALID", "createdAt"); timestamp(p.updatedAt, "SOURCE_SNAPSHOT_INVALID", "updatedAt"); nullableTimestamp(p.closedAt, "closedAt");
    if (t === "issue") { if (record.observedState !== p.state || record.observedAt !== p.updatedAt) fail("SOURCE_SNAPSHOT_INVALID", "issue state invalid"); }
    else { if (typeof p.draft !== "boolean" || typeof p.merged !== "boolean" || !SHA.test(p.headSha) || typeof p.baseRef !== "string" || !p.baseRef || (p.merged && (p.state !== "closed" || !p.mergedAt)) || (!p.merged && p.state === "open" && record.observedState !== "open") || (!p.merged && p.state === "closed" && record.observedState !== "closed") || (p.merged && record.observedState !== "merged") || record.observedAt !== (p.mergedAt || p.updatedAt)) fail("SOURCE_SNAPSHOT_INVALID", "PR state invalid"); nullableTimestamp(p.mergedAt, "mergedAt"); }
  } else if (t === "release") {
    if (!exact(p, ["immutableId", "tagName", "name", "draft", "prerelease", "createdAt", "publishedAt"]) || typeof p.immutableId !== "string" || !p.immutableId || typeof p.tagName !== "string" || !p.tagName || typeof p.name !== "string" || typeof p.draft !== "boolean" || typeof p.prerelease !== "boolean" || record.externalId !== p.immutableId || record.sourceRecordId !== `github:release:${ref}:${p.immutableId}`) fail("SOURCE_SNAPSHOT_INVALID", "release invalid");
    timestamp(p.createdAt, "SOURCE_SNAPSHOT_INVALID", "createdAt"); nullableTimestamp(p.publishedAt, "publishedAt"); const state = p.draft ? "draft" : p.prerelease ? "prerelease" : "published"; if (record.observedState !== state || record.observedAt !== (p.publishedAt || p.createdAt)) fail("SOURCE_SNAPSHOT_INVALID", "release state invalid");
  } else if (t === "tag") {
    if (!exact(p, ["name", "targetSha"]) || typeof p.name !== "string" || !p.name || (p.targetSha !== null && !SHA.test(p.targetSha)) || record.externalId !== p.name || record.sourceRecordId !== `github:tag:${ref}:${p.name}` || record.observedState !== "present" || record.observedAt !== null) fail("SOURCE_SNAPSHOT_INVALID", "tag invalid");
  }
}

export function validateGitHubSourceSnapshotV01(snapshot) {
  const value = validateSourceSnapshotV01(snapshot), ref = value.scope.repositoryRef;
  if (value.adapter !== "github" || value.source.provider !== "github" || value.source.reference !== ref || value.source.retrievalMode !== "read-only-api" || value.source.authority !== "github-repository-state") fail("SOURCE_SNAPSHOT_INVALID", "GitHub source invalid");
  const repo = value.records.filter(r => r.sourceType === "repository"), branches = value.records.filter(r => r.sourceType === "branch");
  if (repo.length !== 1 || branches.length !== 1 || repo[0].payload.defaultBranch !== branches[0].payload.name) fail("SOURCE_SNAPSHOT_INVALID", "GitHub core records invalid");
  for (const record of value.records) githubRecord(record, ref);
  const ordered = [...value.records].sort((a, b) => { if (typeRank[a.sourceType] !== typeRank[b.sourceType]) return typeRank[a.sourceType] - typeRank[b.sourceType]; if (a.sourceType === "commit") return compare(b.payload.committedAt, a.payload.committedAt) || compare(a.payload.sha, b.payload.sha); if (a.sourceType === "issue" || a.sourceType === "pull_request") return compare(b.payload.updatedAt, a.payload.updatedAt) || b.payload.number - a.payload.number; if (a.sourceType === "release") return (b.payload.publishedAt === null) - (a.payload.publishedAt === null) || compare(b.payload.publishedAt || "", a.payload.publishedAt || "") || compare(a.payload.immutableId, b.payload.immutableId); if (a.sourceType === "tag") return compare(a.payload.name, b.payload.name); return compare(a.sourceRecordId, b.sourceRecordId); });
  if (JSON.stringify(ordered) !== JSON.stringify(value.records)) fail("SOURCE_SNAPSHOT_INVALID", "record ordering invalid");
  return value;
}
