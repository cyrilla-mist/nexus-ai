import assert from "node:assert/strict";
import fs from "node:fs";
import graphExample from "../examples/nexus-atlas-self-context-v0.2.json" with { type: "json" };
import sourceExample from "../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };
import sourceCases from "../examples/nexus-atlas-source-snapshot-cases-v0.1.json" with { type: "json" };
import planExample from "../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };
import planCases from "../examples/nexus-atlas-context-import-plan-cases-v0.1.json" with { type: "json" };
import admissionExample from "../examples/nexus-atlas-canonical-admission-v0.1.json" with { type: "json" };
import admissionCases from "../examples/nexus-atlas-canonical-admission-cases-v0.1.json" with { type: "json" };
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import { SourceAdapterError, validateGitHubSourceSnapshotV01 } from "../experience/source-v01/source-snapshot-validator.mjs";
import { CAPTURED_AT, createGitHubClientFixture, createRequestedLimits } from "../tests/helpers/github-source-fixtures.mjs";
import { buildContextImportPlanV01 } from "../experience/source-v01/context-import-planner.mjs";
import { validateContextImportPlanV01 } from "../experience/source-v01/context-import-plan-validator.mjs";
import { applyCanonicalAdmissionPlanV01, buildCanonicalAdmissionPlanV01, GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 } from "../experience/context-v02/canonical-admission.mjs";
import { validateCanonicalAdmissionPlanV01 } from "../experience/context-v02/canonical-admission-validator.mjs";
import { validateContextGraph } from "../experience/context-v02/context-graph-validator.mjs";

const REPOSITORY_REF = "cyrilla-mist/nexus-ai";
const PROJECT_ID = "project:nexus-atlas";
const PRIVACY_SENTINEL = "PHASE4F_PRIVATE_SENTINEL_9f31c7";
let checks = 0;
const checked = async (name, fn) => { await fn(); checks += 1; console.log(`${name}: PASS`); };
const snapshotInput = capturedAt => ({ repositoryRef: REPOSITORY_REF, requestedLimits: createRequestedLimits(), capturedAt });
const plannerInput = snapshot => ({ snapshot, policyVersion: "github-context-import-policy-v1", projectId: PROJECT_ID, scopeKey: PROJECT_ID });
const buildAdmission = (graph, plan, ids) => buildCanonicalAdmissionPlanV01({ graph, plan, policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1, authorizedCandidateIds: ids });
const applyAdmission = (graph, plan, admissionPlan, ids) => applyCanonicalAdmissionPlanV01({ graph, importPlan: plan, admissionPlan, authorizedCandidateIds: ids });

console.log("Nexus Atlas Phase 4F Acceptance v0.1");

await checked("4F-A01 Accepted Source Snapshot validates", async () => { assert.deepEqual(validateGitHubSourceSnapshotV01(sourceExample.snapshot), sourceExample.snapshot); });
await checked("4F-A02 Accepted Import Plan validates", async () => { assert.deepEqual(validateContextImportPlanV01(planExample.plan), planExample.plan); });
await checked("4F-A03 Accepted Canonical Admission validates", async () => { assert.deepEqual(validateCanonicalAdmissionPlanV01(admissionExample.admissionPlan), admissionExample.admissionPlan); });
await checked("4F-A04 Accepted fixtures stay unchanged", async () => {
  const before = structuredClone({ graph: graphExample, snapshot: sourceExample.snapshot, plan: planExample.plan, admission: admissionExample.admissionPlan });
  validateGitHubSourceSnapshotV01(sourceExample.snapshot); validateContextImportPlanV01(planExample.plan); validateCanonicalAdmissionPlanV01(admissionExample.admissionPlan);
  assert.deepEqual({ graph: graphExample, snapshot: sourceExample.snapshot, plan: planExample.plan, admission: admissionExample.admissionPlan }, before);
});
await checked("4F-A05 Catalog closure", async () => {
  assert.equal(sourceCases.cases.length, 36); assert.equal(sourceCases.behaviorAssertionVocabulary.length, 12); assert.equal(new Set(sourceCases.behaviorAssertionVocabulary).size, 12);
  assert.equal(planCases.cases.length, 32); assert.equal(planCases.catalogMetadata.behaviorVocabulary.length, 12); assert.equal(new Set(planCases.catalogMetadata.behaviorVocabulary).size, 12);
  assert.equal(admissionCases.cases.length, 32); assert.equal(admissionCases.catalogMetadata.behaviorVocabulary.length, 14); assert.equal(new Set(admissionCases.catalogMetadata.behaviorVocabulary).size, 14);
});

async function expectSourceFailure(code, retryable) {
  const client = createGitHubClientFixture();
  client.getRepository = async () => { throw new SourceAdapterError(code, PRIVACY_SENTINEL, { operation: "getRepository", repositoryRef: REPOSITORY_REF, token: PRIVACY_SENTINEL }); };
  const adapter = createGitHubSourceAdapter({ client });
  let caught = null;
  try { await adapter.readSnapshot(snapshotInput(CAPTURED_AT)); } catch (error) { caught = error; }
  assert(caught instanceof SourceAdapterError); assert.equal(caught.code, code); assert.equal(caught.retryable, retryable);
  assert.deepEqual(Object.keys(caught.details).sort(), ["operation", "repositoryRef"]); assert.equal(caught.details.operation, "getRepository"); assert.equal(caught.details.repositoryRef, REPOSITORY_REF);
  assert(!JSON.stringify(caught.details).includes(PRIVACY_SENTINEL));
}
await checked("4F-B01 Authentication required policy", () => expectSourceFailure("SOURCE_AUTH_REQUIRED", false));
await checked("4F-B02 Forbidden policy", () => expectSourceFailure("SOURCE_FORBIDDEN", false));
await checked("4F-B03 Rate-limit policy", () => expectSourceFailure("SOURCE_RATE_LIMITED", true));
await checked("4F-B04 Unavailable policy", () => expectSourceFailure("SOURCE_UNAVAILABLE", true));
await checked("4F-B05 Not-found policy", () => expectSourceFailure("SOURCE_NOT_FOUND", false));
await checked("4F-B06 Error detail sanitization", async () => {
  const error = new SourceAdapterError("SOURCE_UNAVAILABLE", "unsafe", { operation: "listIssues", repositoryRef: REPOSITORY_REF, token: PRIVACY_SENTINEL, responseBody: PRIVACY_SENTINEL });
  assert.deepEqual(error.details, { operation: "listIssues", repositoryRef: REPOSITORY_REF }); assert(!JSON.stringify(error.details).includes(PRIVACY_SENTINEL));
});

const privacyClient = createGitHubClientFixture();
const originalGetRepository = privacyClient.getRepository.bind(privacyClient);
privacyClient.getRepository = async input => ({ ...(await originalGetRepository(input)), token: PRIVACY_SENTINEL, credential: PRIVACY_SENTINEL });
const originalCommits = privacyClient.listCommits.bind(privacyClient);
privacyClient.listCommits = async input => { const result = await originalCommits(input); result.items = result.items.map(item => ({ ...item, authorEmail: PRIVACY_SENTINEL, body: PRIVACY_SENTINEL })); return result; };
const originalIssues = privacyClient.listIssues.bind(privacyClient);
privacyClient.listIssues = async input => { const result = await originalIssues(input); result.items = result.items.map(item => ({ ...item, body: PRIVACY_SENTINEL, comments: [{ body: PRIVACY_SENTINEL }] })); return result; };
const originalPullRequests = privacyClient.listPullRequests.bind(privacyClient);
privacyClient.listPullRequests = async input => { const result = await originalPullRequests(input); result.items = result.items.map(item => ({ ...item, body: PRIVACY_SENTINEL, comments: [{ body: PRIVACY_SENTINEL }], reviews: [{ body: PRIVACY_SENTINEL }] })); return result; };
const privacySnapshot = await createGitHubSourceAdapter({ client: privacyClient }).readSnapshot(snapshotInput(CAPTURED_AT));
await checked("4F-C01 Repository secret excluded", async () => assert(!JSON.stringify(privacySnapshot).includes(PRIVACY_SENTINEL)));
await checked("4F-C02 Commit author email excluded", async () => assert(!JSON.stringify(privacySnapshot).includes("authorEmail")));
await checked("4F-C03 Issue and PR bodies excluded", async () => { assert(!JSON.stringify(privacySnapshot).includes('"body"')); assert(!JSON.stringify(privacySnapshot).includes('"comments"')); assert(!JSON.stringify(privacySnapshot).includes('"reviews"')); });
const privacyPlan = buildContextImportPlanV01(plannerInput(privacySnapshot));
const reviewedIds = [privacyPlan.candidates[0].candidateId, privacyPlan.candidates[2].candidateId];
const privacyAdmission = buildAdmission(graphExample, privacyPlan, reviewedIds);
const privacyApplied = applyAdmission(graphExample, privacyPlan, privacyAdmission, reviewedIds);
await checked("4F-C04 Privacy sentinel absent downstream", async () => { for (const artifact of [privacySnapshot, privacyPlan, privacyAdmission, privacyApplied]) assert(!JSON.stringify(artifact).includes(PRIVACY_SENTINEL)); });
await checked("4F-C05 GitHub references are bounded", async () => { for (const record of privacySnapshot.records) { assert(record.reference.startsWith("https://github.com/")); assert(!record.reference.includes("?")); assert(!record.reference.includes("#")); } });

await checked("4F-D01 Planner remains candidate-only", async () => { assert(privacyPlan.candidates.every(candidate => candidate.admission.canonicalWriteAllowed === false)); });
await checked("4F-D02 Explicit subset authorization", async () => {
  assert.equal(privacyAdmission.nodeProposals.length, reviewedIds.length);
  assert.deepEqual(privacyAdmission.decisions.filter(item => item.disposition !== "deferred").map(item => item.candidateId), reviewedIds);
});
await checked("4F-D03 Authorization ordering is deterministic and duplicates reject", async () => {
  assert.deepEqual(buildAdmission(graphExample, privacyPlan, [...reviewedIds].reverse()), privacyAdmission);
  assert.throws(() => buildAdmission(graphExample, privacyPlan, [reviewedIds[0], reviewedIds[0]]), error => error?.code === "INVALID_AUTHORIZATION_SELECTION");
});
await checked("4F-D04 Apply rebinds authorization", async () => { assert.throws(() => applyAdmission(graphExample, privacyPlan, privacyAdmission, [reviewedIds[0]]), error => error?.code === "CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH"); });
await checked("4F-D05 Unselected Candidates stay deferred", async () => {
  const selected = new Set(reviewedIds);
  for (const decision of privacyAdmission.decisions) if (!selected.has(decision.candidateId)) { assert.equal(decision.disposition, "deferred"); assert.equal(decision.reason, "not-authorized"); assert(!privacyAdmission.nodeProposals.some(item => item.id === decision.canonicalNodeId)); }
});
await checked("4F-D06 Admission proposals are Evidence only", async () => { assert(privacyAdmission.nodeProposals.every(proposal => proposal.kind === "evidence")); });
await checked("4F-D07 No semantic promotion", async () => {
  const forbidden = new Set(["project", "decision", "memory", "action", "identity", "risk", "goal"]); assert(privacyAdmission.nodeProposals.every(proposal => !forbidden.has(proposal.kind)));
});

await checked("4F-E01 End-to-end result is immutable and graph-valid", async () => {
  assert.doesNotThrow(() => validateContextGraph(privacyApplied));
  const visit = value => { if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(visit); } }; visit(privacyApplied);
});
await checked("4F-E02 Only authorized Evidence is added", async () => {
  assert.equal(privacyApplied.nodes.length, graphExample.nodes.length + reviewedIds.length);
  const newNodes = privacyApplied.nodes.filter(node => !graphExample.nodes.some(existing => existing.id === node.id)); assert.equal(newNodes.length, reviewedIds.length); assert(newNodes.every(node => node.kind === "evidence"));
});
await checked("4F-E03 Existing graph projections stay unchanged", async () => {
  assert.deepEqual(privacyApplied.edges, graphExample.edges); assert.deepEqual(privacyApplied.contextPackage, graphExample.contextPackage);
  assert.deepEqual(privacyApplied.nodes.find(node => node.id === PROJECT_ID), graphExample.nodes.find(node => node.id === PROJECT_ID));
});
await checked("4F-E04 Same observation is idempotent", async () => {
  const secondPlan = buildAdmission(privacyApplied, privacyPlan, reviewedIds); const reapplied = applyAdmission(privacyApplied, privacyPlan, secondPlan, reviewedIds); assert.deepEqual(reapplied, privacyApplied);
});
await checked("4F-E05 Later observation preserves Evidence history", async () => {
  const laterSnapshot = await createGitHubSourceAdapter({ client: createGitHubClientFixture() }).readSnapshot(snapshotInput("2026-08-08T12:00:00Z"));
  const laterPlan = buildContextImportPlanV01(plannerInput(laterSnapshot)); const candidateId = privacyPlan.candidates[2].candidateId; assert(laterPlan.candidates.some(candidate => candidate.candidateId === candidateId));
  const firstAdmission = buildAdmission(graphExample, privacyPlan, [candidateId]); const firstGraph = applyAdmission(graphExample, privacyPlan, firstAdmission, [candidateId]);
  const secondAdmission = buildAdmission(firstGraph, laterPlan, [candidateId]); const secondGraph = applyAdmission(firstGraph, laterPlan, secondAdmission, [candidateId]);
  const firstId = firstAdmission.nodeProposals[0].id; const secondId = secondAdmission.nodeProposals[0].id; assert.notEqual(firstId, secondId); assert(secondGraph.nodes.some(node => node.id === firstId)); assert(secondGraph.nodes.some(node => node.id === secondId));
});
await checked("4F-E06 Apply failure is atomic", async () => {
  const original = structuredClone(graphExample); const tampered = structuredClone(privacyAdmission); tampered.nodeProposals[0].payload.result = "tampered";
  assert.throws(() => applyAdmission(graphExample, privacyPlan, tampered, reviewedIds), error => error?.code === "CANONICAL_ADMISSION_SOURCE_MISMATCH"); assert.deepEqual(graphExample, original);
});

await checked("4F-F08 package-lock exclusion policy", async () => { const ignore = fs.readFileSync(new URL("../.gitignore", import.meta.url), "utf8"); assert.match(ignore, /(?:^|\n)\/package-lock\.json(?:\n|$)/); });

console.log(`Phase 4F dedicated checks: ${checks}/${checks} PASS`);
console.log("Phase 4F cross-layer acceptance: PASS");
