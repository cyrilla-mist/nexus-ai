import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import {
  VERITY_ASSET_BY_ID,
} from "../datahub/verity/asset-registry.mjs";

const scenario = JSON.parse(
  await readFile(
    new URL("../continuity/scenarios/verity-reentry.json", import.meta.url),
    "utf8",
  ),
);
const ingestion = await readFile(
  new URL("../datahub/scripts/ingest_verity_assets.py", import.meta.url),
  "utf8",
);
const atlas = await readFile(
  new URL("../frontend/atlas/atlas-app.js", import.meta.url),
  "utf8",
);

const entity = scenario.entities.find(
  (item) => item.id === "external-asset-calibration-job",
);
const registry = VERITY_ASSET_BY_ID.get("external-asset-calibration-job");

test("Fixture and DataHub registry use one Calibration Context Dataset identity", () => {
  assert.ok(entity);
  assert.ok(registry);
  assert.equal(entity.title, "Verity Scoring Calibration Context");
  assert.equal(registry.title, "Verity Scoring Calibration Context");
  assert.equal(entity.metadata.assetType, "dataset");
  assert.equal(entity.metadata.logicalType, "calibration-context");
  assert.equal(registry.logicalType, "calibration-context");
  assert.equal(entity.source.reference, registry.urn);
  assert.match(registry.urn, /^urn:li:dataset:/);
});

test("ingestion and Atlas labels no longer present the node as a DataJob", () => {
  assert.match(ingestion, /Verity Scoring Calibration Context/);
  assert.match(ingestion, /"logicalType": "calibration-context"/);
  assert.doesNotMatch(ingestion, /"logicalType": "calibration-process"/);
  assert.match(atlas, /label: "Calibration Context", type: "CALIBRATION CONTEXT"/);
  assert.doesNotMatch(atlas, /label: "Calibration Job", type: "DATA JOB"/);
});

test("canonical Verity JSON replaces invalid multipart source files", async () => {
  for (const index of [0, 1, 2, 3]) {
    await assert.rejects(
      access(
        new URL(
          `../continuity/scenarios/verity-reentry/verity-reentry.part-0${index}.json`,
          import.meta.url,
        ),
      ),
    );
  }
  assert.equal(scenario.project.id, "project-verity");
  assert.equal(scenario.entities.length, 36);
  assert.equal(scenario.relationships.length, 33);
});
