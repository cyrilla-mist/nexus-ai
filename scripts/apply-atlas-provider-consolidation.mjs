import { readFile, writeFile } from "node:fs/promises";

const partPaths = [
  "frontend/atlas/source/atlas.part-00.js",
  "frontend/atlas/source/atlas.part-01.js",
  "frontend/atlas/source/atlas.part-02.js",
];
const appPath = "frontend/atlas/atlas-app.js";
const htmlPath = "atlas.html";
const packagePath = "package.json";
const verifyPath = "scripts/verify-atlas-source.mjs";

function replaceExactly(source, before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected one replacement target, found ${occurrences}`);
  }
  return source.replace(before, after);
}

const parts = await Promise.all(partPaths.map((path) => readFile(path, "utf8")));
let app = parts.join("");

if (!app.startsWith("const ROUTES")) {
  throw new Error("Atlas source parts do not begin with the expected application module.");
}

app = `import { createContinuityProvider } from "../../experience/continuity/continuity-provider.mjs";\n\n${app}`;

app = replaceExactly(
  app,
  `  scenario: null,\n  selectedTerritory: "innovation",`,
  `  scenario: null,\n  sourceInfo: null,\n  selectedTerritory: "innovation",`,
  "add Atlas source state",
);

const loadPattern = /async function loadScenario\(\) \{[\s\S]*?\n\}\n\nfunction entityById/;
const loadMatches = app.match(loadPattern);
if (!loadMatches || loadMatches.length !== 1) {
  throw new Error("Atlas loadScenario implementation could not be replaced safely.");
}
app = app.replace(
  loadPattern,
  `function sourceConfiguration() {\n  const query = new URLSearchParams(window.location.search);\n  return {\n    mode: query.get("source") || "fixture",\n    scenario: "verity",\n    bridgeUrl: query.get("bridge") || undefined,\n  };\n}\n\nasync function loadScenario() {\n  const provider = createContinuityProvider(sourceConfiguration());\n  const loaded = await provider.loadScenario();\n  state.sourceInfo = loaded.sourceInfo;\n  return loaded.scenario;\n}\n\nfunction entityById`,
);

app = replaceExactly(
  app,
  `  sourceSummary.textContent = \`${"${projectSources().length}"} sources · scenario v${"${state.scenario.scenarioVersion}"}\`;`,
  `  const sourceLabel = state.sourceInfo?.label || "Context source";\n  const sourceMode = state.sourceInfo?.live ? "live" : "fixture";\n  sourceSummary.textContent = \`${"${sourceLabel}"} · ${"${sourceMode}"} · ${"${projectSources().length}"} sources · scenario v${"${state.scenario.scenarioVersion}"}\`;`,
  "render Atlas source identity",
);

await writeFile(appPath, app, "utf8");

let html = await readFile(htmlPath, "utf8");
html = replaceExactly(
  html,
  `<script type="module" src="./frontend/atlas/atlas.js"></script>`,
  `<script type="module" src="./frontend/atlas/atlas-app.js"></script>`,
  "switch Atlas module entry",
);
await writeFile(htmlPath, html, "utf8");

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.scripts.check = replaceExactly(
  packageJson.scripts.check,
  "node --check frontend/atlas/atlas.js",
  "node --check frontend/atlas/atlas-app.js",
  "update Atlas syntax check",
);
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

await writeFile(
  verifyPath,
  `import { readFile } from "node:fs/promises";\nimport { spawnSync } from "node:child_process";\n\nconst appPath = "frontend/atlas/atlas-app.js";\nconst source = await readFile(appPath, "utf8");\n\nif (source.includes("URL.createObjectURL") || source.includes("new Blob(")) {\n  throw new Error("Atlas runtime must not assemble JavaScript through Blob URLs.");\n}\nif (!source.includes("createContinuityProvider")) {\n  throw new Error("Atlas must load context through the shared Continuity Provider.");\n}\nif (!source.includes("sourceInfo")) {\n  throw new Error("Atlas must retain source identity for truthful UI labeling.");\n}\n\nconst result = spawnSync(process.execPath, ["--check", appPath], {\n  encoding: "utf8",\n});\nif (result.status !== 0) {\n  process.stderr.write(result.stderr || result.stdout);\n  process.exit(result.status || 1);\n}\n\nconsole.log(\`Atlas module verification passed (\${source.length} bytes).\`);\n`,
  "utf8",
);

console.log("Atlas module consolidated and connected to the Continuity Provider.");
