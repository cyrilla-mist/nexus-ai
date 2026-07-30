import http from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createDataHubMcpClient } from "../mcp/mcp-client.mjs";
import { readVerityAssetSnapshot } from "./verity-asset-reader.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8790;
const DEFAULT_TTL_MS = 10_000;
const DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function parseList(value, fallback) {
  if (!value) return [...fallback];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function publicError(error) {
  const safe = {
    ORIGIN_NOT_ALLOWED: "The request origin is not allowed.",
    METHOD_NOT_ALLOWED: "Only GET and OPTIONS are allowed.",
    NOT_FOUND: "The requested bridge route does not exist.",
    VERITY_ASSET_MISSING: "One or more required Verity assets are unavailable in DataHub.",
    VERITY_LINEAGE_MISMATCH: "The Verity Benchmark lineage does not match the governed asset graph.",
    MCP_REQUEST_TIMEOUT: "The DataHub MCP request timed out.",
  };
  return {
    source: "datahub-mcp",
    readOnly: true,
    mutationEnabled: false,
    error: {
      code: error?.code || "VERITY_DATAHUB_UNAVAILABLE",
      message:
        safe[error?.code] ||
        "The Verity DataHub context source is unavailable. Check DataHub, asset ingestion, and the local bridge.",
    },
  };
}

function sendJson(response, status, payload, origin, allowedOrigins) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Origin");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }
  response.end(JSON.stringify(payload));
}

export function createVerityAssetBridge(options = {}) {
  const host = options.host || process.env.NEXUS_VERITY_BRIDGE_HOST || DEFAULT_HOST;
  const port =
    Number(options.port ?? process.env.NEXUS_VERITY_BRIDGE_PORT) || DEFAULT_PORT;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("The Verity DataHub bridge must bind to a loopback host.");
  }

  const allowedOrigins = new Set(
    options.allowedOrigins ||
      parseList(process.env.NEXUS_ALLOWED_ORIGINS, DEFAULT_ORIGINS),
  );
  const cacheTtlMs = Math.max(
    0,
    Number(options.cacheTtlMs ?? process.env.NEXUS_VERITY_CACHE_TTL_MS) ||
      DEFAULT_TTL_MS,
  );
  const client = options.client || createDataHubMcpClient({
    command: options.command,
    args: options.args,
    environment: options.environment,
    requestTimeoutMs: options.requestTimeoutMs,
  });
  const readSnapshot =
    options.readSnapshot ||
    ((readerOptions) => readVerityAssetSnapshot({ client, ...readerOptions }));
  let cache;

  async function snapshot() {
    const current = Date.now();
    if (cache && current - cache.storedAt < cacheTtlMs) {
      return {
        ...cache.value,
        diagnostics: { ...cache.value.diagnostics, cached: true },
      };
    }
    const value = await readSnapshot();
    cache = { storedAt: current, value };
    return value;
  }

  async function health() {
    const status = await client.initialize();
    return {
      status: "ok",
      service: "nexus-verity-datahub-bridge",
      readOnly: true,
      mutationEnabled: false,
      requiredTools: status.requiredTools,
      mutationToolsExposed: status.mutationToolsExposed,
    };
  }

  async function handler(request, response) {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      sendJson(response, 403, publicError({ code: "ORIGIN_NOT_ALLOWED" }), origin, allowedOrigins);
      return;
    }

    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      sendJson(response, 200, { status: "ok", readOnly: true }, origin, allowedOrigins);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, publicError({ code: "METHOD_NOT_ALLOWED" }), origin, allowedOrigins);
      return;
    }

    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (url.pathname === "/health") {
      try {
        sendJson(response, 200, await health(), origin, allowedOrigins);
      } catch (error) {
        sendJson(response, 503, publicError(error), origin, allowedOrigins);
      }
      return;
    }

    if (url.pathname === "/api/continuity/reentry") {
      try {
        sendJson(response, 200, await snapshot(), origin, allowedOrigins);
      } catch (error) {
        sendJson(response, 503, publicError(error), origin, allowedOrigins);
      }
      return;
    }

    sendJson(response, 404, publicError({ code: "NOT_FOUND" }), origin, allowedOrigins);
  }

  const server = http.createServer(handler);
  return {
    host,
    port,
    handler,
    health,
    snapshot,
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
  const bridge = createVerityAssetBridge();
  try {
    if (checkOnly) {
      const value = await bridge.snapshot();
      if (!value.diagnostics.lineageVerification.passed) {
        throw new Error("Verity lineage verification did not pass.");
      }
      console.log("PASS: Verity DataHub asset bridge verified");
      return;
    }
    await bridge.start();
    console.log("Nexus Verity DataHub Bridge");
    console.log(`Listening: http://${bridge.host}:${bridge.port}`);
    console.log("Mode: governed asset read-only");
    console.log("Mutation: disabled");
    const stop = async () => {
      await bridge.close();
      process.exit(0);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (error) {
    console.error(`Verity DataHub bridge unavailable: ${error?.message || "unknown error"}`);
    process.exitCode = 1;
  } finally {
    if (checkOnly) await bridge.close();
  }
}

if (isDirectRun()) main();
