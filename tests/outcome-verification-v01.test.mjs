import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
  buildContinuityAssessmentV01,
} from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
  buildFreshEvidenceWindowV01,
} from "../experience/continuity-loop-v01/fresh-evidence-window.mjs";
import { createGitHubCommitRangeReader } from "../experience/continuity-loop-v01/github-commit-range-proof.mjs";
import {
  buildInitialAlignmentProposalV01,
  confirmInitialAlignmentV01,
} from "../experience/continuity-loop-v01/initial-alignment.mjs";
import {
  POSTCONDITION_PROPOSAL_VERSION_V01,
  OutcomeVerificationError,
  buildActionObservationV01,
  buildActionVerificationEnvelopeV01,
  buildOutcomeRecordV01,
  buildOutcomeVerificationV01,
  validateActionObservationV01,
  validateActionVerificationEnvelopeV01,
  validateOutcomeRecordV01,
  validateOutcomeVerificationV01,
} from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { buildReentryPackageV01 } from "../experience/continuity-loop-v01/reentry-package.mjs";
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import {
  createBranchResponse,
  createGitHubClientFixture,
  REF,
} from "./helpers/github-source-fixtures.mjs";

const PROJECT = "project:nexus-atlas";
const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MID = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HEAD = "cccccccccccccccccccccccccccccccccccccccc";
const POST = "dddddddddddddddddddddddddddddddddddddddd";
const CURSOR_AT = "2026-09-15T12:00:00Z";
const PRE_CAPTURED_AT = "2026-09-15T12:30:00Z";
const PACKAGE_AT = "2026-09-15T12:40:00Z";
const DECLARED_AT = "2026-09-15T12:41:00Z";
const ATTEMPTED_AT = "2026-09-15T12:42:00Z";
const POST_CAPTURED_AT = "2026-09-15T12:45:00Z";
const VERIFIED_AT = "2026-09-15T12:46:00Z";
const RECORDED_AT = "2026-09-15T12:47:00Z";
const clone = value => structuredClone(value);

function alignmentInput() {
  return {
    projectRef: PROJECT,
    proposedAt: "2026-09-15T12:01:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Verify the bounded re-entry action from fresh GitHub evidence.",
    acceptedNextAction: {
      actionRef: "action:phase6e-verify-outcome",
      summary: "Perform one bounded repository action whose default-branch advancement is observable.",
      basisRefs: ["decision:phase6-single-real-loop"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REF,
      cursorType: "default-branch-head",
      value: BASE,
      capturedAt: CURSOR_AT,
    },
    governingRefs: ["decision:phase6-single-real-loop", "decision:validate-before-recover"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-self-context",
      authority: "accepted-context-plus-human-alignment",
      references: ["docs:Nexus-Atlas-v0.1-Outcome-Verification-Contract"],
    },
  };
}

function checkpoint() {
  const proposal = buildInitialAlignmentProposalV01(alignmentInput());
  return confirmInitialAlignmentV01({
    proposal,
    confirmation: {
      proposalId: proposal.proposalId,
      accepted: true,
      actorRef: "user:cyrilla",
      confirmedAt: "2026-09-15T12:02:00Z",
    },
  });
}

async function snapshot(headSha, capturedAt) {
  const client = createGitHubClientFixture({ branch: createBranchResponse({ headSha }) });
  const adapter = createGitHubSourceAdapter({ client });
  return adapter.readSnapshot({
    repositoryRef: REF,
    capturedAt,
    requestedLimits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 },
  });
}

function providerCommit(sha, committedAt) {
  return { sha, authoredAt: committedAt, committedAt, messageHeadline: `Commit ${sha.slice(0, 6)}` };
}

async function rangeProof({ baseSha, headSha, capturedAt, relation = "ahead", aheadBy = 1, behindBy = 0, commits = [providerCommit(headSha, capturedAt)], continuationAvailable = false, limit = 20 }) {
  const reader = createGitHubCommitRangeReader({
    client: {
      async compareCommits() {
        return clone({ relation, aheadBy, behindBy, commits, continuationAvailable });
      },
    },
  });
  return reader.readCommitRange({ repositoryRef: REF, baseSha, headSha, capturedAt, limit });
}

function policy() {
  return {
    policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
    projectRef: PROJECT,
    repositoryRef: REF,
    maxCommitRange: 20,
  };
}

async function preWindow(cp) {
  return buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await snapshot(HEAD, PRE_CAPTURED_AT),
    commitRangeProof: await rangeProof({
      baseSha: BASE,
      headSha: HEAD,
      capturedAt: PRE_CAPTURED_AT,
      aheadBy: 2,
      commits: [
        providerCommit(MID, "2026-09-15T12:20:00Z"),
        providerCommit(HEAD, "2026-09-15T12:25:00Z"),
      ],
    }),
    requiredEvidencePolicy: policy(),
  });
}

function validAssessmentProposal(cp, window) {
  const branch = window.records.find(record => record.sourceType === "branch").sourceRecordId;
  const commits = window.records.filter(record => record.sourceType === "commit");
  const first = commits[0]?.sourceRecordId ?? branch;
  const last = commits.at(-1)?.sourceRecordId ?? branch;
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "VALID",
    preservedClaims: [
      { claimRef: `${cp.checkpointId}#trusted-direction`, claimType: "trusted-direction", summary: "Direction remains valid.", evidenceRefs: [branch] },
      { claimRef: `${cp.checkpointId}#active-objective`, claimType: "active-objective", summary: "Objective remains valid.", evidenceRefs: [first] },
      { claimRef: `${cp.checkpointId}#accepted-next-action`, claimType: "accepted-next-action", summary: "The bounded next action remains valid.", evidenceRefs: [last] },
    ],
    invalidatedClaims: [],
    invalidatedNextActions: [],
    unresolvedProtectedAmbiguity: null,
    explanation: "Fresh evidence preserves the current bounded continuation action.",
  };
}

async function packageScenario() {
  const cp = checkpoint();
  const window = await preWindow(cp);
  const assessment = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validAssessmentProposal(cp, window) });
  const pkg = buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PACKAGE_AT });
  return { cp, window, assessment, pkg };
}

function postconditionProposal(pkg, overrides = {}) {
  return {
    proposalVersion: POSTCONDITION_PROPOSAL_VERSION_V01,
    reentryPackageRef: pkg.packageId,
    actionRef: pkg.nextAction.actionRef,
    conditionType: "github-default-branch-head-advanced",
    expectedValue: null,
    explanation: "The bounded action is successful only if fresh authoritative GitHub evidence proves main advanced from the frozen baseline.",
    ...overrides,
  };
}

async function executionScenario(reportedState = "reported-success") {
  const { pkg } = await packageScenario();
  const envelope = buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: postconditionProposal(pkg), declaredAt: DECLARED_AT });
  const observation = buildActionObservationV01({
    reentryPackage: pkg,
    envelope,
    attemptedAt: ATTEMPTED_AT,
    executionActor: "external:authorized-github-workflow",
    reportedState,
    reportSummary: "External execution completed and returned a bounded status report.",
  });
  return { pkg, envelope, observation };
}

async function postProof() {
  return rangeProof({ baseSha: HEAD, headSha: POST, capturedAt: POST_CAPTURED_AT });
}

const outcomeCode = (fn, code) => assert.throws(fn, error => error instanceof OutcomeVerificationError && error.code === code);

test("6E-A01 head-advanced proposal creates a deterministic verification envelope", async () => {
  const { pkg } = await packageScenario();
  const proposal = postconditionProposal(pkg);
  const first = buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: proposal, declaredAt: DECLARED_AT });
  const second = buildActionVerificationEnvelopeV01({ reentryPackage: clone(pkg), postconditionProposal: clone(proposal), declaredAt: DECLARED_AT });
  assert.equal(first.envelopeId, second.envelopeId);
  assert.equal(first.baseline.value, HEAD);
  assert.equal(first.expectedPostcondition.conditionType, "github-default-branch-head-advanced");
  assert.deepEqual(validateActionVerificationEnvelopeV01(first), first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.baseline), true);
});

test("6E-A02 envelope proposal cannot target another action", async () => {
  const { pkg } = await packageScenario();
  outcomeCode(() => buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: postconditionProposal(pkg, { actionRef: "action:other" }), declaredAt: DECLARED_AT }), "OUTCOME_BINDING_MISMATCH");
});

test("6E-A03 envelope declaration cannot predate the Re-entry Package", async () => {
  const { pkg } = await packageScenario();
  outcomeCode(() => buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: postconditionProposal(pkg), declaredAt: "2026-09-15T12:39:59Z" }), "INVALID_VERIFICATION_ENVELOPE_INPUT");
});

test("6E-B01 external reported-success remains only an Action Observation", async () => {
  const { observation } = await executionScenario("reported-success");
  assert.equal(observation.authority, "external-action-report");
  assert.equal(observation.reportedState, "reported-success");
  assert.deepEqual(validateActionObservationV01(observation), observation);
  assert.equal(Object.isFrozen(observation), true);
});

test("6E-B02 action attempt cannot predate the frozen postcondition boundary", async () => {
  const { pkg } = await packageScenario();
  const envelope = buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: postconditionProposal(pkg), declaredAt: DECLARED_AT });
  outcomeCode(() => buildActionObservationV01({ reentryPackage: pkg, envelope, attemptedAt: "2026-09-15T12:40:59Z", executionActor: "external:test", reportedState: "reported-success", reportSummary: "Too early." }), "INVALID_ACTION_OBSERVATION_INPUT");
});

test("6E-C01 post-action Source Snapshot must be captured after the action attempt", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const stale = await snapshot(POST, ATTEMPTED_AT);
  outcomeCode(() => buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: stale, commitRangeProof: null, verifiedAt: VERIFIED_AT }), "POST_ACTION_EVIDENCE_NOT_FRESH");
});

test("6E-D01 reported-success does not override an unchanged authoritative head", async () => {
  const { pkg, envelope, observation } = await executionScenario("reported-success");
  const fresh = await snapshot(HEAD, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: null, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "failed");
  assert.equal(verification.failureReason, "expected-postcondition-not-observed");
  assert.equal(verification.capabilities.nextCheckpointAllowed, false);
});

test("6E-D02 complete ahead lineage verifies head advancement", async () => {
  const { pkg, envelope, observation } = await executionScenario("reported-success");
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: await postProof(), verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "verified");
  assert.equal(verification.failureReason, null);
  assert.equal(verification.observedPostcondition.lineage, "ahead");
  assert.equal(verification.capabilities.nextCheckpointAllowed, true);
  assert.equal(verification.verificationEvidenceRefs.includes(`github:commit:${REF}:${POST}`), true);
});

test("6E-D03 reported-failure cannot override fresh authoritative proof of success", async () => {
  const { pkg, envelope, observation } = await executionScenario("reported-failure");
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: await postProof(), verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "verified");
});

test("6E-D04 changed head without lineage proof is indeterminate", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: null, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "indeterminate");
  assert.equal(verification.failureReason, "commit-range-proof-missing");
});

test("6E-D05 complete diverged lineage is indeterminate, not verified", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const proof = await rangeProof({ baseSha: HEAD, headSha: POST, capturedAt: POST_CAPTURED_AT, relation: "diverged", aheadBy: 1, behindBy: 1 });
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "indeterminate");
  assert.equal(verification.failureReason, "unsafe-baseline-lineage-diverged");
});

test("6E-D06 incomplete ahead proof is indeterminate", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const commits = Array.from({ length: 20 }, (_, index) => {
    const sha = index === 19 ? POST : (index + 1).toString(16).padStart(40, "0");
    return providerCommit(sha, `2026-09-15T12:${String(20 + Math.min(index, 19)).padStart(2, "0")}:00Z`);
  });
  const proof = await rangeProof({ baseSha: HEAD, headSha: POST, capturedAt: POST_CAPTURED_AT, relation: "ahead", aheadBy: 21, behindBy: 0, commits, continuationAvailable: true });
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: proof, verifiedAt: VERIFIED_AT });
  assert.equal(verification.verificationState, "indeterminate");
  assert.equal(verification.failureReason, "commit-range-proof-incomplete");
});

test("6E-D07 source failure produces indeterminate rather than guessed failure/success", async () => {
  const { pkg, envelope, observation } = await executionScenario("reported-success");
  const verification = buildOutcomeVerificationV01({
    reentryPackage: pkg,
    envelope,
    actionObservation: observation,
    sourceFailure: { provider: "github", repositoryRef: REF, failedAt: POST_CAPTURED_AT, errorCode: "SOURCE_UNAVAILABLE" },
    verifiedAt: VERIFIED_AT,
  });
  assert.equal(verification.verificationState, "indeterminate");
  assert.equal(verification.verificationEvidenceRefs.length, 0);
  assert.equal(verification.capabilities.nextCheckpointAllowed, false);
});

test("6E-E01 verification identity is deterministic and deeply immutable", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const proof = await postProof();
  const first = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: proof, verifiedAt: VERIFIED_AT });
  const second = buildOutcomeVerificationV01({ reentryPackage: clone(pkg), envelope: clone(envelope), actionObservation: clone(observation), sourceSnapshot: clone(fresh), commitRangeProof: clone(proof), verifiedAt: VERIFIED_AT });
  assert.equal(first.verificationId, second.verificationId);
  assert.deepEqual(validateOutcomeVerificationV01(first), first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.observedPostcondition), true);
});

test("6E-E02 tampered verification identity is rejected", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = clone(buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: await postProof(), verifiedAt: VERIFIED_AT }));
  verification.verificationId = "outcome-verification:000000000000000000000000";
  outcomeCode(() => validateOutcomeVerificationV01(verification), "INVALID_OUTCOME_VERIFICATION");
});

test("6E-F01 verified verification emits a verified Outcome Record", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: await postProof(), verifiedAt: VERIFIED_AT });
  const outcome = buildOutcomeRecordV01({ reentryPackage: pkg, envelope, actionObservation: observation, verification, recordedAt: RECORDED_AT });
  assert.equal(outcome.verificationState, "verified");
  assert.equal(outcome.capabilities.persistAllowed, true);
  assert.equal(outcome.capabilities.nextCheckpointAllowed, true);
  assert.deepEqual(validateOutcomeRecordV01(outcome), outcome);
});

test("6E-F02 failed verification still emits an Outcome Record but cannot advance checkpoint", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(HEAD, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, verifiedAt: VERIFIED_AT });
  const outcome = buildOutcomeRecordV01({ reentryPackage: pkg, envelope, actionObservation: observation, verification, recordedAt: RECORDED_AT });
  assert.equal(outcome.verificationState, "failed");
  assert.equal(outcome.capabilities.persistAllowed, true);
  assert.equal(outcome.capabilities.nextCheckpointAllowed, false);
});

test("6E-F03 indeterminate verification still emits an Outcome Record", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceFailure: { provider: "github", repositoryRef: REF, failedAt: POST_CAPTURED_AT, errorCode: "SOURCE_RATE_LIMITED" }, verifiedAt: VERIFIED_AT });
  const outcome = buildOutcomeRecordV01({ reentryPackage: pkg, envelope, actionObservation: observation, verification, recordedAt: RECORDED_AT });
  assert.equal(outcome.verificationState, "indeterminate");
  assert.equal(outcome.capabilities.nextCheckpointAllowed, false);
});

test("6E-F04 Outcome Record cannot predate verification", async () => {
  const { pkg, envelope, observation } = await executionScenario();
  const fresh = await snapshot(POST, POST_CAPTURED_AT);
  const verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: await postProof(), verifiedAt: VERIFIED_AT });
  outcomeCode(() => buildOutcomeRecordV01({ reentryPackage: pkg, envelope, actionObservation: observation, verification, recordedAt: "2026-09-15T12:45:59Z" }), "INVALID_OUTCOME_RECORD_INPUT");
});
