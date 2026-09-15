import assert from "node:assert/strict";
import test from "node:test";

import { buildContinuityAssessmentV01 } from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import {
  buildFreshEvidenceWindowV01,
  GITHUB_DEFAULT_BRANCH_POLICY_V1,
} from "../experience/continuity-loop-v01/fresh-evidence-window.mjs";
import { validateFreshEvidenceWindowV01 } from "../experience/continuity-loop-v01/fresh-evidence-window-validator.mjs";
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

const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD = "cccccccccccccccccccccccccccccccccccccccc";

function checkpoint() {
  const proposal = buildInitialAlignmentProposalV01({
    projectRef: "project:nexus-atlas",
    proposedAt: "2026-09-15T13:00:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Validate the bounded fresh evidence boundary.",
    acceptedNextAction: {
      actionRef: "action:phase6c-validator-edge",
      summary: "Validate intentional blocked evidence artifacts.",
      basisRefs: ["docs:phase6c-fresh-evidence-window"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REF,
      cursorType: "default-branch-head",
      value: BASE,
      capturedAt: "2026-09-15T12:59:00Z",
    },
    governingRefs: ["decision:validate-before-recover"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-self-context",
      authority: "accepted-context-plus-human-alignment",
      references: ["docs:Nexus-Atlas-v0.1-Fresh-Evidence-Window-Contract"],
    },
  });
  return confirmInitialAlignmentV01({
    proposal,
    confirmation: {
      proposalId: proposal.proposalId,
      accepted: true,
      actorRef: "user:cyrilla",
      confirmedAt: "2026-09-15T13:01:00Z",
    },
  });
}

async function sourceSnapshot() {
  const adapter = createGitHubSourceAdapter({
    client: createGitHubClientFixture({ branch: createBranchResponse({ headSha: HEAD }) }),
  });
  return adapter.readSnapshot({
    repositoryRef: REF,
    capturedAt: "2026-09-15T13:30:00Z",
    requestedLimits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 },
  });
}

test("6C-CA-I07 intentional evidence-scope-violation remains a valid blocked artifact", async () => {
  const cp = checkpoint();
  const window = buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await sourceSnapshot(),
    requiredEvidencePolicy: {
      policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
      projectRef: cp.projectRef,
      repositoryRef: "cyrilla-mist/other-repository",
      maxCommitRange: 20,
    },
  });

  assert.equal(window.status, "blocked");
  assert.equal(window.blockedReason, "evidence-scope-violation");
  assert.deepEqual(validateFreshEvidenceWindowV01(window), window);
  assert.throws(
    () => buildContinuityAssessmentV01({ checkpoint: cp, freshEvidenceWindow: window, assessmentProposal: {} }),
    error => error.code === "ASSESSMENT_EVIDENCE_BLOCKED",
  );
});

test("6C-CA-I08 a scope mismatch without the dedicated blocker is rejected as tampering", async () => {
  const cp = checkpoint();
  const window = structuredClone(buildFreshEvidenceWindowV01({
    checkpoint: cp,
    sourceSnapshot: await sourceSnapshot(),
    requiredEvidencePolicy: {
      policyVersion: GITHUB_DEFAULT_BRANCH_POLICY_V1,
      projectRef: cp.projectRef,
      repositoryRef: "cyrilla-mist/other-repository",
      maxCommitRange: 20,
    },
  }));

  window.blockedReason = "required-evidence-missing";
  assert.throws(() => validateFreshEvidenceWindowV01(window), error => error.code === "INVALID_FRESH_EVIDENCE_WINDOW");
});
