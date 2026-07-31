import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reentrySource = await readFile(
  new URL("../frontend/continuity/reentry.js", import.meta.url),
  "utf8",
);
const governanceSource = await readFile(
  new URL("../frontend/continuity/reentry-governance.js", import.meta.url),
  "utf8",
);

test("Re-entry renders stable governance action contracts", () => {
  for (const action of [
    "create-revalidation-task",
    "confirm-decision",
    "repair-ownership",
    "confirm-inheritance",
    "review-action",
  ]) {
    assert.match(reentrySource, new RegExp(`(?:\\"|\")${action}(?:\\"|\")`));
  }
  assert.match(reentrySource, /data-governance-action=/);
  assert.match(reentrySource, /data-entity-id=/);
  assert.match(reentrySource, /data-decision-id=/);
});

test("governance behavior is independent of visible English titles", () => {
  assert.match(governanceSource, /button\.dataset\.governanceAction/);
  assert.doesNotMatch(governanceSource, /signalTitle/);
  assert.doesNotMatch(governanceSource, /title\.includes\(/);
  assert.doesNotMatch(governanceSource, /includes\(["'](?:owner|agent|roadmap|stale|outdated)["']\)/i);
});

test("prototype fallback excludes governed controls", () => {
  assert.match(
    reentrySource,
    /\[data-prototype-action\]:not\(\[data-governance-action\]\)/,
  );
});

test("ownership repair carries the one-time proposal identifier", () => {
  assert.match(governanceSource, /proposalId:\s*proposal\.proposalId/);
  assert.match(governanceSource, /action === "repair-ownership"/);
});
