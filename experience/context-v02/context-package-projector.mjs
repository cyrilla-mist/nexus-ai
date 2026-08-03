import { validateContextGraph } from "./context-graph-validator.mjs";

export const CONTEXT_PACKAGE_VERSION = "0.2";

const INHERITED = new Set(["always", "project_only"]);
const PRIORITY = { high: 0, medium: 1, low: 2 };
const ACTION_STATUS = { in_progress: 0, ready: 1, blocked: 2, proposed: 3 };
const SEVERITY = { high: 0, medium: 1, low: 2 };
const LIKELIHOOD = { high: 0, medium: 1, low: 2 };

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function safeSource(node) {
  return { provider: node.provenance.provider, reference: node.provenance.reference };
}

function safeRecord(node) {
  return {
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary,
    verification: node.epistemic.verification,
    freshness: node.epistemic.freshness,
    lifecycle: node.lifecycle.state,
    source: safeSource(node),
  };
}

function includesNode(node) {
  return node.governance.sensitivity !== "restricted" && INHERITED.has(node.governance.inheritance);
}

function sortById(a, b) {
  return a.id.localeCompare(b.id);
}

function projectDecision(node) {
  return {
    ...safeRecord(node),
    question: node.payload.question,
    choice: node.payload.choice,
    rationale: node.payload.rationale,
    decisionStatus: node.payload.decisionStatus,
    decidedAt: node.payload.decidedAt,
    decidedBy: node.payload.decidedBy,
    supersededBy: node.payload.supersededBy,
  };
}

function projectEvidence(node) {
  return {
    ...safeRecord(node),
    claim: node.payload.claim,
    sourceRef: node.payload.sourceRef,
    observedAt: node.payload.observedAt,
    appliesToVersion: node.payload.appliesToVersion,
    verificationMethod: node.payload.verificationMethod,
    result: node.payload.result,
  };
}

function projectAction(node) {
  return {
    ...safeRecord(node),
    description: node.payload.description,
    owner: node.payload.owner,
    priority: node.payload.priority,
    actionStatus: node.payload.actionStatus,
    completionCriteria: node.payload.completionCriteria,
    relatedDecisionRefs: [...node.payload.relatedDecisionRefs],
    externalEffect: node.payload.externalEffect,
    requiresConfirmation: node.payload.requiresConfirmation,
  };
}

function projectProject(node) {
  return {
    id: node.id,
    title: node.title,
    summary: node.summary,
    currentPhase: node.payload.currentPhase,
    currentVersion: node.payload.currentVersion,
    currentMilestoneId: node.payload.currentMilestoneId,
    repositoryRefs: [...node.payload.repositoryRefs],
    source: safeSource(node),
  };
}

function projection(node) {
  return safeRecord(node);
}

function compareTuple(a, b, fields) {
  for (const [field, ranks] of fields) {
    const difference = (ranks[a.payload[field]] ?? 99) - (ranks[b.payload[field]] ?? 99);
    if (difference) return difference;
  }
  return a.id.localeCompare(b.id);
}

function explicitOmissions(graph) {
  return Array.isArray(graph.contextPackage.omittedContext)
    ? graph.contextPackage.omittedContext.map((item) => ({ ...item }))
    : [];
}

function computedOmissions(nodes) {
  return nodes.flatMap((node) => {
    if (node.governance.sensitivity === "restricted") return [{ id: node.id, reason: "Restricted sensitivity", rule: "restricted-excluded" }];
    if (node.governance.inheritance === "never") return [{ id: node.id, reason: "Inheritance is never", rule: "inheritance-never" }];
    if (node.governance.inheritance === "explicit_only") return [{ id: node.id, reason: "No explicit consent was provided", rule: "explicit-consent-required" }];
    if (node.lifecycle.state === "revoked") return [{ id: node.id, reason: "Node is revoked", rule: "revoked-excluded" }];
    return [];
  });
}

export function buildContextPackageV02(options = {}) {
  const graph = options.graph;
  validateContextGraph(graph);
  const generatedAt = options.generatedAt || graph.metadata.generatedAt;
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) throw new TypeError("A deterministic generatedAt ISO timestamp is required.");
  const nodes = graph.nodes;
  const projectCandidates = nodes.filter((node) => node.kind === "project" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && includesNode(node));
  if (projectCandidates.length !== 1 || projectCandidates[0].id !== "project:nexus-atlas") throw new Error("Expected exactly one active current confirmed project:nexus-atlas.");
  const projectNode = projectCandidates[0];
  const identitySnapshot = nodes.filter((node) => node.kind === "identity" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && INHERITED.has(node.governance.inheritance) && node.governance.sensitivity !== "restricted" && ["confirmed", "inferred"].includes(node.epistemic.verification)).sort(sortById).map(projection);
  const activeGoals = nodes.filter((node) => node.kind === "goal" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification !== "disputed" && includesNode(node)).sort(sortById).map(projection);
  const confirmedDecisions = nodes.filter((node) => node.kind === "decision" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && node.payload.decisionStatus === "confirmed" && includesNode(node)).sort((a, b) => a.payload.decidedAt.localeCompare(b.payload.decidedAt) || a.id.localeCompare(b.id)).map(projectDecision);
  const currentEvidence = nodes.filter((node) => node.kind === "evidence" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && includesNode(node)).sort(sortById).map(projectEvidence);
  const disputedContext = nodes.filter((node) => node.epistemic.verification === "disputed" && node.lifecycle.state !== "revoked" && node.governance.sensitivity !== "restricted").sort(sortById).map(projection);
  const staleContext = nodes.filter((node) => (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || node.lifecycle.state === "superseded") && node.epistemic.verification !== "disputed" && node.governance.sensitivity !== "restricted").sort(sortById).map(projection);
  const openRisks = nodes.filter((node) => node.kind === "risk" && node.lifecycle.state === "active" && node.epistemic.freshness !== "expired" && includesNode(node)).sort((a, b) => compareTuple(a, b, [["severity", SEVERITY], ["likelihood", LIKELIHOOD]])).map(projection);
  const nextActions = nodes.filter((node) => node.kind === "action" && node.lifecycle.state === "active" && Object.hasOwn(ACTION_STATUS, node.payload.actionStatus)).sort((a, b) => compareTuple(a, b, [["priority", PRIORITY], ["actionStatus", ACTION_STATUS]])).map(projectAction);
  const includedIds = new Set([
    projectNode.id,
    ...identitySnapshot.map((item) => item.id),
    ...activeGoals.map((item) => item.id),
    ...confirmedDecisions.map((item) => item.id),
    ...currentEvidence.map((item) => item.id),
    ...openRisks.map((item) => item.id),
    ...nextActions.map((item) => item.id),
  ]);
  const includedNodes = nodes.filter((node) => includedIds.has(node.id));
  const providers = Object.fromEntries([...new Set(includedNodes.map((node) => node.provenance.provider))].sort().map((provider) => [provider, includedNodes.filter((node) => node.provenance.provider === provider).length]));
  const result = {
    packageVersion: CONTEXT_PACKAGE_VERSION,
    packageId: `context-package:nexus-atlas:${generatedAt.replace(/[:+]/g, "-")}`,
    generatedAt,
    project: projectProject(projectNode),
    identitySnapshot,
    activeGoals,
    confirmedDecisions,
    currentEvidence,
    disputedContext,
    staleContext,
    openRisks,
    nextActions,
    omittedContext: [...explicitOmissions(graph), ...computedOmissions(nodes)],
    sourceSummary: { totalIncludedNodes: includedNodes.length, providers },
  };
  return deepFreeze(clone(result));
}
