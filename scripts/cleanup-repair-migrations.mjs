import { rm } from "node:fs/promises";

const temporaryFiles = [
  "scripts/apply-timestamp-contract-repair.mjs",
  ".github/workflows/apply-timestamp-contract-repair.yml",
  "scripts/apply-stable-governance-actions.mjs",
  ".github/workflows/apply-stable-governance-actions.yml",
  "scripts/apply-atlas-provider-consolidation.mjs",
  ".github/workflows/apply-atlas-provider-consolidation.yml",
  "scripts/cleanup-legacy-atlas-loader.mjs",
  ".github/workflows/cleanup-legacy-atlas-loader.yml",
  "scripts/apply-canonical-verity-scenario.mjs",
  ".github/workflows/apply-canonical-verity-scenario.yml",
  "scripts/cleanup-repair-migrations.mjs",
  ".github/workflows/cleanup-repair-migrations.yml",
];

for (const file of temporaryFiles) {
  await rm(file, { force: true });
}

console.log(`Removed ${temporaryFiles.length} one-time repair files.`);
