import { isStrictOffsetIsoV01, normalizeRepositoryRefV01 } from "./source-snapshot-validator.mjs";

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
const AUTHORITIES = Object.freeze({
  repository: "github-repository-state", branch: "github-ref-state", commit: "github-commit-state",
  issue: "github-issue-state", pull_request: "github-pull-request-state", release: "github-release-state",
  tag: "github-ref-state"
});
const EXCLUSION_RULES = new Set(["unsupported-source-type", "policy-excluded", "authority-insufficient", "unsafe-semantic-promotion"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const deepClone = value => Array.isArray(value) ? value.map(deepClone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)])) : value;
const deepFreeze = value => { if (object(value) || Array.isArray(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const nonEmptyTrimmedString = value => typeof value === "string" && value.length > 0 && value === value.trim();
const invalid = (code, message, details = {}) => { throw new ContextImportPlanError(code, message, details); };

export class ContextImportPlanError extends Error {
  constructor(code, message = code, details = {}) {
    if (!CONTEXT_IMPORT_PLAN_ERROR_CODES_V01.includes(code)) throw new TypeError("Unknown ContextImportPlanError code: " + String(code));
    super(message); this.name = "ContextImportPlanError"; this.code = code; this.retryable = RETRYABLE.has(code);
    this.details = deepFreeze(Object.fromEntries(["candidateId", "sourceRecordId", "field"].filter(key => typeof details?.[key] === "string").map(key => [key, details[key]]))); Object.freeze(this);
  }
}

function validateCanonicalRepositoryRef(value) {
  if (!nonEmptyTrimmedString(value)) invalid("IMPORT_PLAN_INVALID", "repositoryRef invalid", { field: "sourceSnapshot.repositoryRef" });
  let normalized;
  try { normalized = normalizeRepositoryRefV01(value); } catch { invalid("IMPORT_PLAN_INVALID", "repositoryRef invalid", { field: "sourceSnapshot.repositoryRef" }); }
  if (normalized !== value) invalid("IMPORT_PLAN_INVALID", "repositoryRef must be canonical", { field: "sourceSnapshot.repositoryRef" });
  return value;
}

export function parseGitHubSourceRecordIdV01(sourceRecordId, repositoryRef) {
  if (!nonEmptyTrimmedString(sourceRecordId) || !nonEmptyTrimmedString(repositoryRef)) invalid("IMPORT_PLAN_INVALID", "sourceRecordId invalid");
  const normalized = validateCanonicalRepositoryRef(repositoryRef);
  if (sourceRecordId === `github:repo:${normalized}`) return { sourceType: "repository", externalIdentity: normalized };
  const match = sourceRecordId.match(/^github:(branch|commit|issue|pr|release|tag):([^:]+\/[^:]+):(.+)$/);
  if (!match || match[2] !== normalized || !nonEmptyTrimmedString(match[3]) || /[\r\n]/.test(match[3])) invalid("IMPORT_PLAN_INVALID", "sourceRecordId identity invalid", { sourceRecordId });
  const sourceType = match[1] === "pr" ? "pull_request" : match[1];
  if (["commit"].includes(match[1]) && !/^[0-9a-f]{40}$/.test(match[3])) invalid("IMPORT_PLAN_INVALID", "commit identity invalid", { sourceRecordId });
  if (["issue", "pr"].includes(match[1])) {
    if (!/^\d+$/.test(match[3])) invalid("IMPORT_PLAN_INVALID", "number identity invalid", { sourceRecordId });
    const number = Number(match[3]); if (!Number.isSafeInteger(number) || number <= 0 || String(number) !== match[3]) invalid("IMPORT_PLAN_INVALID", "number identity invalid", { sourceRecordId });
  }
  return { sourceType, externalIdentity: match[3] };
}

const resultEnums = Object.freeze({
  repository: new Set(["available", "archived"]), branch: new Set(["present"]), commit: new Set(["present"]),
  issue: new Set(["open", "closed"]), pull_request: new Set(["open", "closed", "merged"]),
  release: new Set(["draft", "prerelease", "published"]), tag: new Set(["present"])
});
function expectedTitle(sourceType, identity) {
  if (sourceType === "repository") return "GitHub repository observation";
  if (sourceType === "branch") return "GitHub default branch observation";
  if (sourceType === "commit") return "GitHub commit observation";
  if (sourceType === "issue") return `GitHub issue #${identity} observation`;
  if (sourceType === "pull_request") return `GitHub pull request #${identity} observation`;
  if (sourceType === "release") return "GitHub release observation";
  return "GitHub tag observation";
}
function referenceIsSafe(value) { return typeof value === "string" && nonEmptyTrimmedString(value) && value.startsWith("https://github.com/") && !value.includes("?") && !value.includes("#") && !value.includes("@") && !/[\r\n]/.test(value); }
function validateReference(sourceType, identity, repositoryRef, reference) {
  if (!referenceIsSafe(reference)) invalid("IMPORT_PLAN_INVALID", "provenance reference invalid", { field: "provenance.reference" });
  const base = `https://github.com/${repositoryRef}`;
  if (sourceType === "repository" && reference === base) return {};
  const expected = { branch: `${base}/tree/${encodeURIComponent(identity)}`, commit: `${base}/commit/${identity}`, issue: `${base}/issues/${identity}`, pull_request: `${base}/pull/${identity}`, tag: `${base}/releases/tag/${encodeURIComponent(identity)}` };
  if (sourceType !== "release" && reference !== expected[sourceType]) invalid("IMPORT_PLAN_INVALID", "provenance reference does not match source identity", { field: "provenance.reference" });
  if (sourceType === "release") {
    const prefix = `${base}/releases/tag/`; if (!reference.startsWith(prefix)) invalid("IMPORT_PLAN_INVALID", "release reference path invalid", { field: "provenance.reference" });
    const segment = reference.slice(prefix.length); if (!segment || segment.includes("/")) invalid("IMPORT_PLAN_INVALID", "release reference segment invalid", { field: "provenance.reference" });
    let tagName; try { tagName = decodeURIComponent(segment); } catch { invalid("IMPORT_PLAN_INVALID", "release reference encoding invalid", { field: "provenance.reference" }); }
    if (!nonEmptyTrimmedString(tagName) || /[\r\n]/.test(tagName) || encodeURIComponent(tagName) !== segment) invalid("IMPORT_PLAN_INVALID", "release tag invalid", { field: "provenance.reference" });
    return { tagName };
  }
  return {};
}
function validateDescriptor(value) {
  if (!exactKeys(value, ["snapshotVersion", "adapter", "capturedAt", "repositoryRef", "recordIds"]) || value.snapshotVersion !== CONTEXT_IMPORT_PLAN_VERSION_V01 || value.adapter !== "github" || !isStrictOffsetIsoV01(value.capturedAt) || !Array.isArray(value.recordIds) || value.recordIds.length < 2 || value.recordIds.some(id => !nonEmptyTrimmedString(id)) || new Set(value.recordIds).size !== value.recordIds.length) invalid("IMPORT_PLAN_INVALID", "sourceSnapshot descriptor invalid", { field: "sourceSnapshot" });
  validateCanonicalRepositoryRef(value.repositoryRef);
  const parsed = value.recordIds.map(id => parseGitHubSourceRecordIdV01(id, value.repositoryRef));
  if (parsed.filter(item => item.sourceType === "repository").length !== 1 || parsed.filter(item => item.sourceType === "branch").length !== 1) invalid("IMPORT_PLAN_INVALID", "GitHub core descriptor invalid", { field: "sourceSnapshot.recordIds" });
}
function validateCandidate(candidate, descriptor, seen, candidateIds, actualOrder) {
  const keys = ["candidateId", "targetKind", "sourceRecordIds", "mappingRule", "title", "summary", "proposedPayload", "provenance", "admission"];
  if (!exactKeys(candidate, keys) || candidate.targetKind !== "evidence" || !Array.isArray(candidate.sourceRecordIds) || candidate.sourceRecordIds.length !== 1 || !nonEmptyTrimmedString(candidate.sourceRecordIds[0])) invalid("IMPORT_PLAN_INVALID", "Candidate shape invalid", { field: "candidate" });
  const sourceRecordId = candidate.sourceRecordIds[0]; const expectedId = "candidate:evidence:" + sourceRecordId;
  if (!descriptor.recordIds.includes(sourceRecordId)) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "Candidate source is absent from descriptor", { sourceRecordId });
  const parsed = parseGitHubSourceRecordIdV01(sourceRecordId, descriptor.repositoryRef);
  if (candidateIds.has(candidate.candidateId)) invalid("CANDIDATE_DUPLICATE", "Candidate ID duplicated", { candidateId: candidate.candidateId });
  candidateIds.add(candidate.candidateId); actualOrder.push(sourceRecordId);
  if (candidate.candidateId !== expectedId) invalid("CANDIDATE_ID_INVALID", "Candidate ID invalid", { candidateId: candidate.candidateId, sourceRecordId });
  if (candidate.mappingRule !== MAPPING_RULES[parsed.sourceType]) invalid("IMPORT_PLAN_INVALID", "mappingRule does not match source type", { field: "mappingRule" });
  if (!nonEmptyTrimmedString(candidate.title) || candidate.title !== expectedTitle(parsed.sourceType, parsed.externalIdentity)) invalid("IMPORT_PLAN_INVALID", "title invalid", { field: "title" });
  const payloadKeys = ["claim", "sourceRef", "observedAt", "appliesToVersion", "verificationMethod", "result"];
  if (!exactKeys(candidate.proposedPayload, payloadKeys)) invalid("IMPORT_PLAN_INVALID", "proposedPayload invalid", { field: "proposedPayload" });
  if (candidate.proposedPayload.sourceRef !== sourceRecordId) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "sourceRef mismatch", { sourceRecordId });
  if (!nonEmptyTrimmedString(candidate.proposedPayload.claim) || (candidate.proposedPayload.observedAt !== null && !isStrictOffsetIsoV01(candidate.proposedPayload.observedAt)) || candidate.proposedPayload.appliesToVersion !== null || candidate.proposedPayload.verificationMethod !== "github-source-snapshot-v0.1" || !resultEnums[parsed.sourceType]?.has(candidate.proposedPayload.result)) invalid("IMPORT_PLAN_INVALID", "proposedPayload invalid", { field: "proposedPayload" });
  if (!exactKeys(candidate.provenance, ["provider", "reference", "capturedAt", "retrievalMode", "authority"]) || candidate.provenance.provider !== "github" || candidate.provenance.retrievalMode !== "read-only-api" || candidate.provenance.authority !== AUTHORITIES[parsed.sourceType]) invalid("IMPORT_PLAN_INVALID", "provenance invalid", { field: "provenance" });
  const referenceInfo = validateReference(parsed.sourceType, parsed.externalIdentity, descriptor.repositoryRef, candidate.provenance.reference);
  if (candidate.provenance.capturedAt !== descriptor.capturedAt) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "provenance capture mismatch", { field: "provenance.capturedAt" });
  if (parsed.sourceType === "branch") {
    const sha = candidate.proposedPayload.claim.match(/^GitHub default branch (.+) points to commit ([0-9a-f]{40})\.$/); if (!sha || sha[1] !== parsed.externalIdentity) invalid("IMPORT_PLAN_INVALID", "branch claim invalid", { field: "proposedPayload.claim" });
  }
  const claims = { repository: `GitHub repository ${descriptor.repositoryRef} is ${candidate.proposedPayload.result}.`, commit: `GitHub commit ${parsed.externalIdentity} is present.`, issue: `GitHub issue #${parsed.externalIdentity} is ${candidate.proposedPayload.result}.`, pull_request: `GitHub pull request #${parsed.externalIdentity} is ${candidate.proposedPayload.result}.`, release: `GitHub release ${referenceInfo.tagName} is ${candidate.proposedPayload.result}.` };
  if (["repository", "commit", "issue", "pull_request", "release"].includes(parsed.sourceType) && candidate.proposedPayload.claim !== claims[parsed.sourceType]) invalid("IMPORT_PLAN_INVALID", "claim is not mechanical", { field: "proposedPayload.claim" });
  if (parsed.sourceType === "tag" && !new RegExp(`^GitHub tag ${parsed.externalIdentity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:is present|points to commit [0-9a-f]{40})\\.$`).test(candidate.proposedPayload.claim)) invalid("IMPORT_PLAN_INVALID", "tag claim invalid", { field: "proposedPayload.claim" });
  if (candidate.summary !== candidate.proposedPayload.claim) invalid("IMPORT_PLAN_INVALID", "summary must equal claim", { field: "summary" });
  if (!exactKeys(candidate.admission, ["stage", "canonicalWriteAllowed", "confirmationRequirement"]) || candidate.admission.stage !== "candidate" || candidate.admission.canonicalWriteAllowed !== false || candidate.admission.confirmationRequirement !== "source-authority-sufficient") invalid("IMPORT_PLAN_INVALID", "admission invalid", { field: "admission" });
  if (seen.has(sourceRecordId)) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "source coverage duplicated", { sourceRecordId }); seen.add(sourceRecordId);
}
function validateExclusion(exclusion, descriptor, seen) {
  if (!exactKeys(exclusion, ["sourceRecordId", "reason", "rule"]) || !nonEmptyTrimmedString(exclusion.sourceRecordId) || !nonEmptyTrimmedString(exclusion.reason) || !EXCLUSION_RULES.has(exclusion.rule)) invalid("IMPORT_PLAN_INVALID", "exclusion invalid", { field: "exclusions" });
  if (!descriptor.recordIds.includes(exclusion.sourceRecordId)) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "exclusion source is absent from descriptor", { sourceRecordId: exclusion.sourceRecordId });
  parseGitHubSourceRecordIdV01(exclusion.sourceRecordId, descriptor.repositoryRef);
  if (seen.has(exclusion.sourceRecordId)) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "source coverage duplicated", { sourceRecordId: exclusion.sourceRecordId }); seen.add(exclusion.sourceRecordId);
}
function validateDiagnostics(value, descriptor, candidateCount, exclusionCount) {
  const keys = ["coverageComplete", "sourceRecordCount", "candidateCount", "exclusionCount", "byTargetKind", "byConfirmationRequirement"];
  if (!exactKeys(value, keys) || typeof value.coverageComplete !== "boolean" || !Number.isSafeInteger(value.sourceRecordCount) || !Number.isSafeInteger(value.candidateCount) || !Number.isSafeInteger(value.exclusionCount) || !exactKeys(value.byTargetKind, ["evidence"]) || !exactKeys(value.byConfirmationRequirement, ["source-authority-sufficient"])) invalid("IMPORT_PLAN_INVALID", "diagnostics shape invalid", { field: "diagnostics" });
  if (value.coverageComplete !== true || value.sourceRecordCount !== descriptor.recordIds.length || value.candidateCount !== candidateCount || value.exclusionCount !== exclusionCount || value.candidateCount + value.exclusionCount !== value.sourceRecordCount || value.byTargetKind.evidence !== candidateCount || value.byConfirmationRequirement["source-authority-sufficient"] !== candidateCount) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "diagnostics coverage mismatch", { field: "diagnostics" });
}
export function validateContextImportPlanV01(plan) {
  if (!object(plan)) invalid("IMPORT_PLAN_INVALID", "Plan must be an object");
  if (!exactKeys(plan, ["planVersion", "policyVersion", "generatedAt", "sourceSnapshot", "target", "candidates", "exclusions", "diagnostics"]) || plan.planVersion !== CONTEXT_IMPORT_PLAN_VERSION_V01 || plan.policyVersion !== GITHUB_CONTEXT_IMPORT_POLICY_V1 || !isStrictOffsetIsoV01(plan.generatedAt)) invalid("IMPORT_PLAN_INVALID", "Plan top-level shape invalid");
  validateDescriptor(plan.sourceSnapshot); if (plan.generatedAt !== plan.sourceSnapshot.capturedAt) invalid("IMPORT_PLAN_SOURCE_MISMATCH", "generatedAt mismatch", { field: "generatedAt" });
  if (!exactKeys(plan.target, ["projectId", "scopeKey"]) || !nonEmptyTrimmedString(plan.target.projectId) || !nonEmptyTrimmedString(plan.target.scopeKey) || !Array.isArray(plan.candidates) || !Array.isArray(plan.exclusions)) invalid("IMPORT_PLAN_INVALID", "target or collections invalid");
  const coverage = new Set(), candidateIds = new Set(), actualOrder = [];
  for (const candidate of plan.candidates) validateCandidate(candidate, plan.sourceSnapshot, coverage, candidateIds, actualOrder);
  for (const exclusion of plan.exclusions) validateExclusion(exclusion, plan.sourceSnapshot, coverage);
  if (coverage.size !== plan.sourceSnapshot.recordIds.length) invalid("IMPORT_PLAN_COVERAGE_MISMATCH", "source coverage incomplete", { field: "coverage" });
  const expectedOrder = plan.sourceSnapshot.recordIds.filter(id => !plan.exclusions.some(exclusion => exclusion.sourceRecordId === id));
  if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) invalid("IMPORT_PLAN_INVALID", "Candidate order invalid", { field: "candidates" });
  const exclusionOrder = plan.exclusions.map(item => `${item.sourceRecordId}\u0000${item.rule}`); if (JSON.stringify(exclusionOrder) !== JSON.stringify([...exclusionOrder].sort())) invalid("IMPORT_PLAN_INVALID", "Exclusion order invalid", { field: "exclusions" });
  validateDiagnostics(plan.diagnostics, plan.sourceSnapshot, plan.candidates.length, plan.exclusions.length);
  return deepFreeze(deepClone(plan));
}
export const __contextImportPlanTestInternals = Object.freeze({ deepClone, deepFreeze, exactKeys, nonEmptyTrimmedString, MAPPING_RULES, AUTHORITIES });
