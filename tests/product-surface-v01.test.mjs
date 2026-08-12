import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { validateContextGraph } from "../experience/context-v02/context-graph-validator.mjs";
import { validateDecisionMemoryGraph } from "../experience/context-v02/decision-memory-validator.mjs";
import { createSelfContextProvider } from "../experience/context-v02/self-context-provider.mjs";
import {
  PRODUCT_SURFACE_VERSION,
  buildProductSurface,
} from "../experience/product-surface-v01/product-surface-projector.mjs";

const phase5FixtureUrl = new URL("../examples/nexus-atlas-self-context-phase5-v0.1.json", import.meta.url);
const browserSnapshotUrl = new URL("../examples/nexus-atlas-product-surface-phase5-v0.1.json", import.meta.url);
const historicalFixtureUrl = new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url);

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}

async function loadPhase5ProviderResult() {
  const provider = createSelfContextProvider({ fixturePath: phase5FixtureUrl });
  return provider.loadContextPackage();
}

test("Phase 5 self-context fixture passes frozen Context validators", async () => {
  const graph = JSON.parse(await readFile(phase5FixtureUrl, "utf8"));
  const graphValidation = validateContextGraph(graph);
  assert.equal(graphValidation.valid, true);
  assert.equal(graphValidation.nodeCount, 15);

  const decisionMemoryValidation = validateDecisionMemoryGraph({
    graph,
    projectId: "project:nexus-atlas",
    scopeKey: "project:nexus-atlas",
  });
  assert.equal(decisionMemoryValidation.valid, true);
  assert.equal(decisionMemoryValidation.decisionCount, 4);
  assert.equal(decisionMemoryValidation.memoryCount, 2);
});

test("Self-Context Provider builds v0.3 package from the Phase 5 fixture", async () => {
  const result = await loadPhase5ProviderResult();
  assert.equal(result.generalizedContextPackage.packageVersion, "0.3");
  assert.equal(result.generalizedContextPackage.project.id, "project:nexus-atlas");
  assert.equal(result.generalizedContextPackage.project.currentPhase, "Phase 5C — Nexus Self-Context Desk in progress");
  assert.equal(result.generalizedContextPackage.decisions.effective.length, 4);
  assert.equal(result.generalizedContextPackage.memories.inherited.length, 2);
  assert.equal(result.generalizedContextPackage.identity.confirmed.length, 1);
  assert.equal(result.generalizedContextPackage.evidence.current.length, 3);
  assert.equal(result.generalizedContextPackage.risks.open.length, 1);
  assert.equal(result.generalizedContextPackage.actions.next.length, 2);
});

test("Product Surface v0.1 projects Nexus Self-Context without Verity coupling", async () => {
  const result = await loadPhase5ProviderResult();
  const surface = buildProductSurface({ providerResult: result, view: "desk" });

  assert.equal(surface.version, PRODUCT_SURFACE_VERSION);
  assert.equal(surface.scope.projectId, "project:nexus-atlas");
  assert.equal(surface.scope.territoryId, "territory:innovation");
  assert.equal(surface.scope.view, "desk");
  assert.equal(surface.project.title, "Nexus Atlas");
  assert.equal(surface.project.currentPhase, "Phase 5C — Nexus Self-Context Desk in progress");
  assert.equal(surface.project.currentMilestone, "milestone:product-surface");
  assert.equal(surface.identity.length, 1);
  assert.equal(surface.decisions.effective.length, 4);
  assert.equal(surface.decisions.proposed.length, 0);
  assert.equal(surface.decisions.historical.length, 0);
  assert.equal(surface.memories.confirmed.length, 2);
  assert.equal(surface.memories.inferred.length, 0);
  assert.equal(surface.evidence.current.length, 3);
  assert.equal(surface.evidence.stale.length, 0);
  assert.equal(surface.risks.length, 1);
  assert.equal(surface.actions.length, 2);
  assert.equal(surface.inspectorIndex.length, 14);
  assert.equal("sourceIntakeReview" in surface, false);

  const structuralBinding = JSON.stringify({
    scope: surface.scope,
    project: surface.project,
    projectInspector: surface.inspectorIndex.find((item) => item.id === "project:nexus-atlas"),
  });
  assert.doesNotMatch(structuralBinding, /Verity/i);
  assert.doesNotMatch(structuralBinding, /Phase 3 complete; Phase 4 planned/i);
});

test("Accepted browser snapshot is byte-semantic equivalent to the projector output", async () => {
  const result = await loadPhase5ProviderResult();
  const projected = buildProductSurface({ providerResult: result, view: "desk" });
  const snapshot = JSON.parse(await readFile(browserSnapshotUrl, "utf8"));
  assert.deepEqual(snapshot, projected);
});

test("Product Surface preserves state, governance, provenance and confirmation boundaries", async () => {
  const result = await loadPhase5ProviderResult();
  const surface = buildProductSurface({ providerResult: result });
  const identity = surface.identity[0];
  const action = surface.actions.find((item) => item.id === "action:migrate-desk-route");

  assert.deepEqual(identity.state, { lifecycle: "active", verification: "confirmed", freshness: "current" });
  assert.equal(identity.governance.sensitivity, "personal");
  assert.equal(identity.provenance.authority, "human-confirmation");
  assert.equal(action.externalEffect, false);
  assert.equal(action.requiresConfirmation, false);
  assert.equal(action.governance.requiresConfirmation, false);
  assert.equal(surface.decisions.effective.every((item) => item.state.verification === "confirmed"), true);
});

test("Product Surface is deterministic, deeply immutable and does not mutate provider artifacts", async () => {
  const result = await loadPhase5ProviderResult();
  const before = JSON.stringify(result);
  const first = buildProductSurface({ providerResult: result });
  const second = buildProductSurface({ providerResult: result });

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(result), before);
  assertDeepFrozen(first);
  assertDeepFrozen(result.graph);
  assertDeepFrozen(result.decisionMemoryLedger);
  assertDeepFrozen(result.generalizedContextPackage);
});

test("Product Surface Inspector resolves each projected record exactly once", async () => {
  const result = await loadPhase5ProviderResult();
  const surface = buildProductSurface({ providerResult: result });
  const ids = surface.inspectorIndex.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.includes("project:nexus-atlas"), true);
  assert.equal(ids.includes("identity:nexus-owner"), true);
  assert.equal(ids.includes("decision:self-context-desk-first"), true);
  assert.equal(ids.includes("evidence:product-surface-contract"), true);
  assert.equal(ids.includes("risk:stale-historical-self-context"), true);
  assert.equal(ids.includes("action:migrate-desk-route"), true);
});

test("Product Surface source summary is bounded to projected records", async () => {
  const result = await loadPhase5ProviderResult();
  const surface = buildProductSurface({ providerResult: result });
  const total = surface.sourceSummary.reduce((sum, source) => sum + source.recordCount, 0);
  assert.equal(total, surface.inspectorIndex.length);
  assert.equal(surface.sourceSummary.every((source) => source.mode === "self-context-v02"), true);
  assert.equal(surface.sourceSummary.every((source) => !/[?#]/.test(source.provider)), true);
});

test("Historical v0.2 self-context fixture remains unchanged for regression evidence", async () => {
  const historical = JSON.parse(await readFile(historicalFixtureUrl, "utf8"));
  const project = historical.nodes.find((node) => node.id === "project:nexus-atlas");
  assert.equal(project.payload.currentPhase, "Phase 3 complete; Phase 4 planned");
  assert.equal(project.epistemic.freshness, "current");
});
