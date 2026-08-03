const KINDS = new Set([
  "identity", "project", "goal", "milestone", "event", "decision",
  "evidence", "memory", "risk", "action", "source",
]);
const LIFECYCLE = new Set(["active", "completed", "archived", "superseded", "revoked"]);
const EDGE_LIFECYCLE = new Set(["active", "superseded", "revoked"]);
const VERIFICATION = new Set(["confirmed", "inferred", "unverified", "disputed"]);
const FRESHNESS = new Set(["current", "stale", "expired", "unknown"]);
const SENSITIVITY = new Set(["public", "personal", "sensitive", "restricted"]);
const INHERITANCE = new Set(["always", "project_only", "explicit_only", "never"]);
const EDGE_TYPES = new Set([
  "belongs_to", "supports", "contradicts", "supersedes", "depends_on",
  "produces", "motivates", "implements", "blocks", "assigned_to", "derived_from",
]);
const DECISION_STATUS = new Set(["proposed", "confirmed", "superseded", "revoked"]);
const ACTION_STATUS = new Set(["proposed", "ready", "blocked", "in_progress", "completed", "cancelled"]);

export class ContextGraphValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContextGraphValidationError";
  }
}

function fail(message) {
  throw new ContextGraphValidationError(message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object.`);
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string.`);
}

function array(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
}

function iso(value, label) {
  nonEmpty(value, label);
  if (Number.isNaN(Date.parse(value))) fail(`${label} must be a valid ISO 8601 timestamp.`);
}

function enumValue(value, values, label) {
  if (!values.has(value)) fail(`${label} has an invalid value: ${String(value)}.`);
}

function requiredPayload(payload, fields, id) {
  fields.forEach((field) => {
    if (!(field in payload)) fail(`Node ${id} payload is missing ${field}.`);
  });
}

function validateNode(node, nodeIds, seenNodeIds = nodeIds) {
  object(node, "node");
  ["id", "kind", "title", "summary", "scope", "lifecycle", "epistemic", "provenance", "governance", "payload"].forEach((field) => {
    if (!(field in node)) fail(`Node is missing ${field}.`);
  });
  nonEmpty(node.id, "node.id");
  if (seenNodeIds.has(node.id)) fail(`Duplicate node id: ${node.id}`);
  seenNodeIds.add(node.id);
  enumValue(node.kind, KINDS, `node ${node.id} kind`);
  object(node.scope, `node ${node.id} scope`);
  nonEmpty(node.scope.userId, `node ${node.id} scope.userId`);
  nonEmpty(node.scope.projectId, `node ${node.id} scope.projectId`);
  object(node.lifecycle, `node ${node.id} lifecycle`);
  enumValue(node.lifecycle.state, LIFECYCLE, `node ${node.id} lifecycle.state`);
  iso(node.lifecycle.createdAt, `node ${node.id} lifecycle.createdAt`);
  iso(node.lifecycle.updatedAt, `node ${node.id} lifecycle.updatedAt`);
  object(node.epistemic, `node ${node.id} epistemic`);
  enumValue(node.epistemic.verification, VERIFICATION, `node ${node.id} epistemic.verification`);
  if (typeof node.epistemic.confidence !== "number" || node.epistemic.confidence < 0 || node.epistemic.confidence > 1) fail(`node ${node.id} epistemic.confidence must be between 0 and 1.`);
  enumValue(node.epistemic.freshness, FRESHNESS, `node ${node.id} epistemic.freshness`);
  object(node.provenance, `node ${node.id} provenance`);
  nonEmpty(node.provenance.provider, `node ${node.id} provenance.provider`);
  nonEmpty(node.provenance.reference, `node ${node.id} provenance.reference`);
  iso(node.provenance.capturedAt, `node ${node.id} provenance.capturedAt`);
  object(node.governance, `node ${node.id} governance`);
  enumValue(node.governance.sensitivity, SENSITIVITY, `node ${node.id} governance.sensitivity`);
  enumValue(node.governance.inheritance, INHERITANCE, `node ${node.id} governance.inheritance`);
  if (typeof node.governance.requiresConfirmation !== "boolean") fail(`node ${node.id} governance.requiresConfirmation must be boolean.`);
  object(node.payload, `node ${node.id} payload`);
  if (node.kind === "decision") validateDecision(node, nodeIds);
  if (node.kind === "action") validateAction(node, nodeIds);
  if (node.kind === "evidence") requiredPayload(node.payload, ["claim", "sourceRef", "observedAt", "appliesToVersion", "verificationMethod", "result"], node.id);
  if (node.kind === "risk") requiredPayload(node.payload, ["severity", "likelihood", "mitigation"], node.id);
  if (node.kind === "project") validateProject(node);
}

function validateDecision(node, nodeIds) {
  requiredPayload(node.payload, ["question", "choice", "rationale", "alternatives", "constraints", "decidedAt", "decidedBy", "decisionStatus", "supersededBy"], node.id);
  array(node.payload.alternatives, `decision ${node.id} alternatives`);
  array(node.payload.constraints, `decision ${node.id} constraints`);
  iso(node.payload.decidedAt, `decision ${node.id} decidedAt`);
  nonEmpty(node.payload.decidedBy, `decision ${node.id} decidedBy`);
  enumValue(node.payload.decisionStatus, DECISION_STATUS, `decision ${node.id} decisionStatus`);
  if (node.payload.decisionStatus === "confirmed" && node.epistemic.verification !== "confirmed") fail(`Confirmed decision ${node.id} must have confirmed verification.`);
  if (node.payload.decisionStatus === "superseded" && node.lifecycle.state !== "superseded") fail(`Superseded decision ${node.id} must have superseded lifecycle.`);
  if (node.payload.supersededBy !== null) {
    nonEmpty(node.payload.supersededBy, `decision ${node.id} supersededBy`);
    if (!nodeIds.has(node.payload.supersededBy)) fail(`Decision ${node.id} has dangling supersededBy: ${node.payload.supersededBy}`);
  }
}

function validateAction(node, nodeIds) {
  requiredPayload(node.payload, ["description", "priority", "actionStatus", "completionCriteria", "relatedDecisionRefs", "externalEffect", "requiresConfirmation"], node.id);
  enumValue(node.payload.actionStatus, ACTION_STATUS, `action ${node.id} actionStatus`);
  array(node.payload.relatedDecisionRefs, `action ${node.id} relatedDecisionRefs`);
  node.payload.relatedDecisionRefs.forEach((ref) => {
    if (!nodeIds.has(ref)) fail(`Action ${node.id} has dangling relatedDecisionRef: ${ref}`);
  });
  if (typeof node.payload.externalEffect !== "boolean" || typeof node.payload.requiresConfirmation !== "boolean") fail(`Action ${node.id} externalEffect and requiresConfirmation must be boolean.`);
  if (node.payload.externalEffect && !node.payload.requiresConfirmation) fail(`External-effect action ${node.id} requires confirmation.`);
}

function validateProject(node) {
  requiredPayload(node.payload, ["purpose", "currentPhase", "currentVersion", "currentMilestoneId", "territoryIds", "lastActiveAt", "repositoryRefs"], node.id);
  array(node.payload.territoryIds, `project ${node.id} territoryIds`);
  array(node.payload.repositoryRefs, `project ${node.id} repositoryRefs`);
  iso(node.payload.lastActiveAt, `project ${node.id} lastActiveAt`);
}

function validateEdge(edge, nodeIds, edgeIds) {
  object(edge, "edge");
  ["id", "from", "to", "type", "lifecycle", "provenance", "metadata"].forEach((field) => {
    if (!(field in edge)) fail(`Edge is missing ${field}.`);
  });
  nonEmpty(edge.id, "edge.id");
  if (edgeIds.has(edge.id)) fail(`Duplicate edge id: ${edge.id}`);
  edgeIds.add(edge.id);
  nonEmpty(edge.from, `edge ${edge.id} from`);
  nonEmpty(edge.to, `edge ${edge.id} to`);
  if (edge.from === edge.to) fail(`Edge ${edge.id} cannot point to itself.`);
  if (!nodeIds.has(edge.from)) fail(`Edge ${edge.id} has missing from: ${edge.from}`);
  if (!nodeIds.has(edge.to)) fail(`Edge ${edge.id} has missing to: ${edge.to}`);
  enumValue(edge.type, EDGE_TYPES, `edge ${edge.id} type`);
  object(edge.lifecycle, `edge ${edge.id} lifecycle`);
  enumValue(edge.lifecycle.state, EDGE_LIFECYCLE, `edge ${edge.id} lifecycle.state`);
  iso(edge.lifecycle.createdAt, `edge ${edge.id} lifecycle.createdAt`);
  iso(edge.lifecycle.updatedAt, `edge ${edge.id} lifecycle.updatedAt`);
  object(edge.provenance, `edge ${edge.id} provenance`);
  nonEmpty(edge.provenance.provider, `edge ${edge.id} provenance.provider`);
  nonEmpty(edge.provenance.reference, `edge ${edge.id} provenance.reference`);
  object(edge.metadata, `edge ${edge.id} metadata`);
}

const PACKAGE_FIELDS = ["project", "identitySnapshot", "activeGoals", "confirmedDecisions", "currentEvidence", "disputedContext", "staleContext", "openRisks", "nextActions"];
const PACKAGE_KINDS = { project: "project", identitySnapshot: "identity", activeGoals: "goal", confirmedDecisions: "decision", currentEvidence: "evidence", openRisks: "risk", nextActions: "action" };

function validatePackage(packageValue, nodesById) {
  object(packageValue, "contextPackage");
  PACKAGE_FIELDS.forEach((field) => {
    if (!(field in packageValue)) return;
    const values = field === "project" ? [packageValue[field]] : packageValue[field];
    array(values, `contextPackage.${field}`);
    values.forEach((ref) => {
      nonEmpty(ref, `contextPackage.${field} reference`);
      const node = nodesById.get(ref);
      if (!node) fail(`ContextPackage ${field} has missing reference: ${ref}`);
      const expectedKind = PACKAGE_KINDS[field];
      if (expectedKind && node.kind !== expectedKind) fail(`ContextPackage ${field} reference has wrong kind: ${ref}`);
    });
  });
}

export function validateContextGraph(input) {
  object(input, "graph");
  object(input.metadata, "metadata");
  if (input.metadata.schemaVersion !== "0.2-proposed") fail("metadata.schemaVersion must be 0.2-proposed.");
  if (input.metadata.example !== true) fail("metadata.example must be true.");
  if (input.metadata.runtimeEvidence !== false) fail("metadata.runtimeEvidence must be false.");
  array(input.nodes, "nodes");
  array(input.edges, "edges");
  object(input.contextPackage, "contextPackage");
  const nodeIds = new Set();
  input.nodes.forEach((node) => {
    nonEmpty(node?.id, "node.id");
    if (nodeIds.has(node.id)) fail(`Duplicate node id: ${node.id}`);
    nodeIds.add(node.id);
  });
  const seenNodeIds = new Set();
  input.nodes.forEach((node) => validateNode(node, nodeIds, seenNodeIds));
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const milestoneIds = new Set(input.nodes.filter((node) => node.kind === "milestone").map((node) => node.id));
  input.nodes.filter((node) => node.kind === "project").forEach((node) => {
    if (node.payload.currentMilestoneId !== null && !milestoneIds.has(node.payload.currentMilestoneId)) fail(`Project ${node.id} has dangling currentMilestoneId: ${node.payload.currentMilestoneId}`);
  });
  const edgeIds = new Set();
  input.edges.forEach((edge) => validateEdge(edge, nodeIds, edgeIds));
  validatePackage(input.contextPackage, nodesById);
  return { valid: true, nodeCount: input.nodes.length, edgeCount: input.edges.length, nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
}
