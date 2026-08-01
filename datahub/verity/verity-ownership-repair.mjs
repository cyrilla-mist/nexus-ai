import { readVerityAssetSnapshot } from "./verity-asset-reader.mjs";
import {
  createVerityOwnershipClient,
  validateOwnerUrn,
} from "./ownership-mcp-client.mjs";
import { VERITY_BENCHMARK_ASSET } from "./asset-registry.mjs";

export class VerityOwnershipRepairError extends Error {
  constructor(message, code = "VERITY_OWNERSHIP_REPAIR_ERROR", options = {}) {
    super(message, options);
    this.name = "VerityOwnershipRepairError";
    this.code = code;
  }
}

function normalizeExistingOwners(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => validateOwnerUrn(value)))].sort();
}

export function buildOwnershipProposal(ownerUrn, options = {}) {
  const owner = validateOwnerUrn(ownerUrn);
  const existingOwners = normalizeExistingOwners(options.existingOwners);
  const alreadyApplied = existingOwners.includes(owner);

  return Object.freeze({
    proposalId: String(options.proposalId || ""),
    issuedAt: String(options.issuedAt || ""),
    expiresAt: String(options.expiresAt || ""),
    operation: "add_owners",
    projectId: "project-verity",
    entityId: VERITY_BENCHMARK_ASSET.entityId,
    targetUrn: VERITY_BENCHMARK_ASSET.urn,
    existingOwners: Object.freeze(existingOwners),
    proposedOwner: owner,
    alreadyApplied,
    requiresConfirmation: true,
    verification: "post-write DataHub MCP re-read",
  });
}

function proposalFromOptions(options) {
  const supplied = options.proposal;
  if (!supplied) {
    return buildOwnershipProposal(options.ownerUrn, {
      existingOwners: options.existingOwners,
      proposalId: options.proposalId,
      issuedAt: options.issuedAt,
      expiresAt: options.expiresAt,
    });
  }

  const proposal = buildOwnershipProposal(
    supplied.proposedOwner || options.ownerUrn,
    {
      existingOwners: supplied.existingOwners,
      proposalId: supplied.proposalId,
      issuedAt: supplied.issuedAt,
      expiresAt: supplied.expiresAt,
    },
  );

  if (
    supplied.operation !== proposal.operation ||
    supplied.projectId !== proposal.projectId ||
    supplied.entityId !== proposal.entityId ||
    supplied.targetUrn !== proposal.targetUrn
  ) {
    throw new VerityOwnershipRepairError(
      "The supplied ownership proposal does not match the allow-listed Benchmark asset.",
      "MUTATION_TARGET_MISMATCH",
    );
  }

  return proposal;
}

function verifiedSnapshotState(snapshot, proposal) {
  const benchmark = snapshot.scenario?.entities?.find(
    (entity) => entity.id === VERITY_BENCHMARK_ASSET.entityId,
  );
  const owners = benchmark?.metadata?.owners || [];
  return {
    owners,
    ownerVerified: owners.includes(proposal.proposedOwner),
    signalClosed: snapshot.scenario?.expectedFindings?.missingOwners === 0,
  };
}

export async function repairVerityBenchmarkOwnership(options = {}) {
  const proposal = proposalFromOptions(options);
  if (options.confirmed !== true) {
    throw new VerityOwnershipRepairError(
      "Explicit human confirmation is required.",
      "CONFIRMATION_REQUIRED",
    );
  }
  if (
    options.targetUrn !== proposal.targetUrn ||
    options.entityId !== proposal.entityId ||
    options.operation !== proposal.operation
  ) {
    throw new VerityOwnershipRepairError(
      "Ownership repair target does not match the allow-listed Benchmark asset.",
      "MUTATION_TARGET_MISMATCH",
    );
  }

  const readSnapshot = options.readSnapshot || readVerityAssetSnapshot;
  const now = options.now || (() => new Date());
  let mutationPerformed = false;
  let ownsMutationClient = false;
  let mutationClient = options.mutationClient;

  try {
    if (!proposal.alreadyApplied) {
      ownsMutationClient = !mutationClient;
      mutationClient =
        mutationClient || createVerityOwnershipClient(options.clientOptions);
      await mutationClient.addBenchmarkOwner(proposal.proposedOwner);
      mutationPerformed = true;
    }

    const snapshot = await readSnapshot(options.readOptions || {});
    const verification = verifiedSnapshotState(snapshot, proposal);
    if (!verification.ownerVerified) {
      throw new VerityOwnershipRepairError(
        mutationPerformed
          ? "DataHub accepted the mutation request, but the verified re-read did not return the intended owner."
          : "The no-op proposal could not be verified because DataHub did not return the intended owner.",
        "OWNERSHIP_REPAIR_NOT_VERIFIED",
      );
    }
    if (!verification.signalClosed) {
      throw new VerityOwnershipRepairError(
        "The verified snapshot still reports Missing Ownership.",
        "OWNERSHIP_SIGNAL_NOT_CLOSED",
      );
    }

    const verifiedAt = now().toISOString();
    return {
      source: "datahub-mcp",
      mutationEnabled: true,
      mutationPerformed,
      verified: true,
      proposal,
      snapshot,
      auditEvent: {
        id: `context-repair-${Date.parse(verifiedAt) || Date.now()}`,
        type: "context_repair",
        projectId: proposal.projectId,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
        operation: proposal.operation,
        ownerUrn: proposal.proposedOwner,
        mutationPerformed,
        verifiedAt,
        verification: "DataHub MCP read-after-write",
      },
    };
  } finally {
    if (ownsMutationClient && mutationClient) await mutationClient.close();
  }
}
