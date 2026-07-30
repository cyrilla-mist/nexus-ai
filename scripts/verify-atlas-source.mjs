import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(repositoryRoot, "frontend", "atlas", "source");
const sourceParts = [
  "atlas.part-00.js",
  "atlas.part-01.js",
  "atlas.part-02.js",
];

const parts = await Promise.all(
  sourceParts.map((sourcePart) => readFile(path.join(sourceDirectory, sourcePart), "utf8")),
);

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "nexus-atlas-"));
const assembledPath = path.join(temporaryDirectory, "atlas-assembled.mjs");

try {
  await writeFile(assembledPath, parts.join(""), "utf8");
  const result = spawnSync(process.execPath, ["--check", assembledPath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  console.log(`Atlas source verification passed (${parts.join("").length} bytes).`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
