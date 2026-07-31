import assert from "node:assert/strict";
import test from "node:test";

import { createVerityAssetBridge } from "../datahub/verity/verity-asset-bridge.mjs";

function fakeClient() {
  return {
    async initialize() {
      return {
        requiredTools: ["search", "get_entities", "get_lineage"],
        mutationToolsExposed: false,
      };
    },
    async close() {},
  };
}

function value(index) {
  return {
    source: "datahub-mcp",
    readOnly: true,
    mutationEnabled: false,
    fetchedAt: `2026-08-01T00:00:0${index}Z`,
    scenario: { project: { id: "project-verity" }, entities: [] },
    diagnostics: {
      lineageVerification: { passed: true },
      readIndex: index,
    },
  };
}

test("disables live-read caching by default", async () => {
  let reads = 0;
  const bridge = createVerityAssetBridge({
    client: fakeClient(),
    readSnapshot: async () => value(++reads),
  });

  const first = await bridge.snapshot();
  const second = await bridge.snapshot();

  assert.equal(reads, 2);
  assert.equal(first.diagnostics.cached, false);
  assert.equal(second.diagnostics.cached, false);
  assert.equal(second.diagnostics.readIndex, 2);
  await bridge.close();
});

test("allows an explicit cache TTL for non-mutation workloads", async () => {
  let reads = 0;
  const bridge = createVerityAssetBridge({
    client: fakeClient(),
    cacheTtlMs: 10_000,
    readSnapshot: async () => value(++reads),
  });

  const first = await bridge.snapshot();
  const second = await bridge.snapshot();

  assert.equal(reads, 1);
  assert.equal(first.diagnostics.cached, false);
  assert.equal(second.diagnostics.cached, true);
  assert.equal(second.diagnostics.readIndex, 1);
  await bridge.close();
});
