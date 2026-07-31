import process from "node:process";

import { VERITY_BENCHMARK_ASSET } from "../datahub/verity/asset-registry.mjs";

const READ_BASE_URL = process.env.NEXUS_VERITY_READ_BASE_URL || "http://127.0.0.1:8790";
const MUTATION_BASE_URL = process.env.NEXUS_VERITY_MUTATION_BASE_URL || "http://127.0.0.1:8791";
const REQUEST_TIMEOUT_MS = 15_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.error?.message || `${url} returned HTTP ${response.status}.`,
      );
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function validateReadHealth(health) {
  assert(health.status === "ok", "Read bridge health status is not ok.");
  assert(health.readOnly === true, "Read bridge is not marked read-only.");
  assert(
    health.mutationEnabled === false,
    "Read bridge unexpectedly exposes mutation mode.",
  );
  const required = new Set(health.requiredTools || []);
  for (const tool of ["search", "get_entities", "get_lineage"]) {
    assert(required.has(tool), `Read bridge is missing required MCP tool: ${tool}.`);
  }
  assert(
    health.mutationToolsExposed === false,
    "Read bridge reported exposed mutation tools.",
  );
}

function validateSnapshot(snapshot) {
  assert(snapshot.source === "datahub-mcp", "Snapshot source is not DataHub MCP.");
  assert(snapshot.readOnly === true, "Snapshot is not marked read-only.");
  assert(snapshot.scenario?.project?.id === "project-verity", "Verity project is missing.");
  assert(
    snapshot.diagnostics?.lineageVerification?.passed === true,
    "Verity lineage verification did not pass.",
  );
  assert(
    Array.isArray(snapshot.scenario?.entities) && snapshot.scenario.entities.length > 0,
    "Snapshot contains no governed entities.",
  );
  const benchmark = snapshot.scenario.entities.find(
    (entity) => entity.id === VERITY_BENCHMARK_ASSET.entityId,
  );
  assert(benchmark, "Verity Benchmark v1 is missing from the live snapshot.");
  assert(
    benchmark.source?.reference === VERITY_BENCHMARK_ASSET.urn,
    "Live Benchmark URN does not match the governed registry.",
  );
}

function validateMutationHealth(health) {
  assert(health.status === "ok", "Mutation bridge health status is not ok.");
  assert(health.mutationEnabled === true, "Mutation bridge is not enabled.");
  assert(health.tool === "add_owners", "Mutation bridge tool is not add_owners.");
  assert(
    Array.isArray(health.targetAllowList) &&
      health.targetAllowList.includes(VERITY_BENCHMARK_ASSET.urn),
    "Mutation bridge target allow-list does not contain Verity Benchmark v1.",
  );
}

function validateProposal(payload) {
  const proposal = payload?.proposal;
  assert(proposal, "Ownership proposal is missing.");
  assert(typeof proposal.proposalId === "string", "Proposal ID is missing.");
  assert(proposal.operation === "add_owners", "Proposal operation is not add_owners.");
  assert(
    proposal.entityId === VERITY_BENCHMARK_ASSET.entityId,
    "Proposal entity ID is not Verity Benchmark v1.",
  );
  assert(
    proposal.targetUrn === VERITY_BENCHMARK_ASSET.urn,
    "Proposal target URN is not allow-listed Verity Benchmark v1.",
  );
  assert(typeof proposal.proposedOwner === "string", "Proposed owner is missing.");
  assert(proposal.expiresAt, "Proposal expiry is missing.");
}

async function main() {
  const includeProposal = process.argv.includes("--proposal");

  console.log("Nexus Atlas Local Runtime Smoke Check");
  console.log("=====================================");

  const readHealth = await getJson(`${READ_BASE_URL}/health`);
  validateReadHealth(readHealth);
  console.log("[PASS] Read bridge health and read-only MCP tool contract.");

  const snapshot = await getJson(`${READ_BASE_URL}/api/continuity/reentry`);
  validateSnapshot(snapshot);
  console.log(
    `[PASS] Live Verity snapshot: ${snapshot.scenario.entities.length} entities; lineage verified.`,
  );

  if (includeProposal) {
    const mutationHealth = await getJson(`${MUTATION_BASE_URL}/health`);
    validateMutationHealth(mutationHealth);
    console.log("[PASS] Mutation bridge exposes only the governed ownership route.");

    const proposal = await getJson(
      `${MUTATION_BASE_URL}/api/context/repair/benchmark-owner`,
    );
    validateProposal(proposal);
    console.log("[PASS] Fresh, expiring ownership proposal issued for Verity Benchmark v1.");
    console.log("No POST request was sent; DataHub ownership was not changed.");
  }

  console.log("PASS: requested Runtime smoke checks completed.");
}

main().catch((error) => {
  const message = error?.name === "AbortError"
    ? "A local bridge request timed out."
    : error?.message || String(error);
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
});
