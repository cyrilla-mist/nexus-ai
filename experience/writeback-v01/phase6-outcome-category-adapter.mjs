import { createHash } from "node:crypto";

import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { getOutcomeCategoryDescriptorV01 } from "./writeback-outcome-category.mjs";

export const CATEGORIZED_OUTCOME_REFERENCE_VERSION_V01 = "nexus-atlas.categorized-outcome-reference.v0.1";
export const CATEGORIZED_OUTCOME_REFERENCE_AUTHORITY_V01 = "derived-from-accepted-outcome";

const KEYS = [
  "referenceVersion",
  "referenceId",
  "projectRef",
  "outcomeRef",
  "categoryRef",
  "category",
  "subjectRef",
  "verificationState",
  "recordedAt",
  "evidenceRefs",
  "sourceAuthority",
  "authority",
  "capabilities",
];
const CAPABILITY_KEYS = [
  "historyReferenceAllowed",
  "checkpointAdvanceAuthority",
  "canonicalContextWriteAllowed",
];

export class Phase6OutcomeCategoryAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "Phase6OutcomeCategoryAdapterError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => Array.isArray(value)
  ? value.map(clone)
  : object(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]))
    : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const fail = (code, message, details = {}) => { throw new Phase6OutcomeCategoryAdapterError(code, message, details); };

function boundedText(value, field, max = 1000) {
  if (typeof value !== "string" || !value.length || value !== value.trim() || value.length > max || /[\r\n]/.test(value)) {
    fail("INVALID_CATEGORIZED_OUTCOME_REFERENCE", `${field} is invalid.`, { field });
  }
  return value;
}

function referencePayload(value) {
  const { referenceId: _referenceId, ...payload } = value;
  return payload;
}

export function validateCategorizedOutcomeReferenceV01(value) {
  const code = "INVALID_CATEGORIZED_OUTCOME_REFERENCE";
  if (!exact(value, KEYS) || value.referenceVersion !== CATEGORIZED_OUTCOME_REFERENCE_VERSION_V01) fail(code, "Categorized Outcome reference field set/version is invalid.");
  if (value.authority !== CATEGORIZED_OUTCOME_REFERENCE_AUTHORITY_V01) fail(code, "Categorized Outcome reference authority is invalid.");
  for (const field of ["referenceId", "projectRef", "outcomeRef", "categoryRef", "category", "subjectRef", "verificationState", "recordedAt", "sourceAuthority"]) boundedText(value[field], field, 500);
  const descriptor = getOutcomeCategoryDescriptorV01(value.category);
  if (value.category !== "action-execution" || value.categoryRef !== descriptor.categoryId) fail(code, "Phase 6 Outcome references may map only to action-execution.");
  if (!["verified", "failed", "indeterminate"].includes(value.verificationState)) fail(code, "verificationState is unsupported.");
  if (!Array.isArray(value.evidenceRefs) || new Set(value.evidenceRefs).size !== value.evidenceRefs.length) fail(code, "evidenceRefs must be a unique array.");
  value.evidenceRefs.forEach((ref, index) => boundedText(ref, `evidenceRefs[${index}]`, 500));
  if (!exact(value.capabilities, CAPABILITY_KEYS)) fail(code, "capabilities field set is invalid.");
  if (
    value.capabilities.historyReferenceAllowed !== true
    || value.capabilities.checkpointAdvanceAuthority !== false
    || value.capabilities.canonicalContextWriteAllowed !== false
  ) fail(code, "Categorized reference must remain non-authoritative.");
  const expectedId = `categorized-outcome:${digest(referencePayload(value)).slice(0, 24)}`;
  if (value.referenceId !== expectedId) fail(code, "referenceId does not bind normalized reference content.");
  return deepFreeze(clone(value));
}

export function categorizePhase6OutcomeV01(outcome) {
  let accepted;
  try {
    accepted = validateOutcomeRecordV01(outcome);
  } catch (error) {
    fail("INVALID_PHASE6_OUTCOME", "Outcome failed the frozen Phase 6 validator.", { causeCode: error?.code ?? null });
  }
  const descriptor = getOutcomeCategoryDescriptorV01("action-execution");
  const payload = {
    referenceVersion: CATEGORIZED_OUTCOME_REFERENCE_VERSION_V01,
    projectRef: accepted.projectRef,
    outcomeRef: accepted.outcomeId,
    categoryRef: descriptor.categoryId,
    category: descriptor.category,
    subjectRef: accepted.actionRef,
    verificationState: accepted.verificationState,
    recordedAt: accepted.recordedAt,
    evidenceRefs: clone(accepted.verificationEvidenceRefs),
    sourceAuthority: accepted.authority,
    authority: CATEGORIZED_OUTCOME_REFERENCE_AUTHORITY_V01,
    capabilities: {
      historyReferenceAllowed: true,
      checkpointAdvanceAuthority: false,
      canonicalContextWriteAllowed: false,
    },
  };
  return validateCategorizedOutcomeReferenceV01({
    ...payload,
    referenceId: `categorized-outcome:${digest(payload).slice(0, 24)}`,
  });
}
