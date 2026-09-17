import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "../../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { validateOutcomeRecordV01 } from "../../experience/continuity-loop-v01/outcome-verifier.mjs";
import { validateContinuityAssessmentV01 } from "../../experience/continuity-loop-v01/continuity-assessment.mjs";
import { createInMemoryOutcomeRecordStoreV01 } from "../../experience/continuity-loop-v01/outcome-record-store.mjs";
import { createInMemoryTrustedCheckpointStoreV01 } from "../../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";
import { buildWritebackTargetV01 } from "../../experience/writeback-v01/writeback-target-validator.mjs";
import { buildWritebackPolicyV01 } from "../../experience/writeback-v01/writeback-policy.mjs";
import { buildWritebackRetentionPolicyV01 } from "../../experience/writeback-v01/writeback-retention-policy.mjs";
import { createPhase6HistoryReaderV01 } from "../../experience/writeback-v01/phase6-history-reader-adapter.mjs";
import { readWritebackHistoryV01 } from "../../experience/writeback-v01/writeback-history.mjs";
import { buildWritebackManagementSurfaceV01 } from "../../experience/writeback-v01/writeback-management-surface.mjs";
import { buildContinuityProductSurfaceV01 } from "../../experience/product-surface-v01/continuity-product-surface-projector.mjs";

export const PHASE8_BROWSER_FIXTURE = Object.freeze({
  projectRef: "project:nexus-atlas",
  repositoryRef: "cyrilla-mist/nexus-ai",
  phase7Head: "65019f5c18b34dbcdba2c735e0a5ca0f455426ca",
  phase8aHead: "a6a8b21ce6fbdaf6c317d3a485c5e9b88bf3a84a",
  checkpointAt: "2026-09-17T12:06:00Z",
  assessmentAt: "2026-09-17T12:06:10Z",
  outcomeAt: "2026-09-17T12:10:00Z",
  generatedAt: "2026-09-17T12:12:00Z",
});

const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function checkpoint() {
  const f = PHASE8_BROWSER_FIXTURE;
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: "nexus-atlas.trusted-checkpoint.v0.1",
    checkpointId: "checkpoint:phase8:continuity-product-surface",
    projectRef: f.projectRef,
    version: 1,
    createdAt: f.checkpointAt,
    trustedDirection: "Make verified continuity state visible in Nexus Atlas before adding more backend breadth.",
    activeObjective: "Ship the accepted Continuity Product Surface and then expose it through a dedicated read-only Atlas route.",
    acceptedNextAction: {
      actionRef: "action:phase8b:accepted-browser-snapshot",
      summary: "Freeze a deterministic browser snapshot that is mechanically equivalent to the accepted Continuity Product Surface projector.",
      basisRefs: ["decision:phase8:product-surface-first"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: f.repositoryRef,
      cursorType: "default-branch-head",
      value: f.phase8aHead,
      capturedAt: f.checkpointAt,
    },
    governingRefs: ["decision:phase8:product-surface-first"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "phase8-browser-acceptance-fixture",
      authority: "bounded-acceptance-fixture",
      references: ["fixture:phase8:continuity-browser-snapshot"],
    },
    confirmation: {
      state: "confirmed",
      authority: "verified-outcome",
      actorRef: "system:phase8-browser-fixture",
      confirmedAt: f.checkpointAt,
      basisRef: "outcome:phase8a:accepted",
    },
  });
}

function outcome() {
  const f = PHASE8_BROWSER_FIXTURE;
  const payload = {
    outcomeVersion: "nexus-atlas.outcome-record.v0.1",
    projectRef: f.projectRef,
    reentryRef: "reentry-package:phase8a:accepted",
    verificationEnvelopeRef: "verification-envelope:phase8a:accepted",
    actionObservationRef: "action-observation:phase8a:accepted",
    verificationRef: "outcome-verification:phase8a:accepted",
    actionRef: "action:phase8a:continuity-product-surface-projection",
    attemptedAt: "2026-09-17T12:09:00Z",
    executionActor: "external:github",
    expectedPostcondition: {
      conditionType: "github-default-branch-head-advanced",
      expectedValue: null,
    },
    observedPostcondition: {
      baselineHead: f.phase7Head,
      observedHead: f.phase8aHead,
      lineage: "ahead",
      expectedValueObserved: null,
    },
    verificationState: "verified",
    verificationEvidenceRefs: [`github:commit:${f.repositoryRef}:${f.phase8aHead}`],
    failureReason: null,
    recordedAt: f.outcomeAt,
    authority: "derived-outcome-record",
    capabilities: {
      persistAllowed: true,
      nextCheckpointAllowed: true,
    },
  };
  return validateOutcomeRecordV01({
    ...payload,
    outcomeId: `outcome:${digest(payload).slice(0, 24)}`,
  });
}

function assessment(cp) {
  const payload = {
    assessmentVersion: "nexus-atlas.continuity-assessment.v0.1",
    projectRef: cp.projectRef,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: "fresh-evidence-window:phase8:browser-fixture",
    observedAt: PHASE8_BROWSER_FIXTURE.assessmentAt,
    validity: "VALID",
    preservedClaims: [],
    invalidatedClaims: [],
    invalidatedNextActions: [],
    unresolvedProtectedAmbiguity: null,
    evidenceRefs: [`github:commit:${PHASE8_BROWSER_FIXTURE.repositoryRef}:${PHASE8_BROWSER_FIXTURE.phase8aHead}`],
    explanation: "The accepted static browser fixture preserves the current Phase 8 product-surface direction and next action.",
    authority: "derived-continuity-assessment",
    capabilities: {
      humanAuthorityRequired: false,
      reentryPackageAllowed: true,
    },
  };
  return validateContinuityAssessmentV01({
    ...payload,
    assessmentId: `continuity-assessment:${digest(payload).slice(0, 24)}`,
  });
}

async function management(cp, out) {
  const projectRef = PHASE8_BROWSER_FIXTURE.projectRef;
  const target = buildWritebackTargetV01({
    providerKind: "accepted-static-browser-fixture",
    durability: "memory",
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
    capabilities: {
      projectScopeEnforced: true,
      idempotentOutcomeAppend: true,
      checkpointCompareAndSwap: true,
      exactReadAfterWrite: true,
    },
  });
  const writebackPolicy = buildWritebackPolicyV01({
    projectRefs: [projectRef],
    targetRef: target.targetId,
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
  });
  const retentionPolicy = buildWritebackRetentionPolicyV01({
    projectRefs: [projectRef],
    maxHistoryPageSize: 20,
  });
  const outcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [projectRef] });
  const checkpointStore = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [projectRef] });
  await outcomeStore.appendOutcome({ outcome: out, idempotencyKey: "phase8-browser:outcome" });
  await checkpointStore.writeCheckpoint({ checkpoint: cp, expectedVersion: 0, idempotencyKey: "phase8-browser:checkpoint" });
  const reader = createPhase6HistoryReaderV01({ outcomeStore, checkpointStore, projectRefs: [projectRef] });
  const outcomeHistoryPage = await readWritebackHistoryV01({
    historyReader: reader,
    retentionPolicy,
    projectRef,
    artifactKind: "outcome-record",
    limit: 20,
  });
  const checkpointHistoryPage = await readWritebackHistoryV01({
    historyReader: reader,
    retentionPolicy,
    projectRef,
    artifactKind: "trusted-checkpoint",
    limit: 20,
  });
  return buildWritebackManagementSurfaceV01({
    target,
    writebackPolicy,
    retentionPolicy,
    projectRef,
    outcomeHistoryPage,
    checkpointHistoryPage,
    crossSourceVerifications: [],
    generatedAt: PHASE8_BROWSER_FIXTURE.generatedAt,
  });
}

export async function buildAcceptedContinuityBrowserFixtureV01() {
  const cp = checkpoint();
  const out = outcome();
  return buildContinuityProductSurfaceV01({
    managementSurface: await management(cp, out),
    trustedCheckpoint: cp,
    latestOutcome: out,
    continuityAssessment: assessment(cp),
    generatedAt: PHASE8_BROWSER_FIXTURE.generatedAt,
  });
}
