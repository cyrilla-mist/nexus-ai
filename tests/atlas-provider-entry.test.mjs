import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../atlas.html", import.meta.url), "utf8");
const landing = await readFile(new URL("../index.html", import.meta.url), "utf8");
const guide = await readFile(new URL("../docs/nexus-atlas-guide-zh.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
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
  assert.match(app, /state\.sourceInfo\?\.live/);
  assert.match(app, /LIVE READ · DATAHUB MCP · READ-ONLY/);
  assert.match(app, /DEMO DATA · FIXTURE SCENARIO/);
  assert.match(app, /Live read does not permit mutation/);
  assert.match(app, /No live DataHub connection/);
  assert.match(app, /class="source-primary"/);
  assert.match(app, /class="source-name"/);
  assert.match(app, /class="source-detail"/);
  assert.match(app, /class="source-count"/);
  assert.match(html, /class="atlas-source-health"[^>]*aria-label="Context source health"/);
  assert.doesNotMatch(html, /source-pulse/);
  assert.doesNotMatch(atlasCss, /\.source-pulse|border-radius:\s*50%|box-shadow:.*source/);
});

test("Atlas exposes orientation labels for the three working modes", () => {
  assert.match(html, /aria-current="page"[^>]*>\s*<span>Desk<\/span>\s*<small>Overview<\/small>/);
  assert.match(html, /<span>Map<\/span>\s*<small>Relations<\/small>/);
  assert.match(html, /<span>Workspace<\/span>\s*<small>Decisions<\/small>/);
  assert.match(html, /TERRITORIES/);
  assert.match(html, /Different work views of the same project context/);
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

test("public Atlas copy explains the demo boundary and links the Chinese guide", () => {
  assert.match(landing, /Personal Intelligence Infrastructure/);
  assert.match(landing, /Return to complex work with changes, decisions, evidence, and next steps in view\./);
  assert.match(landing, /PUBLIC DEMO · FIXTURE SCENARIO/);
  assert.match(guide, /公开 GitHub Pages 使用 fixture 场景/);
  assert.match(guide, /LIVE READ ≠ MUTATION/);
  assert.match(guide, /Preview ownership proposal/);
  assert.match(guide, /Demo data only — no request will be sent to DataHub\./);
  assert.match(readme, /\[中文产品讲解手册\]\(docs\/nexus-atlas-guide-zh\.md\)/);
});

test("Atlas clarity copy preserves routes and source safety boundaries", () => {
  assert.deepEqual(
    [...app.matchAll(/const ROUTES = \[([^\]]+)\]/g)][0]?.[1].match(/"[^"]+"/g),
    ['"desk"', '"map"', '"territory"', '"reentry"'],
  );
  assert.match(app, /Changes since last active session/);
  assert.match(app, /Confirmed decisions still in use/);
  assert.match(app, /Context risks/);
  assert.match(app, /See how this project’s evidence, decisions, and actions connect/);
  assert.match(app, /See supporting sources/);
  assert.match(app, /Fit map to view/);
  assert.match(app, /Open project workspace/);
  assert.match(app, /Review what changed before continuing/);
});

test("Atlas mobile layout moves navigation, inspector, map, and tray into safe layers", () => {
  assert.match(atlasCss, /body \{ overflow-x: hidden; \}/);
  assert.match(atlasCss, /\.atlas-primary-nav \{[\s\S]*overflow-x: auto/);
  assert.match(atlasCss, /\.context-inspector \{[\s\S]*position: fixed[\s\S]*inset: auto 0 0/);
  assert.match(atlasCss, /\.context-inspector\.is-closed \{[\s\S]*transform: translateY/);
  assert.match(atlasCss, /#inspector-content \{[\s\S]*overflow-y: auto/);
  assert.match(atlasCss, /body\.route-map \.map-stage \{[\s\S]*max-width: 100%/);
  assert.match(atlasCss, /\.atlas-main \{ padding: 26px 18px 92px/);
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
