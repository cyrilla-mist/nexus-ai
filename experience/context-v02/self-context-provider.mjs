import { readFile as defaultReadFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateContextGraph } from "./context-graph-validator.mjs";
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
  let graphPromise;

  async function loadGraph() {
    if (!graphPromise) {
      graphPromise = Promise.resolve()
        .then(() => readFileImpl(fixturePath, "utf8"))
        .then((contents) => JSON.parse(contents))
        .then((graph) => {
          validateContextGraph(graph);
          return deepFreeze(clone(graph));
        });
    }
    return graphPromise;
  }

  return {
    mode: "self-context-v02",
    source: "deterministic-fixture",
    async loadGraph() {
      return loadGraph();
    },
    async loadContextPackage() {
      const graph = await loadGraph();
      const contextPackage = buildContextPackageV02({ graph, generatedAt: configuredGeneratedAt });
      return {
        graph,
        contextPackage,
        sourceInfo: {
          mode: "self-context-v02",
          label: "Nexus Atlas Self-Context",
          live: false,
          readOnly: true,
          deterministic: true,
          runtimeEvidence: false,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        },
      };
    },
  };
}
