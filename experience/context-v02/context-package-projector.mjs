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

const LEDGER_ARRAY_FIELDS = ["effectiveDecisions", "decisionChains", "proposedDecisions", "unresolvedConflicts", "inheritedMemories", "inferredMemories", "disputedMemories", "historicalMemories", "omittedRecords"];

function validateDecisionMemoryLedger(ledger, graph, generatedAt) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) throw new TypeError("decisionMemoryLedger must be an object.");
  if (ledger.ledgerVersion !== "0.2") throw new TypeError("decisionMemoryLedger.ledgerVersion must be 0.2.");
  if (ledger.projectId !== "project:nexus-atlas") throw new TypeError("decisionMemoryLedger.projectId must be project:nexus-atlas.");
  if (ledger.generatedAt !== generatedAt) throw new TypeError("decisionMemoryLedger.generatedAt must match Context Package generatedAt.");
  for (const field of LEDGER_ARRAY_FIELDS) if (!Array.isArray(ledger[field])) throw new TypeError(`decisionMemoryLedger.${field} must be an array.`);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const validateRefs = (items, kind, field) => items.forEach((item) => {
    const id = typeof item === "string" ? item : item?.id;
    const node = nodesById.get(id);
    if (!node) throw new TypeError(`decisionMemoryLedger.${field} references a missing node: ${id}`);
    if (node.kind !== kind) throw new TypeError(`decisionMemoryLedger.${field} references the wrong kind: ${id}`);
    if (node.governance.sensitivity === "restricted") throw new TypeError(`decisionMemoryLedger.${field} references restricted node: ${id}`);
  });
  validateRefs(ledger.effectiveDecisions, "decision", "effectiveDecisions");
  validateRefs(ledger.disputedMemories, "memory", "disputedMemories");
  validateRefs(ledger.historicalMemories, "memory", "historicalMemories");
  ledger.omittedRecords.forEach((item) => {
    const node = nodesById.get(item?.id);
    if (!node) throw new TypeError(`decisionMemoryLedger.omittedRecords references a missing node: ${item?.id}`);
    if (!["decision", "memory"].includes(node.kind)) throw new TypeError(`decisionMemoryLedger.omittedRecords references an invalid kind: ${item.id}`);
  });
}

export function buildContextPackageV02(options = {}) {
  const graph = options.graph;
  validateContextGraph(graph);
  const generatedAt = options.generatedAt || graph.metadata.generatedAt;
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) throw new TypeError("A deterministic generatedAt ISO timestamp is required.");
  const decisionMemoryLedger = options.decisionMemoryLedger;
  if (decisionMemoryLedger !== undefined) validateDecisionMemoryLedger(decisionMemoryLedger, graph, generatedAt);
  const nodes = graph.nodes;
  const projectCandidates = nodes.filter((node) => node.kind === "project" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && includesNode(node));
  if (projectCandidates.length !== 1 || projectCandidates[0].id !== "project:nexus-atlas") throw new Error("Expected exactly one active current confirmed project:nexus-atlas.");
  const projectNode = projectCandidates[0];
  const identitySnapshot = nodes.filter((node) => node.kind === "identity" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && INHERITED.has(node.governance.inheritance) && node.governance.sensitivity !== "restricted" && ["confirmed", "inferred"].includes(node.epistemic.verification)).sort(sortById).map(projection);
  const activeGoals = nodes.filter((node) => node.kind === "goal" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification !== "disputed" && includesNode(node)).sort(sortById).map(projection);
  const ledgerEffectiveIds = decisionMemoryLedger?.effectiveDecisions.map((item) => typeof item === "string" ? item : item.id);
  const confirmedDecisions = (ledgerEffectiveIds
    ? ledgerEffectiveIds.map((id) => nodes.find((node) => node.id === id))
    : nodes.filter((node) => node.kind === "decision" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && node.payload.decisionStatus === "confirmed" && includesNode(node)))
    .filter(Boolean).sort((a, b) => a.payload.decidedAt.localeCompare(b.payload.decidedAt) || a.id.localeCompare(b.id)).map(projectDecision);
  const currentEvidence = nodes.filter((node) => node.kind === "evidence" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && includesNode(node)).sort(sortById).map(projectEvidence);
  const decisionIds = new Set(nodes.filter((node) => node.kind === "decision").map((node) => node.id));
  const decisionMemoryIds = new Set(nodes.filter((node) => ["decision", "memory"].includes(node.kind)).map((node) => node.id));
  const ledgerDisputedIds = decisionMemoryLedger?.disputedMemories.map((item) => typeof item === "string" ? item : item.id) || [];
  const ledgerHistoricalIds = decisionMemoryLedger?.historicalMemories.map((item) => typeof item === "string" ? item : item.id) || [];
  const disputedIds = decisionMemoryLedger ? [...ledgerDisputedIds, ...nodes.filter((node) => !decisionMemoryIds.has(node.id) && node.epistemic.verification === "disputed").map((node) => node.id)] : nodes.filter((node) => node.epistemic.verification === "disputed" && node.lifecycle.state !== "revoked").map((node) => node.id);
  const staleIds = decisionMemoryLedger ? [...ledgerHistoricalIds, ...nodes.filter((node) => !decisionMemoryIds.has(node.id) && (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || node.lifecycle.state === "superseded") && node.epistemic.verification !== "disputed").map((node) => node.id)] : nodes.filter((node) => !decisionIds.has(node.id) && (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || node.lifecycle.state === "superseded") && node.epistemic.verification !== "disputed").map((node) => node.id);
  const disputedContext = [...new Set(disputedIds)].map((id) => nodes.find((node) => node.id === id)).filter((node) => node && node.governance.sensitivity !== "restricted").sort(sortById).map(projection);
  const staleContext = [...new Set(staleIds)].map((id) => nodes.find((node) => node.id === id)).filter((node) => node && node.governance.sensitivity !== "restricted").sort(sortById).map(projection);
  const openRisks = nodes.filter((node) => node.kind === "risk" && node.lifecycle.state === "active" && node.epistemic.freshness !== "expired" && includesNode(node)).sort((a, b) => compareTuple(a, b, [["severity", SEVERITY], ["likelihood", LIKELIHOOD]])).map(projection);
  const nextActions = nodes.filter((node) => node.kind === "action" && node.lifecycle.state === "active" && Object.hasOwn(ACTION_STATUS, node.payload.actionStatus)).sort((a, b) => compareTuple(a, b, [["priority", PRIORITY], ["actionStatus", ACTION_STATUS]])).map(projectAction);
  const includedIds = new Set([
    projectNode.id,
    ...identitySnapshot.map((item) => item.id),
    ...activeGoals.map((item) => item.id),
    ...confirmedDecisions.map((item) => item.id),
    ...currentEvidence.map((item) => item.id),
    ...disputedContext.map((item) => item.id),
    ...staleContext.map((item) => item.id),
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
    omittedContext: [...explicitOmissions(graph), ...(decisionMemoryLedger ? [
      ...computedOmissions(nodes.filter((node) => !decisionMemoryIds.has(node.id))),
      ...decisionMemoryLedger.omittedRecords.map((item) => ({ id: item.id, reason: "Decision / Memory governance excluded this record.", rule: item.rule }))
    ] : computedOmissions(nodes))],
    sourceSummary: { totalIncludedNodes: includedNodes.length, providers },
  };
  return deepFreeze(clone(result));
}
