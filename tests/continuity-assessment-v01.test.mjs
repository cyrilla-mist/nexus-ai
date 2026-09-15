import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTINUITY_ASSESSMENT_AUTHORITY_V01,
  CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
  ContinuityAssessmentError,
  buildContinuityAssessmentV01,
  validateContinuityAssessmentV01,
} from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  buildFreshEvidenceWindowV01,
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
} from "../experience/continuity-loop-v01/fresh-evidence-window.mjs";
import {
  FreshEvidenceWindowValidationError,
  validateFreshEvidenceWindowV01,
} from "../experience/continuity-loop-v01/fresh-evidence-window-validator.mjs";
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
const OTHER = "dddddddddddddddddddddddddddddddddddddddd";
const CURSOR_AT = "2026-09-15T12:00:00Z";
const OBSERVED_AT = "2026-09-15T12:30:00Z";
const clone = value => structuredClone(value);

function alignmentInput(overrides = {}) {
  return {
    projectRef: PROJECT,
    proposedAt: "2026-09-15T12:01:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Assess continuity against one complete fresh evidence window.",
    acceptedNextAction: {
      actionRef: "action:phase6c-continuity-assessment",
      summary: "Assess whether the accepted continuation point still holds.",
      basisRefs: ["decision:phase6-single-real-loop", "docs:phase6c-assessment-contract"],
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
      references: ["docs:Nexus-Atlas-Phase6-Real-Continuity-Loop-Definition", "docs:Nexus-Atlas-v0.1-Continuity-Assessment-Contract"],
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
  return {
    sha,
    authoredAt: committedAt,
    committedAt,
    messageHeadline: `Commit ${sha.slice(0, 6)}`,
  };
}

async function rangeProof({
  baseSha = BASE,
  headSha = HEAD,
  capturedAt = OBSERVED_AT,
  relation = "ahead",
  aheadBy = 2,
  behindBy = 0,
  commits = [providerCommit(MID, "2026-09-15T12:20:00Z"), providerCommit(HEAD, "2026-09-15T12:25:00Z")],
  continuationAvailable = false,
  limit = 20,
} = {}) {
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

async function completeWindow(cp = checkpoint()) {
  return buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await snapshot(),
    commitRangeProof: await rangeProof(),
    requiredEvidencePolicy: policy(),
  });
}

async function blockedWindow(cp = checkpoint()) {
  return buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await snapshot(),
    requiredEvidencePolicy: policy(),
  });
}

function surfaceRefs(cp) {
  return {
    direction: `${cp.checkpointId}#trusted-direction`,
    objective: `${cp.checkpointId}#active-objective`,
    action: `${cp.checkpointId}#accepted-next-action`,
  };
}

function evidence(window) {
  const branch = window.records.find(record => record.sourceType === "branch").sourceRecordId;
  const commits = window.records.filter(record => record.sourceType === "commit").map(record => record.sourceRecordId);
  return { branch, commits, first: commits[0] ?? branch, last: commits.at(-1) ?? branch };
}

function finding(claimRef, claimType, evidenceRefs, summary = `Finding for ${claimType}`) {
  return { claimRef, claimType, summary, evidenceRefs };
}

function actionFinding(cp, evidenceRefs, summary = "The accepted next action is stale.") {
  return { actionRef: cp.acceptedNextAction.actionRef, summary, evidenceRefs };
}

function validProposal(cp, window) {
  const refs = surfaceRefs(cp);
  const ev = evidence(window);
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "VALID",
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

function invalidProposal(cp, window) {
  const refs = surfaceRefs(cp);
  const ev = evidence(window);
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "INVALID",
    preservedClaims: [
      finding(refs.direction, "trusted-direction", [ev.branch]),
      finding(refs.objective, "active-objective", [ev.first]),
    ],
    invalidatedClaims: [finding(refs.action, "accepted-next-action", [ev.last], "Fresh evidence invalidates the prior next-action surface.")],
    invalidatedNextActions: [actionFinding(cp, [ev.last])],
    unresolvedProtectedAmbiguity: null,
    explanation: "The broader protected direction still holds, but the accepted next action is stale.",
  };
}

function ambiguousDirectionProposal(cp, window) {
  const refs = surfaceRefs(cp);
  const ev = evidence(window);
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "AMBIGUOUS",
    preservedClaims: [
      finding(refs.objective, "active-objective", [ev.first]),
      finding(refs.action, "accepted-next-action", [ev.last]),
    ],
    invalidatedClaims: [finding(refs.direction, "trusted-direction", [ev.last], "Fresh evidence conflicts with the protected direction.")],
    invalidatedNextActions: [],
    unresolvedProtectedAmbiguity: {
      ambiguityRef: "ambiguity:protected-direction",
      ambiguityKind: "protected-intent-conflict",
      protectedRef: refs.direction,
      summary: "A human authority decision is required before changing the protected direction.",
      evidenceRefs: [ev.last],
    },
    explanation: "Fresh evidence conflicts with one protected direction surface and cannot authorize its replacement.",
  };
}

function ambiguousChoiceProposal(cp, window) {
  const refs = surfaceRefs(cp);
  const ev = evidence(window);
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "AMBIGUOUS",
    preservedClaims: [
      finding(refs.direction, "trusted-direction", [ev.branch]),
      finding(refs.objective, "active-objective", [ev.first]),
    ],
    invalidatedClaims: [finding(refs.action, "accepted-next-action", [ev.last])],
    invalidatedNextActions: [actionFinding(cp, [ev.last])],
    unresolvedProtectedAmbiguity: {
      ambiguityRef: "ambiguity:next-action-choice",
      ambiguityKind: "consequential-choice",
      protectedRef: refs.action,
      summary: "Multiple consequential replacement actions remain and prior authority does not select one.",
      evidenceRefs: [ev.last],
    },
    explanation: "The old next action is stale, but selecting its replacement requires one bounded human choice.",
  };
}

const expectCode = (fn, code) => assert.throws(fn, error => error instanceof ContinuityAssessmentError && error.code === code);

// Upstream / Fresh Evidence Window validator

test("6C-CA-I01 builder-produced complete window is accepted by the validator", async () => {
  const value = await completeWindow();
  assert.deepEqual(validateFreshEvidenceWindowV01(value), value);
});

test("6C-CA-I02 builder-produced blocked window is accepted as an artifact", async () => {
  const value = await blockedWindow();
  const accepted = validateFreshEvidenceWindowV01(value);
  assert.equal(accepted.status, "blocked");
  assert.equal(accepted.blockedReason, "required-evidence-missing");
});

test("6C-CA-I03 tampered windowId is rejected", async () => {
  const value = clone(await completeWindow());
  value.windowId = "fresh-window:000000000000000000000000";
  assert.throws(() => validateFreshEvidenceWindowV01(value), error => error instanceof FreshEvidenceWindowValidationError && error.code === "INVALID_FRESH_EVIDENCE_WINDOW");
});

test("6C-CA-I04 tampered assessment capability/status pairing is rejected", async () => {
  const value = clone(await completeWindow());
  value.capabilities.assessmentAllowed = false;
  assert.throws(() => validateFreshEvidenceWindowV01(value), error => error.code === "INVALID_FRESH_EVIDENCE_WINDOW");
});

test("6C-CA-I05 duplicate source record identity is rejected", async () => {
  const value = clone(await completeWindow());
  value.records.push(clone(value.records.at(-1)));
  assert.throws(() => validateFreshEvidenceWindowV01(value), error => error.code === "INVALID_FRESH_EVIDENCE_WINDOW");
});

test("6C-CA-I06 commit diagnostics mismatch is rejected", async () => {
  const value = clone(await completeWindow());
  value.diagnostics.commitChangeCount += 1;
  assert.throws(() => validateFreshEvidenceWindowV01(value), error => error.code === "INVALID_FRESH_EVIDENCE_WINDOW");
});

test("6C-CA-A01 complete accepted evidence permits assessment", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) });
  assert.equal(value.validity, "VALID");
});

test("6C-CA-A02 malformed Trusted Checkpoint fails closed", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const malformed = clone(cp);
  malformed.version = 0;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: malformed, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) }), "INVALID_TRUSTED_CHECKPOINT");
});

test("6C-CA-A03 malformed Fresh Evidence Window fails closed", async () => {
  const cp = checkpoint();
  const window = clone(await completeWindow(cp));
  window.windowId = "fresh-window:tampered";
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) }), "INVALID_FRESH_EVIDENCE_WINDOW");
});

test("6C-CA-A04 blocked Fresh Evidence Window cannot be assessed", async () => {
  const cp = checkpoint();
  const window = await blockedWindow(cp);
  const proposal = { ...validProposal(cp, await completeWindow(cp)), evidenceWindowRef: window.windowId };
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "ASSESSMENT_EVIDENCE_BLOCKED");
});

test("6C-CA-A06 checkpoint binding mismatch is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const other = checkpoint({ activeObjective: "A distinct objective creates another accepted checkpoint." });
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: other, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) }), "ASSESSMENT_BINDING_MISMATCH");
});

test("6C-CA-A09 proposal checkpoint/window binding mismatch is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  for (const patch of [{ checkpointRef: "checkpoint:other" }, { evidenceWindowRef: "fresh-window:000000000000000000000000" }]) {
    expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: { ...validProposal(cp, window), ...patch } }), "ASSESSMENT_BINDING_MISMATCH");
  }
});

// Proposal shape / evidence linkage

test("6C-CA-B01 exact proposal v0.1 field set is accepted", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  assert.doesNotThrow(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) }));
});

test("6C-CA-B02 missing or extra proposal fields are rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const missing = validProposal(cp, window);
  delete missing.explanation;
  const extra = { ...validProposal(cp, window), evidenceRefs: [evidence(window).branch] };
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: missing }), "INVALID_ASSESSMENT_PROPOSAL");
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: extra }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-B03 unsupported validity is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: { ...validProposal(cp, window), validity: "HEALTHY" } }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-B07 empty and oversized presentation text is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const empty = validProposal(cp, window);
  empty.explanation = "";
  const oversized = validProposal(cp, window);
  oversized.preservedClaims[0].summary = "x".repeat(501);
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: empty }), "INVALID_ASSESSMENT_PROPOSAL");
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: oversized }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-B08 unsupported checkpoint claimRef is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  proposal.preservedClaims[0].claimRef = `${cp.checkpointId}#governing-refs`;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-B09 claimType/ref mismatch is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  proposal.preservedClaims[0].claimType = "active-objective";
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-B10 invalidated action must be the checkpoint's accepted next action", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = invalidProposal(cp, window);
  proposal.invalidatedNextActions[0].actionRef = "action:other";
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-C02 consequential finding cannot have empty evidenceRefs", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  proposal.preservedClaims[0].evidenceRefs = [];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "ASSESSMENT_EVIDENCE_INVALID");
});

test("6C-CA-C03/C04/C05/C06 only current-window sourceRecordIds are accepted as evidence", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  for (const ref of ["github:commit:cyrilla-mist/nexus-ai:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "continuity-assessment:prior", "outcome:prior", "https://github.com/cyrilla-mist/nexus-ai/commit/x"]) {
    const proposal = validProposal(cp, window);
    proposal.preservedClaims[0].evidenceRefs = [ref];
    expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "ASSESSMENT_EVIDENCE_INVALID");
  }
});

test("6C-CA-C07 duplicate evidence refs inside one finding are rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  const ref = evidence(window).branch;
  proposal.preservedClaims[0].evidenceRefs = [ref, ref];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "ASSESSMENT_EVIDENCE_INVALID");
});

test("6C-CA-C08 output evidenceRefs are de-duplicated in deterministic first-use order", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  const ev = evidence(window);
  proposal.preservedClaims[0].evidenceRefs = [ev.branch, ev.last];
  proposal.preservedClaims[1].evidenceRefs = [ev.last, ev.first];
  proposal.preservedClaims[2].evidenceRefs = [ev.branch];
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
  assert.deepEqual(value.evidenceRefs, [ev.branch, ev.last, ev.first]);
});

// Tri-state semantics

test("6C-CA-D01 VALID preserves all three continuation surfaces", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) });
  assert.equal(value.validity, "VALID");
  assert.equal(value.preservedClaims.length, 3);
  assert.deepEqual(value.invalidatedClaims, []);
  assert.equal(value.unresolvedProtectedAmbiguity, null);
});

test("6C-CA-D02/D03/D04 VALID rejects a missing preserved surface", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  for (const index of [0, 1, 2]) {
    const proposal = validProposal(cp, window);
    proposal.preservedClaims.splice(index, 1);
    expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
  }
});

test("6C-CA-D05/D06/D07 VALID rejects invalidations or ambiguity", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const ev = evidence(window);
  const refs = surfaceRefs(cp);
  const withClaim = validProposal(cp, window);
  withClaim.invalidatedClaims = [finding(refs.action, "accepted-next-action", [ev.last])];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: withClaim }), "INVALID_ASSESSMENT_STATE");
  const withAction = validProposal(cp, window);
  withAction.invalidatedNextActions = [actionFinding(cp, [ev.last])];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: withAction }), "INVALID_ASSESSMENT_STATE");
  const withAmbiguity = validProposal(cp, window);
  withAmbiguity.unresolvedProtectedAmbiguity = ambiguousDirectionProposal(cp, window).unresolvedProtectedAmbiguity;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: withAmbiguity }), "INVALID_ASSESSMENT_STATE");
});

test("6C-CA-D08 same surface cannot be preserved and invalidated", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  proposal.invalidatedClaims = [clone(proposal.preservedClaims[0])];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
});

test("6C-CA-E01 stale accepted next action produces INVALID without changing protected direction", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: invalidProposal(cp, window) });
  assert.equal(value.validity, "INVALID");
  assert.equal(value.invalidatedNextActions[0].actionRef, cp.acceptedNextAction.actionRef);
  assert.deepEqual(value.preservedClaims.map(item => item.claimType), ["trusted-direction", "active-objective"]);
});

test("6C-CA-E02/E04 INVALID requires current action invalidated and not preserved", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const noAction = invalidProposal(cp, window);
  noAction.invalidatedNextActions = [];
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: noAction }), "INVALID_ASSESSMENT_STATE");
  const preservedAction = invalidProposal(cp, window);
  preservedAction.preservedClaims.push(finding(surfaceRefs(cp).action, "accepted-next-action", [evidence(window).last]));
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: preservedAction }), "INVALID_ASSESSMENT_STATE");
});

test("6C-CA-E05/E06 protected direction/objective invalidation cannot be labeled INVALID", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  for (const type of ["trusted-direction", "active-objective"]) {
    const proposal = invalidProposal(cp, window);
    const refs = surfaceRefs(cp);
    proposal.preservedClaims = proposal.preservedClaims.filter(item => item.claimType !== type);
    proposal.invalidatedClaims.push(finding(type === "trusted-direction" ? refs.direction : refs.objective, type, [evidence(window).last]));
    expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
  }
});

test("6C-CA-F01 protected direction conflict produces AMBIGUOUS", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: ambiguousDirectionProposal(cp, window) });
  assert.equal(value.validity, "AMBIGUOUS");
  assert.equal(value.unresolvedProtectedAmbiguity.ambiguityKind, "protected-intent-conflict");
});

test("6C-CA-F03 consequential next-action choice produces AMBIGUOUS", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: ambiguousChoiceProposal(cp, window) });
  assert.equal(value.validity, "AMBIGUOUS");
  assert.equal(value.unresolvedProtectedAmbiguity.protectedRef, surfaceRefs(cp).action);
});

test("6C-CA-F04 AMBIGUOUS without an ambiguity object fails closed", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = ambiguousDirectionProposal(cp, window);
  proposal.unresolvedProtectedAmbiguity = null;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
});

test("6C-CA-F05 unknown protectedRef is rejected", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = ambiguousDirectionProposal(cp, window);
  proposal.unresolvedProtectedAmbiguity.protectedRef = `${cp.checkpointId}#other`;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_PROPOSAL");
});

test("6C-CA-F07 protected conflict ambiguity must point to the same invalidated protected surface", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = ambiguousDirectionProposal(cp, window);
  proposal.unresolvedProtectedAmbiguity.protectedRef = surfaceRefs(cp).objective;
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
});

test("6C-CA-F09 protected conflict cannot simultaneously preserve its protected surface", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = ambiguousDirectionProposal(cp, window);
  proposal.preservedClaims.push(finding(surfaceRefs(cp).direction, "trusted-direction", [evidence(window).branch]));
  expectCode(() => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal }), "INVALID_ASSESSMENT_STATE");
});

// Output / determinism / immutability

test("6C-CA-G01/G02/G03/G04 authority and capabilities follow validity only", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const cases = [
    [validProposal(cp, window), false, true],
    [invalidProposal(cp, window), false, true],
    [ambiguousDirectionProposal(cp, window), true, false],
  ];
  for (const [proposal, human, reentry] of cases) {
    const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
    assert.equal(value.authority, CONTINUITY_ASSESSMENT_AUTHORITY_V01);
    assert.deepEqual(value.capabilities, { humanAuthorityRequired: human, reentryPackageAllowed: reentry });
  }
});

test("6C-CA-G05 assessment does not promote source findings to canonical/human authority", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) });
  assert.equal(value.authority, "derived-continuity-assessment");
  assert.equal("canonical" in value, false);
  assert.equal("execution" in value, false);
});

test("6C-CA-H01 identical accepted inputs produce identical assessments", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  const first = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
  const second = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
  assert.deepEqual(first, second);
  assert.equal(first.assessmentId, second.assessmentId);
});

test("6C-CA-H02 finding order is preserved", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  proposal.preservedClaims.reverse();
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
  assert.deepEqual(value.preservedClaims.map(item => item.claimType), proposal.preservedClaims.map(item => item.claimType));
});

test("6C-CA-H03 output is deeply immutable", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) });
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.preservedClaims[0].evidenceRefs), true);
  assert.throws(() => { value.validity = "INVALID"; }, TypeError);
  assert.throws(() => { value.preservedClaims[0].summary = "changed"; }, TypeError);
});

test("6C-CA-H04 builder does not mutate caller inputs", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const proposal = validProposal(cp, window);
  const before = [clone(cp), clone(window), clone(proposal)];
  buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: proposal });
  assert.deepEqual([cp, window, proposal], before);
});

test("6C-CA-H05 assessment validator rejects identity tampering", async () => {
  const cp = checkpoint();
  const window = await completeWindow(cp);
  const value = clone(buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: validProposal(cp, window) }));
  value.assessmentId = "continuity-assessment:000000000000000000000000";
  expectCode(() => validateContinuityAssessmentV01(value), "INVALID_CONTINUITY_ASSESSMENT");
});
