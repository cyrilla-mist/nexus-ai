import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");

const desk = await readText("frontend/atlas/atlas-continuity.js");
const inspector = await readText("frontend/atlas/atlas-continuity-inspector.js");
const transport = await readText("frontend/atlas/atlas-continuity-live-read.js");
const validator = await readText("experience/product-surface-v01/continuity-product-surface-browser-validator.mjs");

test("8E-D01 Desk and Inspector share the same bounded live-read transport", () => {
  assert.match(desk, /import \{ loadContinuityLiveSurfaceIfRequested \} from "\.\/atlas-continuity-live-read\.js"/);
  assert.match(inspector, /import \{ loadContinuityLiveSurfaceIfRequested \} from "\.\/atlas-continuity-live-read\.js"/);
  assert.match(desk, /const liveRead = await loadContinuityLiveSurfaceIfRequested\(\);\s*if \(liveRead\) return liveRead;/s);
  assert.match(inspector, /const liveRead = await loadContinuityLiveSurfaceIfRequested\(\);\s*if \(liveRead\) return liveRead\.surface;/s);
});

test("8E-D02 accepted static snapshot remains the default source in both surfaces", () => {
  for (const source of [desk, inspector]) {
    assert.match(source, /nexus-atlas-continuity-product-surface-phase8-v0\.1\.json/);
    assert.match(source, /fetch\(CONTINUITY_URL, \{ cache: "no-store" \}\)/);
  }
  assert.match(desk, /mode: "static"/);
  assert.match(desk, /ACCEPTED STATIC SNAPSHOT/);
});

test("8E-D03 Desk exposes live transport state without claiming write authority", () => {
  assert.match(desk, /VALIDATED LOOPBACK LIVE READ/);
  assert.match(desk, /Validated loopback Product Surface · read-only · no raw store access/);
  assert.match(desk, /READ ONLY \/ V0\.1/);
  assert.doesNotMatch(desk, /data-(?:write|delete|execute|confirm-authority|advance-checkpoint)/i);
});

test("8E-D04 live endpoint authority is isolated inside the transport module", () => {
  assert.doesNotMatch(desk, /127\.0\.0\.1:8792|localhost:8792|api\/continuity\/product-surface/);
  assert.doesNotMatch(inspector, /127\.0\.0\.1:8792|localhost:8792|api\/continuity\/product-surface/);
  assert.match(transport, /127\.0\.0\.1:8792\/api\/continuity\/product-surface/);
});

test("8E-D05 transport imports only the browser-safe Product Surface validator", () => {
  assert.match(transport, /continuity-product-surface-browser-validator\.mjs/);
  assert.doesNotMatch(transport, /trusted-checkpoint-validator|outcome-verifier|writeback-management-surface|continuity-assessment/);
});

test("8E-D06 browser validator has no Node-only crypto, file, process, or store dependency", () => {
  assert.doesNotMatch(validator, /node:crypto|node:fs|process\.|D1|DataHub|api\.github\.com|writeFile|appendFile/);
  assert.match(validator, /cryptoImpl\.subtle\.digest\("SHA-256"/);
});

test("8E-D07 live transport cannot send mutation methods or browser credentials", () => {
  assert.match(transport, /method: "GET"/);
  assert.match(transport, /credentials: "omit"/);
  assert.match(transport, /redirect: "error"/);
  assert.doesNotMatch(transport, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(transport, /Authorization|Bearer|document\.cookie|localStorage|sessionStorage|indexedDB/);
});

test("8E-D08 live request failure remains fail-closed rather than live-to-static fallback", () => {
  assert.match(transport, /CONTINUITY_LIVE_READ_UNAVAILABLE/);
  assert.match(desk, /No fallback source was used/);
  assert.match(inspector, /No fallback source was used/);
  assert.doesNotMatch(transport, /nexus-atlas-continuity-product-surface-phase8-v0\.1\.json/);
});
