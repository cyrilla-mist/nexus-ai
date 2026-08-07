import assert from "node:assert/strict";
import { test } from "node:test";
import { ContextImportPlanError, CONTEXT_IMPORT_PLAN_ERROR_CODES_V01, parseGitHubSourceRecordIdV01, validateContextImportPlanV01 } from "../experience/source-v01/context-import-plan-validator.mjs";
import { SourceAdapterError } from "../experience/source-v01/source-snapshot-validator.mjs";
import { acceptedPlan } from "./helpers/context-import-plan-fixtures.mjs";

const code = (fn, expected) => assert.throws(fn, error => error instanceof ContextImportPlanError && error.code === expected && error.retryable === false);
const mutate = (fn, expected) => { const plan = acceptedPlan(); fn(plan); code(() => validateContextImportPlanV01(plan), expected); };
test("valid accepted Plan returns a deeply frozen clone", () => { const input = acceptedPlan(); const output = validateContextImportPlanV01(input); assert.deepEqual(output, input); assert.notEqual(output, input); assert(Object.isFrozen(output)); assert(Object.isFrozen(output.candidates[0].proposedPayload)); });
test("error vocabulary is exact and retryable set is empty", () => { assert.deepEqual(CONTEXT_IMPORT_PLAN_ERROR_CODES_V01, ["INVALID_IMPORT_PLAN_INPUT","INVALID_POLICY_VERSION","INVALID_PROJECT_ID","INVALID_SCOPE_KEY","INVALID_SOURCE_SNAPSHOT","SOURCE_SNAPSHOT_UNSUPPORTED","SOURCE_RECORD_UNMAPPED","CANDIDATE_ID_INVALID","CANDIDATE_DUPLICATE","IMPORT_PLAN_COVERAGE_MISMATCH","IMPORT_PLAN_SOURCE_MISMATCH","IMPORT_PLAN_INVALID"]); });
test("unknown error code is a TypeError", () => { assert.throws(() => new ContextImportPlanError("TYPO"), TypeError); });
const cases = [
  ["non object", () => null, "IMPORT_PLAN_INVALID"],
  ["array", () => [], "IMPORT_PLAN_INVALID"],
  ["extra top key", p => { p.extra = true; }, "IMPORT_PLAN_INVALID"],
  ["wrong plan version", p => { p.planVersion = "0.2"; }, "IMPORT_PLAN_INVALID"],
  ["wrong policy", p => { p.policyVersion = "other"; }, "IMPORT_PLAN_INVALID"],
  ["bad descriptor", p => { p.sourceSnapshot.recordIds = {}; }, "IMPORT_PLAN_INVALID"],
  ["duplicate descriptor IDs", p => { p.sourceSnapshot.recordIds[1] = p.sourceSnapshot.recordIds[0]; }, "IMPORT_PLAN_INVALID"],
  ["bad target", p => { p.target.projectId = ""; }, "IMPORT_PLAN_INVALID"],
  ["candidates not array", p => { p.candidates = {}; }, "IMPORT_PLAN_INVALID"],
  ["exclusions not array", p => { p.exclusions = {}; }, "IMPORT_PLAN_INVALID"],
  ["bad diagnostics shape", p => { p.diagnostics.byTargetKind = {}; }, "IMPORT_PLAN_INVALID"],
  ["unknown mapping", p => { p.candidates[0].mappingRule = "unknown"; }, "IMPORT_PLAN_INVALID"],
  ["bad candidate shape", p => { delete p.candidates[0].title; }, "IMPORT_PLAN_INVALID"],
  ["bad payload shape", p => { delete p.candidates[0].proposedPayload.result; }, "IMPORT_PLAN_INVALID"],
  ["bad provenance", p => { p.candidates[0].provenance.provider = "other"; }, "IMPORT_PLAN_INVALID"],
  ["bad admission", p => { p.candidates[0].admission.canonicalWriteAllowed = true; }, "IMPORT_PLAN_INVALID"],
  ["generated mismatch", p => { p.generatedAt = "2026-08-07T13:00:00Z"; }, "IMPORT_PLAN_SOURCE_MISMATCH"],
  ["source absent", p => { p.candidates[0].sourceRecordIds = ["github:missing"]; }, "IMPORT_PLAN_SOURCE_MISMATCH"],
  ["source ref mismatch", p => { p.candidates[0].proposedPayload.sourceRef = "github:other"; }, "IMPORT_PLAN_SOURCE_MISMATCH"],
  ["provenance capture mismatch", p => { p.candidates[0].provenance.capturedAt = "2026-08-07T13:00:00Z"; }, "IMPORT_PLAN_SOURCE_MISMATCH"],
  ["candidate ID invalid", p => { p.candidates[0].candidateId = "candidate:evidence:wrong"; }, "CANDIDATE_ID_INVALID"],
  ["duplicate candidate ID", p => { p.candidates[1].candidateId = p.candidates[0].candidateId; }, "CANDIDATE_DUPLICATE"],
  ["missing coverage", p => { p.candidates.pop(); }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["duplicate coverage", p => { p.candidates[1].sourceRecordIds = p.candidates[0].sourceRecordIds; p.candidates[1].candidateId = "candidate:evidence:"+p.candidates[0].sourceRecordIds[0]; }, "CANDIDATE_DUPLICATE"],
  ["dual coverage", p => { p.exclusions.push({sourceRecordId:p.candidates[0].sourceRecordIds[0],reason:"policy",rule:"policy-excluded"}); }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["diagnostic count mismatch", p => { p.diagnostics.candidateCount = 7; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["unknown exclusion rule", p => { p.exclusions.push({sourceRecordId:"github:missing",reason:"x",rule:"bad"}); }, "IMPORT_PLAN_INVALID"],
  ["exclusion source absent", p => { p.exclusions.push({sourceRecordId:"github:missing",reason:"x",rule:"policy-excluded"}); }, "IMPORT_PLAN_SOURCE_MISMATCH"],
  ["empty claim", p => { p.candidates[0].proposedPayload.claim = ""; }, "IMPORT_PLAN_INVALID"],
  ["summary mismatch", p => { p.candidates[0].summary = "other"; }, "IMPORT_PLAN_INVALID"],
  ["bad observed time", p => { p.candidates[0].proposedPayload.observedAt = "2026-08-07"; }, "IMPORT_PLAN_INVALID"],
  ["non null version", p => { p.candidates[0].proposedPayload.appliesToVersion = "0.1"; }, "IMPORT_PLAN_INVALID"],
  ["bad verification method", p => { p.candidates[0].proposedPayload.verificationMethod = "other"; }, "IMPORT_PLAN_INVALID"],
  ["bad target kind", p => { p.candidates[0].targetKind = "action"; }, "IMPORT_PLAN_INVALID"],
  ["bad source ID cardinality", p => { p.candidates[0].sourceRecordIds.push(p.candidates[0].sourceRecordIds[0]); }, "IMPORT_PLAN_INVALID"],
  ["candidate extra key", p => { p.candidates[0].extra = true; }, "IMPORT_PLAN_INVALID"],
  ["diagnostics false", p => { p.diagnostics.coverageComplete = false; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["source record count mismatch", p => { p.diagnostics.sourceRecordCount = 7; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["exclusion count mismatch", p => { p.diagnostics.exclusionCount = 1; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["target bucket mismatch", p => { p.diagnostics.byTargetKind.evidence = 7; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["confirmation bucket mismatch", p => { p.diagnostics.byConfirmationRequirement["source-authority-sufficient"] = 7; }, "IMPORT_PLAN_COVERAGE_MISMATCH"],
  ["bad authority", p => { p.candidates[0].provenance.authority = "human-confirmation"; }, "IMPORT_PLAN_INVALID"],
  ["bad provider", p => { p.candidates[0].provenance.provider = "github-enterprise"; }, "IMPORT_PLAN_INVALID"],
  ["empty reference", p => { p.candidates[0].provenance.reference = ""; }, "IMPORT_PLAN_INVALID"],
  ["bad stage", p => { p.candidates[0].admission.stage = "accepted"; }, "IMPORT_PLAN_INVALID"],
  ["write allowed", p => { p.candidates[0].admission.canonicalWriteAllowed = true; }, "IMPORT_PLAN_INVALID"],
  ["bad confirmation", p => { p.candidates[0].admission.confirmationRequirement = "human-confirmation-required"; }, "IMPORT_PLAN_INVALID"],
  ["empty result", p => { p.candidates[0].proposedPayload.result = ""; }, "IMPORT_PLAN_INVALID"],
  ["whitespace target", p => { p.target.scopeKey = " scope "; }, "IMPORT_PLAN_INVALID"]
];
for (const [name, fn, expected] of cases) test("validator " + name, () => { if (name === "non object" || name === "array") code(() => validateContextImportPlanV01(fn()), expected); else mutate(fn, expected); });

const expectInvalid = (name, change) => test("validator hardening " + name, () => mutate(change, "IMPORT_PLAN_INVALID"));
expectInvalid("descriptor adapter drive", p => { p.sourceSnapshot.adapter = "drive"; });
expectInvalid("noncanonical repositoryRef", p => { p.sourceSnapshot.repositoryRef = "Cyrilla-Mist/nexus-ai"; });
expectInvalid("empty recordIds", p => { p.sourceSnapshot.recordIds = []; });
expectInvalid("missing repository core", p => { p.sourceSnapshot.recordIds = p.sourceSnapshot.recordIds.filter(id => !id.startsWith("github:repo:")); });
expectInvalid("missing branch core", p => { p.sourceSnapshot.recordIds = p.sourceSnapshot.recordIds.filter(id => !id.startsWith("github:branch:")); });
for (const [index, label, other] of [[0, "repository", 1], [1, "branch", 2], [2, "commit", 4], [4, "issue", 5], [5, "pull_request", 6], [6, "release", 7], [7, "tag", 0]]) expectInvalid("mapping type mismatch " + label, p => { p.candidates[index].mappingRule = p.candidates[other].mappingRule; });
for (const [index, label, other] of [[0, "repository", 1], [1, "branch", 2], [2, "commit", 4], [4, "issue", 5], [5, "pull_request", 6], [6, "release", 7], [7, "tag", 0]]) expectInvalid("authority mismatch " + label, p => { p.candidates[index].provenance.authority = p.candidates[other].provenance.authority; });
expectInvalid("external reference host", p => { p.candidates[0].provenance.reference = "https://example.com/x"; });
expectInvalid("query reference", p => { p.candidates[0].provenance.reference += "?token=x"; });
expectInvalid("fragment reference", p => { p.candidates[0].provenance.reference += "#fragment"; });
expectInvalid("reverse Candidate order", p => { p.candidates.reverse(); });
expectInvalid("unsorted exclusions", p => { const removed = p.candidates.splice(-2); p.exclusions = removed.map((candidate, index) => ({ sourceRecordId: candidate.sourceRecordIds[0], reason: "policy", rule: index ? "policy-excluded" : "unsupported-source-type" })).reverse(); p.diagnostics.candidateCount = 6; p.diagnostics.exclusionCount = 2; p.diagnostics.byTargetKind.evidence = 6; p.diagnostics.byConfirmationRequirement["source-authority-sufficient"] = 6; });
expectInvalid("wrong repository title", p => { p.candidates[0].title = "Repository imported"; });
expectInvalid("wrong Issue title", p => { p.candidates[4].title = "Issue imported"; });
expectInvalid("invalid repository result", p => { p.candidates[0].proposedPayload.result = "present"; });
expectInvalid("invalid PR result", p => { p.candidates[5].proposedPayload.result = "published"; });
expectInvalid("semantic claim injection", p => { p.candidates[5].proposedPayload.claim = "GitHub pull request #23 is merged, therefore Phase complete."; p.candidates[5].summary = p.candidates[5].proposedPayload.claim; });
expectInvalid("commit claim SHA mismatch", p => { p.candidates[2].proposedPayload.claim = "GitHub commit 9999999999999999999999999999999999999999 is present."; p.candidates[2].summary = p.candidates[2].proposedPayload.claim; });
expectInvalid("Issue claim number mismatch", p => { p.candidates[4].proposedPayload.claim = "GitHub issue #99 is open."; p.candidates[4].summary = p.candidates[4].proposedPayload.claim; });
expectInvalid("PR claim number mismatch", p => { p.candidates[5].proposedPayload.claim = "GitHub pull request #99 is merged."; p.candidates[5].summary = p.candidates[5].proposedPayload.claim; });
expectInvalid("branch malformed claim SHA", p => { p.candidates[1].proposedPayload.claim = "GitHub default branch main points to commit not-a-sha."; p.candidates[1].summary = p.candidates[1].proposedPayload.claim; });
expectInvalid("tag malformed claim", p => { p.candidates[7].proposedPayload.claim = "GitHub tag v0.1.0 points to commit not-a-sha."; p.candidates[7].summary = p.candidates[7].proposedPayload.claim; });

for (const value of ["https://github.com/a/b", "a//b", "a/../b", "A/B", " a/b "]) test("validator hardening repositoryRef boundary " + value, () => { assert.throws(() => validateContextImportPlanV01(Object.assign(acceptedPlan(), { sourceSnapshot: { ...acceptedPlan().sourceSnapshot, repositoryRef: value } })), error => error instanceof ContextImportPlanError && !(error instanceof SourceAdapterError) && error.code === "IMPORT_PLAN_INVALID"); });
for (const raw of ["0", "00", "-1", "1.2", "NaN", "9007199254740992"]) test("validator hardening rejects issue identity " + raw, () => { assert.throws(() => parseGitHubSourceRecordIdV01("github:issue:cyrilla-mist/nexus-ai:" + raw, "cyrilla-mist/nexus-ai"), error => error instanceof ContextImportPlanError && error.code === "IMPORT_PLAN_INVALID"); });
for (const raw of ["0", "00", "-1", "1.2", "NaN", "9007199254740992"]) test("validator hardening rejects PR identity " + raw, () => { assert.throws(() => parseGitHubSourceRecordIdV01("github:pr:cyrilla-mist/nexus-ai:" + raw, "cyrilla-mist/nexus-ai"), error => error instanceof ContextImportPlanError && error.code === "IMPORT_PLAN_INVALID"); });
test("validator hardening accepts positive canonical issue and PR identities", () => { assert.deepEqual(parseGitHubSourceRecordIdV01("github:issue:cyrilla-mist/nexus-ai:17", "cyrilla-mist/nexus-ai"), { sourceType: "issue", externalIdentity: "17" }); assert.deepEqual(parseGitHubSourceRecordIdV01("github:pr:cyrilla-mist/nexus-ai:23", "cyrilla-mist/nexus-ai"), { sourceType: "pull_request", externalIdentity: "23" }); });
for (const [label, change] of [["repository wrong path", p => { p.candidates[0].provenance.reference += "/tree/main"; }], ["branch wrong repository", p => { p.candidates[1].provenance.reference = "https://github.com/other/repo/tree/main"; }], ["commit wrong SHA", p => { p.candidates[2].provenance.reference = "https://github.com/cyrilla-mist/nexus-ai/commit/3333333333333333333333333333333333333333"; }], ["issue wrong number", p => { p.candidates[4].provenance.reference = "https://github.com/cyrilla-mist/nexus-ai/issues/99"; }], ["PR wrong number", p => { p.candidates[5].provenance.reference = "https://github.com/cyrilla-mist/nexus-ai/pull/99"; }], ["tag wrong tag", p => { p.candidates[7].provenance.reference = "https://github.com/cyrilla-mist/nexus-ai/releases/tag/v2"; }]]) expectInvalid("reference coherence " + label, change);
for (const [label, reference] of [["release tamper", "https://github.com/cyrilla-mist/nexus-ai/releases/tag/other"], ["invalid percent", "https://github.com/cyrilla-mist/nexus-ai/releases/tag/%E0%A4%A"], ["release wrong repository", "https://github.com/other/repo/releases/tag/v0.1.0"]]) expectInvalid("release reference " + label, p => { p.candidates[6].provenance.reference = reference; });
