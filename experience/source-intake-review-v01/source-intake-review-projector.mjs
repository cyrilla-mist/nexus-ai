import { validateSourceSnapshotV01 } from "../source-v01/source-snapshot-validator.mjs";
import { validateContextImportPlanV01 } from "../source-v01/context-import-plan-validator.mjs";
import { buildCanonicalAdmissionPlanV01, GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 } from "../context-v02/canonical-admission.mjs";
import { sourceIntakeReviewIdV01, validateSourceIntakeReviewV01, SourceIntakeReviewError } from "./source-intake-review-validator.mjs";

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);
const freeze = value => { if ((object(value) || Array.isArray(value)) && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const fail = (code, message) => { throw new SourceIntakeReviewError(code, message); };

function matchUpstream(snapshot, plan) {
  if (snapshot.snapshotVersion !== plan.sourceSnapshot.snapshotVersion || snapshot.adapter !== plan.sourceSnapshot.adapter || snapshot.capturedAt !== plan.sourceSnapshot.capturedAt || snapshot.scope?.repositoryRef !== plan.sourceSnapshot.repositoryRef || JSON.stringify(snapshot.records.map(record => record.sourceRecordId)) !== JSON.stringify(plan.sourceSnapshot.recordIds)) fail("SOURCE_INTAKE_SOURCE_INVALID", "Snapshot and Import Plan source descriptors do not match");
}

function validateInputs(snapshot, plan) {
  let acceptedSnapshot; let acceptedPlan;
  try { acceptedSnapshot = validateSourceSnapshotV01(snapshot); } catch { fail("SOURCE_INTAKE_SOURCE_INVALID", "Source Snapshot is not accepted"); }
  try { acceptedPlan = validateContextImportPlanV01(plan); } catch { fail("SOURCE_INTAKE_SOURCE_INVALID", "Context Import Plan is not accepted"); }
  matchUpstream(acceptedSnapshot, acceptedPlan);
  return { snapshot: acceptedSnapshot, plan: acceptedPlan };
}

function normalizeSelection(selectedCandidateIds) {
  if (selectedCandidateIds === undefined) return [];
  if (!Array.isArray(selectedCandidateIds)) fail("SOURCE_INTAKE_SELECTION_INVALID", "selectedCandidateIds must be an array");
  if (new Set(selectedCandidateIds).size !== selectedCandidateIds.length || selectedCandidateIds.some(id => typeof id !== "string" || !id.trim() || id !== id.trim())) fail("SOURCE_INTAKE_SELECTION_INVALID", "selectedCandidateIds must be unique trimmed IDs");
  return selectedCandidateIds;
}

function safeSource(snapshot, plan) {
  const source = snapshot.source;
  return {
    provider: source.provider,
    scopeRef: snapshot.scope.repositoryRef,
    state: source.state,
    capturedAt: snapshot.capturedAt,
    retrievalMode: source.retrievalMode,
    authority: source.authority,
    recordCount: plan.sourceSnapshot.recordIds.length,
    diagnostics: { complete: snapshot.diagnostics.complete, sourceRecordCount: plan.sourceSnapshot.recordIds.length, candidateCount: plan.candidates.length, exclusionCount: plan.exclusions.length }
  };
}

function projectCandidate(candidate, snapshot, selectedSet) {
  const record = snapshot.records.find(item => item.sourceRecordId === candidate.sourceRecordIds[0]);
  if (!record) fail("SOURCE_INTAKE_SOURCE_INVALID", `Candidate source record is absent: ${candidate.sourceRecordIds[0]}`);
  return {
    candidateId: candidate.candidateId,
    sourceRecordId: candidate.sourceRecordIds[0],
    canonicalKind: "evidence",
    title: candidate.title,
    summary: candidate.summary,
    provenance: { ...candidate.provenance },
    admission: { ...candidate.admission },
    privacy: { sensitivity: null, payloadOmitted: true },
    selectionState: selectedSet.has(candidate.candidateId) ? "selected" : "deferred"
  };
}

function proposalPreview(candidate) {
  return { candidateId: candidate.candidateId, sourceRecordId: candidate.sourceRecordId, canonicalKind: "evidence", title: candidate.title, summary: candidate.summary, provenance: { ...candidate.provenance } };
}

function preview(candidates, selected, deferred, graph, plan) {
  let reconciliation = "not-run"; let insertCount = null; let noopCount = null; let conflictCount = null; let proposals;
  if (graph !== undefined) {
    if (!object(graph)) fail("SOURCE_INTAKE_PREVIEW_INVALID", "Optional Context Graph must be an object");
    let admissionPlan;
    try { admissionPlan = buildCanonicalAdmissionPlanV01({ graph, plan, policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1, authorizedCandidateIds: selected }); } catch (error) { throw new SourceIntakeReviewError("SOURCE_INTAKE_PREVIEW_INVALID", `Canonical Admission preview failed: ${error.code || error.message}`); }
    reconciliation = "admission-plan";
    insertCount = admissionPlan.diagnostics.insertCount; noopCount = admissionPlan.diagnostics.noopCount; conflictCount = admissionPlan.diagnostics.conflictCount;
    proposals = candidates.filter(candidate => selected.includes(candidate.candidateId)).map(proposalPreview);
  } else {
    proposals = candidates.filter(candidate => selected.includes(candidate.candidateId)).map(proposalPreview);
  }
  return {
    selectedCandidateIds: [...selected],
    proposals,
    deferredCandidateIds: [...deferred],
    diagnostics: { candidateCount: candidates.length, authorizedCount: selected.length, deferredCount: deferred.length, proposalCount: proposals.length, insertCount, noopCount, conflictCount, applyAllowed: false },
    resultMode: "in-memory-preview",
    reconciliation,
    persistentWrite: false,
    graphMutation: false,
    edgeCreation: false,
    semanticPromotion: false
  };
}

export function buildSourceIntakeReviewV01({ snapshot, importPlan, selectedCandidateIds, graph } = {}) {
  if (!exactKeys(arguments[0] || {}, ["snapshot", "importPlan", "selectedCandidateIds", "graph"].filter(key => key !== "selectedCandidateIds" && key !== "graph" || Object.hasOwn(arguments[0] || {}, key)))) fail("INVALID_SOURCE_INTAKE_REVIEW", "Source Intake Review input shape is invalid");
  const accepted = validateInputs(snapshot, importPlan); const selectedInput = normalizeSelection(selectedCandidateIds); const candidateIds = new Set(accepted.plan.candidates.map(candidate => candidate.candidateId));
  if (selectedInput.some(id => !candidateIds.has(id))) fail("SOURCE_INTAKE_SELECTION_INVALID", "Unknown Candidate ID selected");
  const selected = accepted.plan.candidates.map(candidate => candidate.candidateId).filter(id => selectedInput.includes(id)); const deferred = accepted.plan.candidates.map(candidate => candidate.candidateId).filter(id => !selected.includes(id)); const selectedSet = new Set(selected);
  const candidates = accepted.plan.candidates.map(candidate => projectCandidate(candidate, accepted.snapshot, selectedSet));
  const review = {
    version: "nexus-atlas.source-intake-review.v0.1",
    reviewId: null,
    source: safeSource(accepted.snapshot, accepted.plan),
    candidates,
    selection: { selectedCandidateIds: selected, selectionMode: "explicit-only", deferredCandidateIds: deferred },
    admissionPreview: preview(candidates, selected, deferred, graph, accepted.plan),
    capabilities: { liveRead: false, sourceReread: false, persistentWrite: false, canonicalGraphMutation: false, edgeCreation: false, semanticPromotion: false }
  };
  review.reviewId = sourceIntakeReviewIdV01(review);
  return freeze(clone(validateSourceIntakeReviewV01(review)));
}
