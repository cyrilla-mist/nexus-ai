import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import { createGitHubCommitRangeReader } from "../experience/continuity-loop-v01/github-commit-range-proof.mjs";
import {
  POSTCONDITION_PROPOSAL_VERSION_V01,
  OutcomeVerificationError,
  buildActionObservationV01,
  buildActionVerificationEnvelopeV01,
  buildOutcomeVerificationV01,
} from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { validateReentryPackageV01 } from "../experience/continuity-loop-v01/reentry-package.mjs";
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";
import { createBranchResponse, createGitHubClientFixture, REF } from "./helpers/github-source-fixtures.mjs";

const BASELINE = "cccccccccccccccccccccccccccccccccccccccc";
const EXPECTED = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const OTHER = "ffffffffffffffffffffffffffffffffffffffff";
const HEAD = "dddddddddddddddddddddddddddddddddddddddd";
const PACKAGE_AT = "2026-09-15T12:40:00Z";
const DECLARED_AT = "2026-09-15T12:41:00Z";
const ATTEMPTED_AT = "2026-09-15T12:42:00Z";
const CAPTURED_AT = "2026-09-15T12:45:00Z";
const VERIFIED_AT = "2026-09-15T12:46:00Z";
const clone = value => structuredClone(value);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function packageWithEvidence(expectedSha = EXPECTED) {
  const evidenceRef = `github:commit:${REF}:${expectedSha}`;
  const payload = {
    packageVersion: "nexus-atlas.reentry-package.v0.1",
    projectRef: "project:nexus-atlas",
    checkpointRef: "checkpoint:test-phase6e",
    assessmentRef: "continuity-assessment:test-phase6e",
    evidenceWindowRef: "fresh-window:test-phase6e",
    preparedAt: PACKAGE_AT,
    validity: "VALID",
    nextAction: {
      actionRef: "action:merge-known-commit",
      summary: "Complete one bounded repository action whose expected commit is known before verification.",
      basisRefs: ["decision:phase6-single-real-loop"],
      evidenceRefs: [evidenceRef],
    },
    humanAuthorityDecisionRef: null,
    verificationPlan: {
      provider: "github",
      scopeRef: REF,
      cursorType: "default-branch-head",
      baselineValue: BASELINE,
      requirement: "fresh-authoritative-reread",
    },
    evidenceRefs: [evidenceRef],
    authority: "derived-reentry-package",
    capabilities: {
      externalExecutionRequired: true,
      freshVerificationRequired: true,
      autonomousExecutionAllowed: false,
      checkpointWriteAllowed: false,
      outcomeWriteAllowed: false,
    },
  };
  return validateReentryPackageV01({ ...payload, packageId: `reentry-package:${digest(payload).slice(0, 24)}` });
}

function proposal(pkg, expectedValue = EXPECTED) {
  return {
    proposalVersion: POSTCONDITION_PROPOSAL_VERSION_V01,
    reentryPackageRef: pkg.packageId,
    actionRef: pkg.nextAction.actionRef,
    conditionType: "github-commit-present-after-baseline",
    expectedValue,
    explanation: "The expected commit identity is frozen before the external action is treated as complete.",
  };
}

function envelopeAndObservation(pkg) {
  const envelope = buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: proposal(pkg), declaredAt: DECLARED_AT });
  const observation = buildActionObservationV01({
    reentryPackage: pkg,
    envelope,
    attemptedAt: ATTEMPTED_AT,
    executionActor: "external:authorized-github-workflow",
    reportedState: "reported-success",
    reportSummary: "The external executor reports completion; Nexus will verify independently.",
  });
  return { envelope, observation };
}

async function snapshot() {
  const client = createGitHubClientFixture({ branch: createBranchResponse({ headSha: HEAD }) });
  const adapter = createGitHubSourceAdapter({ client });
  return adapter.readSnapshot({
    repositoryRef: REF,
    capturedAt: CAPTURED_AT,
    requestedLimits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 },
  });
}

function providerCommit(sha, committedAt) {
  return { sha, authoredAt: committedAt, committedAt, messageHeadline: `Commit ${sha.slice(0, 6)}` };
}

async function proof(commits) {
  const reader = createGitHubCommitRangeReader({
    client: {
      async compareCommits() {
        return clone({ relation: "ahead", aheadBy: commits.length, behindBy: 0, commits, continuationAvailable: false });
      },
    },
  });
  return reader.readCommitRange({ repositoryRef: REF, baseSha: BASELINE, headSha: HEAD, capturedAt: CAPTURED_AT, limit: 20 });
}

const outcomeCode = (fn, code) => assert.throws(fn, error => error instanceof OutcomeVerificationError && error.code === code);

test("6E-A04 commit-present postcondition must be grounded in package evidence", () => {
  const pkg = packageWithEvidence(EXPECTED);
  outcomeCode(() => buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: proposal(pkg, OTHER), declaredAt: DECLARED_AT }), "INVALID_POSTCONDITION_PROPOSAL");
});

test("6E-D04 expected commit present in complete ahead proof verifies", async () => {
  const pkg = packageWithEvidence();
  const { envelope, observation } = envelopeAndObservation(pkg);
  const verification = buildOutcomeVerificationV01({
    reentryPackage: pkg,
    envelope,
    actionObservation: observation,
    sourceSnapshot: await snapshot(),
    commitRangeProof: await proof([
      providerCommit(EXPECTED, "2026-09-15T12:43:00Z"),
      providerCommit(HEAD, "2026-09-15T12:44:00Z"),
    ]),
    verifiedAt: VERIFIED_AT,
  });
  assert.equal(verification.verificationState, "verified");
  assert.equal(verification.observedPostcondition.expectedValueObserved, true);
  assert.equal(verification.failureReason, null);
});

test("6E-D05 expected commit absent from complete ahead proof fails despite reported success", async () => {
  const pkg = packageWithEvidence();
  const { envelope, observation } = envelopeAndObservation(pkg);
  const verification = buildOutcomeVerificationV01({
    reentryPackage: pkg,
    envelope,
    actionObservation: observation,
    sourceSnapshot: await snapshot(),
    commitRangeProof: await proof([
      providerCommit(OTHER, "2026-09-15T12:43:00Z"),
      providerCommit(HEAD, "2026-09-15T12:44:00Z"),
    ]),
    verifiedAt: VERIFIED_AT,
  });
  assert.equal(verification.verificationState, "failed");
  assert.equal(verification.observedPostcondition.expectedValueObserved, false);
  assert.equal(verification.failureReason, "expected-commit-not-observed");
});
