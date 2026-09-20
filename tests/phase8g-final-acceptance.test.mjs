import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");

const acceptance = await readText("docs/Nexus-Atlas-Phase8G-Final-Acceptance.md");
const evidence = JSON.parse(await readText("evaluation/phase8g/phase8f-local-visual-acceptance.json"));
const css = await readText("frontend/atlas/atlas.css");
const liveRead = await readText("frontend/atlas/atlas-continuity-live-read.js");

test("8G records Phase 8 as Complete / Accepted without widening authority", () => {
  assert.equal(acceptance.includes("**Status:** Complete / Accepted"), true);
  assert.equal(acceptance.includes("the browser Product Surface remains read-only"), true);
  assert.equal(acceptance.includes("live-read failure is fail-closed"), true);
  assert.equal(acceptance.includes("Phase 8 is now Complete / Accepted"), true);
  assert.equal(
    acceptance.includes("does **not** claim independent manual visual proof at exact 1024×768 or 390×844 viewports"),
    true,
  );
});

test("8G local visual evidence preserves the real blocker and successful re-validation", () => {
  assert.equal(evidence.observationVersion, "nexus-atlas.phase8g-local-visual-acceptance.v0.1");
  assert.equal(evidence.projectRef, "project:nexus-atlas");
  assert.equal(evidence.initialValidation.inspector, "FAIL");
  assert.deepEqual(evidence.initialValidation.blockingIssues, [
    "desktop-inspector-not-visually-usable-from-lower-page-cards",
  ]);
  assert.equal(evidence.blockerRevalidation.result, "PASS");
  assert.equal(evidence.blockerRevalidation.inspectorBlankStateObserved, false);
  assert.equal(evidence.blockerRevalidation.requiredScrollBackToPageTop, false);
  assert.equal(evidence.blockerRevalidation.staticFallbackObserved, false);
  assert.deepEqual(evidence.blockerRevalidation.remainingIssues, {
    blocking: [],
    important: [],
    polish: [],
  });
  assert.equal(evidence.blockerRevalidation.recommendation, "PASS_WITH_LIMITATIONS");
  assert.equal(evidence.isGitHubSourceEvidence, false);
});

test("8G preserves the accepted Inspector responsive presentation boundaries", () => {
  assert.equal(css.includes("position: sticky;"), true);
  assert.equal(css.includes("top: 74px;"), true);
  assert.equal(css.includes("@media (max-width: 1120px)"), true);
  assert.equal(css.includes("@media (max-width: 820px)"), true);
  assert.equal(css.includes("position: fixed;"), true);
  assert.equal(css.includes("inset: auto 0 0;"), true);
});

test("8G keeps Phase 8E live read opt-in and fail-closed", () => {
  assert.equal(liveRead.includes("continuitySource"), true);
  assert.equal(liveRead.includes("127.0.0.1"), true);
  assert.equal(liveRead.includes("fallbackToStatic"), false);
  assert.equal(liveRead.includes("fallbackToLegacy"), false);
  assert.equal(liveRead.includes("reentry.html"), false);
});
