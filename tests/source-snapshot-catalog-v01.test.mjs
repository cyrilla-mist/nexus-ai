import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../examples/nexus-atlas-source-snapshot-cases-v0.1.json" with { type: "json" };
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import { createGitHubClientFixture, createRequestedLimits, createRepositoryResponse, createCommit, createIssue, createPullRequest, createRelease, createTag, CAPTURED_AT } from "./helpers/github-source-fixtures.mjs";
import { SourceAdapterError, validateGitHubSourceSnapshotV01, validateSourceSnapshotV01 } from "../experience/source-v01/source-snapshot-validator.mjs";

const vocabulary = new Set(catalog.behaviorAssertionVocabulary);
const idsFor = item => item.expected.recordIds || [];
const limitsFor = item => ({ commits: idsFor(item).filter(id => id.includes(":commit:")).length, issues: idsFor(item).filter(id => id.includes(":issue:")).length, pullRequests: idsFor(item).filter(id => id.includes(":pr:")).length, releases: idsFor(item).filter(id => id.includes(":release:")).length, tags: idsFor(item).filter(id => id.includes(":tag:")).length });
const synthetic = () => ({ repository: createRepositoryResponse({ fullName: "synthetic/example", name: "example" }), commits: [createCommit({ sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", message: "Synthetic commit" })], issues: [createIssue({ number: 1 })], pullRequests: [createPullRequest({ number: 2 })], releases: [createRelease({ immutableId: "release-1" })], tags: [createTag()] });
const makeClient = () => createGitHubClientFixture(synthetic());
const makeInput = item => ({ repositoryRef: "synthetic/example", requestedLimits: limitsFor(item), capturedAt: CAPTURED_AT });

async function executeCase(item) {
  const expected = item.expected;
  if (expected.outcome === "success") {
    const client = makeClient();
    if (item.id === "SS-G05") { const base = await client.listCommits({}); client.listCommits = async () => ({ items: base.items, pagesRead: 1, continuationAvailable: true }); }
    const input = makeInput(item); if (["SS-R07", "SS-C04"].includes(item.id)) { const original = client.listCommits; client.listCommits = async value => { const result = await original(value); return { ...result, items: [...result.items].reverse() }; }; } return { snapshot: await createGitHubSourceAdapter({ client }).readSnapshot(input), input, client };
  }
  if (["SS-S02", "SS-S03", "SS-S04", "SS-S06", "SS-S07", "SS-S08", "SS-R02", "SS-R03", "SS-R04", "SS-C06"].includes(item.id)) {
    const base = await createGitHubSourceAdapter({ client: makeClient() }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT });
    const broken = structuredClone(base);
    if (item.id === "SS-S02") delete broken.snapshotVersion;
    if (item.id === "SS-S03") broken.snapshotVersion = "0.2";
    if (item.id === "SS-S04") broken.adapter = "GitHub";
    if (item.id === "SS-S06") delete broken.source;
    if (item.id === "SS-S07") broken.records = {};
    if (item.id === "SS-S08") delete broken.diagnostics.collections.tags;
    if (item.id === "SS-R02") broken.records.push(structuredClone(broken.records[0]));
    if (item.id === "SS-R03") broken.records[2].sourceType = "github_discussion";
    if (item.id === "SS-R04") broken.records[2].sourceRecordId = `github:commit:other/repo:${broken.records[2].payload.sha}`;
    if (item.id === "SS-C06") broken.records[0].payload.importPlan = { forbidden: true };
    validateGitHubSourceSnapshotV01(broken);
  }
  if (item.id === "SS-S05") return validateGitHubSourceSnapshotV01({ ...(await createGitHubSourceAdapter({ client: makeClient() }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT })), capturedAt: "2026-08-07" });
  if (["SS-P02", "SS-P03", "SS-P04", "SS-P05"].includes(item.id)) { const refs = { "SS-P02": "", "SS-P03": "https://github.com/a/b", "SS-P04": "a/b/issues", "SS-P05": "my project" }; return createGitHubSourceAdapter({ client: makeClient() }).readSnapshot({ repositoryRef: refs[item.id], requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT }); }
  if (item.id === "SS-P06") return createGitHubSourceAdapter({ client: makeClient() }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits({ commits: -1 }), capturedAt: CAPTURED_AT });
  if (item.id === "SS-P07") return createGitHubSourceAdapter({ client: makeClient() }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits({ commits: 21 }), capturedAt: CAPTURED_AT });
  if (item.id === "SS-R09") { const client = makeClient(); client.getDefaultBranch = async () => null; return createGitHubSourceAdapter({ client }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT }); }
  if (item.id === "SS-G06") { const client = makeClient(); client.listIssues = async () => { throw new Error("unavailable"); }; return createGitHubSourceAdapter({ client }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT }); }
  throw new Error(`unhandled catalog case ${item.id}`);
}

const behaviorHandlers = {
  "deep-equal": ({ snapshot, expected }) => { assert.deepEqual(snapshot.records.map(record => record.sourceRecordId), expected.recordIds); },
  "deeply-frozen": ({ snapshot }) => { assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.scope) && Object.isFrozen(snapshot.records) && Object.isFrozen(snapshot.diagnostics.collections)); },
  "input-unchanged": ({ input }) => { assert.deepEqual(input, { repositoryRef: "synthetic/example", requestedLimits: input.requestedLimits, capturedAt: CAPTURED_AT }); },
  "order-independent": ({ snapshot, expected }) => { assert.deepEqual(snapshot.records.map(record => record.sourceRecordId), expected.recordIds); },
  "source-authority-only": ({ snapshot }) => { assert(snapshot.records.every(record => record.authority.startsWith("github-"))); },
  "no-sensitive-leak": ({ snapshot }) => { const text = JSON.stringify(snapshot); assert(!/(authorEmail|private|token|authorization|body|comments|reviews)/i.test(text)); },
  "no-canonical-fields": ({ snapshot }) => { assert(!/("kind"|"lifecycle"|"verification"|"importPlan)/.test(JSON.stringify(snapshot))); },
  "stable-source-identity": ({ snapshot, error }) => { if (snapshot) assert.equal(new Set(snapshot.records.map(record => record.sourceRecordId)).size, snapshot.records.length); else assert(error instanceof SourceAdapterError); },
  "source-time-preserved": ({ snapshot }) => { assert(snapshot.records.filter(record => record.sourceType === "commit").every(record => record.observedAt === record.payload.committedAt)); },
  "bounded-truncation-explicit": ({ snapshot }) => { assert.equal(snapshot.diagnostics.complete, true); for (const item of Object.values(snapshot.diagnostics.collections)) if (item.truncated) assert.equal(item.continuationAvailable, true); },
  "no-empty-error-snapshot": ({ error }) => { assert(error instanceof SourceAdapterError); },
  "planner-boundary-preserved": ({ snapshot }) => { if (snapshot) assert(!JSON.stringify(snapshot).includes("importPlan")); }
};

test("catalog behavior vocabulary and handlers are exact", () => { assert.deepEqual([...new Set(Object.keys(behaviorHandlers))].sort(), [...vocabulary].sort()); });
for (const item of catalog.cases) test(`catalog ${item.id}: ${item.category}`, async () => {
  const expected = item.expected; let result = { snapshot: null, error: null, input: null, expected };
  try { const output = await executeCase(item); result = { ...result, ...output }; } catch (error) { result.error = error; }
  if (expected.outcome === "success") { assert.equal(result.error, null, item.id); assert.equal(result.snapshot.snapshotVersion, expected.snapshotVersion); assert.equal(result.snapshot.scope.repositoryRef, expected.repositoryRef || "synthetic/example"); assert.equal(result.snapshot.source.state, expected.sourceState); assert.deepEqual(result.snapshot.records.map(record => record.sourceRecordId), expected.recordIds); if (item.id === "SS-G05") { assert.equal(result.snapshot.diagnostics.complete, true); assert.equal(result.snapshot.diagnostics.collections.commits.truncated, true); assert.equal(result.snapshot.diagnostics.collections.commits.continuationAvailable, true); } } else { assert.equal(result.error?.code, expected.errorCode, item.id); assert(result.error instanceof SourceAdapterError); }
  for (const assertion of expected.behaviorAssertions) { if (!behaviorHandlers[assertion]) throw new Error(`unknown behavior assertion ${assertion}`); behaviorHandlers[assertion]({ ...result, expected }); }
});
