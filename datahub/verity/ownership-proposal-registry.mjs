import { randomUUID } from "node:crypto";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class OwnershipProposalRegistryError extends Error {
  constructor(message, code = "OWNERSHIP_PROPOSAL_ERROR", options = {}) {
    super(message, options);
    this.name = "OwnershipProposalRegistryError";
    this.code = code;
  }
}

export function createOwnershipProposalRegistry(options = {}) {
  const ttlMs = Math.max(1, Number(options.ttlMs) || DEFAULT_TTL_MS);
  const now = options.now || (() => new Date());
  const idFactory = options.idFactory || randomUUID;
  const proposals = new Map();

  function cleanup() {
    const current = now().getTime();
    for (const [id, record] of proposals.entries()) {
      if (record.expiresAtMs <= current || record.state === "consumed") {
        proposals.delete(id);
      }
    }
  }

  function issue(baseProposal) {
    cleanup();
    const issuedAtDate = now();
    const proposalId = String(idFactory());
    const expiresAtDate = new Date(issuedAtDate.getTime() + ttlMs);
    const proposal = Object.freeze({
      ...baseProposal,
      proposalId,
      issuedAt: issuedAtDate.toISOString(),
      expiresAt: expiresAtDate.toISOString(),
    });

    proposals.set(proposalId, {
      proposal,
      expiresAtMs: expiresAtDate.getTime(),
      state: "open",
    });
    return proposal;
  }

  function consume(request = {}) {
    cleanup();
    const proposalId = String(request.proposalId || "");
    const record = proposals.get(proposalId);
    if (!record) {
      throw new OwnershipProposalRegistryError(
        "The ownership proposal is missing, expired, or already used.",
        "OWNERSHIP_PROPOSAL_NOT_AVAILABLE",
      );
    }
    if (record.state !== "open") {
      throw new OwnershipProposalRegistryError(
        "The ownership proposal is already being processed or has been used.",
        "OWNERSHIP_PROPOSAL_REPLAYED",
      );
    }

    const proposal = record.proposal;
    if (
      request.operation !== proposal.operation ||
      request.entityId !== proposal.entityId ||
      request.targetUrn !== proposal.targetUrn
    ) {
      throw new OwnershipProposalRegistryError(
        "The ownership proposal target changed before confirmation.",
        "OWNERSHIP_PROPOSAL_MISMATCH",
      );
    }

    record.state = "in-flight";
    return proposal;
  }

  function complete(proposalId) {
    const record = proposals.get(String(proposalId || ""));
    if (record) record.state = "consumed";
  }

  function fail(proposalId) {
    const record = proposals.get(String(proposalId || ""));
    if (record) record.state = "consumed";
  }

  function size() {
    cleanup();
    return proposals.size;
  }

  return Object.freeze({ issue, consume, complete, fail, size });
}
