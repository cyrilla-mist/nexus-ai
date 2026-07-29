import { spawn } from "node:child_process";

// Node's default test discovery matches *-test.mjs. The real smoke test runs
// only when this file is invoked explicitly.
if (process.env.NODE_TEST_CONTEXT) process.exit(0);

import readline from "node:readline";

const PROJECT_URN = "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)";
const DEFAULT_COMMAND = "uvx";
const DEFAULT_ARGS = ["mcp-server-datahub@latest"];
const REQUIRED_READ_TOOLS = ["search", "get_entities", "get_lineage"];
const MUTATION_TOOLS = new Set([
  "add_tags", "remove_tags", "add_terms", "remove_terms", "set_domains",
  "set_owners", "update_description", "update_documentation",
  "create_document", "save_document"
]);

function parseArgs() {
  if (!process.env.DATAHUB_MCP_ARGS) return DEFAULT_ARGS;
  const parsed = JSON.parse(process.env.DATAHUB_MCP_ARGS);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error("DATAHUB_MCP_ARGS must be a JSON array of strings");
  }
  return parsed;
}

function textFromResult(result) {
  return JSON.stringify(result ?? {});
}

function assertResultContains(result, expected, label) {
  if (!textFromResult(result).includes(expected)) {
    throw new Error(`${label} did not contain the expected fixture evidence`);
  }
}

const command = process.env.DATAHUB_MCP_COMMAND || DEFAULT_COMMAND;
const args = parseArgs();
const child = spawn(command, args, {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
  env: {
    ...process.env,
    DATAHUB_GMS_URL: process.env.DATAHUB_GMS_URL || "http://localhost:8080",
    TOOLS_IS_MUTATION_ENABLED: "false",
    TOOLS_IS_USER_ENABLED: "false",
    DATAHUB_MCP_DOCUMENT_TOOLS_DISABLED: "true",
    SAVE_DOCUMENT_TOOL_ENABLED: "false"
  }
});

let nextId = 1;
let spawnError;
const pending = new Map();
const stderr = [];

child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
child.on("error", (error) => {
  spawnError = error;
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(error);
  }
  pending.clear();
});

const lines = readline.createInterface({ input: child.stdout });
lines.on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.id === undefined || !pending.has(message.id)) return;
  const { resolve, reject, timer } = pending.get(message.id);
  clearTimeout(timer);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message || "MCP request failed"));
  else resolve(message.result);
});

function send(message) {
  if (spawnError) throw spawnError;
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(method, params = {}, timeoutMs = 15000) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    try {
      send({ jsonrpc: "2.0", id, method, params });
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    }
  });
}

function callTool(name, arguments_) {
  return request("tools/call", { name, arguments: arguments_ }, 30000);
}

async function main() {
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "nexus-datahub-readonly-smoke", version: "0.1.0" }
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const listed = await request("tools/list");
  const names = new Set((listed?.tools || []).map((tool) => tool.name));
  for (const required of REQUIRED_READ_TOOLS) {
    if (!names.has(required)) throw new Error(`required read tool is unavailable: ${required}`);
  }
  const exposedMutation = [...names].find((name) => MUTATION_TOOLS.has(name));
  if (exposedMutation) throw new Error(`mutation tool exposed in read-only mode: ${exposedMutation}`);

  const searchResult = await callTool("search", { query: "campus-low-carbon", num_results: 20 });
  assertResultContains(searchResult, "campus-low-carbon", "search");

  const entityResult = await callTool("get_entities", { urns: [PROJECT_URN] });
  assertResultContains(entityResult, PROJECT_URN, "get_entities");
  assertResultContains(entityResult, "校园低碳循环计划", "get_entities");

  const lineageResult = await callTool("get_lineage", {
    urn: PROJECT_URN,
    upstream: true,
    max_hops: 1,
    max_results: 30
  });
  assertResultContains(lineageResult, "campus-low-carbon", "get_lineage");

  console.log("PASS: DataHub MCP read-only smoke test completed");
}

main()
  .catch((error) => {
    const detail = error?.message || stderr.join("").trim() || "unknown error";
    console.error(`MCP read-only smoke test not completed: ${detail}`);
    process.exitCode = 1;
  })
  .finally(() => {
    lines.close();
    child.stdin.end();
    child.kill();
  });
