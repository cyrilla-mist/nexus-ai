import { createDataHubMcpClient } from "./mcp-client.mjs";
import {
  CONTINUITY_NAMESPACE,
  CONTINUITY_PROJECT_URN,
  ContinuityLiveReadError,
  extractDatasetUrns,
  extractEntityRecords,
  extractLineageUrns,
  filterContinuityDatasetUrns,
  normalizeContinuityRecords,
} from "./continuity-live-normalizer.mjs";

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_RECORDS = 200;
const DEFAULT_SEARCH_PAGE_SIZE = 20;
const PREFERRED_LINEAGE_TYPES = new Set([
  "supports",
  "produces",
  "informs",
  "confirms",
  "requires",
  "results_in",
]);

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function searchPageInfo(result) {
  const payload = result?.structuredContent;
  if (!payload || typeof payload !== "object") return null;
  const searchResults = Array.isArray(payload.searchResults)
    ? payload.searchResults
    : null;
  const total = Number(payload.total);
  const start = Number(payload.start);
  if (!searchResults || !Number.isFinite(total)) return null;
  return {
    total,
    start: Number.isFinite(start) ? start : 0,
    returned: searchResults.length,
  };
}

async function searchContinuityUrns(
  client,
  maxRecords,
  pageSize = DEFAULT_SEARCH_PAGE_SIZE,
) {
  const boundedPageSize = Math.min(
    50,
    Math.max(1, Number(pageSize) || DEFAULT_SEARCH_PAGE_SIZE),
  );
  const pageLimit = Math.ceil(maxRecords / boundedPageSize) + 1;
  const candidates = new Set();
  let offset = 0;

  for (let page = 0; page < pageLimit; page += 1) {
    const result = await client.callTool("search", {
      query: CONTINUITY_NAMESPACE,
      num_results: boundedPageSize,
      offset,
    });
    for (const urn of extractDatasetUrns(result)) candidates.add(urn);

    const info = searchPageInfo(result);
    if (!info) break;
    if (info.total > maxRecords) {
      throw new ContinuityLiveReadError(
        `Continuity search returned more than the ${maxRecords} record limit.`,
        "ENTITY_LIMIT_EXCEEDED",
      );
    }
    if (info.returned === 0 || info.start + info.returned >= info.total) {
      return filterContinuityDatasetUrns([...candidates], maxRecords);
    }
    offset = info.start + info.returned;
  }

  if (offset > 0) {
    throw new ContinuityLiveReadError(
      "Continuity search pagination exceeded its bounded page limit.",
      "SEARCH_PAGE_LIMIT_EXCEEDED",
    );
  }
  return filterContinuityDatasetUrns([...candidates], maxRecords);
}

function selectLineageAnchors(scenario, urnByEntityId, limit = 2) {
  const preferred = scenario.relationships.filter((relationship) =>
    PREFERRED_LINEAGE_TYPES.has(relationship.type),
  );
  const candidates = preferred.length >= limit ? preferred : scenario.relationships;
  const seenTargets = new Set();
  const anchors = [];
  for (const relationship of candidates) {
    if (seenTargets.has(relationship.to)) continue;
    const downstreamUrn = urnByEntityId[relationship.to];
    const upstreamUrn = urnByEntityId[relationship.from];
    if (!downstreamUrn || !upstreamUrn) continue;
    seenTargets.add(relationship.to);
    anchors.push({
      relationshipId: relationship.id,
      relationshipType: relationship.type,
      upstreamEntityId: relationship.from,
      downstreamEntityId: relationship.to,
      upstreamUrn,
      downstreamUrn,
    });
    if (anchors.length === limit) break;
  }
  if (anchors.length < limit) {
    throw new ContinuityLiveReadError(
      "Not enough representative relationships are available for lineage verification.",
      "LINEAGE_ANCHOR_MISSING",
    );
  }
  return anchors;
}

export async function verifyContinuityLineage(client, normalized, limit = 2) {
  const anchors = selectLineageAnchors(
    normalized.scenario,
    normalized.urnByEntityId,
    limit,
  );
  const checked = [];
  for (const anchor of anchors) {
    const result = await client.callTool("get_lineage", {
      urn: anchor.downstreamUrn,
      upstream: true,
      max_hops: 1,
      max_results: 30,
    });
    const lineageUrns = extractLineageUrns(result);
    if (!lineageUrns.includes(anchor.upstreamUrn)) {
      throw new ContinuityLiveReadError(
        `DataHub lineage does not include the expected upstream for ${anchor.relationshipId}.`,
        "LINEAGE_MISMATCH",
      );
    }
    checked.push({
      relationshipId: anchor.relationshipId,
      relationshipType: anchor.relationshipType,
      upstreamEntityId: anchor.upstreamEntityId,
      downstreamEntityId: anchor.downstreamEntityId,
    });
  }
  return {
    checked: true,
    anchors: checked,
    passed: true,
  };
}

export async function readContinuitySnapshot(options = {}) {
  const ownsClient = !options.client;
  const client = options.client || createDataHubMcpClient(options.clientOptions);
  const batchSize = Math.min(
    25,
    Math.max(1, Number(options.batchSize) || DEFAULT_BATCH_SIZE),
  );
  const maxRecords = Math.max(
    1,
    Number(options.maxRecords) || DEFAULT_MAX_RECORDS,
  );
  const now = options.now || (() => new Date());

  try {
    await client.initialize();
    const urns = await searchContinuityUrns(
      client,
      maxRecords,
      options.searchPageSize,
    );
    if (!urns.includes(CONTINUITY_PROJECT_URN)) {
      throw new ContinuityLiveReadError(
        "The Nexus continuity project root was not returned by search.",
        "PROJECT_ROOT_MISSING",
      );
    }

    const records = [];
    for (const batch of chunks(urns, batchSize)) {
      let result;
      try {
        result = await client.callTool("get_entities", { urns: batch });
      } catch (error) {
        throw new ContinuityLiveReadError(
          `Unable to read a Continuity entity batch (${batch.length} URNs).`,
          "ENTITY_BATCH_FAILED",
          { cause: error },
        );
      }
      records.push(...extractEntityRecords(result));
    }
    const uniqueRecords = new Map(records.map((record) => [record.urn, record]));
    if (uniqueRecords.size !== urns.length) {
      throw new ContinuityLiveReadError(
        `Entity read was incomplete: requested ${urns.length}, received ${uniqueRecords.size}.`,
        "ENTITY_BATCH_INCOMPLETE",
      );
    }

    const normalized = normalizeContinuityRecords([...uniqueRecords.values()]);
    const lineageVerification = await verifyContinuityLineage(
      client,
      normalized,
      options.lineageAnchorCount || 2,
    );
    const fetchedAt = now().toISOString();
    return {
      source: "datahub-mcp",
      readOnly: true,
      fetchedAt,
      projectUrn: normalized.projectUrn,
      scenario: normalized.scenario,
      diagnostics: {
        ...normalized.diagnostics,
        lineageVerification,
        cached: false,
      },
    };
  } finally {
    if (ownsClient) await client.close();
  }
}
