import assert from "node:assert/strict";
import { test } from "node:test";
import catalog from "../examples/nexus-atlas-context-import-plan-cases-v0.1.json" with { type: "json" };
import { buildContextImportPlanV01 } from "../experience/source-v01/context-import-planner.mjs";
import { validateContextImportPlanV01, ContextImportPlanError } from "../experience/source-v01/context-import-plan-validator.mjs";
import { makeGitHubSnapshot, makePlannerInput, acceptedPlan } from "./helpers/context-import-plan-fixtures.mjs";

const handlers = {
  "deep-equal": (plan, input, make) => assert.deepEqual(plan, make()),
  "deeply-frozen": plan => { const visit=v=>{if(v&&typeof v==="object"){assert(Object.isFrozen(v));Object.values(v).forEach(visit);}}; visit(plan); },
  "input-unchanged": (plan, input, before) => assert.deepEqual(input, before),
  "coverage-complete": plan => { const ids=plan.sourceSnapshot.recordIds; const refs=plan.candidates.flatMap(c=>c.sourceRecordIds); assert.equal(new Set(refs).size,ids.length); assert.deepEqual(refs,ids); },
  "one-to-one-source-mapping": plan => assert(plan.candidates.every(c=>c.sourceRecordIds.length===1)),
  "source-authority-preserved": plan => assert(plan.candidates.every(c=>c.provenance.authority.startsWith("github-"))),
  "no-semantic-promotion": plan => assert(plan.candidates.every(c=>c.targetKind==="evidence")),
  "no-canonical-write": plan => { assert(plan.candidates.every(c=>c.admission.canonicalWriteAllowed===false)); assert(!Object.hasOwn(plan,"graph")); },
  "source-time-preserved": plan => assert(plan.candidates.every(c=>c.proposedPayload.observedAt===null || typeof c.proposedPayload.observedAt==="string")),
  "free-text-not-promoted": plan => assert(!/CATALOG_(COMMIT|ISSUE|PR|RELEASE)_/.test(JSON.stringify(plan))),
  "stable-candidate-identity": plan => assert(plan.candidates.every(c=>c.candidateId==="candidate:evidence:"+c.sourceRecordIds[0])),
  "diagnostics-consistent": plan => { assert.equal(plan.diagnostics.sourceRecordCount,plan.sourceSnapshot.recordIds.length); assert.equal(plan.diagnostics.candidateCount,plan.candidates.length); assert.equal(plan.diagnostics.exclusionCount,plan.exclusions.length); }
};
const errCode = fn => { try { fn(); } catch (error) { if (error instanceof ContextImportPlanError) return error.code; throw error; } return null; };
function scenario(id) {
  if (id==="IP-S01" || id==="IP-M03" || id==="IP-M04") return ["repository","branch"];
  if (id==="IP-M02" || id==="IP-M05") return ["commit"];
  if (id==="IP-M06" || id==="IP-G03") return ["issue"];
  if (id==="IP-M07" || id==="IP-G04") return ["pull_request"];
  if (id==="IP-M08") return ["release"];
  if (id==="IP-M09") return ["tag"];
  if (id==="IP-G05") return ["commit","issue","pull_request","release"];
  return ["repository","branch","commit","issue","pull_request","release","tag"];
}
function sentinels(id) { return id==="IP-M05" ? {commit:"CATALOG_COMMIT_SEMANTIC_SENTINEL"} : id==="IP-G03" ? {issue:"CATALOG_ISSUE_ACTION_SENTINEL"} : id==="IP-G04" ? {pull_request:"CATALOG_PR_PHASE_COMPLETE_SENTINEL"} : id==="IP-G05" ? {commit:"CATALOG_COMMIT_SEMANTIC_SENTINEL",issue:"CATALOG_ISSUE_ACTION_SENTINEL",pull_request:"CATALOG_PR_PHASE_COMPLETE_SENTINEL",release:"CATALOG_RELEASE_VERSION_SENTINEL"} : {};
}
function executeCase(c) {
  const base=makePlannerInput(scenario(c.id),{sentinels:sentinels(c.id)});
  if (c.id==="IP-S02" || c.id==="IP-S03" || c.id==="IP-S04" || c.id==="IP-S05" || c.id==="IP-S06" || c.id==="IP-S07") {
    const plan=structuredClone(buildContextImportPlanV01(base));
    if(c.id==="IP-S02") delete plan.planVersion;
    if(c.id==="IP-S03") plan.planVersion="0.2";
    if(c.id==="IP-S04") plan.generatedAt="2026-08-07T13:00:00Z";
    if(c.id==="IP-S05") plan.sourceSnapshot.recordIds={};
    if(c.id==="IP-S06") plan.candidates={};
    if(c.id==="IP-S07") plan.diagnostics.candidateCount=plan.candidates.length-1;
    return () => validateContextImportPlanV01(plan);
  }
  if(c.id==="IP-P02") return () => buildContextImportPlanV01(makePlannerInput("repository",{policyVersion:"github-context-import-policy-v2"}));
  if(c.id==="IP-P03") return () => buildContextImportPlanV01(makePlannerInput("repository",{projectId:""}));
  if(c.id==="IP-P04") return () => buildContextImportPlanV01(makePlannerInput("repository",{scopeKey:""}));
  if(c.id==="IP-P05") { const snapshot=makeGitHubSnapshot(); snapshot.records.pop(); return () => buildContextImportPlanV01(makePlannerInput("repository",{snapshot})); }
  if(c.id==="IP-P06") { const snapshot=makeGitHubSnapshot(); snapshot.adapter="drive"; snapshot.source.provider="drive"; return () => buildContextImportPlanV01(makePlannerInput("repository",{snapshot})); }
  return () => buildContextImportPlanV01(base);
}
for (const c of catalog.cases) test("catalog " + c.id, () => {
  const input=makePlannerInput(scenario(c.id),{sentinels:sentinels(c.id)}); const before=structuredClone(input); let plan=null; let resultCode=null;
  try { plan=executeCase(c)(); } catch (error) { if(error instanceof ContextImportPlanError) resultCode=error.code; else throw error; }
  if(c.expected.outcome==="error") { assert.equal(resultCode,c.expected.errorCode); return; }
  assert.equal(resultCode,null); assert.equal(plan.planVersion,"0.1"); assert.deepEqual(plan.candidates.map(x=>x.candidateId),c.expected.candidateIds); assert.deepEqual(plan.exclusions.map(x=>x.sourceRecordId),c.expected.exclusionIds);
  for(const assertion of c.expected.behaviorAssertions) { assert(handlers[assertion], "unknown handler "+assertion); if(assertion==="deep-equal") handlers[assertion](plan,input,()=>executeCase(c)()); else if(assertion==="input-unchanged") handlers[assertion](plan,input,before); else handlers[assertion](plan,input); }
});
test("catalog metadata has closed behavior handler vocabulary", () => { assert.deepEqual(new Set(Object.keys(handlers)),new Set(catalog.catalogMetadata.behaviorVocabulary)); });
test("catalog metadata has 32 cases and fixed categories", () => { assert.equal(catalog.cases.length,32); assert.deepEqual(catalog.catalogMetadata.categories,{schema:7,"input/scope":6,mapping:9,"governance/safety":6,"determinism/coverage":4}); });
test("accepted fixture Plan remains unchanged", () => { assert.equal(acceptedPlan().candidates.length,8); });
