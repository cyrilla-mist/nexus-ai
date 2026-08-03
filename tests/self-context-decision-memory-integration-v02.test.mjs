import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateContextGraph } from "../experience/context-v02/context-graph-validator.mjs";
import { validateDecisionMemoryGraph } from "../experience/context-v02/decision-memory-validator.mjs";
import { createSelfContextProvider } from "../experience/context-v02/self-context-provider.mjs";

const fixtureUrl = new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url);
async function fixtureText() { return readFile(fixtureUrl, "utf8"); }
const ids = (items) => items.map((item) => typeof item === "string" ? item : item.id).sort();

test("integrates the canonical graph, Ledger, and Context Package deterministically", async () => {
  const provider = createSelfContextProvider({ readFileImpl: fixtureText });
  const first = await provider.loadContextPackage();
  const second = await provider.loadContextPackage();
  const { graph, decisionMemoryLedger: ledger, contextPackage: pkg } = first;

  validateContextGraph(graph);
  validateDecisionMemoryGraph({ graph, projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas" });
  assert.equal(graph.nodes.length, 29);
  assert.equal(graph.edges.length, 9);
  assert.equal(graph.edges.some((edge) => edge.type === "supersedes" && graph.nodes.find((node) => node.id === edge.from)?.kind !== graph.nodes.find((node) => node.id === edge.to)?.kind), false);

  const chain = ledger.decisionChains.find((item) => item.subjectKey === "v0.2.priority");
  assert.deepEqual(chain.orderedDecisionIds, ["decision:connectors-first", "decision:context-foundation-first"]);
  assert.deepEqual(chain.terminalDecisionIds, ["decision:context-foundation-first"]);
  assert.deepEqual(ids(ledger.effectiveDecisions), [
    "decision:context-foundation-first", "decision:long-term-repository", "decision:no-broad-ingestion-first",
    "decision:no-single-external-store", "decision:self-context-first", "decision:separate-context-states",
  ]);
  assert.equal(ledger.effectiveDecisions.some((item) => item.id === "decision:connectors-first"), false);
  assert.equal(pkg.staleContext.some((item) => item.id === "decision:connectors-first"), false);
  assert.deepEqual(ids(ledger.historicalMemories), ["memory:connectors-first-superseded"]);
  assert.deepEqual(ids(pkg.staleContext), ["memory:connectors-first-superseded"]);
  assert.deepEqual(ids(ledger.inheritedMemories), ["memory:model-governance-first", "memory:phase2-complete", "memory:v02-development-started"]);
  assert.deepEqual(ids(ledger.inferredMemories), ["memory:github-adapter-proposed"]);
  assert.equal(ledger.unresolvedConflicts.length, 0);
  assert.deepEqual(ids(pkg.confirmedDecisions), ids(ledger.effectiveDecisions));
  assert.deepEqual(ids(pkg.nextActions), ["action:define-phase3-context-package-contract"]);
  assert.equal(pkg.sourceSummary.totalIncludedNodes, 19);
  assert.deepEqual(ids(pkg.currentEvidence), ["evidence:architecture-review", "evidence:readme-baseline", "evidence:repository-reference", "evidence:v02-context-model", "evidence:v02-roadmap"]);
  for (const id of ["evidence:v02-roadmap", "evidence:v02-context-model"]) {
    const evidence = graph.nodes.find((node) => node.id === id);
    assert.equal(evidence.epistemic.verification, "confirmed");
    assert.equal(evidence.epistemic.freshness, "current");
    const text = JSON.stringify(evidence).toLowerCase();
    assert.equal(text.includes("implementation has not started"), false);
    assert.equal(text.includes('result":"proposed'), false);
  }
  assert.equal(Object.values(ledger.sourceSummary.providers).reduce((sum, count) => sum + count, 0), ledger.sourceSummary.totalIncludedRecords);
  assert.deepEqual(first, second);
  assert.deepEqual(first.graph, second.graph);
  assert.equal(Object.isFrozen(graph), true);
  assert.equal(Object.isFrozen(ledger), true);
  assert.equal(Object.isFrozen(pkg), true);
  assert.equal(Object.isFrozen(first), true);
});
