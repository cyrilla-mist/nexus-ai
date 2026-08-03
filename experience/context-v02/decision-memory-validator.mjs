import { validateContextGraph } from "./context-graph-validator.mjs";

const DECISION_STATUSES = new Set(["proposed", "confirmed", "superseded", "revoked"]);
const MEMORY_STATUSES = new Set(["recorded", "inherited", "superseded", "disputed", "revoked"]);
const ACTIVE_EDGE_STATES = new Set(["active"]);

export class DecisionMemoryValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DecisionMemoryValidationError";
    this.code = code;
    this.details = details;
  }
}

const fail = (code, message, details = {}) => {
  throw new DecisionMemoryValidationError(code, message, details);
};

const nonEmpty = (value, field, code = "INVALID_DECISION_FIELD") => {
  if (typeof value !== "string" || !value.trim()) fail(code, `${field} must be a non-empty string.`, { field });
};

const isIso = (value) => typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value));

function mapContextError(error) {
  const message = error?.message || String(error);
  if (/Duplicate (node|edge) id/i.test(message)) return ["DUPLICATE_ID", message];
  if (/missing (from|to)|dangling|missing reference/i.test(message)) return ["DANGLING_REFERENCE", message];
  if (/wrong kind/i.test(message)) return ["WRONG_REFERENCE_KIND", message];
  return ["CONTEXT_GRAPH_INVALID", message];
}

function validateDecision(node, nodeIds, nodesById) {
  const payload = node.payload;
  nonEmpty(payload.subjectKey, `decision ${node.id} subjectKey`, "MISSING_SUBJECT_KEY");
  nonEmpty(payload.scopeKey, `decision ${node.id} scopeKey`, "MISSING_SCOPE_KEY");
  nonEmpty(node.scope?.projectId, `decision ${node.id} scope.projectId`, "MISSING_SCOPE_KEY");
  nonEmpty(node.provenance?.authority, `decision ${node.id} provenance.authority`, "MISSING_AUTHORITY");
  if (!Array.isArray(payload.evidenceRefs)) fail("INVALID_DECISION_FIELD", `${node.id}.evidenceRefs must be an array.`, { id: node.id, field: "evidenceRefs" });
  for (const ref of payload.evidenceRefs) {
    nonEmpty(ref, `decision ${node.id} evidenceRef`);
    if (!nodeIds.has(ref)) fail("DANGLING_REFERENCE", `Decision ${node.id} has dangling evidenceRef: ${ref}`, { id: node.id, ref });
    if (nodesById.get(ref)?.kind !== "evidence") fail("WRONG_REFERENCE_KIND", `Decision ${node.id} evidenceRef must reference evidence: ${ref}`, { id: node.id, ref });
  }
  if (!Array.isArray(payload.alternatives) || !Array.isArray(payload.constraints)) fail("INVALID_DECISION_FIELD", `Decision ${node.id} alternatives and constraints must be arrays.`, { id: node.id });
  if (!isIso(payload.decidedAt) || typeof payload.decidedBy !== "string" || !payload.decidedBy.trim()) fail("INVALID_DECISION_FIELD", `Decision ${node.id} has invalid decidedAt or decidedBy.`, { id: node.id });
  if (!DECISION_STATUSES.has(payload.decisionStatus)) fail("INVALID_DECISION_FIELD", `Decision ${node.id} has invalid decisionStatus.`, { id: node.id });
  if (payload.supersededBy !== null && (typeof payload.supersededBy !== "string" || !nodeIds.has(payload.supersededBy) || nodesById.get(payload.supersededBy)?.kind !== "decision")) fail("INVALID_DECISION_FIELD", `Decision ${node.id} supersededBy must be null or a Decision ID.`, { id: node.id });
}

function validateMemory(node, nodeIds, nodesById) {
  const payload = node.payload;
  nonEmpty(payload.subjectKey, `memory ${node.id} subjectKey`, "MISSING_SUBJECT_KEY");
  nonEmpty(payload.scopeKey, `memory ${node.id} scopeKey`, "MISSING_SCOPE_KEY");
  nonEmpty(node.scope?.projectId, `memory ${node.id} scope.projectId`, "MISSING_SCOPE_KEY");
  nonEmpty(payload.statement, `memory ${node.id} statement`, "INVALID_MEMORY_FIELD");
  nonEmpty(payload.basis, `memory ${node.id} basis`, "INVALID_MEMORY_FIELD");
  nonEmpty(node.provenance?.authority, `memory ${node.id} provenance.authority`, "MISSING_AUTHORITY");
  if (!Array.isArray(payload.relatedEntityRefs)) fail("INVALID_MEMORY_FIELD", `${node.id}.relatedEntityRefs must be an array.`, { id: node.id });
  for (const ref of payload.relatedEntityRefs) {
    if (!nodeIds.has(ref)) fail("DANGLING_REFERENCE", `Memory ${node.id} has dangling relatedEntityRef: ${ref}`, { id: node.id, ref });
  }
  if (!Array.isArray(payload.conflictsWith)) fail("INVALID_MEMORY_FIELD", `${node.id}.conflictsWith must be an array.`, { id: node.id });
  for (const ref of payload.conflictsWith) {
    if (!nodeIds.has(ref)) fail("DANGLING_REFERENCE", `Memory ${node.id} has dangling conflictsWith: ${ref}`, { id: node.id, ref });
    if (nodesById.get(ref)?.kind !== "memory") fail("WRONG_REFERENCE_KIND", `Memory ${node.id} conflictsWith must reference memory: ${ref}`, { id: node.id, ref });
  }
  if (payload.supersededBy !== null && (typeof payload.supersededBy !== "string" || !nodeIds.has(payload.supersededBy) || nodesById.get(payload.supersededBy)?.kind !== "memory")) fail("INVALID_MEMORY_FIELD", `Memory ${node.id} supersededBy must be null or a Memory ID.`, { id: node.id });
  if (!MEMORY_STATUSES.has(payload.memoryStatus)) fail("INVALID_MEMORY_FIELD", `Memory ${node.id} has invalid memoryStatus.`, { id: node.id });
}

function detectCycle(ids, successors, label) {
  const visiting = new Set();
  const visited = new Set();
  const path = [];
  const visit = (id) => {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      fail("SUPERSESSION_CYCLE", `${label} supersession cycle detected.`, { cycle: path.slice(start).concat(id).sort() });
    }
    if (visited.has(id)) return;
    visiting.add(id); path.push(id);
    for (const next of [...(successors.get(id) || [])].sort()) visit(next);
    path.pop(); visiting.delete(id); visited.add(id);
  };
  [...ids].sort().forEach(visit);
}

export function validateDecisionMemoryGraph({ graph, projectId, scopeKey } = {}) {
  if (!graph || typeof graph !== "object") fail("CONTEXT_GRAPH_INVALID", "graph must be an object.");
  try { validateContextGraph(graph); } catch (error) {
    const [code, message] = mapContextError(error); fail(code, message, { cause: error?.name });
  }
  nonEmpty(projectId, "projectId", "MISSING_SCOPE_KEY");
  nonEmpty(scopeKey, "scopeKey", "MISSING_SCOPE_KEY");
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIds = new Set(nodesById.keys());
  const decisions = graph.nodes.filter((node) => node.kind === "decision");
  const memories = graph.nodes.filter((node) => node.kind === "memory");
  decisions.forEach((node) => validateDecision(node, nodeIds, nodesById));
  memories.forEach((node) => validateMemory(node, nodeIds, nodesById));
  const decisionIds = new Set(decisions.map((node) => node.id));
  const memoryIds = new Set(memories.map((node) => node.id));
  const decisionSuccessors = new Map();
  const memorySuccessors = new Map();
  let activeDecisionSupersessionEdgeCount = 0;
  let activeMemorySupersessionEdgeCount = 0;
  for (const edge of graph.edges.filter((item) => item.type === "supersedes")) {
    const from = nodesById.get(edge.from); const to = nodesById.get(edge.to);
    if (!from || !to) fail("DANGLING_REFERENCE", `Supersession edge ${edge.id} has a missing endpoint.`, { edgeId: edge.id });
    const sameDecision = decisionIds.has(edge.from) && decisionIds.has(edge.to);
    const sameMemory = memoryIds.has(edge.from) && memoryIds.has(edge.to);
    if (!sameDecision && !sameMemory) fail("WRONG_REFERENCE_KIND", `Supersession edge ${edge.id} crosses Decision and Memory kinds.`, { edgeId: edge.id });
    if (from.payload.subjectKey !== to.payload.subjectKey) fail(sameDecision ? "DECISION_SUBJECT_MISMATCH" : "MEMORY_SUBJECT_MISMATCH", `Supersession edge ${edge.id} has incompatible subjectKey.`, { edgeId: edge.id });
    if (from.payload.scopeKey !== to.payload.scopeKey) fail(sameDecision ? "DECISION_SCOPE_MISMATCH" : "MEMORY_SCOPE_MISMATCH", `Supersession edge ${edge.id} has incompatible scopeKey.`, { edgeId: edge.id });
    if (edge.from === edge.to) fail("SUPERSESSION_SELF_LOOP", `Supersession edge ${edge.id} is a self-loop.`, { edgeId: edge.id });
    if (ACTIVE_EDGE_STATES.has(edge.lifecycle.state)) {
      const map = sameDecision ? decisionSuccessors : memorySuccessors;
      if (!map.has(edge.from)) map.set(edge.from, []);
      map.get(edge.from).push(edge.to);
      if (sameDecision) activeDecisionSupersessionEdgeCount += 1; else activeMemorySupersessionEdgeCount += 1;
    }
  }
  for (const node of [...decisions, ...memories]) {
    const successors = node.kind === "decision" ? (decisionSuccessors.get(node.id) || []) : (memorySuccessors.get(node.id) || []);
    const claimed = node.payload.supersededBy;
    if (successors.length === 0 && claimed !== null) fail(node.kind === "decision" ? "DECISION_EDGE_MISMATCH" : "MEMORY_EDGE_MISMATCH", `${node.id} claims a successor without an active edge.`, { id: node.id, claimed });
    if (successors.length === 1 && claimed !== successors[0]) fail(node.kind === "decision" ? "DECISION_EDGE_MISMATCH" : "MEMORY_EDGE_MISMATCH", `${node.id} supersededBy disagrees with its active successor.`, { id: node.id, claimed, successors });
    if (successors.length > 1 && claimed !== null) fail(node.kind === "decision" ? "DECISION_EDGE_MISMATCH" : "MEMORY_EDGE_MISMATCH", `${node.id} has branching successors but a non-null supersededBy.`, { id: node.id, claimed, successors });
  }
  detectCycle(decisionIds, decisionSuccessors, "Decision");
  detectCycle(memoryIds, memorySuccessors, "Memory");
  return { valid: true, projectId, scopeKey, decisionCount: decisions.length, memoryCount: memories.length, activeDecisionSupersessionEdgeCount, activeMemorySupersessionEdgeCount };
}
