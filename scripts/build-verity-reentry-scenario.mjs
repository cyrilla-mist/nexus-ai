import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry.json",
);

const scenario = JSON.parse(await readFile(sourcePath, "utf8"));

if (scenario.schemaVersion !== "0.9.2") {
  throw new Error(`Unexpected schema version: ${scenario.schemaVersion}`);
}
if (scenario.project?.id !== "project-verity") {
  throw new Error("Verity scenario project identity is missing or invalid.");
}

const requiredCounts = {
  meaningfulChanges: 4,
  staleRecords: 2,
  agentConflicts: 1,
  missingOwners: 1,
  validDecisions: 4,
};
for (const [key, value] of Object.entries(requiredCounts)) {
  if (scenario.expectedFindings?.[key] !== value) {
    throw new Error(`Unexpected ${key}: ${scenario.expectedFindings?.[key]}`);
  }
}

const calibration = scenario.entities.find(
  (entity) => entity.id === "external-asset-calibration-job",
);
if (
  calibration?.metadata?.assetType !== "dataset" ||
  calibration?.metadata?.logicalType !== "calibration-context" ||
  !calibration?.source?.reference?.startsWith("urn:li:dataset:")
) {
  throw new Error("Verity Calibration Context identity is inconsistent.");
}

await writeFile(sourcePath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
console.log(`Validated continuity/scenarios/verity-reentry.json with ${scenario.entities.length} entities and ${scenario.relationships.length} relationships.`);
