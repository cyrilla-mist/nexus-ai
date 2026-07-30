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

export function buildOwnershipProposal(ownerUrn) {
  const owner = validateOwnerUrn(ownerUrn);
  return Object.freeze({
    operation: "assign_owner",
    projectId: "project-verity",
    entityId: VERITY_BENCHMARK_ASSET.entityId,
    targetUrn: VERITY_BENCHMARK_ASSET.urn,
    existingOwners: [],
    proposedOwner: owner,
    requiresConfirmation: true,
    verification: "post-write DataHub MCP re-read",
  });
}

export async function repairVerityBenchmarkOwnership(options = {}) {
  const proposal = buildOwnershipProposal(options.ownerUrn);
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

  const ownsMutationClient = !options.mutationClient;
  const mutationClient =
    options.mutationClient || createVerityOwnershipClient(options.clientOptions);
  const readSnapshot = options.readSnapshot || readVerityAssetSnapshot;
  const now = options.now || (() => new Date());

  try {
    await mutationClient.addBenchmarkOwner(proposal.proposedOwner);
    const snapshot = await readSnapshot(options.readOptions || {});
    const benchmark = snapshot.scenario?.entities?.find(
      (entity) => entity.id === VERITY_BENCHMARK_ASSET.entityId,
    );
    const owners = benchmark?.metadata?.owners || [];
    if (!owners.includes(proposal.proposedOwner)) {
      throw new VerityOwnershipRepairError(
        "DataHub accepted the mutation request, but the verified re-read did not return the intended owner.",
        "OWNERSHIP_REPAIR_NOT_VERIFIED",
      );
    }
    if (snapshot.scenario.expectedFindings?.missingOwners !== 0) {
      throw new VerityOwnershipRepairError(
        "The verified snapshot still reports Missing Ownership.",
        "OWNERSHIP_SIGNAL_NOT_CLOSED",
      );
    }

    const verifiedAt = now().toISOString();
    return {
      source: "datahub-mcp",
      mutationEnabled: true,
      verified: true,
      proposal,
      snapshot,
      auditEvent: {
        id: `context-repair-${Date.now()}`,
        type: "context_repair",
        projectId: proposal.projectId,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
        operation: proposal.operation,
        ownerUrn: proposal.proposedOwner,
        verifiedAt,
        verification: "DataHub MCP read-after-write",
      },
    };
  } finally {
    if (ownsMutationClient) await mutationClient.close();
  }
}
