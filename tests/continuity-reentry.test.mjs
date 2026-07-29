import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEvidenceChain,
  buildReentryViewModel,
  getContinuitySignals,
  getMeaningfulChanges,
  getRecommendedActions,
  getValidDecisions,
} from "../experience/continuity/reentry-view-model.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("../continuity/scenarios/nexus-self-reentry.json", import.meta.url),
    "utf8",
  ),
);
const page = readFileSync(new URL("../reentry.html", import.meta.url), "utf8");
const script = readFileSync(
  new URL("../frontend/continuity/reentry.js", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../frontend/continuity/reentry.css", import.meta.url),
  "utf8",
);

test("fixture-backed view model exposes the Nexus project", () => {
  const view = buildReentryViewModel(fixture);
  assert.equal(view.project.name, "Nexus AI");
  assert.equal(view.reportMeta.sourceLabel, "Continuity fixture");
  assert.equal(view.reportMeta.runtimeLabel, "Runtime mapping verified");
});

test("continuity signals always expose four governed states", () => {
  assert.deepEqual(
    getContinuitySignals(fixture).map((signal) => signal.key),
    ["stale", "conflict", "missing", "valid"],
  );
});

test("signal counts match expected findings and observed fixture data", () => {
  const signals = getContinuitySignals(fixture);
  assert.deepEqual(
    Object.fromEntries(signals.map((signal) => [signal.key, signal.count])),
    { stale: 2, conflict: 1, missing: 1, valid: 4 },
  );
  assert.ok(signals.every((signal) => signal.compatible));
});

test("meaningful change count is derived from event metadata", () => {
  const changes = getMeaningfulChanges(fixture);
  assert.equal(changes.length, 4);
  assert.ok(changes.every((change) => change.time));
});

test("valid decisions preserve the four confirmed decisions", () => {
  const decisions = getValidDecisions(fixture);
  assert.equal(decisions.length, 4);
  assert.ok(decisions.every((decision) => decision.status === "confirmed"));
});

test("agent conflict is represented in selected signal details", () => {
  const view = buildReentryViewModel(fixture);
  const conflict = view.selectedSignalDetails.conflict;
  assert.match(conflict.selectedTitle, /campus fixture|self-reentry/i);
  assert.ok(conflict.relations.some((item) => item.relation === "contradicts"));
});

test("missing owner signal links to the blocked MCP bridge", () => {
  const view = buildReentryViewModel(fixture);
  const missing = view.selectedSignalDetails.missing;
  assert.match(missing.selectedTitle, /Missing implementation owner/);
  assert.ok(
    missing.evidenceChain.some(
      (item) => item.entityId === "task-core-mcp-bridge",
    ),
  );
});

test("campus fixture is represented as superseded development context", () => {
  const view = buildReentryViewModel(fixture);
  const stale = view.selectedSignalDetails.stale;
  assert.equal(stale.status, "superseded");
  assert.match(stale.selectedSummary, /development fixture/i);
});

test("Star Map remains archived and never enters primary navigation", () => {
  const starMap = fixture.entities.find(
    (entity) => entity.id === "source-star-map-experiment",
  );
  assert.equal(starMap.status, "archived");
  assert.equal(starMap.metadata.primaryExperience, false);
  assert.doesNotMatch(page, />\s*Star Map\s*</i);
});

test("recommended actions link to their task records", () => {
  const actions = getRecommendedActions(fixture);
  assert.equal(actions.length, 4);
  assert.ok(actions.every((action) => action.id.startsWith("task-")));
  assert.ok(actions.some((action) => action.status === "blocked"));
});

test("evidence chain retains explicit relationship direction", () => {
  const chain = buildEvidenceChain(fixture, "claim-datahub-operational");
  const runtimeSupport = chain.find(
    (item) => item.entityId === "evidence-runtime-pass",
  );
  assert.equal(runtimeSupport.relation, "supports");
  assert.equal(runtimeSupport.direction, "incoming");
  assert.equal(runtimeSupport.to, "claim-datahub-operational");
});

test("view model is independent of entity and relationship array order", () => {
  const shuffled = structuredClone(fixture);
  shuffled.entities.reverse();
  shuffled.relationships.reverse();
  const original = buildReentryViewModel(fixture);
  const reordered = buildReentryViewModel(shuffled);
  assert.deepEqual(reordered.signals, original.signals);
  assert.deepEqual(reordered.validDecisions, original.validDecisions);
  assert.deepEqual(reordered.recommendedActions, original.recommendedActions);
});

test("empty context returns a safe empty state", () => {
  const empty = buildReentryViewModel({
    project: { id: "empty", name: "Empty", status: "open" },
    entities: [],
    relationships: [],
    expectedFindings: {},
  });
  assert.equal(empty.empty, true);
  assert.deepEqual(empty.meaningfulChanges, []);
  assert.equal(empty.continuityScore, 100);
});

test("invalid context fails with a clear error", () => {
  assert.throws(
    () => buildReentryViewModel({ project: {} }),
    /Invalid continuity scenario: entities must be an array/,
  );
});

test("re-entry page has one h1 and loads a module script", () => {
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /<script type="module" src="\.\/frontend\/continuity\/reentry\.js"/);
  assert.match(page, /id="reentry-app"/);
});

test("page is fixture-backed without local runtime or mutation claims", () => {
  assert.match(script, /fetch\("\.\/continuity\/scenarios\/nexus-self-reentry\.json"\)/);
  assert.match(script, /Runtime write-back is not enabled in v0\.9\.4/);
  assert.doesNotMatch(page + script, /localhost:8080|Live from DataHub|MCP mutation|API[_ -]?KEY/i);
});

test("editorial palette avoids common purple template values", () => {
  for (const value of ["#7c3aed", "#8b5cf6", "#a855f7", "#6d28d9"]) {
    assert.doesNotMatch(styles.toLowerCase(), new RegExp(value));
  }
  assert.match(styles, /--paper: #e9e2d6/);
  assert.match(styles, /--oxide: #a54b37/);
  assert.match(styles, /--mineral: #657765/);
});

test("responsive and accessibility foundations are present", () => {
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /<nav[\s\S]*?aria-label="Continuity views"/);
  assert.match(styles, /@media \(max-width: 1100px\)/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /:focus-visible/);
});
