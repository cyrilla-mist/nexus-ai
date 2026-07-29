import { spawn } from "node:child_process";
import readline from "node:readline";

export const REQUIRED_READ_TOOLS = Object.freeze([
  "search",
  "get_entities",
  "get_lineage",
]);

export const MUTATION_TOOLS = Object.freeze([
  "add_tags",
  "remove_tags",
  "add_terms",
  "remove_terms",
  "set_domains",
  "set_owners",
  "update_description",
  "update_documentation",
  "create_document",
  "save_document",
]);

const DEFAULT_COMMAND = "uvx";
const DEFAULT_ARGS = Object.freeze(["mcp-server-datahub@latest"]);
const DEFAULT_TIMEOUT_MS = 30_000;

export class DataHubMcpError extends Error {
  constructor(message, code = "MCP_ERROR", options = {}) {
    super(message, options);
    this.name = "DataHubMcpError";
    this.code = code;
  }
}

export function parseMcpArgs(value = process.env.DATAHUB_MCP_ARGS) {
  if (value === undefined || value === null || value === "") return [...DEFAULT_ARGS];
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new DataHubMcpError(
      "DATAHUB_MCP_ARGS must be a JSON array of strings.",
      "INVALID_MCP_ARGS",
    );
  }
  return [...parsed];
}

export function createReadOnlyEnvironment(environment = {}) {
  return {
    ...process.env,
    ...environment,
    DATAHUB_GMS_URL:
      environment.DATAHUB_GMS_URL ||
      process.env.DATAHUB_GMS_URL ||
      "http://localhost:8080",
    TOOLS_IS_MUTATION_ENABLED: "false",
    TOOLS_IS_USER_ENABLED: "false",
    TOOLS_IS_DATA_QUALITY_ENABLED: "false",
    DATAHUB_MCP_DOCUMENT_TOOLS_DISABLED: "true",
    SAVE_DOCUMENT_TOOL_ENABLED: "false",
  };
}

export function validateReadOnlyTools(tools) {
  const names = new Set(tools.map((tool) => tool?.name).filter(Boolean));
  for (const required of REQUIRED_READ_TOOLS) {
    if (!names.has(required)) {
      throw new DataHubMcpError(
        `Required read tool is unavailable: ${required}`,
        "REQUIRED_TOOL_MISSING",
      );
    }
  }
  const mutation = [...names].find(
    (name) =>
      MUTATION_TOOLS.includes(name) ||
      /^(add|remove|set|update|create|delete|save|write|patch|assign)_/i.test(
        name,
      ),
  );
  if (mutation) {
    throw new DataHubMcpError(
      `Mutation tool exposed in read-only mode: ${mutation}`,
      "MUTATION_TOOL_EXPOSED",
    );
  }
  return {
    requiredTools: [...REQUIRED_READ_TOOLS],
    mutationToolsExposed: false,
    names: [...names].sort(),
  };
}

function createStdioTransport({
  command,
  args,
  environment,
  requestTimeoutMs,
  spawnImpl,
}) {
  const child = spawnImpl(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: false,
    env: environment,
  });
  let nextId = 1;
  let closed = false;
  let spawnError;
  let stderrBuffer = "";
  const pending = new Map();
  const lines = readline.createInterface({ input: child.stdout });

  function rejectPending(error) {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }

  child.stderr.on("data", (chunk) => {
    // Drain and retain a bounded internal diagnostic tail. The HTTP bridge never
    // serializes it, so runtime paths or credentials cannot reach the browser.
    stderrBuffer = (stderrBuffer + String(chunk)).slice(-8192);
  });
  child.on("error", (error) => {
    spawnError = error;
    rejectPending(
      new DataHubMcpError(
        `Unable to start the DataHub MCP server: ${error.message}`,
        "MCP_SPAWN_ERROR",
        { cause: error },
      ),
    );
  });
  child.on("exit", (code, signal) => {
    if (closed) return;
    const suffix = signal ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    rejectPending(
      new DataHubMcpError(
        `DataHub MCP server exited unexpectedly (${suffix}).`,
        "MCP_PROCESS_EXITED",
        stderrBuffer ? { cause: new Error(stderrBuffer) } : {},
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
    const pendingRequest = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(pendingRequest.timer);
    if (message.error) {
      pendingRequest.reject(
        new DataHubMcpError(
          message.error.message || "DataHub MCP request failed.",
          "MCP_JSON_RPC_ERROR",
        ),
      );
    } else {
      pendingRequest.resolve(message.result);
    }
  });

  function write(message) {
    if (closed) {
      throw new DataHubMcpError("DataHub MCP client is closed.", "MCP_CLOSED");
    }
    if (spawnError) throw spawnError;
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new DataHubMcpError(
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
        new DataHubMcpError("DataHub MCP client closed.", "MCP_CLOSED"),
      );
      if (!child.stdin.destroyed) child.stdin.end();
      if (child.exitCode === null && child.signalCode === null) child.kill();
    },
  };
}

export function createDataHubMcpClient(options = {}) {
  const requestTimeoutMs =
    Number(
      options.requestTimeoutMs ?? process.env.DATAHUB_MCP_REQUEST_TIMEOUT_MS,
    ) || DEFAULT_TIMEOUT_MS;
  const transport =
    options.transport ||
    createStdioTransport({
      command:
        options.command || process.env.DATAHUB_MCP_COMMAND || DEFAULT_COMMAND,
      args: parseMcpArgs(options.args),
      environment: createReadOnlyEnvironment(options.environment),
      requestTimeoutMs,
      spawnImpl: options.spawnImpl || spawn,
    });
  let initialized = false;
  let toolStatus;

  async function listTools() {
    const result = await transport.request("tools/list");
    return result?.tools || [];
  }

  async function initialize() {
    if (initialized) return toolStatus;
    await transport.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "nexus-datahub-live-read", version: "0.9.5" },
    });
    transport.notify("notifications/initialized", {});
    toolStatus = validateReadOnlyTools(await listTools());
    initialized = true;
    return toolStatus;
  }

  async function callTool(name, arguments_ = {}) {
    if (!initialized) await initialize();
    if (!REQUIRED_READ_TOOLS.includes(name)) {
      throw new DataHubMcpError(
        `Tool is not allowed by the read-only bridge: ${name}`,
        "TOOL_NOT_ALLOWED",
      );
    }
    return transport.request("tools/call", {
      name,
      arguments: arguments_,
    });
  }

  return {
    initialize,
    listTools,
    callTool,
    close: () => transport.close(),
    getStatus: () => ({
      initialized,
      requiredTools: [...REQUIRED_READ_TOOLS],
      mutationToolsExposed: toolStatus?.mutationToolsExposed ?? false,
    }),
  };
}
