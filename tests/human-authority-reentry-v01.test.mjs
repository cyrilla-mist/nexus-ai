import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
  buildContinuityAssessmentV01,
} from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01,
  HUMAN_AUTHORITY_RESPONSE_VERSION_V01,
  HumanAuthorityGateError,
  buildHumanAuthorityDecisionV01,
  buildHumanAuthorityQuestionV01,
  validateHumanAuthorityDecisionV01,
  validateHumanAuthorityQuestionV01,
} from "../experience/continuity-loop-v01/human-authority-gate.mjs";
import {
  REPLACEMENT_ACTION_PROPOSAL_VERSION_V01,
  ReentryPackageError,
  buildReentryPackageV01,
  validateReentryPackageV01,
} from "../experience/continuity-loop-v01/reentry-package.mjs";
import {
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
  buildFreshEvidenceWindowV01,
} from "../experience/continuity-loop-v01/fresh-evidence-window.mjs";
import { createGitHubCommitRangeReader } from "../experience/continuity-loop-v01/github-commit-range-proof.mjs";
import {
  buildInitialAlignmentProposalV01,
  confirmInitialAlignmentV01,
} from "../experience/continuity-loop-v01/initial-alignment.mjs";
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
const CURSOR_AT = "2026-09-15T12:00:00Z";
const OBSERVED_AT = "2026-09-15T12:30:00Z";
const PREPARED_AT = "2026-09-15T12:40:00Z";
const ANSWERED_AT = "2026-09-15T12:39:00Z";
const clone = value => structuredClone(value);

function alignmentInput(overrides = {}) {
  return {
    projectRef: PROJECT,
    proposedAt: "2026-09-15T12:01:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Build one bounded re-entry package from accepted continuity evidence.",
    acceptedNextAction: {
      actionRef: "action:phase6d-authority-reentry",
      summary: "Resolve the accepted continuity state into one bounded next action.",
      basisRefs: ["decision:phase6-single-real-loop", "docs:phase6d-authority-reentry-contract"],
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
      references: ["docs:Nexus-Atlas-v0.1-Human-Authority-Reentry-Contract"],
    },
    ...overrides,
  };
}

function checkpoint(overrides = {}) {
  const proposal = buildInitialAlignmentProposalV01(alignmentInput(overrides));
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

async function snapshot(headSha = HEAD, capturedAt = OBSERVED_AT) {
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

async function rangeProof() {
  const reader = createGitHubCommitRangeReader({
    client: {
      async compareCommits() {
        return clone({
          relation: "ahead",
          aheadBy: 2,
          behindBy: 0,
          commits: [
            providerCommit(MID, "2026-09-15T12:20:00Z"),
            providerCommit(HEAD, "2026-09-15T12:25:00Z"),
          ],
          continuationAvailable: false,
        });
      },
    },
  });
  return reader.readCommitRange({ repositoryRef: REF, baseSha: BASE, headSha: HEAD, capturedAt: OBSERVED_AT, limit: 20 });
}

function policy() {
  return {
    policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
    projectRef: PROJECT,
    repositoryRef: REF,
    maxCommitRange: 20,
  };
}

async function completeWindow(cp) {
  return buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await snapshot(),
    commitRangeProof: await rangeProof(),
    requiredEvidencePolicy: policy(),
  });
}

function surfaces(cp) {
  return {
    direction: `${cp.checkpointId}#trusted-direction`,
    objective: `${cp.checkpointId}#active-objective`,
    action: `${cp.checkpointId}#accepted-next-action`,
  };
}

function evidence(window) {
  const branch = window.records.find(record => record.sourceType === "branch").sourceRecordId;
  const commits = window.records.filter(record => record.sourceType === "commit").map(record => record.sourceRecordId);
  return { branch, first: commits[0] ?? branch, last: commits.at(-1) ?? branch };
}

function finding(claimRef, claimType, evidenceRefs, summary = `Finding for ${claimType}`) {
  return { claimRef, claimType, summary, evidenceRefs };
}

function actionFinding(cp, evidenceRefs) {
  return {
    actionRef: cp.acceptedNextAction.actionRef,
    summary: "Fresh evidence invalidates the prior next action.",
    evidenceRefs,
  };
}

function assessmentProposal(cp, window, validity) {
  const refs = surfaces(cp);
  const ev = evidence(window);
  if (validity === "VALID") {
    return {
      proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
      checkpointRef: cp.checkpointId,
      evidenceWindowRef: window.windowId,
      validity,
      preservedClaims: [
        finding(refs.direction, "trusted-direction", [ev.branch]),
        finding(refs.objective, "active-objective", [ev.first]),
        finding(refs.action, "accepted-next-action", [ev.last]),
      ],
      invalidatedClaims: [],
      invalidatedNextActions: [],
      unresolvedProtectedAmbiguity: null,
      explanation: "Fresh accepted evidence preserves the bounded continuation point.",
    };
  }
  if (validity === "INVALID") {
    return {
      proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
      checkpointRef: cp.checkpointId,
      evidenceWindowRef: window.windowId,
      validity,
      preservedClaims: [
        finding(refs.direction, "trusted-direction", [ev.branch]),
        finding(refs.objective, "active-objective", [ev.first]),
      ],
      invalidatedClaims: [finding(refs.action, "accepted-next-action", [ev.last], "The accepted next action is stale.")],
      invalidatedNextActions: [actionFinding(cp, [ev.last])],
      unresolvedProtectedAmbiguity: null,
      explanation: "Protected intent remains valid while the previous next action is stale.",
    };
  }
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "AMBIGUOUS",
    preservedClaims: [
      finding(refs.direction, "trusted-direction", [ev.branch]),
      finding(refs.objective, "active-objective", [ev.first]),
    ],
    invalidatedClaims: [finding(refs.action, "accepted-next-action", [ev.last], "The old next action is no longer sufficient.")],
    invalidatedNextActions: [actionFinding(cp, [ev.last])],
    unresolvedProtectedAmbiguity: {
      ambiguityRef: "ambiguity:phase6d-next-action-choice",
      ambiguityKind: "consequential-choice",
      protectedRef: refs.action,
      summary: "Two materially different next actions remain and prior authority does not select between them.",
      evidenceRefs: [ev.last],
    },
    explanation: "The stale action has multiple consequential replacements, so current human authority is required.",
  };
}

async function scenario(validity) {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const assessment = buildContinuityAssessmentV01({
    checkpoint: cp,
    freshEvidenceWindow: window,
    assessmentProposal: assessmentProposal(cp, window, validity),
  });
  return { cp, window, assessment, ev: evidence(window) };
}

function boundedAction(actionRef, summary, evidenceRefs) {
  return {
    actionRef,
    summary,
    basisRefs: ["decision:phase6-single-real-loop"],
    evidenceRefs,
  };
}

function questionProposal(assessment, ev) {
  return {
    proposalVersion: HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01,
    assessmentRef: assessment.assessmentId,
    ambiguityRef: assessment.unresolvedProtectedAmbiguity.ambiguityRef,
    question: "Which bounded continuation should Nexus Atlas use for this re-entry attempt?",
    options: [
      {
        optionRef: "option:acceptance-first",
        label: "Complete acceptance coverage first",
        authorityValue: "Prioritize executable acceptance coverage before broader integration.",
        nextAction: boundedAction("action:phase6d-acceptance-first", "Add and pass Phase 6D acceptance coverage.", [ev.last]),
      },
      {
        optionRef: "option:integration-first",
        label: "Integrate the runtime first",
        authorityValue: "Prioritize bounded runtime integration before expanding acceptance coverage.",
        nextAction: boundedAction("action:phase6d-integration-first", "Integrate the Phase 6D runtime into one bounded continuation path.", [ev.last]),
      },
    ],
    explanation: "One current human choice is required because accepted evidence does not choose between these consequential continuations.",
  };
}

function response(question, assessment, selectedOptionRef = "option:acceptance-first") {
  return {
    responseVersion: HUMAN_AUTHORITY_RESPONSE_VERSION_V01,
    questionRef: question.questionId,
    assessmentRef: assessment.assessmentId,
    selectedOptionRef,
    actorRef: "user:cyrilla",
    answeredAt: ANSWERED_AT,
  };
}

const humanCode = (fn, code) => assert.throws(fn, error => error instanceof HumanAuthorityGateError && error.code === code);
const reentryCode = (fn, code) => assert.throws(fn, error => error instanceof ReentryPackageError && error.code === code);

test("6D-A01 VALID does not permit a Human Authority question", async () => {
  const { cp, window, assessment, ev } = await scenario("VALID");
  humanCode(() => buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: {
    proposalVersion: HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01,
    assessmentRef: assessment.assessmentId,
    ambiguityRef: "ambiguity:none",
    question: "Should this be asked?",
    options: [
      { optionRef: "a", label: "A", authorityValue: "A", nextAction: boundedAction("action:a", "A", [ev.last]) },
      { optionRef: "b", label: "B", authorityValue: "B", nextAction: boundedAction("action:b", "B", [ev.last]) },
    ],
    explanation: "VALID already has authority.",
  } }), "HUMAN_AUTHORITY_NOT_REQUIRED");
});

test("6D-A02 INVALID does not permit a Human Authority question", async () => {
  const { cp, window, assessment, ev } = await scenario("INVALID");
  humanCode(() => buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: {
    proposalVersion: HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01,
    assessmentRef: assessment.assessmentId,
    ambiguityRef: "ambiguity:none",
    question: "Should this be asked?",
    options: [
      { optionRef: "a", label: "A", authorityValue: "A", nextAction: boundedAction("action:a", "A", [ev.last]) },
      { optionRef: "b", label: "B", authorityValue: "B", nextAction: boundedAction("action:b", "B", [ev.last]) },
    ],
    explanation: "INVALID requires bounded replacement, not human authority.",
  } }), "HUMAN_AUTHORITY_NOT_REQUIRED");
});

test("6D-B01 AMBIGUOUS builds one deterministic Human Authority question", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const proposal = questionProposal(assessment, ev);
  const first = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: proposal });
  const second = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: clone(proposal) });
  assert.equal(first.questionId, second.questionId);
  assert.equal(first.options.length, 2);
  assert.equal(first.capabilities.answerRequired, true);
  assert.equal(first.capabilities.reentryPackageAllowed, false);
  assert.deepEqual(validateHumanAuthorityQuestionV01(first), first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.options[0].nextAction), true);
});

test("6D-B02 question options cannot invent governing authority", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const proposal = questionProposal(assessment, ev);
  proposal.options[0].nextAction.basisRefs = ["decision:invented-authority"];
  humanCode(() => buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: proposal }), "INVALID_HUMAN_AUTHORITY_PROPOSAL");
});

test("6D-B03 question options cannot cite evidence outside the accepted assessment/window", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const proposal = questionProposal(assessment, ev);
  proposal.options[0].nextAction.evidenceRefs = ["source-record:not-current"];
  humanCode(() => buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: proposal }), "INVALID_HUMAN_AUTHORITY_PROPOSAL");
});

test("6D-B04 duplicate option next actions are rejected", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const proposal = questionProposal(assessment, ev);
  proposal.options[1].nextAction.actionRef = proposal.options[0].nextAction.actionRef;
  humanCode(() => buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: proposal }), "INVALID_HUMAN_AUTHORITY_PROPOSAL");
});

test("6D-C01 current human response creates a deterministic authority decision", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const question = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: questionProposal(assessment, ev) });
  const input = response(question, assessment);
  const first = buildHumanAuthorityDecisionV01({ checkpoint: cp, assessment, question, response: input });
  const second = buildHumanAuthorityDecisionV01({ checkpoint: cp, assessment, question, response: clone(input) });
  assert.equal(first.decisionId, second.decisionId);
  assert.equal(first.authority, "human");
  assert.equal(first.actorRef, "user:cyrilla");
  assert.equal(first.selectedOptionRef, "option:acceptance-first");
  assert.equal(first.nextAction.actionRef, "action:phase6d-acceptance-first");
  assert.deepEqual(validateHumanAuthorityDecisionV01(first), first);
  assert.equal(Object.isFrozen(first), true);
});

test("6D-C02 response cannot target another question", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const question = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: questionProposal(assessment, ev) });
  const input = response(question, assessment);
  input.questionRef = "human-authority-question:stale";
  humanCode(() => buildHumanAuthorityDecisionV01({ checkpoint: cp, assessment, question, response: input }), "HUMAN_AUTHORITY_RESPONSE_MISMATCH");
});

test("6D-C03 response must select an option on the current question", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const question = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: questionProposal(assessment, ev) });
  humanCode(() => buildHumanAuthorityDecisionV01({ checkpoint: cp, assessment, question, response: response(question, assessment, "option:stale") }), "HUMAN_AUTHORITY_RESPONSE_MISMATCH");
});

test("6D-D01 VALID Re-entry Package preserves the already accepted next action", async () => {
  const { cp, window, assessment } = await scenario("VALID");
  const pkg = buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT });
  assert.equal(pkg.validity, "VALID");
  assert.equal(pkg.nextAction.actionRef, cp.acceptedNextAction.actionRef);
  assert.equal(pkg.humanAuthorityDecisionRef, null);
  assert.equal(pkg.capabilities.externalExecutionRequired, true);
  assert.equal(pkg.capabilities.freshVerificationRequired, true);
  assert.equal(pkg.capabilities.autonomousExecutionAllowed, false);
  assert.equal(pkg.capabilities.checkpointWriteAllowed, false);
  assert.equal(pkg.capabilities.outcomeWriteAllowed, false);
  assert.deepEqual(validateReentryPackageV01(pkg), pkg);
});

test("6D-D02 INVALID requires a bounded replacement action", async () => {
  const { cp, window, assessment } = await scenario("INVALID");
  reentryCode(() => buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT }), "REENTRY_REPLACEMENT_REQUIRED");
});

test("6D-D03 INVALID replacement must differ from the invalidated prior action", async () => {
  const { cp, window, assessment, ev } = await scenario("INVALID");
  const replacementActionProposal = {
    proposalVersion: REPLACEMENT_ACTION_PROPOSAL_VERSION_V01,
    assessmentRef: assessment.assessmentId,
    actionRef: cp.acceptedNextAction.actionRef,
    summary: "Attempt to reuse the stale action.",
    basisRefs: ["decision:phase6-single-real-loop"],
    evidenceRefs: [ev.last],
    explanation: "This must fail because the old action was explicitly invalidated.",
  };
  reentryCode(() => buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, replacementActionProposal, preparedAt: PREPARED_AT }), "INVALID_REPLACEMENT_ACTION_PROPOSAL");
});

test("6D-D04 INVALID accepts one evidence-bound replacement without human authority", async () => {
  const { cp, window, assessment, ev } = await scenario("INVALID");
  const replacementActionProposal = {
    proposalVersion: REPLACEMENT_ACTION_PROPOSAL_VERSION_V01,
    assessmentRef: assessment.assessmentId,
    actionRef: "action:phase6d-new-bounded-replacement",
    summary: "Replace the stale action with a bounded acceptance-first step.",
    basisRefs: ["decision:phase6-single-real-loop"],
    evidenceRefs: [ev.last],
    explanation: "The replacement stays within accepted governing authority and current evidence.",
  };
  const pkg = buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, replacementActionProposal, preparedAt: PREPARED_AT });
  assert.equal(pkg.validity, "INVALID");
  assert.equal(pkg.nextAction.actionRef, replacementActionProposal.actionRef);
  assert.equal(pkg.humanAuthorityDecisionRef, null);
});

test("6D-D05 AMBIGUOUS cannot build a package before current Human Authority", async () => {
  const { cp, window, assessment } = await scenario("AMBIGUOUS");
  reentryCode(() => buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT }), "HUMAN_AUTHORITY_REQUIRED");
});

test("6D-D06 AMBIGUOUS package consumes the current Human Authority Decision", async () => {
  const { cp, window, assessment, ev } = await scenario("AMBIGUOUS");
  const question = buildHumanAuthorityQuestionV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, questionProposal: questionProposal(assessment, ev) });
  const decision = buildHumanAuthorityDecisionV01({ checkpoint: cp, assessment, question, response: response(question, assessment) });
  const pkg = buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, humanAuthorityDecision: decision, preparedAt: PREPARED_AT });
  assert.equal(pkg.validity, "AMBIGUOUS");
  assert.equal(pkg.humanAuthorityDecisionRef, decision.decisionId);
  assert.equal(pkg.nextAction.actionRef, decision.nextAction.actionRef);
  assert.deepEqual(pkg.evidenceRefs, decision.evidenceRefs);
});

test("6D-D07 package identity is deterministic and deeply immutable", async () => {
  const { cp, window, assessment } = await scenario("VALID");
  const first = buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT });
  const second = buildReentryPackageV01({ checkpoint: clone(cp), freshEvidenceWindow: clone(window), assessment: clone(assessment), preparedAt: PREPARED_AT });
  assert.equal(first.packageId, second.packageId);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.nextAction), true);
  assert.equal(Object.isFrozen(first.verificationPlan), true);
});

test("6D-D08 package validator rejects tampered identity", async () => {
  const { cp, window, assessment } = await scenario("VALID");
  const pkg = clone(buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT }));
  pkg.packageId = "reentry-package:000000000000000000000000";
  reentryCode(() => validateReentryPackageV01(pkg), "INVALID_REENTRY_PACKAGE");
});

test("6D-D09 package requires a strict offset timestamp", async () => {
  const { cp, window, assessment } = await scenario("VALID");
  reentryCode(() => buildReentryPackageV01({ checkpoint: cp, freshEvidenceWindow: window, assessment, preparedAt: "2026-09-15 12:40:00" }), "INVALID_REENTRY_PACKAGE_INPUT");
});

test("6D-D10 cross-checkpoint Re-entry binding fails closed", async () => {
  const { window, assessment } = await scenario("VALID");
  const other = checkpoint({ activeObjective: "A different objective creates a different authority boundary." });
  reentryCode(() => buildReentryPackageV01({ checkpoint: other, freshEvidenceWindow: window, assessment, preparedAt: PREPARED_AT }), "REENTRY_BINDING_MISMATCH");
});
