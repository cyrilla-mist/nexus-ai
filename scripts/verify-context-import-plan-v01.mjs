import assert from "node:assert/strict";
import sourceExample from "../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };
import acceptedPlan from "../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };
import catalog from "../examples/nexus-atlas-context-import-plan-cases-v0.1.json" with { type: "json" };
import { buildContextImportPlanV01 } from "../experience/source-v01/context-import-planner.mjs";
import { ContextImportPlanError, validateContextImportPlanV01 } from "../experience/source-v01/context-import-plan-validator.mjs";

const input = { snapshot: sourceExample.snapshot, policyVersion: "github-context-import-policy-v1", projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas" };
const actual = buildContextImportPlanV01(input);
const sourceMap = new Map(sourceExample.snapshot.records.map(record => [record.sourceRecordId, record]));
assert.deepEqual(actual, acceptedPlan.plan);
assert.equal(actual.sourceSnapshot.recordIds.length, 8); assert.equal(actual.candidates.length, 8); assert.equal(actual.exclusions.length, 0);
assert.deepEqual([...new Set(actual.candidates.map(candidate => candidate.targetKind))], ["evidence"]);
for (const candidate of actual.candidates) { const source = sourceMap.get(candidate.sourceRecordIds[0]); assert.equal(candidate.provenance.authority, source.authority); assert.equal(candidate.proposedPayload.observedAt, source.observedAt); assert.equal(candidate.summary, candidate.proposedPayload.claim); }
const forbiddenKeys = new Set(["graph", "nodes", "edges", "mutations", "writes", "write", "apply", "canonicalId", "canonicalNodeId"]);
const visitKeys = value => { if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { assert(!forbiddenKeys.has(key)); visitKeys(child); } }; visitKeys(actual);
assert(actual.candidates.every(candidate => candidate.admission.canonicalWriteAllowed === false));
assert.deepEqual(validateContextImportPlanV01(actual), actual);
assert.equal(catalog.cases.length, 32); assert.deepEqual(catalog.catalogMetadata.categories, { schema: 7, "input/scope": 6, mapping: 9, "governance/safety": 6, "determinism/coverage": 4 });
assert.equal(new Set(catalog.catalogMetadata.behaviorVocabulary).size, 12);
const frozenVisit = value => { if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(frozenVisit); } }; frozenVisit(actual);
const before = structuredClone(sourceExample.snapshot); buildContextImportPlanV01(input); assert.deepEqual(sourceExample.snapshot, before); assert(!Object.isFrozen(input));
const deterministicA = buildContextImportPlanV01(input); const deterministicB = buildContextImportPlanV01(input); assert.deepEqual(deterministicA, deterministicB);

const sentinelSnapshot = structuredClone(sourceExample.snapshot);
sentinelSnapshot.records.find(record => record.sourceType === "commit").payload.messageHeadline = "CATALOG_COMMIT_SEMANTIC_SENTINEL";
sentinelSnapshot.records.find(record => record.sourceType === "issue").payload.title = "CATALOG_ISSUE_ACTION_SENTINEL";
sentinelSnapshot.records.find(record => record.sourceType === "pull_request").payload.title = "CATALOG_PR_PHASE_COMPLETE_SENTINEL";
sentinelSnapshot.records.find(record => record.sourceType === "release").payload.name = "CATALOG_RELEASE_VERSION_SENTINEL";
const sentinelPlan = buildContextImportPlanV01({ ...input, snapshot: sentinelSnapshot });
assert(!JSON.stringify(sentinelPlan).includes("CATALOG_COMMIT_SEMANTIC_SENTINEL")); assert(!JSON.stringify(sentinelPlan).includes("CATALOG_ISSUE_ACTION_SENTINEL")); assert(!JSON.stringify(sentinelPlan).includes("CATALOG_PR_PHASE_COMPLETE_SENTINEL")); assert(!JSON.stringify(sentinelPlan).includes("CATALOG_RELEASE_VERSION_SENTINEL"));

const expectInvalid = change => { const tampered = structuredClone(actual); change(tampered); assert.throws(() => validateContextImportPlanV01(tampered), error => error instanceof ContextImportPlanError && error.code === "IMPORT_PLAN_INVALID"); };
expectInvalid(plan => { plan.sourceSnapshot.adapter = "drive"; });
expectInvalid(plan => { plan.candidates[2].mappingRule = plan.candidates[0].mappingRule; });
expectInvalid(plan => { plan.candidates[2].provenance.authority = plan.candidates[0].provenance.authority; });
expectInvalid(plan => { plan.candidates.reverse(); });
expectInvalid(plan => { plan.candidates[5].proposedPayload.claim = "GitHub pull request #23 is merged, therefore Phase complete."; plan.candidates[5].summary = plan.candidates[5].proposedPayload.claim; });

console.log("Nexus Atlas Context Import Plan v0.1");
console.log("Policy: github-context-import-policy-v1");
console.log("Source records: 8");
console.log("Candidates: 8");
console.log("Exclusions: 0");
console.log("Target kind: evidence");
console.log("Coverage complete: true");
console.log("Canonical write boundary: PASS");
console.log("Source authority preservation: PASS");
console.log("Source time preservation: PASS");
console.log("Semantic promotion boundary: PASS");
console.log("Free-text isolation: PASS");
console.log("Determinism: PASS");
console.log("Input immutability: PASS");
console.log("Immutability: PASS");
console.log("Accepted example compatibility: PASS");
console.log("Context Import Plan v0.1 Runtime: PASS");
