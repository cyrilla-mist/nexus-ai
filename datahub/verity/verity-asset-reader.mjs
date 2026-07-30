import { createDataHubMcpClient } from "../mcp/mcp-client.mjs";
import { loadVerityScenario } from "./load-verity-scenario.mjs";
import {
  VERITY_ASSETS,
  VERITY_ASSET_BY_ID,
  VERITY_BENCHMARK_ASSET,
} from "./asset-registry.mjs";

const DATASET_URN_PATTERN = /urn:li:dataset:\(urn:li:dataPlatform:[^,]+,[^,]+,[^)]+\)/g;
const OWNER_URN_PREFIXES = ["urn:li:corpuser:", "urn:li:corpGroup:"];

export class VerityAssetReadError extends Error {
  constructor(message, code = "VERITY_ASSET_READ_ERROR", options = {}) {
    super(message, options);
    this.name = "VerityAssetReadError";
    this.code = code;
  }
}

function resultPayloads(result) {
  const payloads = [];
  if (result?.structuredContent !== undefined) {
    payloads.push(result.structuredContent);
  }
  for (const item of result?.content || []) {
    if (item?.type !== "text" || typeof item.text !== "string") continue;
    const text = item.text.trim();
    if (!text) continue;
    try {
      payloads.push(JSON.parse(text));
    } catch {
      payloads.push(text);
    }
  }
  if (!payloads.length) payloads.push(result ?? {});
  return payloads;
}

function walk(value, visitor, path = [], seen = new Set()) {
  if (value === null || value === undefined) return;
  if (typeof value !== "object") {
    visitor(value, path);
    return;
  }
  if (seen.has(value)) return;
  seen.add(value);
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...path, index], seen));
  } else {
    Object.entries(value).forEach(([key, item]) =>
      walk(item, visitor, [...path, key], seen),
    );
  }
}

function extractDatasetUrns(result) {
  const urns = new Set();
  for (const payload of resultPayloads(result)) {
    walk(payload, (value) => {
      if (typeof value === "string") {
        for (const match of value.match(DATASET_URN_PATTERN) || []) urns.add(match);
      } else if (typeof value?.urn === "string" && value.urn.startsWith("urn:li:dataset:")) {
        urns.add(value.urn);
      }
    });
  }
  return [...urns].sort();
}

function ownerUrn(value) {
  return typeof value === "string" &&
    OWNER_URN_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function extractOwners(value) {
  const owners = new Set();
  walk(value, (item, path) => {
    const keys = path.map(String).map((key) => key.toLowerCase());
    const inOwnershipContext = keys.some((key) =>
      ["owner", "owners", "ownership", "ownerships"].includes(key),
    );
    if (inOwnershipContext && ownerUrn(item)) owners.add(item);
    if (typeof item?.owner === "string" && ownerUrn(item.owner)) {
      owners.add(item.owner);
    }
  });
  return [...owners].sort();
}

function findEntityPayload(result, urn) {
  const candidates = [];
  for (const payload of resultPayloads(result)) {
    if (payload && typeof payload === "object" && payload[urn]) {
      candidates.push({ urn, ...payload[urn] });
    }
    walk(payload, (value) => {
      if (!value || typeof value !== "object") return;
      if (value.urn === urn) candidates.push(value);
      if (value[urn] && typeof value[urn] === "object") {
        candidates.push({ urn, ...value[urn] });
      }
    });
  }
  if (!candidates.length) return null;
  return candidates.sort(
    (left, right) => JSON.stringify(right).length - JSON.stringify(left).length,
  )[0];
}

async function readAssets(client) {
  const urns = VERITY_ASSETS.map((asset) => asset.urn);
  const result = await client.callTool("get_entities", { urns });
  const records = new Map();

  for (const asset of VERITY_ASSETS) {
    const payload = findEntityPayload(result, asset.urn);
    if (!payload) {
      throw new VerityAssetReadError(
        `DataHub did not return the required Verity asset: ${asset.urn}`,
        "VERITY_ASSET_MISSING",
      );
    }
    records.set(asset.entityId, {
      ...asset,
      owners: extractOwners(payload),
      payload,
    });
  }
  return records;
}

async function readBenchmarkLineage(client) {
  const [upstreamResult, downstreamResult] = await Promise.all([
    client.callTool("get_lineage", {
      urn: VERITY_BENCHMARK_ASSET.urn,
      upstream: true,
      max_hops: 1,
      max_results: 30,
    }),
    client.callTool("get_lineage", {
      urn: VERITY_BENCHMARK_ASSET.urn,
      upstream: false,
      max_hops: 3,
      max_results: 30,
    }),
  ]);

  const upstream = extractDatasetUrns(upstreamResult).filter(
    (urn) => urn !== VERITY_BENCHMARK_ASSET.urn,
  );
  const downstream = extractDatasetUrns(downstreamResult).filter(
    (urn) => urn !== VERITY_BENCHMARK_ASSET.urn,
  );
  const requiredUpstream = [
    VERITY_ASSET_BY_ID.get("external-asset-rubric").urn,
    VERITY_ASSET_BY_ID.get("external-asset-test-materials").urn,
  ];

  for (const urn of requiredUpstream) {
    if (!upstream.includes(urn)) {
      throw new VerityAssetReadError(
        `Benchmark lineage is missing required upstream asset: ${urn}`,
        "VERITY_LINEAGE_MISMATCH",
      );
    }
  }

  return {
    upstream,
    downstream,
    passed: true,
  };
}

function overlayAssets(scenario, records, lineage, fetchedAt) {
  const entities = scenario.entities.map((entity) => {
    const record = records.get(entity.id);
    if (!record) return { ...entity };
    const isBenchmark = entity.id === VERITY_BENCHMARK_ASSET.entityId;
    const ownerMissing = isBenchmark && record.owners.length === 0;
    return {
      ...entity,
      source: {
        provider: "datahub",
        reference: record.urn,
      },
      metadata: {
        ...(entity.metadata || {}),
        datahubEntityType: "dataset",
        logicalType: record.logicalType,
        version: record.version,
        qualityStatus: record.qualityStatus,
        freshness: record.freshness,
        owners: record.owners,
        ownerMissing,
        retrievedAt: fetchedAt,
        ...(isBenchmark
          ? {
              upstreamUrns: lineage.upstream,
              downstreamUrns: lineage.downstream,
            }
          : {}),
      },
    };
  });

  const benchmarkOwners = records.get(VERITY_BENCHMARK_ASSET.entityId)?.owners || [];
  const missingOwner = benchmarkOwners.length === 0;
  const updatedEntities = entities.map((entity) => {
    if (entity.id === "risk-benchmark-missing-owner") {
      return {
        ...entity,
        status: missingOwner ? "blocked" : "resolved",
        metadata: {
          ...(entity.metadata || {}),
          missingOwner,
          ownerUrns: benchmarkOwners,
          sourceVerifiedAt: fetchedAt,
        },
      };
    }
    if (entity.id === "task-assign-benchmark-owner") {
      return {
        ...entity,
        status: missingOwner ? "blocked" : "completed",
        metadata: {
          ...(entity.metadata || {}),
          ownerUrns: benchmarkOwners,
          repairVerified: !missingOwner,
        },
      };
    }
    return entity;
  });

  const recommendedActions = scenario.expectedFindings.recommendedActions.filter(
    (action) => missingOwner || !action.toLowerCase().includes("owner"),
  );
  const actionGroups = {
    ...scenario.expectedFindings.actionGroups,
    repair: scenario.expectedFindings.actionGroups.repair.filter(
      (action) => missingOwner || !action.toLowerCase().includes("owner"),
    ),
  };

  return {
    ...scenario,
    entities: updatedEntities,
    expectedFindings: {
      ...scenario.expectedFindings,
      missingOwners: missingOwner ? 1 : 0,
      recommendedActions,
      actionGroups,
    },
  };
}

export async function readVerityAssetSnapshot(options = {}) {
  const ownsClient = !options.client;
  const client = options.client || createDataHubMcpClient(options.clientOptions);
  const now = options.now || (() => new Date());

  try {
    await client.initialize();
    const [scenario, records, lineage] = await Promise.all([
      loadVerityScenario(options),
      readAssets(client),
      readBenchmarkLineage(client),
    ]);
    const fetchedAt = now().toISOString();
    const overlaidScenario = overlayAssets(
      scenario,
      records,
      lineage,
      fetchedAt,
    );

    return {
      source: "datahub-mcp",
      readOnly: true,
      mutationEnabled: false,
      fetchedAt,
      projectId: "project-verity",
      scenario: overlaidScenario,
      diagnostics: {
        assetCount: records.size,
        requiredAssetCount: VERITY_ASSETS.length,
        lineageVerification: lineage,
        benchmarkOwnerCount:
          records.get(VERITY_BENCHMARK_ASSET.entityId)?.owners.length || 0,
        boundary: "datahub-assets-over-nexus-context",
      },
    };
  } finally {
    if (ownsClient) await client.close();
  }
}
