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
const partPaths = [0, 1, 2, 3].map((index) =>
  path.join(
    repositoryRoot,
    "continuity",
    "scenarios",
    "verity-reentry",
    `verity-reentry.part-0${index}.json`,
  ),
);

async function loadRawVerityScenario() {
  const parts = await Promise.all(partPaths.map((partPath) => readFile(partPath, "utf8")));
  return JSON.parse(parts.join(""));
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
  const counts = Object.fromEntries(view.signals.map((signal) => [signal.key, signal.count]));

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

test("fixture provider assembles multipart scenarios", async () => {
  const fileMap = new Map();
  for (const partPath of partPaths) {
    fileMap.set(path.basename(partPath), await readFile(partPath, "utf8"));
  }

  const fixtureParts = [...fileMap.keys()];
  const fetchImpl = async (url) => ({
    ok: fileMap.has(url),
    status: fileMap.has(url) ? 200 : 404,
    async text() {
      return fileMap.get(url) || "";
    },
  });

  const provider = createFixtureContinuityProvider({
    scenario: "verity",
    fixtureParts,
    fetchImpl,
  });
  const loaded = await provider.loadScenario();

  assert.equal(loaded.scenario.project.id, "project-verity");
  assert.equal(loaded.scenario.entities.length, 36);
  assert.equal(loaded.scenario.relationships.length, 33);
  assert.equal(loaded.sourceInfo.diagnostics.scenario, "verity");
});
