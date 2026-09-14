import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

const html = await readText("atlas.html");
const entry = await readText("frontend/atlas/atlas-entry.js");
const reviewUi = await readText("frontend/atlas/atlas-source-intake.js");
const reviewCss = await readText("frontend/atlas/atlas-source-intake.css");
const legacy = await readText("frontend/atlas/atlas-app.js");
const snapshot = JSON.parse(await readText("examples/nexus-atlas-source-intake-review-browser-v0.1.json"));

test("Atlas route boundary owns the Source Intake Review route", () => {
  assert.match(entry, /source-intake/);
  assert.match(entry, /await import\("\.\/atlas-source-intake\.js"\)/);
  assert.match(entry, /await import\("\.\/atlas-desk\.js"\)/);
  assert.match(entry, /await import\("\.\/atlas-app\.js"\)/);
  assert.match(html, /data-atlas-route="source-intake"/);
  assert.match(html, /atlas-source-intake\.css/);
});

test("legacy Map Workspace and Re-entry remain available outside the review route", () => {
  for (const route of ["map", "territory", "reentry"]) assert.match(entry, new RegExp(`\\b${route}\\b`));
  assert.match(legacy, /function renderReentry\(/);
  assert.match(legacy, /function renderMap\(/);
  assert.match(legacy, /function renderTerritory\(/);
});

test("browser review consumes only the accepted Source Intake Review snapshot", () => {
  assert.match(reviewUi, /nexus-atlas-source-intake-review-browser-v0\.1\.json/);
  assert.match(reviewUi, /nexus-atlas\.source-intake-review\.v0\.1/);
  assert.doesNotMatch(reviewUi, /source-snapshot-validator|context-import-plan-validator|canonical-admission\.mjs|buildCanonicalAdmissionPlanV01/);
  assert.doesNotMatch(reviewUi, /nexus-atlas-source-snapshot|nexus-atlas-context-import-plan/);
});

test("browser has no live source transport persistence Apply or LocalStorage", () => {
  assert.doesNotMatch(reviewUi, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(reviewUi, /method\s*:\s*["']POST["']/i);
  assert.doesNotMatch(reviewUi, /OAuth|Connect GitHub/i);
  assert.doesNotMatch(reviewUi, /applyCanonicalAdmissionPlanV01|\.apply\(/);
  assert.doesNotMatch(reviewUi, /localStorage|sessionStorage/);
  assert.doesNotMatch(reviewUi, /writeFile|appendFile|process\.env/);
});

test("accepted snapshot is frozen and local selection is separate ephemeral state", () => {
  assert.match(reviewUi, /return deepFreeze\(review\)/);
  assert.match(reviewUi, /selectedCandidateIds:\s*new Set\(\)/);
  assert.match(reviewUi, /new Set\(state\.review\.selection\.selectedCandidateIds\)/);
  assert.match(reviewUi, /selectionDirty/);
  assert.match(reviewUi, /Accepted canonical preview unchanged/);
});

test("browser never implements implicit select-all", () => {
  assert.doesNotMatch(reviewUi, /selectAll|select-all|Select all/i);
  assert.match(reviewUi, /data-candidate-selection/);
  assert.equal(snapshot.selection.selectionMode, "explicit-only");
});

test("review selection and accepted canonical preview are visibly distinct", () => {
  assert.match(reviewUi, /Choose what you are reviewing locally/);
  assert.match(reviewUi, /ACCEPTED CANONICAL PREVIEW/);
  assert.match(reviewUi, /accepted preview remains the original snapshot/i);
  assert.match(reviewUi, /do not change when you adjust the temporary selection/i);
});

test("browser renders copied per-Candidate decisions without recalculation", () => {
  assert.match(reviewUi, /state\.review\?\.admissionPreview\?\.decisions\.find/);
  assert.match(reviewUi, /decisionByCandidateId/);
  assert.doesNotMatch(reviewUi, /authorized-new-observation.*\?.*insert|authorized-existing-identical.*\?.*noop/);
  assert.deepEqual(
    new Set(snapshot.admissionPreview.decisions.map((decision) => decision.disposition)),
    new Set(["insert", "noop", "conflict", "deferred"]),
  );
});

test("not-run mode is explicit and does not invent dispositions", () => {
  assert.match(reviewUi, /reconciliation === "admission-plan"/);
  assert.match(reviewUi, /Reconciliation was not run/);
  assert.match(reviewUi, /does not invent insert, noop, or conflict states/);
});

test("unknown upstream sensitivity is rendered as not supplied rather than safe", () => {
  assert.match(reviewUi, /Not supplied upstream/);
  assert.equal(snapshot.candidates.every((candidate) => candidate.privacy.sensitivity === null), true);
  assert.doesNotMatch(reviewUi, /sensitivity.*safe|sensitivity.*public|non-sensitive/i);
});

test("Candidate detail remains bounded to accepted review fields", () => {
  assert.match(reviewUi, /SOURCE REVIEW DETAIL/);
  assert.match(reviewUi, /No raw Snapshot, Import Plan, or Graph fallback was attempted/);
  assert.doesNotMatch(reviewUi, /proposedPayload|messageHeadline|issue\.body|pull_request\.body/);
});

test("mobile review structure provides touch targets and collapses without horizontal layout dependency", () => {
  assert.match(reviewCss, /candidate-selection-control[\s\S]*min-height:\s*44px/);
  assert.match(reviewCss, /candidate-detail-control[\s\S]*min-height:\s*44px/);
  assert.match(reviewCss, /@media \(max-width: 900px\)[\s\S]*source-review-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(reviewCss, /@media \(max-width: 560px\)/);
  assert.match(reviewCss, /overflow-wrap:\s*anywhere/);
});
