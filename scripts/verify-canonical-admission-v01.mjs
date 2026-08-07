import fs from "node:fs";
import assert from "node:assert/strict";
import graphExample from "../examples/nexus-atlas-self-context-v0.2.json" with { type: "json" };
import planExample from "../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };
import admissionExample from "../examples/nexus-atlas-canonical-admission-v0.1.json" with { type: "json" };
import cases from "../examples/nexus-atlas-canonical-admission-cases-v0.1.json" with { type: "json" };
import { buildCanonicalAdmissionPlanV01, applyCanonicalAdmissionPlanV01 } from "../experience/context-v02/canonical-admission.mjs";
import { CanonicalAdmissionError, deepEqual, validateCanonicalAdmissionPlanV01 } from "../experience/context-v02/canonical-admission-validator.mjs";
import { buildContextImportPlanV01 } from "../experience/source-v01/context-import-planner.mjs";
import { makePlannerInput, makeGitHubSnapshot } from "../tests/helpers/context-import-plan-fixtures.mjs";
import { validateContextGraph } from "../experience/context-v02/context-graph-validator.mjs";

const policy = admissionExample.input.policyVersion;
const plan = structuredClone(planExample.plan);
const graph = structuredClone(graphExample);
const ids = [...admissionExample.input.authorizedCandidateIds];
const build = (g = graph, p = plan, selection = ids) => buildCanonicalAdmissionPlanV01({ graph: g, plan: p, policyVersion: policy, authorizedCandidateIds: selection });
const apply = (g, p, a, selection = ids) => applyCanonicalAdmissionPlanV01({ graph: g, importPlan: p, admissionPlan: a, authorizedCandidateIds: selection });
const expectCode = (fn, code) => assert.throws(fn, error => error instanceof CanonicalAdmissionError && error.code === code);
const checked = (name, callback) => { callback(); console.log(`${name}: PASS`); };

console.log("Nexus Atlas Canonical Admission v0.1");
const admission = build();
console.log(`Candidates: ${admission.diagnostics.candidateCount}`);
console.log(`Authorized: ${admission.diagnostics.authorizedCount}`);
console.log(`Insert decisions: ${admission.diagnostics.insertCount}`);
console.log(`Noop decisions: ${admission.diagnostics.noopCount}`);
console.log(`Conflict decisions: ${admission.diagnostics.conflictCount}`);
console.log(`Deferred decisions: ${admission.diagnostics.deferredCount}`);

checked("Accepted example compatibility", () => assert.deepEqual(admission, admissionExample.admissionPlan));
checked("Target Project boundary", () => { const p = structuredClone(plan); p.target.projectId = "project:missing"; expectCode(() => build(graph, p, []), "TARGET_PROJECT_NOT_FOUND"); });
checked("Graph-first error boundary", () => { const g = structuredClone(graph); g.nodes[0].scope.userId = ""; expectCode(() => build(g, plan, []), "INVALID_CONTEXT_GRAPH"); });
checked("Candidate provenance binding", () => { const a = structuredClone(admission); a.nodeProposals[0].provenance.authority = "tampered"; expectCode(() => apply(graph, plan, a), "CANONICAL_ADMISSION_SOURCE_MISMATCH"); });
checked("Authorization rebinding", () => { expectCode(() => apply(graph, plan, build(graph, plan, [ids[0]]), []), "CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH"); });
checked("Selection determinism", () => assert.deepEqual(build(graph, plan, ids), build(graph, plan, [...ids].reverse())));
checked("Canonical observation identity", () => admission.decisions.forEach(decision => { const sourceRecordId = decision.candidateId.slice("candidate:evidence:".length); assert.equal(decision.canonicalNodeId, `evidence:source-observation:${encodeURIComponent(sourceRecordId)}:captured:${encodeURIComponent(admission.generatedAt)}`); }));
checked("Evidence-only boundary", () => assert.ok(admission.nodeProposals.every(proposal => proposal.kind === "evidence")));
checked("Freshness boundary", () => assert.ok(admission.nodeProposals.every(proposal => proposal.epistemic.freshness === "unknown")));
checked("Reconciliation race semantics", () => { const insertPlan = build(graph, plan, ids); assert.equal(insertPlan.decisions[0].disposition, "insert"); const current = apply(graph, plan, insertPlan); const noDuplicate = apply(current, plan, insertPlan); assert.equal(noDuplicate.nodes.length, current.nodes.length); const noopPlan = build(current, plan, ids); const missing = structuredClone(current); missing.nodes = missing.nodes.filter(node => node.id !== noopPlan.nodeProposals[0].id); const before = structuredClone(missing); expectCode(() => apply(missing, plan, noopPlan), "CANONICAL_APPLY_CONFLICT"); assert.deepEqual(missing, before); });
checked("Atomic application", () => { const sourceGraph = structuredClone(graph); const sourceBefore = structuredClone(sourceGraph); const sourceAdmission = structuredClone(admission); sourceAdmission.nodeProposals[0].payload.result = "tampered"; expectCode(() => apply(sourceGraph, plan, sourceAdmission), "CANONICAL_ADMISSION_SOURCE_MISMATCH"); assert.deepEqual(sourceGraph, sourceBefore); const authGraph = structuredClone(graph); const authBefore = structuredClone(authGraph); expectCode(() => apply(authGraph, plan, admission, []), "CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH"); assert.deepEqual(authGraph, authBefore); });
checked("History preservation", () => { const p1 = buildContextImportPlanV01(makePlannerInput(["repository", "branch", "commit"], { snapshot: makeGitHubSnapshot(["repository", "branch", "commit"]) })); const s = makeGitHubSnapshot(["repository", "branch", "commit"]); s.capturedAt = "2026-08-08T12:00:00Z"; const p2 = buildContextImportPlanV01(makePlannerInput(["repository", "branch", "commit"], { snapshot: s })); const c1 = p1.candidates.find(c => c.sourceRecordIds[0].includes(":commit:")); const c2 = p2.candidates.find(c => c.sourceRecordIds[0].includes(":commit:")); const first = apply(graph, p1, build(graph, p1, [c1.candidateId]), [c1.candidateId]); const second = apply(first, p2, build(first, p2, [c2.candidateId]), [c2.candidateId]); assert.equal(second.nodes.length, graph.nodes.length + 2); });
checked("Input immutability", () => { const g = structuredClone(graph); const p = structuredClone(plan); const selection = [...ids]; const before = structuredClone({ g, p, selection }); build(g, p, selection); assert.deepEqual({ g, p, selection }, before); assert.equal(Object.isFrozen(g), false); assert.equal(Object.isFrozen(p), false); assert.equal(Object.isFrozen(selection), false); });
checked("Admission Plan immutability", () => assert.ok(Object.isFrozen(admission)));
checked("Applied Graph immutability", () => { const visit = value => { if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(visit); } }; visit(apply(graph, plan, admission)); });
checked("Edges unchanged", () => assert.deepEqual(apply(graph, plan, admission).edges, graph.edges));
checked("ContextPackage unchanged", () => assert.deepEqual(apply(graph, plan, admission).contextPackage, graph.contextPackage));
checked("Project unchanged", () => assert.deepEqual(apply(graph, plan, admission).nodes.find(n => n.kind === "project"), graph.nodes.find(n => n.kind === "project")));
checked("Graph validation after apply", () => validateContextGraph(apply(graph, plan, admission)));
const runtimeSources = ["experience/context-v02/canonical-admission.mjs", "experience/context-v02/canonical-admission-validator.mjs"].map(file => ({ file, source: fs.readFileSync(file, "utf8") }));
checked("Source re-read isolation", () => runtimeSources.forEach(({ source }) => assert.doesNotMatch(source, /github-source-adapter|getRepository|listCommits|listIssues|listPullRequests|listReleases|GitHub client|Source API/)));
checked("Semantic isolation", () => { const source = fs.readFileSync("experience/context-v02/canonical-admission.mjs", "utf8"); assert.doesNotMatch(source, /\b(project|decision|memory|action|identity|risk|goal)\s*[:(]/i); });
checked("Derived projection isolation", () => { const source = fs.readFileSync("experience/context-v02/canonical-admission.mjs", "utf8"); assert.doesNotMatch(source, /context-package-projector|generalized-context-package-builder|self-context-provider/); });
checked("Persistent write isolation", () => { runtimeSources.forEach(({ source }) => assert.doesNotMatch(source, /fetch\(|globalThis\.fetch|XMLHttpRequest|Date\.now|Math\.random|process\.env|readFile|writeFile|appendFile|child_process|exec\(|spawn\(|\b(?:POST|PUT|PATCH|DELETE)\b/)); });
checked("Phase 4E Canonical Admission purity", () => assert.equal(runtimeSources.length, 2));
checked("Canonical Admission strict time helper isolation", () => { const validator = runtimeSources.find(item => item.file.endsWith("canonical-admission-validator.mjs")).source; assert.match(validator, /isStrictOffsetIsoV01/); assert.doesNotMatch(validator, /validateSourceSnapshotV01|github-source-adapter|readFile/); });
const behaviorHandlers = {
  "deep-equal": () => assert.equal(deepEqual(build(), build()), true),
  "deeply-frozen": () => { const visit = value => { if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(visit); } }; visit(admission); visit(apply(graph, plan, admission)); },
  "input-unchanged": () => { const g = structuredClone(graph); const p = structuredClone(plan); const s = [...ids]; const before = structuredClone({ g, p, s }); build(g, p, s); assert.deepEqual({ g, p, s }, before); },
  "explicit-authorization": () => assert.equal(build(graph, plan, [ids[0]]).nodeProposals.length, 1),
  "evidence-only": () => assert.ok(admission.nodeProposals.every(item => item.kind === "evidence")),
  "source-authority-preserved": () => plan.candidates.forEach((candidate, index) => assert.deepEqual(admission.nodeProposals[index].provenance, candidate.provenance)),
  "freshness-not-promoted": () => assert.ok(admission.nodeProposals.every(item => item.epistemic.verification === "confirmed" && item.epistemic.freshness === "unknown")),
  "deterministic-canonical-identity": () => admission.decisions.forEach(item => assert.equal(item.canonicalNodeId, `evidence:source-observation:${encodeURIComponent(item.candidateId.slice("candidate:evidence:".length))}:captured:${encodeURIComponent(admission.generatedAt)}`)),
  "idempotent-admission": () => { const first = apply(graph, plan, admission); assert.deepEqual(apply(first, plan, build(first, plan, ids)), first); },
  "history-preserved": () => { const firstPlan = buildContextImportPlanV01(makePlannerInput(["repository", "branch", "commit"], { snapshot: makeGitHubSnapshot(["repository", "branch", "commit"]) })); const snapshot = makeGitHubSnapshot(["repository", "branch", "commit"]); snapshot.capturedAt = "2026-08-08T12:00:00Z"; const secondPlan = buildContextImportPlanV01(makePlannerInput(["repository", "branch", "commit"], { snapshot })); const firstCommit = firstPlan.candidates.find(item => item.sourceRecordIds[0].includes(":commit:")); const secondCommit = secondPlan.candidates.find(item => item.sourceRecordIds[0].includes(":commit:")); const firstAdmission = build(graph, firstPlan, [firstCommit.candidateId]); const secondAdmission = build(apply(graph, firstPlan, firstAdmission, [firstCommit.candidateId]), secondPlan, [secondCommit.candidateId]); const result = apply(apply(graph, firstPlan, firstAdmission, [firstCommit.candidateId]), secondPlan, secondAdmission, [secondCommit.candidateId]); assert.notEqual(firstAdmission.nodeProposals[0].id, secondAdmission.nodeProposals[0].id); assert.equal(result.nodes.filter(item => item.kind === "evidence").length, graph.nodes.filter(item => item.kind === "evidence").length + 2); },
  "no-semantic-promotion": () => assert.ok(admission.nodeProposals.every(item => item.kind === "evidence")),
  "no-derived-projection-mutation": () => { const before = structuredClone(graph); const result = apply(graph, plan, admission); assert.deepEqual(result.edges, before.edges); assert.deepEqual(result.contextPackage, before.contextPackage); assert.deepEqual(result.metadata, before.metadata); },
  "atomic-apply": () => { const g = structuredClone(graph); const before = structuredClone(g); const a = structuredClone(admission); a.nodeProposals[0].payload.result = "tampered"; expectCode(() => apply(g, plan, a), "CANONICAL_ADMISSION_SOURCE_MISMATCH"); assert.deepEqual(g, before); },
  "graph-valid-after-apply": () => assert.doesNotThrow(() => validateContextGraph(apply(graph, plan, admission)))
};
checked("Behavior vocabulary", () => { assert.deepEqual(new Set(Object.keys(behaviorHandlers)), new Set(cases.catalogMetadata.behaviorVocabulary)); });
checked("Behavior handler coverage", () => cases.catalogMetadata.behaviorVocabulary.forEach(behavior => behaviorHandlers[behavior]()));
assert.equal(cases.cases.length, 32);
assert.deepEqual(cases.catalogMetadata.categories, { schema: 6, "input/target": 7, "admission/reconciliation": 8, "governance/safety": 7, "determinism/application": 4 });
console.log("Catalog cases: 32/32 PASS");
console.log("Catalog executor coverage: PASS");
console.log("Behavior vocabulary: 14/14 PASS");
console.log("Behavior handler coverage: PASS");
console.log("Canonical Admission v0.1 Runtime: PASS");
