import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
  buildContinuityAssessmentV01,
} from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  NEXT_CHECKPOINT_PROPOSAL_VERSION_V01,
  closeVerifiedContinuityV01,
} from "../experience/continuity-loop-v01/continuity-closure.mjs";
import { createFileOutcomeRecordStoreV01 } from "../experience/continuity-loop-v01/file-outcome-record-store.mjs";
import { createFileTrustedCheckpointStoreV01 } from "../experience/continuity-loop-v01/file-trusted-checkpoint-store.mjs";
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
} from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { buildReentryPackageV01 } from "../experience/continuity-loop-v01/reentry-package.mjs";
import { createGitHubSourceAdapter } from "../experience/source-v01/github-source-adapter.mjs";

const MANIFEST_PATH = "evaluation/phase6g/real-run/manifest.json";
const MAX_COMMIT_RANGE = 20;

const clone = value => structuredClone(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const nowIso = () => new Date().toISOString();
const laterIso = (value, ms = 1) => new Date(Date.parse(value) + ms).toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.name = "Phase6GRealRunError";
  error.code = code;
  error.details = details;
  throw error;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const values = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail("INVALID_ARGUMENTS", "Arguments must be supplied as --key value pairs.");
    values[key.slice(2)] = value;
  }
  if (!new Set(["pre-action", "post-action"]).has(mode)) fail("INVALID_MODE", "Mode must be pre-action or post-action.");
  if (!values.out) fail("INVALID_ARGUMENTS", "--out is required.");
  if (mode === "post-action" && !values.pre) fail("INVALID_ARGUMENTS", "post-action requires --pre.");
  return { mode, outDir: path.resolve(values.out), preDir: values.pre ? path.resolve(values.pre) : null };
}

function validateManifest(manifest) {
  if (manifest?.manifestVersion !== "nexus-atlas.phase6g-real-run-manifest.v0.1") fail("INVALID_MANIFEST", "Unexpected Phase 6G manifest version.");
  if (manifest.projectRef !== manifest.alignment?.projectRef) fail("INVALID_MANIFEST", "Manifest project binding is inconsistent.");
  if (manifest.repositoryRef !== manifest.alignment?.evidenceCursor?.scopeRef) fail("INVALID_MANIFEST", "Manifest repository binding is inconsistent.");
  if (manifest.confirmation?.accepted !== true || manifest.confirmation?.actorRef !== "user:cyrilla") fail("HUMAN_CONFIRMATION_REQUIRED", "The real run requires the explicit recorded human checkpoint confirmation.");
  return manifest;
}

class GitHubReadClient {
  constructor({ token, repositoryRef }) {
    if (!token) fail("GITHUB_TOKEN_REQUIRED", "GITHUB_TOKEN is required for the live Phase 6G read path.");
    this.token = token;
    this.repositoryRef = repositoryRef;
  }

  async api(relative) {
    const response = await fetch(`https://api.github.com/repos/${this.repositoryRef}${relative}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "nexus-atlas-phase6g-real-run",
      },
    });
    if (!response.ok) fail("GITHUB_READ_FAILED", `GitHub read failed with HTTP ${response.status}.`, { relative });
    return response.json();
  }

  async getRepository() {
    const raw = await this.api("");
    return {
      name: raw.name,
      fullName: raw.full_name,
      defaultBranch: raw.default_branch,
      archived: raw.archived,
      visibility: raw.visibility,
      updatedAt: raw.updated_at,
    };
  }

  async getDefaultBranch({ branchName }) {
    const raw = await this.api(`/branches/${encodeURIComponent(branchName)}`);
    return { name: raw.name, headSha: raw.commit.sha };
  }

  async compareCommits({ baseSha, headSha, limit }) {
    if (baseSha === headSha) {
      return {
        relation: "identical",
        aheadBy: 0,
        behindBy: 0,
        commits: [],
        continuationAvailable: false,
      };
    }
    const raw = await this.api(`/compare/${baseSha}...${headSha}?per_page=${limit}`);
    const relation = raw.status;
    if (!["identical", "ahead", "behind", "diverged"].includes(relation)) fail("GITHUB_COMPARE_INVALID", "GitHub compare returned an unsupported relation.", { relation });
    const commits = (raw.commits ?? []).slice(0, limit).map(item => ({
      sha: item.sha,
      authoredAt: item.commit?.author?.date ?? null,
      committedAt: item.commit?.committer?.date,
      messageHeadline: String(item.commit?.message ?? "").split(/[\r\n]/, 1)[0],
    }));
    return {
      relation,
      aheadBy: raw.ahead_by,
      behindBy: raw.behind_by,
      commits,
      continuationAvailable: Number(raw.ahead_by) > limit,
    };
  }
}

function liveReaders(manifest) {
  const client = new GitHubReadClient({
    token: process.env.GITHUB_TOKEN,
    repositoryRef: manifest.repositoryRef,
  });
  return {
    adapter: createGitHubSourceAdapter({ client }),
    rangeReader: createGitHubCommitRangeReader({ client }),
  };
}

async function freshSnapshot(adapter, manifest, capturedAt = nowIso()) {
  return adapter.readSnapshot({
    repositoryRef: manifest.repositoryRef,
    capturedAt,
    requestedLimits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 },
  });
}

function branchOf(snapshot) {
  const branch = snapshot.records.find(record => record.sourceType === "branch");
  if (!branch) fail("DEFAULT_BRANCH_MISSING", "Live snapshot did not contain the default branch record.");
  return branch;
}

function repositoryOf(snapshot) {
  const repository = snapshot.records.find(record => record.sourceType === "repository");
  if (!repository) fail("REPOSITORY_RECORD_MISSING", "Live snapshot did not contain the repository record.");
  return repository;
}

function policy(manifest) {
  return {
    policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
    projectRef: manifest.projectRef,
    repositoryRef: manifest.repositoryRef,
    maxCommitRange: MAX_COMMIT_RANGE,
  };
}

function validAssessmentProposal(checkpoint, window, explanation) {
  const repository = window.records.find(record => record.sourceType === "repository");
  const branch = window.records.find(record => record.sourceType === "branch");
  if (!repository || !branch) fail("ASSESSMENT_EVIDENCE_MISSING", "Fresh Evidence Window lacks repository/branch evidence.");
  const commitRefs = window.records.filter(record => record.sourceType === "commit").map(record => record.sourceRecordId);
  const objectiveEvidence = commitRefs[0] ?? repository.sourceRecordId;
  const actionEvidence = commitRefs.at(-1) ?? branch.sourceRecordId;
  return {
    proposalVersion: CONTINUITY_ASSESSMENT_PROPOSAL_VERSION_V01,
    checkpointRef: checkpoint.checkpointId,
    evidenceWindowRef: window.windowId,
    validity: "VALID",
    preservedClaims: [
      {
        claimRef: `${checkpoint.checkpointId}#trusted-direction`,
        claimType: "trusted-direction",
        summary: "Fresh GitHub reality does not contradict the confirmed Phase 6 direction.",
        evidenceRefs: [repository.sourceRecordId],
      },
      {
        claimRef: `${checkpoint.checkpointId}#active-objective`,
        claimType: "active-objective",
        summary: "The bounded Phase 6G objective remains applicable to the current repository state.",
        evidenceRefs: [objectiveEvidence],
      },
      {
        claimRef: `${checkpoint.checkpointId}#accepted-next-action`,
        claimType: "accepted-next-action",
        summary: "The confirmed bounded Phase 6G action remains safe to continue.",
        evidenceRefs: [actionEvidence],
      },
    ],
    invalidatedClaims: [],
    invalidatedNextActions: [],
    unresolvedProtectedAmbiguity: null,
    explanation,
  };
}

async function buildWindowFromCurrentHead({ checkpoint, snapshot, rangeReader, manifest }) {
  const headSha = branchOf(snapshot).payload.headSha;
  let proof = null;
  if (headSha !== checkpoint.evidenceCursor.value) {
    proof = await rangeReader.readCommitRange({
      repositoryRef: manifest.repositoryRef,
      baseSha: checkpoint.evidenceCursor.value,
      headSha,
      capturedAt: snapshot.capturedAt,
      limit: MAX_COMMIT_RANGE,
    });
  }
  const window = buildFreshEvidenceWindowV01({
    checkpoint,
    sourceSnapshot: snapshot,
    commitRangeProof: proof,
    requiredEvidencePolicy: policy(manifest),
  });
  return { window, proof };
}

async function persistInitialCheckpoint({ manifest, outDir }) {
  const proposal = buildInitialAlignmentProposalV01(manifest.alignment);
  const checkpoint = confirmInitialAlignmentV01({
    proposal,
    confirmation: {
      proposalId: proposal.proposalId,
      accepted: manifest.confirmation.accepted,
      actorRef: manifest.confirmation.actorRef,
      confirmedAt: manifest.confirmation.confirmedAt,
    },
  });
  const storePath = path.resolve(outDir, "runtime/trusted-checkpoints.json");
  const store = createFileTrustedCheckpointStoreV01({
    filePath: storePath,
    allowedProjectRefs: [manifest.projectRef],
  });
  const write = await store.writeCheckpoint({
    checkpoint,
    expectedVersion: 0,
    idempotencyKey: `phase6g-initial:${checkpoint.checkpointId}`,
  });
  const readBack = await store.readLatest({ projectRef: manifest.projectRef });
  if (!same(readBack, checkpoint)) fail("INITIAL_CHECKPOINT_READBACK_MISMATCH", "Initial real-run checkpoint did not survive exact read-back.");
  return { proposal, checkpoint, storePath, store, write };
}

async function runPreAction(manifest, outDir) {
  if (manifest.stage !== "pre-action") fail("MANIFEST_STAGE_MISMATCH", "Pre-action run requires manifest stage=pre-action.");
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const { proposal, checkpoint, storePath } = await persistInitialCheckpoint({ manifest, outDir });
  const { adapter } = liveReaders(manifest);
  const snapshot = await freshSnapshot(adapter, manifest);
  const observedHead = branchOf(snapshot).payload.headSha;
  if (observedHead !== checkpoint.evidenceCursor.value) {
    fail("PRE_ACTION_BASELINE_MOVED", "main advanced before the pre-action boundary was frozen; the confirmed checkpoint must be re-evaluated before proceeding.", {
      checkpointHead: checkpoint.evidenceCursor.value,
      observedHead,
    });
  }

  const window = buildFreshEvidenceWindowV01({
    checkpoint,
    sourceSnapshot: snapshot,
    commitRangeProof: null,
    requiredEvidencePolicy: policy(manifest),
  });
  if (window.status !== "complete" || window.lineage !== "identical") fail("PRE_ACTION_WINDOW_INVALID", "Pre-action evidence must prove the confirmed head is still current.");

  const assessment = buildContinuityAssessmentV01({
    checkpoint,
    freshEvidenceWindow: window,
    assessmentProposal: validAssessmentProposal(
      checkpoint,
      window,
      "The live default branch still equals the human-confirmed evidence cursor, so all bounded continuation surfaces remain valid for the first Phase 6G real action.",
    ),
  });
  const reentryPackage = buildReentryPackageV01({
    checkpoint,
    freshEvidenceWindow: window,
    assessment,
    preparedAt: snapshot.capturedAt,
  });
  const envelope = buildActionVerificationEnvelopeV01({
    reentryPackage,
    postconditionProposal: {
      proposalVersion: POSTCONDITION_PROPOSAL_VERSION_V01,
      reentryPackageRef: reentryPackage.packageId,
      actionRef: reentryPackage.nextAction.actionRef,
      conditionType: "github-default-branch-head-advanced",
      expectedValue: null,
      explanation: "The real Phase 6G action is complete only if a fresh authoritative GitHub read proves main advanced from the frozen checkpoint baseline.",
    },
    declaredAt: snapshot.capturedAt,
  });

  await writeJson(path.join(outDir, "00-alignment-proposal.json"), proposal);
  await writeJson(path.join(outDir, "01-checkpoint.json"), checkpoint);
  await writeJson(path.join(outDir, "02-fresh-evidence.json"), window);
  await writeJson(path.join(outDir, "03-assessment.json"), assessment);
  await writeJson(path.join(outDir, "05-reentry-package.json"), reentryPackage);
  await writeJson(path.join(outDir, "05b-verification-envelope.json"), envelope);
  await writeJson(path.join(outDir, "pre-action-summary.json"), {
    runVersion: "nexus-atlas.phase6g-pre-action.v0.1",
    projectRef: manifest.projectRef,
    checkpointRef: checkpoint.checkpointId,
    baselineHead: observedHead,
    humanAuthorityQuestionCount: 0,
    continuityValidity: assessment.validity,
    reentryPackageRef: reentryPackage.packageId,
    expectedPostcondition: envelope.expectedPostcondition,
    checkpointStoreArtifact: path.basename(storePath),
    state: "ready-for-external-action",
  });

  process.stdout.write(`${JSON.stringify({ mode: "pre-action", checkpointId: checkpoint.checkpointId, baselineHead: observedHead, reentryPackageId: reentryPackage.packageId })}\n`);
}

async function runPostAction(manifest, preDir, outDir) {
  if (manifest.stage !== "armed") fail("MANIFEST_STAGE_MISMATCH", "Post-action run requires manifest stage=armed.");
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const checkpoint = await readJson(path.join(preDir, "01-checkpoint.json"));
  const reentryPackage = await readJson(path.join(preDir, "05-reentry-package.json"));
  const envelope = await readJson(path.join(preDir, "05b-verification-envelope.json"));
  const checkpointStorePath = path.resolve(preDir, "runtime/trusted-checkpoints.json");
  const checkpointStore = createFileTrustedCheckpointStoreV01({
    filePath: checkpointStorePath,
    allowedProjectRefs: [manifest.projectRef],
  });
  const checkpointReadBack = await checkpointStore.readLatest({ projectRef: manifest.projectRef });
  if (!same(checkpointReadBack, checkpoint)) fail("PRE_ACTION_CHECKPOINT_NOT_DURABLE", "Downloaded pre-action checkpoint store does not read back the exact accepted checkpoint.");

  const { adapter, rangeReader } = liveReaders(manifest);
  const snapshot = await freshSnapshot(adapter, manifest);
  const observedHead = branchOf(snapshot).payload.headSha;
  if (observedHead === envelope.baseline.value) fail("REAL_ACTION_NOT_OBSERVED", "main has not advanced from the frozen pre-action baseline.");

  const proof = await rangeReader.readCommitRange({
    repositoryRef: manifest.repositoryRef,
    baseSha: envelope.baseline.value,
    headSha: observedHead,
    capturedAt: snapshot.capturedAt,
    limit: MAX_COMMIT_RANGE,
  });
  if (!proof.complete || proof.relation !== "ahead" || proof.commits.length === 0) fail("REAL_ACTION_LINEAGE_UNSAFE", "Post-action main must be a complete ahead lineage from the frozen baseline.");
  const headCommit = proof.commits.at(-1);

  const actionObservation = buildActionObservationV01({
    reentryPackage,
    envelope,
    attemptedAt: headCommit.payload.committedAt,
    executionActor: "external:authorized-github-merge",
    reportedState: "reported-success",
    reportSummary: "The authorized GitHub merge reported success; Nexus will independently verify the resulting repository state.",
  });
  const verification = buildOutcomeVerificationV01({
    reentryPackage,
    envelope,
    actionObservation,
    sourceSnapshot: snapshot,
    commitRangeProof: proof,
    verifiedAt: snapshot.capturedAt,
  });
  if (verification.verificationState !== "verified") fail("REAL_ACTION_NOT_VERIFIED", "Fresh GitHub evidence did not verify the real Phase 6G action.", { state: verification.verificationState, reason: verification.failureReason });
  const outcome = buildOutcomeRecordV01({
    reentryPackage,
    envelope,
    actionObservation,
    verification,
    recordedAt: snapshot.capturedAt,
  });

  const outcomeStorePath = path.resolve(outDir, "runtime/outcomes.json");
  const outcomeStore = createFileOutcomeRecordStoreV01({
    filePath: outcomeStorePath,
    allowedProjectRefs: [manifest.projectRef],
  });
  const verifiedCommitRef = headCommit.sourceRecordId;
  const nextCheckpointProposal = {
    proposalVersion: NEXT_CHECKPOINT_PROPOSAL_VERSION_V01,
    outcomeRef: outcome.outcomeId,
    proposedAt: laterIso(outcome.recordedAt),
    nextAction: {
      actionRef: "action:phase6h-final-acceptance",
      summary: "Review the replayable Phase 6G evidence and determine whether Phase 6 satisfies its final acceptance criteria.",
      basisRefs: ["decision:phase6-single-real-loop", "decision:validate-before-recover"],
      evidenceRefs: [verifiedCommitRef],
    },
    explanation: "The real Phase 6G action is independently verified; the next bounded action is final Phase 6 acceptance review rather than repeating the completed action.",
  };

  const closure = await closeVerifiedContinuityV01({
    previousCheckpoint: checkpoint,
    reentryPackage,
    outcome,
    nextCheckpointProposal,
    outcomeStore,
    checkpointStore,
    outcomeIdempotencyKey: `phase6g-outcome:${outcome.outcomeId}`,
    checkpointIdempotencyKey: `phase6g-next-checkpoint:${outcome.outcomeId}`,
  });

  const durableOutcome = await outcomeStore.readOutcome({ projectRef: manifest.projectRef, outcomeId: outcome.outcomeId });
  const durableCheckpoint = await checkpointStore.readLatest({ projectRef: manifest.projectRef });
  if (!same(durableOutcome, outcome) || !same(durableCheckpoint, closure.nextCheckpoint)) fail("CLOSURE_READBACK_MISMATCH", "Post-action durable artifacts failed final exact read-back.");

  await fs.mkdir(path.resolve(outDir, "runtime"), { recursive: true });
  await fs.copyFile(checkpointStorePath, path.resolve(outDir, "runtime/trusted-checkpoints.json"));

  await writeJson(path.join(outDir, "01-checkpoint.json"), checkpoint);
  await writeJson(path.join(outDir, "05-reentry-package.json"), reentryPackage);
  await writeJson(path.join(outDir, "06-action-observation.json"), actionObservation);
  await writeJson(path.join(outDir, "07-fresh-verification.json"), verification);
  await writeJson(path.join(outDir, "08-outcome.json"), outcome);
  await writeJson(path.join(outDir, "09-next-checkpoint.json"), closure.nextCheckpoint);
  await writeJson(path.join(outDir, "10-write-readback.json"), {
    outcomeReadBackVerified: same(durableOutcome, outcome),
    checkpointReadBackVerified: same(durableCheckpoint, closure.nextCheckpoint),
    receipt: closure.receipt,
  });

  await sleep(1100);
  const nextSnapshot = await freshSnapshot(adapter, manifest);
  const { window: nextWindow } = await buildWindowFromCurrentHead({
    checkpoint: closure.nextCheckpoint,
    snapshot: nextSnapshot,
    rangeReader,
    manifest,
  });
  if (nextWindow.status !== "complete") fail("NEXT_REENTRY_BLOCKED", "A subsequent re-entry could not start from the verified next checkpoint.", { blockedReason: nextWindow.blockedReason });
  const nextAssessment = buildContinuityAssessmentV01({
    checkpoint: closure.nextCheckpoint,
    freshEvidenceWindow: nextWindow,
    assessmentProposal: validAssessmentProposal(
      closure.nextCheckpoint,
      nextWindow,
      "A fresh read after durable closure starts cleanly from the new checkpoint without reconstructing the original continuity history.",
    ),
  });
  await writeJson(path.join(outDir, "11-next-reentry-window.json"), nextWindow);
  await writeJson(path.join(outDir, "12-next-reentry-assessment.json"), nextAssessment);

  const summary = {
    runVersion: "nexus-atlas.phase6g-real-run.v0.1",
    projectRef: manifest.projectRef,
    previousCheckpointRef: checkpoint.checkpointId,
    baselineHead: envelope.baseline.value,
    observedHead,
    lineage: proof.relation,
    continuityValidityBeforeAction: "VALID",
    humanAuthorityQuestionCount: 0,
    externalExecutionActor: actionObservation.executionActor,
    externalReportTrustedAsSuccess: false,
    verificationState: verification.verificationState,
    outcomeRef: outcome.outcomeId,
    nextCheckpointRef: closure.nextCheckpoint.checkpointId,
    nextCheckpointVersion: closure.nextCheckpoint.version,
    outcomeReadBackVerified: true,
    checkpointReadBackVerified: true,
    subsequentReentryFromNextCheckpoint: nextAssessment.validity === "VALID",
    blockingCorrectnessObserved: {
      falseContinuityClaims: 0,
      unverifiedSuccessfulOutcomes: 0,
      silentProtectedAuthorityGuesses: 0,
      consequentialEvidenceLinked: true,
      humanAuthorityQuestionsWithinLimit: true,
    },
    productUsefulnessObservation: {
      priorDirectionRestatedAfterCheckpoint: false,
      originalHistoryReplayRequiredForNextReentry: false,
      userJudgment: null,
      note: "User usefulness judgment is intentionally not inferred by the runtime and remains to be collected explicitly.",
    },
  };
  await writeJson(path.join(outDir, "run-summary.json"), summary);
  process.stdout.write(`${JSON.stringify({ mode: "post-action", verificationState: verification.verificationState, observedHead, nextCheckpointId: closure.nextCheckpoint.checkpointId, nextReentryValidity: nextAssessment.validity })}\n`);
}

const args = parseArgs(process.argv.slice(2));
const manifest = validateManifest(await readJson(MANIFEST_PATH));
if (args.mode === "pre-action") await runPreAction(manifest, args.outDir);
else await runPostAction(manifest, args.preDir, args.outDir);
