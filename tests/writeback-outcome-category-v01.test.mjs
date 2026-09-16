import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  OutcomeCategoryError,
  buildOutcomeCategoryProposalV01,
  getOutcomeCategoryDescriptorV01,
  listOutcomeCategoryDescriptorsV01,
  validateOutcomeCategoryDescriptorV01,
  validateOutcomeCategoryProposalV01,
} from "../experience/writeback-v01/writeback-outcome-category.mjs";
import {
  Phase6OutcomeCategoryAdapterError,
  categorizePhase6OutcomeV01,
  validateCategorizedOutcomeReferenceV01,
} from "../experience/writeback-v01/phase6-outcome-category-adapter.mjs";
import { validateOutcomeRecordV01 } from "../experience/continuity-loop-v01/outcome-verifier.mjs";

const PROJECT = "project:nexus-atlas";
const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const AT = "2026-09-16T13:30:00Z";
const RECORDED = "2026-09-16T13:31:00Z";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

function outcome(state = "verified") {
  const verified = state === "verified";
  const payload = {
    outcomeVersion: "nexus-atlas.outcome-record.v0.1",
    projectRef: PROJECT,
    reentryRef: "reentry-package:test",
    verificationEnvelopeRef: "verification-envelope:test",
    actionObservationRef: "action-observation:test",
    verificationRef: "outcome-verification:test",
    actionRef: "action:test-writeback",
    attemptedAt: AT,
    executionActor: "external:test-runner",
    expectedPostcondition: {
      conditionType: "github-default-branch-head-advanced",
      expectedValue: null,
    },
    observedPostcondition: {
      baselineHead: BASE,
      observedHead: verified ? HEAD : state === "failed" ? BASE : null,
      lineage: verified ? "ahead" : state === "failed" ? "identical" : null,
      expectedValueObserved: null,
    },
    verificationState: state,
    verificationEvidenceRefs: verified ? [`github:commit:cyrilla-mist/nexus-ai:${HEAD}`] : [],
    failureReason: verified ? null : state === "failed" ? "Fresh source evidence did not prove the expected postcondition." : "Fresh source evidence was unavailable.",
    recordedAt: RECORDED,
    authority: "derived-outcome-record",
    capabilities: {
      persistAllowed: true,
      nextCheckpointAllowed: verified,
    },
  };
  return validateOutcomeRecordV01({
    ...payload,
    outcomeId: `outcome:${digest(payload).slice(0, 24)}`,
  });
}

function proposal(category, overrides = {}) {
  return buildOutcomeCategoryProposalV01({
    projectRef: PROJECT,
    category,
    subjectRef: `${category}:subject:test`,
    proposedAt: AT,
    basisRefs: ["decision:phase7-writeback-generalization"],
    evidenceRefs: ["evidence:test"],
    humanAuthorityRef: category === "decision-transition" ? "human-authority:test" : null,
    explanation: `Bounded ${category} proposal for Phase 7E acceptance.`,
    ...overrides,
  });
}

test("7E-A01 registry contains only the four bounded initial categories", () => {
  assert.deepEqual(
    listOutcomeCategoryDescriptorsV01().map(item => item.category),
    ["action-execution", "decision-transition", "evidence-refresh", "milestone-transition"],
  );
});

test("7E-A02 descriptors are deterministic and deeply immutable", () => {
  const a = getOutcomeCategoryDescriptorV01("action-execution");
  const b = getOutcomeCategoryDescriptorV01("action-execution");
  assert.deepEqual(a, b);
  assert.equal(Object.isFrozen(a), true);
  assert.equal(Object.isFrozen(a.requirements), true);
  assert.equal(Object.isFrozen(a.capabilities), true);
});

test("7E-A03 every category requires fresh authoritative verification", () => {
  for (const descriptor of listOutcomeCategoryDescriptorsV01()) {
    assert.equal(descriptor.requirements.freshAuthoritativeVerification, true);
  }
});

test("7E-A04 category classification never grants checkpoint advancement", () => {
  for (const descriptor of listOutcomeCategoryDescriptorsV01()) {
    assert.equal(descriptor.capabilities.checkpointAdvanceAuthority, false);
  }
});

test("7E-A05 category classification never grants Canonical Context write", () => {
  for (const descriptor of listOutcomeCategoryDescriptorsV01()) {
    assert.equal(descriptor.capabilities.canonicalContextWriteAllowed, false);
    assert.equal(descriptor.requirements.canonicalAdmissionForContextWrite, true);
  }
});

test("7E-A06 decision transition requires explicit Human Authority", () => {
  const descriptor = getOutcomeCategoryDescriptorV01("decision-transition");
  assert.equal(descriptor.requirements.humanAuthority, "required");
  assert.throws(
    () => proposal("decision-transition", { humanAuthorityRef: null }),
    error => error instanceof OutcomeCategoryError && error.code === "HUMAN_AUTHORITY_REQUIRED",
  );
});

test("7E-A07 evidence refresh does not manufacture Human Authority", () => {
  const descriptor = getOutcomeCategoryDescriptorV01("evidence-refresh");
  assert.equal(descriptor.requirements.humanAuthority, "not-required");
  assert.equal(descriptor.capabilities.canonicalContextWriteAllowed, false);
});

test("7E-A08 action and milestone Human Authority remains conditional", () => {
  assert.equal(getOutcomeCategoryDescriptorV01("action-execution").requirements.humanAuthority, "conditional");
  assert.equal(getOutcomeCategoryDescriptorV01("milestone-transition").requirements.humanAuthority, "conditional");
});

test("7E-A09 unsupported categories fail closed", () => {
  assert.throws(
    () => getOutcomeCategoryDescriptorV01("project-vibe"),
    error => error instanceof OutcomeCategoryError && error.code === "UNSUPPORTED_OUTCOME_CATEGORY",
  );
});

test("7E-A10 descriptor tampering fails validation", () => {
  const descriptor = clone(getOutcomeCategoryDescriptorV01("evidence-refresh"));
  descriptor.capabilities.canonicalContextWriteAllowed = true;
  assert.throws(() => validateOutcomeCategoryDescriptorV01(descriptor));
});

test("7E-B01 each bounded category can create a deterministic proposal", () => {
  for (const category of ["action-execution", "milestone-transition", "decision-transition", "evidence-refresh"]) {
    const a = proposal(category);
    const b = proposal(category);
    assert.deepEqual(a, b);
    assert.equal(a.category, category);
    assert.match(a.proposalId, /^outcome-category-proposal:[0-9a-f]{24}$/);
  }
});

test("7E-B02 proposal output is deeply immutable", () => {
  const value = proposal("milestone-transition");
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.basisRefs), true);
  assert.equal(Object.isFrozen(value.evidenceRefs), true);
});

test("7E-B03 proposal builder does not mutate input arrays", () => {
  const basisRefs = ["decision:test"];
  const evidenceRefs = ["evidence:test"];
  const before = { basisRefs: clone(basisRefs), evidenceRefs: clone(evidenceRefs) };
  buildOutcomeCategoryProposalV01({
    projectRef: PROJECT,
    category: "evidence-refresh",
    subjectRef: "evidence:subject:test",
    proposedAt: AT,
    basisRefs,
    evidenceRefs,
    explanation: "Refresh one bounded evidence subject.",
  });
  assert.deepEqual({ basisRefs, evidenceRefs }, before);
});

test("7E-B04 proposal identity binds category", () => {
  assert.notEqual(proposal("action-execution").proposalId, proposal("milestone-transition").proposalId);
});

test("7E-B05 proposal identity binds Human Authority reference", () => {
  const first = proposal("decision-transition", { humanAuthorityRef: "human-authority:first" });
  const second = proposal("decision-transition", { humanAuthorityRef: "human-authority:second" });
  assert.notEqual(first.proposalId, second.proposalId);
});

test("7E-B06 malformed proposal identity fails closed", () => {
  const value = clone(proposal("action-execution"));
  value.proposalId = "outcome-category-proposal:000000000000000000000000";
  assert.throws(() => validateOutcomeCategoryProposalV01(value));
});

test("7E-C01 accepted Phase 6 Outcome maps only to action-execution", () => {
  const ref = categorizePhase6OutcomeV01(outcome("verified"));
  assert.equal(ref.category, "action-execution");
  assert.equal(ref.subjectRef, "action:test-writeback");
});

test("7E-C02 categorized reference preserves accepted verification state and evidence", () => {
  const source = outcome("verified");
  const ref = categorizePhase6OutcomeV01(source);
  assert.equal(ref.verificationState, source.verificationState);
  assert.deepEqual(ref.evidenceRefs, source.verificationEvidenceRefs);
  assert.equal(ref.sourceAuthority, source.authority);
});

test("7E-C03 failed Phase 6 Outcome remains classifiable history", () => {
  const ref = categorizePhase6OutcomeV01(outcome("failed"));
  assert.equal(ref.category, "action-execution");
  assert.equal(ref.verificationState, "failed");
  assert.equal(ref.capabilities.historyReferenceAllowed, true);
});

test("7E-C04 indeterminate Phase 6 Outcome remains classifiable history", () => {
  const ref = categorizePhase6OutcomeV01(outcome("indeterminate"));
  assert.equal(ref.verificationState, "indeterminate");
  assert.equal(ref.capabilities.historyReferenceAllowed, true);
});

test("7E-C05 categorized reference itself never grants checkpoint advancement", () => {
  const ref = categorizePhase6OutcomeV01(outcome("verified"));
  assert.equal(ref.capabilities.checkpointAdvanceAuthority, false);
});

test("7E-C06 categorized reference itself never grants canonical write", () => {
  const ref = categorizePhase6OutcomeV01(outcome("verified"));
  assert.equal(ref.capabilities.canonicalContextWriteAllowed, false);
});

test("7E-C07 adapter leaves frozen Outcome untouched", () => {
  const source = outcome("verified");
  const before = clone(source);
  categorizePhase6OutcomeV01(source);
  assert.deepEqual(source, before);
});

test("7E-C08 categorized reference is deeply immutable", () => {
  const ref = categorizePhase6OutcomeV01(outcome("verified"));
  assert.equal(Object.isFrozen(ref), true);
  assert.equal(Object.isFrozen(ref.evidenceRefs), true);
  assert.equal(Object.isFrozen(ref.capabilities), true);
});

test("7E-C09 categorized reference identity tampering fails closed", () => {
  const ref = clone(categorizePhase6OutcomeV01(outcome("verified")));
  ref.referenceId = "categorized-outcome:000000000000000000000000";
  assert.throws(() => validateCategorizedOutcomeReferenceV01(ref));
});

test("7E-C10 invalid Phase 6 Outcome is rejected before classification", () => {
  const source = clone(outcome("verified"));
  source.actionRef = "action:tampered";
  assert.throws(
    () => categorizePhase6OutcomeV01(source),
    error => error instanceof Phase6OutcomeCategoryAdapterError && error.code === "INVALID_PHASE6_OUTCOME",
  );
});
