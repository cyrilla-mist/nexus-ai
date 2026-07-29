import http from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createDataHubMcpClient } from "./mcp-client.mjs";
import { readContinuitySnapshot } from "./continuity-live-reader.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8789;
const DEFAULT_TTL_MS = 15_000;
const DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function parseList(value, fallback) {
  if (!value) return [...fallback];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function publicErrorMessage(error) {
  const safeMessages = {
    ORIGIN_NOT_ALLOWED: "The request origin is not allowed.",
    METHOD_NOT_ALLOWED: "Only GET and OPTIONS are allowed.",
    NOT_FOUND: "The requested bridge route does not exist.",
    MCP_REQUEST_TIMEOUT: "The read-only DataHub MCP request timed out.",
    LINEAGE_MISMATCH: "DataHub lineage did not match the Continuity graph.",
  };
  return (
    safeMessages[error?.code] ||
    "DataHub live read is unavailable. Check the local DataHub and bridge processes."
  );
}

function bridgeError(error) {
  return {
    source: "datahub-mcp",
    readOnly: true,
    error: {
      code: error?.code || "MCP_UNAVAILABLE",
      message: publicErrorMessage(error),
    },
  };
}

function sendJson(response, statusCode, value, origin, allowedOrigins) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Origin");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }
  response.end(JSON.stringify(value));
}

export function createContinuityLiveBridge(options = {}) {
  const host = options.host || process.env.NEXUS_BRIDGE_HOST || DEFAULT_HOST;
  const port =
    Number(options.port ?? process.env.NEXUS_BRIDGE_PORT) || DEFAULT_PORT;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("The DataHub live-read bridge must bind to a loopback host.");
  }
  const allowedOrigins = new Set(
    options.allowedOrigins ||
      parseList(process.env.NEXUS_ALLOWED_ORIGINS, DEFAULT_ORIGINS),
  );
  const cacheTtlMs = Math.max(
    0,
    Number(options.cacheTtlMs ?? process.env.NEXUS_LIVE_CACHE_TTL_MS) ||
      DEFAULT_TTL_MS,
  );
  const client =
    options.client ||
    createDataHubMcpClient({
      command: options.command,
      args: options.args,
      environment: options.environment,
      requestTimeoutMs: options.requestTimeoutMs,
    });
  const readSnapshot =
    options.readSnapshot ||
    ((readerOptions) =>
      readContinuitySnapshot({ client, ...readerOptions }));
  let cache;

  async function health() {
    const status = await client.initialize();
    return {
      status: "ok",
      service: "nexus-datahub-live-read-bridge",
      readOnly: true,
      mcp: {
        initialized: true,
        requiredTools: status.requiredTools,
        mutationToolsExposed: status.mutationToolsExposed,
      },
    };
  }

  async function liveSnapshot() {
    const currentTime = Date.now();
    if (cache && currentTime - cache.storedAt < cacheTtlMs) {
      return {
        ...cache.value,
        diagnostics: { ...cache.value.diagnostics, cached: true },
      };
    }
    const value = await readSnapshot();
    cache = { storedAt: currentTime, value };
    return value;
  }

  async function handler(request, response) {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      sendJson(
        response,
        403,
        bridgeError({
          code: "ORIGIN_NOT_ALLOWED",
          message: "The request origin is not allowed.",
        }),
        origin,
        allowedOrigins,
      );
      return;
    }
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      sendJson(
        response,
        200,
        { status: "ok", readOnly: true },
        origin,
        allowedOrigins,
      );
      return;
    }
    if (request.method !== "GET") {
      sendJson(
        response,
        405,
        bridgeError({
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET and OPTIONS are allowed.",
        }),
        origin,
        allowedOrigins,
      );
      return;
    }

    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (url.pathname === "/health") {
      try {
        sendJson(response, 200, await health(), origin, allowedOrigins);
      } catch {
        sendJson(
          response,
          503,
          {
            status: "unavailable",
            code: "MCP_UNAVAILABLE",
            message: "The read-only DataHub MCP service is unavailable.",
          },
          origin,
          allowedOrigins,
        );
      }
      return;
    }
    if (url.pathname === "/api/continuity/reentry") {
      try {
        sendJson(
          response,
          200,
          await liveSnapshot(),
          origin,
          allowedOrigins,
        );
      } catch (error) {
        sendJson(
          response,
          503,
          bridgeError(error),
          origin,
          allowedOrigins,
        );
      }
      return;
    }
    sendJson(
      response,
      404,
      bridgeError({
        code: "NOT_FOUND",
        message: "The requested bridge route does not exist.",
      }),
      origin,
      allowedOrigins,
    );
  }

  const server = http.createServer(handler);
  return {
    host,
    port,
    allowedOrigins: [...allowedOrigins],
    handler,
    health,
    liveSnapshot,
    async start() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      return server;
    },
    async close() {
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
      await client.close();
    },
  };
}

function isDirectRun() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const bridge = createContinuityLiveBridge();
  try {
    if (checkOnly) {
      const snapshot = await bridge.liveSnapshot();
      if (!snapshot.diagnostics.lineageVerification.passed) {
        throw new Error("Representative lineage verification did not pass.");
      }
      console.log("PASS: DataHub continuity live read bridge verified");
      return;
    }
    await bridge.start();
    console.log("Nexus DataHub Live Read Bridge");
    console.log(`Listening: http://${bridge.host}:${bridge.port}`);
    console.log("Mode: read-only");
    console.log("Mutation tools: disabled");
    const stop = async () => {
      await bridge.close();
      process.exit(0);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (error) {
    console.error(
      `DataHub continuity live read bridge unavailable: ${
        error?.message || "unknown error"
      }`,
    );
    process.exitCode = 1;
  } finally {
    if (checkOnly) await bridge.close();
  }
}

if (isDirectRun()) main();
