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
