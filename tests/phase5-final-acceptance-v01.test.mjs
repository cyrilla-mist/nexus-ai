import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import sourceExample from "../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };
import planExample from "../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };
import browserReviewSnapshot from "../examples/nexus-atlas-source-intake-review-browser-v0.1.json" with { type: "json" };
import { createSelfContextProvider } from "../experience/context-v02/self-context-provider.mjs";
import { buildProductSurface } from "../experience/product-surface-v01/product-surface-projector.mjs";
import { buildSourceIntakeReviewV01 } from "../experience/source-intake-review-v01/source-intake-review-projector.mjs";
import {
  buildCanonicalAdmissionPlanV01,
  GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1,
} from "../experience/context-v02/canonical-admission.mjs";
import { acceptedGraph, authorizedIds, planFor } from "./helpers/canonical-admission-fixtures.mjs";
import { makeGitHubSnapshot } from "./helpers/context-import-plan-fixtures.mjs";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");
const phase5FixtureUrl = new URL("../examples/nexus-atlas-self-context-phase5-v0.1.json", import.meta.url);

const contract = await readText("docs/Nexus-Atlas-v0.1-Phase5-Acceptance-Contract.md");
const matrix = await readText("docs/Nexus-Atlas-v0.1-Phase5-Acceptance-Test-Matrix.md");
const reentryAudit = await readText("docs/Nexus-Atlas-Phase5F-Re-entry-Audit.md");
const verifier = await readText("scripts/verify-phase5-v01.mjs");
const packageJson = JSON.parse(await readText("package.json"));
const desk = await readText("frontend/atlas/atlas-desk.js");
const entry = await readText("frontend/atlas/atlas-entry.js");
const legacy = await readText("frontend/atlas/atlas-app.js");
const reviewUi = await readText("frontend/atlas/atlas-source-intake.js");
const productProjector = await readText("experience/product-surface-v01/product-surface-projector.mjs");
const reviewProjector = await readText("experience/source-intake-review-v01/source-intake-review-projector.mjs");
const productBrowserSnapshot = JSON.parse(await readText("examples/nexus-atlas-product-surface-phase5-v0.1.json"));

async function loadProviderResult() {
  const provider = createSelfContextProvider({ fixturePath: phase5FixtureUrl });
  return provider.loadContextPackage();
}

async function loadSurface() {
  return buildProductSurface({ providerResult: await loadProviderResult(), view: "desk" });
}

function source() {
  return structuredClone(sourceExample.snapshot);
}

function importPlan() {
  return structuredClone(planExample.plan);
}

function acceptedBrowserReview() {
  const snapshot = makeGitHubSnapshot(["commit", "issue"]);
  const plan = planFor(["commit", "issue"]);
  const selectedCandidateIds = authorizedIds(plan).slice(0, 3);
  const graph = acceptedGraph();
  const initial = buildCanonicalAdmissionPlanV01({
    graph,
    plan,
    policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1,
    authorizedCandidateIds: selectedCandidateIds,
  });
  graph.nodes.push(structuredClone(initial.nodeProposals[0]));
  const conflict = structuredClone(initial.nodeProposals[1]);
  conflict.summary = `${conflict.summary} conflict`;
  graph.nodes.push(conflict);
  const expected = buildCanonicalAdmissionPlanV01({
    graph,
    plan,
    policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1,
    authorizedCandidateIds: selectedCandidateIds,
  });
  const review = buildSourceIntakeReviewV01({ snapshot, importPlan: plan, selectedCandidateIds, graph });
  return { review, expected, plan, selectedCandidateIds };
}

function recordsForSection(surface, section) {
  const sections = {
    project: [{ ...surface.project, kind: "project", governance: null, relatedIds: [] }],
    identity: surface.identity,
    "decisions.effective": surface.decisions.effective,
    "decisions.proposed": surface.decisions.proposed,
    "decisions.historical": surface.decisions.historical,
    "memories.confirmed": surface.memories.confirmed,
    "memories.inferred": surface.memories.inferred,
    "memories.disputed": surface.memories.disputed,
    "memories.historical": surface.memories.historical,
    "evidence.current": surface.evidence.current,
    "evidence.stale": surface.evidence.stale,
    "evidence.disputed": surface.evidence.disputed,
    risks: surface.risks,
    actions: surface.actions,
  };
  return Object.hasOwn(sections, section) ? sections[section] : null;
}

function allSurfaceRecords(surface) {
  return surface.inspectorIndex.flatMap((descriptor) => recordsForSection(surface, descriptor.section) || [])
    .filter((record, index, array) => array.findIndex((item) => item.id === record.id) === index);
}

// A. Baseline and frozen-boundary integrity

test("5F-A01 main baseline remains the accepted Phase 4 merge baseline", () => {
  assert.match(contract, /79d66207bbd5818010eae0695e9923e174f5b47a/);
  assert.match(verifier, /PHASE4_MAIN = "79d66207bbd5818010eae0695e9923e174f5b47a"/);
});

test("5F-A02 Phase 5D frozen closure remains an explicit acceptance boundary", () => {
  assert.match(contract, /17289a65735f3a2314c94919cdde8ab21f3d5146/);
  assert.match(verifier, /PHASE5D_FROZEN = "17289a65735f3a2314c94919cdde8ab21f3d5146"/);
});

test("5F-A03 Phase 5E runtime frozen closure remains an explicit acceptance boundary", () => {
  assert.match(contract, /87abd8cf878cd4086c7257b29170579e02f4c0b1/);
  assert.match(verifier, /PHASE5E_RUNTIME_FROZEN = "87abd8cf878cd4086c7257b29170579e02f4c0b1"/);
});

test("5F-A04 verifier performs git frozen-boundary checks over Phase 4 runtime", () => {
  assert.match(verifier, /git", \["diff", "--quiet"/);
  assert.match(verifier, /source-snapshot-validator\.mjs/);
  assert.match(verifier, /canonical-admission\.mjs/);
});

test("5F-A05 verifier protects Resolver Ledger and Graph validation authority", () => {
  assert.match(verifier, /context-graph-validator\.mjs/);
  assert.match(verifier, /decision-memory-resolver\.mjs/);
  assert.match(verifier, /decision-memory-ledger\.mjs/);
});

test("5F-A06 Product Surface remains separate from Source Intake Review semantics", async () => {
  const surface = await loadSurface();
  assert.equal("sourceIntakeReview" in surface, false);
  assert.doesNotMatch(productProjector, /source-intake-review-projector|buildSourceIntakeReviewV01/);
});

test("5F-A07 Source Intake Review preserves all write and promotion capabilities as false", () => {
  const review = buildSourceIntakeReviewV01({ snapshot: source(), importPlan: importPlan() });
  assert.deepEqual(review.capabilities, {
    liveRead: false,
    sourceReread: false,
    persistentWrite: false,
    canonicalGraphMutation: false,
    edgeCreation: false,
    semanticPromotion: false,
  });
});

test("5F-A08 Re-entry audit authorizes acceptance only and excludes feature expansion", () => {
  assert.match(reentryAudit, /acceptance phase, not a feature phase/i);
  assert.match(reentryAudit, /Do \*\*not\*\* add during Phase 5F/);
  assert.match(reentryAudit, /Outcome Write-back/);
  assert.match(reentryAudit, /multi-project Atlas/);
});

// B. Self-Context Product Surface authority and truthfulness

test("5F-B01 effective Decisions remain aligned with accepted upstream package output", async () => {
  const result = await loadProviderResult();
  const surface = buildProductSurface({ providerResult: result });
  assert.equal(surface.decisions.effective.length, result.generalizedContextPackage.decisions.effective.length);
  assert.equal(surface.decisions.effective.every((item) => item.state.verification === "confirmed"), true);
});

test("5F-B02 historical Decisions are not promoted into the effective set", async () => {
  const surface = await loadSurface();
  assert.equal(surface.decisions.historical.length, 0);
  assert.equal(surface.decisions.proposed.length, 0);
  assert.equal(surface.decisions.effective.length, 4);
});

test("5F-B03 confirmed inferred disputed and historical Memory buckets remain distinct", async () => {
  const surface = await loadSurface();
  assert.equal(surface.memories.confirmed.length, 2);
  assert.equal(surface.memories.inferred.length, 0);
  assert.equal(surface.memories.disputed.length, 0);
  assert.equal(surface.memories.historical.length, 0);
});

test("5F-B04 inferred Identity is explicitly non-confirmed at the browser boundary", () => {
  assert.match(desk, /INFERRED IDENTITY/);
  assert.match(desk, /inferred and is not user-confirmed truth/);
  assert.doesNotMatch(desk, /inferred[^\n]{0,80}user-confirmed truth[^\n]{0,20}confirmed/i);
});

test("5F-B05 Evidence freshness remains an independent Product Surface dimension", async () => {
  const surface = await loadSurface();
  assert.equal(surface.evidence.current.every((item) => item.state.freshness === "current"), true);
  assert.equal(surface.evidence.stale.length, 0);
  assert.equal(surface.evidence.disputed.length, 0);
});

test("5F-B06 disputed or historical state is not collapsed into current surface groups", async () => {
  const surface = await loadSurface();
  assert.ok(Array.isArray(surface.memories.disputed));
  assert.ok(Array.isArray(surface.memories.historical));
  assert.ok(Array.isArray(surface.evidence.disputed));
  assert.ok(Array.isArray(surface.evidence.stale));
});

test("5F-B07 Product Surface remains deterministic immutable and non-mutating upstream", async () => {
  const result = await loadProviderResult();
  const before = JSON.stringify(result);
  const first = buildProductSurface({ providerResult: result });
  const second = buildProductSurface({ providerResult: result });
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(result), before);
  assert.equal(Object.isFrozen(first), true);
});

test("5F-B08 downstream Product Surface does not reconstruct restricted or raw source payloads", async () => {
  const surface = await loadSurface();
  const raw = JSON.stringify(surface);
  for (const forbidden of ["proposedPayload", "authorEmail", "credential", "access_token", "refresh_token"]) {
    assert.equal(raw.includes(forbidden), false);
  }
});

// C. Inspector, provenance and governance boundary

test("5F-C01 inspectorIndex remains a unique closed inspectability set", async () => {
  const surface = await loadSurface();
  const ids = surface.inspectorIndex.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const descriptor of surface.inspectorIndex) {
    const records = recordsForSection(surface, descriptor.section);
    assert.ok(records);
    const matches = records.filter((record) => record.id === descriptor.id);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].kind, descriptor.kind);
  }
});

test("5F-C02 unknown Inspector targets fail closed without Graph or source fallback", () => {
  assert.match(desk, /No raw source or Graph fallback was attempted/);
  assert.doesNotMatch(desk, /createContinuityProvider|validateContextGraph/);
});

test("5F-C03 related-context navigation cannot bypass inspectorIndex", () => {
  assert.ok(desk.includes("(record.relatedIds || []).map(surfaceRecordById).filter(Boolean)"));
  assert.match(desk, /function inspectorDescriptorById\(/);
});

test("5F-C04 projected provenance remains bounded and reference-safe", async () => {
  const surface = await loadSurface();
  for (const record of allSurfaceRecords(surface)) {
    if (!record.provenance?.reference) continue;
    assert.doesNotMatch(record.provenance.reference, /[?#]/);
    assert.doesNotMatch(record.provenance.reference, /^[A-Za-z]:\\|^\//);
  }
});

test("5F-C05 accepted browser surface contains no credential-bearing provenance", async () => {
  const raw = JSON.stringify(await loadSurface());
  assert.doesNotMatch(raw, /https?:\/\/[^\s"']+@/);
  assert.doesNotMatch(raw, /token=|access_token|refresh_token|authorization:/i);
});

test("5F-C06 Identity governance survives downstream projection without reinterpretation", async () => {
  const identity = (await loadSurface()).identity[0];
  assert.equal(identity.governance.sensitivity, "personal");
  assert.equal(identity.governance.inheritance, "project_only");
  assert.equal(identity.governance.requiresConfirmation, false);
  assert.equal(identity.state.verification, "confirmed");
  assert.equal(identity.state.freshness, "current");
});

test("5F-C07 source-local authority remains source-local rather than human or canonical authority", () => {
  const review = buildSourceIntakeReviewV01({ snapshot: source(), importPlan: importPlan() });
  assert.equal(review.source.authority, "github-repository-state");
  assert.notEqual(review.source.authority, "human-confirmation");
  assert.notEqual(review.source.authority, "canonical");
});

test("5F-C08 null review sensitivity is rendered as unavailable not safe or public", () => {
  assert.equal(browserReviewSnapshot.candidates.every((candidate) => candidate.privacy.sensitivity === null), true);
  assert.match(reviewUi, /Not supplied upstream/);
  assert.doesNotMatch(reviewUi, /sensitivity.*safe|sensitivity.*public|non-sensitive/i);
});

// D. Source Intake Review and admission-preview boundary

test("5F-D01 Candidate identity pairs are preserved exactly from the accepted Import Plan", () => {
  const plan = importPlan();
  const review = buildSourceIntakeReviewV01({ snapshot: source(), importPlan: plan });
  assert.deepEqual(
    review.candidates.map((item) => [item.candidateId, item.sourceRecordId]),
    plan.candidates.map((item) => [item.candidateId, item.sourceRecordIds[0]]),
  );
});

test("5F-D02 omitted selection remains empty and never becomes select-all", () => {
  const review = buildSourceIntakeReviewV01({ snapshot: source(), importPlan: importPlan() });
  assert.deepEqual(review.selection.selectedCandidateIds, []);
  assert.equal(review.selection.deferredCandidateIds.length, review.candidates.length);
});

test("5F-D03 browser selection remains ephemeral and separate from the accepted frozen snapshot", () => {
  assert.match(reviewUi, /selectedCandidateIds:\s*new Set\(\)/);
  assert.match(reviewUi, /selectionDirty/);
  assert.match(reviewUi, /return deepFreeze\(review\)/);
  assert.doesNotMatch(reviewUi, /localStorage|sessionStorage/);
});

test("5F-D04 selection does not grant persistent authorization or write permission", () => {
  const { review } = acceptedBrowserReview();
  assert.equal(review.admissionPreview.diagnostics.applyAllowed, false);
  assert.equal(review.admissionPreview.persistentWrite, false);
  assert.equal(review.capabilities.canonicalGraphMutation, false);
});

test("5F-D05 per-Candidate reconciliation decisions are mechanically copied from Canonical Admission", () => {
  const { review, expected } = acceptedBrowserReview();
  assert.deepEqual(
    review.admissionPreview.decisions,
    expected.decisions.map(({ candidateId, disposition, reason }) => ({ candidateId, disposition, reason })),
  );
});

test("5F-D06 no-Graph review explicitly reports not-run and invents no reconciliation decisions", () => {
  const plan = importPlan();
  const review = buildSourceIntakeReviewV01({
    snapshot: source(),
    importPlan: plan,
    selectedCandidateIds: [plan.candidates[0].candidateId],
  });
  assert.equal(review.admissionPreview.reconciliation, "not-run");
  assert.deepEqual(review.admissionPreview.decisions, []);
  assert.equal(review.admissionPreview.diagnostics.insertCount, null);
  assert.equal(review.admissionPreview.diagnostics.noopCount, null);
  assert.equal(review.admissionPreview.diagnostics.conflictCount, null);
});

test("5F-D07 Candidate Evidence remains Evidence-only and cannot silently promote semantic kind", () => {
  const review = buildSourceIntakeReviewV01({ snapshot: source(), importPlan: importPlan() });
  assert.equal(review.candidates.every((candidate) => candidate.canonicalKind === "evidence"), true);
  assert.equal(review.admissionPreview.semanticPromotion, false);
});

test("5F-D08 Apply remains unavailable in Product Surface runtime and browser", () => {
  const { review } = acceptedBrowserReview();
  assert.equal(review.admissionPreview.diagnostics.applyAllowed, false);
  assert.doesNotMatch(reviewProjector, /applyCanonicalAdmissionPlanV01|\.apply\(/);
  assert.doesNotMatch(reviewUi, /applyCanonicalAdmissionPlanV01|\.apply\(/);
});

// E. Browser capability, snapshot and route boundary

test("5F-E01 accepted Product Surface browser snapshot deep-equals Node projector output", async () => {
  assert.deepEqual(productBrowserSnapshot, await loadSurface());
});

test("5F-E02 accepted Source Intake Review browser snapshot deep-equals frozen projector output", () => {
  assert.deepEqual(browserReviewSnapshot, acceptedBrowserReview().review);
});

test("5F-E03 migrated browser surfaces do not execute Node-only governance layers", () => {
  const migratedBrowser = `${desk}\n${reviewUi}`;
  assert.doesNotMatch(migratedBrowser, /decision-memory-resolver|decision-memory-ledger|canonical-admission\.mjs|context-graph-validator/);
});

test("5F-E04 migrated browser surfaces contain no live OAuth scanning or remote source refresh capability", () => {
  const migratedBrowser = `${desk}\n${reviewUi}\n${entry}`;
  assert.doesNotMatch(migratedBrowser, /OAuth|Connect GitHub|scanRepositories|scanAccount/i);
  assert.doesNotMatch(migratedBrowser, /fetch\(["']https?:\/\//i);
});

test("5F-E05 migrated browser surfaces contain no persistent write Graph mutation or semantic promotion path", () => {
  const migratedBrowser = `${desk}\n${reviewUi}`;
  assert.doesNotMatch(migratedBrowser, /method\s*:\s*["']POST["']|writeFile|appendFile|applyCanonicalAdmissionPlanV01/);
  assert.doesNotMatch(migratedBrowser, /canonicalGraphMutation\s*:\s*true|semanticPromotion\s*:\s*true/);
});

test("5F-E06 migrated browser surfaces do not persist canonical state in Web Storage", () => {
  assert.doesNotMatch(`${desk}\n${reviewUi}`, /localStorage|sessionStorage/);
});

test("5F-E07 route split preserves Desk and Source Intake as migrated Product Surface routes", () => {
  assert.match(entry, /await import\("\.\/atlas-desk\.js"\)/);
  assert.match(entry, /source-intake/);
  assert.match(entry, /await import\("\.\/atlas-source-intake\.js"\)/);
});

test("5F-E08 Map Territory and Re-entry remain explicit legacy routes", () => {
  for (const route of ["map", "territory", "reentry"]) assert.match(entry, new RegExp(`\\b${route}\\b`));
  assert.match(legacy, /function renderMap\(/);
  assert.match(legacy, /function renderTerritory\(/);
  assert.match(legacy, /function renderReentry\(/);
});

// F. Regression, closure and merge readiness

test("5F-F01 dedicated Phase 5 verifier includes the cross-layer blocking suite", () => {
  assert.match(verifier, /tests\/phase5-final-acceptance-v01\.test\.mjs/);
  assert.match(verifier, /Phase 5 v0\.1 dedicated acceptance PASS/);
});

test("5F-F02 dedicated verifier runs Phase 5C Product Surface and Desk regressions", () => {
  assert.match(verifier, /tests\/product-surface-v01\.test\.mjs/);
  assert.match(verifier, /tests\/atlas-product-surface-desk-v01\.test\.mjs/);
});

test("5F-F03 dedicated verifier runs Phase 5D Inspector and Identity regression", () => {
  assert.match(verifier, /tests\/atlas-canonical-inspector-identity-v01\.test\.mjs/);
});

test("5F-F04 dedicated verifier runs Phase 5E runtime snapshot and browser regressions", () => {
  assert.match(verifier, /tests\/source-intake-review-v01\.test\.mjs/);
  assert.match(verifier, /tests\/atlas-source-intake-review-snapshot-v01\.test\.mjs/);
  assert.match(verifier, /tests\/atlas-source-intake-review-v01\.test\.mjs/);
});

test("5F-F05 dedicated verifier explicitly runs Phase 4F regression acceptance", () => {
  assert.match(verifier, /scripts\/verify-phase4-v01\.mjs/);
});

test("5F-F06 repository exposes Phase 5 dedicated verification alongside full test and check gates", () => {
  assert.equal(packageJson.scripts["verify:phase5-v01"], "node scripts/verify-phase5-v01.mjs");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.ok(packageJson.scripts.check.includes("node --check scripts/verify-phase5-v01.mjs"));
});

test("5F-F07 exact closure SHA clean-checkout CI is a binding pre-acceptance requirement", () => {
  assert.match(contract, /GitHub Actions on the exact accepted Phase 5F closure SHA: SUCCESS/);
  assert.match(contract, /clean-checkout/i);
});

test("5F-F08 PR #13 may leave Draft only after complete acceptance and without feature drift", () => {
  assert.match(contract, /mark PR #13 ready only after acceptance is complete/);
  assert.match(contract, /merge the accepted Phase 5 content to `main` without adding feature work during merge/);
  assert.match(matrix, /All 48 cases are blocking/);
});
