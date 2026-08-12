export const CANONICAL_ADMISSION_VERSION_V01 = "0.1";
export const GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 = "github-evidence-canonical-admission-v1";
import { isStrictOffsetIsoV01 } from "../source-v01/source-snapshot-validator.mjs";
export const CANONICAL_ADMISSION_ERROR_CODES_V01 = Object.freeze([
  "INVALID_CANONICAL_ADMISSION_INPUT", "INVALID_ADMISSION_POLICY_VERSION", "INVALID_CONTEXT_GRAPH", "INVALID_IMPORT_PLAN",
  "INVALID_AUTHORIZATION_SELECTION", "TARGET_PROJECT_NOT_FOUND", "TARGET_PROJECT_INVALID", "TARGET_SCOPE_UNSUPPORTED",
  "CANDIDATE_NOT_FOUND", "CANONICAL_NODE_ID_INVALID", "CANONICAL_ADMISSION_PLAN_INVALID", "CANONICAL_ADMISSION_COVERAGE_MISMATCH",
  "CANONICAL_ADMISSION_SOURCE_MISMATCH", "CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH", "CANONICAL_APPLY_CONFLICT", "CANONICAL_GRAPH_RESULT_INVALID"
]);

const PLAN_KEYS = ["admissionVersion", "policyVersion", "generatedAt", "sourcePlan", "target", "decisions", "nodeProposals", "diagnostics"];
const SOURCE_KEYS = ["planVersion", "policyVersion", "generatedAt", "candidateIds"];
const TARGET_KEYS = ["projectId", "scopeKey"];
const DECISION_KEYS = ["candidateId", "canonicalNodeId", "disposition", "reason"];
const PROPOSAL_KEYS = ["id", "kind", "title", "summary", "scope", "lifecycle", "epistemic", "provenance", "governance", "payload"];
const DIAGNOSTIC_KEYS = ["candidateCount", "authorizedCount", "deferredCount", "proposalCount", "insertCount", "noopCount", "conflictCount", "applyAllowed"];
const SCOPE_KEYS = ["userId", "territoryId", "projectId"];
const LIFECYCLE_KEYS = ["state", "createdAt", "updatedAt"];
const EPISTEMIC_KEYS = ["verification", "confidence", "freshness"];
const GOVERNANCE_KEYS = ["sensitivity", "inheritance", "requiresConfirmation"];
const PROVENANCE_KEYS = ["provider", "reference", "capturedAt", "retrievalMode", "authority"];
const PAYLOAD_KEYS = ["claim", "sourceRef", "observedAt", "appliesToVersion", "verificationMethod", "result"];

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
export function exactKeys(value, keys) { return isObject(value) && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000"); }
export function nonEmptyTrimmedString(value) { return typeof value === "string" && value.length > 0 && value.trim() === value; }
export function deepClone(value) { if (Array.isArray(value)) return value.map(deepClone); if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)])); return value; }
export function deepFreeze(value) { if ((isObject(value) || Array.isArray(value)) && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }
export function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));
  if (isObject(left) || isObject(right)) { if (!isObject(left) || !isObject(right)) return false; const lk = Object.keys(left).sort(); const rk = Object.keys(right).sort(); return lk.length === rk.length && lk.every((key, index) => key === rk[index] && deepEqual(left[key], right[key])); }
  return false;
}

export class CanonicalAdmissionError extends Error {
  constructor(code, message = code, details = {}) { if (!CANONICAL_ADMISSION_ERROR_CODES_V01.includes(code)) throw new TypeError(`Unknown Canonical Admission error code: ${code}`); super(message); this.name = "CanonicalAdmissionError"; this.code = code; this.retryable = false; this.details = safeDetails(details); }
}
function safeDetails(details) { if (!isObject(details)) return {}; const allowed = ["candidateId", "canonicalNodeId", "projectId", "field"]; return Object.fromEntries(allowed.filter(key => Object.hasOwn(details, key) && (typeof details[key] === "string" || typeof details[key] === "number")).map(key => [key, details[key]])); }
function invalid(code, message, details) { throw new CanonicalAdmissionError(code, message, details); }
function invalidPlan(message, details) { invalid("CANONICAL_ADMISSION_PLAN_INVALID", message, details); }
function coverage(message, details) { invalid("CANONICAL_ADMISSION_COVERAGE_MISMATCH", message, details); }
function requiredString(value, field, code = "CANONICAL_ADMISSION_PLAN_INVALID") { if (!nonEmptyTrimmedString(value)) invalid(code, `${field} must be a trimmed non-empty string`, { field }); }
function checkObject(value, field) { if (!isObject(value)) invalidPlan(`${field} must be an object`, { field }); }

function validateScope(scope, field = "proposal.scope") { if (!exactKeys(scope, SCOPE_KEYS)) invalidPlan(`${field} keys invalid`, { field }); SCOPE_KEYS.forEach(key => requiredString(scope[key], `${field}.${key}`)); }
function validateProposal(proposal, plan) {
  if (!exactKeys(proposal, PROPOSAL_KEYS)) invalidPlan("nodeProposal keys invalid", { field: "nodeProposals" });
  if (proposal.kind !== "evidence") invalidPlan("nodeProposal kind invalid", { field: "nodeProposals.kind" });
  requiredString(proposal.id, "nodeProposals.id"); requiredString(proposal.title, "nodeProposals.title"); requiredString(proposal.summary, "nodeProposals.summary");
  validateScope(proposal.scope); if (!exactKeys(proposal.lifecycle, LIFECYCLE_KEYS) || proposal.lifecycle.state !== "active" || proposal.lifecycle.createdAt !== plan.generatedAt || proposal.lifecycle.updatedAt !== plan.generatedAt) invalidPlan("lifecycle invalid", { field: "nodeProposals.lifecycle" });
  if (!exactKeys(proposal.epistemic, EPISTEMIC_KEYS) || proposal.epistemic.verification !== "confirmed" || proposal.epistemic.confidence !== 1 || proposal.epistemic.freshness !== "unknown") invalidPlan("epistemic invalid", { field: "nodeProposals.epistemic" });
  if (!exactKeys(proposal.governance, GOVERNANCE_KEYS) || proposal.governance.sensitivity !== "personal" || proposal.governance.inheritance !== "project_only" || proposal.governance.requiresConfirmation !== false) invalidPlan("governance invalid", { field: "nodeProposals.governance" });
  if (!exactKeys(proposal.provenance, PROVENANCE_KEYS) || proposal.provenance.provider !== "github" || proposal.provenance.retrievalMode !== "read-only-api" || proposal.provenance.capturedAt !== plan.generatedAt) invalidPlan("provenance invalid", { field: "nodeProposals.provenance" });
  requiredString(proposal.provenance.reference, "nodeProposals.provenance.reference"); requiredString(proposal.provenance.authority, "nodeProposals.provenance.authority");
  if (!exactKeys(proposal.payload, PAYLOAD_KEYS)) invalidPlan("payload keys invalid", { field: "nodeProposals.payload" });
  requiredString(proposal.payload.claim, "nodeProposals.payload.claim"); requiredString(proposal.payload.sourceRef, "nodeProposals.payload.sourceRef"); requiredString(proposal.payload.result, "nodeProposals.payload.result");
  if (proposal.payload.observedAt !== null && !isStrictOffsetIsoV01(proposal.payload.observedAt)) invalidPlan("payload.observedAt invalid", { field: "nodeProposals.payload.observedAt" });
  if (proposal.payload.appliesToVersion !== null || proposal.payload.verificationMethod !== "github-source-snapshot-v0.1" || proposal.summary !== proposal.payload.claim) invalidPlan("payload semantics invalid", { field: "nodeProposals.payload" });
}

export function canonicalNodeIdForCandidate(candidateId, generatedAt) { const prefix = "candidate:evidence:"; if (!nonEmptyTrimmedString(candidateId) || !candidateId.startsWith(prefix)) invalid("CANONICAL_NODE_ID_INVALID", "Candidate ID invalid", { candidateId }); const sourceRecordId = candidateId.slice(prefix.length); return `evidence:source-observation:${encodeURIComponent(sourceRecordId)}:captured:${encodeURIComponent(generatedAt)}`; }

export function validateCanonicalAdmissionPlanV01(admissionPlan) {
  try {
    if (!exactKeys(admissionPlan, PLAN_KEYS) || admissionPlan.admissionVersion !== CANONICAL_ADMISSION_VERSION_V01 || admissionPlan.policyVersion !== GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 || !isStrictOffsetIsoV01(admissionPlan.generatedAt)) invalidPlan("top-level plan invalid");
    if (!exactKeys(admissionPlan.sourcePlan, SOURCE_KEYS) || admissionPlan.sourcePlan.planVersion !== "0.1" || admissionPlan.sourcePlan.policyVersion !== "github-context-import-policy-v1" || admissionPlan.sourcePlan.generatedAt !== admissionPlan.generatedAt || !Array.isArray(admissionPlan.sourcePlan.candidateIds) || admissionPlan.sourcePlan.candidateIds.length < 2) invalidPlan("sourcePlan invalid", { field: "sourcePlan" });
    const ids = admissionPlan.sourcePlan.candidateIds; if (ids.some(id => !nonEmptyTrimmedString(id) || !id.startsWith("candidate:evidence:github:")) || new Set(ids).size !== ids.length) invalidPlan("sourcePlan candidateIds invalid", { field: "sourcePlan.candidateIds" });
    if (!exactKeys(admissionPlan.target, TARGET_KEYS)) invalidPlan("target invalid", { field: "target" }); requiredString(admissionPlan.target.projectId, "target.projectId"); requiredString(admissionPlan.target.scopeKey, "target.scopeKey"); if (admissionPlan.target.scopeKey !== admissionPlan.target.projectId) invalidPlan("target scopeKey invalid", { field: "target.scopeKey" });
    if (!Array.isArray(admissionPlan.decisions) || admissionPlan.decisions.length !== ids.length || !Array.isArray(admissionPlan.nodeProposals)) invalidPlan("collections invalid");
    const seen = new Set(); const proposalById = new Map(); const pairs = { insert: "authorized-new-observation", noop: "authorized-existing-identical", conflict: "authorized-existing-conflict", deferred: "not-authorized" };
    admissionPlan.decisions.forEach((decision, index) => { if (!exactKeys(decision, DECISION_KEYS)) invalidPlan("decision keys invalid", { field: "decisions" }); if (seen.has(decision.candidateId) || decision.candidateId !== ids[index]) invalidPlan("decision order invalid", { field: "decisions" }); seen.add(decision.candidateId); if (!Object.hasOwn(pairs, decision.disposition) || decision.reason !== pairs[decision.disposition]) invalidPlan("decision disposition/reason invalid", { field: "decisions" }); const expected = canonicalNodeIdForCandidate(decision.candidateId, admissionPlan.generatedAt); if (decision.canonicalNodeId !== expected) invalid("CANONICAL_NODE_ID_INVALID", "canonicalNodeId invalid", { candidateId: decision.candidateId, canonicalNodeId: decision.canonicalNodeId }); });
    admissionPlan.nodeProposals.forEach(proposal => { validateProposal(proposal, admissionPlan); if (proposalById.has(proposal.id)) coverage("duplicate proposal", { canonicalNodeId: proposal.id }); proposalById.set(proposal.id, proposal); });
    const nonDeferred = admissionPlan.decisions.filter(decision => decision.disposition !== "deferred"); if (admissionPlan.nodeProposals.length !== nonDeferred.length || nonDeferred.some((decision, index) => decision.canonicalNodeId !== admissionPlan.nodeProposals[index].id)) coverage("proposal coverage invalid");
    if (!exactKeys(admissionPlan.diagnostics, DIAGNOSTIC_KEYS)) invalidPlan("diagnostics shape invalid", { field: "diagnostics" }); const d = admissionPlan.diagnostics; const counts = [d.candidateCount, d.authorizedCount, d.deferredCount, d.proposalCount, d.insertCount, d.noopCount, d.conflictCount]; if (counts.some(value => !Number.isSafeInteger(value) || value < 0)) invalidPlan("diagnostic count invalid", { field: "diagnostics" }); const actual = { candidateCount: ids.length, authorizedCount: nonDeferred.length, deferredCount: ids.length - nonDeferred.length, proposalCount: nonDeferred.length, insertCount: admissionPlan.decisions.filter(x => x.disposition === "insert").length, noopCount: admissionPlan.decisions.filter(x => x.disposition === "noop").length, conflictCount: admissionPlan.decisions.filter(x => x.disposition === "conflict").length }; if (Object.entries(actual).some(([key, value]) => d[key] !== value) || d.applyAllowed !== (d.conflictCount === 0)) coverage("diagnostics mismatch", { field: "diagnostics" });
    return deepFreeze(deepClone(admissionPlan));
  } catch (error) { if (error instanceof CanonicalAdmissionError) throw error; throw new CanonicalAdmissionError("CANONICAL_ADMISSION_PLAN_INVALID", "Admission Plan invalid"); }
}

export const __canonicalAdmissionValidatorInternals = Object.freeze({ PLAN_KEYS, SOURCE_KEYS, TARGET_KEYS, DECISION_KEYS, PROPOSAL_KEYS, DIAGNOSTIC_KEYS, SCOPE_KEYS, isStrictOffsetIsoV01 });
