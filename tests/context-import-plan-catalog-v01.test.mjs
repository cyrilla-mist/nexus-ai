import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../examples/nexus-atlas-context-import-plan-cases-v0.1.json" with { type: "json" };
import { buildContextImportPlanV01 } from "../experience/source-v01/context-import-planner.mjs";
import { validateContextImportPlanV01, ContextImportPlanError } from "../experience/source-v01/context-import-plan-validator.mjs";
import { makeGitHubSnapshot, makePlannerInput, acceptedPlan } from "./helpers/context-import-plan-fixtures.mjs";

const handlers = {
  "deep-equal": (plan, input) => assert.deepEqual(plan, buildContextImportPlanV01(input)),
  "deeply-frozen": plan => { const visit = value => { if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(visit); } }; visit(plan); },
  "input-unchanged": (plan, input, before) => { assert.deepEqual(input, before); assert(!Object.isFrozen(input)); },
  "coverage-complete": plan => { const expected = plan.sourceSnapshot.recordIds; const actual = [...plan.candidates, ...plan.exclusions].map(item => item.sourceRecordId ?? item.sourceRecordIds[0]); assert.equal(new Set(actual).size, expected.length); assert.deepEqual([...actual].sort(), [...expected].sort()); assert.equal(plan.diagnostics.coverageComplete, true); },
  "one-to-one-source-mapping": plan => assert(plan.candidates.every(candidate => candidate.sourceRecordIds.length === 1)),
  "source-authority-preserved": (plan, input) => { const sourceMap = new Map(input.snapshot.records.map(record => [record.sourceRecordId, record.authority])); for (const candidate of plan.candidates) assert.equal(candidate.provenance.authority, sourceMap.get(candidate.sourceRecordIds[0])); },
  "no-semantic-promotion": plan => { const forbidden = new Set(["action", "decision", "memory", "project", "milestone", "identity", "risk", "kind", "lifecycle", "epistemic", "governance"]); assert(plan.candidates.every(candidate => candidate.targetKind === "evidence" && Object.keys(candidate).every(key => !forbidden.has(key)))); },
  "no-canonical-write": plan => { const forbidden = new Set(["graph", "nodes", "edges", "mutations", "writes", "write", "apply", "canonicalId", "canonicalNodeId"]); const visit = value => { if (value && typeof value === "object") { for (const [key, child] of Object.entries(value)) { assert(!forbidden.has(key)); visit(child); } } }; visit(plan); assert(plan.candidates.every(candidate => candidate.admission.canonicalWriteAllowed === false)); },
  "source-time-preserved": (plan, input) => { const sourceMap = new Map(input.snapshot.records.map(record => [record.sourceRecordId, record.observedAt])); for (const candidate of plan.candidates) assert.equal(candidate.proposedPayload.observedAt, sourceMap.get(candidate.sourceRecordIds[0])); },
  "free-text-not-promoted": plan => assert(!/CATALOG_(COMMIT|ISSUE|PR|RELEASE)_/.test(JSON.stringify(plan))),
  "stable-candidate-identity": plan => assert(plan.candidates.every(candidate => candidate.candidateId === "candidate:evidence:" + candidate.sourceRecordIds[0])),
  "diagnostics-consistent": plan => { assert.equal(plan.diagnostics.sourceRecordCount, plan.sourceSnapshot.recordIds.length); assert.equal(plan.diagnostics.candidateCount, plan.candidates.length); assert.equal(plan.diagnostics.exclusionCount, plan.exclusions.length); assert.equal(plan.diagnostics.candidateCount + plan.diagnostics.exclusionCount, plan.diagnostics.sourceRecordCount); assert.equal(plan.diagnostics.byTargetKind.evidence, plan.candidates.length); assert.equal(plan.diagnostics.byConfirmationRequirement["source-authority-sufficient"], plan.candidates.length); assert.equal(plan.diagnostics.coverageComplete, true); }
};
const errCode = fn => { try { fn(); } catch (error) { if (error instanceof ContextImportPlanError) return error.code; throw error; } return null; };
function scenario(id) {
  if (["IP-S01", "IP-M03", "IP-M04"].includes(id)) return ["repository", "branch"];
  if (["IP-M02", "IP-M05"].includes(id)) return ["commit"];
  if (["IP-M06", "IP-G03"].includes(id)) return ["issue"];
  if (["IP-M07", "IP-G04"].includes(id)) return ["pull_request"];
  if (id === "IP-M08") return ["release"];
  if (id === "IP-M09") return ["tag"];
  if (id === "IP-G05") return ["commit", "issue", "pull_request", "release"];
  return ["repository", "branch", "commit", "issue", "pull_request", "release", "tag"];
}
function sentinels(id) { return id === "IP-M05" ? { commit: "CATALOG_COMMIT_SEMANTIC_SENTINEL" } : id === "IP-G03" ? { issue: "CATALOG_ISSUE_ACTION_SENTINEL" } : id === "IP-G04" ? { pull_request: "CATALOG_PR_PHASE_COMPLETE_SENTINEL" } : id === "IP-G05" ? { commit: "CATALOG_COMMIT_SEMANTIC_SENTINEL", issue: "CATALOG_ISSUE_ACTION_SENTINEL", pull_request: "CATALOG_PR_PHASE_COMPLETE_SENTINEL", release: "CATALOG_RELEASE_VERSION_SENTINEL" } : {};
}
const caseExecutors = {
  "IP-S01": input => buildContextImportPlanV01(input), "IP-S02": input => { const plan = structuredClone(buildContextImportPlanV01(input)); delete plan.planVersion; return validateContextImportPlanV01(plan); }, "IP-S03": input => { const plan = structuredClone(buildContextImportPlanV01(input)); plan.planVersion = "0.2"; return validateContextImportPlanV01(plan); }, "IP-S04": input => { const plan = structuredClone(buildContextImportPlanV01(input)); plan.generatedAt = "2026-08-07T13:00:00Z"; return validateContextImportPlanV01(plan); }, "IP-S05": input => { const plan = structuredClone(buildContextImportPlanV01(input)); plan.sourceSnapshot.recordIds = {}; return validateContextImportPlanV01(plan); }, "IP-S06": input => { const plan = structuredClone(buildContextImportPlanV01(input)); plan.candidates = {}; return validateContextImportPlanV01(plan); }, "IP-S07": input => { const plan = structuredClone(buildContextImportPlanV01(input)); plan.diagnostics.candidateCount--; return validateContextImportPlanV01(plan); },
  "IP-P01": input => buildContextImportPlanV01(input), "IP-P02": input => buildContextImportPlanV01({ ...input, policyVersion: "github-context-import-policy-v2" }), "IP-P03": input => buildContextImportPlanV01({ ...input, projectId: "" }), "IP-P04": input => buildContextImportPlanV01({ ...input, scopeKey: "" }), "IP-P05": input => { const snapshot = structuredClone(input.snapshot); snapshot.records.pop(); return buildContextImportPlanV01({ ...input, snapshot }); }, "IP-P06": input => { const snapshot = structuredClone(input.snapshot); snapshot.adapter = "drive"; snapshot.source.provider = "drive"; return buildContextImportPlanV01({ ...input, snapshot }); },
  "IP-M01": input => buildContextImportPlanV01(input), "IP-M02": input => buildContextImportPlanV01(input), "IP-M03": input => buildContextImportPlanV01(input), "IP-M04": input => buildContextImportPlanV01(input), "IP-M05": input => buildContextImportPlanV01(input), "IP-M06": input => buildContextImportPlanV01(input), "IP-M07": input => buildContextImportPlanV01(input), "IP-M08": input => buildContextImportPlanV01(input), "IP-M09": input => buildContextImportPlanV01(input),
  "IP-G01": input => buildContextImportPlanV01(input), "IP-G02": input => buildContextImportPlanV01(input), "IP-G03": input => buildContextImportPlanV01(input), "IP-G04": input => buildContextImportPlanV01(input), "IP-G05": input => buildContextImportPlanV01(input), "IP-G06": input => buildContextImportPlanV01(input),
  "IP-C01": input => buildContextImportPlanV01(input), "IP-C02": input => buildContextImportPlanV01(input), "IP-C03": input => buildContextImportPlanV01(input), "IP-C04": input => buildContextImportPlanV01(input)
};
for (const item of catalog.cases) test("catalog " + item.id, () => {
  const input = makePlannerInput(scenario(item.id), { sentinels: sentinels(item.id) }); const before = structuredClone(input); let plan = null; let resultCode = null;
  try { plan = caseExecutors[item.id](input); } catch (error) { if (error instanceof ContextImportPlanError) resultCode = error.code; else throw error; }
  if (item.expected.outcome === "error") { assert.equal(resultCode, item.expected.errorCode); return; }
  assert.equal(resultCode, null); assert.equal(plan.planVersion, "0.1"); assert.deepEqual(plan.candidates.map(candidate => candidate.candidateId), item.expected.candidateIds); assert.deepEqual(plan.exclusions.map(exclusion => exclusion.sourceRecordId), item.expected.exclusionIds);
  const targetKinds = [...new Set(plan.candidates.map(candidate => candidate.targetKind))]; assert.deepEqual(targetKinds, item.expected.targetKinds);
  for (const assertion of item.expected.behaviorAssertions) { assert(Object.hasOwn(handlers, assertion), "unknown handler " + assertion); handlers[assertion](plan, input, before); }
});
test("catalog executor coverage is exact", () => assert.deepEqual(new Set(Object.keys(caseExecutors)), new Set(catalog.cases.map(item => item.id))));
test("catalog behavior coverage is exact", () => assert.deepEqual(new Set(Object.keys(handlers)), new Set(catalog.catalogMetadata.behaviorVocabulary)));
test("catalog metadata has 32 cases and fixed categories", () => { assert.equal(catalog.cases.length, 32); assert.deepEqual(catalog.catalogMetadata.categories, { schema: 7, "input/scope": 6, mapping: 9, "governance/safety": 6, "determinism/coverage": 4 }); });
test("accepted fixture Plan remains unchanged", () => assert.equal(acceptedPlan().candidates.length, 8));
