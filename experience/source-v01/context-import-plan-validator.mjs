import { isStrictOffsetIsoV01, SourceAdapterError, validateSourceSnapshotV01 } from "./source-snapshot-validator.mjs";

export const CONTEXT_IMPORT_PLAN_VERSION_V01 = "0.1";
export const GITHUB_CONTEXT_IMPORT_POLICY_V1 = "github-context-import-policy-v1";
export const CONTEXT_IMPORT_PLAN_ERROR_CODES_V01 = Object.freeze([
  "INVALID_IMPORT_PLAN_INPUT", "INVALID_POLICY_VERSION", "INVALID_PROJECT_ID", "INVALID_SCOPE_KEY",
  "INVALID_SOURCE_SNAPSHOT", "SOURCE_SNAPSHOT_UNSUPPORTED", "SOURCE_RECORD_UNMAPPED",
  "CANDIDATE_ID_INVALID", "CANDIDATE_DUPLICATE", "IMPORT_PLAN_COVERAGE_MISMATCH",
  "IMPORT_PLAN_SOURCE_MISMATCH", "IMPORT_PLAN_INVALID"
]);
const RETRYABLE = new Set();
const MAPPING_RULES = Object.freeze({
  repository: "github-repository-state-to-evidence", branch: "github-branch-state-to-evidence",
  commit: "github-commit-state-to-evidence", issue: "github-issue-state-to-evidence",
  pull_request: "github-pull-request-state-to-evidence", release: "github-release-state-to-evidence",
  tag: "github-tag-state-to-evidence"
});
const AUTHORITIES = new Set(["github-repository-state", "github-ref-state", "github-commit-state", "github-issue-state", "github-pull-request-state", "github-release-state"]);
const EXCLUSION_RULES = new Set(["unsupported-source-type", "policy-excluded", "authority-insufficient", "unsafe-semantic-promotion"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const deepClone = value => Array.isArray(value) ? value.map(deepClone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)])) : value;
const deepFreeze = value => { if (object(value) || Array.isArray(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const nonEmptyTrimmedString = value => typeof value === "string" && value.length > 0 && value === value.trim();
const safeDetails = details => Object.fromEntries(["candidateId", "sourceRecordId", "field"].filter(key => typeof details?.[key] === "string").map(key => [key, details[key]]));
const invalid = (code, message, details = {}) => { throw new ContextImportPlanError(code, message, details); };

export class ContextImportPlanError extends Error {
  constructor(code, message = code, details = {}) {
    if (!CONTEXT_IMPORT_PLAN_ERROR_CODES_V01.includes(code)) throw new TypeError("Unknown ContextImportPlanError code: " + String(code));
    super(message); this.name = "ContextImportPlanError"; this.code = code; this.retryable = RETRYABLE.has(code); this.details = deepFreeze(safeDetails(details)); Object.freeze(this);
  }
}

function stringField(value, field) { if (!nonEmptyTrimmedString(value)) invalid("IMPORT_PLAN_INVALID", field + " invalid", { field }); return value; }
function validateDescriptor(value) {
  if (!exactKeys(value, ["snapshotVersion", "adapter", "capturedAt", "repositoryRef", "recordIds"]) || value.snapshotVersion !== CONTEXT_IMPORT_PLAN_VERSION_V01 || !nonEmptyTrimmedString(value.adapter) || !isStrictOffsetIsoV01(value.capturedAt) || !nonEmptyTrimmedString(value.repositoryRef) || !Array.isArray(value.recordIds) || value.recordIds.some(id => !nonEmptyTrimmedString(id))) invalid("IMPORT_PLAN_INVALID", "sourceSnapshot descriptor invalid", { field: "sourceSnapshot" });
  if (new Set(value.recordIds).size !== value.recordIds.length) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "sourceSnapshot recordIds duplicate", { field: "sourceSnapshot.recordIds" });
}
function validateCandidate(candidate, descriptor, seen, candidateIds) {
  const keys = ["candidateId", "targetKind", "sourceRecordIds", "mappingRule", "title", "summary", "proposedPayload", "provenance", "admission"];
  if (!exactKeys(candidate, keys) || candidate.targetKind !== "evidence" || !Array.isArray(candidate.sourceRecordIds) || candidate.sourceRecordIds.length !== 1 || !nonEmptyTrimmedString(candidate.sourceRecordIds[0])) invalid("IMPORT_PLAN_INVALID", "Candidate shape invalid", { field: "candidate" });
  const sourceRecordId = candidate.sourceRecordIds[0], expectedId = "candidate:evidence:" + sourceRecordId;
  if (!descriptor.recordIds.includes(sourceRecordId)) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "Candidate source is absent from descriptor", { sourceRecordId });
  if (candidateIds.has(candidate.candidateId)) invalid("CANDIDATE_DUPLICATE", "Candidate ID duplicated", { candidateId: candidate.candidateId });
  candidateIds.add(candidate.candidateId); seen.add(sourceRecordId);
  if (candidate.candidateId !== expectedId) invalid("CANDIDATE_ID_INVALID", "Candidate ID invalid", { candidateId: candidate.candidateId, sourceRecordId });
  if (!Object.values(MAPPING_RULES).includes(candidate.mappingRule)) invalid("IMPORT_PLAN_INVALID", "mappingRule invalid", { field: "mappingRule" });
  stringField(candidate.title, "title"); stringField(candidate.summary, "summary");
  const payloadKeys = ["claim", "sourceRef", "observedAt", "appliesToVersion", "verificationMethod", "result"];
  if (!exactKeys(candidate.proposedPayload, payloadKeys)) invalid("IMPORT_PLAN_INVALID", "proposedPayload invalid", { field: "proposedPayload" });
  stringField(candidate.proposedPayload.claim, "claim");
  if (candidate.proposedPayload.sourceRef !== sourceRecordId) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "sourceRef mismatch", { sourceRecordId });
  if (candidate.proposedPayload.observedAt !== null && !isStrictOffsetIsoV01(candidate.proposedPayload.observedAt)) invalid("IMPORT_PLAN_INVALID", "observedAt invalid", { field: "observedAt" });
  if (candidate.proposedPayload.appliesToVersion !== null || candidate.proposedPayload.verificationMethod !== "github-source-snapshot-v0.1") invalid("IMPORT_PLAN_INVALID", "proposedPayload policy invalid", { field: "proposedPayload" });
  stringField(candidate.proposedPayload.result, "result");
  if (candidate.summary !== candidate.proposedPayload.claim) invalid("IMPORT_PLAN_INVALID", "summary must equal claim", { field: "summary" });
  const provenanceKeys = ["provider", "reference", "capturedAt", "retrievalMode", "authority"];
  if (!exactKeys(candidate.provenance, provenanceKeys) || candidate.provenance.provider !== "github" || !nonEmptyTrimmedString(candidate.provenance.reference) || candidate.provenance.retrievalMode !== "read-only-api" || !AUTHORITIES.has(candidate.provenance.authority)) invalid("IMPORT_PLAN_INVALID", "provenance invalid", { field: "provenance" });
  if (candidate.provenance.capturedAt !== descriptor.capturedAt) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "provenance capture mismatch", { field: "provenance.capturedAt" });
  const admissionKeys = ["stage", "canonicalWriteAllowed", "confirmationRequirement"];
  if (!exactKeys(candidate.admission, admissionKeys) || candidate.admission.stage !== "candidate" || candidate.admission.canonicalWriteAllowed !== false || candidate.admission.confirmationRequirement !== "source-authority-sufficient") invalid("IMPORT_PLAN_INVALID", "admission invalid", { field: "admission" });
}
function validateExclusion(exclusion, descriptor, seen) {
  if (!exactKeys(exclusion, ["sourceRecordId", "reason", "rule"]) || !nonEmptyTrimmedString(exclusion.sourceRecordId) || !nonEmptyTrimmedString(exclusion.reason) || !EXCLUSION_RULES.has(exclusion.rule)) invalid("IMPORT_PLAN_INVALID", "exclusion invalid", { field: "exclusions" });
  if (!descriptor.recordIds.includes(exclusion.sourceRecordId)) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "exclusion source is absent from descriptor", { sourceRecordId: exclusion.sourceRecordId });
  if (seen.has(exclusion.sourceRecordId)) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "source coverage duplicated", { sourceRecordId: exclusion.sourceRecordId });
  seen.add(exclusion.sourceRecordId);
}
function validateDiagnostics(value, descriptor, candidateCount, exclusionCount) {
  const keys = ["coverageComplete", "sourceRecordCount", "candidateCount", "exclusionCount", "byTargetKind", "byConfirmationRequirement"];
  if (!exactKeys(value, keys) || typeof value.coverageComplete !== "boolean" || !Number.isSafeInteger(value.sourceRecordCount) || !Number.isSafeInteger(value.candidateCount) || !Number.isSafeInteger(value.exclusionCount) || !exactKeys(value.byTargetKind, ["evidence"]) || !exactKeys(value.byConfirmationRequirement, ["source-authority-sufficient"])) invalid("IMPORT_PLAN_INVALID", "diagnostics shape invalid", { field: "diagnostics" });
  if (value.coverageComplete !== true || value.sourceRecordCount !== descriptor.recordIds.length || value.candidateCount !== candidateCount || value.exclusionCount !== exclusionCount || value.candidateCount + value.exclusionCount !== value.sourceRecordCount || value.byTargetKind.evidence !== candidateCount || value.byConfirmationRequirement["source-authority-sufficient"] !== candidateCount) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "diagnostics coverage mismatch", { field: "diagnostics" });
}
export function validateContextImportPlanV01(plan) {
  if (!object(plan)) invalid("IMPORT_PLAN_INVALID", "Plan must be an object");
  const topKeys = ["planVersion", "policyVersion", "generatedAt", "sourceSnapshot", "target", "candidates", "exclusions", "diagnostics"];
  if (!exactKeys(plan, topKeys) || plan.planVersion !== CONTEXT_IMPORT_PLAN_VERSION_V01 || plan.policyVersion !== GITHUB_CONTEXT_IMPORT_POLICY_V1 || !isStrictOffsetIsoV01(plan.generatedAt)) invalid("IMPORT_PLAN_INVALID", "Plan top-level shape invalid");
  validateDescriptor(plan.sourceSnapshot);
  if (plan.generatedAt !== plan.sourceSnapshot.capturedAt) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "generatedAt mismatch", { field: "generatedAt" });
  if (!exactKeys(plan.target, ["projectId", "scopeKey"]) || !nonEmptyTrimmedString(plan.target.projectId) || !nonEmptyTrimmedString(plan.target.scopeKey)) invalid("IMPORT_PLAN_INVALID", "target invalid", { field: "target" });
  if (!Array.isArray(plan.candidates) || !Array.isArray(plan.exclusions)) invalid("IMPORT_PLAN_INVALID", "collections invalid", { field: "candidates" });
  const coverage = new Set(), candidateIds = new Set();
  for (const candidate of plan.candidates) validateCandidate(candidate, plan.sourceSnapshot, coverage, candidateIds);
  for (const exclusion of plan.exclusions) validateExclusion(exclusion, plan.sourceSnapshot, coverage);
  if (coverage.size !== plan.sourceSnapshot.recordIds.length) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "source coverage incomplete", { field: "coverage" });
  validateDiagnostics(plan.diagnostics, plan.sourceSnapshot, plan.candidates.length, plan.exclusions.length);
  return deepFreeze(deepClone(plan));
}
export const __contextImportPlanTestInternals = Object.freeze({ deepClone, deepFreeze, exactKeys, nonEmptyTrimmedString, MAPPING_RULES });
