import assert from "node:assert/strict";
import test from "node:test";

import {
  createGitHubCommitRangeReader,
  GITHUB_COMMIT_RANGE_PROOF_VERSION_V01,
  GitHubCommitRangeProofError,
  validateGitHubCommitRangeProofV01,
} from "../experience/continuity-loop-v01/github-commit-range-proof.mjs";
import {
  buildFreshEvidenceWindowV01,
  FRESH_EVIDENCE_WINDOW_VERSION_V01,
  FreshEvidenceWindowError,
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
} from "../experience/continuity-loop-v01/fresh-evidence-window.mjs";
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import {
  createBranchResponse,
  createGitHubClientFixture,
  REF,
} from "./helpers/github-source-fixtures.mjs";

const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MID = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HEAD = "cccccccccccccccccccccccccccccccccccccccc";
const OTHER = "dddddddddddddddddddddddddddddddddddddddd";
const CURSOR_AT = "2026-09-14T14:49:33Z";
const OBSERVED_AT = "2026-09-14T15:00:00Z";
const clone = value => structuredClone(value);

function checkpoint(overrides = {}) {
  const cursor = {
    provider: "github",
    scopeRef: REF,
    cursorType: "default-branch-head",
    value: BASE,
    capturedAt: CURSOR_AT,
    ...(overrides.evidenceCursor ?? {}),
  };
  return {
    checkpointSchemaVersion: "nexus-atlas.trusted-checkpoint.v0.1",
    checkpointId: "checkpoint:phase6c-fixture",
    projectRef: "project:nexus-atlas",
    version: 1,
    createdAt: "2026-09-14T14:50:00Z",
    trustedDirection: "Prove the real continuity loop before semantic assessment.",
    activeObjective: "Build a bounded fresh evidence window.",
    acceptedNextAction: {
      actionRef: "phase6c:fresh-evidence-window",
      summary: "Collect and prove the checkpoint-to-head evidence interval.",
      basisRefs: ["docs:Nexus-Atlas-v0.1-Fresh-Evidence-Window-Contract"],
    },
    evidenceCursor: cursor,
    governingRefs: ["docs:Nexus-Atlas-v0.1-Real-Continuity-Loop-Contract"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-atlas",
      authority: "human-confirmed-checkpoint",
      references: ["initial-alignment:phase6c-fixture"],
    },
    confirmation: {
      state: "confirmed",
      authority: "human",
      actorRef: "human:cyrilla",
      confirmedAt: "2026-09-14T14:50:00Z",
      basisRef: "initial-alignment:phase6c-fixture",
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "evidenceCursor")),
  };
}

function policy(overrides = {}) {
  return {
    policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
    projectRef: "project:nexus-atlas",
    repositoryRef: REF,
    maxCommitRange: 20,
    ...overrides,
  };
}

async function snapshot(headSha = HEAD, capturedAt = OBSERVED_AT) {
  const client = createGitHubClientFixture({ branch: createBranchResponse({ headSha }) });
  const adapter = createGitHubSourceAdapter({ client });
  return adapter.readSnapshot({
    repositoryRef: REF,
    capturedAt,
    requestedLimits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 },
  });
}

function providerCommit(sha, committedAt = "2026-09-14T14:58:00Z", overrides = {}) {
  return {
    sha,
    authoredAt: "2026-09-14T14:57:00Z",
    committedAt,
    messageHeadline: `Commit ${sha.slice(0, 6)}`,
    ...overrides,
  };
}

function readerFor(response, calls = []) {
  return createGitHubCommitRangeReader({
    client: {
      async compareCommits(input) {
        calls.push(clone(input));
        return clone(response);
      },
    },
  });
}

async function proof({
  baseSha = BASE,
  headSha = HEAD,
  capturedAt = OBSERVED_AT,
  limit = 20,
  relation = "ahead",
  aheadBy = 2,
  behindBy = 0,
  commits = [providerCommit(MID, "2026-09-14T14:59:30Z"), providerCommit(HEAD, "2026-09-14T14:58:00Z")],
  continuationAvailable = false,
} = {}) {
  return readerFor({ relation, aheadBy, behindBy, commits, continuationAvailable }).readCommitRange({ repositoryRef: REF, baseSha, headSha, capturedAt, limit });
}

test("6C-A01 normalizes the accepted repository boundary but requires caller-normalized scope", async () => {
  const reader = readerFor({ relation: "identical", aheadBy: 0, behindBy: 0, commits: [], continuationAvailable: false });
  await assert.rejects(reader.readCommitRange({ repositoryRef: "Cyrilla-Mist/Nexus-AI", baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 20 }), error => error instanceof GitHubCommitRangeProofError && error.code === "INVALID_COMMIT_RANGE_INPUT");
});

test("6C-A02 rejects malformed repository refs, SHAs, timestamps and limits", async () => {
  const reader = readerFor({ relation: "identical", aheadBy: 0, behindBy: 0, commits: [], continuationAvailable: false });
  for (const input of [
    { repositoryRef: "https://github.com/x/y", baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 20 },
    { repositoryRef: REF, baseSha: BASE.toUpperCase(), headSha: BASE, capturedAt: OBSERVED_AT, limit: 20 },
    { repositoryRef: REF, baseSha: BASE, headSha: "abc", capturedAt: OBSERVED_AT, limit: 20 },
    { repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: "not-time", limit: 20 },
    { repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 0 },
    { repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 21 },
  ]) await assert.rejects(reader.readCommitRange(input), error => error.code === "INVALID_COMMIT_RANGE_INPUT");
});

test("6C-A03 requires an injected read-only compare client", () => {
  assert.throws(() => createGitHubCommitRangeReader({ client: {} }), error => error.code === "INVALID_COMMIT_RANGE_OPTIONS");
});

test("6C-A04 rejects provider field drift, duplicate SHAs and unsafe headlines", async () => {
  const baseResponse = { relation: "ahead", aheadBy: 1, behindBy: 0, commits: [providerCommit(HEAD)], continuationAvailable: false };
  await assert.rejects(readerFor({ ...baseResponse, extra: true }).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: HEAD, capturedAt: OBSERVED_AT, limit: 20 }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
  await assert.rejects(readerFor({ ...baseResponse, aheadBy: 2, commits: [providerCommit(HEAD), providerCommit(HEAD)] }).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: HEAD, capturedAt: OBSERVED_AT, limit: 20 }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
  await assert.rejects(readerFor({ ...baseResponse, commits: [providerCommit(HEAD, undefined, { messageHeadline: "unsafe\nbody" })] }).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: HEAD, capturedAt: OBSERVED_AT, limit: 20 }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
});

test("6C-B01 identical proof is complete, empty and deterministic", async () => {
  const response = { relation: "identical", aheadBy: 0, behindBy: 0, commits: [], continuationAvailable: false };
  const first = await readerFor(response).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 20 });
  const second = await readerFor(response).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 20 });
  assert.equal(first.proofVersion, GITHUB_COMMIT_RANGE_PROOF_VERSION_V01);
  assert.equal(first.complete, true);
  assert.deepEqual(first.commits, []);
  assert.equal(first.diagnostics.continuationAvailable, false);
  assert.equal(first.proofId, second.proofId);
});

test("6C-B02 rejects inconsistent identical/ahead/behind/diverged counters", async () => {
  const cases = [
    { relation: "identical", aheadBy: 1, behindBy: 0, commits: [], continuationAvailable: false, baseSha: BASE, headSha: BASE },
    { relation: "ahead", aheadBy: 0, behindBy: 0, commits: [], continuationAvailable: false },
    { relation: "behind", aheadBy: 1, behindBy: 1, commits: [], continuationAvailable: false },
    { relation: "diverged", aheadBy: 1, behindBy: 0, commits: [providerCommit(HEAD)], continuationAvailable: false },
  ];
  for (const item of cases) {
    const { baseSha = BASE, headSha = HEAD, ...response } = item;
    await assert.rejects(readerFor(response).readCommitRange({ repositoryRef: REF, baseSha, headSha, capturedAt: OBSERVED_AT, limit: 20 }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
  }
});

test("6C-B03 behind proof exposes no head-side commits", async () => {
  const value = await proof({ relation: "behind", aheadBy: 0, behindBy: 2, commits: [] });
  assert.equal(value.complete, true);
  assert.equal(value.relation, "behind");
  assert.deepEqual(value.commits, []);
});

test("6C-B04 complete ahead/diverged ranges contain exactly aheadBy commits and terminate at head", async () => {
  const ahead = await proof();
  const diverged = await proof({ relation: "diverged", aheadBy: 2, behindBy: 3 });
  assert.equal(ahead.commits.length, 2);
  assert.equal(diverged.commits.length, 2);
  assert.equal(ahead.commits.at(-1).payload.sha, HEAD);
  assert.equal(diverged.commits.at(-1).payload.sha, HEAD);
  await assert.rejects(proof({ commits: [providerCommit(MID), providerCommit(OTHER)] }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
});

test("6C-B05 bounded overflow is explicitly incomplete and preserves continuation", async () => {
  const value = await proof({ limit: 2, aheadBy: 3, commits: [providerCommit(MID), providerCommit(OTHER)], continuationAvailable: true });
  assert.equal(value.complete, false);
  assert.deepEqual(value.diagnostics, { requestedLimit: 2, itemsRead: 2, continuationAvailable: true });
});

test("6C-B06 ancestry order is preserved even when timestamps are non-monotonic", async () => {
  const first = providerCommit(MID, "2026-09-14T15:00:00Z");
  const second = providerCommit(HEAD, "2026-09-14T14:00:00Z");
  const value = await proof({ commits: [first, second] });
  assert.deepEqual(value.commits.map(record => record.payload.sha), [MID, HEAD]);
});

test("6C-B07 proof output is deeply immutable and does not mutate provider input", async () => {
  const raw = { relation: "ahead", aheadBy: 1, behindBy: 0, commits: [providerCommit(HEAD)], continuationAvailable: false };
  const before = clone(raw);
  const value = await readerFor(raw).readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: HEAD, capturedAt: OBSERVED_AT, limit: 20 });
  assert.deepEqual(raw, before);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.commits[0].payload), true);
  assert.throws(() => { value.commits[0].payload.sha = OTHER; }, TypeError);
});

test("6C-B08 proof validator detects identity tampering", async () => {
  const value = await proof();
  const changed = clone(value);
  changed.proofId = "github-range:tampered";
  assert.throws(() => validateGitHubCommitRangeProofV01(changed), error => error.code === "INVALID_COMMIT_RANGE_PROOF");
});

test("6C-B09 reader calls only compareCommits with bounded safe arguments", async () => {
  const calls = [];
  const reader = readerFor({ relation: "identical", aheadBy: 0, behindBy: 0, commits: [], continuationAvailable: false }, calls);
  await reader.readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: BASE, capturedAt: OBSERVED_AT, limit: 7 });
  assert.deepEqual(calls, [{ repositoryRef: REF, baseSha: BASE, headSha: BASE, limit: 7 }]);
});

test("6C-C01 identical head creates a complete zero-change window without a range proof", async () => {
  const sourceSnapshot = await snapshot(BASE);
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot, requiredEvidencePolicy: policy() });
  assert.equal(value.windowVersion, FRESH_EVIDENCE_WINDOW_VERSION_V01);
  assert.equal(value.status, "complete");
  assert.equal(value.lineage, "identical");
  assert.equal(value.blockedReason, null);
  assert.equal(value.capabilities.assessmentAllowed, true);
  assert.equal(value.records.filter(record => record.sourceType === "commit").length, 0);
});

test("6C-C02 policy project/repository/cursor scope mismatch blocks without semantic promotion", async () => {
  const sourceSnapshot = await snapshot();
  for (const [cp, p] of [
    [checkpoint({ projectRef: "project:other" }), policy()],
    [checkpoint({ evidenceCursor: { scopeRef: "cyrilla-mist/other" } }), policy()],
    [checkpoint(), policy({ repositoryRef: "cyrilla-mist/other" })],
  ]) {
    const value = buildFreshEvidenceWindowV01({ checkpoint: cp, sourceSnapshot, requiredEvidencePolicy: p });
    assert.equal(value.status, "blocked");
    assert.equal(value.blockedReason, "evidence-scope-violation");
    assert.equal(value.capabilities.assessmentAllowed, false);
  }
});

test("6C-C03 unsupported cursor provider/type fails contract validation instead of guessing", async () => {
  const sourceSnapshot = await snapshot();
  assert.throws(() => buildFreshEvidenceWindowV01({ checkpoint: checkpoint({ evidenceCursor: { provider: "gitlab" } }), sourceSnapshot, requiredEvidencePolicy: policy() }), error => error instanceof FreshEvidenceWindowError && error.code === "UNSUPPORTED_EVIDENCE_CURSOR");
  assert.throws(() => buildFreshEvidenceWindowV01({ checkpoint: checkpoint({ evidenceCursor: { cursorType: "timestamp" } }), sourceSnapshot, requiredEvidencePolicy: policy() }), error => error.code === "UNSUPPORTED_EVIDENCE_CURSOR");
});

test("6C-C04 snapshot capture must be strictly newer than checkpoint cursor", async () => {
  const sourceSnapshot = await snapshot(HEAD, CURSOR_AT);
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot, requiredEvidencePolicy: policy() });
  assert.equal(value.status, "blocked");
  assert.equal(value.blockedReason, "required-evidence-missing");
});

test("6C-D01 changed head without proof blocks as required-evidence-missing", async () => {
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), requiredEvidencePolicy: policy() });
  assert.equal(value.status, "blocked");
  assert.equal(value.blockedReason, "required-evidence-missing");
  assert.equal(value.capabilities.assessmentAllowed, false);
});

test("6C-D02 proof base/head/capture binding mismatch blocks as evidence-invalid", async () => {
  const sourceSnapshot = await snapshot();
  const values = [
    await proof({ baseSha: OTHER }),
    await proof({ headSha: OTHER, commits: [providerCommit(MID), providerCommit(OTHER)] }),
    await proof({ capturedAt: "2026-09-14T15:00:01Z" }),
  ];
  for (const commitRangeProof of values) {
    const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot, commitRangeProof, requiredEvidencePolicy: policy() });
    assert.equal(value.status, "blocked");
    assert.equal(value.blockedReason, "evidence-invalid");
  }
});

test("6C-D03 malformed proof blocks as evidence-invalid", async () => {
  const commitRangeProof = clone(await proof());
  commitRangeProof.proofId = "github-range:bad";
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy() });
  assert.equal(value.blockedReason, "evidence-invalid");
});

test("6C-D04 incomplete proof blocks as evidence-window-incomplete", async () => {
  const commitRangeProof = await proof({ limit: 2, aheadBy: 3, commits: [providerCommit(MID), providerCommit(OTHER)], continuationAvailable: true });
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy() });
  assert.equal(value.status, "blocked");
  assert.equal(value.blockedReason, "evidence-window-incomplete");
  assert.equal(value.lineage, "ahead");
  assert.equal(value.capabilities.assessmentAllowed, false);
});

test("6C-D05 complete ahead proof produces complete evidence in ancestry order", async () => {
  const commitRangeProof = await proof();
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy() });
  assert.equal(value.status, "complete");
  assert.equal(value.lineage, "ahead");
  assert.equal(value.capabilities.assessmentAllowed, true);
  assert.deepEqual(value.records.filter(record => record.sourceType === "commit").map(record => record.payload.sha), [MID, HEAD]);
});

test("6C-D06 complete behind proof is evidence-complete but not continuity-promoted", async () => {
  const commitRangeProof = await proof({ relation: "behind", aheadBy: 0, behindBy: 2, commits: [] });
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy() });
  assert.equal(value.status, "complete");
  assert.equal(value.lineage, "behind");
  assert.equal(value.capabilities.assessmentAllowed, true);
  assert.equal("validity" in value, false);
});

test("6C-D07 complete diverged proof produces complete current head-side range", async () => {
  const commitRangeProof = await proof({ relation: "diverged", aheadBy: 2, behindBy: 1 });
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy() });
  assert.equal(value.status, "complete");
  assert.equal(value.lineage, "diverged");
  assert.equal(value.records.filter(record => record.sourceType === "commit").length, 2);
});

test("6C-D08 proof range cannot exceed policy maxCommitRange", async () => {
  const commitRangeProof = await proof({ limit: 2 });
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof, requiredEvidencePolicy: policy({ maxCommitRange: 1 }) });
  assert.equal(value.blockedReason, "evidence-invalid");
});

test("6C-E01 window projects only repository, branch and bounded commit evidence", async () => {
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof: await proof(), requiredEvidencePolicy: policy() });
  assert.deepEqual(value.records.map(record => record.sourceType), ["repository", "branch", "commit", "commit"]);
  assert.equal(value.records[0].authority, "github-repository-state");
  assert.equal(value.records[1].authority, "github-ref-state");
  assert.equal(value.records[2].authority, "github-commit-state");
});

test("6C-E02 provider private/body/comment/review/authorEmail fields are rejected and never projected", async () => {
  const unsafe = providerCommit(HEAD);
  unsafe.authorEmail = "private@example.test";
  await assert.rejects(proof({ aheadBy: 1, commits: [unsafe] }), error => error.code === "INVALID_COMMIT_RANGE_RESPONSE");
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof: await proof(), requiredEvidencePolicy: policy() });
  const serialized = JSON.stringify(value);
  for (const forbidden of ["token", "credential", "authorEmail", "comments", "reviews", "body"]) assert.equal(serialized.includes(`\"${forbidden}\"`), false);
});

test("6C-E03 source-local authority is never promoted to human/canonical authority", async () => {
  const value = buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: await snapshot(), commitRangeProof: await proof(), requiredEvidencePolicy: policy() });
  assert.equal(value.records.every(record => record.authority.startsWith("github-")), true);
  assert.equal(JSON.stringify(value.records).includes("human"), false);
  assert.equal(JSON.stringify(value.records).includes("canonical"), false);
});

test("6C-E04 builder leaves all caller inputs unchanged", async () => {
  const cp = checkpoint();
  const sourceSnapshot = await snapshot();
  const commitRangeProof = await proof();
  const requiredEvidencePolicy = policy();
  const before = [clone(cp), clone(sourceSnapshot), clone(commitRangeProof), clone(requiredEvidencePolicy)];
  buildFreshEvidenceWindowV01({ checkpoint: cp, sourceSnapshot, commitRangeProof, requiredEvidencePolicy });
  assert.deepEqual([cp, sourceSnapshot, commitRangeProof, requiredEvidencePolicy], before);
});

test("6C-E05 accepted window is deeply immutable and deterministic", async () => {
  const sourceSnapshot = await snapshot();
  const commitRangeProof = await proof();
  const input = { checkpoint: checkpoint(), sourceSnapshot, commitRangeProof, requiredEvidencePolicy: policy() };
  const first = buildFreshEvidenceWindowV01(input);
  const second = buildFreshEvidenceWindowV01(input);
  assert.equal(first.windowId, second.windowId);
  assert.deepEqual(first.records, second.records);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.records[0].payload), true);
  assert.throws(() => { first.records[0].payload.name = "changed"; }, TypeError);
});

test("6C-E06 invalid accepted validators fail closed before a window is built", async () => {
  const invalidCheckpoint = checkpoint();
  invalidCheckpoint.version = 0;
  const sourceSnapshot = await snapshot();
  assert.throws(() => buildFreshEvidenceWindowV01({ checkpoint: invalidCheckpoint, sourceSnapshot, requiredEvidencePolicy: policy() }), error => error.code === "INVALID_TRUSTED_CHECKPOINT");
  assert.throws(() => buildFreshEvidenceWindowV01({ checkpoint: checkpoint(), sourceSnapshot: { bad: true }, requiredEvidencePolicy: policy() }), error => error.code === "INVALID_SOURCE_SNAPSHOT");
});
