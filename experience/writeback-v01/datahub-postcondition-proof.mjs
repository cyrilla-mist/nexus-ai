import {
  CONTINUITY_PROJECT_ID,
  CONTINUITY_PROJECT_URN,
} from "../../datahub/mcp/continuity-live-normalizer.mjs";
import {
  getOutcomeCategoryDescriptorV01,
  validateOutcomeCategoryProposalV01,
} from "./writeback-outcome-category.mjs";
import {
  buildBoundPostconditionProofV01,
  validateCrossSourcePostconditionProposalV01,
} from "./cross-source-postcondition.mjs";

export const DATAHUB_CONTINUITY_SCOPE_REF_V01 = `datahub:continuity:${CONTINUITY_PROJECT_ID}`;
export const DATAHUB_CONTINUITY_SOURCE_AUTHORITY_V01 = "datahub-read-only-metadata-state";

export class DataHubPostconditionProofError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DataHubPostconditionProofError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (code, message, details = {}) => { throw new DataHubPostconditionProofError(code, message, details); };

function text(value, field, max = 1000) {
  if (typeof value !== "string" || !value.length || value !== value.trim() || value.length > max || /[\r\n]/.test(value)) fail("INVALID_DATAHUB_SNAPSHOT", `${field} is invalid.`, { field });
  return value;
}

function strictIso(value, field) {
  text(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail("INVALID_DATAHUB_SNAPSHOT", `${field} must be a strict offset ISO timestamp.`);
  return value;
}

function acceptedCategory(value) {
  try { return validateOutcomeCategoryProposalV01(value); }
  catch (error) { fail("INVALID_OUTCOME_CATEGORY_PROPOSAL", "categoryProposal failed Phase 7E validation.", { causeCode: error?.code ?? null }); }
}
function acceptedPostcondition(value) {
  try { return validateCrossSourcePostconditionProposalV01(value); }
  catch (error) { fail("INVALID_CROSS_SOURCE_POSTCONDITION", "postconditionProposal failed Phase 7F validation.", { causeCode: error?.code ?? null }); }
}

function validateSnapshot(snapshot) {
  if (!object(snapshot) || snapshot.source !== "datahub-mcp" || snapshot.readOnly !== true) fail("INVALID_DATAHUB_SNAPSHOT", "Snapshot must come from the read-only DataHub MCP continuity reader.");
  strictIso(snapshot.fetchedAt, "snapshot.fetchedAt");
  if (snapshot.projectUrn !== CONTINUITY_PROJECT_URN) fail("DATAHUB_SCOPE_MISMATCH", "DataHub snapshot targets another continuity project.");
  if (!object(snapshot.scenario) || !object(snapshot.scenario.project) || snapshot.scenario.project.id !== CONTINUITY_PROJECT_ID || !Array.isArray(snapshot.scenario.entities)) fail("INVALID_DATAHUB_SNAPSHOT", "DataHub scenario project/entities are invalid.");
  if (!object(snapshot.diagnostics) || !object(snapshot.diagnostics.lineageVerification) || snapshot.diagnostics.lineageVerification.checked !== true || snapshot.diagnostics.lineageVerification.passed !== true) fail("DATAHUB_LINEAGE_NOT_VERIFIED", "DataHub snapshot must include successful representative lineage verification.");
  const seen = new Set();
  for (const [index, entity] of snapshot.scenario.entities.entries()) {
    if (!object(entity)) fail("INVALID_DATAHUB_SNAPSHOT", `scenario.entities[${index}] is invalid.`);
    const id = text(entity.id, `scenario.entities[${index}].id`, 500);
    text(entity.type, `scenario.entities[${index}].type`, 100);
    text(entity.status, `scenario.entities[${index}].status`, 300);
    text(entity.updatedAt, `scenario.entities[${index}].updatedAt`, 64);
    if (seen.has(id)) fail("INVALID_DATAHUB_SNAPSHOT", "DataHub entity ids must be unique.", { entityId: id });
    seen.add(id);
  }
  return snapshot;
}

export function buildDataHubPostconditionProofV01({
  categoryProposal,
  postconditionProposal,
  snapshot,
} = {}) {
  const category = acceptedCategory(categoryProposal);
  const postcondition = acceptedPostcondition(postconditionProposal);
  const acceptedSnapshot = validateSnapshot(snapshot);
  if (postcondition.provider !== "datahub" || postcondition.profile !== "continuity-mcp-v0.9.5") fail("SOURCE_PROFILE_MISMATCH", "DataHub adapter requires datahub/continuity-mcp-v0.9.5.");
  if (postcondition.scopeRef !== DATAHUB_CONTINUITY_SCOPE_REF_V01) fail("DATAHUB_SCOPE_MISMATCH", "Postcondition scopeRef does not match the accepted DataHub continuity scope.");
  if (
    postcondition.categoryProposalRef !== category.proposalId
    || postcondition.projectRef !== category.projectRef
    || postcondition.category !== category.category
    || postcondition.subjectRef !== category.subjectRef
  ) fail("DATAHUB_POSTCONDITION_BINDING_MISMATCH", "Category proposal and DataHub postcondition do not bind the same subject.");

  const entity = acceptedSnapshot.scenario.entities.find(item => item.id === category.subjectRef);
  if (!entity) fail("DATAHUB_SUBJECT_NOT_FOUND", "DataHub snapshot does not contain the requested Outcome subject.", { subjectRef: category.subjectRef });
  const descriptor = getOutcomeCategoryDescriptorV01(category.category);
  if (entity.type !== descriptor.contextKind) fail("DATAHUB_SUBJECT_KIND_MISMATCH", "DataHub entity type does not match the Outcome category semantic kind.", { expectedKind: descriptor.contextKind, actualKind: entity.type });
  if (postcondition.condition.conditionType !== "datahub-entity-status-equals") fail("CONDITION_SOURCE_PROFILE_MISMATCH", "DataHub continuity adapter supports only entity-status equality.");

  return buildBoundPostconditionProofV01({
    postconditionProposal: postcondition,
    observedAt: acceptedSnapshot.fetchedAt,
    result: entity.status === postcondition.condition.expectedValue ? "satisfied" : "not-satisfied",
    observedValue: entity.status,
    evidenceRefs: [`datahub:continuity-entity:${entity.id}`],
    sourceAuthority: DATAHUB_CONTINUITY_SOURCE_AUTHORITY_V01,
  });
}
