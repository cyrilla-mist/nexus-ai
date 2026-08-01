import assert from "node:assert/strict";
import test from "node:test";

import { createVerityOwnershipBridge } from "../datahub/verity/verity-ownership-bridge.mjs";

const OWNER = "urn:li:corpuser:cyrilla-mist";
const TARGET =
  "urn:li:dataset:(urn:li:dataPlatform:nexus,verity_benchmark_v1,PROD)";

function snapshot(owners = []) {
  return {
    source: "datahub-mcp",
    readOnly: true,
    scenario: {
      entities: [
        {
          id: "external-asset-benchmark",
          metadata: { owners },
        },
      ],
      expectedFindings: { missingOwners: owners.length ? 0 : 1 },
    },
  };
}

function mutationClient() {
  return {
    async initialize() {
      return { toolNames: ["add_owners"] };
    },
    async close() {},
  };
}

function responseCapture() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

test("issues a proposal from the freshly observed DataHub owner state", async () => {
  const bridge = createVerityOwnershipBridge({
    ownerUrn: OWNER,
    mutationClient: mutationClient(),
    readSnapshot: async () => snapshot([]),
    idFactory: () => "proposal-fresh",
    now: () => new Date("2026-08-01T00:00:00Z"),
  });

  const proposal = await bridge.proposal();

  assert.equal(proposal.proposalId, "proposal-fresh");
  assert.equal(proposal.operation, "add_owners");
  assert.deepEqual(proposal.existingOwners, []);
  assert.equal(proposal.proposedOwner, OWNER);
  assert.equal(proposal.targetUrn, TARGET);
  assert.equal(proposal.alreadyApplied, false);
  await bridge.close();
});

test("health and proposal GET do not call the mutation client", async () => {
  let mutationCalls = 0;
  const client = {
    async initialize() {
      return { toolNames: ["add_owners"] };
    },
    async addBenchmarkOwner() {
      mutationCalls += 1;
    },
    async close() {},
  };
  const bridge = createVerityOwnershipBridge({
    ownerUrn: OWNER,
    mutationClient: client,
    readSnapshot: async () => snapshot([]),
    idFactory: () => "proposal-get",
  });
  const request = {
    method: "GET",
    headers: {},
    url: "/api/context/repair/benchmark-owner",
    async *[Symbol.asyncIterator]() {},
  };

  const healthResponse = responseCapture();
  await bridge.handler({ ...request, url: "/health" }, healthResponse);
  assert.equal(healthResponse.statusCode, 200);

  const proposalResponse = responseCapture();
  await bridge.handler(request, proposalResponse);
  const payload = JSON.parse(proposalResponse.body);
  assert.equal(proposalResponse.statusCode, 200);
  assert.equal(payload.proposal.operation, "add_owners");
  assert.equal(mutationCalls, 0);
  await bridge.close();
});

test("marks a proposal as already applied when the intended owner exists", async () => {
  const bridge = createVerityOwnershipBridge({
    ownerUrn: OWNER,
    mutationClient: mutationClient(),
    readSnapshot: async () => snapshot([OWNER]),
    idFactory: () => "proposal-noop",
  });

  const proposal = await bridge.proposal();

  assert.deepEqual(proposal.existingOwners, [OWNER]);
  assert.equal(proposal.alreadyApplied, true);
  await bridge.close();
});

test("forwards the exact one-time proposal and rejects replay", async () => {
  const calls = [];
  const bridge = createVerityOwnershipBridge({
    ownerUrn: OWNER,
    mutationClient: mutationClient(),
    readSnapshot: async () => snapshot([]),
    idFactory: () => "proposal-once",
    repairOwnership: async (options) => {
      calls.push(options);
      return {
        verified: true,
        proposal: options.proposal,
        snapshot: snapshot([OWNER]),
        auditEvent: {
          id: "repair-1",
          type: "context_repair",
          verifiedAt: "2026-08-01T00:01:00Z",
        },
      };
    },
  });

  const proposal = await bridge.proposal();
  const body = {
    proposalId: proposal.proposalId,
    confirmed: true,
    operation: proposal.operation,
    entityId: proposal.entityId,
    targetUrn: proposal.targetUrn,
  };

  const result = await bridge.applyProposal(body);
  assert.equal(result.verified, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].proposal.proposalId, "proposal-once");

  await assert.rejects(
    () => bridge.applyProposal(body),
    (error) =>
      ["OWNERSHIP_PROPOSAL_NOT_AVAILABLE", "OWNERSHIP_PROPOSAL_REPLAYED"].includes(
        error?.code,
      ),
  );
  assert.equal(calls.length, 1);
  await bridge.close();
});

test("rejects a changed target before repair execution", async () => {
  let repairCalls = 0;
  const bridge = createVerityOwnershipBridge({
    ownerUrn: OWNER,
    mutationClient: mutationClient(),
    readSnapshot: async () => snapshot([]),
    idFactory: () => "proposal-mismatch",
    repairOwnership: async () => {
      repairCalls += 1;
      return { verified: true };
    },
  });

  const proposal = await bridge.proposal();
  await assert.rejects(
    () =>
      bridge.applyProposal({
        proposalId: proposal.proposalId,
        confirmed: true,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:nexus,wrong,PROD)",
      }),
    (error) => error?.code === "OWNERSHIP_PROPOSAL_MISMATCH",
  );
  assert.equal(repairCalls, 0);
  await bridge.close();
});
