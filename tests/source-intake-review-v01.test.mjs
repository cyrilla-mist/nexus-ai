import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import sourceExample from "../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };
import planExample from "../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };
import { acceptedGraph } from "./helpers/canonical-admission-fixtures.mjs";
import { buildSourceIntakeReviewV01 } from "../experience/source-intake-review-v01/source-intake-review-projector.mjs";
import { SourceIntakeReviewError, validateSourceIntakeReviewV01 } from "../experience/source-intake-review-v01/source-intake-review-validator.mjs";

const source = () => structuredClone(sourceExample.snapshot);
const plan = () => structuredClone(planExample.plan);
const build = (options = {}) => buildSourceIntakeReviewV01({ snapshot: source(), importPlan: plan(), ...options });
const ids = () => plan().candidates.map(candidate => candidate.candidateId);
const expectCode = (fn, code) => assert.throws(fn, error => error instanceof SourceIntakeReviewError && error.code === code);

test("5E-A01 accepted Snapshot and Import Plan bind without source access", () => { const review = build(); assert.equal(review.source.provider, "github"); assert.equal(review.candidates.length, 8); });
test("5E-A02 source metadata preserves accepted safe fields", () => { const review = build(); assert.deepEqual(review.source, { provider: "github", scopeRef: "cyrilla-mist/nexus-ai", state: "available", capturedAt: "2026-08-07T12:00:00Z", retrievalMode: "read-only-api", authority: "github-repository-state", recordCount: 8, diagnostics: { complete: true, sourceRecordCount: 8, candidateCount: 8, exclusionCount: 0 } }); });
test("5E-A03 source diagnostics contain bounded counters only", () => { const review = build(); assert.deepEqual(Object.keys(review.source.diagnostics).sort(), ["candidateCount", "complete", "exclusionCount", "sourceRecordCount"]); });
test("5E-A04 Snapshot and Import Plan mismatch fails locally", () => { const broken = source(); broken.capturedAt = "2026-08-07T13:00:00Z"; expectCode(() => buildSourceIntakeReviewV01({ snapshot: broken, importPlan: plan() }), "SOURCE_INTAKE_SOURCE_INVALID"); });
test("5E-A05 unsupported provider-native input is rejected at the handoff", () => { const broken = source(); broken.adapter = "github-enterprise"; expectCode(() => buildSourceIntakeReviewV01({ snapshot: broken, importPlan: plan() }), "SOURCE_INTAKE_SOURCE_INVALID"); });
test("5E-A06 omitted upstream payload remains omitted", () => { const review = build(); assert.equal(review.candidates[0].privacy.payloadOmitted, true); assert.equal(Object.hasOwn(review.candidates[0], "payload"), false); });
test("5E-A07 identical accepted inputs produce identical review output", () => { assert.deepEqual(build(), build()); });

test("5E-B01 accepted Candidate projects to exactly one review item", () => { const review = build({ selectedCandidateIds: [ids()[0]] }); assert.equal(review.candidates.filter(candidate => candidate.selectionState === "selected").length, 1); });
test("5E-B02 Candidate canonical kind is Evidence", () => { assert(build().candidates.every(candidate => candidate.canonicalKind === "evidence")); });
test("5E-B03 Candidate admission boundary is preserved", () => { assert(build().candidates.every(candidate => candidate.admission.stage === "candidate" && candidate.admission.canonicalWriteAllowed === false && candidate.admission.confirmationRequirement === "source-authority-sufficient")); });
test("5E-B04 Candidate provenance fields are preserved", () => { const candidate = build().candidates[2]; assert.deepEqual(candidate.provenance, plan().candidates[2].provenance); });
test("5E-B05 Candidate projection excludes raw payload and private source fields", () => { const review = build(); for (const candidate of review.candidates) for (const forbidden of ["payload", "proposedPayload", "body", "comments", "reviews", "authorEmail", "token", "credential"]) assert.equal(Object.hasOwn(candidate, forbidden), false); });
test("5E-B06 Candidate order follows the Import Plan order", () => { assert.deepEqual(build().candidates.map(candidate => candidate.sourceRecordId), plan().candidates.map(candidate => candidate.sourceRecordIds[0])); });
test("5E-B07 malformed Candidate identity fails before or during projection", () => { const broken = plan(); broken.candidates[0].sourceRecordIds[0] = "github:repo:other/repository"; expectCode(() => buildSourceIntakeReviewV01({ snapshot: source(), importPlan: broken }), "SOURCE_INTAKE_SOURCE_INVALID"); const review = structuredClone(build()); review.candidates[0].candidateId = "candidate:evidence:other"; expectCode(() => validateSourceIntakeReviewV01(review), "SOURCE_INTAKE_CANDIDATE_INVALID"); });

test("5E-C01 empty selection defers every Candidate", () => { const review = build(); assert.equal(review.selection.selectedCandidateIds.length, 0); assert.equal(review.selection.deferredCandidateIds.length, 8); assert(review.candidates.every(candidate => candidate.selectionState === "deferred")); });
test("5E-C02 explicit subset selects only supplied IDs", () => { const selected = [ids()[3], ids()[0]]; const review = build({ selectedCandidateIds: selected }); assert.deepEqual(review.selection.selectedCandidateIds, [ids()[0], ids()[3]]); });
test("5E-C03 omitted selection never means select-all", () => { assert.equal(build().selection.selectedCandidateIds.length, 0); });
test("5E-C04 duplicate selection IDs are rejected", () => { expectCode(() => build({ selectedCandidateIds: [ids()[0], ids()[0]] }), "SOURCE_INTAKE_SELECTION_INVALID"); });
test("5E-C05 unknown selection IDs are rejected", () => { expectCode(() => build({ selectedCandidateIds: ["candidate:evidence:unknown"] }), "SOURCE_INTAKE_SELECTION_INVALID"); });
test("5E-C06 deselection returns the Candidate to deferred state", () => { const selected = build({ selectedCandidateIds: [ids()[0]] }); const deselected = build(); assert.equal(selected.candidates[0].selectionState, "selected"); assert.equal(deselected.candidates[0].selectionState, "deferred"); const broken = structuredClone(selected); broken.candidates[1].selectionState = "selected"; expectCode(() => validateSourceIntakeReviewV01(broken), "SOURCE_INTAKE_SELECTION_INVALID"); });

test("5E-D01 source-local authority is not promoted", () => { const review = build(); assert.equal(review.source.authority, "github-repository-state"); assert.equal(review.candidates[0].provenance.authority, "github-repository-state"); assert.equal(Object.hasOwn(review.candidates[0].provenance, "humanConfirmed"), false); });
test("5E-D02 capture time remains independent from selection", () => { const review = build({ selectedCandidateIds: [ids()[0]] }); assert.equal(review.source.capturedAt, "2026-08-07T12:00:00Z"); assert.equal(review.candidates[0].provenance.capturedAt, review.source.capturedAt); });
test("5E-D03 unsafe provenance reference is rejected by the review validator", () => { const review = structuredClone(build()); review.candidates[0].provenance.reference = "https://github.com/cyrilla-mist/nexus-ai?token=secret"; expectCode(() => validateSourceIntakeReviewV01(review), "SOURCE_INTAKE_PRIVACY_VIOLATION"); });
test("5E-D04 sensitivity remains an explicit omission when upstream has none", () => { assert.equal(build().candidates[0].privacy.sensitivity, null); });
test("5E-D05 restricted payload cannot be reconstructed", () => { const review = build(); assert.deepEqual(review.candidates[0].privacy, { sensitivity: null, payloadOmitted: true }); });
test("5E-D06 provenance tampering is rejected", () => { const review = structuredClone(build()); review.candidates[0].provenance.provider = "other"; expectCode(() => validateSourceIntakeReviewV01(review), "SOURCE_INTAKE_CANDIDATE_INVALID"); });

test("5E-E01 selected Candidates create Evidence-only preview proposals", () => { const review = build({ selectedCandidateIds: ids().slice(0, 2) }); assert.equal(review.admissionPreview.proposals.length, 2); assert(review.admissionPreview.proposals.every(proposal => proposal.canonicalKind === "evidence")); });
test("5E-E02 unselected Candidates create no proposal and remain deferred", () => { const review = build({ selectedCandidateIds: [ids()[0]] }); assert.equal(review.admissionPreview.proposals.length, 1); assert.equal(review.admissionPreview.deferredCandidateIds.length, 7); });
test("5E-E03 preview declares in-memory mode", () => { assert.equal(build().admissionPreview.resultMode, "in-memory-preview"); });
test("5E-E04 preview write flags are all false", () => { const preview = build({ selectedCandidateIds: [ids()[0]] }).admissionPreview; assert.equal(preview.diagnostics.applyAllowed, false); assert.equal(preview.persistentWrite, false); assert.equal(preview.graphMutation, false); assert.equal(preview.edgeCreation, false); assert.equal(preview.semanticPromotion, false); });
test("5E-E05 no Graph is required and no injected Graph is mutated", () => { const graph = acceptedGraph(); const before = structuredClone(graph); build({ selectedCandidateIds: [ids()[0]] }); assert.deepEqual(graph, before); });
test("5E-E06 optional injected Graph enables pure Admission Plan preview", () => { const review = build({ selectedCandidateIds: [ids()[0]], graph: acceptedGraph() }); assert.equal(review.admissionPreview.reconciliation, "admission-plan"); assert(Number.isSafeInteger(review.admissionPreview.diagnostics.insertCount)); });
test("5E-E07 preview cannot claim semantic promotion", () => { const review = build({ selectedCandidateIds: ids().slice(0, 2) }); assert.equal(review.admissionPreview.semanticPromotion, false); assert.equal(review.capabilities.semanticPromotion, false); });

test("5E-F01 projector has no source transport or persistence dependency", async () => { const sourceText = await fs.readFile("experience/source-intake-review-v01/source-intake-review-projector.mjs", "utf8"); assert.doesNotMatch(sourceText, /fetch\(|readFile\(|writeFile\(|appendFile\(|POST|OAuth/); });
test("5E-F02 projector does not implement refresh or source reread", () => { const review = build(); assert.equal(review.capabilities.liveRead, false); assert.equal(review.capabilities.sourceReread, false); });
test("5E-F03 review output is deeply immutable", () => { const review = build({ selectedCandidateIds: [ids()[0]] }); assert(Object.isFrozen(review)); assert(Object.isFrozen(review.candidates[0])); assert(Object.isFrozen(review.admissionPreview.diagnostics)); });
test("5E-F04 upstream Snapshot and Import Plan remain unchanged", () => { const snapshot = source(); const importPlan = plan(); const beforeSnapshot = structuredClone(snapshot); const beforePlan = structuredClone(importPlan); buildSourceIntakeReviewV01({ snapshot, importPlan, selectedCandidateIds: [importPlan.candidates[0].candidateId] }); assert.deepEqual(snapshot, beforeSnapshot); assert.deepEqual(importPlan, beforePlan); });
test("5E-F05 invalid review input fails atomically", () => { expectCode(() => buildSourceIntakeReviewV01({ snapshot: source() }), "INVALID_SOURCE_INTAKE_REVIEW"); });
test("5E-F06 accepted upstream validators remain the source of truth", () => { const review = build(); assert.equal(review.source.recordCount, plan().diagnostics.sourceRecordCount); assert.equal(review.candidates.length, plan().diagnostics.candidateCount); });
test("5E-F07 Phase 5C and Phase 5D surfaces are not imported by the projector", async () => { const sourceText = await fs.readFile("experience/source-intake-review-v01/source-intake-review-projector.mjs", "utf8"); assert.doesNotMatch(sourceText, /atlas-desk|atlas-app|inspectorIndex|Identity Context/); });

assert.equal(ids().length, 8);
