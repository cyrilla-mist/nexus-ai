import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  CrossSourcePostconditionError,
  buildCrossSourcePostconditionProposalV01,
  buildCrossSourceVerificationV01,
  validateCrossSourcePostconditionProposalV01,
  validateCrossSourceVerificationV01,
  validatePostconditionProofV01,
} from "../experience/writeback-v01/cross-source-postcondition.mjs";
import {
  GitHubPhase6PostconditionProofError,
  buildGitHubPhase6PostconditionProofV01,
} from "../experience/writeback-v01/github-phase6-postcondition-proof.mjs";
import {
  DATAHUB_CONTINUITY_SCOPE_REF_V01,
  DataHubPostconditionProofError,
  buildDataHubPostconditionProofV01,
} from "../experience/writeback-v01/datahub-postcondition-proof.mjs";
import { buildOutcomeCategoryProposalV01 } from "../experience/writeback-v01/writeback-outcome-category.mjs";
import { validateOutcomeRecordV01 } from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { validateReentryPackageV01 } from "../experience/continuity-loop-v01/reentry-package.mjs";
import {
  CONTINUITY_PROJECT_ID,
  CONTINUITY_PROJECT_URN,
} from "../datahub/mcp/continuity-live-normalizer.mjs";

const PROJECT = "project:nexus-atlas";
const REF = "cyrilla-mist/nexus-ai";
const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CATEGORY_AT = "2026-09-16T13:10:00Z";
const PACKAGE_AT = "2026-09-16T13:15:00Z";
const DECLARED_AT = "2026-09-16T13:20:00Z";
const ATTEMPTED_AT = "2026-09-16T13:25:00Z";
const OBSERVED_AT = "2026-09-16T13:30:00Z";
const RECORDED_AT = "2026-09-16T13:31:00Z";
const VERIFIED_AT = "2026-09-16T13:32:00Z";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

function categoryProposal(category, subjectRef, overrides = {}) {
  return buildOutcomeCategoryProposalV01({
    projectRef: PROJECT,
    category,
    subjectRef,
    proposedAt: CATEGORY_AT,
    basisRefs: ["decision:phase7-cross-source-verification"],
    evidenceRefs: [],
    humanAuthorityRef: category === "decision-transition" ? "human-authority:decision-transition:test" : null,
    explanation: `Verify one bounded ${category} consequence across an accepted source profile.`,
    ...overrides,
  });
}

function githubCategory() {
  return categoryProposal("action-execution", "action:test-cross-source");
}

function githubPostcondition(category = githubCategory(), overrides = {}) {
  return buildCrossSourcePostconditionProposalV01({
    categoryProposal: category,
    provider: "github",
    profile: "phase6-outcome-v0.1",
    scopeRef: REF,
    declaredAt: DECLARED_AT,
    condition: {
      conditionType: "github-default-branch-head-advanced",
      expectedValue: null,
    },
    explanation: "Reuse the frozen Phase 6 GitHub Outcome verification as one accepted source proof profile.",
    ...overrides,
  });
}

function reentryPackage() {
  const payload = {
    packageVersion: "nexus-atlas.reentry-package.v0.1",
    projectRef: PROJECT,
    checkpointRef: "checkpoint:test-cross-source",
    assessmentRef: "continuity-assessment:test-cross-source",
    evidenceWindowRef: "fresh-evidence-window:test-cross-source",
    preparedAt: PACKAGE_AT,
    validity: "VALID",
    nextAction: {
      actionRef: "action:test-cross-source",
      summary: "Perform the bounded cross-source verification test action.",
      basisRefs: ["decision:phase7-cross-source-verification"],
      evidenceRefs: [`github:branch:${REF}:main`],
    },
    humanAuthorityDecisionRef: null,
    verificationPlan: {
      provider: "github",
      scopeRef: REF,
      cursorType: "default-branch-head",
      baselineValue: BASE,
      requirement: "fresh-authoritative-reread",
    },
    evidenceRefs: [`github:branch:${REF}:main`],
    authority: "derived-reentry-package",
    capabilities: {
      externalExecutionRequired: true,
      freshVerificationRequired: true,
      autonomousExecutionAllowed: false,
      checkpointWriteAllowed: false,
      outcomeWriteAllowed: false,
    },
  };
  return validateReentryPackageV01({
    ...payload,
    packageId: `reentry-package:${digest(payload).slice(0, 24)}`,
  });
}

function phase6Outcome(state = "verified", pkg = reentryPackage()) {
  const verified = state === "verified";
  const payload = {
    outcomeVersion: "nexus-atlas.outcome-record.v0.1",
    projectRef: PROJECT,
    reentryRef: pkg.packageId,
    verificationEnvelopeRef: "verification-envelope:test-cross-source",
    actionObservationRef: "action-observation:test-cross-source",
    verificationRef: "outcome-verification:test-cross-source",
    actionRef: pkg.nextAction.actionRef,
    attemptedAt: ATTEMPTED_AT,
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
    verificationEvidenceRefs: verified ? [`github:commit:${REF}:${HEAD}`] : [],
    failureReason: verified ? null : state === "failed" ? "Fresh GitHub evidence did not prove the expected postcondition." : "Fresh GitHub verification was indeterminate.",
    recordedAt: RECORDED_AT,
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

function githubProof(state = "verified") {
  const category = githubCategory();
  const postcondition = githubPostcondition(category);
  const pkg = reentryPackage();
  const outcome = phase6Outcome(state, pkg);
  const proof = buildGitHubPhase6PostconditionProofV01({
    categoryProposal: category,
    postconditionProposal: postcondition,
    reentryPackage: pkg,
    outcome,
  });
  return { category, postcondition, pkg, outcome, proof };
}

function datahubCategory(category = "milestone-transition", subjectRef = "milestone:phase7f") {
  return categoryProposal(category, subjectRef);
}

function datahubPostcondition(category = datahubCategory(), expectedValue = "completed", overrides = {}) {
  return buildCrossSourcePostconditionProposalV01({
    categoryProposal: category,
    provider: "datahub",
    profile: "continuity-mcp-v0.9.5",
    scopeRef: DATAHUB_CONTINUITY_SCOPE_REF_V01,
    declaredAt: DECLARED_AT,
    condition: {
      conditionType: "datahub-entity-status-equals",
      expectedValue,
    },
    explanation: "Verify one bounded entity-state postcondition from the read-only DataHub continuity snapshot.",
    ...overrides,
  });
}

function datahubSnapshot(entities = [{
  id: "milestone:phase7f",
  type: "milestone",
  status: "completed",
  updatedAt: OBSERVED_AT,
}], overrides = {}) {
  return {
    source: "datahub-mcp",
    readOnly: true,
    fetchedAt: OBSERVED_AT,
    projectUrn: CONTINUITY_PROJECT_URN,
    scenario: {
      project: { id: CONTINUITY_PROJECT_ID },
      entities,
    },
    diagnostics: {
      lineageVerification: {
        checked: true,
        passed: true,
      },
    },
    ...overrides,
  };
}

test("7F-A01 GitHub Phase 6 source profile accepts only action-execution", () => {
  const milestone = datahubCategory("milestone-transition", "milestone:x");
  assert.throws(
    () => buildCrossSourcePostconditionProposalV01({
      categoryProposal: milestone,
      provider: "github",
      profile: "phase6-outcome-v0.1",
      scopeRef: REF,
      declaredAt: DECLARED_AT,
      condition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
      explanation: "This category/profile pairing must fail.",
    }),
    error => error instanceof CrossSourcePostconditionError && error.code === "CATEGORY_SOURCE_PROFILE_MISMATCH",
  );
});

test("7F-A02 DataHub profile accepts the bounded Phase 7E semantic categories", () => {
  for (const [categoryName, subject] of [
    ["action-execution", "action:x"],
    ["milestone-transition", "milestone:x"],
    ["decision-transition", "decision:x"],
    ["evidence-refresh", "evidence:x"],
  ]) {
    const category = datahubCategory(categoryName, subject);
    assert.equal(datahubPostcondition(category).category, categoryName);
  }
});

test("7F-A03 unsupported provider/profile fails closed", () => {
  const category = githubCategory();
  assert.throws(
    () => buildCrossSourcePostconditionProposalV01({
      categoryProposal: category,
      provider: "notion",
      profile: "invented-v1",
      scopeRef: "workspace:test",
      declaredAt: DECLARED_AT,
      condition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
      explanation: "Unsupported profile must not be accepted.",
    }),
    error => error instanceof CrossSourcePostconditionError && error.code === "UNSUPPORTED_SOURCE_PROFILE",
  );
});

test("7F-A04 provider-specific condition vocabulary is enforced", () => {
  const category = datahubCategory();
  assert.throws(
    () => datahubPostcondition(category, "completed", {
      condition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
    }),
    error => error instanceof CrossSourcePostconditionError && error.code === "CONDITION_SOURCE_PROFILE_MISMATCH",
  );
});

test("7F-A05 postcondition identity is deterministic and deeply immutable", () => {
  const category = datahubCategory();
  const a = datahubPostcondition(category);
  const b = datahubPostcondition(category);
  assert.deepEqual(a, b);
  assert.equal(Object.isFrozen(a), true);
  assert.equal(Object.isFrozen(a.condition), true);
});

test("7F-A06 declared postcondition cannot predate the category proposal", () => {
  const category = datahubCategory();
  assert.throws(() => datahubPostcondition(category, "completed", { declaredAt: "2026-09-16T13:00:00Z" }));
});

test("7F-A07 tampered postcondition identity fails validation", () => {
  const value = clone(datahubPostcondition());
  value.postconditionId = "cross-source-postcondition:000000000000000000000000";
  assert.throws(() => validateCrossSourcePostconditionProposalV01(value));
});

test("7F-B01 verified Phase 6 Outcome becomes a satisfied GitHub proof", () => {
  const { proof } = githubProof("verified");
  assert.equal(proof.provider, "github");
  assert.equal(proof.result, "satisfied");
  assert.equal(proof.observedValue, HEAD);
});

test("7F-B02 failed Phase 6 Outcome becomes a not-satisfied proof", () => {
  assert.equal(githubProof("failed").proof.result, "not-satisfied");
});

test("7F-B03 indeterminate Phase 6 Outcome remains unknown rather than failure", () => {
  assert.equal(githubProof("indeterminate").proof.result, "unknown");
});

test("7F-B04 GitHub proof preserves source evidence refs exactly", () => {
  const { outcome, proof } = githubProof("verified");
  assert.deepEqual(proof.evidenceRefs, outcome.verificationEvidenceRefs);
});

test("7F-B05 GitHub adapter rejects cross-action binding", () => {
  const category = categoryProposal("action-execution", "action:other");
  const postcondition = githubPostcondition(category);
  const pkg = reentryPackage();
  const outcome = phase6Outcome("verified", pkg);
  assert.throws(
    () => buildGitHubPhase6PostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, reentryPackage: pkg, outcome }),
    error => error instanceof GitHubPhase6PostconditionProofError && error.code === "GITHUB_PHASE6_BINDING_MISMATCH",
  );
});

test("7F-B06 GitHub adapter rejects tampered frozen Outcome", () => {
  const { category, postcondition, pkg, outcome } = githubProof("verified");
  const tampered = clone(outcome);
  tampered.actionRef = "action:tampered";
  assert.throws(() => buildGitHubPhase6PostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, reentryPackage: pkg, outcome: tampered }));
});

test("7F-B07 GitHub adapter does not mutate accepted inputs", () => {
  const { category, postcondition, pkg, outcome } = githubProof("verified");
  const before = clone({ category, postcondition, pkg, outcome });
  buildGitHubPhase6PostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, reentryPackage: pkg, outcome });
  assert.deepEqual({ category, postcondition, pkg, outcome }, before);
});

test("7F-C01 DataHub matching milestone status yields satisfied proof", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const proof = buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot: datahubSnapshot() });
  assert.equal(proof.result, "satisfied");
  assert.equal(proof.observedValue, "completed");
});

test("7F-C02 DataHub observed mismatch yields not-satisfied proof", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category, "active");
  const proof = buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot: datahubSnapshot() });
  assert.equal(proof.result, "not-satisfied");
  assert.equal(proof.observedValue, "completed");
});

test("7F-C03 DataHub decision status may be source-verified only when category already carries Human Authority ref", () => {
  const category = datahubCategory("decision-transition", "decision:phase7f");
  const postcondition = datahubPostcondition(category, "confirmed");
  const snapshot = datahubSnapshot([{ id: "decision:phase7f", type: "decision", status: "confirmed", updatedAt: OBSERVED_AT }]);
  const proof = buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot });
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "verified");
  assert.equal(verification.capabilities.canonicalContextWriteAllowed, false);
});

test("7F-C04 DataHub evidence refresh remains source-local and non-canonical", () => {
  const category = datahubCategory("evidence-refresh", "evidence:phase7f");
  const postcondition = datahubPostcondition(category, "current");
  const snapshot = datahubSnapshot([{ id: "evidence:phase7f", type: "evidence", status: "current", updatedAt: OBSERVED_AT }]);
  const proof = buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot });
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "verified");
  assert.equal(verification.capabilities.canonicalContextWriteAllowed, false);
});

test("7F-C05 DataHub entity kind must match category semantics", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const snapshot = datahubSnapshot([{ id: "milestone:phase7f", type: "decision", status: "completed", updatedAt: OBSERVED_AT }]);
  assert.throws(
    () => buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot }),
    error => error instanceof DataHubPostconditionProofError && error.code === "DATAHUB_SUBJECT_KIND_MISMATCH",
  );
});

test("7F-C06 missing DataHub subject fails closed rather than becoming a failed Outcome", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  assert.throws(
    () => buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot: datahubSnapshot([]) }),
    error => error instanceof DataHubPostconditionProofError && error.code === "DATAHUB_SUBJECT_NOT_FOUND",
  );
});

test("7F-C07 DataHub snapshot requires successful representative lineage verification", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const snapshot = datahubSnapshot(undefined, { diagnostics: { lineageVerification: { checked: true, passed: false } } });
  assert.throws(
    () => buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot }),
    error => error instanceof DataHubPostconditionProofError && error.code === "DATAHUB_LINEAGE_NOT_VERIFIED",
  );
});

test("7F-C08 DataHub snapshot cannot be relabeled to another continuity scope", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const snapshot = datahubSnapshot(undefined, { projectUrn: "urn:li:dataset:(urn:li:dataPlatform:nexus,other,DEV)" });
  assert.throws(
    () => buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot }),
    error => error instanceof DataHubPostconditionProofError && error.code === "DATAHUB_SCOPE_MISMATCH",
  );
});

test("7F-C09 DataHub adapter does not mutate the live-read snapshot", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const snapshot = datahubSnapshot();
  const before = clone(snapshot);
  buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot });
  assert.deepEqual(snapshot, before);
});

test("7F-D01 satisfied proof maps to verified cross-source verification", () => {
  const { category, postcondition, proof } = githubProof("verified");
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "verified");
});

test("7F-D02 not-satisfied proof maps to failed cross-source verification", () => {
  const { category, postcondition, proof } = githubProof("failed");
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "failed");
});

test("7F-D03 unknown proof maps to indeterminate cross-source verification", () => {
  const { category, postcondition, proof } = githubProof("indeterminate");
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "indeterminate");
});

test("7F-D04 proof observed before declared postcondition is stale and rejected", () => {
  const category = datahubCategory();
  const postcondition = datahubPostcondition(category);
  const stale = datahubSnapshot(undefined, { fetchedAt: "2026-09-16T13:19:00Z" });
  const proof = buildDataHubPostconditionProofV01({ categoryProposal: category, postconditionProposal: postcondition, snapshot: stale });
  assert.throws(
    () => buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT }),
    error => error instanceof CrossSourcePostconditionError && error.code === "STALE_POSTCONDITION_PROOF",
  );
});

test("7F-D05 cross-source verification never grants write-back Outcome authority", () => {
  const { category, postcondition, proof } = githubProof("verified");
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.deepEqual(verification.capabilities, {
    writebackOutcomeAllowed: false,
    checkpointAdvanceAuthority: false,
    canonicalContextWriteAllowed: false,
  });
});

test("7F-D06 cross-source verification is deeply immutable", () => {
  const { category, postcondition, proof } = githubProof("verified");
  const verification = buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT });
  assert.equal(Object.isFrozen(verification), true);
  assert.equal(Object.isFrozen(verification.evidenceRefs), true);
  assert.equal(Object.isFrozen(verification.capabilities), true);
});

test("7F-D07 proof identity tampering fails closed", () => {
  const value = clone(githubProof("verified").proof);
  value.proofId = "postcondition-proof:000000000000000000000000";
  assert.throws(() => validatePostconditionProofV01(value));
});

test("7F-D08 verification identity tampering fails closed", () => {
  const { category, postcondition, proof } = githubProof("verified");
  const value = clone(buildCrossSourceVerificationV01({ categoryProposal: category, postconditionProposal: postcondition, proof, verifiedAt: VERIFIED_AT }));
  value.verificationId = "cross-source-verification:000000000000000000000000";
  assert.throws(() => validateCrossSourceVerificationV01(value));
});

test("7F-D09 proof from another subject cannot verify this category proposal", () => {
  const first = githubProof("verified");
  const otherCategory = categoryProposal("action-execution", "action:other");
  assert.throws(() => buildCrossSourceVerificationV01({
    categoryProposal: otherCategory,
    postconditionProposal: first.postcondition,
    proof: first.proof,
    verifiedAt: VERIFIED_AT,
  }));
});
