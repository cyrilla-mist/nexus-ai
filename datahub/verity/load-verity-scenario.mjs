import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDirectory, "..", "..");
const defaultSourcePath = path.join(
  repositoryRoot,
  "continuity",
  "scenarios",
  "verity-reentry.json",
);

export async function loadVerityScenario(options = {}) {
  const sourcePath = options.sourcePath || defaultSourcePath;
  const scenario = JSON.parse(await readFile(sourcePath, "utf8"));
  if (scenario.project?.id !== "project-verity") {
    throw new Error("The Verity scenario source is missing or invalid.");
  }
  return scenario;
}
