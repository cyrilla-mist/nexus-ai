import { createHash } from "node:crypto";

import {
  isStrictOffsetIsoV01,
  validateGitHubSourceSnapshotV01,
} from "../source-v01/source-snapshot-validator.mjs";
import { validateGitHubCommitRangeProofV01 } from "./github-commit-range-proof.mjs";
import { validateReentryPackageV01 } from "./reentry-package.mjs";

export const POSTCONDITION_PROPOSAL_VERSION_V01 = "nexus-atlas.postcondition-proposal.v0.1";
export const ACTION_VERIFICATION_ENVELOPE_VERSION_V01 = "nexus-atlas.action-verification-envelope.v0.1";
export const ACTION_OBSERVATION_VERSION_V01 = "nexus-atlas.action-observation.v0.1";
export const OUTCOME_VERIFICATION_VERSION_V01 = "nexus-atlas.outcome-verification.v0.1";
export const OUTCOME_RECORD_VERSION_V01 = "nexus-atlas.outcome-record.v0.1";
export const ACTION_VERIFICATION_ENVELOPE_AUTHORITY_V01 = "declared-postcondition-boundary";
export const ACTION_OBSERVATION_AUTHORITY_V01 = "external-action-report";
export const OUTCOME_VERIFICATION_AUTHORITY_V01 = "fresh-source-verification";
export const OUTCOME_RECORD_AUTHORITY_V01 = "derived-outcome-record";

const CONDITION_TYPES = new Set([
  "github-default-branch-head-advanced",
  "github-commit-present-after-baseline",
]);
const REPORTED_STATES = new Set(["reported-success", "reported-failure", "reported-unknown"]);
const VERIFICATION_STATES = new Set(["verified", "failed", "indeterminate"]);
const SOURCE_FAILURE_CODES = new Set([
  "SOURCE_AUTH_REQUIRED",
  "SOURCE_FORBIDDEN",
  "SOURCE_NOT_FOUND",
  "SOURCE_RATE_LIMITED",
  "SOURCE_UNAVAILABLE",
  "SOURCE_RESPONSE_INVALID",
  "SOURCE_SCOPE_MISMATCH",
]);

const PROPOSAL_KEYS = ["proposalVersion", "reentryPackageRef", "actionRef", "conditionType", "expectedValue", "explanation"];
const BASELINE_KEYS = ["provider", "scopeRef", "cursorType", "value"];
const POSTCONDITION_KEYS = ["conditionType", "expectedValue"];
const ENVELOPE_KEYS = ["envelopeVersion", "envelopeId", "projectRef", "reentryPackageRef", "actionRef", "declaredAt", "baseline", "expectedPostcondition", "explanation", "authority"];
const OBSERVATION_KEYS = ["observationVersion", "observationId", "projectRef", "reentryPackageRef", "envelopeRef", "actionRef", "attemptedAt", "executionActor", "reportedState", "reportSummary", "authority"];
const SOURCE_FAILURE_KEYS = ["provider", "repositoryRef", "failedAt", "errorCode"];
const OBSERVED_POSTCONDITION_KEYS = ["baselineHead", "observedHead", "lineage", "expectedValueObserved"];
const VERIFICATION_CAPABILITY_KEYS = ["outcomeRecordAllowed", "nextCheckpointAllowed"];
const VERIFICATION_KEYS = ["verificationVersion", "verificationId", "projectRef", "reentryPackageRef", "envelopeRef", "actionObservationRef", "verifiedAt", "verificationState", "expectedPostcondition", "observedPostcondition", "verificationEvidenceRefs", "failureReason", "authority", "capabilities"];
const OUTCOME_CAPABILITY_KEYS = ["persistAllowed", "nextCheckpointAllowed"];
const OUTCOME_KEYS = ["outcomeVersion", "outcomeId", "projectRef", "reentryRef", "verificationEnvelopeRef", "actionObservationRef", "verificationRef", "actionRef", "attemptedAt", "executionActor", "expectedPostcondition", "observedPostcondition", "verificationState", "verificationEvidenceRefs", "failureReason", "recordedAt", "authority", "capabilities"];

const SHA = /^[0-9a-f]{40}$/;
const REF_MAX = 500;
const SUMMARY_MAX = 1000;
const EXPLANATION_MAX = 1800;

export class OutcomeVerificationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutcomeVerificationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code, message, details = {}) => { throw new OutcomeVerificationError(code, message, details); };

function boundedText(value, max, label, code) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${label} is invalid.`);
  return value;
}

function strictOffsetIso(value, label, code) {
  if (!isStrictOffsetIsoV01(value)) fail(code, `${label} must be a strict offset ISO timestamp.`);
  return value;
}

function uniqueStrings(values, label, code, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) fail(code, `${label} must be ${allowEmpty ? "an array" : "non-empty"}.`);
  const seen = new Set();
  for (const value of values) {
    boundedText(value, REF_MAX, label, code);
    if (seen.has(value)) fail(code, `${label} contains duplicates.`, { value });
    seen.add(value);
  }
  return clone(values);
}

function acceptedPackage(reentryPackage) {
  try { return validateReentryPackageV01(reentryPackage); }
  catch (error) { fail("INVALID_REENTRY_PACKAGE", "reentryPackage failed the accepted Re-entry Package validator.", { causeCode: error?.code }); }
}

function validatePostcondition(value, code) {
  if (!exact(value, POSTCONDITION_KEYS) || !CONDITION_TYPES.has(value.conditionType)) fail(code, "expectedPostcondition is invalid.");
  if (value.conditionType === "github-default-branch-head-advanced") {
    if (value.expectedValue !== null) fail(code, "head-advanced postcondition requires expectedValue=null.");
  } else if (typeof value.expectedValue !== "string" || !SHA.test(value.expectedValue)) {
    fail(code, "commit-present postcondition requires a lowercase 40-character expectedValue SHA.");
  }
  return clone(value);
}

function validateBaseline(value, code) {
  if (!exact(value, BASELINE_KEYS) || value.provider !== "github" || value.cursorType !== "default-branch-head") fail(code, "baseline is invalid.");
  boundedText(value.scopeRef, REF_MAX, "baseline.scopeRef", code);
  if (typeof value.value !== "string" || !SHA.test(value.value)) fail(code, "baseline.value must be a lowercase 40-character SHA.");
  return clone(value);
}

function envelopePayload(value) {
  const { envelopeId: _envelopeId, ...payload } = value;
  return payload;
}

export function validateActionVerificationEnvelopeV01(envelope) {
  const code = "INVALID_ACTION_VERIFICATION_ENVELOPE";
  if (!exact(envelope, ENVELOPE_KEYS) || envelope.envelopeVersion !== ACTION_VERIFICATION_ENVELOPE_VERSION_V01 || envelope.authority !== ACTION_VERIFICATION_ENVELOPE_AUTHORITY_V01) fail(code, "envelope field set/version/authority is invalid.");
  for (const key of ["envelopeId", "projectRef", "reentryPackageRef", "actionRef"]) boundedText(envelope[key], REF_MAX, key, code);
  strictOffsetIso(envelope.declaredAt, "declaredAt", code);
  validateBaseline(envelope.baseline, code);
  validatePostcondition(envelope.expectedPostcondition, code);
  boundedText(envelope.explanation, EXPLANATION_MAX, "explanation", code);
  const expectedId = `verification-envelope:${digest(envelopePayload(envelope)).slice(0, 24)}`;
  if (envelope.envelopeId !== expectedId) fail(code, "envelopeId does not bind normalized envelope content.");
  return deepFreeze(clone(envelope));
}

export function buildActionVerificationEnvelopeV01({ reentryPackage, postconditionProposal, declaredAt } = {}) {
  const pkg = acceptedPackage(reentryPackage);
  const code = "INVALID_POSTCONDITION_PROPOSAL";
  if (!exact(postconditionProposal, PROPOSAL_KEYS) || postconditionProposal.proposalVersion !== POSTCONDITION_PROPOSAL_VERSION_V01) fail(code, "postconditionProposal field set/version is invalid.");
  if (postconditionProposal.reentryPackageRef !== pkg.packageId || postconditionProposal.actionRef !== pkg.nextAction.actionRef) fail("OUTCOME_BINDING_MISMATCH", "postconditionProposal targets another package or action.");
  if (!CONDITION_TYPES.has(postconditionProposal.conditionType)) fail(code, "postconditionProposal.conditionType is unsupported.");
  boundedText(postconditionProposal.explanation, EXPLANATION_MAX, "postconditionProposal.explanation", code);
  strictOffsetIso(declaredAt, "declaredAt", "INVALID_VERIFICATION_ENVELOPE_INPUT");
  if (Date.parse(declaredAt) < Date.parse(pkg.preparedAt)) fail("INVALID_VERIFICATION_ENVELOPE_INPUT", "declaredAt cannot predate the Re-entry Package.");

  const expectedPostcondition = validatePostcondition({
    conditionType: postconditionProposal.conditionType,
    expectedValue: postconditionProposal.expectedValue,
  }, code);
  if (expectedPostcondition.conditionType === "github-commit-present-after-baseline") {
    const requiredEvidenceRef = `github:commit:${pkg.verificationPlan.scopeRef}:${expectedPostcondition.expectedValue}`;
    if (!pkg.evidenceRefs.includes(requiredEvidenceRef)) fail(code, "expected commit is not grounded in the Re-entry Package evidence universe.", { requiredEvidenceRef });
  }

  const payload = {
    envelopeVersion: ACTION_VERIFICATION_ENVELOPE_VERSION_V01,
    projectRef: pkg.projectRef,
    reentryPackageRef: pkg.packageId,
    actionRef: pkg.nextAction.actionRef,
    declaredAt,
    baseline: {
      provider: pkg.verificationPlan.provider,
      scopeRef: pkg.verificationPlan.scopeRef,
      cursorType: pkg.verificationPlan.cursorType,
      value: pkg.verificationPlan.baselineValue,
    },
    expectedPostcondition,
    explanation: postconditionProposal.explanation,
    authority: ACTION_VERIFICATION_ENVELOPE_AUTHORITY_V01,
  };
  return validateActionVerificationEnvelopeV01({ ...payload, envelopeId: `verification-envelope:${digest(payload).slice(0, 24)}` });
}

function observationPayload(value) {
  const { observationId: _observationId, ...payload } = value;
  return payload;
}

export function validateActionObservationV01(observation) {
  const code = "INVALID_ACTION_OBSERVATION";
  if (!exact(observation, OBSERVATION_KEYS) || observation.observationVersion !== ACTION_OBSERVATION_VERSION_V01 || observation.authority !== ACTION_OBSERVATION_AUTHORITY_V01 || !REPORTED_STATES.has(observation.reportedState)) fail(code, "observation field set/version/authority/state is invalid.");
  for (const key of ["observationId", "projectRef", "reentryPackageRef", "envelopeRef", "actionRef", "executionActor"]) boundedText(observation[key], REF_MAX, key, code);
  strictOffsetIso(observation.attemptedAt, "attemptedAt", code);
  boundedText(observation.reportSummary, SUMMARY_MAX, "reportSummary", code);
  const expectedId = `action-observation:${digest(observationPayload(observation)).slice(0, 24)}`;
  if (observation.observationId !== expectedId) fail(code, "observationId does not bind normalized observation content.");
  return deepFreeze(clone(observation));
}

export function buildActionObservationV01({ reentryPackage, envelope, attemptedAt, executionActor, reportedState, reportSummary } = {}) {
  const pkg = acceptedPackage(reentryPackage);
  const acceptedEnvelope = validateActionVerificationEnvelopeV01(envelope);
  if (acceptedEnvelope.projectRef !== pkg.projectRef || acceptedEnvelope.reentryPackageRef !== pkg.packageId || acceptedEnvelope.actionRef !== pkg.nextAction.actionRef || acceptedEnvelope.baseline.scopeRef !== pkg.verificationPlan.scopeRef || acceptedEnvelope.baseline.value !== pkg.verificationPlan.baselineValue) {
    fail("OUTCOME_BINDING_MISMATCH", "envelope does not bind the current Re-entry Package.");
  }
  strictOffsetIso(attemptedAt, "attemptedAt", "INVALID_ACTION_OBSERVATION_INPUT");
  if (Date.parse(attemptedAt) < Date.parse(acceptedEnvelope.declaredAt)) fail("INVALID_ACTION_OBSERVATION_INPUT", "attemptedAt cannot predate the declared verification envelope.");
  boundedText(executionActor, REF_MAX, "executionActor", "INVALID_ACTION_OBSERVATION_INPUT");
  if (!REPORTED_STATES.has(reportedState)) fail("INVALID_ACTION_OBSERVATION_INPUT", "reportedState is invalid.");
  boundedText(reportSummary, SUMMARY_MAX, "reportSummary", "INVALID_ACTION_OBSERVATION_INPUT");

  const payload = {
    observationVersion: ACTION_OBSERVATION_VERSION_V01,
    projectRef: pkg.projectRef,
    reentryPackageRef: pkg.packageId,
    envelopeRef: acceptedEnvelope.envelopeId,
    actionRef: pkg.nextAction.actionRef,
    attemptedAt,
    executionActor,
    reportedState,
    reportSummary,
    authority: ACTION_OBSERVATION_AUTHORITY_V01,
  };
  return validateActionObservationV01({ ...payload, observationId: `action-observation:${digest(payload).slice(0, 24)}` });
}

function validateSourceFailure(value, expectedRepositoryRef) {
  const code = "INVALID_POST_ACTION_SOURCE_FAILURE";
  if (!exact(value, SOURCE_FAILURE_KEYS) || value.provider !== "github" || !SOURCE_FAILURE_CODES.has(value.errorCode)) fail(code, "sourceFailure field set/provider/errorCode is invalid.");
  if (value.repositoryRef !== expectedRepositoryRef) fail("OUTCOME_BINDING_MISMATCH", "sourceFailure targets another repository.");
  strictOffsetIso(value.failedAt, "sourceFailure.failedAt", code);
  return deepFreeze(clone(value));
}

function verificationPayload(value) {
  const { verificationId: _verificationId, ...payload } = value;
  return payload;
}

export function validateOutcomeVerificationV01(verification) {
  const code = "INVALID_OUTCOME_VERIFICATION";
  if (!exact(verification, VERIFICATION_KEYS) || verification.verificationVersion !== OUTCOME_VERIFICATION_VERSION_V01 || verification.authority !== OUTCOME_VERIFICATION_AUTHORITY_V01 || !VERIFICATION_STATES.has(verification.verificationState)) fail(code, "verification field set/version/authority/state is invalid.");
  for (const key of ["verificationId", "projectRef", "reentryPackageRef", "envelopeRef", "actionObservationRef"]) boundedText(verification[key], REF_MAX, key, code);
  strictOffsetIso(verification.verifiedAt, "verifiedAt", code);
  validatePostcondition(verification.expectedPostcondition, code);
  if (!exact(verification.observedPostcondition, OBSERVED_POSTCONDITION_KEYS)) fail(code, "observedPostcondition field set is invalid.");
  const observed = verification.observedPostcondition;
  if (typeof observed.baselineHead !== "string" || !SHA.test(observed.baselineHead)) fail(code, "observedPostcondition.baselineHead is invalid.");
  if (observed.observedHead !== null && (typeof observed.observedHead !== "string" || !SHA.test(observed.observedHead))) fail(code, "observedPostcondition.observedHead is invalid.");
  if (observed.lineage !== null && !["identical", "ahead", "behind", "diverged"].includes(observed.lineage)) fail(code, "observedPostcondition.lineage is invalid.");
  if (observed.expectedValueObserved !== null && typeof observed.expectedValueObserved !== "boolean") fail(code, "observedPostcondition.expectedValueObserved is invalid.");
  uniqueStrings(verification.verificationEvidenceRefs, "verificationEvidenceRefs", code, { allowEmpty: true });
  if (verification.verificationState === "verified") {
    if (verification.failureReason !== null || verification.verificationEvidenceRefs.length === 0) fail(code, "verified outcome requires fresh evidence and no failureReason.");
  } else {
    boundedText(verification.failureReason, SUMMARY_MAX, "failureReason", code);
  }
  if (!exact(verification.capabilities, VERIFICATION_CAPABILITY_KEYS) || verification.capabilities.outcomeRecordAllowed !== true || verification.capabilities.nextCheckpointAllowed !== (verification.verificationState === "verified")) fail(code, "verification capabilities do not match state.");
  const expectedId = `outcome-verification:${digest(verificationPayload(verification)).slice(0, 24)}`;
  if (verification.verificationId !== expectedId) fail(code, "verificationId does not bind normalized verification content.");
  return deepFreeze(clone(verification));
}

function acceptedSnapshot(sourceSnapshot) {
  try { return validateGitHubSourceSnapshotV01(sourceSnapshot); }
  catch (error) { fail("INVALID_POST_ACTION_SOURCE_SNAPSHOT", "sourceSnapshot failed the accepted GitHub Source Snapshot validator.", { causeCode: error?.code }); }
}

function acceptedRangeProof(commitRangeProof) {
  try { return validateGitHubCommitRangeProofV01(commitRangeProof); }
  catch (error) { fail("INVALID_POST_ACTION_COMMIT_RANGE_PROOF", "commitRangeProof failed the accepted GitHub Commit Range Proof validator.", { causeCode: error?.code }); }
}

function bindVerificationInputs(pkg, envelope, observation) {
  if (envelope.projectRef !== pkg.projectRef || envelope.reentryPackageRef !== pkg.packageId || envelope.actionRef !== pkg.nextAction.actionRef || envelope.baseline.scopeRef !== pkg.verificationPlan.scopeRef || envelope.baseline.value !== pkg.verificationPlan.baselineValue) fail("OUTCOME_BINDING_MISMATCH", "verification envelope is not bound to the current package.");
  if (observation.projectRef !== pkg.projectRef || observation.reentryPackageRef !== pkg.packageId || observation.envelopeRef !== envelope.envelopeId || observation.actionRef !== pkg.nextAction.actionRef) fail("OUTCOME_BINDING_MISMATCH", "action observation is not bound to the current package/envelope.");
}

export function buildOutcomeVerificationV01({ reentryPackage, envelope, actionObservation, sourceSnapshot = null, sourceFailure = null, commitRangeProof = null, verifiedAt } = {}) {
  const pkg = acceptedPackage(reentryPackage);
  const acceptedEnvelope = validateActionVerificationEnvelopeV01(envelope);
  const observation = validateActionObservationV01(actionObservation);
  bindVerificationInputs(pkg, acceptedEnvelope, observation);
  strictOffsetIso(verifiedAt, "verifiedAt", "INVALID_OUTCOME_VERIFICATION_INPUT");
  if ((sourceSnapshot === null) === (sourceFailure === null)) fail("INVALID_OUTCOME_VERIFICATION_INPUT", "exactly one of sourceSnapshot or sourceFailure is required.");

  let verificationState;
  let observedPostcondition;
  let verificationEvidenceRefs = [];
  let failureReason;

  if (sourceFailure !== null) {
    const failure = validateSourceFailure(sourceFailure, acceptedEnvelope.baseline.scopeRef);
    if (Date.parse(failure.failedAt) <= Date.parse(observation.attemptedAt)) fail("INVALID_POST_ACTION_SOURCE_FAILURE", "source failure must occur after the action attempt.");
    if (Date.parse(verifiedAt) < Date.parse(failure.failedAt)) fail("INVALID_OUTCOME_VERIFICATION_INPUT", "verifiedAt cannot predate the source failure observation.");
    if (commitRangeProof !== null) fail("INVALID_OUTCOME_VERIFICATION_INPUT", "commitRangeProof cannot accompany a source failure.");
    verificationState = "indeterminate";
    observedPostcondition = {
      baselineHead: acceptedEnvelope.baseline.value,
      observedHead: null,
      lineage: null,
      expectedValueObserved: null,
    };
    failureReason = `source-read-${failure.errorCode.toLowerCase().replaceAll("_", "-")}`;
  } else {
    const snapshot = acceptedSnapshot(sourceSnapshot);
    if (snapshot.scope.repositoryRef !== acceptedEnvelope.baseline.scopeRef) fail("OUTCOME_BINDING_MISMATCH", "post-action Source Snapshot targets another repository.");
    if (Date.parse(snapshot.capturedAt) <= Date.parse(observation.attemptedAt)) fail("POST_ACTION_EVIDENCE_NOT_FRESH", "post-action Source Snapshot must be captured after the action attempt.");
    if (Date.parse(verifiedAt) < Date.parse(snapshot.capturedAt)) fail("INVALID_OUTCOME_VERIFICATION_INPUT", "verifiedAt cannot predate the fresh Source Snapshot.");
    const repository = snapshot.records.find(record => record.sourceType === "repository");
    const branch = snapshot.records.find(record => record.sourceType === "branch");
    if (!repository || !branch) fail("INVALID_POST_ACTION_SOURCE_SNAPSHOT", "post-action snapshot lacks repository/default-branch observations.");
    verificationEvidenceRefs = [repository.sourceRecordId, branch.sourceRecordId];
    const baseline = acceptedEnvelope.baseline.value;
    const observedHead = branch.payload.headSha;

    if (observedHead === baseline) {
      if (commitRangeProof !== null) {
        const proof = acceptedRangeProof(commitRangeProof);
        if (proof.repositoryRef !== acceptedEnvelope.baseline.scopeRef || proof.baseSha !== baseline || proof.headSha !== observedHead || proof.capturedAt !== snapshot.capturedAt || proof.relation !== "identical") fail("OUTCOME_BINDING_MISMATCH", "commitRangeProof does not bind the fresh unchanged-head observation.");
      }
      verificationState = "failed";
      observedPostcondition = {
        baselineHead: baseline,
        observedHead,
        lineage: "identical",
        expectedValueObserved: false,
      };
      failureReason = "expected-postcondition-not-observed";
    } else if (commitRangeProof === null) {
      verificationState = "indeterminate";
      observedPostcondition = {
        baselineHead: baseline,
        observedHead,
        lineage: null,
        expectedValueObserved: null,
      };
      failureReason = "commit-range-proof-missing";
    } else {
      const proof = acceptedRangeProof(commitRangeProof);
      if (proof.repositoryRef !== acceptedEnvelope.baseline.scopeRef || proof.baseSha !== baseline || proof.headSha !== observedHead || proof.capturedAt !== snapshot.capturedAt) fail("OUTCOME_BINDING_MISMATCH", "commitRangeProof does not bind the current baseline/head/snapshot time.");
      verificationEvidenceRefs.push(...proof.commits.map(record => record.sourceRecordId));

      if (!proof.complete) {
        verificationState = "indeterminate";
        observedPostcondition = {
          baselineHead: baseline,
          observedHead,
          lineage: proof.relation,
          expectedValueObserved: null,
        };
        failureReason = "commit-range-proof-incomplete";
      } else if (proof.relation !== "ahead") {
        verificationState = "indeterminate";
        observedPostcondition = {
          baselineHead: baseline,
          observedHead,
          lineage: proof.relation,
          expectedValueObserved: null,
        };
        failureReason = `unsafe-baseline-lineage-${proof.relation}`;
      } else if (acceptedEnvelope.expectedPostcondition.conditionType === "github-default-branch-head-advanced") {
        verificationState = "verified";
        observedPostcondition = {
          baselineHead: baseline,
          observedHead,
          lineage: "ahead",
          expectedValueObserved: true,
        };
        failureReason = null;
      } else {
        const expectedValueObserved = proof.commits.some(record => record.payload.sha === acceptedEnvelope.expectedPostcondition.expectedValue);
        verificationState = expectedValueObserved ? "verified" : "failed";
        observedPostcondition = {
          baselineHead: baseline,
          observedHead,
          lineage: "ahead",
          expectedValueObserved,
        };
        failureReason = expectedValueObserved ? null : "expected-commit-not-observed";
      }
    }
  }

  const payload = {
    verificationVersion: OUTCOME_VERIFICATION_VERSION_V01,
    projectRef: pkg.projectRef,
    reentryPackageRef: pkg.packageId,
    envelopeRef: acceptedEnvelope.envelopeId,
    actionObservationRef: observation.observationId,
    verifiedAt,
    verificationState,
    expectedPostcondition: clone(acceptedEnvelope.expectedPostcondition),
    observedPostcondition,
    verificationEvidenceRefs: [...new Set(verificationEvidenceRefs)],
    failureReason,
    authority: OUTCOME_VERIFICATION_AUTHORITY_V01,
    capabilities: {
      outcomeRecordAllowed: true,
      nextCheckpointAllowed: verificationState === "verified",
    },
  };
  return validateOutcomeVerificationV01({ ...payload, verificationId: `outcome-verification:${digest(payload).slice(0, 24)}` });
}

function outcomePayload(value) {
  const { outcomeId: _outcomeId, ...payload } = value;
  return payload;
}

export function validateOutcomeRecordV01(outcome) {
  const code = "INVALID_OUTCOME_RECORD";
  if (!exact(outcome, OUTCOME_KEYS) || outcome.outcomeVersion !== OUTCOME_RECORD_VERSION_V01 || outcome.authority !== OUTCOME_RECORD_AUTHORITY_V01 || !VERIFICATION_STATES.has(outcome.verificationState)) fail(code, "outcome field set/version/authority/state is invalid.");
  for (const key of ["outcomeId", "projectRef", "reentryRef", "verificationEnvelopeRef", "actionObservationRef", "verificationRef", "actionRef", "executionActor"]) boundedText(outcome[key], REF_MAX, key, code);
  strictOffsetIso(outcome.attemptedAt, "attemptedAt", code);
  strictOffsetIso(outcome.recordedAt, "recordedAt", code);
  validatePostcondition(outcome.expectedPostcondition, code);
  if (!exact(outcome.observedPostcondition, OBSERVED_POSTCONDITION_KEYS)) fail(code, "observedPostcondition field set is invalid.");
  const observed = outcome.observedPostcondition;
  if (typeof observed.baselineHead !== "string" || !SHA.test(observed.baselineHead)) fail(code, "observedPostcondition.baselineHead is invalid.");
  if (observed.observedHead !== null && (typeof observed.observedHead !== "string" || !SHA.test(observed.observedHead))) fail(code, "observedPostcondition.observedHead is invalid.");
  if (observed.lineage !== null && !["identical", "ahead", "behind", "diverged"].includes(observed.lineage)) fail(code, "observedPostcondition.lineage is invalid.");
  if (observed.expectedValueObserved !== null && typeof observed.expectedValueObserved !== "boolean") fail(code, "observedPostcondition.expectedValueObserved is invalid.");
  uniqueStrings(outcome.verificationEvidenceRefs, "verificationEvidenceRefs", code, { allowEmpty: true });
  if (outcome.verificationState === "verified") {
    if (outcome.failureReason !== null || outcome.verificationEvidenceRefs.length === 0) fail(code, "verified Outcome Record requires evidence and no failureReason.");
  } else {
    boundedText(outcome.failureReason, SUMMARY_MAX, "failureReason", code);
  }
  if (!exact(outcome.capabilities, OUTCOME_CAPABILITY_KEYS) || outcome.capabilities.persistAllowed !== true || outcome.capabilities.nextCheckpointAllowed !== (outcome.verificationState === "verified")) fail(code, "outcome capabilities do not match verification state.");
  const expectedId = `outcome:${digest(outcomePayload(outcome)).slice(0, 24)}`;
  if (outcome.outcomeId !== expectedId) fail(code, "outcomeId does not bind normalized Outcome Record content.");
  return deepFreeze(clone(outcome));
}

export function buildOutcomeRecordV01({ reentryPackage, envelope, actionObservation, verification, recordedAt } = {}) {
  const pkg = acceptedPackage(reentryPackage);
  const acceptedEnvelope = validateActionVerificationEnvelopeV01(envelope);
  const observation = validateActionObservationV01(actionObservation);
  const acceptedVerification = validateOutcomeVerificationV01(verification);
  bindVerificationInputs(pkg, acceptedEnvelope, observation);
  if (acceptedVerification.projectRef !== pkg.projectRef || acceptedVerification.reentryPackageRef !== pkg.packageId || acceptedVerification.envelopeRef !== acceptedEnvelope.envelopeId || acceptedVerification.actionObservationRef !== observation.observationId || !same(acceptedVerification.expectedPostcondition, acceptedEnvelope.expectedPostcondition)) {
    fail("OUTCOME_BINDING_MISMATCH", "verification does not bind the current package/envelope/observation.");
  }
  strictOffsetIso(recordedAt, "recordedAt", "INVALID_OUTCOME_RECORD_INPUT");
  if (Date.parse(recordedAt) < Date.parse(acceptedVerification.verifiedAt)) fail("INVALID_OUTCOME_RECORD_INPUT", "recordedAt cannot predate verification.");

  const payload = {
    outcomeVersion: OUTCOME_RECORD_VERSION_V01,
    projectRef: pkg.projectRef,
    reentryRef: pkg.packageId,
    verificationEnvelopeRef: acceptedEnvelope.envelopeId,
    actionObservationRef: observation.observationId,
    verificationRef: acceptedVerification.verificationId,
    actionRef: pkg.nextAction.actionRef,
    attemptedAt: observation.attemptedAt,
    executionActor: observation.executionActor,
    expectedPostcondition: clone(acceptedVerification.expectedPostcondition),
    observedPostcondition: clone(acceptedVerification.observedPostcondition),
    verificationState: acceptedVerification.verificationState,
    verificationEvidenceRefs: clone(acceptedVerification.verificationEvidenceRefs),
    failureReason: acceptedVerification.failureReason,
    recordedAt,
    authority: OUTCOME_RECORD_AUTHORITY_V01,
    capabilities: {
      persistAllowed: true,
      nextCheckpointAllowed: acceptedVerification.verificationState === "verified",
    },
  };
  return validateOutcomeRecordV01({ ...payload, outcomeId: `outcome:${digest(payload).slice(0, 24)}` });
}
