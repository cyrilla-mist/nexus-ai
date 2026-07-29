import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEvidenceChain,
  buildReentryViewModel,
  findAffectedDecision,
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

test("conflict signal resolves a structured confirmed affected decision", () => {
  const conflict = buildReentryViewModel(fixture).selectedSignalDetails.conflict;
  assert.deepEqual(
    Object.keys(conflict.affectedDecision),
    ["id", "title", "summary", "status", "source", "matchReason"],
  );
  assert.equal(conflict.affectedDecision.status, "confirmed");
  assert.equal(conflict.affectedDecision.id, "decision-no-campus-demo");
});

test("affected decision resolution is independent of entity array order", () => {
  const selected = fixture.entities.find(
    (entity) => entity.id === "memory-campus-scenario",
  );
  const reordered = structuredClone(fixture);
  reordered.entities.reverse();
  reordered.relationships.reverse();
  assert.deepEqual(
    findAffectedDecision(reordered, selected, "conflict"),
    findAffectedDecision(fixture, selected, "conflict"),
  );
});

test("affected decision returns null without semantic or graph relevance", () => {
  const unrelated = {
    id: "risk-isolated",
    type: "risk",
    status: "open",
    title: "Unrelated lunar supply",
    summary: "No shared context exists.",
    metadata: {},
    source: { provider: "isolated", reference: "remote" },
  };
  const scenario = structuredClone(fixture);
  scenario.entities.push(unrelated);
  assert.equal(findAffectedDecision(scenario, unrelated, "missing"), null);
});

test("confirmed decisions outrank disputed semantic matches", () => {
  const selected = {
    id: "memory-alpha",
    type: "agent_memory",
    status: "disputed",
    title: "Alpha scenario candidate",
    summary: "Alpha direction",
    metadata: { scenarioCandidate: "alpha-scenario" },
    source: { provider: "agent", reference: "alpha" },
  };
  const base = {
    project: { id: "project", name: "Project" },
    relationships: [],
    expectedFindings: {},
    entities: [
      selected,
      {
        id: "decision-disputed",
        type: "decision",
        status: "disputed",
        title: "Alpha scenario decision",
        summary: "Alpha direction",
        metadata: { decisionArea: "scenario" },
        source: { provider: "agent", reference: "alpha" },
      },
      {
        id: "decision-confirmed",
        type: "decision",
        status: "confirmed",
        title: "Alpha scenario decision",
        summary: "Alpha direction",
        metadata: { decisionArea: "scenario" },
        source: { provider: "user_decision", reference: "alpha" },
      },
    ],
  };
  assert.equal(
    findAffectedDecision(base, selected, "conflict")?.id,
    "decision-confirmed",
  );
});

test("scenarioCandidate metadata links conflict memory to scenario decision", () => {
  const selected = fixture.entities.find(
    (entity) => entity.id === "memory-campus-scenario",
  );
  const affected = findAffectedDecision(fixture, selected, "conflict");
  assert.equal(affected.id, "decision-no-campus-demo");
  assert.equal(affected.matchReason, "Semantic scenario context");
});

test("a selected decision takes precedence over semantic scenario matching", () => {
  const selectedDecision = fixture.entities.find(
    (entity) => entity.id === "decision-archive-star-map",
  );
  const affected = findAffectedDecision(fixture, selectedDecision, "valid");

  assert.equal(affected.id, "decision-archive-star-map");
  assert.equal(affected.matchReason, "Selected record is the decision");
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

test("page defaults to fixture through the Continuity Provider", () => {
  assert.match(script, /createContinuityProvider/);
  assert.match(script, /mode = query\.get\("source"\) \|\| "fixture"/);
  assert.match(script, /provider\.loadScenario\(\)/);
  assert.match(script, /Runtime write-back is not enabled in v0\.9\.5/);
  assert.doesNotMatch(page + script, /localhost:8080|MCP mutation|API[_ -]?KEY/i);
});

test("source=datahub reports live success and explicit failure states", () => {
  assert.match(script, /mode === "datahub"/);
  assert.match(script, /DataHub live read unavailable/);
  assert.match(script, /DataHub live read is unavailable/);
  assert.match(script, /Use fixture mode/);
  assert.match(script, /source=fixture/);
  assert.doesNotMatch(script, /fetch\([^)]*localhost:8080/);
});

test("Evidence Chain renders type, title, and metadata as separate layers", () => {
  assert.match(script, /class="chain-type"/);
  assert.match(script, /class="chain-title"/);
  assert.match(script, /class="chain-meta"/);
  assert.doesNotMatch(script, /AGENT_MEMORYUse/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /overflow-wrap: anywhere/);
});

test("related decision uses an accessible in-page action", () => {
  assert.match(script, /data-related-decision/);
  assert.match(script, /aria-label="View related decision:/);
  assert.match(script, /scrollIntoView/);
  assert.match(script, /prefers-reduced-motion: reduce/);
});

test("rail project index follows navigation instead of auto bottom positioning", () => {
  const railRule = styles.match(/\.rail-project \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(railRule, /margin: 30px 10px 0/);
  assert.doesNotMatch(railRule, /margin:\s*auto/);
  assert.match(railRule, /border-top:/);
});

test("prototype page identifies the v0.9.5 live-read bridge layer", () => {
  const view = buildReentryViewModel(fixture);
  assert.equal(view.reportMeta.prototype, "v0.9.4.1 Prototype");
  assert.match(page, /v0\.9\.5 Prototype/);
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
