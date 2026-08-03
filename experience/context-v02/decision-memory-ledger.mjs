import { DecisionMemoryValidationError } from "./decision-memory-validator.mjs";
import { resolveDecisionMemory } from "./decision-memory-resolver.mjs";

export const DECISION_MEMORY_LEDGER_VERSION = "0.2";

const clone = (value) => JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
const source = (node) => ({ provider: node.provenance.provider, authority: node.provenance.authority });
const decisionProjection = (node) => ({ id: node.id, kind: node.kind, title: node.title, summary: node.summary, subjectKey: node.payload.subjectKey, scopeKey: node.payload.scopeKey, choice: node.payload.choice, rationale: node.payload.rationale, decisionStatus: node.payload.decisionStatus, verification: node.epistemic.verification, freshness: node.epistemic.freshness, decidedAt: node.payload.decidedAt, decidedBy: node.payload.decidedBy, source: source(node) });
const memoryProjection = (node) => ({ id: node.id, kind: node.kind, title: node.title, summary: node.summary, subjectKey: node.payload.subjectKey, scopeKey: node.payload.scopeKey, statement: node.payload.statement, memoryStatus: node.payload.memoryStatus, verification: node.epistemic.verification, confidence: node.epistemic.confidence, freshness: node.epistemic.freshness, source: source(node) });

function validGeneratedAt(value) { return typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value)); }

export function buildDecisionMemoryLedger({ graph, projectId, scopeKey, generatedAt, consentedRecordIds = [] } = {}) {
  if (!validGeneratedAt(generatedAt)) throw new DecisionMemoryValidationError("INVALID_GENERATED_AT", "generatedAt must be supplied as a valid ISO 8601 timestamp.", { field: "generatedAt" });
  const resolved = resolveDecisionMemory({ graph, projectId, scopeKey, consentedRecordIds });
  const includedNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const includedRecords = new Map();
  for (const id of resolved.sourceRecordIds) {
    const node = includedNodes.get(id);
    if (node && node.governance.sensitivity !== "restricted") includedRecords.set(node.id, node);
  }
  const providers = new Map();
  for (const node of includedRecords.values()) {
    providers.set(node.provenance.provider, (providers.get(node.provenance.provider) || 0) + 1);
  }
  const ledger = {
    ledgerVersion: DECISION_MEMORY_LEDGER_VERSION,
    generatedAt,
    projectId,
    effectiveDecisions: resolved.effectiveDecisionNodes.map(decisionProjection),
    decisionChains: clone(resolved.decisionChains),
    proposedDecisions: resolved.proposedDecisionNodes.map(decisionProjection),
    unresolvedConflicts: clone(resolved.conflicts),
    inheritedMemories: resolved.inheritedMemoryNodes.map(memoryProjection),
    inferredMemories: resolved.inferredMemoryNodes.map(memoryProjection),
    disputedMemories: resolved.disputedMemoryNodes.map(memoryProjection),
    historicalMemories: resolved.historicalMemoryNodes.map(memoryProjection),
    omittedRecords: clone(resolved.omittedRecords),
    diagnostics: clone(resolved.diagnostics),
    sourceSummary: { totalIncludedRecords: includedRecords.size, providers: Object.fromEntries([...providers.entries()].sort(([a], [b]) => a.localeCompare(b))) }
  };
  return deepFreeze(ledger);
}
