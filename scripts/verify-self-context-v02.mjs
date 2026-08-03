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
const actual = references(loaded.contextPackage);
const expected = references(loaded.graph.contextPackage);

console.log("Nexus Atlas v0.2 Self-Context");
console.log(`Nodes: ${loaded.graph.nodes.length}`);
console.log(`Edges: ${loaded.graph.edges.length}`);
console.log(`Confirmed decisions: ${loaded.contextPackage.confirmedDecisions.length}`);
console.log(`Current evidence: ${loaded.contextPackage.currentEvidence.length}`);
console.log(`Open risks: ${loaded.contextPackage.openRisks.length}`);
console.log(`Next actions: ${loaded.contextPackage.nextActions.length}`);

if (!same(actual, expected)) {
  console.error("Deterministic projection: FAIL");
  process.exitCode = 1;
} else {
  console.log("Deterministic projection: PASS");
}
