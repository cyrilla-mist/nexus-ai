import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

const html = await readText("atlas.html");
const entry = await readText("frontend/atlas/atlas-entry.js");
const desk = await readText("frontend/atlas/atlas-desk.js");
const legacy = await readText("frontend/atlas/atlas-app.js");
const snapshot = JSON.parse(await readText("examples/nexus-atlas-product-surface-phase5-v0.1.json"));

test("atlas shell enters through the Phase 5 route boundary", () => {
  assert.match(html, /frontend\/atlas\/atlas-entry\.js/);
  assert.doesNotMatch(html, /<script[^>]+src="\.\/frontend\/atlas\/atlas-app\.js"/);
  assert.match(html, /Innovation \/ Nexus Atlas \/ Desk/);
});

test("entry layer routes Desk to Product Surface and preserves legacy routes", () => {
  assert.match(entry, /await import\("\.\/atlas-desk\.js"\)/);
  assert.match(entry, /await import\("\.\/atlas-app\.js"\)/);
  for (const route of ["map", "territory", "reentry"]) assert.match(entry, new RegExp(`\\b${route}\\b`));
  assert.match(legacy, /createContinuityProvider/);
  assert.match(legacy, /function renderReentry\(/);
});

test("Desk consumes only the accepted Product Surface browser snapshot", () => {
  assert.match(desk, /nexus-atlas-product-surface-phase5-v0\.1\.json/);
  assert.match(desk, /nexus-atlas\.product-surface\.v0\.1/);
  assert.doesNotMatch(desk, /createContinuityProvider/);
  assert.doesNotMatch(desk, /project-verity/);
  assert.doesNotMatch(desk, /Verity/i);
  assert.doesNotMatch(desk, /Phase 3 complete; Phase 4 planned/i);
});

test("Desk transport remains local read-only and does not invent persistence", () => {
  assert.doesNotMatch(desk, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(desk, /method\s*:\s*["']POST["']/i);
  assert.doesNotMatch(desk, /localStorage\.setItem/);
  assert.doesNotMatch(desk, /writeFile|appendFile|process\.env/);
  assert.match(desk, /No live source connection/);
  assert.match(desk, /does not perform persistent canonical writes or external mutations/);
});

test("accepted browser snapshot is scoped to Nexus Self-Context Desk", () => {
  assert.equal(snapshot.version, "nexus-atlas.product-surface.v0.1");
  assert.deepEqual(snapshot.scope, {
    projectId: "project:nexus-atlas",
    territoryId: "territory:innovation",
    view: "desk",
  });
  assert.equal(snapshot.project.title, "Nexus Atlas");
  assert.equal(snapshot.project.currentPhase, "Phase 5C — Nexus Self-Context Desk in progress");
  assert.equal(snapshot.inspectorIndex.length, 14);
  assert.equal(snapshot.actions.length, 2);
  assert.equal(snapshot.risks.length, 1);
  assert.equal("sourceIntakeReview" in snapshot, false);
});

test("browser source summary remains bounded and honestly non-live", () => {
  const total = snapshot.sourceSummary.reduce((sum, source) => sum + source.recordCount, 0);
  assert.equal(total, snapshot.inspectorIndex.length);
  assert.equal(snapshot.sourceSummary.every((source) => source.mode === "self-context-v02"), true);
  assert.equal(snapshot.sourceSummary.every((source) => source.staleCount === 0), true);
  assert.equal(snapshot.sourceSummary.every((source) => source.disputedCount === 0), true);
});

test("Desk structural binding is not coupled to the historical competition project", () => {
  const structuralBinding = JSON.stringify({
    scope: snapshot.scope,
    project: snapshot.project,
    projectInspector: snapshot.inspectorIndex.find((item) => item.id === "project:nexus-atlas"),
  });
  assert.doesNotMatch(structuralBinding, /Verity/i);
  assert.doesNotMatch(structuralBinding, /Phase 3 complete; Phase 4 planned/i);
});
