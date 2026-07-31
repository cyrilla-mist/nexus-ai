import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOwnershipProposal,
  repairVerityBenchmarkOwnership,
} from "../datahub/verity/verity-ownership-repair.mjs";

const OWNER = "urn:li:corpuser:cyrilla-mist";

function verifiedSnapshot() {
  return {
    source: "datahub-mcp",
    scenario: {
      entities: [
        {
          id: "external-asset-benchmark",
          metadata: { owners: [OWNER] },
        },
      ],
      expectedFindings: { missingOwners: 0 },
    },
  };
}

test("returns a verified no-op when the intended owner already exists", async () => {
  const proposal = buildOwnershipProposal(OWNER, {
    existingOwners: [OWNER],
    proposalId: "proposal-noop",
  });
  let writes = 0;
  const mutationClient = {
    async addBenchmarkOwner() {
      writes += 1;
    },
    async close() {},
  };

  const result = await repairVerityBenchmarkOwnership({
    ownerUrn: OWNER,
    proposal,
    confirmed: true,
    operation: proposal.operation,
    entityId: proposal.entityId,
    targetUrn: proposal.targetUrn,
    mutationClient,
    readSnapshot: async () => verifiedSnapshot(),
    now: () => new Date("2026-08-01T00:00:00Z"),
  });

  assert.equal(writes, 0);
  assert.equal(result.verified, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.proposal.alreadyApplied, true);
  assert.equal(result.auditEvent.mutationPerformed, false);
});

test("does not accept an unverified no-op", async () => {
  const proposal = buildOwnershipProposal(OWNER, {
    existingOwners: [OWNER],
    proposalId: "proposal-invalid-noop",
  });

  await assert.rejects(
    () =>
      repairVerityBenchmarkOwnership({
        ownerUrn: OWNER,
        proposal,
        confirmed: true,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
        mutationClient: {
          async addBenchmarkOwner() {
            throw new Error("must not write");
          },
          async close() {},
        },
        readSnapshot: async () => ({
          scenario: {
            entities: [
              {
                id: "external-asset-benchmark",
                metadata: { owners: [] },
              },
            ],
            expectedFindings: { missingOwners: 1 },
          },
        }),
      }),
    (error) => error?.code === "OWNERSHIP_REPAIR_NOT_VERIFIED",
  );
});
