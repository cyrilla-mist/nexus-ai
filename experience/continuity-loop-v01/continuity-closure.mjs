import { createHash } from "node:crypto";

import { isStrictOffsetIsoV01 } from "../source-v01/source-snapshot-validator.mjs";
import { validateOutcomeRecordV01 } from "./outcome-verifier.mjs";
import { validateReentryPackageV01 } from "./reentry-package.mjs";
import {
  TRUSTED_CHECKPOINT_SCHEMA_V01,
  validateTrustedCheckpointV01,
} from "./trusted-checkpoint-validator.mjs";

export const NEXT_CHECKPOINT_PROPOSAL_VERSION_V01 = "nexus-atlas.next-checkpoint-proposal.v0.1";
export const CONTINUITY_CLOSURE_VERSION_V01 = "nexus-atlas.continuity-closure.v0.1";
export const CONTINUITY_CLOSURE_AUTHORITY_V01 = "verified-continuity-closure";
export const CONTINUITY_CLOSURE_ACTOR_V01 = "system:nexus-continuity-closure-v01";

const PROPOSAL_KEYS = ["proposalVersion", "outcomeRef", "proposedAt", "nextAction", "explanation"];
const ACTION_KEYS = ["actionRef", "summary", "basisRefs", "evidenceRefs"];
const RECEIPT_KEYS = [
  "closureVersion",
  "closureId",
  "projectRef",
  "previousCheckpointRef",
  "reentryPackageRef",
  "outcomeRef",
  "nextCheckpointRef",
  "previousVersion",
  "nextVersion",
  "closedAt",
  "outcomeDigest",
  "nextCheckpointDigest",
  "authority",
  "capabilities",
];
const RECEIPT_CAPABILITY_KEYS = ["nextReentryAllowed"];
const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const REF_MAX = 500;
const SUMMARY_MAX = 1000;
const EXPLANATION_MAX = 1800;

export class ContinuityClosureError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContinuityClosureError";
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
const fail = (code, message, details = {}) => { throw new ContinuityClosureError(code, message, details); };

function boundedText(value, max, label, code) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${label} is invalid.`);
  return value;
}

function strictOffsetIso(value, label, code) {
  if (!isStrictOffsetIsoV01(value)) fail(code, `${label} must be a strict offset ISO timestamp.`);
  return value;
}

function uniqueStrings(values, label, code) {
  if (!Array.isArray(values) || values.length === 0) fail(code, `${label} must be non-empty.`);
  const seen = new Set();
  for (const value of values) {
    boundedText(value, REF_MAX, label, code);
    if (seen.has(value)) fail(code, `${label} contains duplicates.`, { value });
    seen.add(value);
  }
  return clone(values);
}

function acceptedCheckpoint(previousCheckpoint) {
  try { return validateTrustedCheckpointV01(previousCheckpoint); }
  catch (error) { fail("INVALID_PREVIOUS_TRUSTED_CHECKPOINT", "previousCheckpoint failed the accepted Trusted Checkpoint validator.", { causeCode: error?.code }); }
}

function acceptedPackage(reentryPackage) {
  try { return validateReentryPackageV01(reentryPackage); }
  catch (error) { fail("INVALID_REENTRY_PACKAGE", "reentryPackage failed the accepted Re-entry Package validator.", { causeCode: error?.code }); }
}

function acceptedOutcome(outcome) {
  try { return validateOutcomeRecordV01(outcome); }
  catch (error) { fail("INVALID_OUTCOME_RECORD", "outcome failed the accepted Outcome Record validator.", { causeCode: error?.code }); }
}

function bindAdvancement(previousCheckpoint, reentryPackage, outcome) {
  const checkpoint = acceptedCheckpoint(previousCheckpoint);
  const pkg = acceptedPackage(reentryPackage);
  const accepted = acceptedOutcome(outcome);

  if (pkg.projectRef !== checkpoint.projectRef || pkg.checkpointRef !== checkpoint.checkpointId) {
    fail("CONTINUITY_CLOSURE_BINDING_MISMATCH", "Re-entry Package does not bind the previous Trusted Checkpoint.");
  }
  if (accepted.projectRef !== checkpoint.projectRef || accepted.reentryRef !== pkg.packageId || accepted.actionRef !== pkg.nextAction.actionRef) {
    fail("CONTINUITY_CLOSURE_BINDING_MISMATCH", "Outcome Record does not bind the current project/package/action.");
  }
  if (accepted.observedPostcondition?.baselineHead !== pkg.verificationPlan.baselineValue) {
    fail("CONTINUITY_CLOSURE_BINDING_MISMATCH", "Outcome Record baseline does not bind the Re-entry Package verification baseline.");
  }
  if (accepted.verificationState !== "verified" || accepted.capabilities.nextCheckpointAllowed !== true) {
    fail("OUTCOME_NOT_ADVANCABLE", "Only a verified Outcome Record with nextCheckpointAllowed=true may advance trusted state.");
  }
  if (accepted.observedPostcondition.lineage !== "ahead" || typeof accepted.observedPostcondition.observedHead !== "string" || !SHA.test(accepted.observedPostcondition.observedHead)) {
    fail("OUTCOME_NOT_ADVANCABLE", "Verified Outcome Record lacks a safe authoritative ahead head.");
  }

  return { checkpoint, pkg, outcome: accepted };
}

function validateNextCheckpointProposal(raw, bound) {
  const code = "INVALID_NEXT_CHECKPOINT_PROPOSAL";
  if (!exact(raw, PROPOSAL_KEYS) || raw.proposalVersion !== NEXT_CHECKPOINT_PROPOSAL_VERSION_V01) fail(code, "nextCheckpointProposal field set/version is invalid.");
  if (raw.outcomeRef !== bound.outcome.outcomeId) fail("CONTINUITY_CLOSURE_BINDING_MISMATCH", "nextCheckpointProposal targets another Outcome Record.");
  strictOffsetIso(raw.proposedAt, "nextCheckpointProposal.proposedAt", code);
  if (Date.parse(raw.proposedAt) < Date.parse(bound.outcome.recordedAt)) fail(code, "nextCheckpointProposal.proposedAt cannot predate the Outcome Record.");
  boundedText(raw.explanation, EXPLANATION_MAX, "nextCheckpointProposal.explanation", code);
  if (!exact(raw.nextAction, ACTION_KEYS)) fail(code, "nextCheckpointProposal.nextAction field set is invalid.");
  boundedText(raw.nextAction.actionRef, REF_MAX, "nextCheckpointProposal.nextAction.actionRef", code);
  boundedText(raw.nextAction.summary, SUMMARY_MAX, "nextCheckpointProposal.nextAction.summary", code);
  if (raw.nextAction.actionRef === bound.pkg.nextAction.actionRef) fail(code, "next checkpoint action must differ from the completed Re-entry Package action.");

  const basisRefs = uniqueStrings(raw.nextAction.basisRefs, "nextCheckpointProposal.nextAction.basisRefs", code);
  const allowedBasis = new Set([...bound.checkpoint.governingRefs, ...bound.checkpoint.acceptedNextAction.basisRefs]);
  for (const ref of basisRefs) if (!allowedBasis.has(ref)) fail(code, "next checkpoint action invents governing authority.", { basisRef: ref });

  const evidenceRefs = uniqueStrings(raw.nextAction.evidenceRefs, "nextCheckpointProposal.nextAction.evidenceRefs", code);
  const acceptedEvidence = new Set(bound.outcome.verificationEvidenceRefs);
  for (const ref of evidenceRefs) if (!acceptedEvidence.has(ref)) fail(code, "next checkpoint action cites evidence outside the verified Outcome Record.", { evidenceRef: ref });

  return deepFreeze(clone({
    proposalVersion: NEXT_CHECKPOINT_PROPOSAL_VERSION_V01,
    outcomeRef: raw.outcomeRef,
    proposedAt: raw.proposedAt,
    nextAction: {
      actionRef: raw.nextAction.actionRef,
      summary: raw.nextAction.summary,
      basisRefs,
      evidenceRefs,
    },
    explanation: raw.explanation,
  }));
}

function checkpointIdentityPayload(bound, proposal) {
  return {
    previousCheckpointRef: bound.checkpoint.checkpointId,
    previousVersion: bound.checkpoint.version,
    reentryPackageRef: bound.pkg.packageId,
    outcomeRef: bound.outcome.outcomeId,
    proposedAt: proposal.proposedAt,
    nextAction: proposal.nextAction,
  };
}

export function buildNextTrustedCheckpointV01({ previousCheckpoint, reentryPackage, outcome, nextCheckpointProposal } = {}) {
  const bound = bindAdvancement(previousCheckpoint, reentryPackage, outcome);
  const proposal = validateNextCheckpointProposal(nextCheckpointProposal, bound);
  const checkpointId = `checkpoint:${digest(checkpointIdentityPayload(bound, proposal)).slice(0, 24)}`;

  const candidate = {
    checkpointSchemaVersion: TRUSTED_CHECKPOINT_SCHEMA_V01,
    checkpointId,
    projectRef: bound.checkpoint.projectRef,
    version: bound.checkpoint.version + 1,
    createdAt: proposal.proposedAt,
    trustedDirection: bound.checkpoint.trustedDirection,
    activeObjective: bound.checkpoint.activeObjective,
    acceptedNextAction: {
      actionRef: proposal.nextAction.actionRef,
      summary: proposal.nextAction.summary,
      basisRefs: clone(proposal.nextAction.basisRefs),
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: bound.pkg.verificationPlan.scopeRef,
      cursorType: "default-branch-head",
      value: bound.outcome.observedPostcondition.observedHead,
      capturedAt: bound.outcome.recordedAt,
    },
    governingRefs: clone(bound.checkpoint.governingRefs),
    unresolvedProtectedAmbiguities: clone(bound.checkpoint.unresolvedProtectedAmbiguities),
    provenance: {
      provider: "nexus-continuity-closure",
      authority: "verified-outcome",
      references: [bound.outcome.outcomeId, bound.pkg.packageId, ...proposal.nextAction.evidenceRefs],
    },
    confirmation: {
      state: "confirmed",
      authority: "verified-outcome",
      actorRef: CONTINUITY_CLOSURE_ACTOR_V01,
      confirmedAt: proposal.proposedAt,
      basisRef: bound.outcome.outcomeId,
    },
  };

  try { return validateTrustedCheckpointV01(candidate); }
  catch (error) { fail("NEXT_CHECKPOINT_VALIDATION_FAILED", "derived next Trusted Checkpoint failed the frozen validator.", { causeCode: error?.code }); }
}

function receiptPayload(value) {
  const { closureId: _closureId, ...payload } = value;
  return payload;
}

export function validateContinuityClosureReceiptV01(receipt) {
  const code = "INVALID_CONTINUITY_CLOSURE_RECEIPT";
  if (!exact(receipt, RECEIPT_KEYS) || receipt.closureVersion !== CONTINUITY_CLOSURE_VERSION_V01 || receipt.authority !== CONTINUITY_CLOSURE_AUTHORITY_V01) fail(code, "closure receipt field set/version/authority is invalid.");
  for (const key of ["closureId", "projectRef", "previousCheckpointRef", "reentryPackageRef", "outcomeRef", "nextCheckpointRef"]) boundedText(receipt[key], REF_MAX, key, code);
  if (!Number.isSafeInteger(receipt.previousVersion) || receipt.previousVersion < 1 || !Number.isSafeInteger(receipt.nextVersion) || receipt.nextVersion !== receipt.previousVersion + 1) fail(code, "closure receipt versions are invalid.");
  strictOffsetIso(receipt.closedAt, "closedAt", code);
  if (typeof receipt.outcomeDigest !== "string" || !DIGEST.test(receipt.outcomeDigest) || typeof receipt.nextCheckpointDigest !== "string" || !DIGEST.test(receipt.nextCheckpointDigest)) fail(code, "closure receipt artifact digests are invalid.");
  if (!exact(receipt.capabilities, RECEIPT_CAPABILITY_KEYS) || receipt.capabilities.nextReentryAllowed !== true) fail(code, "closure receipt capabilities are invalid.");
  const expectedId = `continuity-closure:${digest(receiptPayload(receipt)).slice(0, 24)}`;
  if (receipt.closureId !== expectedId) fail(code, "closureId does not bind the normalized closure receipt payload.");
  return deepFreeze(clone(receipt));
}

export function buildContinuityClosureReceiptV01({ previousCheckpoint, reentryPackage, outcome, nextCheckpoint } = {}) {
  const bound = bindAdvancement(previousCheckpoint, reentryPackage, outcome);
  let acceptedNext;
  try { acceptedNext = validateTrustedCheckpointV01(nextCheckpoint); }
  catch (error) { fail("INVALID_NEXT_TRUSTED_CHECKPOINT", "nextCheckpoint failed the frozen Trusted Checkpoint validator.", { causeCode: error?.code }); }

  if (acceptedNext.projectRef !== bound.checkpoint.projectRef || acceptedNext.version !== bound.checkpoint.version + 1 || acceptedNext.confirmation.authority !== "verified-outcome" || acceptedNext.confirmation.basisRef !== bound.outcome.outcomeId) {
    fail("CONTINUITY_CLOSURE_BINDING_MISMATCH", "nextCheckpoint does not bind the verified closure transition.");
  }

  const payload = {
    closureVersion: CONTINUITY_CLOSURE_VERSION_V01,
    projectRef: bound.checkpoint.projectRef,
    previousCheckpointRef: bound.checkpoint.checkpointId,
    reentryPackageRef: bound.pkg.packageId,
    outcomeRef: bound.outcome.outcomeId,
    nextCheckpointRef: acceptedNext.checkpointId,
    previousVersion: bound.checkpoint.version,
    nextVersion: acceptedNext.version,
    closedAt: acceptedNext.createdAt,
    outcomeDigest: digest(bound.outcome),
    nextCheckpointDigest: digest(acceptedNext),
    authority: CONTINUITY_CLOSURE_AUTHORITY_V01,
    capabilities: { nextReentryAllowed: true },
  };
  return validateContinuityClosureReceiptV01({ ...payload, closureId: `continuity-closure:${digest(payload).slice(0, 24)}` });
}

function validateStoreBoundary(outcomeStore, checkpointStore) {
  if (!outcomeStore || typeof outcomeStore.appendOutcome !== "function" || typeof outcomeStore.readOutcome !== "function") fail("INVALID_CONTINUITY_CLOSURE_STORE", "outcomeStore must expose appendOutcome and readOutcome.");
  if (!checkpointStore || typeof checkpointStore.writeCheckpoint !== "function" || typeof checkpointStore.readLatest !== "function") fail("INVALID_CONTINUITY_CLOSURE_STORE", "checkpointStore must expose writeCheckpoint and readLatest.");
}

function idempotencyKey(value, label) {
  return boundedText(value, REF_MAX, label, "INVALID_CONTINUITY_CLOSURE_INPUT");
}

export async function closeVerifiedContinuityV01({
  previousCheckpoint,
  reentryPackage,
  outcome,
  nextCheckpointProposal,
  outcomeStore,
  checkpointStore,
  outcomeIdempotencyKey,
  checkpointIdempotencyKey,
} = {}) {
  validateStoreBoundary(outcomeStore, checkpointStore);
  const bound = bindAdvancement(previousCheckpoint, reentryPackage, outcome);
  const outcomeKey = idempotencyKey(outcomeIdempotencyKey, "outcomeIdempotencyKey");
  const checkpointKey = idempotencyKey(checkpointIdempotencyKey, "checkpointIdempotencyKey");
  const nextCheckpoint = buildNextTrustedCheckpointV01({
    previousCheckpoint: bound.checkpoint,
    reentryPackage: bound.pkg,
    outcome: bound.outcome,
    nextCheckpointProposal,
  });

  const outcomeWrite = await outcomeStore.appendOutcome({ outcome: bound.outcome, idempotencyKey: outcomeKey });
  const outcomeReadBack = await outcomeStore.readOutcome({ projectRef: bound.outcome.projectRef, outcomeId: bound.outcome.outcomeId });
  if (!outcomeReadBack || !same(outcomeReadBack, bound.outcome)) fail("OUTCOME_READBACK_MISMATCH", "Outcome Record append could not be verified by exact read-back.");

  const checkpointWrite = await checkpointStore.writeCheckpoint({
    checkpoint: nextCheckpoint,
    expectedVersion: bound.checkpoint.version,
    idempotencyKey: checkpointKey,
  });
  const checkpointReadBack = await checkpointStore.readLatest({ projectRef: bound.checkpoint.projectRef });
  if (!checkpointReadBack || !same(checkpointReadBack, nextCheckpoint)) fail("CHECKPOINT_READBACK_MISMATCH", "Trusted Checkpoint write could not be verified by exact read-back.");

  const receipt = buildContinuityClosureReceiptV01({
    previousCheckpoint: bound.checkpoint,
    reentryPackage: bound.pkg,
    outcome: outcomeReadBack,
    nextCheckpoint: checkpointReadBack,
  });

  return deepFreeze({
    outcome: clone(outcomeReadBack),
    outcomeReplayed: outcomeWrite.replayed === true,
    nextCheckpoint: clone(checkpointReadBack),
    checkpointReplayed: checkpointWrite.replayed === true,
    receipt,
  });
}
