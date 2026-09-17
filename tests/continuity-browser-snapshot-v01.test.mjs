import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateContinuityProductSurfaceV01 } from "../experience/product-surface-v01/continuity-product-surface-projector.mjs";
import { buildAcceptedContinuityBrowserFixtureV01 } from "./helpers/continuity-product-surface-browser-fixture.mjs";

const SNAPSHOT_PATH = new URL("../examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json", import.meta.url);
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));

function serialized(value) {
  return JSON.stringify(value);
}

test("8B-A01 committed browser snapshot deep-equals fresh projector output", async () => {
  const projected = await buildAcceptedContinuityBrowserFixtureV01();
  assert.deepEqual(snapshot, projected);
});

test("8B-A02 committed browser snapshot passes the accepted Phase 8A validator", () => {
  assert.deepEqual(validateContinuityProductSurfaceV01(snapshot), snapshot);
});

test("8B-A03 browser snapshot remains honestly static rather than live persistence", () => {
  assert.equal(snapshot.writebackSafety.providerKind, "accepted-static-browser-fixture");
  assert.equal(snapshot.writebackSafety.durability, "memory");
  assert.equal(snapshot.capabilities.productionProvisioningAllowed, false);
});

test("8B-A04 snapshot preserves accepted read-only capability boundary", () => {
  assert.deepEqual(snapshot.capabilities, {
    readOnly: true,
    writeAllowed: false,
    deleteAllowed: false,
    productionProvisioningAllowed: false,
    canonicalContextWriteAllowed: false,
    autonomousExecutionAllowed: false,
    humanAuthorityDecisionAllowed: false,
  });
});

test("8B-A05 snapshot preserves verified Outcome and VALID continuity exactly", () => {
  assert.equal(snapshot.continuity.validity, "VALID");
  assert.equal(snapshot.continuity.humanAuthorityRequired, false);
  assert.equal(snapshot.latestOutcome.verificationState, "verified");
  assert.equal(snapshot.latestOutcome.failureReason, null);
});

test("8B-B01 snapshot contains no obvious credential or secret fields", () => {
  const text = serialized(snapshot).toLowerCase();
  for (const forbidden of ["password", "secret", "authorization", "bearer ", "api_key", "apikey", "access_token", "refresh_token"]) {
    assert.equal(text.includes(forbidden), false, `snapshot contains forbidden credential marker: ${forbidden}`);
  }
});

test("8B-B02 snapshot contains no D1 database identity or connection metadata", () => {
  const text = serialized(snapshot).toLowerCase();
  for (const forbidden of ["database_id", "databaseid", "account_id", "binding", "d1_database"]) {
    assert.equal(text.includes(forbidden), false, `snapshot contains forbidden D1 marker: ${forbidden}`);
  }
});

test("8B-B03 snapshot contains no filesystem or local runtime paths", () => {
  const text = serialized(snapshot);
  assert.equal(/(?:[A-Za-z]:\\|\/home\/|\/Users\/|\/tmp\/|node_modules)/.test(text), false);
});

test("8B-B04 history remains summary-only", () => {
  const outcome = snapshot.history.outcomes.records[0];
  const checkpoint = snapshot.history.checkpoints.records[0];
  assert.deepEqual(Object.keys(outcome), ["outcomeRef", "verificationState", "recordedAt", "actionRef"]);
  assert.deepEqual(Object.keys(checkpoint), ["checkpointRef", "version", "createdAt", "nextActionRef"]);
});

test("8B-B05 snapshot exposes no transport or mutation endpoint", () => {
  const text = serialized(snapshot).toLowerCase();
  assert.equal(text.includes("http://"), false);
  assert.equal(text.includes("https://"), false);
  assert.equal(text.includes("mutation"), false);
  assert.equal(text.includes("deleteaction"), false);
  assert.equal(text.includes("writeaction"), false);
});
