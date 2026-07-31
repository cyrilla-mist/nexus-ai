import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const partPaths = [0, 1, 2, 3].map(
  (index) =>
    `continuity/scenarios/verity-reentry/verity-reentry.part-0${index}.json`,
);
const canonicalPath = "continuity/scenarios/verity-reentry.json";
const calibrationId = "external-asset-calibration-job";
const calibrationUrn =
  "urn:li:dataset:(urn:li:dataPlatform:nexus,verity_scoring_calibration,PROD)";
const legacyCalibrationUrn =
  "urn:li:dataJob:(urn:li:dataFlow:(nexus,verity_evaluation,PROD),scoring_calibration)";

function replaceExactly(source, before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected one replacement target, found ${occurrences}`);
  }
  return source.replace(before, after);
}

const parts = await Promise.all(partPaths.map((file) => readFile(file, "utf8")));
const scenario = JSON.parse(parts.join(""));
const calibration = scenario.entities.find((entity) => entity.id === calibrationId);
if (!calibration) throw new Error("Verity calibration context entity is missing.");

calibration.title = "Verity Scoring Calibration Context";
calibration.summary =
  "The governed calibration context linking expected findings, generated scores, and report judgments used to evaluate scoring behavior.";
calibration.source = {
  provider: "datahub",
  reference: calibrationUrn,
};
calibration.metadata = {
  ...(calibration.metadata || {}),
  assetType: "dataset",
  logicalType: "calibration-context",
};

await writeFile(canonicalPath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");

await writeFile(
  "experience/continuity/fixture-continuity-provider.mjs",
  `import { normalizeContinuityScenario } from "./normalize-continuity-scenario.mjs";\n\nconst DEFAULT_FIXTURE_URL =\n  "./continuity/scenarios/nexus-self-reentry.json";\nconst VERITY_FIXTURE_URL =\n  "./continuity/scenarios/verity-reentry.json";\n\nfunction requestedScenario() {\n  try {\n    return new URLSearchParams(globalThis.location?.search || "").get("scenario");\n  } catch {\n    return null;\n  }\n}\n\nasync function readJson(fetchImpl, url) {\n  const response = await fetchImpl(url);\n  if (!response.ok) {\n    throw new Error(\`Fixture request returned \${response.status}: \${url}\`);\n  }\n  return response.json();\n}\n\nasync function readMultipartJson(fetchImpl, urls) {\n  const responses = await Promise.all(urls.map((url) => fetchImpl(url)));\n  const failed = responses.find((response) => !response.ok);\n  if (failed) {\n    throw new Error(\`Fixture part request returned \${failed.status}.\`);\n  }\n  const parts = await Promise.all(responses.map((response) => response.text()));\n  return JSON.parse(parts.join(""));\n}\n\nexport function createFixtureContinuityProvider(options = {}) {\n  const fetchImpl = options.fetchImpl || globalThis.fetch;\n  const scenarioKey = options.scenario || requestedScenario() || "nexus";\n  const fixtureUrl =\n    options.fixtureUrl ||\n    (scenarioKey === "verity" ? VERITY_FIXTURE_URL : DEFAULT_FIXTURE_URL);\n  const fixtureParts = options.fixtureParts || null;\n\n  if (typeof fetchImpl !== "function") {\n    throw new Error("A fetch implementation is required for fixture mode.");\n  }\n\n  return {\n    mode: "fixture",\n    scenario: scenarioKey,\n    async loadScenario() {\n      const rawScenario = fixtureParts\n        ? await readMultipartJson(fetchImpl, fixtureParts)\n        : await readJson(fetchImpl, fixtureUrl);\n      const scenario = normalizeContinuityScenario(rawScenario, {\n        sourceMode: \`fixture:\${scenarioKey}\`,\n      });\n\n      return {\n        scenario,\n        sourceInfo: {\n          mode: "fixture",\n          label:\n            scenarioKey === "verity"\n              ? "Verity scenario fixture"\n              : "Continuity fixture",\n          detail:\n            scenarioKey === "verity"\n              ? "Public Hero Scenario · canonical JSON"\n              : "Runtime mapping verified",\n          live: false,\n          readOnly: true,\n          fetchedAt: scenario.runtime.normalizedAt,\n          diagnostics: {\n            scenario: scenarioKey,\n            entities: scenario.entities.length,\n            relationships: scenario.relationships.length,\n          },\n        },\n      };\n    },\n  };\n}\n`,
  "utf8",
);

await writeFile(
  "datahub/verity/load-verity-scenario.mjs",
  `import { readFile } from "node:fs/promises";\nimport { fileURLToPath } from "node:url";\nimport path from "node:path";\n\nconst moduleDirectory = path.dirname(fileURLToPath(import.meta.url));\nconst repositoryRoot = path.resolve(moduleDirectory, "..", "..");\nconst defaultSourcePath = path.join(\n  repositoryRoot,\n  "continuity",\n  "scenarios",\n  "verity-reentry.json",\n);\n\nexport async function loadVerityScenario(options = {}) {\n  const sourcePath = options.sourcePath || defaultSourcePath;\n  const scenario = JSON.parse(await readFile(sourcePath, "utf8"));\n  if (scenario.project?.id !== "project-verity") {\n    throw new Error("The Verity scenario source is missing or invalid.");\n  }\n  return scenario;\n}\n`,
  "utf8",
);

await writeFile(
  "scripts/build-verity-reentry-scenario.mjs",
  `import { readFile, writeFile } from "node:fs/promises";\nimport { fileURLToPath } from "node:url";\nimport path from "node:path";\n\nconst scriptDir = path.dirname(fileURLToPath(import.meta.url));\nconst repositoryRoot = path.resolve(scriptDir, "..");\nconst sourcePath = path.join(\n  repositoryRoot,\n  "continuity",\n  "scenarios",\n  "verity-reentry.json",\n);\n\nconst scenario = JSON.parse(await readFile(sourcePath, "utf8"));\n\nif (scenario.schemaVersion !== "0.9.2") {\n  throw new Error(\`Unexpected schema version: \${scenario.schemaVersion}\`);\n}\nif (scenario.project?.id !== "project-verity") {\n  throw new Error("Verity scenario project identity is missing or invalid.");\n}\n\nconst requiredCounts = {\n  meaningfulChanges: 4,\n  staleRecords: 2,\n  agentConflicts: 1,\n  missingOwners: 1,\n  validDecisions: 4,\n};\nfor (const [key, value] of Object.entries(requiredCounts)) {\n  if (scenario.expectedFindings?.[key] !== value) {\n    throw new Error(\`Unexpected \${key}: \${scenario.expectedFindings?.[key]}\`);\n  }\n}\n\nconst calibration = scenario.entities.find(\n  (entity) => entity.id === "external-asset-calibration-job",\n);\nif (\n  calibration?.metadata?.assetType !== "dataset" ||\n  calibration?.metadata?.logicalType !== "calibration-context" ||\n  !calibration?.source?.reference?.startsWith("urn:li:dataset:")\n) {\n  throw new Error("Verity Calibration Context identity is inconsistent.");\n}\n\nawait writeFile(sourcePath, \`${"${JSON.stringify(scenario, null, 2)}"}\\n\`, "utf8");\nconsole.log(\`Validated continuity/scenarios/verity-reentry.json with \${scenario.entities.length} entities and \${scenario.relationships.length} relationships.\`);\n`,
  "utf8",
);

await writeFile(
  "tests/verity-continuity-provider.test.mjs",
  `import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\nimport { fileURLToPath } from "node:url";\nimport path from "node:path";\n\nimport { createFixtureContinuityProvider } from "../experience/continuity/fixture-continuity-provider.mjs";\nimport { normalizeContinuityScenario } from "../experience/continuity/normalize-continuity-scenario.mjs";\nimport { buildReentryViewModel } from "../experience/continuity/reentry-view-model.mjs";\n\nconst testDirectory = path.dirname(fileURLToPath(import.meta.url));\nconst repositoryRoot = path.resolve(testDirectory, "..");\nconst scenarioPath = path.join(\n  repositoryRoot,\n  "continuity",\n  "scenarios",\n  "verity-reentry.json",\n);\n\nasync function loadRawVerityScenario() {\n  return JSON.parse(await readFile(scenarioPath, "utf8"));\n}\n\ntest("normalizes Verity into the provider-neutral continuity contract", async () => {\n  const raw = await loadRawVerityScenario();\n  const scenario = normalizeContinuityScenario(raw, {\n    sourceMode: "test",\n    normalizedAt: "2026-07-30T12:00:00Z",\n  });\n\n  assert.equal(scenario.project.id, "project-verity");\n  assert.equal(scenario.project.updatedAt, "2026-07-30T00:00:00Z");\n  assert.equal(scenario.project.lastActiveAt, "2026-07-09T00:00:00Z");\n  assert.equal(scenario.runtime.reentryFromAt, "2026-07-09T00:00:00Z");\n  assert.equal(\n    scenario.project.metadata.currentUpdatedAt,\n    "2026-07-30T00:00:00Z",\n  );\n\n  const ownershipRisk = scenario.entities.find(\n    (entity) => entity.id === "risk-benchmark-missing-owner",\n  );\n  assert.equal(ownershipRisk.metadata.missingOwner, true);\n  assert.ok(scenario.relationships.every((relationship) => relationship.createdAt));\n});\n\ntest("builds truthful Verity re-entry findings", async () => {\n  const raw = await loadRawVerityScenario();\n  const scenario = normalizeContinuityScenario(raw, { sourceMode: "test" });\n  const view = buildReentryViewModel(scenario);\n  const counts = Object.fromEntries(\n    view.signals.map((signal) => [signal.key, signal.count]),\n  );\n\n  assert.deepEqual(counts, {\n    stale: 2,\n    conflict: 1,\n    missing: 1,\n    valid: 4,\n  });\n  assert.ok(view.signals.every((signal) => signal.compatible));\n  assert.equal(view.meaningfulChanges.length, 4);\n  assert.equal(view.validDecisions.length, 4);\n  assert.equal(\n    view.reportMeta.elapsedLabel,\n    "21 days since last active session",\n  );\n  assert.equal(view.decisionActionLedger.ownershipRisks.length, 1);\n  assert.equal(\n    view.selectedSignalDetails.missing.selectedId,\n    "risk-benchmark-missing-owner",\n  );\n});\n\ntest("fixture provider loads the canonical Verity scenario", async () => {\n  const raw = await loadRawVerityScenario();\n  const requested = [];\n  const fetchImpl = async (url) => {\n    requested.push(url);\n    return {\n      ok: true,\n      status: 200,\n      async json() {\n        return raw;\n      },\n    };\n  };\n\n  const provider = createFixtureContinuityProvider({\n    scenario: "verity",\n    fetchImpl,\n  });\n  const loaded = await provider.loadScenario();\n\n  assert.deepEqual(requested, ["./continuity/scenarios/verity-reentry.json"]);\n  assert.equal(loaded.scenario.project.id, "project-verity");\n  assert.equal(loaded.scenario.entities.length, 36);\n  assert.equal(loaded.scenario.relationships.length, 33);\n  assert.equal(loaded.sourceInfo.diagnostics.scenario, "verity");\n  assert.match(loaded.sourceInfo.detail, /canonical JSON/);\n});\n\ntest("Calibration Context is a governed Dataset in Fixture mode", async () => {\n  const raw = await loadRawVerityScenario();\n  const calibration = raw.entities.find(\n    (entity) => entity.id === "external-asset-calibration-job",\n  );\n  assert.equal(calibration.title, "Verity Scoring Calibration Context");\n  assert.equal(calibration.metadata.assetType, "dataset");\n  assert.equal(calibration.metadata.logicalType, "calibration-context");\n  assert.match(calibration.source.reference, /^urn:li:dataset:/);\n});\n`,
  "utf8",
);

for (const [file, replacements] of [
  [
    "datahub/verity/asset-registry.mjs",
    [
      ["title: \"Verity Scoring Calibration\"", "title: \"Verity Scoring Calibration Context\""],
      ["logicalType: \"calibration-process\"", "logicalType: \"calibration-context\""],
    ],
  ],
  [
    "datahub/scripts/ingest_verity_assets.py",
    [
      ["\"title\": \"Verity Scoring Calibration\"", "\"title\": \"Verity Scoring Calibration Context\""],
      [
        "\"description\": \"Runtime context asset representing the calibration process that compares expected findings with generated results.\"",
        "\"description\": \"Governed calibration context linking expected findings, generated scores, and report judgments.\"",
      ],
      ["\"logicalType\": \"calibration-process\"", "\"logicalType\": \"calibration-context\""],
    ],
  ],
  [
    "frontend/atlas/atlas-app.js",
    [
      [
        `"external-asset-calibration-job": { x: 680, y: 145, kind: "asset", label: "Calibration Job", type: "DATA JOB" },`,
        `"external-asset-calibration-job": { x: 680, y: 145, kind: "asset", label: "Calibration Context", type: "CALIBRATION CONTEXT" },`,
      ],
    ],
  ],
]) {
  let source = await readFile(file, "utf8");
  for (const [before, after] of replacements) {
    source = replaceExactly(source, before, after, `${file}: ${before}`);
  }
  await writeFile(file, source, "utf8");
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(fullPath)));
    else if (entry.isFile() && /\.(md|txt|srt|json)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

for (const file of [
  "README.md",
  ...(await markdownFiles("docs")),
  ...(await markdownFiles("examples")),
]) {
  let source = await readFile(file, "utf8");
  const updated = source
    .replaceAll("Verity Scoring Calibration Job", "Verity Scoring Calibration Context")
    .replaceAll("Calibration Job", "Calibration Context")
    .replaceAll(legacyCalibrationUrn, calibrationUrn)
    .replaceAll("calibration-process", "calibration-context");
  if (updated !== source) await writeFile(file, updated, "utf8");
}

await writeFile(
  "continuity/scenarios/verity-reentry/README.md",
  `# Verity Re-entry Scenario\n\nThe canonical scenario is now stored at:\n\n\`continuity/scenarios/verity-reentry.json\`\n\nThe earlier multipart source files were removed because they were not independently valid JSON and complicated review, validation, and provider reuse.\n\nThe stable entity ID \`external-asset-calibration-job\` is retained for relationship compatibility, but its governed identity is now a Dataset with logical type \`calibration-context\`.\n`,
  "utf8",
);

for (const file of partPaths) await rm(file);

console.log("Canonical Verity scenario and Calibration Context identity applied.");
