import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const appPath = "frontend/atlas/atlas-app.js";
const source = await readFile(appPath, "utf8");

if (source.includes("URL.createObjectURL") || source.includes("new Blob(")) {
  throw new Error("Atlas runtime must not assemble JavaScript through Blob URLs.");
}
if (!source.includes("createContinuityProvider")) {
  throw new Error("Atlas must load context through the shared Continuity Provider.");
}
if (!source.includes("sourceInfo")) {
  throw new Error("Atlas must retain source identity for truthful UI labeling.");
}

const result = spawnSync(process.execPath, ["--check", appPath], {
  encoding: "utf8",
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

console.log(`Atlas module verification passed (${source.length} bytes).`);
