import http from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createVerityOwnershipClient } from "./ownership-mcp-client.mjs";
import {
  buildOwnershipProposal,
  repairVerityBenchmarkOwnership,
} from "./verity-ownership-repair.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8791;
const DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const ROUTE = "/api/context/repair/benchmark-owner";
const MAX_BODY_BYTES = 8192;

function parseList(value, fallback) {
  if (!value) return [...fallback];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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

function publicError(error) {
  const safe = {
    ORIGIN_NOT_ALLOWED: "The request origin is not allowed.",
    METHOD_NOT_ALLOWED: "Only GET, POST, and OPTIONS are allowed.",
    OWNER_NOT_CONFIGURED: "The proposed DataHub owner is not configured.",
    INVALID_REQUEST_BODY: "The ownership repair request is invalid.",
    CONFIRMATION_REQUIRED: "Explicit human confirmation is required.",
    MUTATION_TARGET_MISMATCH: "The requested mutation target is not allow-listed.",
    ADD_OWNERS_TOOL_MISSING: "The DataHub add_owners tool is unavailable.",
    OWNERSHIP_REPAIR_NOT_VERIFIED: "The DataHub owner write could not be verified.",
    OWNERSHIP_SIGNAL_NOT_CLOSED: "The ownership signal remains open after verification.",
  };
  return {
    source: "datahub-mcp",
    mutationEnabled: true,
    verified: false,
    error: {
      code: error?.code || "VERITY_OWNERSHIP_REPAIR_UNAVAILABLE",
      message:
        safe[error?.code] ||
        "The governed ownership repair is unavailable. No successful repair was recorded.",
    },
  };
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.code = "INVALID_REQUEST_BODY";
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch (cause) {
    const error = new Error("Request body is not valid JSON.", { cause });
    error.code = "INVALID_REQUEST_BODY";
    throw error;
  }
}

export function createVerityOwnershipBridge(options = {}) {
  const host =
    options.host || process.env.NEXUS_VERITY_MUTATION_HOST || DEFAULT_HOST;
  const port =
    Number(options.port ?? process.env.NEXUS_VERITY_MUTATION_PORT) ||
    DEFAULT_PORT;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("The Verity ownership bridge must bind to a loopback host.");
  }

  const allowedOrigins = new Set(
    options.allowedOrigins ||
      parseList(process.env.NEXUS_ALLOWED_ORIGINS, DEFAULT_ORIGINS),
  );
  const ownerUrn =
    options.ownerUrn || process.env.NEXUS_VERITY_OWNER_URN || "";
  const mutationClient =
    options.mutationClient || createVerityOwnershipClient(options.clientOptions);
  const repairOwnership =
    options.repairOwnership ||
    ((repairOptions) =>
      repairVerityBenchmarkOwnership({
        mutationClient,
        ...repairOptions,
      }));

  function proposal() {
    if (!ownerUrn) {
      const error = new Error("Owner is not configured.");
      error.code = "OWNER_NOT_CONFIGURED";
      throw error;
    }
    return buildOwnershipProposal(ownerUrn);
  }

  async function handler(request, response) {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      sendJson(response, 403, publicError({ code: "ORIGIN_NOT_ALLOWED" }), origin, allowedOrigins);
      return;
    }

    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      sendJson(response, 200, { status: "ok", mutationEnabled: true }, origin, allowedOrigins);
      return;
    }

    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (url.pathname === "/health" && request.method === "GET") {
      try {
        const status = await mutationClient.initialize();
        sendJson(
          response,
          200,
          {
            status: "ok",
            service: "nexus-verity-ownership-bridge",
            mutationEnabled: true,
            targetAllowList: [proposal().targetUrn],
            tool: "add_owners",
            availableTools: status.toolNames,
          },
          origin,
          allowedOrigins,
        );
      } catch (error) {
        sendJson(response, 503, publicError(error), origin, allowedOrigins);
      }
      return;
    }

    if (url.pathname !== ROUTE) {
      sendJson(response, 404, publicError({ code: "NOT_FOUND" }), origin, allowedOrigins);
      return;
    }

    if (request.method === "GET") {
      try {
        sendJson(
          response,
          200,
          {
            source: "datahub-mcp",
            mutationEnabled: true,
            proposal: proposal(),
          },
          origin,
          allowedOrigins,
        );
      } catch (error) {
        sendJson(response, 503, publicError(error), origin, allowedOrigins);
      }
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, publicError({ code: "METHOD_NOT_ALLOWED" }), origin, allowedOrigins);
      return;
    }

    try {
      const body = await readJsonBody(request);
      const result = await repairOwnership({
        ownerUrn,
        confirmed: body.confirmed === true,
        operation: body.operation,
        entityId: body.entityId,
        targetUrn: body.targetUrn,
      });
      sendJson(response, 200, result, origin, allowedOrigins);
    } catch (error) {
      sendJson(response, 409, publicError(error), origin, allowedOrigins);
    }
  }

  const server = http.createServer(handler);
  return {
    host,
    port,
    route: ROUTE,
    handler,
    proposal,
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
      await mutationClient.close();
    },
  };
}

function isDirectRun() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

async function main() {
  const bridge = createVerityOwnershipBridge();
  try {
    await bridge.start();
    console.log("Nexus Verity Ownership Bridge");
    console.log(`Listening: http://${bridge.host}:${bridge.port}${bridge.route}`);
    console.log("Tool allow-list: add_owners");
    console.log("Target allow-list: Verity Benchmark v1");
    const stop = async () => {
      await bridge.close();
      process.exit(0);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (error) {
    console.error(`Verity ownership bridge unavailable: ${error?.message || "unknown error"}`);
    process.exitCode = 1;
    await bridge.close();
  }
}

if (isDirectRun()) main();
