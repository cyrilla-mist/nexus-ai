import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDirectory, "..", "..");
const sourceDirectory = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry",
);

const PART_NAMES = Object.freeze([
  "verity-reentry.part-00.json",
  "verity-reentry.part-01.json",
  "verity-reentry.part-02.json",
  "verity-reentry.part-03.json",
]);

export async function loadVerityScenario(options = {}) {
  const directory = options.sourceDirectory || sourceDirectory;
  const parts = await Promise.all(
    PART_NAMES.map((name) => readFile(path.join(directory, name), "utf8")),
  );
  const scenario = JSON.parse(parts.join(""));
  if (scenario.project?.id !== "project-verity") {
    throw new Error("The Verity scenario source is missing or invalid.");
  }
  return scenario;
}
