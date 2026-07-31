import { readFile, rm } from "node:fs/promises";

const html = await readFile("atlas.html", "utf8");
const app = await readFile("frontend/atlas/atlas-app.js", "utf8");

if (!html.includes("./frontend/atlas/atlas-app.js")) {
  throw new Error("Atlas has not switched to the consolidated module entry.");
}
if (html.includes("./frontend/atlas/atlas.js")) {
  throw new Error("Atlas HTML still references the legacy Blob loader.");
}
if (app.includes("URL.createObjectURL") || app.includes("new Blob(")) {
  throw new Error("The consolidated Atlas module still contains Blob assembly.");
}

for (const path of [
  "frontend/atlas/atlas.js",
  "frontend/atlas/source/atlas.part-00.js",
  "frontend/atlas/source/atlas.part-01.js",
  "frontend/atlas/source/atlas.part-02.js",
]) {
  await rm(path, { force: false });
}

console.log("Legacy Atlas Blob loader and source parts removed.");
