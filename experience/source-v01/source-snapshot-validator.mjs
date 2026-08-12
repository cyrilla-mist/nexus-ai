export const SOURCE_SNAPSHOT_VERSION = "0.1";
export const SOURCE_ADAPTER_ERROR_CODES_V01 = Object.freeze(["INVALID_REPOSITORY_REF", "INVALID_ADAPTER_OPTIONS", "INVALID_CAPTURED_AT", "SOURCE_AUTH_REQUIRED", "SOURCE_FORBIDDEN", "SOURCE_NOT_FOUND", "SOURCE_RATE_LIMITED", "SOURCE_UNAVAILABLE", "SOURCE_RESPONSE_INVALID", "SOURCE_SCOPE_MISMATCH", "SOURCE_RECORD_ID_INVALID", "SOURCE_PAGINATION_LIMIT", "SOURCE_SNAPSHOT_INVALID"]);

const RETRYABLE = new Set(["SOURCE_RATE_LIMITED", "SOURCE_UNAVAILABLE"]);
const LIMIT_KEYS = ["commits", "issues", "pullRequests", "releases", "tags"];
const RECORD_KEYS = ["sourceRecordId", "sourceType", "externalId", "observedState", "observedAt", "reference", "authority", "payload"];
const TYPES = ["repository", "branch", "commit", "issue", "pull_request", "release", "tag"];
const AUTHORITY = { repository: "github-repository-state", branch: "github-ref-state", commit: "github-commit-state", issue: "github-issue-state", pull_request: "github-pull-request-state", release: "github-release-state", tag: "github-ref-state" };
const RANK = { repository: 0, branch: 1, commit: 2, issue: 3, pull_request: 4, release: 5, tag: 6 };
const OFFSET_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/;
const SHA = /^[0-9a-f]{40}$/;

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, expected) => object(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const freeze = value => { if (object(value) || Array.isArray(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const fail = (code, message, details = {}) => { throw new SourceAdapterError(code, message, details); };
const text = (value, label, empty = false) => { if (typeof value !== "string" || (!empty && value.length === 0)) fail("SOURCE_SNAPSHOT_INVALID", `${label} invalid`); return value; };
const nonNegative = (value, label) => { if (!Number.isSafeInteger(value) || value < 0) fail("SOURCE_SNAPSHOT_INVALID", `${label} invalid`); return value; };

export function isStrictOffsetIsoV01(value) {
  if (typeof value !== "string") return false;
  const match = value.match(OFFSET_ISO);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12 || Number(match[3]) < 1 || Number(match[3]) > new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate() || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) return false;
  if (match[8] !== "Z" && (Number(match[8].slice(1, 3)) > 23 || Number(match[8].slice(4)) > 59)) return false;
  return !Number.isNaN(Date.parse(value));
}

const timestamp = (value, code = "SOURCE_SNAPSHOT_INVALID", label = "timestamp") => { if (!isStrictOffsetIsoV01(value)) fail(code, `${label} invalid`); return value; };
const nullableTimestamp = (value, label) => value === null ? null : timestamp(value, "SOURCE_SNAPSHOT_INVALID", label);

export class SourceAdapterError extends Error {
  constructor(code, message = code, details = {}) {
    if (!SOURCE_ADAPTER_ERROR_CODES_V01.includes(code)) throw new TypeError(`Unknown SourceAdapterError code: ${String(code)}`);
    super(message); this.name = "SourceAdapterError"; this.code = code; this.retryable = RETRYABLE.has(code); const safeDetails = {}; for (const key of ["operation", "repositoryRef"]) if (typeof details?.[key] === "string") safeDetails[key] = details[key]; this.details = freeze(safeDetails); Object.freeze(this);
  }
}

export function normalizeRepositoryRefV01(value) {
  if (typeof value !== "string") fail("INVALID_REPOSITORY_REF", "repositoryRef invalid");
  const ref = value.trim();
  if (ref.length < 1 || ref.length > 256 || ref.includes("://") || ref.includes("?") || ref.includes("#") || ref.includes("\\") || ref.includes("..") || ref.startsWith("/") || ref.endsWith("/") || ref.split("/").length !== 2) fail("INVALID_REPOSITORY_REF", "repositoryRef invalid");
  const parts = ref.split("/"); if (parts.some(part => part.length < 1 || part.length > 128 || !/^[A-Za-z0-9._-]+$/.test(part))) fail("INVALID_REPOSITORY_REF", "repositoryRef segment invalid");
  return parts.map(part => part.toLowerCase()).join("/");
}

function limits(value, code = "SOURCE_SNAPSHOT_INVALID") {
  if (!exact(value, LIMIT_KEYS) || LIMIT_KEYS.some(key => !Number.isSafeInteger(value[key]) || value[key] < 0)) fail(code, "requestedLimits invalid");
  return value;
}

function genericRecord(record) {
  if (!exact(record, RECORD_KEYS)) fail("SOURCE_SNAPSHOT_INVALID", "record shape invalid");
  text(record.sourceRecordId, "sourceRecordId"); text(record.sourceType, "sourceType"); text(record.externalId, "externalId"); text(record.observedState, "observedState");
  if (record.observedAt !== null) timestamp(record.observedAt, "SOURCE_SNAPSHOT_INVALID", "observedAt");
  if (record.reference !== null) text(record.reference, "reference"); text(record.authority, "authority");
  if (!object(record.payload)) fail("SOURCE_SNAPSHOT_INVALID", "payload invalid");
}

function diagnostics(value, requestedLimits, records) {
  if (!exact(value, ["complete", "collections"]) || value.complete !== true || !exact(value.collections, LIMIT_KEYS)) fail("SOURCE_SNAPSHOT_INVALID", "diagnostics invalid");
  for (const key of LIMIT_KEYS) {
    const item = value.collections[key];
    if (!exact(item, ["requestedLimit", "appliedLimit", "itemsRead", "pagesRead", "truncated", "continuationAvailable"]) || ["requestedLimit", "appliedLimit", "itemsRead", "pagesRead"].some(n => !Number.isSafeInteger(item[n]) || item[n] < 0) || typeof item.truncated !== "boolean" || typeof item.continuationAvailable !== "boolean") fail("SOURCE_SNAPSHOT_INVALID", "collection diagnostics invalid");
    if (item.requestedLimit !== requestedLimits[key] || item.appliedLimit !== requestedLimits[key] || item.itemsRead > item.appliedLimit || (item.truncated && !item.continuationAvailable) || (!item.continuationAvailable && item.truncated) || (item.requestedLimit === 0 && (item.itemsRead !== 0 || item.pagesRead !== 0 || item.truncated || item.continuationAvailable))) fail("SOURCE_SNAPSHOT_INVALID", "collection diagnostics mismatch");
    const type = key === "pullRequests" ? "pull_request" : key.slice(0, -1); if (records.filter(record => record.sourceType === type).length !== item.itemsRead) fail("SOURCE_SNAPSHOT_INVALID", "diagnostic item count mismatch");
  }
}

export function validateSourceSnapshotV01(snapshot) {
  if (!exact(snapshot, ["snapshotVersion", "adapter", "capturedAt", "scope", "source", "records", "diagnostics"]) || snapshot.snapshotVersion !== SOURCE_SNAPSHOT_VERSION) fail("SOURCE_SNAPSHOT_INVALID", "snapshot shape invalid");
  timestamp(snapshot.capturedAt, "INVALID_CAPTURED_AT", "capturedAt");
  if (!exact(snapshot.scope, ["type", "repositoryRef", "requestedLimits"]) || snapshot.scope.type !== "repository") fail("SOURCE_SNAPSHOT_INVALID", "scope invalid");
  const ref = normalizeRepositoryRefV01(snapshot.scope.repositoryRef); if (ref !== snapshot.scope.repositoryRef) fail("SOURCE_SNAPSHOT_INVALID", "repositoryRef must be normalized"); limits(snapshot.scope.requestedLimits);
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(snapshot.adapter)) fail("SOURCE_SNAPSHOT_INVALID", "adapter invalid");
  if (!exact(snapshot.source, ["provider", "reference", "retrievalMode", "authority", "state"]) || snapshot.source.state !== "available") fail("SOURCE_SNAPSHOT_INVALID", "source invalid");
  text(snapshot.source.provider, "provider"); if (snapshot.source.reference !== null) text(snapshot.source.reference, "reference"); text(snapshot.source.retrievalMode, "retrievalMode"); text(snapshot.source.authority, "authority");
  if (!Array.isArray(snapshot.records)) fail("SOURCE_SNAPSHOT_INVALID", "records invalid"); const ids = new Set(); for (const record of snapshot.records) { genericRecord(record); if (ids.has(record.sourceRecordId)) fail("SOURCE_SNAPSHOT_INVALID", "duplicate sourceRecordId"); ids.add(record.sourceRecordId); }
  diagnostics(snapshot.diagnostics, snapshot.scope.requestedLimits, snapshot.records); return freeze(clone(snapshot));
}

function identityScope(record, ref) {
  const match = record.sourceRecordId.match(/^github:(?:repo|branch|commit|issue|pr|release|tag):([^:]+\/[^:]+)(?::|$)/);
  if (match && match[1] !== ref) fail("SOURCE_SCOPE_MISMATCH", "record outside repository scope");
}
function safeGitHubReference(record) { if (typeof record.reference !== "string" || !record.reference.startsWith("https://github.com/") || record.reference.includes("?") || record.reference.includes("#")) fail("SOURCE_SNAPSHOT_INVALID", "GitHub reference invalid"); }
function githubRecord(record, ref) {
  identityScope(record, ref); if (!TYPES.includes(record.sourceType) || record.authority !== AUTHORITY[record.sourceType]) fail("SOURCE_SNAPSHOT_INVALID", "GitHub record type or authority invalid"); safeGitHubReference(record); const p = record.payload, t = record.sourceType;
  if (t === "repository") {
    if (!exact(p, ["name", "fullName", "defaultBranch", "archived", "visibility", "updatedAt"]) || typeof p.archived !== "boolean" || !["public", "private"].includes(p.visibility)) fail("SOURCE_SNAPSHOT_INVALID", "repository payload invalid");
    if (p.fullName.toLowerCase() !== ref) fail("SOURCE_SCOPE_MISMATCH", "repository outside scope"); if (p.name !== ref.split("/")[1]) fail("SOURCE_RECORD_ID_INVALID", "repository name invalid"); timestamp(p.updatedAt, "SOURCE_SNAPSHOT_INVALID", "updatedAt");
    if (record.externalId !== ref || record.sourceRecordId !== `github:repo:${ref}` || record.observedState !== (p.archived ? "archived" : "available") || record.observedAt !== p.updatedAt) fail("SOURCE_RECORD_ID_INVALID", "repository identity invalid");
  } else if (t === "branch") {
    if (!exact(p, ["name", "headSha"]) || !SHA.test(p.headSha)) fail("SOURCE_SNAPSHOT_INVALID", "branch payload invalid"); if (record.sourceRecordId !== `github:branch:${ref}:${p.name}` || record.externalId !== p.name || record.observedState !== "present" || record.observedAt !== null) fail("SOURCE_RECORD_ID_INVALID", "branch identity invalid");
  } else if (t === "commit") {
    if (!exact(p, ["sha", "authoredAt", "committedAt", "messageHeadline"]) || !SHA.test(p.sha) || typeof p.messageHeadline !== "string" || /[\r\n]/.test(p.messageHeadline) || record.externalId !== p.sha || record.sourceRecordId !== `github:commit:${ref}:${p.sha}` || record.observedAt !== p.committedAt) fail("SOURCE_RECORD_ID_INVALID", "commit identity invalid"); nullableTimestamp(p.authoredAt, "authoredAt"); timestamp(p.committedAt, "SOURCE_SNAPSHOT_INVALID", "committedAt");
  } else if (t === "issue" || t === "pull_request") {
    const expected = t === "issue" ? ["number", "title", "state", "createdAt", "updatedAt", "closedAt"] : ["number", "title", "state", "draft", "merged", "createdAt", "updatedAt", "closedAt", "mergedAt", "headSha", "baseRef"];
    if (!exact(p, expected) || !Number.isSafeInteger(p.number) || p.number <= 0 || !["open", "closed"].includes(p.state) || record.externalId !== String(p.number) || record.sourceRecordId !== `github:${t === "issue" ? "issue" : "pr"}:${ref}:${p.number}`) fail("SOURCE_RECORD_ID_INVALID", "issue identity invalid");
    text(p.title, "title"); timestamp(p.createdAt, "SOURCE_SNAPSHOT_INVALID", "createdAt"); timestamp(p.updatedAt, "SOURCE_SNAPSHOT_INVALID", "updatedAt"); nullableTimestamp(p.closedAt, "closedAt");
    if (t === "issue") { if (record.observedState !== p.state || record.observedAt !== p.updatedAt) fail("SOURCE_SNAPSHOT_INVALID", "issue state invalid"); }
    else { if (typeof p.draft !== "boolean" || typeof p.merged !== "boolean" || !SHA.test(p.headSha) || typeof p.baseRef !== "string" || !p.baseRef || (p.merged && (p.state !== "closed" || p.mergedAt === null)) || (!p.merged && p.state === "open" && p.closedAt !== null) || record.observedState !== (p.merged ? "merged" : p.state) || record.observedAt !== p.updatedAt) fail("SOURCE_SNAPSHOT_INVALID", "PR state or time invalid"); nullableTimestamp(p.mergedAt, "mergedAt"); }
  } else if (t === "release") {
    if (!exact(p, ["immutableId", "tagName", "name", "draft", "prerelease", "createdAt", "publishedAt"]) || typeof p.immutableId !== "string" || !p.immutableId || typeof p.tagName !== "string" || !p.tagName || typeof p.name !== "string" || typeof p.draft !== "boolean" || typeof p.prerelease !== "boolean" || record.externalId !== p.immutableId || record.sourceRecordId !== `github:release:${ref}:${p.immutableId}`) fail("SOURCE_RECORD_ID_INVALID", "release identity invalid"); timestamp(p.createdAt, "SOURCE_SNAPSHOT_INVALID", "createdAt"); nullableTimestamp(p.publishedAt, "publishedAt"); const state = p.draft ? "draft" : p.prerelease ? "prerelease" : "published"; if (record.observedState !== state || record.observedAt !== (p.publishedAt || p.createdAt)) fail("SOURCE_SNAPSHOT_INVALID", "release state invalid");
  } else if (t === "tag" && (!exact(p, ["name", "targetSha"]) || typeof p.name !== "string" || !p.name || (p.targetSha !== null && !SHA.test(p.targetSha)) || record.externalId !== p.name || record.sourceRecordId !== `github:tag:${ref}:${p.name}` || record.observedState !== "present" || record.observedAt !== null)) fail("SOURCE_RECORD_ID_INVALID", "tag identity invalid");
}

function compareRecords(a, b) {
  if (RANK[a.sourceType] !== RANK[b.sourceType]) return RANK[a.sourceType] - RANK[b.sourceType];
  if (a.sourceType === "commit") return b.payload.committedAt.localeCompare(a.payload.committedAt) || a.payload.sha.localeCompare(b.payload.sha);
  if (a.sourceType === "issue" || a.sourceType === "pull_request") return b.payload.updatedAt.localeCompare(a.payload.updatedAt) || b.payload.number - a.payload.number;
  if (a.sourceType === "release") { const ap = a.payload.publishedAt, bp = b.payload.publishedAt; if (ap === null && bp !== null) return 1; if (ap !== null && bp === null) return -1; if (ap !== bp) return (bp || "").localeCompare(ap || ""); return a.payload.immutableId.localeCompare(b.payload.immutableId); }
  if (a.sourceType === "tag") return a.payload.name.localeCompare(b.payload.name);
  return a.sourceRecordId.localeCompare(b.sourceRecordId);
}

export function validateGitHubSourceSnapshotV01(snapshot) {
  const value = validateSourceSnapshotV01(snapshot), ref = value.scope.repositoryRef;
  if (value.adapter !== "github" || value.source.provider !== "github" || value.source.reference !== ref || value.source.retrievalMode !== "read-only-api" || value.source.authority !== "github-repository-state") fail("SOURCE_SNAPSHOT_INVALID", "GitHub source invalid");
  const repos = value.records.filter(record => record.sourceType === "repository"), branches = value.records.filter(record => record.sourceType === "branch"); if (repos.length !== 1 || branches.length !== 1 || repos[0].payload.defaultBranch !== branches[0].payload.name) fail("SOURCE_SNAPSHOT_INVALID", "GitHub core records invalid");
  value.records.forEach(record => githubRecord(record, ref)); if (JSON.stringify([...value.records].sort(compareRecords)) !== JSON.stringify(value.records)) fail("SOURCE_SNAPSHOT_INVALID", "record ordering invalid"); return value;
}
