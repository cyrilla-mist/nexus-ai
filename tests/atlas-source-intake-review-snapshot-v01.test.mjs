import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import browserSnapshot from "../examples/nexus-atlas-source-intake-review-browser-v0.1.json" with { type: "json" };
import { planFor, authorizedIds } from "./helpers/canonical-admission-fixtures.mjs";
import { makeGitHubSnapshot } from "./helpers/context-import-plan-fixtures.mjs";
import { acceptedGraph } from "./helpers/canonical-admission-fixtures.mjs";
import { buildCanonicalAdmissionPlanV01, GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1 } from "../experience/context-v02/canonical-admission.mjs";
import { buildSourceIntakeReviewV01 } from "../experience/source-intake-review-v01/source-intake-review-projector.mjs";

const TYPES = ["commit", "issue"];

function acceptedBrowserReview() {
  const snapshot = makeGitHubSnapshot(TYPES);
  const importPlan = planFor(TYPES);
  const selectedCandidateIds = authorizedIds(importPlan).slice(0, 3);
  const graph = acceptedGraph();

  const initial = buildCanonicalAdmissionPlanV01({
    graph,
    plan: importPlan,
    policyVersion: GITHUB_EVIDENCE_CANONICAL_ADMISSION_POLICY_V1,
    authorizedCandidateIds: selectedCandidateIds,
  });
  graph.nodes.push(structuredClone(initial.nodeProposals[0]));
  const conflict = structuredClone(initial.nodeProposals[1]);
  conflict.summary = `${conflict.summary} conflict`;
  graph.nodes.push(conflict);

  return buildSourceIntakeReviewV01({
    snapshot,
    importPlan,
    selectedCandidateIds,
    graph,
  });
}

test("accepted Source Intake Review browser snapshot equals frozen projector output", () => {
  assert.deepEqual(browserSnapshot, acceptedBrowserReview());
});

test("accepted browser snapshot demonstrates truthful per-Candidate reconciliation", () => {
  assert.equal(browserSnapshot.version, "nexus-atlas.source-intake-review.v0.1");
  assert.equal(browserSnapshot.admissionPreview.reconciliation, "admission-plan");
  assert.deepEqual(
    new Set(browserSnapshot.admissionPreview.decisions.map((decision) => decision.disposition)),
    new Set(["insert", "noop", "conflict", "deferred"]),
  );
  assert.equal(browserSnapshot.selection.selectedCandidateIds.length, 3);
  assert.equal(browserSnapshot.selection.deferredCandidateIds.length, 1);
  assert.equal(browserSnapshot.admissionPreview.diagnostics.applyAllowed, false);
});

test("accepted browser review snapshot remains bounded and review-only", () => {
  assert.deepEqual(browserSnapshot.capabilities, {
    liveRead: false,
    sourceReread: false,
    persistentWrite: false,
    canonicalGraphMutation: false,
    edgeCreation: false,
    semanticPromotion: false,
  });
  assert(browserSnapshot.candidates.every((candidate) => candidate.admission.canonicalWriteAllowed === false));
  assert(browserSnapshot.candidates.every((candidate) => candidate.privacy.payloadOmitted === true));
  assert(browserSnapshot.candidates.every((candidate) => candidate.privacy.sensitivity === null));
});

test("browser review snapshot contains no raw source payload", async () => {
  const raw = await readFile(new URL("../examples/nexus-atlas-source-intake-review-browser-v0.1.json", import.meta.url), "utf8");
  for (const forbidden of ['"proposedPayload"', '"payload"', '"comments"', '"reviews"', '"authorEmail"', '"token"', '"credential"']) {
    assert.equal(raw.includes(forbidden), false);
  }
});
