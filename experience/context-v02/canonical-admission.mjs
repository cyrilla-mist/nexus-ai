import { validateContextGraph } from "./context-graph-validator.mjs";
import { validateContextImportPlanV01 } from "../source-v01/context-import-plan-validator.mjs";
import {
  CANONICAL_ADMISSION_ERROR_CODES_V01,
  CANONICAL_ADMISSION_VERSION_V01,
  GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1,
  CanonicalAdmissionError,
  canonicalNodeIdForCandidate,
  deepClone,
  deepEqual,
  deepFreeze,
  exactKeys,
  nonEmptyTrimmedString,
  validateCanonicalAdmissionPlanV01
} from "./canonical-admission-validator.mjs";

const INPUT_BUILD_KEYS = ["graph", "plan", "policyVersion", "authorizedCandidateIds"];
const INPUT_APPLY_KEYS = ["graph", "importPlan", "admissionPlan", "authorizedCandidateIds"];
const TARGET_SCOPE_KEYS = ["userId", "territoryId", "projectId"];

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function throwError(code, message, details) { throw new CanonicalAdmissionError(code, message, details); }
function exactInput(input, keys) { return isObject(input) && exactKeys(input, keys); }
function wrap(code, message, error) { if (error instanceof CanonicalAdmissionError) throw error; throw new CanonicalAdmissionError(code, message); }
function graphValidated(graph) { try { validateContextGraph(graph); } catch (error) { wrap("INVALID_CONTEXT_GRAPH", "Context Graph is invalid", error); } }
function importPlanValidated(plan) { try { return validateContextImportPlanV01(plan); } catch (error) { wrap("INVALID_IMPORT_PLAN", "Context Import Plan is invalid", error); } }
function targetProject(graph, projectId) {
  const node = graph.nodes.find(item => item.id === projectId);
  if (!node) throwError("TARGET_PROJECT_NOT_FOUND", "Target Project was not found", { projectId });
  if (node.kind !== "project") throwError("TARGET_PROJECT_INVALID", "Target is not a Project", { projectId });
  if (!exactKeys(node.scope, TARGET_SCOPE_KEYS) || TARGET_SCOPE_KEYS.some(key => typeof node.scope[key] !== "string" || node.scope[key].length === 0 || node.scope[key].trim() !== node.scope[key]) || node.scope.projectId !== node.id) throwError("TARGET_PROJECT_INVALID", "Target Project scope is invalid", { projectId });
  return node;
}
function validateAuthorization(value, candidates) {
  if (!Array.isArray(value) || value.some(id => !nonEmptyTrimmedString(id)) || new Set(value).size !== value.length) throwError("INVALID_AUTHORIZATION_SELECTION", "Authorization selection is invalid", { field: "authorizedCandidateIds" });
  const ids = new Set(candidates.map(candidate => candidate.candidateId));
  for (const candidateId of value) if (!ids.has(candidateId)) throwError("CANDIDATE_NOT_FOUND", "Authorized Candidate was not found", { candidateId });
  return new Set(value);
}
function proposalFor(candidate, target, generatedAt) {
  const id = canonicalNodeIdForCandidate(candidate.candidateId, generatedAt);
  return {
    id, kind: "evidence", title: deepClone(candidate.title), summary: deepClone(candidate.summary), scope: deepClone(target.scope),
    lifecycle: { state: "active", createdAt: generatedAt, updatedAt: generatedAt },
    epistemic: { verification: "confirmed", confidence: 1, freshness: "unknown" },
    provenance: deepClone(candidate.provenance),
    governance: { sensitivity: "personal", inheritance: "project_only", requiresConfirmation: false },
    payload: deepClone(candidate.proposedPayload)
  };
}
function disposition(existing, proposal) {
  if (!existing) return ["insert", "authorized-new-observation"];
  if (deepEqual(existing, proposal)) return ["noop", "authorized-existing-identical"];
  return ["conflict", "authorized-existing-conflict"];
}
function makePlan(importPlan, target, authorizedSet, graph) {
  const decisions = []; const nodeProposals = []; const existingById = new Map(graph.nodes.map(node => [node.id, node]));
  for (const candidate of importPlan.candidates) {
    const canonicalNodeId = canonicalNodeIdForCandidate(candidate.candidateId, importPlan.generatedAt);
    if (!authorizedSet.has(candidate.candidateId)) { decisions.push({ candidateId: candidate.candidateId, canonicalNodeId, disposition: "deferred", reason: "not-authorized" }); continue; }
    const proposal = proposalFor(candidate, target, importPlan.generatedAt); const [disp, reason] = disposition(existingById.get(canonicalNodeId), proposal);
    decisions.push({ candidateId: candidate.candidateId, canonicalNodeId, disposition: disp, reason }); nodeProposals.push(proposal);
  }
  const count = dispositionName => decisions.filter(item => item.disposition === dispositionName).length;
  return { admissionVersion: CANONICAL_ADMISSION_VERSION_V01, policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1, generatedAt: importPlan.generatedAt, sourcePlan: { planVersion: importPlan.planVersion, policyVersion: importPlan.policyVersion, generatedAt: importPlan.generatedAt, candidateIds: importPlan.candidates.map(candidate => candidate.candidateId) }, target: deepClone(importPlan.target), decisions, nodeProposals, diagnostics: { candidateCount: decisions.length, authorizedCount: decisions.length - count("deferred"), deferredCount: count("deferred"), proposalCount: nodeProposals.length, insertCount: count("insert"), noopCount: count("noop"), conflictCount: count("conflict"), applyAllowed: count("conflict") === 0 } };
}

export function buildCanonicalAdmissionPlanV01(input) {
  if (!exactInput(input, INPUT_BUILD_KEYS)) throwError("INVALID_CANONICAL_ADMISSION_INPUT", "Canonical Admission build input is invalid");
  if (input.policyVersion !== GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1) throwError("INVALID_ADMISSION_POLICY_VERSION", "Admission policy is unsupported", { field: "policyVersion" });
  graphValidated(input.graph);
  const importPlan = importPlanValidated(input.plan);
  const target = targetProject(input.graph, importPlan.target.projectId);
  if (importPlan.target.scopeKey !== importPlan.target.projectId) throwError("TARGET_SCOPE_UNSUPPORTED", "Target scope is unsupported", { projectId: importPlan.target.projectId });
  const authorizedSet = validateAuthorization(input.authorizedCandidateIds, importPlan.candidates);
  const plan = makePlan(importPlan, target, authorizedSet, input.graph);
  try { return validateCanonicalAdmissionPlanV01(plan); } catch (error) { wrap("CANONICAL_ADMISSION_PLAN_INVALID", "Built Admission Plan is invalid", error); }
}

function bindingError(message, details) { throwError("CANONICAL_ADMISSION_SOURCE_MISMATCH", message, details); }
function checkApplyAuthorization(admissionPlan, importPlan, authorizedSet) {
  const proposals = new Map(admissionPlan.nodeProposals.map(proposal => [proposal.id, proposal]));
  for (const decision of admissionPlan.decisions) {
    const selected = authorizedSet.has(decision.candidateId); const proposal = proposals.get(decision.canonicalNodeId);
    if (selected && (!["insert", "noop", "conflict"].includes(decision.disposition) || !proposal)) throwError("CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH", "Admission authorization partition differs", { candidateId: decision.candidateId });
    if (!selected && (decision.disposition !== "deferred" || decision.reason !== "not-authorized" || proposal)) throwError("CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH", "Admission authorization partition differs", { candidateId: decision.candidateId });
  }
}
function checkRaces(graph, admissionPlan) {
  const currentById = new Map(graph.nodes.map(node => [node.id, node])); const proposals = new Map(admissionPlan.nodeProposals.map(proposal => [proposal.id, proposal]));
  for (const decision of admissionPlan.decisions) {
    if (decision.disposition === "deferred") continue;
    const current = currentById.get(decision.canonicalNodeId); const proposal = proposals.get(decision.canonicalNodeId);
    if (decision.disposition === "conflict") throwError("CANONICAL_APPLY_CONFLICT", "Admission contains a conflict", { canonicalNodeId: decision.canonicalNodeId });
    if (decision.disposition === "insert" && current && !deepEqual(current, proposal)) throwError("CANONICAL_APPLY_CONFLICT", "Current Graph conflicts with insert", { canonicalNodeId: decision.canonicalNodeId });
    if (decision.disposition === "noop" && (!current || !deepEqual(current, proposal))) throwError("CANONICAL_APPLY_CONFLICT", "Current Graph no longer matches noop", { canonicalNodeId: decision.canonicalNodeId });
  }
}

export function applyCanonicalAdmissionPlanV01(input) {
  if (!exactInput(input, INPUT_APPLY_KEYS)) throwError("INVALID_CANONICAL_ADMISSION_INPUT", "Canonical Admission apply input is invalid");
  graphValidated(input.graph);
  const importPlan = importPlanValidated(input.importPlan);
  let admissionPlan; try { admissionPlan = validateCanonicalAdmissionPlanV01(input.admissionPlan); } catch (error) { throw error; }
  const authorizedSet = validateAuthorization(input.authorizedCandidateIds, importPlan.candidates);
  const expectedSourcePlan = { planVersion: importPlan.planVersion, policyVersion: importPlan.policyVersion, generatedAt: importPlan.generatedAt, candidateIds: importPlan.candidates.map(candidate => candidate.candidateId) };
  if (!deepEqual(admissionPlan.sourcePlan, expectedSourcePlan) || !deepEqual(admissionPlan.target, importPlan.target)) bindingError("Admission source binding differs");
  const target = targetProject(input.graph, importPlan.target.projectId);
  if (importPlan.target.scopeKey !== importPlan.target.projectId) throwError("TARGET_SCOPE_UNSUPPORTED", "Target scope is unsupported", { projectId: importPlan.target.projectId });
  const candidateById = new Map(importPlan.candidates.map(candidate => [candidate.candidateId, candidate])); const proposalById = new Map(admissionPlan.nodeProposals.map(proposal => [proposal.id, proposal]));
  for (const decision of admissionPlan.decisions) if (decision.disposition !== "deferred") { const candidate = candidateById.get(decision.candidateId); const expected = proposalFor(candidate, target, admissionPlan.generatedAt); if (!deepEqual(proposalById.get(decision.canonicalNodeId), expected)) bindingError("Candidate proposal binding differs", { candidateId: candidate.candidateId }); }
  checkApplyAuthorization(admissionPlan, importPlan, authorizedSet);
  checkRaces(input.graph, admissionPlan);
  const result = deepClone(input.graph); const currentById = new Map(result.nodes.map(node => [node.id, node]));
  for (const decision of admissionPlan.decisions) if (decision.disposition === "insert" && !currentById.has(decision.canonicalNodeId)) { result.nodes.push(deepClone(proposalById.get(decision.canonicalNodeId))); }
  try { validateContextGraph(result); } catch (error) { throw new CanonicalAdmissionError("CANONICAL_GRAPH_RESULT_INVALID", "Result Graph is invalid"); }
  return deepFreeze(result);
}

export { CanonicalAdmissionError, CANONICAL_ADMISSION_ERROR_CODES_V01, CANONICAL_ADMISSION_VERSION_V01, GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 };
