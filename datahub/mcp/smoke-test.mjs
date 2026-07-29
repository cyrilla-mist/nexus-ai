// Node's default test discovery matches *-test.mjs. The real smoke test runs
// only when this file is invoked explicitly.
if (process.env.NODE_TEST_CONTEXT) process.exit(0);

import {
  createDataHubMcpClient,
  parseMcpArgs,
} from "./mcp-client.mjs";
import { readContinuitySnapshot } from "./continuity-live-reader.mjs";

const CAMPUS_PROJECT_URN =
  "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)";

function selectedProject() {
  const flagIndex = process.argv.indexOf("--project");
  const value =
    flagIndex >= 0
      ? process.argv[flagIndex + 1]
      : process.env.NEXUS_MCP_SMOKE_TARGET || "campus";
  if (!["campus", "continuity"].includes(value)) {
    throw new Error("Smoke target must be campus or continuity.");
  }
  return value;
}

function assertContains(result, expected, label) {
  if (!JSON.stringify(result ?? {}).includes(expected)) {
    throw new Error(`${label} did not contain the expected read-only evidence.`);
  }
}

async function verifyCampus(client) {
  const searchResult = await client.callTool("search", {
    query: "campus-low-carbon",
    num_results: 20,
  });
  assertContains(searchResult, "campus-low-carbon", "search");

  const entityResult = await client.callTool("get_entities", {
    urns: [CAMPUS_PROJECT_URN],
  });
  assertContains(entityResult, CAMPUS_PROJECT_URN, "get_entities");
  assertContains(entityResult, "校园低碳循环计划", "get_entities");

  const lineageResult = await client.callTool("get_lineage", {
    urn: CAMPUS_PROJECT_URN,
    upstream: true,
    max_hops: 1,
    max_results: 30,
  });
  assertContains(lineageResult, "campus-low-carbon", "get_lineage");
}

async function verifyContinuity(client) {
  const snapshot = await readContinuitySnapshot({ client });
  if (!snapshot.diagnostics.projectRootFound) {
    throw new Error("Nexus continuity project root was not found.");
  }
  if (!snapshot.diagnostics.lineageVerification.passed) {
    throw new Error("Nexus continuity lineage verification did not pass.");
  }
  console.log(
    `Continuity datasets: ${snapshot.diagnostics.totalDatasets}; ` +
      `entities: ${snapshot.diagnostics.actualEntities}; ` +
      `relationships: ${snapshot.diagnostics.actualRelationships}`,
  );
}

async function main() {
  const client = createDataHubMcpClient({
    command: process.env.DATAHUB_MCP_COMMAND,
    args: parseMcpArgs(),
    environment: {
      TOOLS_IS_MUTATION_ENABLED: "false",
      TOOLS_IS_USER_ENABLED: "false",
      TOOLS_IS_DATA_QUALITY_ENABLED: "false",
      DATAHUB_MCP_DOCUMENT_TOOLS_DISABLED: "true",
      SAVE_DOCUMENT_TOOL_ENABLED: "false",
    },
  });
  try {
    await client.initialize();
    if (selectedProject() === "continuity") await verifyContinuity(client);
    else await verifyCampus(client);
    console.log("PASS: DataHub MCP read-only smoke test completed");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    `MCP read-only smoke test not completed: ${
      error?.message || "unknown error"
    }`,
  );
  process.exitCode = 1;
});
