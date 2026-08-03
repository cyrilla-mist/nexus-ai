import { validateDecisionMemoryGraph } from "./decision-memory-validator.mjs";

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
const byId = (a, b) => String(a.id).localeCompare(String(b.id));
const bySubject = (a, b) => String(a.payload.subjectKey).localeCompare(String(b.payload.subjectKey)) || String(a.payload.scopeKey).localeCompare(String(b.payload.scopeKey)) || byId(a, b);
const groupKey = (node) => `${node.payload.scopeKey}::${node.payload.subjectKey}`;
const isScopeMatch = (node, projectId, scopeKey) => node.scope.projectId === projectId && node.payload.scopeKey === scopeKey;
const isRestricted = (node) => node.governance.sensitivity === "restricted";
const consented = (node, ids) => node.governance.inheritance !== "explicit_only" || ids.has(node.id);

function omission(node, projectId, scopeKey, ids) {
  if (isRestricted(node)) return "restricted";
  if (node.governance.inheritance === "never") return "inheritance-never";
  if (!consented(node, ids)) return "explicit-only-no-consent";
  if (node.lifecycle.state === "revoked" || node.payload.decisionStatus === "revoked" || node.payload.memoryStatus === "revoked") return "revoked";
  if (!isScopeMatch(node, projectId, scopeKey)) return "scope-mismatch";
  if (!node.provenance?.authority) return "provenance-insufficient";
  return null;
}

function sortedUnique(values) { return [...new Set(values)].sort(); }

function makeConflict(type, subjectKey, scopeKey, recordIds, explanation) {
  const ids = sortedUnique(recordIds);
  return { conflictId: `conflict:${type}:${scopeKey}:${subjectKey}:${ids.join(",")}`, type, subjectKey, scopeKey, recordIds: ids, explanation, autoResolvable: false, requiredResolution: "human-review" };
}

function buildSuccessors(graph, kind) {
  const map = new Map();
  for (const edge of graph.edges.filter((item) => item.type === "supersedes" && item.lifecycle.state === "active")) {
    const from = graph.nodes.find((node) => node.id === edge.from); const to = graph.nodes.find((node) => node.id === edge.to);
    if (from?.kind === kind && to?.kind === kind) {
      if (!map.has(edge.from)) map.set(edge.from, []);
      map.get(edge.from).push(edge.to);
    }
  }
  for (const values of map.values()) values.sort();
  return map;
}

function validDecisionSuccessor(from, to) {
  const successorProposed = to.epistemic.verification === "inferred" || to.payload.decisionStatus === "proposed";
  const humanProtected = from.epistemic.verification === "confirmed" && from.provenance.authority === "human-confirmation" && to.provenance.authority !== "human-confirmation";
  return !successorProposed && !humanProtected;
}

function resolveDecisionGroup(nodes, successors, conflicts) {
  const sorted = [...nodes].sort((a, b) => String(a.payload.decidedAt).localeCompare(String(b.payload.decidedAt)) || byId(a, b));
  const ids = new Set(sorted.map((node) => node.id));
  const valid = new Map();
  const blockedSuccessors = new Set();
  for (const node of sorted) {
    const values = (successors.get(node.id) || []).filter((id) => ids.has(id));
    const validValues = values.filter((id) => validDecisionSuccessor(node, sorted.find((item) => item.id === id)));
    if (values.some((id) => !validValues.includes(id))) {
      const blocked = values.filter((id) => !validValues.includes(id));
      blocked.forEach((id) => blockedSuccessors.add(id));
      const successor = sorted.find((item) => item.id === blocked[0]);
      if (successor?.epistemic.verification === "inferred" || successor?.payload.decisionStatus === "proposed" || successor?.provenance.authority !== "human-confirmation") conflicts.push(makeConflict("authority_conflict", node.payload.subjectKey, node.payload.scopeKey, [node.id, ...blocked], "A successor lacks sufficient authority to replace the predecessor."));
    }
    valid.set(node.id, validValues);
  }
  // Rebuild the small authority/proposal exclusion set deterministically.
  for (const node of sorted) for (const id of successors.get(node.id) || []) if (!validDecisionSuccessor(node, sorted.find((item) => item.id === id))) blockedSuccessors.add(id);
  const eligibleNodes = sorted.filter((node) => !blockedSuccessors.has(node.id) && node.payload.decisionStatus !== "proposed" && node.epistemic.verification !== "inferred");
  const eligibleIds = new Set(eligibleNodes.map((node) => node.id));
  const roots = eligibleNodes.filter((node) => !eligibleNodes.some((candidate) => (valid.get(candidate.id) || []).includes(node.id))).map((node) => node.id).sort();
  const ordered = [];
  const walk = (id) => { if (ordered.includes(id)) return; ordered.push(id); for (const next of valid.get(id) || []) walk(next); };
  roots.forEach(walk); eligibleNodes.forEach((node) => walk(node.id));
  const terminals = eligibleNodes.filter((node) => (valid.get(node.id) || []).filter((id) => eligibleIds.has(id)).length === 0).map((node) => node.id).sort();
  const branches = sorted.filter((node) => (valid.get(node.id) || []).length > 1);
  if (branches.length) conflicts.push(makeConflict("branching_supersession", sorted[0].payload.subjectKey, sorted[0].payload.scopeKey, branches.flatMap((node) => [node.id, ...(valid.get(node.id) || [])]), "A predecessor has multiple active successors."));
  const terminalNodes = terminals.map((id) => sorted.find((node) => node.id === id));
  const activeCurrent = terminalNodes.filter((node) => node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && node.payload.decisionStatus === "confirmed");
  const differentChoices = !branches.length && activeCurrent.length > 1 && new Set(activeCurrent.map((node) => JSON.stringify(node.payload.choice))).size > 1;
  if (differentChoices) conflicts.push(makeConflict("contradictory_confirmed_decisions", sorted[0].payload.subjectKey, sorted[0].payload.scopeKey, activeCurrent.map((node) => node.id), "Confirmed current Decisions have mutually exclusive choices."));
  const sameChoices = activeCurrent.length > 1 && !differentChoices;
  const conflictForGroup = conflicts.some((item) => item.subjectKey === sorted[0].payload.subjectKey && item.scopeKey === sorted[0].payload.scopeKey && ["branching_supersession", "contradictory_confirmed_decisions"].includes(item.type));
  let chainStatus = "resolved";
  if (branches.length) chainStatus = "branching";
  else if (differentChoices) chainStatus = "incomplete";
  else if (!activeCurrent.length) chainStatus = "no_effective_decision";
  const effective = conflictForGroup ? [] : (sameChoices ? [activeCurrent.sort((a, b) => String(b.payload.decidedAt).localeCompare(String(a.payload.decidedAt)) || byId(a, b))[0]] : activeCurrent);
  return { chain: { subjectKey: sorted[0].payload.subjectKey, scopeKey: sorted[0].payload.scopeKey, rootDecisionIds: roots, orderedDecisionIds: ordered, terminalDecisionIds: terminals, chainStatus }, effective };
}

export function resolveDecisionMemory({ graph, projectId, scopeKey, consentedRecordIds = [] } = {}) {
  validateDecisionMemoryGraph({ graph, projectId, scopeKey });
  if (!Array.isArray(consentedRecordIds) || consentedRecordIds.some((id) => typeof id !== "string")) throw new TypeError("consentedRecordIds must be an array of strings.");
  const consentedIds = new Set(consentedRecordIds);
  const decisions = graph.nodes.filter((node) => node.kind === "decision");
  const memories = graph.nodes.filter((node) => node.kind === "memory");
  const omittedRecords = [];
  const includedDecisions = []; const includedMemories = [];
  for (const node of [...decisions, ...memories]) {
    const rule = omission(node, projectId, scopeKey, consentedIds);
    if (rule && !(node.kind === "decision" && rule === "revoked")) omittedRecords.push({ id: node.id, kind: node.kind, rule });
    if (node.kind === "decision" && (!rule || rule === "revoked")) includedDecisions.push(node);
    else if (node.kind === "memory" && !rule) includedMemories.push(node);
  }
  const conflicts = [];
  const successors = buildSuccessors(graph, "decision");
  const groups = new Map();
  includedDecisions.forEach((node) => { if (!groups.has(groupKey(node))) groups.set(groupKey(node), []); groups.get(groupKey(node)).push(node); });
  const decisionChains = []; const effectiveDecisionNodes = []; const proposedDecisionNodes = [];
  for (const group of [...groups.values()].sort((a, b) => groupKey(a[0]).localeCompare(groupKey(b[0])))) {
    const result = resolveDecisionGroup(group, successors, conflicts); decisionChains.push(result.chain); effectiveDecisionNodes.push(...result.effective);
    proposedDecisionNodes.push(...group.filter((node) => node.payload.decisionStatus === "proposed" || node.epistemic.verification === "inferred"));
  }
  const memorySuccessors = buildSuccessors(graph, "memory");
  const currentMemoryCandidates = includedMemories.filter((node) => node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && ["recorded", "inherited"].includes(node.payload.memoryStatus) && isScopeMatch(node, projectId, scopeKey) && !isRestricted(node));
  const candidateById = new Map(currentMemoryCandidates.map((node) => [node.id, node]));
  const memoryAdjacency = new Map(currentMemoryCandidates.map((node) => [node.id, new Set()]));
  const connect = (leftId, rightId) => {
    const left = candidateById.get(leftId); const right = candidateById.get(rightId);
    if (!left || !right || left.payload.subjectKey !== right.payload.subjectKey || left.payload.scopeKey !== right.payload.scopeKey || left.scope.projectId !== right.scope.projectId) return;
    memoryAdjacency.get(leftId).add(rightId); memoryAdjacency.get(rightId).add(leftId);
  };
  for (const node of currentMemoryCandidates) for (const ref of node.payload.conflictsWith || []) connect(node.id, ref);
  for (const edge of graph.edges.filter((item) => item.type === "contradicts" && item.lifecycle.state === "active")) connect(edge.from, edge.to);
  const memoryConflicts = new Set(); const visitedMemoryIds = new Set();
  for (const node of [...currentMemoryCandidates].sort(byId)) {
    if (visitedMemoryIds.has(node.id) || !memoryAdjacency.get(node.id).size) continue;
    const component = []; const queue = [node.id]; visitedMemoryIds.add(node.id);
    while (queue.length) { const id = queue.shift(); component.push(id); for (const next of [...memoryAdjacency.get(id)].sort()) if (!visitedMemoryIds.has(next)) { visitedMemoryIds.add(next); queue.push(next); } }
    component.sort(); component.forEach((id) => memoryConflicts.add(id));
    conflicts.push(makeConflict("memory_statement_conflict", node.payload.subjectKey, node.payload.scopeKey, component, "Confirmed current Memories have an explicit conflict component."));
  }
  const inheritedMemoryNodes = []; const inferredMemoryNodes = []; const disputedMemoryNodes = []; const historicalMemoryNodes = [];
  for (const node of includedMemories) {
    if (memoryConflicts.has(node.id)) continue;
    const superseded = (memorySuccessors.get(node.id) || []).length > 0;
    if (node.epistemic.verification === "disputed") disputedMemoryNodes.push(node);
    else if (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || ["archived", "superseded"].includes(node.lifecycle.state) || node.payload.memoryStatus === "superseded" || superseded) historicalMemoryNodes.push(node);
    else if (node.epistemic.verification === "inferred") inferredMemoryNodes.push(node);
    else if (node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current" && ["recorded", "inherited"].includes(node.payload.memoryStatus)) inheritedMemoryNodes.push(node);
  }
  const sortNodes = (nodes) => [...nodes].sort((a, b) => String(a.payload.subjectKey).localeCompare(String(b.payload.subjectKey)) || String(a.lifecycle.updatedAt).localeCompare(String(b.lifecycle.updatedAt)) || byId(a, b));
  const uniqueConflicts = [...new Map(conflicts.map((item) => [item.conflictId, item])).values()].sort((a, b) => a.type.localeCompare(b.type) || a.subjectKey.localeCompare(b.subjectKey) || a.conflictId.localeCompare(b.conflictId));
  const allReferencedDecisionIds = decisionChains.flatMap((chain) => chain.orderedDecisionIds);
  const result = {
    projectId, scopeKey, effectiveDecisionNodes: sortNodes(effectiveDecisionNodes), proposedDecisionNodes: sortNodes(proposedDecisionNodes), decisionChains: decisionChains.sort((a, b) => a.subjectKey.localeCompare(b.subjectKey) || a.scopeKey.localeCompare(b.scopeKey)), conflicts: uniqueConflicts,
    inheritedMemoryNodes: sortNodes(inheritedMemoryNodes), inferredMemoryNodes: sortNodes(inferredMemoryNodes), disputedMemoryNodes: sortNodes(disputedMemoryNodes), historicalMemoryNodes: sortNodes(historicalMemoryNodes), omittedRecords: omittedRecords.sort((a, b) => a.rule.localeCompare(b.rule) || a.id.localeCompare(b.id)),
    diagnostics: { decisionCount: decisions.length, memoryCount: memories.length, effectiveDecisionCount: effectiveDecisionNodes.length, proposedDecisionCount: proposedDecisionNodes.length, conflictCount: uniqueConflicts.length, inheritedMemoryCount: inheritedMemoryNodes.length, inferredMemoryCount: inferredMemoryNodes.length, disputedMemoryCount: disputedMemoryNodes.length, historicalMemoryCount: historicalMemoryNodes.length, omittedCount: omittedRecords.length, chainCount: decisionChains.length },
    sourceRecordIds: sortedUnique([...effectiveDecisionNodes, ...proposedDecisionNodes, ...inheritedMemoryNodes, ...inferredMemoryNodes, ...disputedMemoryNodes, ...historicalMemoryNodes].map((node) => node.id).concat(allReferencedDecisionIds, uniqueConflicts.flatMap((item) => item.recordIds)))
  };
  return deepFreeze(clone(result));
}
