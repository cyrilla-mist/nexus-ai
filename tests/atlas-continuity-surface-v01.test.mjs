import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");

const html = await readText("atlas.html");
const entry = await readText("frontend/atlas/atlas-entry.js");
const continuity = await readText("frontend/atlas/atlas-continuity.js");
const continuityCss = await readText("frontend/atlas/atlas-continuity.css");
const legacy = await readText("frontend/atlas/atlas-app.js");
const snapshot = JSON.parse(await readText("examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json"));

test("8C-A01 continuity is an explicit Product Surface route", () => {
  assert.match(entry, /PRODUCT_ROUTES = new Set\(\["desk", "source-intake", "continuity"\]\)/);
  assert.match(entry, /initialRoute === "continuity"/);
  assert.match(entry, /await import\("\.\/atlas-continuity\.js"\)/);
});

test("8C-A02 legacy Re-entry remains an explicit legacy route", () => {
  assert.match(entry, /LEGACY_ROUTES = new Set\(\["map", "territory", "reentry"\]\)/);
  assert.match(legacy, /function renderReentry\(/);
  assert.match(legacy, /createContinuityProvider/);
  assert.doesNotMatch(continuity, /createContinuityProvider/);
});

test("8C-A03 Atlas shell exposes Continuity / Resume navigation and scoped stylesheet", () => {
  assert.match(html, /data-atlas-route="continuity"/);
  assert.match(html, /<span>Continuity<\/span><small>Resume<\/small>/);
  assert.match(html, /frontend\/atlas\/atlas-continuity\.css/);
});

test("8C-A04 Continuity Desk consumes only the accepted Phase 8B browser snapshot", () => {
  assert.match(continuity, /nexus-atlas-continuity-product-surface-phase8-v0\.1\.json/);
  assert.match(continuity, /nexus-atlas\.continuity-product-surface\.v0\.1/);
  assert.equal(snapshot.version, "nexus-atlas.continuity-product-surface.v0.1");
  assert.equal(snapshot.projectRef, "project:nexus-atlas");
});

test("8C-A05 Continuity transport stays local static and read-only", () => {
  assert.doesNotMatch(continuity, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(continuity, /method\s*:\s*["']POST["']/i);
  assert.doesNotMatch(continuity, /localStorage\.|sessionStorage\./);
  assert.doesNotMatch(continuity, /process\.env|writeFile|appendFile/);
  assert.doesNotMatch(continuity, /D1|DataHub|api\.github\.com|github\.com\/api|local-bridge|mutationBridge/i);
});

test("8C-A06 snapshot failure is explicit and does not silently use another authority source", () => {
  assert.match(continuity, /No fallback source was used/);
  assert.match(continuity, /No silent fallback attempted/);
  assert.doesNotMatch(continuity, /source\s*=\s*["']datahub["']/i);
  assert.doesNotMatch(continuity, /reentry\.html\?source=/i);
});

test("8C-B01 browser validates the fixed non-writing capabilities before rendering", () => {
  for (const boundary of [
    "readOnly !== true",
    "writeAllowed !== false",
    "deleteAllowed !== false",
    "productionProvisioningAllowed !== false",
    "canonicalContextWriteAllowed !== false",
    "autonomousExecutionAllowed !== false",
    "humanAuthorityDecisionAllowed !== false",
  ]) {
    assert.match(continuity, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("8C-B02 page renders the accepted continuity information hierarchy", () => {
  for (const text of [
    "RESUME STATE",
    "LATEST VERIFIED RESULT",
    "TRUSTED CHECKPOINT",
    "BOUNDED HISTORY",
    "CROSS-SOURCE VERIFICATION",
    "WRITE-BACK SAFETY",
    "Human authority",
  ]) {
    assert.match(continuity, new RegExp(text, "i"));
  }
});

test("8C-B03 accepted next action is explicitly presented as copied rather than newly authorized", () => {
  assert.match(continuity, /copied from the accepted Trusted Checkpoint/i);
  assert.match(continuity, /did not generate or authorize a replacement action/i);
});

test("8C-B04 Phase 8C adds no mutation or execution action controls", () => {
  assert.doesNotMatch(continuity, /data-(?:write|delete|execute|confirm-authority|advance-checkpoint)/i);
  assert.doesNotMatch(continuity, /Apply now|Delete record|Run action|Execute action/i);
  assert.match(continuity, /Open Desk/);
  assert.match(continuity, /Review Sources/);
});

test("8C-B05 Continuity Inspector remains closed for Phase 8C", () => {
  assert.match(continuity, /inspector\.classList\.add\("is-closed"\)/);
  assert.doesNotMatch(continuity, /data-open-inspector/);
});

test("8C-C01 route-scoped styles reuse existing Atlas design tokens", () => {
  for (const token of ["var(--moss)", "var(--rust)", "var(--ochre)", "var(--nexus-accent)", "var(--clear)"]) {
    assert.match(continuityCss, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(continuityCss, /:root\s*\{/);
});

test("8C-C02 Continuity styles include bounded responsive collapse", () => {
  assert.match(continuityCss, /@media \(max-width: 900px\)/);
  assert.match(continuityCss, /@media \(max-width: 640px\)/);
  assert.match(continuityCss, /grid-template-columns: 1fr/);
});

test("8C-C03 accepted snapshot itself keeps all browser capabilities non-writing", () => {
  assert.deepEqual(snapshot.capabilities, {
    readOnly: true,
    writeAllowed: false,
    deleteAllowed: false,
    productionProvisioningAllowed: false,
    canonicalContextWriteAllowed: false,
    autonomousExecutionAllowed: false,
    humanAuthorityDecisionAllowed: false,
  });
});
