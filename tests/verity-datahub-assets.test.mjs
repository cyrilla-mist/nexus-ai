import assert from "node:assert/strict";
import test from "node:test";

import {
  VERITY_ASSETS,
  VERITY_ASSET_BY_ID,
  VERITY_BENCHMARK_ASSET,
} from "../datahub/verity/asset-registry.mjs";
import { readVerityAssetSnapshot } from "../datahub/verity/verity-asset-reader.mjs";

function entityPayload(asset, owners = []) {
  return {
    urn: asset.urn,
    name: asset.title,
    ownership: {
      owners: owners.map((owner) => ({ owner })),
    },
  };
}

function fakeClient({ benchmarkOwners = [] } = {}) {
  const calls = [];
  return {
    calls,
    async initialize() {
      return {
        requiredTools: ["search", "get_entities", "get_lineage"],
        mutationToolsExposed: false,
      };
    },
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === "get_entities") {
        return {
          structuredContent: {
            entities: VERITY_ASSETS.map((asset) =>
              entityPayload(
                asset,
                asset.entityId === VERITY_BENCHMARK_ASSET.entityId
                  ? benchmarkOwners
                  : [],
              ),
          },
        };
      }
      if (name === "get_lineage" && args.upstream) {
        return {
          structuredContent: {
            urns: [
              VERITY_BENCHMARK_ASSET.urn,
              VERITY_ASSET_BY_ID.get("external-asset-rubric").urn,
              VERITY_ASSET_BY_ID.get("external-asset-test-materials").urn,
            ],
          },
        };
      }
      if (name === "get_lineage") {
        return {
          structuredContent: {
            urns: [
              VERITY_BENCHMARK_ASSET.urn,
              VERITY_ASSET_BY_ID.get("external-asset-calibration-job").urn,
              VERITY_ASSET_BY_ID.get("external-asset-results-v047").urn,
              VERITY_ASSET_BY_ID.get("external-asset-release-evidence").urn,
            ],
          },
        };
      }
      throw new Error(`Unexpected tool: ${name}`);
    },
    async close() {},
  };
}

test("overlays missing Benchmark ownership from DataHub", async () => {
  const client = fakeClient();
  const snapshot = await readVerityAssetSnapshot({
    client,
    now: () => new Date("2026-07-30T15:00:00Z"),
  });

  assert.equal(snapshot.projectId, "project-verity");
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.mutationEnabled, false);
  assert.equal(snapshot.diagnostics.assetCount, 6);
  assert.equal(snapshot.diagnostics.lineageVerification.passed, true);
  assert.equal(snapshot.diagnostics.benchmarkOwnerCount, 0);
  assert.equal(snapshot.scenario.expectedFindings.missingOwners, 1);

  const benchmark = snapshot.scenario.entities.find(
    (entity) => entity.id === "external-asset-benchmark",
  );
  const risk = snapshot.scenario.entities.find(
    (entity) => entity.id === "risk-benchmark-missing-owner",
  );
  assert.equal(benchmark.source.reference, VERITY_BENCHMARK_ASSET.urn);
  assert.equal(benchmark.metadata.ownerMissing, true);
  assert.equal(risk.metadata.missingOwner, true);
  assert.equal(risk.status, "blocked");
});

test("closes the ownership signal only after DataHub returns an owner", async () => {
  const owner = "urn:li:corpuser:cyrilla-mist";
  const client = fakeClient({ benchmarkOwners: [owner] });
  const snapshot = await readVerityAssetSnapshot({ client });

  assert.equal(snapshot.diagnostics.benchmarkOwnerCount, 1);
  assert.equal(snapshot.scenario.expectedFindings.missingOwners, 0);
  assert.ok(
    snapshot.scenario.expectedFindings.recommendedActions.every(
      (action) => !action.toLowerCase().includes("owner"),
    ),
  );

  const risk = snapshot.scenario.entities.find(
    (entity) => entity.id === "risk-benchmark-missing-owner",
  );
  const task = snapshot.scenario.entities.find(
    (entity) => entity.id === "task-assign-benchmark-owner",
  );
  assert.equal(risk.status, "resolved");
  assert.equal(risk.metadata.missingOwner, false);
  assert.deepEqual(risk.metadata.ownerUrns, [owner]);
  assert.equal(task.status, "completed");
  assert.equal(task.metadata.repairVerified, true);
});

test("refuses a Benchmark graph with missing governed upstream lineage", async () => {
  const client = fakeClient();
  const originalCall = client.callTool.bind(client);
  client.callTool = async (name, args) => {
    if (name === "get_lineage" && args.upstream) {
      return { structuredContent: { urns: [VERITY_BENCHMARK_ASSET.urn] } };
    }
    return originalCall(name, args);
  };

  await assert.rejects(
    () => readVerityAssetSnapshot({ client }),
    (error) => error.code === "VERITY_LINEAGE_MISMATCH",
  );
});
