import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`[phase5] ${label}: ERROR`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    console.error(`[phase5] ${label}: FAIL`);
    process.exit(result.status ?? 1);
  }
  return result;
}

function requireCommit(sha, label) {
  run("git", ["cat-file", "-e", `${sha}^{commit}`], `${label} commit availability`, { capture: true });
}

function requireUnchangedSince(sha, paths, label) {
  requireCommit(sha, label);
  run("git", ["diff", "--quiet", sha, "HEAD", "--", ...paths], `${label} frozen boundary`, { capture: true });
  console.log(`[phase5] ${label}: frozen boundary PASS`);
}

const PHASE4_MAIN = "79d66207bbd5818010eae0695e9923e174f5b47a";
const PHASE5D_FROZEN = "17289a65735f3a2314c94919cdde8ab21f3d5146";
const PHASE5E_RUNTIME_FROZEN = "87abd8cf878cd4086c7257b29170579e02f4c0b1";
const PHASE5E_BROWSER_ACCEPTED = "c381110d8dbb4eea18e24f7e3a88552ba1371a8b";

requireUnchangedSince(
  PHASE4_MAIN,
  [
    "experience/source-v01/source-snapshot-validator.mjs",
    "experience/source-v01/github-source-adapter.mjs",
    "experience/source-v01/context-import-plan-validator.mjs",
    "experience/source-v01/context-import-planner.mjs",
    "experience/context-v02/canonical-admission-validator.mjs",
    "experience/context-v02/canonical-admission.mjs",
    "experience/context-v02/context-graph-validator.mjs",
    "experience/context-v02/decision-memory-validator.mjs",
    "experience/context-v02/decision-memory-resolver.mjs",
    "experience/context-v02/decision-memory-ledger.mjs",
  ],
  "Phase 4 authority/runtime",
);

requireUnchangedSince(
  PHASE5D_FROZEN,
  [
    "experience/product-surface-v01/product-surface-projector.mjs",
    "frontend/atlas/atlas-desk.js",
    "examples/nexus-atlas-product-surface-phase5-v0.1.json",
    "examples/nexus-atlas-self-context-phase5-v0.1.json",
  ],
  "Phase 5D Product Surface/Inspector",
);

requireUnchangedSince(
  PHASE5E_RUNTIME_FROZEN,
  [
    "experience/source-intake-review-v01/source-intake-review-projector.mjs",
    "experience/source-intake-review-v01/source-intake-review-validator.mjs",
    "docs/Nexus-Atlas-v0.1-Source-Intake-Review-Contract.md",
  ],
  "Phase 5E review runtime",
);

requireUnchangedSince(
  PHASE5E_BROWSER_ACCEPTED,
  [
    "examples/nexus-atlas-source-intake-review-browser-v0.1.json",
    "frontend/atlas/atlas-source-intake.js",
    "frontend/atlas/atlas-source-intake.css",
  ],
  "Phase 5E browser surface",
);

const phase5Suites = [
  "tests/phase5-final-acceptance-v01.test.mjs",
  "tests/product-surface-v01.test.mjs",
  "tests/atlas-product-surface-desk-v01.test.mjs",
  "tests/atlas-canonical-inspector-identity-v01.test.mjs",
  "tests/source-intake-review-v01.test.mjs",
  "tests/atlas-source-intake-review-snapshot-v01.test.mjs",
  "tests/atlas-source-intake-review-v01.test.mjs",
];

run(process.execPath, ["--test", ...phase5Suites], "Phase 5 dedicated acceptance suites");
run(process.execPath, ["scripts/verify-phase4-v01.mjs"], "Phase 4F regression acceptance");

console.log("[phase5] Phase 5 v0.1 dedicated acceptance PASS");
