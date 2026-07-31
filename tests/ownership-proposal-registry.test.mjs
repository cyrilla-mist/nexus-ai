import assert from "node:assert/strict";
import test from "node:test";

import { createOwnershipProposalRegistry } from "../datahub/verity/ownership-proposal-registry.mjs";

function baseProposal() {
  return {
    operation: "assign_owner",
    projectId: "project-verity",
    entityId: "external-asset-benchmark",
    targetUrn:
      "urn:li:dataset:(urn:li:dataPlatform:nexus,verity_benchmark_v1,PROD)",
    existingOwners: [],
    proposedOwner: "urn:li:corpuser:cyrilla-mist",
    alreadyApplied: false,
    requiresConfirmation: true,
    verification: "post-write DataHub MCP re-read",
  };
}

test("issues an expiring proposal and consumes it exactly once", () => {
  let current = new Date("2026-08-01T00:00:00Z");
  const registry = createOwnershipProposalRegistry({
    ttlMs: 60_000,
    now: () => current,
    idFactory: () => "proposal-1",
  });
  const proposal = registry.issue(baseProposal());

  assert.equal(proposal.proposalId, "proposal-1");
  assert.equal(proposal.issuedAt, "2026-08-01T00:00:00.000Z");
  assert.equal(proposal.expiresAt, "2026-08-01T00:01:00.000Z");

  const consumed = registry.consume({
    proposalId: proposal.proposalId,
    operation: proposal.operation,
    entityId: proposal.entityId,
    targetUrn: proposal.targetUrn,
  });
  assert.equal(consumed.proposalId, "proposal-1");

  assert.throws(
    () =>
      registry.consume({
        proposalId: proposal.proposalId,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
      }),
    (error) => error?.code === "OWNERSHIP_PROPOSAL_REPLAYED",
  );

  registry.complete(proposal.proposalId);
  current = new Date("2026-08-01T00:00:10Z");
  assert.equal(registry.size(), 0);
});

test("rejects a changed proposal target before marking it in-flight", () => {
  const registry = createOwnershipProposalRegistry({
    idFactory: () => "proposal-2",
  });
  const proposal = registry.issue(baseProposal());

  assert.throws(
    () =>
      registry.consume({
        proposalId: proposal.proposalId,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:nexus,wrong,PROD)",
      }),
    (error) => error?.code === "OWNERSHIP_PROPOSAL_MISMATCH",
  );

  assert.equal(
    registry.consume({
      proposalId: proposal.proposalId,
      operation: proposal.operation,
      entityId: proposal.entityId,
      targetUrn: proposal.targetUrn,
    }).proposalId,
    "proposal-2",
  );
});

test("rejects an expired proposal", () => {
  let current = new Date("2026-08-01T00:00:00Z");
  const registry = createOwnershipProposalRegistry({
    ttlMs: 1_000,
    now: () => current,
    idFactory: () => "proposal-expired",
  });
  const proposal = registry.issue(baseProposal());
  current = new Date("2026-08-01T00:00:02Z");

  assert.throws(
    () =>
      registry.consume({
        proposalId: proposal.proposalId,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
      }),
    (error) => error?.code === "OWNERSHIP_PROPOSAL_NOT_AVAILABLE",
  );
});
