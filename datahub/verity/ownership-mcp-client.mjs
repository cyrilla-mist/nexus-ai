import { spawn } from "node:child_process";
import readline from "node:readline";

import { VERITY_BENCHMARK_ASSET } from "./asset-registry.mjs";

const DEFAULT_COMMAND = "uvx";
const DEFAULT_ARGS = Object.freeze(["mcp-server-datahub@latest"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const OWNER_URN_PATTERN = /^urn:li:(corpuser|corpGroup):[^\s]+$/;

export class VerityOwnershipError extends Error {
  constructor(message, code = "VERITY_OWNERSHIP_ERROR", options = {}) {
    super(message, options);
    this.name = "VerityOwnershipError";
    this.code = code;
  }
}

export function validateOwnerUrn(value) {
  if (typeof value !== "string" || !OWNER_URN_PATTERN.test(value)) {
    throw new VerityOwnershipError(
      "Owner must be a DataHub CorpUser or CorpGroup URN.",
      "INVALID_OWNER_URN",
    );
  }
  return value;
}

export function createOwnershipEnvironment(environment = {}) {
  return {
    ...process.env,
    ...environment,
    DATAHUB_GMS_URL:
      environment.DATAHUB_GMS_URL ||
      process.env.DATAHUB_GMS_URL ||
      "http://localhost:8080",
    TOOLS_IS_MUTATION_ENABLED: "true",
    TOOLS_IS_USER_ENABLED: "false",
    TOOLS_IS_DATA_QUALITY_ENABLED: "false",
    DATAHUB_MCP_DOCUMENT_TOOLS_DISABLED: "true",
    SAVE_DOCUMENT_TOOL_ENABLED: "false",
  };
}

function parseArgs(value = process.env.DATAHUB_MCP_ARGS) {
  if (value === undefined || value === null || value === "") {
    return [...DEFAULT_ARGS];
  }
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new VerityOwnershipError(
      "DATAHUB_MCP_ARGS must be a JSON array of strings.",
      "INVALID_MCP_ARGS",
    );
  }
  return [...parsed];
}

function createTransport(options = {}) {
  const child = (options.spawnImpl || spawn)(
    options.command || process.env.DATAHUB_MCP_COMMAND || DEFAULT_COMMAND,
    parseArgs(options.args),
    {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
      env: createOwnershipEnvironment(options.environment),
    },
  );
  const requestTimeoutMs =
    Number(
      options.requestTimeoutMs ?? process.env.DATAHUB_MCP_REQUEST_TIMEOUT_MS,
    ) || DEFAULT_TIMEOUT_MS;
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let nextId = 1;
  let closed = false;
  let stderrTail = "";

  child.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + String(chunk)).slice(-8192);
  });

  function rejectPending(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  child.on("error", (error) => {
    rejectPending(
      new VerityOwnershipError(
        `Unable to start the DataHub mutation MCP server: ${error.message}`,
        "MCP_SPAWN_ERROR",
        { cause: error },
      ),
    );
  });
  child.on("exit", (code, signal) => {
    if (closed) return;
    rejectPending(
      new VerityOwnershipError(
        `DataHub mutation MCP server exited unexpectedly (${signal || code}).`,
        "MCP_PROCESS_EXITED",
        stderrTail ? { cause: new Error(stderrTail) } : {},
      ),
    );
  });
  lines.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.id === undefined || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) {
      request.reject(
        new VerityOwnershipError(
          message.error.message || "DataHub MCP request failed.",
          "MCP_JSON_RPC_ERROR",
        ),
      );
    } else {
      request.resolve(message.result);
    }
  });

  function write(message) {
    if (closed) {
      throw new VerityOwnershipError("Mutation client is closed.", "MCP_CLOSED");
    }
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new VerityOwnershipError(
            `${method} timed out after ${requestTimeoutMs}ms.`,
            "MCP_REQUEST_TIMEOUT",
          ),
        );
      }, requestTimeoutMs);
      pending.set(id, { resolve, reject, timer });
      try {
        write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  return {
    request,
    notify(method, params = {}) {
      write({ jsonrpc: "2.0", method, params });
    },
    async close() {
      if (closed) return;
      closed = true;
      lines.close();
      rejectPending(
        new VerityOwnershipError("Mutation client closed.", "MCP_CLOSED"),
      );
      if (!child.stdin.destroyed) child.stdin.end();
      if (child.exitCode === null && child.signalCode === null) child.kill();
    },
  };
}

export function createVerityOwnershipClient(options = {}) {
  const transport = options.transport || createTransport(options);
  let initialized = false;
  let toolNames = [];

  async function initialize() {
    if (initialized) return { toolNames: [...toolNames] };
    await transport.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "nexus-verity-owner-repair", version: "0.1.0" },
    });
    transport.notify("notifications/initialized", {});
    const result = await transport.request("tools/list");
    toolNames = (result?.tools || []).map((tool) => tool?.name).filter(Boolean);
    if (!toolNames.includes("add_owners")) {
      throw new VerityOwnershipError(
        "The DataHub MCP add_owners tool is unavailable.",
        "ADD_OWNERS_TOOL_MISSING",
      );
    }
    initialized = true;
    return { toolNames: [...toolNames] };
  }

  async function addBenchmarkOwner(ownerUrn) {
    const owner = validateOwnerUrn(ownerUrn);
    if (!initialized) await initialize();
    return transport.request("tools/call", {
      name: "add_owners",
      arguments: {
        owner_urns: [owner],
        entity_urns: [VERITY_BENCHMARK_ASSET.urn],
      },
    });
  }

  return {
    initialize,
    addBenchmarkOwner,
    targetUrn: VERITY_BENCHMARK_ASSET.urn,
    close: () => transport.close(),
  };
}
