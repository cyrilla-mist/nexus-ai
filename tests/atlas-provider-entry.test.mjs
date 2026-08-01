import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../atlas.html", import.meta.url), "utf8");
const app = await readFile(
  new URL("../frontend/atlas/atlas-app.js", import.meta.url),
  "utf8",
);
const atlasCss = await readFile(
  new URL("../frontend/atlas/atlas.css", import.meta.url),
  "utf8",
);
const governance = await readFile(
  new URL("../frontend/atlas/atlas-governance.js", import.meta.url),
  "utf8",
);

test("Atlas loads one normal JavaScript module", () => {
  assert.match(html, /frontend\/atlas\/atlas-app\.js/);
  assert.doesNotMatch(html, /frontend\/atlas\/atlas\.js/);
  assert.doesNotMatch(app, /URL\.createObjectURL|new Blob\(/);
  assert.doesNotMatch(app, /atlas\.part-0[0-2]\.js/);
});

test("legacy Atlas Blob sources are removed from the repository", async () => {
  for (const relativePath of [
    "../frontend/atlas/atlas.js",
    "../frontend/atlas/source/atlas.part-00.js",
    "../frontend/atlas/source/atlas.part-01.js",
    "../frontend/atlas/source/atlas.part-02.js",
  ]) {
    await assert.rejects(access(new URL(relativePath, import.meta.url)));
  }
});

test("Atlas and Re-entry share the Continuity Provider contract", () => {
  assert.match(app, /createContinuityProvider/);
  assert.match(app, /mode:\s*query\.get\("source"\)\s*\|\|\s*"fixture"/);
  assert.match(app, /bridgeUrl:\s*query\.get\("bridge"\)/);
  assert.match(app, /state\.sourceInfo\s*=\s*loaded\.sourceInfo/);
});

test("Atlas source health reflects the actual provider mode", () => {
  assert.match(app, /state\.sourceInfo\?\.label/);
  assert.match(app, /state\.sourceInfo\?\.live\s*\?\s*"live"\s*:\s*"fixture"/);
  assert.match(app, /sourceMode\.toUpperCase\(\)/);
  assert.match(app, /class="source-primary"/);
  assert.match(app, /class="source-name"/);
  assert.match(app, /class="source-state"/);
  assert.match(app, /class="source-detail"/);
  assert.match(html, /class="atlas-source-health"[^>]*aria-label="Context source health"/);
  assert.doesNotMatch(html, /source-pulse/);
  assert.doesNotMatch(atlasCss, /\.source-pulse|border-radius:\s*50%|box-shadow:.*source/);
});

test("Atlas exposes orientation labels for the three working modes", () => {
  assert.match(html, /aria-current="page"[^>]*>\s*<span>Desk<\/span>\s*<small>Overview<\/small>/);
  assert.match(html, /<span>Map<\/span>\s*<small>Relations<\/small>/);
  assert.match(html, /<span>Workspace<\/span>\s*<small>Decisions<\/small>/);
  assert.match(html, /TERRITORIES/);
  assert.match(html, /Five views of one Context Graph/);
  assert.match(html, /YOU ARE HERE/);
  assert.match(app, /aria-label="Current context path"/);
  assert.match(app, /Nexus Atlas/);
  assert.match(app, /VIEW_LABELS/);
  assert.match(html, /NEXT ACTIONS/);
  assert.match(app, /route-\$\{state\.route\}/);
});

test("Atlas brand chrome uses an accessible text wordmark without header texture", () => {
  assert.match(html, /class="atlas-wordmark"[^>]*aria-label="Open Atlas Desk"/);
  assert.match(html, /class="atlas-wordmark-rule"[^>]*aria-hidden="true"/);
  assert.match(html, /class="atlas-wordmark-type"[\s\S]*<strong>NEXUS<\/strong>[\s\S]*<small>ATLAS<\/small>/);
  assert.doesNotMatch(html, /class="atlas-mark"/);
  assert.doesNotMatch(atlasCss, /radial-gradient/);
  assert.match(atlasCss, /\.atlas-paper\s*\{\s*display:\s*none/);
  assert.match(atlasCss, /\.atlas-main\s*\{[\s\S]*repeating-linear-gradient/);
});

test("Atlas preserves live DataHub source configuration while adding route orientation", () => {
  assert.match(app, /query\.get\("source"\)/);
  assert.match(app, /query\.get\("bridge"\)/);
  assert.match(app, /data-inspect-entity/);
  assert.match(app, /data-open-inspector/);
  assert.match(app, /Select a node to inspect its context and relations/);
});

test("Atlas re-entry preserves validated source configuration", () => {
  assert.match(governance, /currentSourceConfiguration/);
  assert.match(governance, /validateLocalBridgeUrl/);
  assert.match(governance, /query\.set\("bridge", config\.bridge\)/);
  assert.match(governance, /query\.set\("mutationBridge", config\.mutationBridge\)/);
});

test("Atlas Map exposes editorial hierarchy without changing the graph contract", () => {
  assert.match(app, /map-project-landmark/);
  assert.match(app, /PROJECT 01/);
  assert.match(app, /Benchmark validation/);
  assert.match(app, /GOVERNANCE/);
  assert.match(app, /EVIDENCE/);
  assert.match(app, /DECISIONS/);
  assert.match(app, /ACTIONS/);
  assert.match(app, /data-map-action="reset"/);
  assert.match(app, /marker-end=/);
  assert.match(app, /is-selected/);
  assert.match(app, /is-dimmed/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /selectEntity\(mapNodeControl\.dataset\.mapNode\)/);
  assert.equal((app.match(/mapEdge\(/g) || []).length, 6);
  assert.doesNotMatch(app, /<circle cx="\$\{item\.x\}"/);
});
