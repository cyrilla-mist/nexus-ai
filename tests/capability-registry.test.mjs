import assert from "node:assert/strict";
import test from "node:test";

import {
  describeLegacyAtlas,
  getCapabilityEngineByLegacyAtlas,
  listCapabilityEngines,
} from "../core/capability-registry.js";
import { listAvailableAtlases, selectAtlas } from "../core/router.js";

test("maps Project Atlas into the Innovation Territory", () => {
  const engine = getCapabilityEngineByLegacyAtlas("project-atlas");

  assert.equal(engine.engineId, "project-development-engine");
  assert.equal(engine.productRole, "Project Development Engine");
  assert.deepEqual(engine.territoryIds, ["innovation"]);
  assert.equal(engine.status, "active");
});

test("maps Evidence Atlas into Research and Evaluation", () => {
  const engine = describeLegacyAtlas("evidence-atlas");

  assert.equal(engine.engineId, "evidence-engine");
  assert.deepEqual(engine.territoryIds, ["research", "evaluation"]);
  assert.match(engine.architectureBoundary, /inside Nexus Atlas/i);
});

test("preserves the existing router compatibility ID", () => {
  assert.equal(selectAtlas("project_creation"), "project-atlas");

  const available = listAvailableAtlases();
  assert.equal(available[0].id, "project-atlas");
  assert.equal(available[0].engineId, "project-development-engine");
  assert.deepEqual(available[0].territoryIds, ["innovation"]);
});

test("returns cloned capability metadata", () => {
  const first = listCapabilityEngines();
  first[0].territoryIds.push("research");

  const second = listCapabilityEngines();
  assert.deepEqual(second[0].territoryIds, ["innovation"]);
});
