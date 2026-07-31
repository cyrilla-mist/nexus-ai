import net from "node:net";
import process from "node:process";
import { spawn } from "node:child_process";

import { VERITY_ASSETS } from "../datahub/verity/asset-registry.mjs";
import { loadVerityScenario } from "../datahub/verity/load-verity-scenario.mjs";
import { parseMcpArgs } from "../datahub/mcp/mcp-client.mjs";

const DEFAULT_GMS_URL = "http://localhost:8080";
const BRIDGE_PORTS = Object.freeze([8790, 8791]);
const MINIMUM_NODE_MAJOR = 18;

function record(results, status, check, detail) {
  results.push({ status, check, detail });
}

function runCommand(command, args, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ ok: false, detail: `${command} timed out.` });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = (stdout + String(chunk)).slice(-2048);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + String(chunk)).slice(-2048);
    });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, detail: error.message });
    });
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const detail = (stdout || stderr).trim().split(/\r?\n/)[0] || `exit ${code}`;
      resolve({ ok: code === 0, detail });
    });
  });
}

function probeTcp(host, port, timeoutMs = 3_000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (reachable, detail) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ reachable, detail });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true, `${host}:${port} accepted a TCP connection.`));
    socket.once("timeout", () => finish(false, `${host}:${port} timed out.`));
    socket.once("error", (error) => finish(false, error.code || error.message));
  });
}

function safeServerLocation(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("DATAHUB_GMS_URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials must not be embedded in DATAHUB_GMS_URL.");
  }
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  return { url, host: url.hostname, port };
}

async function verifyScenario(results) {
  try {
    const scenario = await loadVerityScenario();
    const byId = new Map(scenario.entities.map((entity) => [entity.id, entity]));
    const mismatches = [];
    for (const asset of VERITY_ASSETS) {
      const entity = byId.get(asset.entityId);
      if (!entity) {
        mismatches.push(`${asset.entityId}: missing from canonical scenario`);
        continue;
      }
      if (entity.source?.reference !== asset.urn) {
        mismatches.push(`${asset.entityId}: URN differs from asset registry`);
      }
    }
    const benchmark = byId.get("external-asset-benchmark");
    if (benchmark?.ownerId || benchmark?.metadata?.ownerMissing !== true) {
      mismatches.push("external-asset-benchmark: expected intentionally missing owner");
    }
    if (mismatches.length) {
      record(results, "FAIL", "Canonical Verity scenario", mismatches.join("; "));
      return;
    }
    record(
      results,
      "PASS",
      "Canonical Verity scenario",
      `${VERITY_ASSETS.length} governed assets match the registry; Benchmark owner remains intentionally unassigned.`,
    );
  } catch (error) {
    record(results, "FAIL", "Canonical Verity scenario", error.message);
  }
}

async function main() {
  const results = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  record(
    results,
    nodeMajor >= MINIMUM_NODE_MAJOR ? "PASS" : "FAIL",
    "Node.js",
    `v${process.versions.node}; required major >= ${MINIMUM_NODE_MAJOR}.`,
  );

  const python = await runCommand("python", ["--version"]);
  record(results, python.ok ? "PASS" : "FAIL", "Python command", python.detail);

  const mcpCommand = process.env.DATAHUB_MCP_COMMAND || "uvx";
  const mcpExecutable = await runCommand(mcpCommand, ["--version"]);
  record(
    results,
    mcpExecutable.ok ? "PASS" : "FAIL",
    "DataHub MCP launcher",
    `${mcpCommand}: ${mcpExecutable.detail}`,
  );

  try {
    const args = parseMcpArgs();
    record(
      results,
      "PASS",
      "DataHub MCP arguments",
      `${args.length} argument(s) parsed; package execution is deferred to Runtime verification.`,
    );
  } catch (error) {
    record(results, "FAIL", "DataHub MCP arguments", error.message);
  }

  try {
    const server = safeServerLocation(
      process.env.DATAHUB_GMS_URL || DEFAULT_GMS_URL,
    );
    const reachability = await probeTcp(server.host, server.port);
    record(
      results,
      reachability.reachable ? "PASS" : "FAIL",
      "DataHub GMS reachability",
      `${server.url.origin}: ${reachability.detail}`,
    );
  } catch (error) {
    record(results, "FAIL", "DataHub GMS configuration", error.message);
  }

  for (const port of BRIDGE_PORTS) {
    const state = await probeTcp("127.0.0.1", port, 500);
    record(
      results,
      "INFO",
      `Loopback port ${port}`,
      state.reachable
        ? "Already in use; a bridge may already be running."
        : "Available for the Nexus local bridge.",
    );
  }

  await verifyScenario(results);

  console.log("Nexus Atlas Local Runtime Preflight");
  console.log("===================================");
  for (const result of results) {
    console.log(`[${result.status}] ${result.check}: ${result.detail}`);
  }
  console.log("");
  console.log("This command performs no DataHub metadata writes.");

  const failures = results.filter((result) => result.status === "FAIL");
  if (failures.length) {
    console.error(`Preflight failed: ${failures.length} blocking check(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("PASS: local Runtime prerequisites are available.");
}

await main();
