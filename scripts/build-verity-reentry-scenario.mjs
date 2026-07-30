import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const scenarioDirectory = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry",
);
const outputPath = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry.json",
);

const partNames = [
  "verity-reentry.part-00.json",
  "verity-reentry.part-01.json",
  "verity-reentry.part-02.json",
  "verity-reentry.part-03.json",
];

const parts = await Promise.all(
  partNames.map((partName) => readFile(path.join(scenarioDirectory, partName), "utf8")),
);

const source = parts.join("");
const scenario = JSON.parse(source);

if (scenario.schemaVersion !== "0.9.2") {
  throw new Error(`Unexpected schema version: ${scenario.schemaVersion}`);
}

if (scenario.project?.id !== "project-verity") {
  throw new Error("Verity scenario project identity is missing or invalid.");
}

const expected = scenario.expectedFindings;
const requiredCounts = {
  meaningfulChanges: 4,
  staleRecords: 2,
  agentConflicts: 1,
  missingOwners: 1,
  validDecisions: 4,
};

for (const [key, value] of Object.entries(requiredCounts)) {
  if (expected?.[key] !== value) {
    throw new Error(`Unexpected ${key}: ${expected?.[key]}`);
  }
}

await writeFile(outputPath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");

console.log(
  `Built ${path.relative(repositoryRoot, outputPath)} with ${scenario.entities.length} entities and ${scenario.relationships.length} relationships.`,
);
