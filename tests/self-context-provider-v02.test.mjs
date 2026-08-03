import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createSelfContextProvider } from "../experience/context-v02/self-context-provider.mjs";

const fixtureUrl = new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url);
async function fixtureText() { return readFile(fixtureUrl, "utf8"); }

test("loadGraph reads and validates the fixture once", async () => {
  let reads = 0;
  const provider = createSelfContextProvider({ readFileImpl: async () => { reads += 1; return fixtureText(); } });
  const first = await provider.loadGraph();
  const second = await provider.loadGraph();
  assert.equal(reads, 1);
  assert.strictEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.nodes), true);
});

test("loadContextPackage returns deterministic read-only source info", async () => {
  const provider = createSelfContextProvider({ generatedAt: "2026-08-03T00:00:00+08:00", readFileImpl: fixtureText });
  const result = await provider.loadContextPackage();
  assert.equal(result.sourceInfo.mode, "self-context-v02");
  assert.equal(result.sourceInfo.live, false);
  assert.equal(result.sourceInfo.readOnly, true);
  assert.equal(result.sourceInfo.deterministic, true);
  assert.equal(result.sourceInfo.runtimeEvidence, false);
  assert.deepEqual(result.contextPackage.project.id, "project:nexus-atlas");
  assert.equal(result.sourceInfo.nodeCount, 26);
  assert.equal(result.sourceInfo.edgeCount, 7);
});

test("rejects malformed JSON and invalid graphs", async () => {
  const malformed = createSelfContextProvider({ readFileImpl: async () => "{not json" });
  await assert.rejects(() => malformed.loadGraph(), SyntaxError);
  const invalid = createSelfContextProvider({ readFileImpl: async () => JSON.stringify({ metadata: {} }) });
  await assert.rejects(() => invalid.loadGraph(), /metadata|nodes/i);
});

test("does not call global fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => { called = true; throw new Error("fetch must not be called"); };
  try {
    await createSelfContextProvider({ readFileImpl: fixtureText }).loadContextPackage();
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
