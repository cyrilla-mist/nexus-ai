import { createHash } from "node:crypto";

import {
  INITIAL_ALIGNMENT_SCHEMA_V01,
  TRUSTED_CHECKPOINT_SCHEMA_V01,
  TrustedCheckpointValidationError,
  validateInitialAlignmentProposalV01,
  validateTrustedCheckpointV01,
} from "./trusted-checkpoint-validator.mjs";

const PROPOSAL_INPUT_KEYS = [
  "projectRef",
  "proposedAt",
  "trustedDirection",
  "activeObjective",
  "acceptedNextAction",
  "evidenceCursor",
  "governingRefs",
  "unresolvedProtectedAmbiguities",
  "provenance",
];

export class InitialAlignmentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "InitialAlignmentError";
    this.code = code;
    this.details = { ...details };
  }
}

function fail(code, message, details = {}) {
  throw new InitialAlignmentError(code, message, details);
}

function exactKeys(value, keys, code, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${field} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${field} has an invalid field set.`, { actual, expected });
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function proposalPayload(input) {
  exactKeys(input, PROPOSAL_INPUT_KEYS, "INVALID_INITIAL_ALIGNMENT_INPUT", "input");
  return {
    proposalVersion: INITIAL_ALIGNMENT_SCHEMA_V01,
    projectRef: input.projectRef,
    proposedAt: input.proposedAt,
    trustedDirection: input.trustedDirection,
    activeObjective: input.activeObjective,
    acceptedNextAction: input.acceptedNextAction,
    evidenceCursor: input.evidenceCursor,
    governingRefs: input.governingRefs,
    unresolvedProtectedAmbiguities: input.unresolvedProtectedAmbiguities,
    provenance: input.provenance,
  };
}

export function buildInitialAlignmentProposalV01(input) {
  const payload = proposalPayload(input);
  const proposalId = `initial-alignment:${digest(payload).slice(0, 24)}`;
  return validateInitialAlignmentProposalV01({
    proposalVersion: INITIAL_ALIGNMENT_SCHEMA_V01,
    proposalId,
    projectRef: payload.projectRef,
    proposedAt: payload.proposedAt,
    trustedDirection: payload.trustedDirection,
    activeObjective: payload.activeObjective,
    acceptedNextAction: payload.acceptedNextAction,
    evidenceCursor: payload.evidenceCursor,
    governingRefs: payload.governingRefs,
    unresolvedProtectedAmbiguities: payload.unresolvedProtectedAmbiguities,
    provenance: payload.provenance,
  });
}

export function confirmInitialAlignmentV01({ proposal, confirmation } = {}) {
  let acceptedProposal;
  try {
    acceptedProposal = validateInitialAlignmentProposalV01(proposal);
  } catch (error) {
    if (error instanceof TrustedCheckpointValidationError) throw new InitialAlignmentError("INVALID_INITIAL_ALIGNMENT_PROPOSAL", error.message, { causeCode: error.code });
    throw error;
  }
  exactKeys(confirmation, ["proposalId", "accepted", "actorRef", "confirmedAt"], "INVALID_INITIAL_ALIGNMENT_CONFIRMATION", "confirmation");
  if (confirmation.proposalId !== acceptedProposal.proposalId) fail("INITIAL_ALIGNMENT_BINDING_MISMATCH", "confirmation.proposalId must match the accepted proposal.");
  if (confirmation.accepted !== true) fail("INITIAL_ALIGNMENT_NOT_ACCEPTED", "Initial Alignment requires explicit acceptance.");
  if (typeof confirmation.actorRef !== "string" || !confirmation.actorRef.trim() || confirmation.actorRef !== confirmation.actorRef.trim()) fail("INVALID_INITIAL_ALIGNMENT_CONFIRMATION", "confirmation.actorRef must be a non-empty trimmed string.");
  if (typeof confirmation.confirmedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(confirmation.confirmedAt) || Number.isNaN(Date.parse(confirmation.confirmedAt))) fail("INVALID_INITIAL_ALIGNMENT_CONFIRMATION", "confirmation.confirmedAt must be a strict offset ISO timestamp.");
  if (Date.parse(confirmation.confirmedAt) < Date.parse(acceptedProposal.proposedAt)) fail("INVALID_INITIAL_ALIGNMENT_CONFIRMATION", "confirmation cannot predate the proposal.");

  const checkpointId = `checkpoint:${digest({ proposalId: acceptedProposal.proposalId, actorRef: confirmation.actorRef, confirmedAt: confirmation.confirmedAt }).slice(0, 24)}`;
  return validateTrustedCheckpointV01({
    checkpointSchemaVersion: TRUSTED_CHECKPOINT_SCHEMA_V01,
    checkpointId,
    projectRef: acceptedProposal.projectRef,
    version: 1,
    createdAt: confirmation.confirmedAt,
    trustedDirection: acceptedProposal.trustedDirection,
    activeObjective: acceptedProposal.activeObjective,
    acceptedNextAction: acceptedProposal.acceptedNextAction,
    evidenceCursor: acceptedProposal.evidenceCursor,
    governingRefs: acceptedProposal.governingRefs,
    unresolvedProtectedAmbiguities: acceptedProposal.unresolvedProtectedAmbiguities,
    provenance: acceptedProposal.provenance,
    confirmation: {
      state: "confirmed",
      authority: "human",
      actorRef: confirmation.actorRef,
      confirmedAt: confirmation.confirmedAt,
      basisRef: acceptedProposal.proposalId,
    },
  });
}

export async function confirmAndPersistInitialAlignmentV01({ proposal, confirmation, store, idempotencyKey } = {}) {
  if (!store || typeof store.writeCheckpoint !== "function" || typeof store.readLatest !== "function") fail("INVALID_INITIAL_ALIGNMENT_STORE", "store must expose writeCheckpoint and readLatest.");
  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim() || idempotencyKey !== idempotencyKey.trim()) fail("INVALID_INITIAL_ALIGNMENT_STORE", "idempotencyKey must be a non-empty trimmed string.");
  const checkpoint = confirmInitialAlignmentV01({ proposal, confirmation });
  const result = await store.writeCheckpoint({ checkpoint, expectedVersion: 0, idempotencyKey });
  const readBack = await store.readLatest({ projectRef: checkpoint.projectRef });
  if (!result.replayed && JSON.stringify(readBack) !== JSON.stringify(checkpoint)) fail("INITIAL_ALIGNMENT_WRITE_VERIFICATION_FAILED", "Initial Alignment checkpoint failed read-after-write verification.");
  if (result.replayed && (!readBack || readBack.projectRef !== checkpoint.projectRef || readBack.version < checkpoint.version)) fail("INITIAL_ALIGNMENT_WRITE_VERIFICATION_FAILED", "Initial Alignment replay could not verify a trusted project state.");
  return Object.freeze({ checkpoint: result.checkpoint, replayed: result.replayed });
}
