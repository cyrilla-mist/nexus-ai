import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../examples/nexus-atlas-canonical-admission-cases-v0.1.json" with { type: "json" };
import { buildCanonicalAdmissionPlanV01, applyCanonicalAdmissionPlanV01 } from "../experience/context-v02/canonical-admission.mjs";
import { validateCanonicalAdmissionPlanV01, CanonicalAdmissionError } from "../experience/context-v02/canonical-admission-validator.mjs";
import { acceptedGraph, planFor, planWithCapture, authorizedIds, candidateOf } from "./helpers/canonical-admission-fixtures.mjs";

const POLICY = "github-evidence-canonical-admission-v1";
const full = () => planFor(["repository", "branch", "commit", "issue", "pull_request", "release", "tag"]);
const build = (graph, plan, ids) => buildCanonicalAdmissionPlanV01({ graph, plan, policyVersion: POLICY, authorizedCandidateIds: ids });
const apply = (graph, plan, admission, ids) => applyCanonicalAdmissionPlanV01({ graph, importPlan: plan, admissionPlan: admission, authorizedCandidateIds: ids });
const expectCode = (fn, code) => assert.throws(fn, error => error instanceof CanonicalAdmissionError && error.code === code);
const repo = plan => candidateOf(plan, "repo");
const commit = plan => candidateOf(plan, "commit");
const issue = plan => candidateOf(plan, "issue");
const pr = plan => candidateOf(plan, "pr");
const release = plan => candidateOf(plan, "release");

const caseExecutors = {
  "CA-S01": () => { const p = build(acceptedGraph(), full(), authorizedIds(full())); const x = structuredClone(p); x.decisions[0].canonicalNodeId = "bad"; expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_NODE_ID_INVALID"); },
  "CA-S02": () => { const x = structuredClone(build(acceptedGraph(), full(), authorizedIds(full()))); delete x.admissionVersion; expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_ADMISSION_PLAN_INVALID"); },
  "CA-S03": () => { const x = structuredClone(build(acceptedGraph(), full(), authorizedIds(full()))); x.policyVersion = "other"; expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_ADMISSION_PLAN_INVALID"); },
  "CA-S04": () => { const x = structuredClone(build(acceptedGraph(), full(), authorizedIds(full()))); x.decisions = "bad"; expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_ADMISSION_PLAN_INVALID"); },
  "CA-S05": () => { const x = structuredClone(build(acceptedGraph(), full(), authorizedIds(full()))); x.nodeProposals.pop(); expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_ADMISSION_COVERAGE_MISMATCH"); },
  "CA-S06": () => { const x = structuredClone(build(acceptedGraph(), full(), authorizedIds(full()))); x.diagnostics.insertCount = 7; expectCode(() => validateCanonicalAdmissionPlanV01(x), "CANONICAL_ADMISSION_COVERAGE_MISMATCH"); },
  "CA-P01": () => { const p = full(); const a = build(acceptedGraph(), p, authorizedIds(p)); assert.equal(a.diagnostics.insertCount, 8); },
  "CA-P02": () => expectCode(() => buildCanonicalAdmissionPlanV01({ graph: acceptedGraph(), plan: full(), policyVersion: POLICY }), "INVALID_CANONICAL_ADMISSION_INPUT"),
  "CA-P03": () => expectCode(() => buildCanonicalAdmissionPlanV01({ graph: acceptedGraph(), plan: full(), policyVersion: "other", authorizedCandidateIds: [] }), "INVALID_ADMISSION_POLICY_VERSION"),
  "CA-P04": () => { const graph = acceptedGraph(); graph.nodes[0].scope.userId = ""; expectCode(() => build(graph, full(), []), "INVALID_CONTEXT_GRAPH"); },
  "CA-P05": () => { const p = structuredClone(full()); p.candidates.pop(); expectCode(() => build(acceptedGraph(), p, []), "INVALID_IMPORT_PLAN"); },
  "CA-P06": () => { const p = structuredClone(full()); p.target.projectId = "project:missing"; expectCode(() => build(acceptedGraph(), p, []), "TARGET_PROJECT_NOT_FOUND"); },
  "CA-P07": () => { const p = planFor(["repository", "branch"], { scopeKey: "other" }); expectCode(() => build(acceptedGraph(), p, []), "TARGET_SCOPE_UNSUPPORTED"); },
  "CA-A01": () => { const p = full(); const a = build(acceptedGraph(), p, [commit(p).candidateId]); assert.deepEqual(a.diagnostics, { candidateCount: 8, authorizedCount: 1, deferredCount: 7, proposalCount: 1, insertCount: 1, noopCount: 0, conflictCount: 0, applyAllowed: true }); },
  "CA-A02": () => { const p = full(); expectCode(() => build(acceptedGraph(), p, [p.candidates[0].candidateId, p.candidates[0].candidateId]), "INVALID_AUTHORIZATION_SELECTION"); },
  "CA-A03": () => expectCode(() => build(acceptedGraph(), full(), ["candidate:evidence:github:repo:unknown/x"]), "CANDIDATE_NOT_FOUND"),
  "CA-A04": () => { const p = full(); const id = repo(p).candidateId; const first = apply(acceptedGraph(), p, build(acceptedGraph(), p, [id]), [id]); const again = build(first, p, [id]); assert.equal(again.diagnostics.noopCount, 1); assert.equal(again.diagnostics.deferredCount, 7); },
  "CA-A05": () => { const p = full(); const ids = authorizedIds(p); const x = structuredClone(build(acceptedGraph(), p, ids)); x.nodeProposals[0].payload.observedAt = "2026-08-07T12:00:00Z"; expectCode(() => apply(acceptedGraph(), p, x, ids), "CANONICAL_ADMISSION_SOURCE_MISMATCH"); },
  "CA-A06": () => { const p = full(); const id = repo(p).candidateId; const probe = build(acceptedGraph(), p, [id]); const graph = acceptedGraph(); graph.nodes.push({ ...probe.nodeProposals[0], summary: "different", payload: { ...probe.nodeProposals[0].payload, claim: "different" } }); const x = build(graph, p, [id]); expectCode(() => apply(graph, p, x, [id]), "CANONICAL_APPLY_CONFLICT"); },
  "CA-A07": () => { const p = full(); const ids = authorizedIds(p); const first = apply(acceptedGraph(), p, build(acceptedGraph(), p, ids), ids); assert.equal(build(first, p, ids).diagnostics.noopCount, 8); },
  "CA-A08": () => { const p1 = planWithCapture(["repository", "branch", "commit"], "2026-08-07T12:00:00Z"); const p2 = planWithCapture(["repository", "branch", "commit"], "2026-08-08T12:00:00Z"); const c1 = commit(p1); const c2 = commit(p2); const first = apply(acceptedGraph(), p1, build(acceptedGraph(), p1, [c1.candidateId]), [c1.candidateId]); const second = build(first, p2, [c2.candidateId]); assert.equal(second.diagnostics.insertCount, 1); assert.equal(second.diagnostics.deferredCount, 2); },
  "CA-G01": () => { const p = full(); assert.ok(build(acceptedGraph(), p, authorizedIds(p)).nodeProposals.every(x => x.kind === "evidence")); },
  "CA-G02": () => { const p = full(); assert.ok(build(acceptedGraph(), p, authorizedIds(p)).nodeProposals.every(x => x.epistemic.freshness === "unknown" && x.governance.sensitivity === "personal")); },
  "CA-G03": () => { const graph = acceptedGraph(); graph.nodes.push({ ...graph.nodes.find(n => n.kind === "evidence"), id: "evidence:target" }); const p = structuredClone(full()); p.target.projectId = "evidence:target"; expectCode(() => build(graph, p, []), "TARGET_PROJECT_INVALID"); },
  "CA-G04": () => { const p = full(); const id = repo(p).candidateId; const admission = build(acceptedGraph(), p, [id]); expectCode(() => apply(acceptedGraph(), p, admission, []), "CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH"); },
  "CA-G05": () => { const p = planFor(["repository", "branch", "issue"]); const a = build(acceptedGraph(), p, [issue(p).candidateId]); assert.equal(a.diagnostics.insertCount, 1); assert.equal(a.diagnostics.deferredCount, 2); },
  "CA-G06": () => { const p = planFor(["repository", "branch", "pull_request", "release"]); const a = build(acceptedGraph(), p, [pr(p).candidateId, release(p).candidateId]); assert.equal(a.diagnostics.insertCount, 2); assert.equal(a.diagnostics.deferredCount, 2); },
  "CA-G07": () => { const p = full(); const graph = acceptedGraph(); const before = structuredClone(graph); apply(graph, p, build(graph, p, authorizedIds(p)), authorizedIds(p)); assert.deepEqual(graph.edges, before.edges); assert.deepEqual(graph.contextPackage, before.contextPackage); },
  "CA-C01": () => { const p = full(); assert.deepEqual(build(acceptedGraph(), p, authorizedIds(p)), build(acceptedGraph(), p, authorizedIds(p))); },
  "CA-C02": () => { const p = full(); const a = build(acceptedGraph(), p, authorizedIds(p)); assert.ok(Object.isFrozen(a)); },
  "CA-C03": () => { const p = full(); const a = build(acceptedGraph(), p, authorizedIds(p)); assert.deepEqual(a.decisions.map(x => x.candidateId), p.candidates.map(x => x.candidateId)); },
  "CA-C04": () => { const p = full(); const graph = acceptedGraph(); const result = apply(graph, p, build(graph, p, authorizedIds(p)), authorizedIds(p)); assert.equal(result.nodes.length, graph.nodes.length + 8); }
};

test("catalog has exact executor coverage", () => assert.deepEqual(new Set(Object.keys(caseExecutors)), new Set(catalog.cases.map(item => item.id))));
for (const item of catalog.cases) test(`catalog ${item.id}`, () => caseExecutors[item.id]());
