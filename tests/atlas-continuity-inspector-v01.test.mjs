import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");

const html = await readText("atlas.html");
const entry = await readText("frontend/atlas/atlas-entry.js");
const continuity = await readText("frontend/atlas/atlas-continuity.js");
const inspector = await readText("frontend/atlas/atlas-continuity-inspector.js");
const inspectorCss = await readText("frontend/atlas/atlas-continuity-inspector.css");
const snapshot = JSON.parse(await readText("examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json"));

test("8D-A01 Continuity Inspector is loaded only by the continuity Product Surface branch", () => {
  assert.match(entry, /initialRoute === "continuity"/);
  assert.match(entry, /await import\("\.\/atlas-continuity\.js"\);\s*await import\("\.\/atlas-continuity-inspector\.js"\)/s);
  assert.doesNotMatch(entry, /initialRoute === "desk"[\s\S]*atlas-continuity-inspector\.js/);
});

test("8D-A02 Inspector is hard-guarded to the continuity hash route", () => {
  assert.match(inspector, /window\.location\.hash\.replace\("#", ""\) !== "continuity"/);
});

test("8D-A03 Inspector consumes only the accepted Phase 8B static browser snapshot", () => {
  assert.match(inspector, /nexus-atlas-continuity-product-surface-phase8-v0\.1\.json/);
  assert.match(inspector, /nexus-atlas\.continuity-product-surface\.v0\.1/);
  assert.equal(snapshot.version, "nexus-atlas.continuity-product-surface.v0.1");
  assert.equal(snapshot.projectRef, "project:nexus-atlas");
});

test("8D-A04 Inspector transport has no live provider, mutation, or persistence path", () => {
  assert.doesNotMatch(inspector, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(inspector, /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(inspector, /localStorage\.|sessionStorage\./);
  assert.doesNotMatch(inspector, /D1|DataHub|api\.github\.com|mutationBridge|local-bridge|process\.env|writeFile|appendFile/i);
});

test("8D-A05 inspectable target set is explicitly bounded", () => {
  for (const target of [
    'key === "resume"',
    'key === "outcome"',
    'key === "checkpoint"',
    'key === "verification"',
    'key === "safety"',
    'key === "history-outcome"',
    'key === "history-checkpoint"',
  ]) assert.match(inspector, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("8D-A06 unknown detail fails closed with no raw-source fallback", () => {
  assert.match(inspector, /No raw-source fallback was attempted/);
  assert.match(inspector, /Continuity detail unavailable\. No fallback source was used/);
  assert.doesNotMatch(inspector, /reentry\.html\?source=/i);
  assert.doesNotMatch(inspector, /createContinuityProvider/);
});

test("8D-B01 Resume detail remains a subset of accepted browser projection", () => {
  for (const field of [
    "surface.resumeState.activeObjective",
    "surface.resumeState.trustedDirection",
    "surface.resumeState.nextActionSummary",
    "surface.resumeState.nextActionRef",
    "surface.continuity.validity",
    "surface.continuity.humanAuthorityRequired",
  ]) assert.match(inspector, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(inspector, /governingRefs|unresolvedProtectedAmbiguities|provenance/);
});

test("8D-B02 Outcome detail does not reconstruct observed postcondition or provider payload", () => {
  assert.match(inspector, /outcome\.outcomeRef/);
  assert.match(inspector, /outcome\.actionRef/);
  assert.match(inspector, /outcome\.verificationState/);
  assert.match(inspector, /outcome\.failureReason/);
  assert.doesNotMatch(inspector, /observedPostcondition|verificationEvidenceRefs|executionActor/);
});

test("8D-B03 Checkpoint detail remains bounded to accepted browser fields", () => {
  for (const field of [
    "checkpoint.checkpointRef",
    "checkpoint.version",
    "checkpoint.createdAt",
    "checkpoint.confirmationAuthority",
    "checkpoint.evidenceCursor.provider",
    "checkpoint.evidenceCursor.scopeRef",
    "checkpoint.evidenceCursor.cursorType",
    "checkpoint.evidenceCursor.capturedAt",
  ]) assert.match(inspector, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(inspector, /checkpoint\.governingRefs|checkpoint\.provenance|confirmation\.basisRef/);
});

test("8D-B04 Verification and write-back safety remain summary-only", () => {
  assert.match(inspector, /verification\.states\.verified/);
  assert.match(inspector, /verification\.states\.failed/);
  assert.match(inspector, /verification\.states\.indeterminate/);
  assert.match(inspector, /verification\.sourceProfiles/);
  assert.match(inspector, /safety\.providerKind/);
  assert.match(inspector, /safety\.retentionMode/);
  assert.match(inspector, /safety\.deletionAllowed/);
  assert.doesNotMatch(inspector, /database_id|account_id|credential|token/i);
});

test("8D-B05 History interaction reads only bounded summary records", () => {
  assert.match(inspector, /surface\.history\.outcomes\.records\[index\]/);
  assert.match(inspector, /surface\.history\.checkpoints\.records\[index\]/);
  assert.doesNotMatch(inspector, /validateOutcomeRecordV01|validateTrustedCheckpointV01|FreshEvidenceWindow/);
});

test("8D-B06 interaction is ephemeral DOM state only", () => {
  assert.match(inspector, /inspector\.classList\.remove\("is-closed"\)/);
  assert.match(inspector, /inspector\.classList\.add\("is-closed"\)/);
  assert.match(inspector, /main\.dataset\.inspectorOpen/);
  assert.doesNotMatch(inspector, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test("8D-B07 close control discards local rendered detail", () => {
  assert.match(inspector, /closeInspectorControl\?\.addEventListener\("click", closeInspector\)/);
  assert.match(inspector, /Select a Continuity summary to inspect its bounded projected detail/);
});

test("8D-C01 inspect controls are accessible buttons rather than mutation links", () => {
  assert.match(inspector, /button\.type = "button"/);
  assert.match(inspector, /button\.dataset\.continuityDetail/);
  assert.match(inspector, /button\.textContent = label/);
  assert.doesNotMatch(inspector, /data-(?:write|delete|execute|confirm-authority|advance-checkpoint)/i);
});

test("8D-C02 Inspector stylesheet is loaded and route-scoped", () => {
  assert.match(html, /frontend\/atlas\/atlas-continuity-inspector\.css/);
  assert.match(inspectorCss, /\.continuity-detail-control/);
  assert.match(inspectorCss, /\.continuity-inspector-data/);
  assert.match(inspectorCss, /\.continuity-inspector-note/);
  assert.doesNotMatch(inspectorCss, /:root\s*\{/);
});

test("8D-C03 Inspector reuses existing Atlas design tokens and responsive assumptions", () => {
  for (const token of ["var(--nexus-accent)", "var(--line)", "var(--muted)"]) {
    assert.match(inspectorCss, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(inspectorCss, /@media \(max-width: 640px\)/);
});

test("8D-C04 Phase 8C Continuity Desk remains the owner of overall rendering", () => {
  assert.match(continuity, /function renderContinuity\(surface\)/);
  assert.doesNotMatch(inspector, /main\.innerHTML\s*=\s*renderContinuity/);
});
