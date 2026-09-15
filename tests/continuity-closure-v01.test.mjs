import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
  buildContinuityAssessmentV01,
} from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  CONTINUITY_CLOSURE_VERSION_V01,
  NEXT_CHECKPOINT_PROPOSAL_VERSION_V01,
  ContinuityClosureError,
  buildContinuityClosureReceiptV01,
  buildNextTrustedCheckpointV01,
  closeVerifiedContinuityV01,
  validateContinuityClosureReceiptV01,
} from "../experience/continuity-loop-v01/continuity-closure.mjs";
import { createFileOutcomeRecordStoreV01 } from "../experience/continuity-loop-v01/file-outcome-record-store.mjs";
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
  buildActionObservationV01,
  buildActionVerificationEnvelopeV01,
  buildOutcomeRecordV01,
  buildOutcomeVerificationV01,
  validateOutcomeRecordV01,
} from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import {
  OutcomeRecordStoreError,
  createInMemoryOutcomeRecordStoreV01,
} from "../experience/continuity-loop-v01/outcome-record-store.mjs";
import { buildReentryPackageV01 } from "../experience/continuity-loop-v01/reentry-package.mjs";
import {
  TrustedCheckpointStoreError,
  createInMemoryTrustedCheckpointStoreV01,
} from "../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";
import { validateTrustedCheckpointV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
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
const NEXT_AT = "2026-09-15T12:48:00Z";
const clone = value => structuredClone(value);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function alignmentInput() {
  return {
    projectRef: PROJECT,
    proposedAt: "2026-09-15T12:01:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Close the bounded real continuity transaction from fresh GitHub evidence.",
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
      references: ["docs:Nexus-Atlas-v0.1-Continuity-Closure-Contract"],
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
  return { cp, pkg };
}

function postconditionProposal(pkg) {
  return {
    proposalVersion: POSTCONDITION_PROPOSAL_VERSION_V01,
    reentryPackageRef: pkg.packageId,
    actionRef: pkg.nextAction.actionRef,
    conditionType: "github-default-branch-head-advanced",
    expectedValue: null,
    explanation: "Success requires fresh authoritative GitHub evidence that the default branch advanced from the frozen baseline.",
  };
}

async function executionScenario() {
  const { cp, pkg } = await packageScenario();
  const envelope = buildActionVerificationEnvelopeV01({ reentryPackage: pkg, postconditionProposal: postconditionProposal(pkg), declaredAt: DECLARED_AT });
  const observation = buildActionObservationV01({
    reentryPackage: pkg,
    envelope,
    attemptedAt: ATTEMPTED_AT,
    executionActor: "external:authorized-github-workflow",
    reportedState: "reported-success",
    reportSummary: "External execution completed and returned a bounded status report.",
  });
  return { cp, pkg, envelope, observation };
}

async function outcomeScenario(mode = "verified", recordedAt = RECORDED_AT) {
  const { cp, pkg, envelope, observation } = await executionScenario();
  let verification;
  if (mode === "verified") {
    const fresh = await snapshot(POST, POST_CAPTURED_AT);
    const proof = await rangeProof({ baseSha: HEAD, headSha: POST, capturedAt: POST_CAPTURED_AT });
    verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: proof, verifiedAt: VERIFIED_AT });
  } else if (mode === "failed") {
    const fresh = await snapshot(HEAD, POST_CAPTURED_AT);
    verification = buildOutcomeVerificationV01({ reentryPackage: pkg, envelope, actionObservation: observation, sourceSnapshot: fresh, commitRangeProof: null, verifiedAt: VERIFIED_AT });
  } else {
    verification = buildOutcomeVerificationV01({
      reentryPackage: pkg,
      envelope,
      actionObservation: observation,
      sourceFailure: { provider: "github", repositoryRef: REF, failedAt: POST_CAPTURED_AT, errorCode: "SOURCE_RATE_LIMITED" },
      verifiedAt: VERIFIED_AT,
    });
  }
  const outcome = buildOutcomeRecordV01({ reentryPackage: pkg, envelope, actionObservation: observation, verification, recordedAt });
  return { cp, pkg, outcome };
}

function nextProposal(outcome, pkg, overrides = {}) {
  const evidenceRef = outcome.verificationEvidenceRefs.find(ref => ref.startsWith("github:commit:")) ?? outcome.verificationEvidenceRefs[0];
  return {
    proposalVersion: NEXT_CHECKPOINT_PROPOSAL_VERSION_V01,
    outcomeRef: outcome.outcomeId,
    proposedAt: NEXT_AT,
    nextAction: {
      actionRef: "action:phase6g-adversarial-real-run",
      summary: "Run the bounded adversarial evaluation and first real Nexus continuity evidence pass.",
      basisRefs: ["decision:phase6-single-real-loop"],
      evidenceRefs: [evidenceRef],
    },
    explanation: "The verified closure preserves project intent and advances only to the next bounded Phase 6 evaluation step.",
    ...overrides,
  };
}

function rehashOutcome(outcome, mutate) {
  const copy = clone(outcome);
  mutate(copy);
  const { outcomeId: _outcomeId, ...payload } = copy;
  copy.outcomeId = `outcome:${digest(payload).slice(0, 24)}`;
  return validateOutcomeRecordV01(copy);
}

function closureError(fn, code) {
  assert.throws(fn, error => error instanceof ContinuityClosureError && error.code === code);
}

async function seededCheckpointStore(cp) {
  const store = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.writeCheckpoint({ checkpoint: cp, expectedVersion: 0, idempotencyKey: "seed:checkpoint:v1" });
  return store;
}

async function closureStores(cp) {
  return {
    outcomeStore: createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] }),
    checkpointStore: await seededCheckpointStore(cp),
  };
}

test("6F-A01 verified matching Outcome Record may derive a next checkpoint", async () => {
  const { cp, pkg, outcome } = await outcomeScenario("verified");
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: nextProposal(outcome, pkg) });
  assert.equal(next.version, cp.version + 1);
  assert.equal(next.confirmation.authority, "verified-outcome");
});

test("6F-A02 failed Outcome Record cannot advance trusted state", async () => {
  const { cp, pkg, outcome } = await outcomeScenario("failed");
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: nextProposal(outcome, pkg) }), "OUTCOME_NOT_ADVANCABLE");
});

test("6F-A03 indeterminate Outcome Record cannot advance trusted state", async () => {
  const { cp, pkg, outcome } = await outcomeScenario("indeterminate");
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: nextProposal(outcome, pkg) }), "OUTCOME_NOT_ADVANCABLE");
});

test("6F-A04 validly shaped outcome targeting another action fails binding", async () => {
  const { cp, pkg, outcome } = await outcomeScenario("verified");
  const other = rehashOutcome(outcome, copy => { copy.actionRef = "action:other"; });
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome: other, nextCheckpointProposal: nextProposal(other, pkg) }), "CONTINUITY_CLOSURE_BINDING_MISMATCH");
});

test("6F-A06 verified Outcome Record without safe ahead lineage fails closed", async () => {
  const { cp, pkg, outcome } = await outcomeScenario("verified");
  const unsafe = rehashOutcome(outcome, copy => { copy.observedPostcondition.lineage = "diverged"; });
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome: unsafe, nextCheckpointProposal: nextProposal(unsafe, pkg) }), "OUTCOME_NOT_ADVANCABLE");
});

test("6F-B01 bounded next action using accepted basis and verified evidence is accepted", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal });
  assert.equal(next.acceptedNextAction.actionRef, proposal.nextAction.actionRef);
  assert.deepEqual(next.acceptedNextAction.basisRefs, proposal.nextAction.basisRefs);
});

test("6F-B02 proposal cannot repeat the completed Re-entry action", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  proposal.nextAction.actionRef = pkg.nextAction.actionRef;
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});

test("6F-B03 proposal cannot invent governing authority", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  proposal.nextAction.basisRefs = ["decision:invented"];
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});

test("6F-B04 proposal cannot cite non-verification evidence", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  proposal.nextAction.evidenceRefs = [outcome.outcomeId];
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});

test("6F-B05 proposal must target the current Outcome Record", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg, { outcomeRef: "outcome:other" });
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "CONTINUITY_CLOSURE_BINDING_MISMATCH");
});

test("6F-B06 proposal cannot predate the Outcome Record", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg, { proposedAt: "2026-09-15T12:46:59Z" });
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});

test("6F-B07 protected fields cannot be smuggled into the proposal", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = { ...nextProposal(outcome, pkg), trustedDirection: "replace intent" };
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});

test("6F-C01-C08 next checkpoint preserves protected state and advances verified cursor", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal });
  assert.deepEqual(validateTrustedCheckpointV01(next), next);
  assert.equal(next.version, cp.version + 1);
  assert.equal(next.trustedDirection, cp.trustedDirection);
  assert.equal(next.activeObjective, cp.activeObjective);
  assert.deepEqual(next.governingRefs, cp.governingRefs);
  assert.deepEqual(next.unresolvedProtectedAmbiguities, cp.unresolvedProtectedAmbiguities);
  assert.deepEqual(next.acceptedNextAction, {
    actionRef: proposal.nextAction.actionRef,
    summary: proposal.nextAction.summary,
    basisRefs: proposal.nextAction.basisRefs,
  });
  assert.deepEqual(next.evidenceCursor, {
    provider: "github",
    scopeRef: pkg.verificationPlan.scopeRef,
    cursorType: "default-branch-head",
    value: POST,
    capturedAt: outcome.recordedAt,
  });
  assert.equal(next.confirmation.authority, "verified-outcome");
  assert.equal(next.confirmation.basisRef, outcome.outcomeId);
  assert.deepEqual(next.provenance.references, [outcome.outcomeId, pkg.packageId, ...proposal.nextAction.evidenceRefs]);
});

test("6F-C09 identical inputs produce identical deeply immutable checkpoints", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  const first = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal });
  const second = buildNextTrustedCheckpointV01({ previousCheckpoint: clone(cp), reentryPackage: clone(pkg), outcome: clone(outcome), nextCheckpointProposal: clone(proposal) });
  assert.equal(first.checkpointId, second.checkpointId);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.acceptedNextAction), true);
});

test("6F-D01-D02 Outcome store appends once and safely replays", async () => {
  const { outcome } = await outcomeScenario();
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  const first = await store.appendOutcome({ outcome, idempotencyKey: "outcome:key:1" });
  const replay = await store.appendOutcome({ outcome: clone(outcome), idempotencyKey: "outcome:key:1" });
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.outcome, outcome);
  const state = await store.exportState();
  assert.equal(state.projects[0].outcomes.length, 1);
});

test("6F-D03 reusing an Outcome idempotency key for different content conflicts", async () => {
  const firstScenario = await outcomeScenario("verified", RECORDED_AT);
  const secondScenario = await outcomeScenario("verified", "2026-09-15T12:47:30Z");
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.appendOutcome({ outcome: firstScenario.outcome, idempotencyKey: "outcome:key:1" });
  await assert.rejects(
    store.appendOutcome({ outcome: secondScenario.outcome, idempotencyKey: "outcome:key:1" }),
    error => error instanceof OutcomeRecordStoreError && error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("6F-D04 duplicate outcome ID under a new receipt is rejected", async () => {
  const { outcome } = await outcomeScenario();
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.appendOutcome({ outcome, idempotencyKey: "outcome:key:1" });
  await assert.rejects(
    store.appendOutcome({ outcome, idempotencyKey: "outcome:key:2" }),
    error => error instanceof OutcomeRecordStoreError && error.code === "DUPLICATE_OUTCOME_ID",
  );
});

test("6F-D05 out-of-allowlist Outcome project is rejected", async () => {
  const { outcome } = await outcomeScenario();
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: ["project:other"] });
  await assert.rejects(
    store.appendOutcome({ outcome, idempotencyKey: "outcome:key:1" }),
    error => error instanceof OutcomeRecordStoreError && error.code === "PROJECT_SCOPE_NOT_ALLOWED",
  );
});

test("6F-D07 readOutcome returns immutable exact artifact or null", async () => {
  const { outcome } = await outcomeScenario();
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  assert.equal(await store.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId }), null);
  await store.appendOutcome({ outcome, idempotencyKey: "outcome:key:1" });
  const read = await store.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId });
  assert.deepEqual(read, outcome);
  assert.equal(Object.isFrozen(read), true);
});

test("6F-D08 append order is preserved", async () => {
  const first = await outcomeScenario("verified", RECORDED_AT);
  const second = await outcomeScenario("verified", "2026-09-15T12:47:30Z");
  const store = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  await store.appendOutcome({ outcome: first.outcome, idempotencyKey: "outcome:key:1" });
  await store.appendOutcome({ outcome: second.outcome, idempotencyKey: "outcome:key:2" });
  const state = await store.exportState();
  assert.deepEqual(state.projects[0].outcomes.map(item => item.outcomeId), [first.outcome.outcomeId, second.outcome.outcomeId]);
});

test("6F-E01-E03 file Outcome store initializes empty, persists atomically and replays without duplication", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase6f-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "outcomes.json");
  const { outcome } = await outcomeScenario();
  const store = createFileOutcomeRecordStoreV01({ filePath, allowedProjectRefs: [PROJECT] });
  assert.deepEqual((await store.exportState()).projects, []);
  const first = await store.appendOutcome({ outcome, idempotencyKey: "outcome:file:1" });
  const replay = await store.appendOutcome({ outcome, idempotencyKey: "outcome:file:1" });
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  const state = await store.exportState();
  assert.equal(state.projects[0].outcomes.length, 1);
  assert.deepEqual(await store.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId }), outcome);
});

test("6F-E04 malformed file state fails closed", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase6f-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "outcomes.json");
  await fs.writeFile(filePath, "{not-json", "utf8");
  const store = createFileOutcomeRecordStoreV01({ filePath, allowedProjectRefs: [PROJECT] });
  await assert.rejects(store.exportState(), error => error instanceof OutcomeRecordStoreError && error.code === "INVALID_OUTCOME_STORE_STATE");
});

test("6F-E05 lock contention times out explicitly", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase6f-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "outcomes.json");
  await fs.writeFile(`${filePath}.lock`, "held", "utf8");
  const { outcome } = await outcomeScenario();
  const store = createFileOutcomeRecordStoreV01({ filePath, allowedProjectRefs: [PROJECT], maxLockAttempts: 1, lockRetryMs: 0 });
  await assert.rejects(
    store.appendOutcome({ outcome, idempotencyKey: "outcome:file:1" }),
    error => error instanceof OutcomeRecordStoreError && error.code === "FILE_OUTCOME_STORE_LOCK_TIMEOUT",
  );
});

test("6F-E06 write/read corruption fails closed", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase6f-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "outcomes.json");
  const corruptingFs = {
    ...fs,
    async rename(from, to) {
      await fs.rename(from, to);
      await fs.writeFile(to, "{corrupted", "utf8");
    },
  };
  const { outcome } = await outcomeScenario();
  const store = createFileOutcomeRecordStoreV01({ filePath, allowedProjectRefs: [PROJECT], fsImpl: corruptingFs });
  await assert.rejects(
    store.appendOutcome({ outcome, idempotencyKey: "outcome:file:1" }),
    error => error instanceof OutcomeRecordStoreError && ["INVALID_OUTCOME_STORE_STATE", "WRITE_VERIFICATION_FAILED"].includes(error.code),
  );
});

test("6F-E07 relative file path is rejected", () => {
  assert.throws(
    () => createFileOutcomeRecordStoreV01({ filePath: "relative/outcomes.json", allowedProjectRefs: [PROJECT] }),
    error => error instanceof OutcomeRecordStoreError && error.code === "INVALID_FILE_OUTCOME_STORE_OPTIONS",
  );
});

test("6F-F01 healthy stores close the verified continuity transaction", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const stores = await closureStores(cp);
  const result = await closeVerifiedContinuityV01({
    previousCheckpoint: cp,
    reentryPackage: pkg,
    outcome,
    nextCheckpointProposal: nextProposal(outcome, pkg),
    ...stores,
    outcomeIdempotencyKey: "closure:outcome:1",
    checkpointIdempotencyKey: "closure:checkpoint:2",
  });
  assert.equal(result.outcomeReplayed, false);
  assert.equal(result.checkpointReplayed, false);
  assert.equal(result.receipt.closureVersion, CONTINUITY_CLOSURE_VERSION_V01);
  assert.equal(result.receipt.capabilities.nextReentryAllowed, true);
  assert.deepEqual(await stores.outcomeStore.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId }), outcome);
  assert.deepEqual(await stores.checkpointStore.readLatest({ projectRef: PROJECT }), result.nextCheckpoint);
});

test("6F-F02 stale checkpoint version leaves Outcome history but emits no receipt", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const proposal = nextProposal(outcome, pkg);
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal });
  const stores = await closureStores(cp);
  await stores.checkpointStore.writeCheckpoint({ checkpoint: next, expectedVersion: cp.version, idempotencyKey: "preempt:checkpoint:2" });
  await assert.rejects(
    closeVerifiedContinuityV01({
      previousCheckpoint: cp,
      reentryPackage: pkg,
      outcome,
      nextCheckpointProposal: proposal,
      ...stores,
      outcomeIdempotencyKey: "closure:outcome:1",
      checkpointIdempotencyKey: "closure:checkpoint:2",
    }),
    error => error instanceof TrustedCheckpointStoreError && error.code === "CHECKPOINT_VERSION_CONFLICT",
  );
  assert.deepEqual(await stores.outcomeStore.readOutcome({ projectRef: PROJECT, outcomeId: outcome.outcomeId }), outcome);
});

test("6F-F03 Outcome read-back mismatch stops before checkpoint write", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const baseOutcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  const outcomeStore = {
    appendOutcome: input => baseOutcomeStore.appendOutcome(input),
    readOutcome: async () => null,
  };
  const checkpointStore = await seededCheckpointStore(cp);
  await assert.rejects(
    closeVerifiedContinuityV01({
      previousCheckpoint: cp,
      reentryPackage: pkg,
      outcome,
      nextCheckpointProposal: nextProposal(outcome, pkg),
      outcomeStore,
      checkpointStore,
      outcomeIdempotencyKey: "closure:outcome:1",
      checkpointIdempotencyKey: "closure:checkpoint:2",
    }),
    error => error instanceof ContinuityClosureError && error.code === "OUTCOME_READBACK_MISMATCH",
  );
  assert.deepEqual(await checkpointStore.readLatest({ projectRef: PROJECT }), cp);
});

test("6F-F04 checkpoint read-back mismatch emits no success receipt", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const realCheckpointStore = await seededCheckpointStore(cp);
  const checkpointStore = {
    writeCheckpoint: input => realCheckpointStore.writeCheckpoint(input),
    readLatest: async () => cp,
  };
  const outcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [PROJECT] });
  await assert.rejects(
    closeVerifiedContinuityV01({
      previousCheckpoint: cp,
      reentryPackage: pkg,
      outcome,
      nextCheckpointProposal: nextProposal(outcome, pkg),
      outcomeStore,
      checkpointStore,
      outcomeIdempotencyKey: "closure:outcome:1",
      checkpointIdempotencyKey: "closure:checkpoint:2",
    }),
    error => error instanceof ContinuityClosureError && error.code === "CHECKPOINT_READBACK_MISMATCH",
  );
});

test("6F-F05 same idempotency keys safely replay identical closure artifacts", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const stores = await closureStores(cp);
  const input = {
    previousCheckpoint: cp,
    reentryPackage: pkg,
    outcome,
    nextCheckpointProposal: nextProposal(outcome, pkg),
    ...stores,
    outcomeIdempotencyKey: "closure:outcome:1",
    checkpointIdempotencyKey: "closure:checkpoint:2",
  };
  const first = await closeVerifiedContinuityV01(input);
  const replay = await closeVerifiedContinuityV01(input);
  assert.equal(first.outcomeReplayed, false);
  assert.equal(first.checkpointReplayed, false);
  assert.equal(replay.outcomeReplayed, true);
  assert.equal(replay.checkpointReplayed, true);
  assert.deepEqual(replay.outcome, first.outcome);
  assert.deepEqual(replay.nextCheckpoint, first.nextCheckpoint);
  assert.deepEqual(replay.receipt, first.receipt);
});

test("6F-F06 reused Outcome idempotency key with different content fails closed", async () => {
  const firstScenario = await outcomeScenario("verified", RECORDED_AT);
  const stores = await closureStores(firstScenario.cp);
  await closeVerifiedContinuityV01({
    previousCheckpoint: firstScenario.cp,
    reentryPackage: firstScenario.pkg,
    outcome: firstScenario.outcome,
    nextCheckpointProposal: nextProposal(firstScenario.outcome, firstScenario.pkg),
    ...stores,
    outcomeIdempotencyKey: "closure:outcome:1",
    checkpointIdempotencyKey: "closure:checkpoint:2",
  });
  const secondScenario = await outcomeScenario("verified", "2026-09-15T12:47:30Z");
  await assert.rejects(
    closeVerifiedContinuityV01({
      previousCheckpoint: secondScenario.cp,
      reentryPackage: secondScenario.pkg,
      outcome: secondScenario.outcome,
      nextCheckpointProposal: nextProposal(secondScenario.outcome, secondScenario.pkg),
      ...stores,
      outcomeIdempotencyKey: "closure:outcome:1",
      checkpointIdempotencyKey: "closure:checkpoint:other",
    }),
    error => error instanceof OutcomeRecordStoreError && error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("6F-F07 receipt binds exact durable digests and v-to-v+1", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: nextProposal(outcome, pkg) });
  const receipt = buildContinuityClosureReceiptV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpoint: next });
  assert.equal(receipt.previousVersion, cp.version);
  assert.equal(receipt.nextVersion, cp.version + 1);
  assert.equal(receipt.closedAt, next.createdAt);
  assert.equal(receipt.outcomeDigest, digest(outcome));
  assert.equal(receipt.nextCheckpointDigest, digest(next));
  assert.deepEqual(validateContinuityClosureReceiptV01(receipt), receipt);
  assert.equal(Object.isFrozen(receipt), true);
});

test("6F-F08 tampered closure receipt ID or digest is rejected", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  const next = buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: nextProposal(outcome, pkg) });
  const receipt = buildContinuityClosureReceiptV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpoint: next });
  closureError(() => validateContinuityClosureReceiptV01({ ...receipt, closureId: "continuity-closure:tampered" }), "INVALID_CONTINUITY_CLOSURE_RECEIPT");
  closureError(() => validateContinuityClosureReceiptV01({ ...receipt, outcomeDigest: "0".repeat(64) }), "INVALID_CONTINUITY_CLOSURE_RECEIPT");
});

test("6F-G01/G02 protected intent cannot enter proposal and Outcome IDs are not verification evidence", async () => {
  const { cp, pkg, outcome } = await outcomeScenario();
  closureError(() => buildNextTrustedCheckpointV01({
    previousCheckpoint: cp,
    reentryPackage: pkg,
    outcome,
    nextCheckpointProposal: { ...nextProposal(outcome, pkg), activeObjective: "model-changed objective" },
  }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
  const proposal = nextProposal(outcome, pkg);
  proposal.nextAction.evidenceRefs = [outcome.outcomeId];
  closureError(() => buildNextTrustedCheckpointV01({ previousCheckpoint: cp, reentryPackage: pkg, outcome, nextCheckpointProposal: proposal }), "INVALID_NEXT_CHECKPOINT_PROPOSAL");
});
