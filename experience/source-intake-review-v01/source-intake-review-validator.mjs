export const SOURCE_INTAKE_REVIEW_VERSION_V01 = "nexus-atlas.source-intake-review.v0.1";
export const SOURCE_INTAKE_REVIEW_ERROR_CODES_V01 = Object.freeze([
  "INVALID_SOURCE_INTAKE_REVIEW",
  "SOURCE_INTAKE_REVIEW_ID_MISMATCH",
  "SOURCE_INTAKE_SOURCE_INVALID",
  "SOURCE_INTAKE_CANDIDATE_INVALID",
  "SOURCE_INTAKE_SELECTION_INVALID",
  "SOURCE_INTAKE_PRIVACY_VIOLATION",
  "SOURCE_INTAKE_PREVIEW_INVALID"
]);

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const nonEmpty = value => typeof value === "string" && value.length > 0 && value.trim() === value;
const deepClone = value => Array.isArray(value) ? value.map(deepClone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)])) : value;
const deepFreeze = value => { if (object(value) || Array.isArray(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const safeReference = value => nonEmpty(value) && !/[?#\r\n]/.test(value) && !/^file:\/\//i.test(value) && !/^[A-Za-z]:[\\/]/.test(value) && !/^\\\\/.test(value) && !/^\/(?:Users|home|tmp|mnt|private|var|etc)\//.test(value) && !/^[a-z][a-z\d+.-]*:\/\/[^/]*@/i.test(value);

export class SourceIntakeReviewError extends Error {
  constructor(code, message = code, details = {}) {
    if (!SOURCE_INTAKE_REVIEW_ERROR_CODES_V01.includes(code)) throw new TypeError(`Unknown SourceIntakeReviewError code: ${String(code)}`);
    super(message);
    this.name = "SourceIntakeReviewError";
    this.code = code;
    this.details = deepFreeze(Object.fromEntries(Object.entries(details).filter(([, value]) => typeof value === "string")));
    Object.freeze(this);
  }
}

const invalid = (code, message, details) => { throw new SourceIntakeReviewError(code, message, details); };

export function sourceIntakeReviewIdV01(review) {
  const source = review?.source || review;
  const ids = Array.isArray(review?.candidates) ? review.candidates.map(candidate => candidate.candidateId) : [];
  if (!nonEmpty(source?.provider) || !nonEmpty(source?.scopeRef) || !nonEmpty(source?.capturedAt)) invalid("INVALID_SOURCE_INTAKE_REVIEW", "Review identity inputs are invalid");
  return ["source-intake-review", "v0.1", source.provider, source.scopeRef, source.capturedAt, ids.join(",")].map(encodeURIComponent).join(":");
}

function validateSource(source) {
  if (!exactKeys(source, ["provider", "scopeRef", "state", "capturedAt", "retrievalMode", "authority", "recordCount", "diagnostics"])) invalid("SOURCE_INTAKE_SOURCE_INVALID", "Source metadata shape is invalid");
  for (const key of ["provider", "scopeRef", "state", "capturedAt", "retrievalMode", "authority"]) if (!nonEmpty(source[key])) invalid("SOURCE_INTAKE_SOURCE_INVALID", `Source metadata field is invalid: ${key}`);
  if (!Number.isSafeInteger(source.recordCount) || source.recordCount < 0) invalid("SOURCE_INTAKE_SOURCE_INVALID", "Source recordCount is invalid");
  if (!exactKeys(source.diagnostics, ["complete", "sourceRecordCount", "candidateCount", "exclusionCount"]) || typeof source.diagnostics.complete !== "boolean" || !["sourceRecordCount", "candidateCount", "exclusionCount"].every(key => Number.isSafeInteger(source.diagnostics[key]) && source.diagnostics[key] >= 0)) invalid("SOURCE_INTAKE_SOURCE_INVALID", "Source diagnostics are invalid");
  if (source.diagnostics.sourceRecordCount !== source.recordCount) invalid("SOURCE_INTAKE_SOURCE_INVALID", "Source diagnostic record count mismatch");
}

function validateProvenance(provenance) {
  if (!exactKeys(provenance, ["provider", "reference", "capturedAt", "retrievalMode", "authority"])) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate provenance shape is invalid");
  for (const key of ["provider", "reference", "capturedAt", "retrievalMode", "authority"]) if (!nonEmpty(provenance[key])) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", `Candidate provenance field is invalid: ${key}`);
  if (!safeReference(provenance.reference)) invalid("SOURCE_INTAKE_PRIVACY_VIOLATION", "Candidate provenance reference is unsafe");
}

function validateCandidate(candidate, source, candidateIds) {
  const keys = ["candidateId", "sourceRecordId", "canonicalKind", "title", "summary", "provenance", "admission", "privacy", "selectionState"];
  if (!exactKeys(candidate, keys) || !nonEmpty(candidate.candidateId) || !nonEmpty(candidate.sourceRecordId) || !nonEmpty(candidate.title) || !nonEmpty(candidate.summary)) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate Evidence shape is invalid");
  if (candidateIds.has(candidate.candidateId)) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate ID is duplicated", { candidateId: candidate.candidateId });
  candidateIds.add(candidate.candidateId);
  if (candidate.candidateId !== `candidate:evidence:${candidate.sourceRecordId}`) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate/source identity is not preserved", { candidateId: candidate.candidateId });
  if (candidate.canonicalKind !== "evidence") invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate canonicalKind must be evidence", { candidateId: candidate.candidateId });
  validateProvenance(candidate.provenance);
  if (!exactKeys(candidate.admission, ["stage", "canonicalWriteAllowed", "confirmationRequirement"]) || candidate.admission.stage !== "candidate" || candidate.admission.canonicalWriteAllowed !== false || candidate.admission.confirmationRequirement !== "source-authority-sufficient") invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate admission boundary is invalid", { candidateId: candidate.candidateId });
  if (!exactKeys(candidate.privacy, ["sensitivity", "payloadOmitted"]) || (candidate.privacy.sensitivity !== null && !nonEmpty(candidate.privacy.sensitivity)) || candidate.privacy.payloadOmitted !== true) invalid("SOURCE_INTAKE_PRIVACY_VIOLATION", "Candidate privacy boundary is invalid", { candidateId: candidate.candidateId });
  if (!new Set(["selected", "deferred"]).has(candidate.selectionState)) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Candidate selection state is invalid", { candidateId: candidate.candidateId });
  if (candidate.provenance.provider !== source.provider || candidate.provenance.capturedAt !== source.capturedAt) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidate provenance does not match source metadata", { candidateId: candidate.candidateId });
}

function validateSelection(selection, candidates) {
  if (!exactKeys(selection, ["selectedCandidateIds", "selectionMode", "deferredCandidateIds"]) || selection.selectionMode !== "explicit-only" || !Array.isArray(selection.selectedCandidateIds) || !Array.isArray(selection.deferredCandidateIds)) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Selection shape is invalid");
  const ids = candidates.map(candidate => candidate.candidateId); const known = new Set(ids); const selected = selection.selectedCandidateIds;
  if (new Set(selected).size !== selected.length || selected.some(id => !nonEmpty(id) || !known.has(id))) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Selected Candidate IDs are invalid");
  const deferred = selection.deferredCandidateIds;
  if (new Set(deferred).size !== deferred.length || deferred.some(id => !known.has(id) || selected.includes(id))) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Deferred Candidate IDs are invalid");
  const expectedSelected = ids.filter(id => selected.includes(id)); const expectedDeferred = ids.filter(id => !selected.includes(id));
  if (JSON.stringify(selected) !== JSON.stringify(expectedSelected) || JSON.stringify(deferred) !== JSON.stringify(expectedDeferred)) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Selection order is not normalized to Import Plan order");
  for (const candidate of candidates) if (candidate.selectionState !== (selected.includes(candidate.candidateId) ? "selected" : "deferred")) invalid("SOURCE_INTAKE_SELECTION_INVALID", "Candidate selection state does not match selection", { candidateId: candidate.candidateId });
  return { selected, deferred };
}

function validatePreview(preview, candidates, selection) {
  const keys = ["selectedCandidateIds", "proposals", "deferredCandidateIds", "diagnostics", "resultMode", "reconciliation", "persistentWrite", "graphMutation", "edgeCreation", "semanticPromotion"];
  if (!exactKeys(preview, keys) || !Array.isArray(preview.proposals) || preview.resultMode !== "in-memory-preview" || !new Set(["not-run", "admission-plan"]).has(preview.reconciliation) || preview.persistentWrite !== false || preview.graphMutation !== false || preview.edgeCreation !== false || preview.semanticPromotion !== false) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Admission preview boundary is invalid");
  if (JSON.stringify(preview.selectedCandidateIds) !== JSON.stringify(selection.selected) || JSON.stringify(preview.deferredCandidateIds) !== JSON.stringify(selection.deferred)) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Preview selection does not match review selection");
  const d = preview.diagnostics; const numeric = ["candidateCount", "authorizedCount", "deferredCount", "proposalCount"];
  if (!exactKeys(d, ["candidateCount", "authorizedCount", "deferredCount", "proposalCount", "insertCount", "noopCount", "conflictCount", "applyAllowed"]) || !numeric.every(key => Number.isSafeInteger(d[key]) && d[key] >= 0) || d.candidateCount !== candidates.length || d.authorizedCount !== selection.selected.length || d.deferredCount !== selection.deferred.length || d.proposalCount !== preview.proposals.length || d.applyAllowed !== false) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Preview diagnostics are invalid");
  if (!["insertCount", "noopCount", "conflictCount"].every(key => Number.isSafeInteger(d[key]) && d[key] >= 0) && preview.reconciliation !== "not-run") invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Reconciled preview counts are invalid");
  if (preview.reconciliation === "not-run" && !["insertCount", "noopCount", "conflictCount"].every(key => d[key] === null)) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Unreconciled preview must not invent dispositions");
  if (preview.reconciliation === "admission-plan" && !["insertCount", "noopCount", "conflictCount"].every(key => Number.isSafeInteger(d[key]) && d[key] >= 0)) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Admission-plan counts are invalid");
  const candidateIds = new Set(candidates.map(candidate => candidate.candidateId));
  for (const proposal of preview.proposals) if (!exactKeys(proposal, ["candidateId", "sourceRecordId", "canonicalKind", "title", "summary", "provenance"]) || !candidateIds.has(proposal.candidateId) || proposal.canonicalKind !== "evidence") invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Preview proposal is invalid");
}

export function validateSourceIntakeReviewV01(review) {
  if (!object(review) || !exactKeys(review, ["version", "reviewId", "source", "candidates", "selection", "admissionPreview", "capabilities"]) || review.version !== SOURCE_INTAKE_REVIEW_VERSION_V01) invalid("INVALID_SOURCE_INTAKE_REVIEW", "Review top-level shape is invalid");
  validateSource(review.source);
  if (!Array.isArray(review.candidates)) invalid("SOURCE_INTAKE_CANDIDATE_INVALID", "Candidates must be an array");
  const candidateIds = new Set(); for (const candidate of review.candidates) validateCandidate(candidate, review.source, candidateIds);
  if (review.reviewId !== sourceIntakeReviewIdV01(review)) invalid("SOURCE_INTAKE_REVIEW_ID_MISMATCH", "Review ID is not deterministic");
  const selection = validateSelection(review.selection, review.candidates);
  validatePreview(review.admissionPreview, review.candidates, selection);
  if (!exactKeys(review.capabilities, ["liveRead", "sourceReread", "persistentWrite", "canonicalGraphMutation", "edgeCreation", "semanticPromotion"]) || Object.values(review.capabilities).some(value => value !== false)) invalid("SOURCE_INTAKE_PREVIEW_INVALID", "Review capabilities must be false");
  return deepFreeze(deepClone(review));
}

export const __sourceIntakeReviewValidatorInternals = Object.freeze({ exactKeys, deepClone, deepFreeze, safeReference });
