import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createDataHubMcpClient,
  createReadOnlyEnvironment,
  REQUIRED_READ_TOOLS,
} from "../datahub/mcp/mcp-client.mjs";
import {
  CONTINUITY_NAMESPACE,
  CONTINUITY_PROJECT_URN,
  extractDatasetUrns,
  filterContinuityDatasetUrns,
  normalizeContinuityRecords,
  parseCustomProperty,
} from "../datahub/mcp/continuity-live-normalizer.mjs";
import {
  readContinuitySnapshot,
  verifyContinuityLineage,
} from "../datahub/mcp/continuity-live-reader.mjs";
import { createContinuityLiveBridge } from "../datahub/mcp/continuity-live-bridge.mjs";
import { createContinuityProvider } from "../experience/continuity/continuity-provider.mjs";

const scenario = JSON.parse(
  fs.readFileSync(
    new URL("../continuity/scenarios/nexus-self-reentry.json", import.meta.url),
    "utf8",
  ),
);
const page = fs.readFileSync(
  new URL("../reentry.html", import.meta.url),
  "utf8",
);
const pageScript = fs.readFileSync(
  new URL("../frontend/continuity/reentry.js", import.meta.url),
  "utf8",
);
const datahubProviderSource = fs.readFileSync(
  new URL("../experience/continuity/datahub-continuity-provider.mjs", import.meta.url),
  "utf8",
);

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function urnFor(entity) {
  return `urn:li:dataset:(urn:li:dataPlatform:nexus,${CONTINUITY_NAMESPACE}.${entity.type}.${entity.id},DEV)`;
}

function capturedRecords(source = scenario) {
  const outgoing = Object.fromEntries(
    source.entities.map((entity) => [entity.id, []]),
  );
  for (const relationship of source.relationships) {
    outgoing[relationship.from].push({
      id: relationship.id,
      type: relationship.type,
      from: relationship.from,
      to: relationship.to,
      createdAt: relationship.createdAt,
      metadata: relationship.metadata,
    });
  }
  const root = {
    urn: CONTINUITY_PROJECT_URN,
    name: source.project.name,
    description: source.project.description,
    customProperties: {
      nexusSchemaVersion: source.schemaVersion,
      nexusProjectId: source.project.id,
      nexusRecordKind: "project",
      nexusProjectStatus: source.project.status,
      nexusCreatedAt: source.project.createdAt,
      nexusUpdatedAt: source.project.updatedAt,
      nexusIsFixture: "true",
      nexusEntityCount: String(source.entities.length),
      nexusRelationshipCount: String(source.relationships.length),
      nexusMeaningfulChanges: String(source.expectedFindings.meaningfulChanges),
      nexusStaleRecords: String(source.expectedFindings.staleRecords),
      nexusAgentConflicts: String(source.expectedFindings.agentConflicts),
      nexusMissingOwners: String(source.expectedFindings.missingOwners),
      nexusValidDecisions: String(source.expectedFindings.validDecisions),
      nexusRecommendedActions: JSON.stringify(
        source.expectedFindings.recommendedActions,
      ),
      nexusReentryQuery: JSON.stringify(source.reentryQuery),
    },
  };
  const optional = {
    confidence: "nexusConfidence",
    ownerId: "nexusOwnerId",
    confirmedBy: "nexusConfirmedBy",
    confirmedAt: "nexusConfirmedAt",
    expiresAt: "nexusExpiresAt",
    agent: "nexusAgent",
    priority: "nexusPriority",
    completionCriteria: "nexusCompletionCriteria",
    supersedes: "nexusSupersedes",
    supersededBy: "nexusSupersededBy",
  };
  return [
    root,
    ...source.entities.map((entity) => {
      const customProperties = {
        nexusSchemaVersion: source.schemaVersion,
        nexusProjectId: source.project.id,
        nexusEntityId: entity.id,
        nexusEntityType: entity.type,
        nexusStatus: entity.status,
        nexusCreatedAt: entity.createdAt,
        nexusUpdatedAt: entity.updatedAt,
        nexusIsFixture: "true",
        nexusIncomingRelationships: "[]",
        nexusOutgoingRelationships: JSON.stringify(outgoing[entity.id]),
      };
      if (entity.source) {
        customProperties.nexusSource = JSON.stringify(entity.source);
      }
      if (entity.metadata) {
        customProperties.nexusMetadata = JSON.stringify(entity.metadata);
      }
      for (const [key, mapped] of Object.entries(optional)) {
        if (entity[key] !== undefined) {
          customProperties[mapped] = String(entity[key]);
        }
      }
      return {
        urn: urnFor(entity),
        name: entity.title,
        description: entity.summary,
        customProperties,
      };
    }),
  ];
}

function fakeTransport(tools = REQUIRED_READ_TOOLS) {
  const requests = [];
  return {
    requests,
    async request(method) {
      requests.push(method);
      if (method === "initialize") return { protocolVersion: "2024-11-05" };
      if (method === "tools/list") {
        return { tools: tools.map((name) => ({ name })) };
      }
      return {};
    },
    notify(method) {
      requests.push(method);
    },
    async close() {},
  };
}

function fakeLiveClient(records = capturedRecords()) {
  const calls = [];
  const urnById = Object.fromEntries(
    scenario.entities.map((entity) => [entity.id, urnFor(entity)]),
  );
  return {
    calls,
    async initialize() {
      return {
        requiredTools: [...REQUIRED_READ_TOOLS],
        mutationToolsExposed: false,
      };
    },
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === "search") {
        return {
          structuredContent: {
            urns: [
              ...records.map((record) => record.urn),
              records[1].urn,
              "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)",
            ],
          },
        };
      }
      if (name === "get_entities") {
        return {
          structuredContent: {
            entities: records.filter((record) => args.urns.includes(record.urn)),
          },
        };
      }
      if (name === "get_lineage") {
        const upstreams = scenario.relationships
          .filter((relationship) => urnById[relationship.to] === args.urn)
          .map((relationship) => urnById[relationship.from]);
        return { structuredContent: { urns: upstreams } };
      }
      throw new Error(`Unexpected tool: ${name}`);
    },
    async close() {},
  };
}

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = "") {
      this.body = value;
    },
  };
}

test("MCP Client initializes before listing tools", async () => {
  const transport = fakeTransport();
  const client = createDataHubMcpClient({ transport });
  await client.initialize();
  assert.deepEqual(transport.requests.slice(0, 3), [
    "initialize",
    "notifications/initialized",
    "tools/list",
  ]);
});

test("required DataHub read tools are verified", async () => {
  const client = createDataHubMcpClient({ transport: fakeTransport() });
  const status = await client.initialize();
  assert.deepEqual(status.requiredTools, REQUIRED_READ_TOOLS);
});

test("an exposed mutation tool is rejected", async () => {
  const client = createDataHubMcpClient({
    transport: fakeTransport([...REQUIRED_READ_TOOLS, "set_owners"]),
  });
  await assert.rejects(client.initialize(), { code: "MUTATION_TOOL_EXPOSED" });
});

test("read-only environment overrides unsafe mutation flags", () => {
  const environment = createReadOnlyEnvironment({
    TOOLS_IS_MUTATION_ENABLED: "true",
  });
  assert.equal(environment.TOOLS_IS_MUTATION_ENABLED, "false");
  assert.equal(environment.TOOLS_IS_USER_ENABLED, "false");
});

test("project namespace filtering keeps only Nexus Continuity DEV datasets", () => {
  const filtered = filterContinuityDatasetUrns([
    CONTINUITY_PROJECT_URN,
    "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.other.project,DEV)",
  ]);
  assert.deepEqual(filtered, [CONTINUITY_PROJECT_URN]);
});

test("campus fixture records are excluded from live search", () => {
  const campus =
    "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)";
  assert.deepEqual(
    filterContinuityDatasetUrns([CONTINUITY_PROJECT_URN, campus]),
    [CONTINUITY_PROJECT_URN],
  );
});

test("duplicate search URNs are deduplicated and sorted", () => {
  assert.deepEqual(
    filterContinuityDatasetUrns([CONTINUITY_PROJECT_URN, CONTINUITY_PROJECT_URN]),
    [CONTINUITY_PROJECT_URN],
  );
});

test("entity count mismatch is rejected", () => {
  const records = capturedRecords();
  records[0].customProperties.nexusEntityCount = "999";
  assert.throws(() => normalizeContinuityRecords(records), {
    code: "ENTITY_COUNT_MISMATCH",
  });
});

test("missing project root is rejected", () => {
  assert.throws(() => normalizeContinuityRecords(capturedRecords().slice(1)), {
    code: "PROJECT_ROOT_MISSING",
  });
});

test("JSON custom properties are parsed without eval", () => {
  assert.deepEqual(
    parseCustomProperty("nexusMetadata", '{"safe":true}', "urn:test"),
    { safe: true },
  );
  assert.throws(
    () => parseCustomProperty("nexusMetadata", "{broken", "urn:test"),
    { code: "INVALID_CUSTOM_PROPERTY_JSON" },
  );
});

test("boolean and number custom properties are normalized", () => {
  assert.equal(parseCustomProperty("nexusIsFixture", "false"), false);
  assert.equal(parseCustomProperty("nexusEntityCount", "38"), 38);
  assert.equal(parseCustomProperty("nexusConfidence", "0.8"), 0.8);
});

test("relationships are rebuilt once from outgoing metadata", () => {
  const normalized = normalizeContinuityRecords(capturedRecords());
  assert.equal(normalized.scenario.relationships.length, 29);
  assert.equal(
    new Set(normalized.scenario.relationships.map((item) => item.id)).size,
    29,
  );
});

test("relationship count mismatch is rejected", () => {
  const records = capturedRecords();
  records[0].customProperties.nexusRelationshipCount = "30";
  assert.throws(() => normalizeContinuityRecords(records), {
    code: "RELATIONSHIP_COUNT_MISMATCH",
  });
});

test("invalid relationship target is rejected", () => {
  const records = capturedRecords();
  const entity = records.find(
    (record) =>
      typeof record.customProperties.nexusOutgoingRelationships === "string" &&
      record.customProperties.nexusOutgoingRelationships !== "[]",
  );
  const values = JSON.parse(
    entity.customProperties.nexusOutgoingRelationships,
  );
  values[0].to = "missing-target";
  entity.customProperties.nexusOutgoingRelationships = JSON.stringify(values);
  assert.throws(() => normalizeContinuityRecords(records), {
    code: "INVALID_RELATIONSHIP_TARGET",
  });
});

test("representative lineage is actually verified", async () => {
  const normalized = normalizeContinuityRecords(capturedRecords());
  const result = await verifyContinuityLineage(
    fakeLiveClient(),
    normalized,
    2,
  );
  assert.equal(result.passed, true);
  assert.equal(result.anchors.length, 2);
});

test("lineage mismatch rejects the live snapshot", async () => {
  const normalized = normalizeContinuityRecords(capturedRecords());
  const client = fakeLiveClient();
  client.callTool = async () => ({ structuredContent: { urns: [] } });
  await assert.rejects(verifyContinuityLineage(client, normalized, 2), {
    code: "LINEAGE_MISMATCH",
  });
});

test("live snapshot is stable and reports current 38 / 39 / 29 counts", async () => {
  const first = await readContinuitySnapshot({
    client: fakeLiveClient(),
    now: () => new Date("2026-07-30T12:00:00Z"),
  });
  const second = await readContinuitySnapshot({
    client: fakeLiveClient(),
    now: () => new Date("2026-07-30T12:00:00Z"),
  });
  assert.equal(stableJson(first), stableJson(second));
  assert.equal(first.diagnostics.actualEntities, 38);
  assert.equal(first.diagnostics.totalDatasets, 39);
  assert.equal(first.diagnostics.actualRelationships, 29);
});

test("fixture provider continues to load the static scenario", async () => {
  const provider = createContinuityProvider({
    mode: "fixture",
    fetchImpl: async () => ({ ok: true, json: async () => scenario }),
  });
  const result = await provider.loadScenario();
  assert.equal(result.sourceInfo.mode, "fixture");
  assert.equal(result.scenario.project.id, "project-nexus-ai");
});

test("DataHub provider reads the configured bridge response", async () => {
  const provider = createContinuityProvider({
    mode: "datahub",
    bridgeUrl: "http://127.0.0.1:8789/api/continuity/reentry",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        source: "datahub-mcp",
        readOnly: true,
        fetchedAt: "2026-07-30T12:00:00Z",
        scenario,
        diagnostics: { cached: false },
      }),
    }),
  });
  const result = await provider.loadScenario();
  assert.equal(result.sourceInfo.label, "DataHub MCP");
  assert.equal(result.sourceInfo.live, true);
});

test("DataHub provider never silently falls back to fixture", async () => {
  const provider = createContinuityProvider({
    mode: "datahub",
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({
        error: { code: "MCP_UNAVAILABLE", message: "Unavailable" },
      }),
    }),
  });
  await assert.rejects(provider.loadScenario(), /Unavailable/);
});

test("unknown source mode is rejected explicitly", () => {
  assert.throws(() => createContinuityProvider({ mode: "unknown" }), {
    code: "UNKNOWN_CONTINUITY_SOURCE",
  });
});

test("Bridge CORS only echoes an allowed origin", async () => {
  const bridge = createContinuityLiveBridge({
    client: fakeLiveClient(),
    readSnapshot: async () => ({ ok: true }),
    allowedOrigins: ["http://localhost:8000"],
  });
  const allowed = mockResponse();
  await bridge.handler(
    {
      method: "GET",
      url: "/api/continuity/reentry",
      headers: { origin: "http://localhost:8000" },
    },
    allowed,
  );
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://localhost:8000",
  );
  const denied = mockResponse();
  await bridge.handler(
    {
      method: "GET",
      url: "/health",
      headers: { origin: "https://example.com" },
    },
    denied,
  );
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
  await bridge.close();
});

test("Bridge rejects POST without invoking a tool", async () => {
  const client = fakeLiveClient();
  const bridge = createContinuityLiveBridge({ client });
  const response = mockResponse();
  await bridge.handler(
    { method: "POST", url: "/api/continuity/reentry", headers: {} },
    response,
  );
  assert.equal(response.statusCode, 405);
  assert.equal(client.calls.length, 0);
  await bridge.close();
});

test("Bridge error responses do not expose environment values", async () => {
  const bridge = createContinuityLiveBridge({
    client: fakeLiveClient(),
    readSnapshot: async () => {
      const error = new Error("DataHub live read is unavailable.");
      error.code = "MCP_UNAVAILABLE";
      throw error;
    },
  });
  const response = mockResponse();
  await bridge.handler(
    { method: "GET", url: "/api/continuity/reentry", headers: {} },
    response,
  );
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /DATAHUB_TOKEN|C:\\Users|password/i);
  await bridge.close();
});

test("source labels and explicit fixture recovery match the actual mode", () => {
  assert.match(page, /id="continuity-source-label">Continuity fixture/);
  assert.match(page, /data-continuity-bridge-url="http:\/\/127\.0\.0\.1:8789/);
  assert.match(pageScript, /DataHub MCP/);
  assert.match(datahubProviderSource, /Live read/);
  assert.match(datahubProviderSource, /read-only/);
  assert.match(pageScript, /Use fixture mode/);
  assert.doesNotMatch(pageScript, /localhost:8080|write-back is enabled/i);
});

test("mutation-shaped tools are rejected even when not in the known list", async () => {
  const client = createDataHubMcpClient({
    transport: fakeTransport([...REQUIRED_READ_TOOLS, "delete_dataset"]),
  });
  await assert.rejects(client.initialize(), { code: "MUTATION_TOOL_EXPOSED" });
});

test("entity extraction accepts MCP maps keyed by Dataset URN", async () => {
  const records = capturedRecords();
  const client = fakeLiveClient(records);
  client.callTool = async (name, args) => {
    if (name === "search") {
      return { structuredContent: { urns: records.map((record) => record.urn) } };
    }
    if (name === "get_entities") {
      return {
        structuredContent: {
          entities: Object.fromEntries(
            records
              .filter((record) => args.urns.includes(record.urn))
              .map(({ urn, ...record }) => [urn, record]),
          ),
        },
      };
    }
    if (name === "get_lineage") {
      const urnById = Object.fromEntries(
        scenario.entities.map((entity) => [entity.id, urnFor(entity)]),
      );
      return {
        structuredContent: {
          urns: scenario.relationships
            .filter((relationship) => urnById[relationship.to] === args.urn)
            .map((relationship) => urnById[relationship.from]),
        },
      };
    }
    throw new Error(`Unexpected tool: ${name}`);
  };
  const snapshot = await readContinuitySnapshot({ client });
  assert.equal(snapshot.diagnostics.actualEntities, 38);
});

test("search extraction accepts captured MCP text payloads", () => {
  const result = {
    content: [
      {
        type: "text",
        text: JSON.stringify({ urns: [CONTINUITY_PROJECT_URN] }),
      },
    ],
  };
  assert.deepEqual(extractDatasetUrns(result), [CONTINUITY_PROJECT_URN]);
});
