import { readFile as defaultReadFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateContextGraph } from "./context-graph-validator.mjs";
import { validateDecisionMemoryGraph } from "./decision-memory-validator.mjs";
import { buildDecisionMemoryLedger } from "./decision-memory-ledger.mjs";
import { buildContextPackageV02 } from "./context-package-projector.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_FIXTURE_PATH = path.join(repositoryRoot, "examples", "nexus-atlas-self-context-v0.2.json");

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export function createSelfContextProvider(options = {}) {
  const readFileImpl = options.readFileImpl || defaultReadFile;
  const fixturePath = options.fixturePath || DEFAULT_FIXTURE_PATH;
  const configuredGeneratedAt = options.generatedAt;
  const projectId = options.projectId || "project:nexus-atlas";
  const scopeKey = options.scopeKey || "project:nexus-atlas";
  const consentedRecordIds = [...(options.consentedRecordIds || [])];
  let graphPromise;
  let ledgerPromise;

  async function loadGraph() {
    if (!graphPromise) {
      graphPromise = Promise.resolve()
        .then(() => readFileImpl(fixturePath, "utf8"))
        .then((contents) => JSON.parse(contents))
        .then((graph) => {
          validateContextGraph(graph);
          validateDecisionMemoryGraph({ graph, projectId, scopeKey });
          return deepFreeze(clone(graph));
        });
    }
    return graphPromise;
  }

  async function loadDecisionMemoryLedger() {
    if (!ledgerPromise) {
      ledgerPromise = loadGraph().then((graph) => buildDecisionMemoryLedger({ graph, projectId, scopeKey, consentedRecordIds: [...consentedRecordIds], generatedAt: configuredGeneratedAt || graph.metadata.generatedAt }));
    }
    return ledgerPromise;
  }

  return {
    mode: "self-context-v02",
    source: "deterministic-fixture",
    async loadGraph() {
      return loadGraph();
    },
    async loadDecisionMemoryLedger() {
      return loadDecisionMemoryLedger();
    },
    async loadContextPackage() {
      const graph = await loadGraph();
      const decisionMemoryLedger = await loadDecisionMemoryLedger();
      const generatedAt = configuredGeneratedAt || graph.metadata.generatedAt;
      const contextPackage = buildContextPackageV02({ graph, generatedAt, decisionMemoryLedger });
      return deepFreeze({
        graph,
        decisionMemoryLedger,
        contextPackage,
        sourceInfo: {
          mode: "self-context-v02",
          label: "Nexus Atlas Self-Context",
          live: false,
          readOnly: true,
          deterministic: true,
          runtimeEvidence: false,
          decisionMemoryIntegrated: true,
          ledgerVersion: decisionMemoryLedger.ledgerVersion,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          decisionCount: decisionMemoryLedger.diagnostics.decisionCount,
          memoryCount: decisionMemoryLedger.diagnostics.memoryCount,
          effectiveDecisionCount: decisionMemoryLedger.diagnostics.effectiveDecisionCount,
          chainCount: decisionMemoryLedger.diagnostics.chainCount,
          conflictCount: decisionMemoryLedger.diagnostics.conflictCount,
        },
      });
    },
  };
}
