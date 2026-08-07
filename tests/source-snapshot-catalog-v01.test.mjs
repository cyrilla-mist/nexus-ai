import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../examples/nexus-atlas-source-snapshot-cases-v0.1.json" with { type: "json" };
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import { createGitHubClientFixture, createRequestedLimits, createRepositoryResponse, createCommit, createIssue, createPullRequest, createRelease, createTag, CAPTURED_AT } from "./helpers/github-source-fixtures.mjs";
import { SourceAdapterError, validateGitHubSourceSnapshotV01 } from "../experience/source-v01/source-snapshot-validator.mjs";

const idsFor = item => item.expected.recordIds || [];
const limitsFor = item => ({ commits: idsFor(item).filter(id => id.includes(":commit:")).length, issues: idsFor(item).filter(id => id.includes(":issue:")).length, pullRequests: idsFor(item).filter(id => id.includes(":pr:")).length, releases: idsFor(item).filter(id => id.includes(":release:")).length, tags: idsFor(item).filter(id => id.includes(":tag:")).length });
const syntheticData = item => {
  const repository = item.id === "SS-P01" ? createRepositoryResponse({ fullName: "Synthetic/Example", name: "Example" }) : createRepositoryResponse({ fullName: "synthetic/example", name: "example" });
  const data = { repository, commits: [createCommit({ sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", message: "Synthetic commit" })], issues: [createIssue({ number: 1 })], pullRequests: [createPullRequest({ number: 2 })], releases: [createRelease({ immutableId: "release-1" })], tags: [createTag()] };
  if (item.id === "SS-G01") { data.repository.token = "catalog-secret-token"; data.repository.authorization = "Bearer catalog-secret"; data.repository.headers = { authorization: "Bearer catalog-secret" }; data.commits[0].authorEmail = "private@example.test"; data.commits[0].body = "catalog-commit-body"; data.issues[0].body = "catalog-issue-body"; data.issues[0].comments = [{ body: "catalog-comment" }]; data.pullRequests[0].body = "catalog-pr-body"; data.pullRequests[0].comments = [{ body: "catalog-comment" }]; data.pullRequests[0].reviews = [{ body: "catalog-review" }]; }
  if (item.id === "SS-G02") Object.assign(data.commits[0], { kind: "decision", lifecycle: { state: "active" }, verification: "confirmed", governance: { owner: "nobody" } });
  if (item.id === "SS-G04") data.issues = [];
  return data;
};
const makeInput = item => ({ repositoryRef: item.id === "SS-P01" ? "Synthetic/Example" : "synthetic/example", requestedLimits: item.id === "SS-G04" ? { commits: 0, issues: 1, pullRequests: 0, releases: 0, tags: 0 } : limitsFor(item), capturedAt: CAPTURED_AT });
const makeClient = (item, permuted = false) => {
  const client = createGitHubClientFixture(syntheticData(item));
  if (permuted) for (const method of ["listCommits", "listIssues", "listPullRequests", "listReleases", "listTags"]) { const original = client[method]; client[method] = async input => { const result = await original(input); return { ...result, items: [...result.items].reverse() }; }; }
  return client;
};

async function successCase(item) {
  const input = makeInput(item); const inputBefore = structuredClone(input); const client = makeClient(item); const rawBefore = structuredClone(client.fixtureResponses);
  if (item.id === "SS-G05") { const base = await client.listCommits({}); client.listCommits = async () => ({ items: base.items, pagesRead: 1, continuationAvailable: true }); }
  const firstSnapshot = await createGitHubSourceAdapter({ client }).readSnapshot(input);
  const secondClient = makeClient(item, ["SS-R07", "SS-C04"].includes(item.id)); const secondSnapshot = await createGitHubSourceAdapter({ client: secondClient }).readSnapshot(structuredClone(input));
  let orderProofFirst = null, orderProofSecond = null;
  if (["SS-R07", "SS-C04"].includes(item.id)) { const multi = syntheticData(item); multi.commits.push(createCommit({ sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", committedAt: "2026-08-05T10:00:00Z", message: "Second commit" })); multi.issues.push(createIssue({ number: 2, updatedAt: "2026-08-05T12:00:00Z" })); multi.pullRequests.push(createPullRequest({ number: 3, updatedAt: "2026-08-05T12:00:00Z", merged: false, state: "open", mergedAt: null, closedAt: null })); multi.releases.push(createRelease({ immutableId: "release-2", tagName: "v0.2.0", publishedAt: "2026-08-02T12:00:00Z" }), createRelease({ immutableId: "release-3", tagName: "v0.3.0", publishedAt: null })); multi.tags.push(createTag({ name: "v0.0.1", targetSha: "6".repeat(40) })); const multiInput = { repositoryRef: "synthetic/example", requestedLimits: { commits: 2, issues: 2, pullRequests: 2, releases: 3, tags: 2 }, capturedAt: CAPTURED_AT }; const normalClient = createGitHubClientFixture(multi); const permutedClient = createGitHubClientFixture(multi); for (const method of ["listCommits", "listIssues", "listPullRequests", "listReleases", "listTags"]) { const original = permutedClient[method]; permutedClient[method] = async value => { const result = await original(value); return { ...result, items: [...result.items].reverse() }; }; } orderProofFirst = await createGitHubSourceAdapter({ client: normalClient }).readSnapshot(multiInput); orderProofSecond = await createGitHubSourceAdapter({ client: permutedClient }).readSnapshot(multiInput); }
  return { snapshot: firstSnapshot, firstSnapshot, secondSnapshot, orderProofFirst, orderProofSecond, error: null, input, inputBefore, rawBefore, rawAfter: structuredClone(client.fixtureResponses), client };
}

async function errorCase(item) {
  const input = makeInput(item);
  if (["SS-P02", "SS-P03", "SS-P04", "SS-P05"].includes(item.id)) { const refs = { "SS-P02": "", "SS-P03": "https://github.com/a/b", "SS-P04": "a/b/issues", "SS-P05": "my project" }; return createGitHubSourceAdapter({ client: makeClient(item) }).readSnapshot({ ...input, repositoryRef: refs[item.id] }); }
  if (item.id === "SS-P06") return createGitHubSourceAdapter({ client: makeClient(item) }).readSnapshot({ ...input, requestedLimits: createRequestedLimits({ commits: -1 }) });
  if (item.id === "SS-P07") return createGitHubSourceAdapter({ client: makeClient(item) }).readSnapshot({ ...input, requestedLimits: createRequestedLimits({ commits: 21 }) });
  if (item.id === "SS-R09") { const client = makeClient(item); client.getDefaultBranch = async () => null; return createGitHubSourceAdapter({ client }).readSnapshot(input); }
  if (item.id === "SS-G06") { const client = makeClient(item); client.listIssues = async () => { throw new SourceAdapterError("SOURCE_UNAVAILABLE"); }; return createGitHubSourceAdapter({ client }).readSnapshot({ ...input, requestedLimits: createRequestedLimits({ issues: 1 }) }); }
  const base = await createGitHubSourceAdapter({ client: makeClient(item) }).readSnapshot({ ...input, requestedLimits: createRequestedLimits() }); const broken = structuredClone(base);
  if (item.id === "SS-S02") delete broken.snapshotVersion;
  if (item.id === "SS-S03") broken.snapshotVersion = "0.2";
  if (item.id === "SS-S04") broken.adapter = "GitHub";
  if (item.id === "SS-S05") broken.capturedAt = "2026-08-07";
  if (item.id === "SS-S06") delete broken.source;
  if (item.id === "SS-S07") broken.records = {};
  if (item.id === "SS-S08") delete broken.diagnostics.collections.tags;
  if (item.id === "SS-R02") broken.records.push(structuredClone(broken.records[0]));
  if (item.id === "SS-R03") broken.records[2].sourceType = "github_discussion";
  if (item.id === "SS-R04") broken.records[2].sourceRecordId = `github:commit:other/repo:${broken.records[2].payload.sha}`;
  if (item.id === "SS-C06") broken.records[0].payload.importPlan = { forbidden: true };
  return validateGitHubSourceSnapshotV01(broken);
}

const caseExecutors = {
  "SS-S01": successCase, "SS-S02": errorCase, "SS-S03": errorCase, "SS-S04": errorCase, "SS-S05": errorCase, "SS-S06": errorCase, "SS-S07": errorCase, "SS-S08": errorCase,
  "SS-P01": successCase, "SS-P02": errorCase, "SS-P03": errorCase, "SS-P04": errorCase, "SS-P05": errorCase, "SS-P06": errorCase, "SS-P07": errorCase,
  "SS-R01": successCase, "SS-R02": errorCase, "SS-R03": errorCase, "SS-R04": errorCase, "SS-R05": successCase, "SS-R06": successCase, "SS-R07": successCase, "SS-R08": successCase, "SS-R09": errorCase,
  "SS-G01": successCase, "SS-G02": successCase, "SS-G03": successCase, "SS-G04": successCase, "SS-G05": successCase, "SS-G06": errorCase,
  "SS-C01": successCase, "SS-C02": successCase, "SS-C03": successCase, "SS-C04": successCase, "SS-C05": successCase, "SS-C06": errorCase
};

const forbiddenKeys = new Set(["kind", "lifecycle", "verification", "freshness", "governance", "decisionStatus", "memoryStatus", "contextPackage", "canonicalGraph", "importPlan", "consentedRecordIds"]);
function assertNoForbiddenKeys(value) { if (Array.isArray(value)) return value.forEach(assertNoForbiddenKeys); if (value && typeof value === "object") { for (const [key, child] of Object.entries(value)) { assert(!forbiddenKeys.has(key), `forbidden canonical key: ${key}`); assertNoForbiddenKeys(child); } } }
const diagnosticsHandlers = {
  "valid bounded diagnostics; complete=true": ({ snapshot }) => assert.equal(snapshot.diagnostics.complete, true),
  "requested=applied limits; complete=true": ({ snapshot }) => { assert.equal(snapshot.diagnostics.complete, true); for (const item of Object.values(snapshot.diagnostics.collections)) assert.equal(item.requestedLimit, item.appliedLimit); },
  "valid bounded diagnostics": ({ snapshot }) => { assert.equal(snapshot.diagnostics.complete, true); assert(Object.values(snapshot.diagnostics.collections).every(item => item.requestedLimit === item.appliedLimit)); },
  "bounded capture with explicit scope": ({ snapshot }) => { assert.equal(snapshot.scope.type, "repository"); assert.equal(snapshot.diagnostics.complete, true); },
  "complete=true; truncated=true; continuationAvailable=true": ({ snapshot }) => { const item = snapshot.diagnostics.collections.commits; assert.equal(snapshot.diagnostics.complete, true); assert.equal(item.itemsRead, item.appliedLimit); assert.equal(item.truncated, true); assert.equal(item.continuationAvailable, true); },
  "identical bounded diagnostics": ({ firstSnapshot, secondSnapshot }) => assert.deepEqual(firstSnapshot.diagnostics, secondSnapshot.diagnostics)
};
const behaviorHandlers = {
  "deep-equal": ({ firstSnapshot, secondSnapshot }) => assert.deepEqual(firstSnapshot, secondSnapshot),
  "deeply-frozen": ({ snapshot }) => { assert(Object.isFrozen(snapshot)); assert(Object.isFrozen(snapshot.scope)); assert(Object.isFrozen(snapshot.records)); assert(Object.isFrozen(snapshot.diagnostics.collections)); },
  "input-unchanged": ({ input, inputBefore, rawBefore, rawAfter }) => { assert.deepEqual(input, inputBefore); assert.deepEqual(rawAfter, rawBefore); },
  "order-independent": ({ firstSnapshot, secondSnapshot, orderProofFirst, orderProofSecond }) => { assert.deepEqual(firstSnapshot, secondSnapshot); assert(orderProofFirst && orderProofSecond); assert.deepEqual(orderProofFirst, orderProofSecond); },
  "source-authority-only": ({ snapshot }) => assert(snapshot.records.every(record => record.authority.startsWith("github-"))),
  "no-sensitive-leak": ({ snapshot }) => { const serialized = JSON.stringify(snapshot); for (const value of ["catalog-secret-token", "Bearer catalog-secret", "private@example.test", "catalog-issue-body", "catalog-pr-body", "catalog-comment", "catalog-review"]) assert(!serialized.includes(value)); for (const key of ["authorEmail", "authorization", "token", "comments", "reviews"]) assert(!serialized.includes(`\"${key}\"`)); },
  "no-canonical-fields": ({ snapshot }) => { if (snapshot) assertNoForbiddenKeys(snapshot); },
  "stable-source-identity": ({ snapshot, error, expected }) => { if (!snapshot) { assert(error instanceof SourceAdapterError); assert.equal(error.code, expected.errorCode); return; } const ref = snapshot.scope.repositoryRef; for (const record of snapshot.records) { const expectedId = { repository: `github:repo:${ref}`, branch: `github:branch:${ref}:${record.payload.name}`, commit: `github:commit:${ref}:${record.payload.sha}`, issue: `github:issue:${ref}:${record.payload.number}`, pull_request: `github:pr:${ref}:${record.payload.number}`, release: `github:release:${ref}:${record.payload.immutableId}`, tag: `github:tag:${ref}:${record.payload.name}` }[record.sourceType]; assert.equal(record.sourceRecordId, expectedId); } },
  "source-time-preserved": ({ snapshot }) => { for (const record of snapshot.records) { const expectedAt = { repository: record.payload.updatedAt, branch: null, commit: record.payload.committedAt, issue: record.payload.updatedAt, pull_request: record.payload.updatedAt, release: record.payload.publishedAt ?? record.payload.createdAt, tag: null }[record.sourceType]; assert.equal(record.observedAt, expectedAt); } },
  "bounded-truncation-explicit": ({ snapshot }) => { assert.equal(snapshot.diagnostics.complete, true); for (const item of Object.values(snapshot.diagnostics.collections)) { assert.equal(item.requestedLimit, item.appliedLimit); if (item.truncated) { assert.equal(item.itemsRead, item.appliedLimit); assert.equal(item.continuationAvailable, true); } else assert.equal(item.continuationAvailable, false); } },
  "no-empty-error-snapshot": ({ snapshot, error, expected }) => { assert.equal(snapshot, null); assert(error instanceof SourceAdapterError); assert.equal(error.code, expected.errorCode); },
  "planner-boundary-preserved": ({ snapshot, error }) => { if (snapshot) assertNoForbiddenKeys(snapshot); else { assert(error instanceof SourceAdapterError); assert.equal(error.code, "SOURCE_SNAPSHOT_INVALID"); } }
};

function assertCatalogExpected(item, result) {
  const expected = item.expected;
  if (expected.outcome === "success") { assert.equal(result.error, null); assert(result.snapshot); assert.equal(result.snapshot.snapshotVersion, expected.snapshotVersion); assert.equal(result.snapshot.scope.repositoryRef, expected.repositoryRef || "synthetic/example"); assert.equal(result.snapshot.source.state, expected.sourceState); assert.deepEqual(result.snapshot.records.map(record => record.sourceRecordId), expected.recordIds); }
  else { assert.equal(result.snapshot, null); assert(result.error instanceof SourceAdapterError); assert.equal(result.error.code, expected.errorCode); assert.equal(expected.diagnostics, null); }
  if (expected.diagnostics) { assert(Object.hasOwn(diagnosticsHandlers, expected.diagnostics), `unknown diagnostics descriptor: ${expected.diagnostics}`); diagnosticsHandlers[expected.diagnostics](result); }
}

const catalogIds = catalog.cases.map(item => item.id);
test("catalog executor coverage is exact", () => assert.deepEqual(Object.keys(caseExecutors).sort(), catalogIds.sort()));
test("catalog behavior vocabulary and handlers are exact", () => assert.deepEqual(Object.keys(behaviorHandlers).sort(), catalog.behaviorAssertionVocabulary.slice().sort()));
test("catalog diagnostics descriptor vocabulary and handlers are exact", () => assert.deepEqual(Object.keys(diagnosticsHandlers).sort(), [...new Set(catalog.cases.map(item => item.expected.diagnostics).filter(Boolean))].sort()));
for (const item of catalog.cases) test(`catalog ${item.id}: ${item.category}`, async () => {
  let result = { snapshot: null, firstSnapshot: null, secondSnapshot: null, error: null, expected: item.expected };
  try { result = { ...result, ...(await caseExecutors[item.id](item)) }; } catch (error) { result.error = error; }
  assertCatalogExpected(item, result);
  for (const assertion of item.expected.behaviorAssertions) { assert(Object.hasOwn(behaviorHandlers, assertion), `unknown behavior assertion: ${assertion}`); behaviorHandlers[assertion]({ ...result, expected: item.expected }); }
});
