import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ContinuityValidationError,
  loadContinuityScenario,
  loadContinuitySchema,
  validateContinuityScenario,
} from "../validate-continuity-scenario.mjs";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(TEST_DIR, "..", "..");

function clone(value) {
  return structuredClone(value);
}

async function fixture() {
  return {
    schema: await loadContinuitySchema(),
    scenario: await loadContinuityScenario(),
  };
}

function assertRejected(scenario, schema, pattern) {
  assert.throws(
    () => validateContinuityScenario(scenario, schema),
    (error) => error instanceof ContinuityValidationError && pattern.test(error.message),
  );
}

test("normal fixture validates and CLI prints PASS", async () => {
  const { scenario, schema } = await fixture();
  const result = validateContinuityScenario(scenario, schema);
  assert.equal(result.valid, true);
  assert.deepEqual(result.findings, scenario.expectedFindings);

  const cli = spawnSync(
    process.execPath,
    ["continuity/validate-continuity-scenario.mjs"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /PASS: Nexus continuity scenario is valid/);
});

test("duplicate entity id is rejected", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  invalid.entities[1].id = invalid.entities[0].id;
  assertRejected(invalid, schema, /duplicate entity id/);
});

test("invalid relationship target is rejected", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  invalid.relationships[0].to = "missing-entity";
  assertRejected(invalid, schema, /invalid to: missing-entity/);
});

test("invalid confidence is rejected", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  invalid.entities[0].confidence = 1.2;
  assertRejected(invalid, schema, /confidence must be between 0 and 1/);
});

test("incorrect expected findings count is rejected", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  invalid.expectedFindings.meaningfulChanges += 1;
  assertRejected(invalid, schema, /expectedFindings\.meaningfulChanges/);
});

test("campus fixture cannot be marked as the final Demo", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  const campusClaim = invalid.entities.find(
    (entity) => entity.id === "claim-campus-showcase",
  );
  campusClaim.status = "confirmed";
  campusClaim.metadata.finalDemo = true;
  assertRejected(invalid, schema, /campus fixture must be rejected or superseded/);
});

test("Star Map cannot become the active primary experience", async () => {
  const { scenario, schema } = await fixture();
  const invalid = clone(scenario);
  const starMap = invalid.entities.find(
    (entity) => entity.id === "source-star-map-experiment",
  );
  starMap.status = "confirmed";
  starMap.metadata.primaryExperience = true;
  assertRejected(invalid, schema, /Star Map must remain an archived visual experiment/);
});
