import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createFixtureContinuityProvider } from "../experience/continuity/fixture-continuity-provider.mjs";
import { normalizeContinuityScenario } from "../experience/continuity/normalize-continuity-scenario.mjs";
import { buildReentryViewModel } from "../experience/continuity/reentry-view-model.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..");
const scenarioPath = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry.json",
);

async function loadRawVerityScenario() {
  return JSON.parse(await readFile(scenarioPath, "utf8"));
}

test("normalizes Verity into the provider-neutral continuity contract", async () => {
  const raw = await loadRawVerityScenario();
  const scenario = normalizeContinuityScenario(raw, {
    sourceMode: "test",
    normalizedAt: "2026-07-30T12:00:00Z",
  });

  assert.equal(scenario.project.id, "project-verity");
  assert.equal(scenario.project.updatedAt, "2026-07-30T00:00:00Z");
  assert.equal(scenario.project.lastActiveAt, "2026-07-09T00:00:00Z");
  assert.equal(scenario.runtime.reentryFromAt, "2026-07-09T00:00:00Z");
  assert.equal(
    scenario.project.metadata.currentUpdatedAt,
    "2026-07-30T00:00:00Z",
  );

  const ownershipRisk = scenario.entities.find(
    (entity) => entity.id === "risk-benchmark-missing-owner",
  );
  assert.equal(ownershipRisk.metadata.missingOwner, true);
  assert.ok(scenario.relationships.every((relationship) => relationship.createdAt));
});

test("builds truthful Verity re-entry findings", async () => {
  const raw = await loadRawVerityScenario();
  const scenario = normalizeContinuityScenario(raw, { sourceMode: "test" });
  const view = buildReentryViewModel(scenario);
  const counts = Object.fromEntries(
    view.signals.map((signal) => [signal.key, signal.count]),
  );

  assert.deepEqual(counts, {
    stale: 2,
    conflict: 1,
    missing: 1,
    valid: 4,
  });
  assert.ok(view.signals.every((signal) => signal.compatible));
  assert.equal(view.meaningfulChanges.length, 4);
  assert.equal(view.validDecisions.length, 4);
  assert.equal(
    view.reportMeta.elapsedLabel,
    "21 days since last active session",
  );
  assert.equal(view.decisionActionLedger.ownershipRisks.length, 1);
  assert.equal(
    view.selectedSignalDetails.missing.selectedId,
    "risk-benchmark-missing-owner",
  );
});

test("fixture provider loads the canonical Verity scenario", async () => {
  const raw = await loadRawVerityScenario();
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return raw;
      },
    };
  };

  const provider = createFixtureContinuityProvider({
    scenario: "verity",
    fetchImpl,
  });
  const loaded = await provider.loadScenario();

  assert.deepEqual(requested, ["./continuity/scenarios/verity-reentry.json"]);
  assert.equal(loaded.scenario.project.id, "project-verity");
  assert.equal(loaded.scenario.entities.length, 36);
  assert.equal(loaded.scenario.relationships.length, 33);
  assert.equal(loaded.sourceInfo.diagnostics.scenario, "verity");
  assert.match(loaded.sourceInfo.detail, /canonical JSON/);
});

test("Calibration Context is a governed Dataset in Fixture mode", async () => {
  const raw = await loadRawVerityScenario();
  const calibration = raw.entities.find(
    (entity) => entity.id === "external-asset-calibration-job",
  );
  assert.equal(calibration.title, "Verity Scoring Calibration Context");
  assert.equal(calibration.metadata.assetType, "dataset");
  assert.equal(calibration.metadata.logicalType, "calibration-context");
  assert.match(calibration.source.reference, /^urn:li:dataset:/);
});
