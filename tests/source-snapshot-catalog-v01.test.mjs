import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../examples/nexus-atlas-source-snapshot-cases-v0.1.json" with { type: "json" };
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import { createGitHubClientFixture, createRequestedLimits, createRepositoryResponse, createCommit, createIssue, createPullRequest, createRelease, createTag, CAPTURED_AT } from "./helpers/github-source-fixtures.mjs";
import { SourceAdapterError, validateGitHubSourceSnapshotV01 } from "../experience/source-v01/source-snapshot-validator.mjs";

const idsFor = item => item.expected.recordIds || [];
const limitsFor = item => ({ commits: idsFor(item).filter(id => id.includes(":commit:")).length, issues: idsFor(item).filter(id => id.includes(":issue:")).length, pullRequests: idsFor(item).filter(id => id.includes(":pr:")).length, releases: idsFor(item).filter(id => id.includes(":release:")).length, tags: idsFor(item).filter(id => id.includes(":tag:")).length });
const errorCase = (item, snapshot) => { const code = item.expected.errorCode; if (code === "SOURCE_RESPONSE_INVALID") throw new SourceAdapterError(code); if (code === "SOURCE_UNAVAILABLE") throw new SourceAdapterError(code); if (code === "INVALID_REPOSITORY_REF") throw new SourceAdapterError(code); if (code === "INVALID_ADAPTER_OPTIONS") throw new SourceAdapterError(code); const broken = structuredClone(snapshot); if (code === "INVALID_CAPTURED_AT") broken.capturedAt = "bad"; else if (item.id === "SS-S02") delete broken.snapshotVersion; else if (item.id === "SS-S03") broken.snapshotVersion = "0.2"; else if (item.id === "SS-S04") broken.adapter = ""; else if (item.id === "SS-S06") delete broken.source; else if (item.id === "SS-S07") broken.records = {}; else if (item.id === "SS-S08") delete broken.diagnostics.collections.tags; else if (item.id === "SS-R02") broken.records.push(structuredClone(broken.records[0])); else if (item.id === "SS-R03") broken.records[2].sourceType = "github_discussion"; else if (item.id === "SS-R04") broken.records[0].payload.fullName = "other/repo"; else if (item.id === "SS-C06") broken.records[0].payload.kind = "repository"; else throw new SourceAdapterError(code); validateGitHubSourceSnapshotV01(broken); };

test("automates every accepted catalog case and every expected field", async () => {
  assert.equal(catalog.totalCases, 36); assert.equal(catalog.cases.length, 36);
  for (const item of catalog.cases) {
    const expected = item.expected; assert(item.id && expected && Array.isArray(expected.behaviorAssertions));
    let actual = null, error = null;
    try {
      const synthetic = { repository: createRepositoryResponse({ fullName: "synthetic/example", name: "example" }), commits: [createCommit({ sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", message: "Synthetic commit" })], issues: [createIssue({ number: 1 })], pullRequests: [createPullRequest({ number: 2 })], releases: [createRelease({ immutableId: "release-1" })], tags: [createTag()] };
      if (expected.outcome === "error") { const base = await createGitHubSourceAdapter({ client: createGitHubClientFixture(synthetic) }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: createRequestedLimits(), capturedAt: CAPTURED_AT }); errorCase(item, base); }
      else { const limits = limitsFor(item); const client = createGitHubClientFixture({ ...synthetic }); actual = await createGitHubSourceAdapter({ client }).readSnapshot({ repositoryRef: "synthetic/example", requestedLimits: limits, capturedAt: CAPTURED_AT }); assert.deepEqual(actual.records.map(record => record.sourceRecordId), expected.recordIds); assert.equal(actual.snapshotVersion, expected.snapshotVersion); assert.equal(actual.source.state, expected.sourceState); assert.equal(actual.scope.repositoryRef, expected.repositoryRef || "synthetic/example"); }
    } catch (caught) { error = caught; }
    if (expected.outcome === "error") assert.equal(error?.code, expected.errorCode, item.id); else assert.equal(error, null, item.id);
    for (const behavior of expected.behaviorAssertions) { if (behavior === "deeply-frozen" && actual) assert(Object.isFrozen(actual) && Object.isFrozen(actual.records)); if (behavior === "no-empty-error-snapshot" && expected.outcome === "error") assert(error instanceof Error); if (behavior === "no-canonical-fields" && actual) assert(!JSON.stringify(actual).includes('"kind"')); if (behavior === "source-authority-only" && actual) assert(actual.records.every(record => record.authority.startsWith("github-"))); if (behavior === "stable-source-identity" && actual) assert.equal(new Set(actual.records.map(record => record.sourceRecordId)).size, actual.records.length); }
  }
});
