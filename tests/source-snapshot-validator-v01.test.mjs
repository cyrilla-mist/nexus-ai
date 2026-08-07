import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRepositoryRefV01, SourceAdapterError, validateSourceSnapshotV01, validateGitHubSourceSnapshotV01 } from "../experience/source-v01/source-snapshot-validator.mjs";
import example from "../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };

const code = (fn, expected) => assert.throws(fn, error => error instanceof SourceAdapterError && error.code === expected);
test("valid accepted GitHub snapshot is immutable and unchanged", () => { const input = structuredClone(example.snapshot); const output = validateGitHubSourceSnapshotV01(input); assert.deepEqual(output, input); assert.notEqual(output, input); assert(Object.isFrozen(output) && Object.isFrozen(output.records.at(0).payload)); assert.deepEqual(input, example.snapshot); });
test("repository reference normalization is lexical and deterministic", () => { assert.equal(normalizeRepositoryRefV01(" Cyrilla-Mist/Nexus-AI "), "cyrilla-mist/nexus-ai"); for (const value of ["", "owner", "owner/repo/issues", "https://github.com/a/b", "a/b?x", "a/b#x", "a\\b/c", "a/../b"]) code(() => normalizeRepositoryRefV01(value), "INVALID_REPOSITORY_REF"); });
for (const [name, mutate, expected] of [
  ["wrong version", s => { s.snapshotVersion = "0.2"; }, "SOURCE_SNAPSHOT_INVALID"],
  ["bad capturedAt", s => { s.capturedAt = "2026-08-07"; }, "INVALID_CAPTURED_AT"],
  ["extra top-level", s => { s.extra = true; }, "SOURCE_SNAPSHOT_INVALID"],
  ["extra record field", s => { s.records[0].extra = true; }, "SOURCE_SNAPSHOT_INVALID"],
  ["canonical record field", s => { s.records[0].payload.kind = "repository"; }, "SOURCE_SNAPSHOT_INVALID"],
  ["duplicate id", s => { s.records[1].sourceRecordId = s.records[0].sourceRecordId; }, "SOURCE_SNAPSHOT_INVALID"],
  ["missing repository singleton", s => { s.records = s.records.slice(1); }, "SOURCE_SNAPSHOT_INVALID"],
  ["invalid branch sha", s => { s.records[1].payload.headSha = "bad"; }, "SOURCE_SNAPSHOT_INVALID"],
  ["scope mismatch", s => { s.records[0].payload.fullName = "other/repo"; }, "SOURCE_SCOPE_MISMATCH"],
  ["bad diagnostics", s => { s.diagnostics.collections.commits.itemsRead = 0; }, "SOURCE_SNAPSHOT_INVALID"],
  ["bad source state", s => { s.source.state = "unavailable"; }, "SOURCE_SNAPSHOT_INVALID"],
  ["bad order", s => { s.records.reverse(); }, "SOURCE_SNAPSHOT_INVALID"]
]) test(`rejects ${name}`, () => { const input = structuredClone(example.snapshot); mutate(input); code(() => validateGitHubSourceSnapshotV01(input), expected); });

const valid = () => structuredClone(example.snapshot);
const validatorCases = [
  ["adapter github", s => { s.adapter = "github"; }, true], ["adapter github-enterprise", s => { s.adapter = "github-enterprise"; }, true], ["adapter github2", s => { s.adapter = "github2"; }, true],
  ["adapter uppercase", s => { s.adapter = "GitHub"; }, false], ["adapter leading hyphen", s => { s.adapter = "-github"; }, false], ["adapter underscore", s => { s.adapter = "github_"; }, false], ["adapter dotted", s => { s.adapter = "github.adapter"; }, false], ["adapter empty", s => { s.adapter = ""; }, false],
  ["Z timestamp", s => { s.capturedAt = "2026-08-07T12:00:00Z"; }, true], ["positive offset timestamp", s => { s.capturedAt = "2026-08-07T20:00:00+08:00"; }, true], ["negative offset timestamp", s => { s.capturedAt = "2026-08-07T04:00:00-08:00"; }, true], ["fractional offset timestamp", s => { s.capturedAt = "2026-08-07T20:00:00.123+08:00"; }, true],
  ["date only timestamp", s => { s.capturedAt = "2026-08-07"; }, false], ["timestamp without offset", s => { s.capturedAt = "2026-08-07T12:00:00"; }, false], ["Date object timestamp", s => { s.capturedAt = new Date(); }, false], ["numeric timestamp", s => { s.capturedAt = 1; }, false], ["invalid calendar timestamp", s => { s.capturedAt = "2026-02-31T12:00:00Z"; }, false],
  ["generic null reference", s => { s.source.reference = null; s.records.forEach(record => { record.reference = null; }); }, true],
  ["GitHub null reference", s => { s.source.reference = null; }, false], ["GitHub record null reference", s => { s.records[0].reference = null; }, false],
  ["requested applied mismatch", s => { s.diagnostics.collections.commits.appliedLimit = 1; }, false], ["itemsRead mismatch", s => { s.diagnostics.collections.commits.itemsRead = 1; }, false], ["zero diagnostics nonzero pages", s => { s.scope.requestedLimits.commits = 0; s.diagnostics.collections.commits = { ...s.diagnostics.collections.commits, requestedLimit: 0, appliedLimit: 0, itemsRead: 0, pagesRead: 1 }; }, false], ["truncated without continuation", s => { s.diagnostics.collections.commits.truncated = true; }, false], ["complete false", s => { s.diagnostics.complete = false; }, false],
  ["duplicate repository", s => { s.records.push(structuredClone(s.records[0])); }, false], ["duplicate branch", s => { s.records.push(structuredClone(s.records[1])); }, false], ["authority repository", s => { s.records[0].authority = "github-repository-state"; }, true], ["authority branch", s => { s.records[1].authority = "github-ref-state"; }, true], ["authority commit", s => { s.records[2].authority = "github-commit-state"; }, true], ["authority issue", s => { s.records[4].authority = "github-issue-state"; }, true], ["authority PR", s => { s.records[5].authority = "github-pull-request-state"; }, true], ["authority release", s => { s.records[6].authority = "github-release-state"; }, true], ["authority tag", s => { s.records[7].authority = "github-ref-state"; }, true],
  ["canonical kind forbidden", s => { s.records[0].payload.kind = "repository"; }, false], ["canonical lifecycle forbidden", s => { s.records[0].payload.lifecycle = "active"; }, false], ["canonical verification forbidden", s => { s.records[0].payload.verification = "verified"; }, false], ["input remains ordinary", s => { s.note = "not part of snapshot"; }, false]
];
for (const [name, mutate, shouldPass] of validatorCases) test(`validator boundary: ${name}`, () => { const snapshot = valid(); mutate(snapshot); const validator = name.startsWith("adapter ") || name === "generic null reference" ? validateSourceSnapshotV01 : validateGitHubSourceSnapshotV01; if (shouldPass) { const output = validator(snapshot); assert(output); } else code(() => validator(snapshot), name.includes("timestamp") ? "INVALID_CAPTURED_AT" : "SOURCE_SNAPSHOT_INVALID"); });

for (const [name, mutate, expected] of [
  ["empty authority", s => { s.records[0].authority = ""; }, "SOURCE_SNAPSHOT_INVALID"],
  ["null authority", s => { s.records[0].authority = null; }, "SOURCE_SNAPSHOT_INVALID"],
  ["numeric authority", s => { s.records[0].authority = 7; }, "SOURCE_SNAPSHOT_INVALID"],
  ["valid provider-neutral authority", s => { s.adapter = "generic"; s.source.provider = "source"; s.source.reference = null; s.source.retrievalMode = "read-only"; s.source.authority = "external-state"; s.records.forEach(record => { record.reference = null; record.authority = "external-state"; }); }, null]
]) test(`generic authority: ${name}`, () => { const snapshot = valid(); mutate(snapshot); if (expected) code(() => validateSourceSnapshotV01(snapshot), expected); else assert(validateSourceSnapshotV01(snapshot)); });

const otherScopeIds = [
  ["repository", "github:repo:other/repo"], ["branch", "github:branch:other/repo:main"], ["commit", "github:commit:other/repo:2222222222222222222222222222222222222222"], ["issue", "github:issue:other/repo:17"], ["pull_request", "github:pr:other/repo:23"], ["release", "github:release:other/repo:release-7"], ["tag", "github:tag:other/repo:v0.1.0"]
];
for (const [type, id] of otherScopeIds) test(`identity scope mismatch: ${type}`, () => { const snapshot = valid(); snapshot.records.find(record => record.sourceType === type).sourceRecordId = id; code(() => validateGitHubSourceSnapshotV01(snapshot), "SOURCE_SCOPE_MISMATCH"); });
for (const [type, id] of [["repository", "github:repo:cyrilla-mist/nexus-ai:extra"], ["branch", "github:branch:cyrilla-mist/nexus-ai"], ["commit", "github:commit:cyrilla-mist/nexus-ai:not-a-sha"], ["issue", "github:issue:cyrilla-mist/nexus-ai:not-a-number"], ["pull_request", "github:pr:cyrilla-mist/nexus-ai:not-a-number"], ["release", "github:release:cyrilla-mist/nexus-ai"], ["tag", "github:tag:cyrilla-mist/nexus-ai"]]) test(`malformed current-scope identity: ${type}`, () => { const snapshot = valid(); snapshot.records.find(record => record.sourceType === type).sourceRecordId = id; code(() => validateGitHubSourceSnapshotV01(snapshot), "SOURCE_RECORD_ID_INVALID"); });
