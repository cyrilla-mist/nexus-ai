import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "./trusted-checkpoint-validator.mjs";
import { validateFreshEvidenceWindowV01 } from "./fresh-evidence-window-validator.mjs";
import { validateContinuityAssessmentV01 } from "./continuity-assessment.mjs";
import { validateHumanAuthorityDecisionV01 } from "./human-authority-gate.mjs";

export const REPLACEMENT_ACTION_PROPOSAL_VERSION_V01 = "nexus-atlas.replacement-action-proposal.v0.1";
export const REENTRY_PACKAGE_VERSION_V01 = "nexus-atlas.reentry-package.v0.1";
export const REENTRY_PACKAGE_AUTHORITY_V01 = "derived-reentry-package";

const REPLACEMENT_KEYS = ["proposalVersion", "assessmentRef", "actionRef", "summary", "basisRefs", "evidenceRefs", "explanation"];
const ACTION_KEYS = ["actionRef", "summary", "basisRefs", "evidenceRefs"];
const VERIFICATION_KEYS = ["provider", "scopeRef", "cursorType", "baselineValue", "requirement"];
const PACKAGE_KEYS = [
  "packageVersion",
  "packageId",
  "projectRef",
  "checkpointRef",
  "assessmentRef",
  "evidenceWindowRef",
  "preparedAt",
  "validity",
  "nextAction",
  "humanAuthorityDecisionRef",
  "verificationPlan",
  "evidenceRefs",
  "authority",
  "capabilities",
];
const CAPABILITY_KEYS = ["externalExecutionRequired", "freshVerificationRequired", "autonomousExecutionAllowed", "checkpointWriteAllowed", "outcomeWriteAllowed"];
const VALIDITIES = new Set(["VALID", "INVALID", "AMBIGUOUS"]);
const SUMMARY_MAX = 500;
const EXPLANATION_MAX = 1600;
const REF_MAX = 300;

export class ReentryPackageError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ReentryPackageError";
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
const fail = (code, message, details = {}) => { throw new ReentryPackageError(code, message, details); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function boundedText(value, max, label, code) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${label} is invalid.`);
  return value;
}

function strictOffsetIso(value, label, code) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(code, `${label} must be a strict offset ISO timestamp.`);
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
  return values;
}

function acceptedCheckpoint(checkpoint) {
  try { return validateTrustedCheckpointV01(checkpoint); }
  catch (error) { fail("INVALID_TRUSTED_CHECKPOINT", "checkpoint failed the accepted Trusted Checkpoint validator.", { causeCode: error?.code }); }
}
function acceptedWindow(freshEvidenceWindow) {
  try { return validateFreshEvidenceWindowV01(freshEvidenceWindow); }
  catch (error) { fail("INVALID_FRESH_EVIDENCE_WINDOW", "freshEvidenceWindow failed the accepted Fresh Evidence Window validator.", { causeCode: error?.code }); }
}
function acceptedAssessment(assessment) {
  try { return validateContinuityAssessmentV01(assessment); }
  catch (error) { fail("INVALID_CONTINUITY_ASSESSMENT", "assessment failed the accepted Continuity Assessment validator.", { causeCode: error?.code }); }
}

function bindUpstream(checkpoint, freshEvidenceWindow, assessment) {
  const cp = acceptedCheckpoint(checkpoint);
  const window = acceptedWindow(freshEvidenceWindow);
  const accepted = acceptedAssessment(assessment);
  if (window.status !== "complete") fail("REENTRY_BINDING_MISMATCH", "Re-entry Package requires a complete Fresh Evidence Window.");
  if (accepted.projectRef !== cp.projectRef || accepted.checkpointRef !== cp.checkpointId || accepted.evidenceWindowRef !== window.windowId || window.projectRef !== cp.projectRef || window.checkpointRef !== cp.checkpointId || !same(window.cursorFrom, cp.evidenceCursor)) {
    fail("REENTRY_BINDING_MISMATCH", "checkpoint, Fresh Evidence Window and assessment are not the same continuation boundary.");
  }
  return { checkpoint: cp, window, assessment: accepted };
}

function authorityBasisSet(checkpoint) {
  return new Set([...checkpoint.governingRefs, ...checkpoint.acceptedNextAction.basisRefs]);
}
function windowEvidenceSet(window) {
  return new Set(window.records.map(record => record.sourceRecordId));
}
function assessmentEvidenceSet(assessment) {
  return new Set(assessment.evidenceRefs);
}

function validateEvidenceRefs(refs, windowIds, assessmentIds, label, code) {
  uniqueStrings(refs, label, code);
  for (const ref of refs) if (!windowIds.has(ref) || !assessmentIds.has(ref)) fail(code, `${label} contains evidence outside the current accepted source/assessment boundary.`, { evidenceRef: ref });
  return clone(refs);
}
function validateBasisRefs(refs, allowed, label, code) {
  uniqueStrings(refs, label, code);
  for (const ref of refs) if (!allowed.has(ref)) fail(code, `${label} invents governing authority.`, { basisRef: ref });
  return clone(refs);
}

function validateAction(raw, { allowedBasis, windowIds, assessmentIds, code, label }) {
  if (!exact(raw, ACTION_KEYS)) fail(code, `${label} field set is invalid.`);
  boundedText(raw.actionRef, REF_MAX, `${label}.actionRef`, code);
  boundedText(raw.summary, SUMMARY_MAX, `${label}.summary`, code);
  return {
    actionRef: raw.actionRef,
    summary: raw.summary,
    basisRefs: validateBasisRefs(raw.basisRefs, allowedBasis, `${label}.basisRefs`, code),
    evidenceRefs: validateEvidenceRefs(raw.evidenceRefs, windowIds, assessmentIds, `${label}.evidenceRefs`, code),
  };
}

function validateReplacement(raw, bound) {
  const code = "INVALID_REPLACEMENT_ACTION_PROPOSAL";
  if (!exact(raw, REPLACEMENT_KEYS) || raw.proposalVersion !== REPLACEMENT_ACTION_PROPOSAL_VERSION_V01) fail(code, "replacementActionProposal field set/version is invalid.");
  if (raw.assessmentRef !== bound.assessment.assessmentId) fail("REENTRY_BINDING_MISMATCH", "replacementActionProposal targets another assessment.");
  boundedText(raw.explanation, EXPLANATION_MAX, "replacementActionProposal.explanation", code);
  const action = validateAction(raw, {
    allowedBasis: authorityBasisSet(bound.checkpoint),
    windowIds: windowEvidenceSet(bound.window),
    assessmentIds: assessmentEvidenceSet(bound.assessment),
    code,
    label: "replacementActionProposal",
  });
  if (action.actionRef === bound.checkpoint.acceptedNextAction.actionRef) fail(code, "replacement action must differ from the invalidated checkpoint next action.");
  return action;
}

function packagePayload(value) {
  const { packageId: _packageId, ...payload } = value;
  return payload;
}

export function validateReentryPackageV01(pkg) {
  const code = "INVALID_REENTRY_PACKAGE";
  if (!exact(pkg, PACKAGE_KEYS) || pkg.packageVersion !== REENTRY_PACKAGE_VERSION_V01 || pkg.authority !== REENTRY_PACKAGE_AUTHORITY_V01 || !VALIDITIES.has(pkg.validity)) fail(code, "package field set/version/authority/validity is invalid.");
  for (const key of ["packageId", "projectRef", "checkpointRef", "assessmentRef", "evidenceWindowRef"]) boundedText(pkg[key], REF_MAX, key, code);
  strictOffsetIso(pkg.preparedAt, "preparedAt", code);
  if (!exact(pkg.nextAction, ACTION_KEYS)) fail(code, "nextAction field set is invalid.");
  boundedText(pkg.nextAction.actionRef, REF_MAX, "nextAction.actionRef", code);
  boundedText(pkg.nextAction.summary, SUMMARY_MAX, "nextAction.summary", code);
  uniqueStrings(pkg.nextAction.basisRefs, "nextAction.basisRefs", code);
  uniqueStrings(pkg.nextAction.evidenceRefs, "nextAction.evidenceRefs", code);
  if (pkg.humanAuthorityDecisionRef !== null) boundedText(pkg.humanAuthorityDecisionRef, REF_MAX, "humanAuthorityDecisionRef", code);
  if (!exact(pkg.verificationPlan, VERIFICATION_KEYS) || pkg.verificationPlan.provider !== "github" || pkg.verificationPlan.cursorType !== "default-branch-head" || pkg.verificationPlan.requirement !== "fresh-authoritative-reread") fail(code, "verificationPlan is invalid.");
  boundedText(pkg.verificationPlan.scopeRef, REF_MAX, "verificationPlan.scopeRef", code);
  if (typeof pkg.verificationPlan.baselineValue !== "string" || !/^[0-9a-f]{40}$/.test(pkg.verificationPlan.baselineValue)) fail(code, "verificationPlan.baselineValue must be a lowercase 40-character SHA.");
  uniqueStrings(pkg.evidenceRefs, "evidenceRefs", code);
  if (!same(pkg.evidenceRefs, pkg.nextAction.evidenceRefs)) fail(code, "package evidenceRefs must equal nextAction evidenceRefs.");
  if (!exact(pkg.capabilities, CAPABILITY_KEYS) || pkg.capabilities.externalExecutionRequired !== true || pkg.capabilities.freshVerificationRequired !== true || pkg.capabilities.autonomousExecutionAllowed !== false || pkg.capabilities.checkpointWriteAllowed !== false || pkg.capabilities.outcomeWriteAllowed !== false) fail(code, "package capabilities are invalid.");
  if ((pkg.validity === "AMBIGUOUS") !== (pkg.humanAuthorityDecisionRef !== null)) fail(code, "humanAuthorityDecisionRef does not match package validity.");
  const expectedId = `reentry-package:${digest(packagePayload(pkg)).slice(0, 24)}`;
  if (pkg.packageId !== expectedId) fail(code, "packageId does not bind the normalized package payload.");
  return deepFreeze(clone(pkg));
}

export function buildReentryPackageV01({ checkpoint, freshEvidenceWindow, assessment, replacementActionProposal = null, humanAuthorityDecision = null, preparedAt } = {}) {
  const bound = bindUpstream(checkpoint, freshEvidenceWindow, assessment);
  strictOffsetIso(preparedAt, "preparedAt", "INVALID_REENTRY_PACKAGE_INPUT");
  const allowedBasis = authorityBasisSet(bound.checkpoint);
  const windowIds = windowEvidenceSet(bound.window);
  const assessmentIds = assessmentEvidenceSet(bound.assessment);
  let nextAction;
  let decisionRef = null;

  if (bound.assessment.validity === "VALID") {
    if (replacementActionProposal !== null || humanAuthorityDecision !== null) fail("REENTRY_STATE_MISMATCH", "VALID re-entry accepts neither replacement proposal nor Human Authority Decision.");
    const acceptedActionFinding = bound.assessment.preservedClaims.find(item => item.claimType === "accepted-next-action");
    if (!acceptedActionFinding) fail("REENTRY_STATE_MISMATCH", "VALID assessment lacks the preserved accepted-next-action surface.");
    nextAction = {
      actionRef: bound.checkpoint.acceptedNextAction.actionRef,
      summary: bound.checkpoint.acceptedNextAction.summary,
      basisRefs: clone(bound.checkpoint.acceptedNextAction.basisRefs),
      evidenceRefs: validateEvidenceRefs(acceptedActionFinding.evidenceRefs, windowIds, assessmentIds, "VALID nextAction evidenceRefs", "REENTRY_EVIDENCE_INVALID"),
    };
  } else if (bound.assessment.validity === "INVALID") {
    if (humanAuthorityDecision !== null) fail("REENTRY_STATE_MISMATCH", "INVALID re-entry must not consume Human Authority Decision.");
    if (replacementActionProposal === null) fail("REENTRY_REPLACEMENT_REQUIRED", "INVALID re-entry requires one bounded replacement action proposal.");
    nextAction = validateReplacement(replacementActionProposal, bound);
  } else {
    if (replacementActionProposal !== null) fail("REENTRY_STATE_MISMATCH", "AMBIGUOUS re-entry must not consume an INVALID replacement proposal.");
    if (humanAuthorityDecision === null) fail("HUMAN_AUTHORITY_REQUIRED", "AMBIGUOUS re-entry requires an accepted current Human Authority Decision.");
    let decision;
    try { decision = validateHumanAuthorityDecisionV01(humanAuthorityDecision); }
    catch (error) { fail("INVALID_HUMAN_AUTHORITY_DECISION", "humanAuthorityDecision failed the accepted decision validator.", { causeCode: error?.code }); }
    const ambiguity = bound.assessment.unresolvedProtectedAmbiguity;
    if (decision.projectRef !== bound.checkpoint.projectRef || decision.checkpointRef !== bound.checkpoint.checkpointId || decision.assessmentRef !== bound.assessment.assessmentId || ambiguity === null || decision.ambiguityRef !== ambiguity.ambiguityRef || decision.protectedRef !== ambiguity.protectedRef) {
      fail("REENTRY_BINDING_MISMATCH", "Human Authority Decision does not resolve the current assessment ambiguity.");
    }
    nextAction = validateAction(decision.nextAction, { allowedBasis, windowIds, assessmentIds, code: "INVALID_HUMAN_AUTHORITY_DECISION", label: "humanAuthorityDecision.nextAction" });
    if (!same(nextAction.evidenceRefs, decision.evidenceRefs)) fail("INVALID_HUMAN_AUTHORITY_DECISION", "decision evidenceRefs do not match selected next action.");
    decisionRef = decision.decisionId;
  }

  const payload = {
    packageVersion: REENTRY_PACKAGE_VERSION_V01,
    projectRef: bound.checkpoint.projectRef,
    checkpointRef: bound.checkpoint.checkpointId,
    assessmentRef: bound.assessment.assessmentId,
    evidenceWindowRef: bound.window.windowId,
    preparedAt,
    validity: bound.assessment.validity,
    nextAction,
    humanAuthorityDecisionRef: decisionRef,
    verificationPlan: {
      provider: "github",
      scopeRef: bound.window.source.repositoryRef,
      cursorType: "default-branch-head",
      baselineValue: bound.window.cursorTo.value,
      requirement: "fresh-authoritative-reread",
    },
    evidenceRefs: clone(nextAction.evidenceRefs),
    authority: REENTRY_PACKAGE_AUTHORITY_V01,
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
