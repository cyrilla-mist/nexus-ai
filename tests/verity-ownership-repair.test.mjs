import assert from "node:assert/strict";
import test from "node:test";

import { VERITY_BENCHMARK_ASSET } from "../datahub/verity/asset-registry.mjs";
import {
  createVerityOwnershipClient,
  validateOwnerUrn,
} from "../datahub/verity/ownership-mcp-client.mjs";
import {
  buildOwnershipProposal,
  repairVerityBenchmarkOwnership,
} from "../datahub/verity/verity-ownership-repair.mjs";

const OWNER = "urn:li:corpuser:cyrilla-mist";

function fakeTransport() {
  const calls = [];
  return {
    calls,
    async request(method, params = {}) {
      calls.push({ method, params });
      if (method === "initialize") return {};
      if (method === "tools/list") {
        return { tools: [{ name: "add_owners" }, { name: "remove_owners" }] };
      }
      if (method === "tools/call") return { ok: true };
      throw new Error(`Unexpected method: ${method}`);
    },
    notify(method, params = {}) {
      calls.push({ method, params });
    },
    async close() {},
  };
}

function verifiedSnapshot(ownerUrns) {
  return {
    source: "datahub-mcp",
    scenario: {
      entities: [
        {
          id: VERITY_BENCHMARK_ASSET.entityId,
          metadata: { owners: ownerUrns },
        },
      ],
      expectedFindings: { missingOwners: ownerUrns.length ? 0 : 1 },
    },
  };
}

test("validates DataHub owner URNs", () => {
  assert.equal(validateOwnerUrn(OWNER), OWNER);
  assert.equal(
    validateOwnerUrn("urn:li:corpGroup:verity-maintainers"),
    "urn:li:corpGroup:verity-maintainers",
  );
  assert.throws(
    () => validateOwnerUrn("cyrilla-mist"),
    (error) => error.code === "INVALID_OWNER_URN",
  );
});

test("calls only add_owners for the allow-listed Benchmark target", async () => {
  const transport = fakeTransport();
  const client = createVerityOwnershipClient({ transport });
  await client.addBenchmarkOwner(OWNER);

  const toolCall = transport.calls.find(
    (call) => call.method === "tools/call",
  );
  assert.deepEqual(toolCall.params, {
    name: "add_owners",
    arguments: {
      owner_urns: [OWNER],
      entity_urns: [VERITY_BENCHMARK_ASSET.urn],
    },
  });
});

test("requires confirmation and an exact mutation target", async () => {
  const proposal = buildOwnershipProposal(OWNER);
  const mutationClient = {
    async addBenchmarkOwner() {
      throw new Error("must not be called");
    },
    async close() {},
  };

  await assert.rejects(
    () =>
      repairVerityBenchmarkOwnership({
        ownerUrn: OWNER,
        confirmed: false,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
        mutationClient,
      }),
    (error) => error.code === "CONFIRMATION_REQUIRED",
  );

  await assert.rejects(
    () =>
      repairVerityBenchmarkOwnership({
        ownerUrn: OWNER,
        confirmed: true,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:nexus,wrong,PROD)",
        mutationClient,
      }),
    (error) => error.code === "MUTATION_TARGET_MISMATCH",
  );
});

test("records repair only after read-after-write verification", async () => {
  const proposal = buildOwnershipProposal(OWNER);
  const writes = [];
  const mutationClient = {
    async addBenchmarkOwner(ownerUrn) {
      writes.push(ownerUrn);
    },
    async close() {},
  };

  const result = await repairVerityBenchmarkOwnership({
    ownerUrn: OWNER,
    confirmed: true,
    operation: proposal.operation,
    entityId: proposal.entityId,
    targetUrn: proposal.targetUrn,
    mutationClient,
    readSnapshot: async () => verifiedSnapshot([OWNER]),
    now: () => new Date("2026-07-30T16:00:00Z"),
  });

  assert.deepEqual(writes, [OWNER]);
  assert.equal(result.verified, true);
  assert.equal(result.auditEvent.type, "context_repair");
  assert.equal(result.auditEvent.operation, "add_owners");
  assert.equal(result.auditEvent.ownerUrn, OWNER);
  assert.equal(result.auditEvent.verifiedAt, "2026-07-30T16:00:00.000Z");
});

test("does not close ownership when the re-read lacks the intended owner", async () => {
  const proposal = buildOwnershipProposal(OWNER);
  const mutationClient = {
    async addBenchmarkOwner() {},
    async close() {},
  };

  await assert.rejects(
    () =>
      repairVerityBenchmarkOwnership({
        ownerUrn: OWNER,
        confirmed: true,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
        mutationClient,
        readSnapshot: async () => verifiedSnapshot([]),
      }),
    (error) => error.code === "OWNERSHIP_REPAIR_NOT_VERIFIED",
  );
});
