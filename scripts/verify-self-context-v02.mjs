import { createSelfContextProvider } from "../experience/context-v02/self-context-provider.mjs";

function references(value) {
  const id = (item) => typeof item === "string" ? item : item.id;
  return {
    project: id(value.project),
    identitySnapshot: value.identitySnapshot.map(id),
    activeGoals: value.activeGoals.map(id),
    confirmedDecisions: value.confirmedDecisions.map(id),
    currentEvidence: value.currentEvidence.map(id),
    disputedContext: value.disputedContext.map(id),
    staleContext: value.staleContext.map(id),
    openRisks: value.openRisks.map(id),
    nextActions: value.nextActions.map(id),
  };
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const provider = createSelfContextProvider();
const loaded = await provider.loadContextPackage();
const repeated = await provider.loadContextPackage();
const actual = references(loaded.contextPackage);
const expected = references(loaded.graph.contextPackage);
const ledger = loaded.decisionMemoryLedger;
const ids = (items) => items.map((item) => typeof item === "string" ? item : item.id).sort();
const currentEvidenceIds = ids(loaded.contextPackage.currentEvidence);

console.log("Nexus Atlas v0.2 Self-Context");
console.log(`Nodes: ${loaded.graph.nodes.length}`);
console.log(`Edges: ${loaded.graph.edges.length}`);
console.log(`Decisions: ${ledger.diagnostics.decisionCount}`);
console.log(`Memories: ${ledger.diagnostics.memoryCount}`);
console.log(`Effective decisions: ${ledger.diagnostics.effectiveDecisionCount}`);
console.log(`Decision chains: ${ledger.diagnostics.chainCount}`);
console.log(`Inherited memories: ${ledger.diagnostics.inheritedMemoryCount}`);
console.log(`Inferred memories: ${ledger.diagnostics.inferredMemoryCount}`);
console.log(`Historical memories: ${ledger.diagnostics.historicalMemoryCount}`);
console.log(`Conflicts: ${ledger.diagnostics.conflictCount}`);
console.log(`Current evidence: ${loaded.contextPackage.currentEvidence.length}`);
console.log(`Context Package nodes: ${loaded.contextPackage.sourceSummary.totalIncludedNodes}`);

const chain = ledger.decisionChains.find((item) => item.subjectKey === "v0.2.priority");
const activeCrossKind = loaded.graph.edges.filter((edge) => edge.type === "supersedes" && edge.lifecycle.state === "active").some((edge) => {
  const from = loaded.graph.nodes.find((node) => node.id === edge.from); const to = loaded.graph.nodes.find((node) => node.id === edge.to); return from?.kind !== to?.kind;
});
const phase2Evidence = ["evidence:v02-roadmap", "evidence:v02-context-model"].every((id) => {
  const node = loaded.graph.nodes.find((item) => item.id === id);
  const text = JSON.stringify(node).toLowerCase();
  return node?.epistemic.verification === "confirmed" && node?.epistemic.freshness === "current" && !text.includes("implementation has not started") && !text.includes('result":"proposed');
});
const providerTotal = Object.values(loaded.contextPackage.sourceSummary.providers).reduce((sum, count) => sum + count, 0);
const project = loaded.graph.nodes.find((node) => node.id === "project:nexus-atlas");
const roadmapEvidence = loaded.graph.nodes.find((node) => node.id === "evidence:v02-roadmap");
const integrationPass = loaded.graph.nodes.length === 30 && loaded.graph.edges.length === 9 && ledger.diagnostics.decisionCount === 7 && ledger.diagnostics.memoryCount === 5 && ledger.diagnostics.effectiveDecisionCount === 6 && ledger.diagnostics.chainCount === 6 && ledger.diagnostics.inheritedMemoryCount === 3 && ledger.diagnostics.inferredMemoryCount === 1 && ledger.diagnostics.historicalMemoryCount === 1 && ledger.diagnostics.conflictCount === 0 && !activeCrossKind && chain?.chainStatus === "resolved" && same(ids(loaded.contextPackage.confirmedDecisions), ids(ledger.effectiveDecisions)) && !loaded.contextPackage.staleContext.some((item) => item.kind === "decision") && loaded.contextPackage.staleContext.some((item) => item.id === "memory:connectors-first-superseded") && ids(loaded.contextPackage.nextActions).join(",") === "action:review-phase4-source-adapter-entry" && currentEvidenceIds.join(",") === "evidence:architecture-review,evidence:readme-baseline,evidence:repository-reference,evidence:v02-context-model,evidence:v02-roadmap" && loaded.contextPackage.sourceSummary.totalIncludedNodes === 19 && providerTotal === 19 && project?.payload.currentPhase === "Phase 3 complete; Phase 4 planned" && project?.payload.currentVersion === "v0.2 Personal Context Foundation with Context Package v0.3" && roadmapEvidence?.payload.result === "confirmed" && roadmapEvidence?.epistemic.freshness === "current" && !JSON.stringify({ project, roadmapEvidence }).includes("Phase 3 planned") && phase2Evidence && same(loaded, repeated);

if (!same(actual, expected)) {
  console.error("Context Package projection: FAIL");
  process.exitCode = 1;
} else if (!integrationPass) {
  console.error("Decision / Memory integration: FAIL");
  process.exitCode = 1;
} else {
  console.log("Context Package projection: PASS");
  console.log("Decision / Memory integration: PASS");
}
