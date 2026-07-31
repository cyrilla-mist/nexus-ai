import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../atlas.html", import.meta.url), "utf8");
const app = await readFile(
  new URL("../frontend/atlas/atlas-app.js", import.meta.url),
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

test("Atlas and Re-entry share the Continuity Provider contract", () => {
  assert.match(app, /createContinuityProvider/);
  assert.match(app, /mode:\s*query\.get\("source"\)\s*\|\|\s*"fixture"/);
  assert.match(app, /bridgeUrl:\s*query\.get\("bridge"\)/);
  assert.match(app, /state\.sourceInfo\s*=\s*loaded\.sourceInfo/);
});

test("Atlas source health reflects the actual provider mode", () => {
  assert.match(app, /state\.sourceInfo\?\.label/);
  assert.match(app, /state\.sourceInfo\?\.live\s*\?\s*"live"\s*:\s*"fixture"/);
});

test("Atlas re-entry preserves validated source configuration", () => {
  assert.match(governance, /currentSourceConfiguration/);
  assert.match(governance, /validateLocalBridgeUrl/);
  assert.match(governance, /query\.set\("bridge", config\.bridge\)/);
  assert.match(governance, /query\.set\("mutationBridge", config\.mutationBridge\)/);
});
