import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const preflight = await readFile(
  new URL("../scripts/runtime-preflight.mjs", import.meta.url),
  "utf8",
);
const smoke = await readFile(
  new URL("../scripts/runtime-smoke.mjs", import.meta.url),
  "utf8",
);
const runbook = await readFile(
  new URL(
    "../docs/runtime/Nexus-Atlas-Local-Runtime-Verification.md",
    import.meta.url,
  ),
  "utf8",
);

test("package exposes explicit local Runtime verification commands", () => {
  assert.equal(
    packageJson.scripts["verify:runtime:preflight"],
    "node scripts/runtime-preflight.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:runtime:read"],
    "node scripts/runtime-smoke.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:runtime:proposal"],
    "node scripts/runtime-smoke.mjs --proposal",
  );
});

test("preflight validates local prerequisites without writing metadata", () => {
  assert.match(preflight, /loadVerityScenario/);
  assert.match(preflight, /VERITY_ASSETS/);
  assert.match(preflight, /DataHub GMS reachability/);
  assert.match(preflight, /performs no DataHub metadata writes/);
  assert.doesNotMatch(preflight, /add_owners|--apply|method:\s*["']POST["']/);
});

test("Runtime smoke checks use GET only and cannot execute ownership mutation", () => {
  assert.match(smoke, /method:\s*"GET"/);
  assert.match(smoke, /--proposal/);
  assert.match(smoke, /No POST request was sent/);
  assert.doesNotMatch(smoke, /method:\s*"POST"/);
  assert.doesNotMatch(
    smoke,
    /addBenchmarkOwner|repairVerityBenchmarkOwnership|tools\/call/,
  );
});

test("runbook preserves the Draft and human-confirmation safety boundary", () => {
  assert.match(runbook, /Keep PR #11 in Draft/);
  assert.match(runbook, /Test Cancel first/);
  assert.match(runbook, /read-after-write verification/);
  assert.match(runbook, /replaying the same proposal is rejected/);
  assert.match(runbook, /Do not place tokens, passwords/);
  assert.match(runbook, /only then consider marking PR #11 Ready/);
});
