import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClaim, buildContextImportPlanV01, GITHUB_CONTEXT_IMPORT_MAPPING_RULES_V1 } from "../experience/source-v01/context-import-planner.mjs";
import { ContextImportPlanError, validateContextImportPlanV01 } from "../experience/source-v01/context-import-plan-validator.mjs";
import { acceptedPlan, makeGitHubSnapshot, makePlannerInput } from "./helpers/context-import-plan-fixtures.mjs";

const errorCode = (fn, code) => assert.throws(fn, error => error instanceof ContextImportPlanError && error.code === code && error.retryable === false);
const R="candidate:evidence:github:repo:cyrilla-mist/nexus-ai";
const B="candidate:evidence:github:branch:cyrilla-mist/nexus-ai:main";
const C="candidate:evidence:github:commit:cyrilla-mist/nexus-ai:2222222222222222222222222222222222222222";
const I="candidate:evidence:github:issue:cyrilla-mist/nexus-ai:17";
const P="candidate:evidence:github:pr:cyrilla-mist/nexus-ai:23";
const L="candidate:evidence:github:release:cyrilla-mist/nexus-ai:release-7";
const T="candidate:evidence:github:tag:cyrilla-mist/nexus-ai:v0.1.0";
test("planner accepted Example deepEqual", () => { assert.deepEqual(buildContextImportPlanV01(makePlannerInput()), acceptedPlan()); });
test("planner output is deeply frozen", () => { const output=buildContextImportPlanV01(makePlannerInput()); assert(Object.isFrozen(output)); assert(Object.isFrozen(output.candidates[0])); assert(Object.isFrozen(output.candidates[0].provenance)); });
test("planner does not freeze input", () => { const input=makePlannerInput(); buildContextImportPlanV01(input); assert(!Object.isFrozen(input)); assert(!Object.isFrozen(input.snapshot)); });
test("planner output is deterministic", () => { const input=makePlannerInput(); assert.deepEqual(buildContextImportPlanV01(input), buildContextImportPlanV01(input)); });
test("planner exact top-level output keys", () => { assert.deepEqual(Object.keys(buildContextImportPlanV01(makePlannerInput())), ["planVersion","policyVersion","generatedAt","sourceSnapshot","target","candidates","exclusions","diagnostics"]); });
test("planner exact target", () => { assert.deepEqual(buildContextImportPlanV01(makePlannerInput()).target,{projectId:"project:nexus-atlas",scopeKey:"project:nexus-atlas"}); });
test("planner exact descriptor order", () => { const p=buildContextImportPlanV01(makePlannerInput()); assert.deepEqual(p.sourceSnapshot.recordIds,p.candidates.map(c=>c.sourceRecordIds[0])); });
test("planner generatedAt equals capture", () => { const p=buildContextImportPlanV01(makePlannerInput()); assert.equal(p.generatedAt,p.sourceSnapshot.capturedAt); });
test("planner exclusions empty", () => { assert.deepEqual(buildContextImportPlanV01(makePlannerInput()).exclusions,[]); });
test("planner diagnostics consistent", () => { const p=buildContextImportPlanV01(makePlannerInput()); assert.equal(p.diagnostics.sourceRecordCount,8); assert.equal(p.diagnostics.candidateCount,8); assert.equal(p.diagnostics.byTargetKind.evidence,8); });
for (const [name, input, expected] of [
  ["null input", null, "INVALID_IMPORT_PLAN_INPUT"], ["undefined input", undefined, "INVALID_IMPORT_PLAN_INPUT"], ["array input", [], "INVALID_IMPORT_PLAN_INPUT"],
  ["empty input", {}, "INVALID_IMPORT_PLAN_INPUT"], ["missing snapshot", {policyVersion:"github-context-import-policy-v1",projectId:"p",scopeKey:"s"}, "INVALID_IMPORT_PLAN_INPUT"],
  ["extra key", {...makePlannerInput(),extra:true}, "INVALID_IMPORT_PLAN_INPUT"], ["bad policy", makePlannerInput("repository",{policyVersion:"other"}), "INVALID_POLICY_VERSION"],
  ["empty project", makePlannerInput("repository",{projectId:""}), "INVALID_PROJECT_ID"], ["whitespace project", makePlannerInput("repository",{projectId:" p"}), "INVALID_PROJECT_ID"],
  ["empty scope", makePlannerInput("repository",{scopeKey:""}), "INVALID_SCOPE_KEY"], ["whitespace scope", makePlannerInput("repository",{scopeKey:"s "}), "INVALID_SCOPE_KEY"]
]) test("planner precedence " + name, () => errorCode(() => buildContextImportPlanV01(input), expected));
test("planner malformed Snapshot wraps SourceAdapterError", () => { const snapshot=makeGitHubSnapshot(); snapshot.records.pop(); errorCode(()=>buildContextImportPlanV01(makePlannerInput("repository",{snapshot})), "INVALID_SOURCE_SNAPSHOT"); });
test("planner unsupported valid Generic profile", () => { const snapshot=makeGitHubSnapshot(); snapshot.adapter="drive"; snapshot.source.provider="drive"; errorCode(()=>buildContextImportPlanV01(makePlannerInput("repository",{snapshot})), "SOURCE_SNAPSHOT_UNSUPPORTED"); });
test("planner malformed GitHub profile wraps", () => { const snapshot=makeGitHubSnapshot(); snapshot.source.authority="other"; errorCode(()=>buildContextImportPlanV01(makePlannerInput("repository",{snapshot})), "INVALID_SOURCE_SNAPSHOT"); });
test("repository mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["repository"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B]); assert.equal(p.candidates[0].proposedPayload.claim,"GitHub repository cyrilla-mist/nexus-ai is available."); });
test("branch mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["branch"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B]); assert.equal(p.candidates[1].proposedPayload.observedAt,null); });
test("commit mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["commit"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B,C]); assert.equal(p.candidates[2].proposedPayload.claim,"GitHub commit 2222222222222222222222222222222222222222 is present."); });
test("issue mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["issue"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B,I]); assert.equal(p.candidates[2].targetKind,"evidence"); });
test("pull request mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["pull_request"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B,P]); assert.match(p.candidates[2].proposedPayload.claim,/pull request #23 is merged/); });
test("release mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["release"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B,L]); assert.match(p.candidates[2].proposedPayload.claim,/release v0.1.0 is published/); });
test("tag mapping", () => { const p=buildContextImportPlanV01(makePlannerInput(["tag"])); assert.deepEqual(p.candidates.map(c=>c.candidateId),[R,B,T]); assert.match(p.candidates[2].proposedPayload.claim,/tag v0.1.0 points to commit/); });
test("mapping rules closed seven types", () => { assert.deepEqual(Object.keys(GITHUB_CONTEXT_IMPORT_MAPPING_RULES_V1),["repository","branch","commit","issue","pull_request","release","tag"]); });
test("candidate exact keys", () => { const c=buildContextImportPlanV01(makePlannerInput(["commit"])).candidates[2]; assert.deepEqual(Object.keys(c),["candidateId","targetKind","sourceRecordIds","mappingRule","title","summary","proposedPayload","provenance","admission"]); });
test("candidate ID stable", () => { const c=buildContextImportPlanV01(makePlannerInput(["commit"])).candidates[2]; assert.equal(c.candidateId,C); });
test("candidate one-to-one source ref", () => { const p=buildContextImportPlanV01(makePlannerInput(["commit"])); assert(p.candidates.every(c=>c.sourceRecordIds.length===1)); });
test("mechanical repository title", () => { assert.equal(buildContextImportPlanV01(makePlannerInput(["repository"])).candidates[0].title,"GitHub repository observation"); });
test("mechanical issue title", () => { assert.equal(buildContextImportPlanV01(makePlannerInput(["issue"])).candidates[2].title,"GitHub issue #17 observation"); });
test("mechanical PR title", () => { assert.equal(buildContextImportPlanV01(makePlannerInput(["pull_request"])).candidates[2].title,"GitHub pull request #23 observation"); });
test("mechanical claims ignore commit text", () => { const p=buildContextImportPlanV01(makePlannerInput(["commit"],{sentinels:{commit:"CATALOG_COMMIT_SEMANTIC_SENTINEL"}})); assert(!JSON.stringify(p).includes("CATALOG_COMMIT_SEMANTIC_SENTINEL")); });
test("mechanical claims ignore issue text", () => { const p=buildContextImportPlanV01(makePlannerInput(["issue"],{sentinels:{issue:"CATALOG_ISSUE_ACTION_SENTINEL"}})); assert(!JSON.stringify(p).includes("CATALOG_ISSUE_ACTION_SENTINEL")); });
test("mechanical claims ignore PR text", () => { const p=buildContextImportPlanV01(makePlannerInput(["pull_request"],{sentinels:{pull_request:"CATALOG_PR_PHASE_COMPLETE_SENTINEL"}})); assert(!JSON.stringify(p).includes("CATALOG_PR_PHASE_COMPLETE_SENTINEL")); });
test("mechanical claims ignore release text", () => { const p=buildContextImportPlanV01(makePlannerInput(["release"],{sentinels:{release:"CATALOG_RELEASE_VERSION_SENTINEL"}})); assert(!JSON.stringify(p).includes("CATALOG_RELEASE_VERSION_SENTINEL")); });
test("payload preserves null source time", () => { const p=buildContextImportPlanV01(makePlannerInput(["branch"])); assert.equal(p.candidates[1].proposedPayload.observedAt,null); });
test("payload appliesToVersion null", () => { assert.equal(buildContextImportPlanV01(makePlannerInput(["release"])).candidates[2].proposedPayload.appliesToVersion,null); });
test("payload verification method fixed", () => { assert.equal(buildContextImportPlanV01(makePlannerInput(["commit"])).candidates[2].proposedPayload.verificationMethod,"github-source-snapshot-v0.1"); });
test("provenance source authority", () => { const p=buildContextImportPlanV01(makePlannerInput(["issue"])); assert.equal(p.candidates[2].provenance.authority,"github-issue-state"); });
test("provenance source reference", () => { const p=buildContextImportPlanV01(makePlannerInput(["tag"])); assert.match(p.candidates[2].provenance.reference,/github.com/); });
test("provenance capture and retrieval", () => { const p=buildContextImportPlanV01(makePlannerInput(["commit"])); assert.equal(p.candidates[2].provenance.capturedAt,p.generatedAt); assert.equal(p.candidates[2].provenance.retrievalMode,"read-only-api"); });
test("admission always candidate", () => { assert(buildContextImportPlanV01(makePlannerInput()).candidates.every(c=>c.admission.stage==="candidate")); });
test("admission never writes", () => { assert(buildContextImportPlanV01(makePlannerInput()).candidates.every(c=>c.admission.canonicalWriteAllowed===false)); });
test("admission source authority requirement", () => { assert(buildContextImportPlanV01(makePlannerInput()).candidates.every(c=>c.admission.confirmationRequirement==="source-authority-sufficient")); });
test("issue does not promote Action", () => { const p=buildContextImportPlanV01(makePlannerInput(["issue"])); assert.equal(p.candidates[2].targetKind,"evidence"); assert(!Object.hasOwn(p.candidates[2],"action")); });
test("merged PR does not promote Phase", () => { const p=buildContextImportPlanV01(makePlannerInput(["pull_request"])); assert.equal(p.candidates[2].proposedPayload.result,"merged"); });
test("release does not promote version", () => { const p=buildContextImportPlanV01(makePlannerInput(["release"])); assert.equal(p.candidates[2].proposedPayload.appliesToVersion,null); });
test("commit does not promote decision", () => { const p=buildContextImportPlanV01(makePlannerInput(["commit"])); assert.equal(p.candidates[2].targetKind,"evidence"); });
test("buildClaim helper is mechanical", () => { const snapshot=makeGitHubSnapshot(["repository"]); const record=snapshot.records[0]; assert.equal(buildClaim(record,snapshot.scope.repositoryRef),"GitHub repository cyrilla-mist/nexus-ai is available."); });
test("planner mapping rules match inferred source types", () => { const plan = buildContextImportPlanV01(makePlannerInput()); const expected = { repository: "github-repository-state-to-evidence", branch: "github-branch-state-to-evidence", commit: "github-commit-state-to-evidence", issue: "github-issue-state-to-evidence", pull_request: "github-pull-request-state-to-evidence", release: "github-release-state-to-evidence", tag: "github-tag-state-to-evidence" }; for (const candidate of plan.candidates) { const rawType = candidate.sourceRecordIds[0].split(":")[1]; const type = rawType === "repo" ? "repository" : rawType === "pr" ? "pull_request" : rawType; assert.equal(candidate.mappingRule, expected[type]); } });
test("planner preserves exact source authority", () => { const input = makePlannerInput(); const plan = buildContextImportPlanV01(input); const sourceMap = new Map(input.snapshot.records.map(record => [record.sourceRecordId, record.authority])); for (const candidate of plan.candidates) assert.equal(candidate.provenance.authority, sourceMap.get(candidate.sourceRecordIds[0])); });
test("planner preserves exact source ordering", () => { const input = makePlannerInput(); const plan = buildContextImportPlanV01(input); assert.deepEqual(plan.candidates.map(candidate => candidate.sourceRecordIds[0]), input.snapshot.records.map(record => record.sourceRecordId)); });
test("planner mechanical claims pass hardened validator", () => { const plan = buildContextImportPlanV01(makePlannerInput()); assert.doesNotThrow(() => validateContextImportPlanV01(plan)); assert(plan.candidates.every(candidate => candidate.summary === candidate.proposedPayload.claim)); });
