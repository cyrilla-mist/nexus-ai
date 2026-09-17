import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { validateTrustedCheckpointV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";
import { validateOutcomeRecordV01 } from "../experience/continuity-loop-v01/outcome-verifier.mjs";
import { createInMemoryOutcomeRecordStoreV01 } from "../experience/continuity-loop-v01/outcome-record-store.mjs";
import { createInMemoryTrustedCheckpointStoreV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";
import { validateContinuityAssessmentV01 } from "../experience/continuity-loop-v01/continuity-assessment.mjs";
import { buildWritebackTargetV01 } from "../experience/writeback-v01/writeback-target-validator.mjs";
import { buildWritebackPolicyV01 } from "../experience/writeback-v01/writeback-policy.mjs";
import { buildWritebackRetentionPolicyV01 } from "../experience/writeback-v01/writeback-retention-policy.mjs";
import { createPhase6HistoryReaderV01 } from "../experience/writeback-v01/phase6-history-reader-adapter.mjs";
import { readWritebackHistoryV01 } from "../experience/writeback-v01/writeback-history.mjs";
import { buildWritebackManagementSurfaceV01 } from "../experience/writeback-v01/writeback-management-surface.mjs";
import {
  ContinuityProductSurfaceError,
  buildContinuityProductSurfaceV01,
  validateContinuityProductSurfaceV01,
} from "../experience/product-surface-v01/continuity-product-surface-projector.mjs";

const PROJECT = "project:nexus-atlas";
const OTHER = "project:other";
const REPO = "cyrilla-mist/nexus-ai";
const BASE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CP_AT = "2026-09-16T16:17:36Z";
const ASSESS_AT = "2026-09-16T16:18:00Z";
const OUTCOME_AT = "2026-09-16T16:19:00Z";
const GENERATED_AT = "2026-09-16T16:20:00Z";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

function checkpoint(projectRef = PROJECT) {
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: "nexus-atlas.trusted-checkpoint.v0.1",
    checkpointId: `checkpoint:phase8:${projectRef.replaceAll(":", "-")}`,
    projectRef,
    version: 2,
    createdAt: CP_AT,
    trustedDirection: "Make verified continuity state visible before adding more backend breadth.",
    activeObjective: "Expose the accepted continuity loop through the Nexus Atlas product surface.",
    acceptedNextAction: {
      actionRef: "action:phase8:continuity-product-surface",
      summary: "Build and verify the bounded Continuity Product Surface.",
      basisRefs: ["decision:phase8:product-surface-first"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: REPO,
      cursorType: "default-branch-head",
      value: BASE,
      capturedAt: CP_AT,
    },
    governingRefs: ["decision:phase8:product-surface-first"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "phase8-acceptance-fixture",
      authority: "bounded-acceptance-fixture",
      references: ["fixture:phase8:checkpoint"],
    },
    confirmation: {
      state: "confirmed",
      authority: "verified-outcome",
      actorRef: "system:phase6-continuity-closure",
      confirmedAt: CP_AT,
      basisRef: "outcome:phase7-accepted",
    },
  });
}

function outcome(projectRef = PROJECT, state = "verified") {
  const verified = state === "verified";
  const payload = {
    outcomeVersion: "nexus-atlas.outcome-record.v0.1",
    projectRef,
    reentryRef: "reentry-package:phase8:fixture",
    verificationEnvelopeRef: "verification-envelope:phase8:fixture",
    actionObservationRef: "action-observation:phase8:fixture",
    verificationRef: "outcome-verification:phase8:fixture",
    actionRef: "action:phase7:final-acceptance",
    attemptedAt: "2026-09-16T16:18:30Z",
    executionActor: "external:github",
    expectedPostcondition: { conditionType: "github-default-branch-head-advanced", expectedValue: null },
    observedPostcondition: {
      baselineHead: BASE,
      observedHead: verified ? HEAD : BASE,
      lineage: verified ? "ahead" : "identical",
      expectedValueObserved: null,
    },
    verificationState: state,
    verificationEvidenceRefs: verified ? [`github:commit:${REPO}:${HEAD}`] : [],
    failureReason: verified ? null : "The expected postcondition was not verified.",
    recordedAt: OUTCOME_AT,
    authority: "derived-outcome-record",
    capabilities: { persistAllowed: true, nextCheckpointAllowed: verified },
  };
  return validateOutcomeRecordV01({ ...payload, outcomeId: `outcome:${digest(payload).slice(0, 24)}` });
}

function assessment(cp = checkpoint(), validity = "VALID") {
  const payload = {
    assessmentVersion: "nexus-atlas.continuity-assessment.v0.1",
    projectRef: cp.projectRef,
    checkpointRef: cp.checkpointId,
    evidenceWindowRef: "fresh-evidence-window:phase8-fixture",
    observedAt: ASSESS_AT,
    validity,
    preservedClaims: [],
    invalidatedClaims: [],
    invalidatedNextActions: [],
    unresolvedProtectedAmbiguity: validity === "AMBIGUOUS" ? {
      ambiguityRef: "ambiguity:phase8:fixture",
      ambiguityKind: "consequential-choice",
      protectedRef: `${cp.checkpointId}#accepted-next-action`,
      summary: "A current human choice is required.",
      evidenceRefs: ["github:phase8:fixture"],
    } : null,
    evidenceRefs: ["github:phase8:fixture"],
    explanation: "Bounded Phase 8 browser projection fixture.",
    authority: "derived-continuity-assessment",
    capabilities: {
      humanAuthorityRequired: validity === "AMBIGUOUS",
      reentryPackageAllowed: validity !== "AMBIGUOUS",
    },
  };
  return validateContinuityAssessmentV01({ ...payload, assessmentId: `continuity-assessment:${digest(payload).slice(0, 24)}` });
}

async function management(cp = checkpoint(), out = outcome()) {
  const target = buildWritebackTargetV01({
    providerKind: "phase8-reference-memory",
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
    projectRefs: [cp.projectRef],
    targetRef: target.targetId,
    artifactKinds: ["outcome-record", "trusted-checkpoint"],
  });
  const retentionPolicy = buildWritebackRetentionPolicyV01({ projectRefs: [cp.projectRef], maxHistoryPageSize: 20 });
  const outcomeStore = createInMemoryOutcomeRecordStoreV01({ allowedProjectRefs: [cp.projectRef] });
  const checkpointStore = createInMemoryTrustedCheckpointStoreV01({ allowedProjectRefs: [cp.projectRef] });
  if (out) await outcomeStore.appendOutcome({ outcome: out, idempotencyKey: "phase8:outcome" });
  await checkpointStore.writeCheckpoint({ checkpoint: cp, expectedVersion: 0, idempotencyKey: "phase8:checkpoint" });
  const reader = createPhase6HistoryReaderV01({ outcomeStore, checkpointStore, projectRefs: [cp.projectRef] });
  const outcomes = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: cp.projectRef, artifactKind: "outcome-record", limit: 20 });
  const checkpoints = await readWritebackHistoryV01({ historyReader: reader, retentionPolicy, projectRef: cp.projectRef, artifactKind: "trusted-checkpoint", limit: 20 });
  return buildWritebackManagementSurfaceV01({
    target,
    writebackPolicy,
    retentionPolicy,
    projectRef: cp.projectRef,
    outcomeHistoryPage: outcomes,
    checkpointHistoryPage: checkpoints,
    crossSourceVerifications: [],
    generatedAt: GENERATED_AT,
  });
}

async function surface({ cp = checkpoint(), out = outcome(), validity = "VALID", generatedAt = GENERATED_AT } = {}) {
  return buildContinuityProductSurfaceV01({
    managementSurface: await management(cp, out),
    trustedCheckpoint: cp,
    latestOutcome: out,
    continuityAssessment: assessment(cp, validity),
    generatedAt,
  });
}

test("8A-A01 projection is deterministic and deeply immutable", async () => {
  const first = await surface();
  const second = await surface();
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.resumeState), true);
  assert.equal(Object.isFrozen(first.history), true);
});

test("8A-A02 resume state is copied exactly from the accepted Trusted Checkpoint", async () => {
  const cp = checkpoint();
  const value = await surface({ cp });
  assert.deepEqual(value.resumeState, {
    trustedDirection: cp.trustedDirection,
    activeObjective: cp.activeObjective,
    nextActionRef: cp.acceptedNextAction.actionRef,
    nextActionSummary: cp.acceptedNextAction.summary,
  });
});

test("8A-A03 VALID continuity semantics are preserved without reinterpretation", async () => {
  const value = await surface({ validity: "VALID" });
  assert.deepEqual(value.continuity, {
    assessmentRef: value.continuity.assessmentRef,
    validity: "VALID",
    humanAuthorityRequired: false,
    reentryPackageAllowed: true,
  });
});

test("8A-A04 AMBIGUOUS remains human-authority-required", async () => {
  const value = await surface({ validity: "AMBIGUOUS" });
  assert.equal(value.continuity.validity, "AMBIGUOUS");
  assert.equal(value.continuity.humanAuthorityRequired, true);
  assert.equal(value.continuity.reentryPackageAllowed, false);
  assert.equal(value.capabilities.humanAuthorityDecisionAllowed, false);
});

test("8A-A05 latest Outcome state is copied exactly", async () => {
  const out = outcome(PROJECT, "failed");
  const value = await surface({ out });
  assert.equal(value.latestOutcome.verificationState, "failed");
  assert.equal(value.latestOutcome.failureReason, out.failureReason);
  assert.equal(value.latestOutcome.outcomeRef, out.outcomeId);
});

test("8A-A06 browser capabilities remain fixed read-only", async () => {
  const value = await surface();
  assert.deepEqual(value.capabilities, {
    readOnly: true,
    writeAllowed: false,
    deleteAllowed: false,
    productionProvisioningAllowed: false,
    canonicalContextWriteAllowed: false,
    autonomousExecutionAllowed: false,
    humanAuthorityDecisionAllowed: false,
  });
});

test("8A-A07 write-back safety preserves mandatory guarantees", async () => {
  const value = await surface();
  assert.equal(value.writebackSafety.requireVerifiedOutcomeForCheckpointAdvance, true);
  assert.equal(value.writebackSafety.requireExactReadAfterWrite, true);
  assert.equal(value.writebackSafety.deletionAllowed, false);
});

test("8A-A08 browser history remains bounded summaries rather than full artifacts", async () => {
  const value = await surface();
  assert.deepEqual(Object.keys(value.history.outcomes.records[0]), ["outcomeRef", "verificationState", "recordedAt", "actionRef"]);
  assert.deepEqual(Object.keys(value.history.checkpoints.records[0]), ["checkpointRef", "version", "createdAt", "nextActionRef"]);
  assert.equal("observedPostcondition" in value.history.outcomes.records[0], false);
  assert.equal("trustedDirection" in value.history.checkpoints.records[0], false);
});

test("8A-B01 cross-project checkpoint fails closed", async () => {
  const cp = checkpoint(OTHER);
  const managementSurface = await management(checkpoint(PROJECT), outcome(PROJECT));
  assert.throws(
    () => buildContinuityProductSurfaceV01({ managementSurface, trustedCheckpoint: cp, latestOutcome: outcome(PROJECT), continuityAssessment: assessment(cp), generatedAt: GENERATED_AT }),
    error => error instanceof ContinuityProductSurfaceError && error.code === "CONTINUITY_PRODUCT_SURFACE_SCOPE_MISMATCH",
  );
});

test("8A-B02 management newest checkpoint must bind supplied checkpoint", async () => {
  const current = checkpoint();
  const other = clone(current);
  other.checkpointId = "checkpoint:phase8:other";
  assert.throws(() => buildContinuityProductSurfaceV01({
    managementSurface: await management(current, outcome()),
    trustedCheckpoint: validateTrustedCheckpointV01(other),
    latestOutcome: outcome(),
    continuityAssessment: assessment(validateTrustedCheckpointV01(other)),
    generatedAt: GENERATED_AT,
  }));
});

test("8A-B03 management Outcome requires exact latest Outcome binding", async () => {
  const cp = checkpoint();
  assert.throws(
    () => buildContinuityProductSurfaceV01({
      managementSurface: await management(cp, outcome()),
      trustedCheckpoint: cp,
      latestOutcome: null,
      continuityAssessment: assessment(cp),
      generatedAt: GENERATED_AT,
    }),
    error => error instanceof ContinuityProductSurfaceError && error.code === "CONTINUITY_PRODUCT_SURFACE_BINDING_MISMATCH",
  );
});

test("8A-B04 no-Outcome history accepts latestOutcome=null", async () => {
  const cp = checkpoint();
  const value = buildContinuityProductSurfaceV01({
    managementSurface: await management(cp, null),
    trustedCheckpoint: cp,
    latestOutcome: null,
    continuityAssessment: assessment(cp),
    generatedAt: GENERATED_AT,
  });
  assert.equal(value.latestOutcome, null);
  assert.equal(value.history.outcomes.count, 0);
});

test("8A-B05 assessment must bind the supplied checkpoint", async () => {
  const cp = checkpoint();
  const other = checkpoint(OTHER);
  assert.throws(() => buildContinuityProductSurfaceV01({
    managementSurface: await management(cp, outcome()),
    trustedCheckpoint: cp,
    latestOutcome: outcome(),
    continuityAssessment: assessment(other),
    generatedAt: GENERATED_AT,
  }));
});

test("8A-B06 stale generatedAt fails closed", async () => {
  await assert.rejects(async () => surface({ generatedAt: "2026-09-16T16:17:00Z" }), error => error instanceof ContinuityProductSurfaceError && error.code === "CONTINUITY_PRODUCT_SURFACE_STALE_PROJECTION");
});

test("8A-B07 tampered deterministic identity fails validation", async () => {
  const value = clone(await surface());
  value.surfaceId = "continuity-product-surface:000000000000000000000000";
  assert.throws(() => validateContinuityProductSurfaceV01(value));
});

test("8A-B08 projection does not mutate accepted upstream artifacts", async () => {
  const cp = checkpoint();
  const out = outcome();
  const a = assessment(cp);
  const m = await management(cp, out);
  const before = clone({ cp, out, a, m });
  buildContinuityProductSurfaceV01({ managementSurface: m, trustedCheckpoint: cp, latestOutcome: out, continuityAssessment: a, generatedAt: GENERATED_AT });
  assert.deepEqual({ cp, out, a, m }, before);
});
