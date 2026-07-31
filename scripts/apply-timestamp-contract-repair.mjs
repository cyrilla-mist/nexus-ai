import { readFile, writeFile } from "node:fs/promises";

const files = {
  normalizer: "experience/continuity/normalize-continuity-scenario.mjs",
  viewModel: "experience/continuity/reentry-view-model.mjs",
  test: "tests/verity-continuity-provider.test.mjs",
};

async function replaceExactly(path, before, after) {
  const source = await readFile(path, "utf8");
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${path}: expected one replacement target, found ${occurrences}`);
  }
  await writeFile(path, source.replace(before, after), "utf8");
}

await replaceExactly(
  files.normalizer,
  `  if (scenario.project?.lastActiveAt) {\n    scenario.project.metadata.currentUpdatedAt = scenario.project.updatedAt;\n    scenario.project.metadata.lastActiveAt = scenario.project.lastActiveAt;\n    scenario.project.updatedAt = scenario.project.lastActiveAt;\n  }`,
  `  if (scenario.project?.lastActiveAt) {\n    scenario.project.metadata.currentUpdatedAt = scenario.project.updatedAt;\n    scenario.project.metadata.lastActiveAt = scenario.project.lastActiveAt;\n  }`,
);

await replaceExactly(
  files.normalizer,
  `  scenario.runtime = {\n    ...(isObject(scenario.runtime) ? scenario.runtime : {}),\n    normalizedAt: options.normalizedAt || new Date().toISOString(),\n    sourceMode: options.sourceMode || "unknown",\n  };`,
  `  scenario.runtime = {\n    ...(isObject(scenario.runtime) ? scenario.runtime : {}),\n    normalizedAt: options.normalizedAt || new Date().toISOString(),\n    sourceMode: options.sourceMode || "unknown",\n    reentryFromAt:\n      scenario.project?.lastActiveAt ||\n      scenario.project?.updatedAt ||\n      requestedAt,\n  };`,
);

await replaceExactly(
  files.viewModel,
  `function elapsedLabel(scenario) {\n  const updated = Date.parse(scenario.project.updatedAt);\n  const requested = Date.parse(scenario.reentryQuery?.requestedAt);\n  if (!Number.isFinite(updated) || !Number.isFinite(requested)) {\n    return "Elapsed time unavailable";\n  }\n  const days = Math.max(0, Math.floor((requested - updated) / 86_400_000));\n  return days === 0 ? "Updated today" : \`${"${days}"} days since last update\`;\n}`,
  `function elapsedLabel(scenario) {\n  const reentryFrom = Date.parse(\n    scenario.runtime?.reentryFromAt ||\n      scenario.project.lastActiveAt ||\n      scenario.project.updatedAt,\n  );\n  const requested = Date.parse(scenario.reentryQuery?.requestedAt);\n  if (!Number.isFinite(reentryFrom) || !Number.isFinite(requested)) {\n    return "Elapsed time unavailable";\n  }\n  const days = Math.max(\n    0,\n    Math.floor((requested - reentryFrom) / 86_400_000),\n  );\n  return days === 0\n    ? "Active today"\n    : \`${"${days}"} days since last active session\`;\n}`,
);

await replaceExactly(
  files.test,
  `  assert.equal(scenario.project.updatedAt, scenario.project.lastActiveAt);\n  assert.equal(\n    scenario.project.metadata.currentUpdatedAt,\n    "2026-07-30T00:00:00Z",\n  );`,
  `  assert.equal(scenario.project.updatedAt, "2026-07-30T00:00:00Z");\n  assert.equal(scenario.project.lastActiveAt, "2026-07-09T00:00:00Z");\n  assert.equal(scenario.runtime.reentryFromAt, "2026-07-09T00:00:00Z");\n  assert.equal(\n    scenario.project.metadata.currentUpdatedAt,\n    "2026-07-30T00:00:00Z",\n  );`,
);

await replaceExactly(
  files.test,
  `  assert.equal(view.reportMeta.elapsedLabel, "21 days since last update");`,
  `  assert.equal(\n    view.reportMeta.elapsedLabel,\n    "21 days since last active session",\n  );`,
);

console.log("Timestamp contract repair applied.");
