import { createHash } from "node:crypto";

import { validateTrustedCheckpointV01 } from "./trusted-checkpoint-validator.mjs";
import { validateFreshEvidenceWindowV01 } from "./fresh-evidence-window-validator.mjs";
import { validateContinuityAssessmentV01 } from "./continuity-assessment.mjs";

export const HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01 = "nexus-atlas.human-authority-question-proposal.v0.1";
export const HUMAN_AUTHORITY_QUESTION_VERSION_V01 = "nexus-atlas.human-authority-question.v0.1";
export const HUMAN_AUTHORITY_RESPONSE_VERSION_V01 = "nexus-atlas.human-authority-response.v0.1";
export const HUMAN_AUTHORITY_DECISION_VERSION_V01 = "nexus-atlas.human-authority-decision.v0.1";
export const HUMAN_AUTHORITY_QUESTION_AUTHORITY_V01 = "human-authority-required";
export const HUMAN_AUTHORITY_DECISION_AUTHORITY_V01 = "human";

const QUESTION_PROPOSAL_KEYS = ["proposalVersion", "assessmentRef", "ambiguityRef", "question", "options", "explanation"];
const OPTION_KEYS = ["optionRef", "label", "authorityValue", "nextAction"];
const ACTION_KEYS = ["actionRef", "summary", "basisRefs", "evidenceRefs"];
const QUESTION_KEYS = [
  "questionVersion",
  "questionId",
  "projectRef",
  "checkpointRef",
  "assessmentRef",
  "ambiguityRef",
  "protectedRef",
  "question",
  "options",
  "evidenceRefs",
  "explanation",
  "authority",
  "capabilities",
];
const QUESTION_CAPABILITY_KEYS = ["answerRequired", "reentryPackageAllowed"];
const RESPONSE_KEYS = ["responseVersion", "questionRef", "assessmentRef", "selectedOptionRef", "actorRef", "answeredAt"];
const DECISION_KEYS = [
  "decisionVersion",
  "decisionId",
  "projectRef",
  "checkpointRef",
  "assessmentRef",
  "questionRef",
  "ambiguityRef",
  "protectedRef",
  "selectedOptionRef",
  "authorityValue",
  "nextAction",
  "evidenceRefs",
  "actorRef",
  "answeredAt",
  "authority",
];

const QUESTION_MAX = 600;
const LABEL_MAX = 180;
const AUTHORITY_VALUE_MAX = 500;
const SUMMARY_MAX = 500;
const EXPLANATION_MAX = 1600;
const REF_MAX = 300;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

export class HumanAuthorityGateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HumanAuthorityGateError";
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
const fail = (code, message, details = {}) => { throw new HumanAuthorityGateError(code, message, details); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function boundedText(value, max, label, code = "INVALID_HUMAN_AUTHORITY_PROPOSAL") {
  if (typeof value !== "string" || value.length === 0 || value.length > max || value !== value.trim() || /[\r\n]/.test(value)) fail(code, `${label} is invalid.`);
  return value;
}

function strictOffsetIso(value, label, code) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(code, `${label} must be a strict offset ISO timestamp.`);
  return value;
}

function uniqueStrings(values, label, code, { min = 1 } = {}) {
  if (!Array.isArray(values) || values.length < min) fail(code, `${label} is invalid.`);
  const seen = new Set();
  for (const value of values) {
    boundedText(value, REF_MAX, label, code);
    if (seen.has(value)) fail(code, `${label} contains duplicate values.`, { value });
    seen.add(value);
  }
  return values;
}

function acceptedCheckpoint(checkpoint) {
  try {
    return validateTrustedCheckpointV01(checkpoint);
  } catch (error) {
    fail("INVALID_TRUSTED_CHECKPOINT", "checkpoint failed the accepted Trusted Checkpoint validator.", { causeCode: error?.code });
  }
}

function acceptedWindow(freshEvidenceWindow) {
  try {
    return validateFreshEvidenceWindowV01(freshEvidenceWindow);
  } catch (error) {
    fail("INVALID_FRESH_EVIDENCE_WINDOW", "freshEvidenceWindow failed the accepted Fresh Evidence Window validator.", { causeCode: error?.code });
  }
}

function acceptedAssessment(assessment) {
  try {
    return validateContinuityAssessmentV01(assessment);
  } catch (error) {
    fail("INVALID_CONTINUITY_ASSESSMENT", "assessment failed the accepted Continuity Assessment validator.", { causeCode: error?.code });
  }
}

function bindUpstream(checkpoint, freshEvidenceWindow, assessment) {
  const cp = acceptedCheckpoint(checkpoint);
  const window = acceptedWindow(freshEvidenceWindow);
  const accepted = acceptedAssessment(assessment);
  if (window.status !== "complete" || window.capabilities.assessmentAllowed !== true) fail("HUMAN_AUTHORITY_BINDING_MISMATCH", "Phase 6D requires a complete Fresh Evidence Window.");
  if (accepted.projectRef !== cp.projectRef || accepted.checkpointRef !== cp.checkpointId || accepted.evidenceWindowRef !== window.windowId || window.projectRef !== cp.projectRef || window.checkpointRef !== cp.checkpointId || !same(window.cursorFrom, cp.evidenceCursor)) {
    fail("HUMAN_AUTHORITY_BINDING_MISMATCH", "checkpoint, Fresh Evidence Window and assessment are not the same continuation boundary.");
  }
  return { checkpoint: cp, window, assessment: accepted };
}

function authorityBasisSet(checkpoint) {
  return new Set([...checkpoint.governingRefs, ...checkpoint.acceptedNextAction.basisRefs]);
}

function assessmentEvidenceSet(assessment) {
  return new Set(assessment.evidenceRefs);
}

function windowEvidenceSet(window) {
  return new Set(window.records.map(record => record.sourceRecordId));
}

function validateEvidenceRefs(refs, windowIds, assessmentIds, label, code) {
  uniqueStrings(refs, label, code);
  for (const ref of refs) {
    if (!windowIds.has(ref) || !assessmentIds.has(ref)) fail(code, `${label} contains evidence outside the current accepted window/assessment.`, { evidenceRef: ref });
  }
  return clone(refs);
}

function validateBasisRefs(refs, allowedBasis, label, code) {
  uniqueStrings(refs, label, code);
  for (const ref of refs) if (!allowedBasis.has(ref)) fail(code, `${label} invents governing authority.`, { basisRef: ref });
  return clone(refs);
}

function validateNextAction(raw, { allowedBasis, windowIds, assessmentIds, label, code }) {
  if (!exact(raw, ACTION_KEYS)) fail(code, `${label} field set is invalid.`);
  boundedText(raw.actionRef, REF_MAX, `${label}.actionRef`, code);
  boundedText(raw.summary, SUMMARY_MAX, `${label}.summary`, code);
  const basisRefs = validateBasisRefs(raw.basisRefs, allowedBasis, `${label}.basisRefs`, code);
  const evidenceRefs = validateEvidenceRefs(raw.evidenceRefs, windowIds, assessmentIds, `${label}.evidenceRefs`, code);
  return { actionRef: raw.actionRef, summary: raw.summary, basisRefs, evidenceRefs };
}

function questionPayload(question) {
  const { questionId: _questionId, ...payload } = question;
  return payload;
}

function decisionPayload(decision) {
  const { decisionId: _decisionId, ...payload } = decision;
  return payload;
}

function validateQuestionOptionShape(option, label, code = "INVALID_HUMAN_AUTHORITY_QUESTION") {
  if (!exact(option, OPTION_KEYS)) fail(code, `${label} field set is invalid.`);
  boundedText(option.optionRef, REF_MAX, `${label}.optionRef`, code);
  boundedText(option.label, LABEL_MAX, `${label}.label`, code);
  boundedText(option.authorityValue, AUTHORITY_VALUE_MAX, `${label}.authorityValue`, code);
  if (!exact(option.nextAction, ACTION_KEYS)) fail(code, `${label}.nextAction field set is invalid.`);
  boundedText(option.nextAction.actionRef, REF_MAX, `${label}.nextAction.actionRef`, code);
  boundedText(option.nextAction.summary, SUMMARY_MAX, `${label}.nextAction.summary`, code);
  uniqueStrings(option.nextAction.basisRefs, `${label}.nextAction.basisRefs`, code);
  uniqueStrings(option.nextAction.evidenceRefs, `${label}.nextAction.evidenceRefs`, code);
}

function unionOptionEvidence(options) {
  const result = [];
  const seen = new Set();
  for (const option of options) for (const ref of option.nextAction.evidenceRefs) if (!seen.has(ref)) {
    seen.add(ref);
    result.push(ref);
  }
  return result;
}

export function validateHumanAuthorityQuestionV01(question) {
  const code = "INVALID_HUMAN_AUTHORITY_QUESTION";
  if (!exact(question, QUESTION_KEYS) || question.questionVersion !== HUMAN_AUTHORITY_QUESTION_VERSION_V01 || question.authority !== HUMAN_AUTHORITY_QUESTION_AUTHORITY_V01) fail(code, "question field set/version/authority is invalid.");
  for (const key of ["questionId", "projectRef", "checkpointRef", "assessmentRef", "ambiguityRef", "protectedRef"]) boundedText(question[key], REF_MAX, key, code);
  boundedText(question.question, QUESTION_MAX, "question", code);
  boundedText(question.explanation, EXPLANATION_MAX, "explanation", code);
  if (!Array.isArray(question.options) || question.options.length < MIN_OPTIONS || question.options.length > MAX_OPTIONS) fail(code, "question options must contain 2–4 choices.");
  const optionRefs = new Set();
  const actionRefs = new Set();
  question.options.forEach((option, index) => {
    validateQuestionOptionShape(option, `options[${index}]`, code);
    if (optionRefs.has(option.optionRef)) fail(code, "question contains duplicate optionRef.", { optionRef: option.optionRef });
    if (actionRefs.has(option.nextAction.actionRef)) fail(code, "question options must represent distinct next actions.", { actionRef: option.nextAction.actionRef });
    optionRefs.add(option.optionRef);
    actionRefs.add(option.nextAction.actionRef);
  });
  uniqueStrings(question.evidenceRefs, "evidenceRefs", code);
  if (!same(question.evidenceRefs, unionOptionEvidence(question.options))) fail(code, "question evidenceRefs must be the deterministic option evidence union.");
  if (!exact(question.capabilities, QUESTION_CAPABILITY_KEYS) || question.capabilities.answerRequired !== true || question.capabilities.reentryPackageAllowed !== false) fail(code, "question capabilities are invalid.");
  const expectedId = `human-authority-question:${digest(questionPayload(question)).slice(0, 24)}`;
  if (question.questionId !== expectedId) fail(code, "questionId does not bind the normalized question payload.");
  return deepFreeze(clone(question));
}

export function buildHumanAuthorityQuestionV01({ checkpoint, freshEvidenceWindow, assessment, questionProposal } = {}) {
  const bound = bindUpstream(checkpoint, freshEvidenceWindow, assessment);
  const ambiguity = bound.assessment.unresolvedProtectedAmbiguity;
  if (bound.assessment.validity !== "AMBIGUOUS" || bound.assessment.capabilities.humanAuthorityRequired !== true || ambiguity === null) fail("HUMAN_AUTHORITY_NOT_REQUIRED", "a Human Authority question is permitted only for an accepted AMBIGUOUS assessment.");
  if (!exact(questionProposal, QUESTION_PROPOSAL_KEYS) || questionProposal.proposalVersion !== HUMAN_AUTHORITY_QUESTION_PROPOSAL_VERSION_V01) fail("INVALID_HUMAN_AUTHORITY_PROPOSAL", "questionProposal field set/version is invalid.");
  if (questionProposal.assessmentRef !== bound.assessment.assessmentId || questionProposal.ambiguityRef !== ambiguity.ambiguityRef) fail("HUMAN_AUTHORITY_BINDING_MISMATCH", "questionProposal does not bind the current assessment ambiguity.");
  boundedText(questionProposal.question, QUESTION_MAX, "questionProposal.question");
  boundedText(questionProposal.explanation, EXPLANATION_MAX, "questionProposal.explanation");
  if (!Array.isArray(questionProposal.options) || questionProposal.options.length < MIN_OPTIONS || questionProposal.options.length > MAX_OPTIONS) fail("INVALID_HUMAN_AUTHORITY_PROPOSAL", "questionProposal.options must contain 2–4 choices.");

  const allowedBasis = authorityBasisSet(bound.checkpoint);
  const windowIds = windowEvidenceSet(bound.window);
  const assessmentIds = assessmentEvidenceSet(bound.assessment);
  const optionRefs = new Set();
  const actionRefs = new Set();
  const options = questionProposal.options.map((raw, index) => {
    const label = `questionProposal.options[${index}]`;
    if (!exact(raw, OPTION_KEYS)) fail("INVALID_HUMAN_AUTHORITY_PROPOSAL", `${label} field set is invalid.`);
    boundedText(raw.optionRef, REF_MAX, `${label}.optionRef`);
    boundedText(raw.label, LABEL_MAX, `${label}.label`);
    boundedText(raw.authorityValue, AUTHORITY_VALUE_MAX, `${label}.authorityValue`);
    if (optionRefs.has(raw.optionRef)) fail("INVALID_HUMAN_AUTHORITY_PROPOSAL", "questionProposal contains duplicate optionRef.", { optionRef: raw.optionRef });
    optionRefs.add(raw.optionRef);
    const nextAction = validateNextAction(raw.nextAction, { allowedBasis, windowIds, assessmentIds, label: `${label}.nextAction`, code: "INVALID_HUMAN_AUTHORITY_PROPOSAL" });
    if (actionRefs.has(nextAction.actionRef)) fail("INVALID_HUMAN_AUTHORITY_PROPOSAL", "question options must contain distinct next actions.", { actionRef: nextAction.actionRef });
    actionRefs.add(nextAction.actionRef);
    return { optionRef: raw.optionRef, label: raw.label, authorityValue: raw.authorityValue, nextAction };
  });

  const payload = {
    questionVersion: HUMAN_AUTHORITY_QUESTION_VERSION_V01,
    projectRef: bound.checkpoint.projectRef,
    checkpointRef: bound.checkpoint.checkpointId,
    assessmentRef: bound.assessment.assessmentId,
    ambiguityRef: ambiguity.ambiguityRef,
    protectedRef: ambiguity.protectedRef,
    question: questionProposal.question,
    options,
    evidenceRefs: unionOptionEvidence(options),
    explanation: questionProposal.explanation,
    authority: HUMAN_AUTHORITY_QUESTION_AUTHORITY_V01,
    capabilities: { answerRequired: true, reentryPackageAllowed: false },
  };
  return validateHumanAuthorityQuestionV01({ ...payload, questionId: `human-authority-question:${digest(payload).slice(0, 24)}` });
}

export function validateHumanAuthorityDecisionV01(decision) {
  const code = "INVALID_HUMAN_AUTHORITY_DECISION";
  if (!exact(decision, DECISION_KEYS) || decision.decisionVersion !== HUMAN_AUTHORITY_DECISION_VERSION_V01 || decision.authority !== HUMAN_AUTHORITY_DECISION_AUTHORITY_V01) fail(code, "decision field set/version/authority is invalid.");
  for (const key of ["decisionId", "projectRef", "checkpointRef", "assessmentRef", "questionRef", "ambiguityRef", "protectedRef", "selectedOptionRef", "authorityValue", "actorRef"]) boundedText(decision[key], key === "authorityValue" ? AUTHORITY_VALUE_MAX : REF_MAX, key, code);
  strictOffsetIso(decision.answeredAt, "answeredAt", code);
  if (!exact(decision.nextAction, ACTION_KEYS)) fail(code, "decision nextAction field set is invalid.");
  boundedText(decision.nextAction.actionRef, REF_MAX, "nextAction.actionRef", code);
  boundedText(decision.nextAction.summary, SUMMARY_MAX, "nextAction.summary", code);
  uniqueStrings(decision.nextAction.basisRefs, "nextAction.basisRefs", code);
  uniqueStrings(decision.nextAction.evidenceRefs, "nextAction.evidenceRefs", code);
  uniqueStrings(decision.evidenceRefs, "evidenceRefs", code);
  if (!same(decision.evidenceRefs, decision.nextAction.evidenceRefs)) fail(code, "decision evidenceRefs must equal the selected option action evidenceRefs.");
  const expectedId = `human-authority-decision:${digest(decisionPayload(decision)).slice(0, 24)}`;
  if (decision.decisionId !== expectedId) fail(code, "decisionId does not bind the normalized decision payload.");
  return deepFreeze(clone(decision));
}

export function buildHumanAuthorityDecisionV01({ checkpoint, assessment, question, response } = {}) {
  const cp = acceptedCheckpoint(checkpoint);
  const accepted = acceptedAssessment(assessment);
  let acceptedQuestion;
  try {
    acceptedQuestion = validateHumanAuthorityQuestionV01(question);
  } catch (error) {
    fail("INVALID_HUMAN_AUTHORITY_QUESTION", "question failed the accepted Human Authority Question validator.", { causeCode: error?.code });
  }
  if (accepted.validity !== "AMBIGUOUS" || accepted.unresolvedProtectedAmbiguity === null || accepted.capabilities.humanAuthorityRequired !== true) fail("HUMAN_AUTHORITY_NOT_REQUIRED", "a Human Authority Decision is permitted only for an accepted AMBIGUOUS assessment.");
  if (accepted.projectRef !== cp.projectRef || accepted.checkpointRef !== cp.checkpointId || acceptedQuestion.projectRef !== cp.projectRef || acceptedQuestion.checkpointRef !== cp.checkpointId || acceptedQuestion.assessmentRef !== accepted.assessmentId || acceptedQuestion.ambiguityRef !== accepted.unresolvedProtectedAmbiguity.ambiguityRef || acceptedQuestion.protectedRef !== accepted.unresolvedProtectedAmbiguity.protectedRef) {
    fail("HUMAN_AUTHORITY_BINDING_MISMATCH", "checkpoint, assessment and question are not the same authority transaction.");
  }
  const code = "INVALID_HUMAN_AUTHORITY_RESPONSE";
  if (!exact(response, RESPONSE_KEYS) || response.responseVersion !== HUMAN_AUTHORITY_RESPONSE_VERSION_V01) fail(code, "response field set/version is invalid.");
  if (response.questionRef !== acceptedQuestion.questionId || response.assessmentRef !== accepted.assessmentId) fail("HUMAN_AUTHORITY_RESPONSE_MISMATCH", "response targets a different question or assessment.");
  boundedText(response.selectedOptionRef, REF_MAX, "response.selectedOptionRef", code);
  boundedText(response.actorRef, REF_MAX, "response.actorRef", code);
  strictOffsetIso(response.answeredAt, "response.answeredAt", code);
  const selected = acceptedQuestion.options.find(option => option.optionRef === response.selectedOptionRef);
  if (!selected) fail("HUMAN_AUTHORITY_RESPONSE_MISMATCH", "selectedOptionRef is not an option on the current question.");

  const payload = {
    decisionVersion: HUMAN_AUTHORITY_DECISION_VERSION_V01,
    projectRef: cp.projectRef,
    checkpointRef: cp.checkpointId,
    assessmentRef: accepted.assessmentId,
    questionRef: acceptedQuestion.questionId,
    ambiguityRef: acceptedQuestion.ambiguityRef,
    protectedRef: acceptedQuestion.protectedRef,
    selectedOptionRef: selected.optionRef,
    authorityValue: selected.authorityValue,
    nextAction: clone(selected.nextAction),
    evidenceRefs: clone(selected.nextAction.evidenceRefs),
    actorRef: response.actorRef,
    answeredAt: response.answeredAt,
    authority: HUMAN_AUTHORITY_DECISION_AUTHORITY_V01,
  };
  return validateHumanAuthorityDecisionV01({ ...payload, decisionId: `human-authority-decision:${digest(payload).slice(0, 24)}` });
}
