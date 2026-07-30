#!/usr/bin/env node
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assertContinuityContextParity,
  buildContinuityContextBrief,
  ContinuityContextProviderError,
  createContinuityContextFingerprint,
  renderContinuityContextBlock,
} from "../context/continuity/continuity-context-provider.mjs";
import { readContinuitySnapshot } from "../datahub/mcp/continuity-live-reader.mjs";

const FIXTURE_URL = new URL(
  "../continuity/scenarios/nexus-self-reentry.json",
  import.meta.url,
);

function parseArguments(argv) {
  const result = {
    source: "fixture",
    maxChars: 9000,
    json: false,
    text: false,
    compare: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--source") {
      result.source = argv[++index];
    } else if (value === "--max-chars") {
      result.maxChars = Number(argv[++index]);
    } else if (value === "--json") {
      result.json = true;
    } else if (value === "--text") {
      result.text = true;
    } else if (value === "--compare") {
      result.compare = true;
    } else {
      throw new ContinuityContextProviderError(
        `Unknown CLI option: ${value}`,
        "CLI_ARGUMENT_INVALID",
      );
    }
  }
  if (!["fixture", "datahub"].includes(result.source)) {
    throw new ContinuityContextProviderError(
      "CLI source must be fixture or datahub.",
      "CLI_ARGUMENT_INVALID",
    );
  }
  return result;
}

async function fixtureSnapshot() {
  return {
    source: "fixture",
    readOnly: true,
    scenario: JSON.parse(await fs.readFile(FIXTURE_URL, "utf8")),
  };
}

async function loadSnapshot(source) {
  if (source === "fixture") return fixtureSnapshot();
  try {
    return await readContinuitySnapshot();
  } catch (cause) {
    throw new ContinuityContextProviderError(
      "DataHub live source is unavailable for read-only context verification.",
      "LIVE_SOURCE_UNAVAILABLE",
      { cause },
    );
  }
}

function sourceDiagnostics(snapshot) {
  const entities = snapshot.scenario?.entities || [];
  const relationships = snapshot.scenario?.relationships || [];
  const campusFixtureEntities = entities.filter((entity) =>
    JSON.stringify(entity).includes("campus-low-carbon"),
  ).length;
  return {
    entities: snapshot.diagnostics?.actualEntities ?? entities.length,
    datasets: snapshot.diagnostics?.totalDatasets ?? entities.length + 1,
    relationships:
      snapshot.diagnostics?.actualRelationships ?? relationships.length,
    lineage:
      snapshot.diagnostics?.lineageVerification?.passed ??
      (snapshot.source === "fixture" ? "not-applicable" : false),
    campusFixtureEntities,
  };
}

function summary(brief, fingerprint, textBlock, snapshot) {
  const included = brief.diagnostics.included;
  const source = sourceDiagnostics(snapshot);
  return [
    "PASS: Continuity Context Provider verified",
    `Source: ${brief.source.type}`,
    `Project: ${brief.project.name}`,
    `Budget: ${textBlock.length} / ${brief.diagnostics.budget.maxChars} chars`,
    `Changes: ${included.meaningfulChanges}`,
    `Decisions: ${included.confirmedDecisions}`,
    `Conflicts: ${included.conflicts}`,
    `Risks: ${included.risks}`,
    `Actions: ${included.recommendedActions}`,
    `Evidence refs: ${included.evidenceReferences}`,
    `Entities / datasets / relationships: ${source.entities} / ${source.datasets} / ${source.relationships}`,
    `Lineage verified: ${source.lineage}`,
    `Campus fixture entities: ${source.campusFixtureEntities}`,
    `Truncated: ${brief.diagnostics.truncated}`,
    `Fingerprint: ${fingerprint}`,
  ].join("\n");
}

function safeFailure(error) {
  const code =
    error instanceof ContinuityContextProviderError
      ? error.code
      : "CONTEXT_VERIFICATION_FAILED";
  return `FAIL: ${code}\nContinuity context verification did not complete.`;
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.compare) {
    const fixtureSnapshotValue = await fixtureSnapshot();
    const liveSnapshotValue = await loadSnapshot("datahub");
    const fixture = buildContinuityContextBrief(fixtureSnapshotValue, {
      maxChars: options.maxChars,
    });
    const live = buildContinuityContextBrief(liveSnapshotValue, {
      maxChars: options.maxChars,
    });
    const fingerprint = assertContinuityContextParity(fixture, live);
    const liveDiagnostics = sourceDiagnostics(liveSnapshotValue);
    process.stdout.write(
      [
        "PASS: Continuity Context Provider semantic parity verified",
        `Fixture: ${createContinuityContextFingerprint(fixture)}`,
        `DataHub: ${createContinuityContextFingerprint(live)}`,
        `Fingerprint: ${fingerprint}`,
        `Entities / datasets / relationships: ${liveDiagnostics.entities} / ${liveDiagnostics.datasets} / ${liveDiagnostics.relationships}`,
        `Lineage verified: ${liveDiagnostics.lineage}`,
        `Campus fixture entities: ${liveDiagnostics.campusFixtureEntities}`,
        "Read-only: true",
      ].join("\n") + "\n",
    );
    return;
  }

  const snapshot = await loadSnapshot(options.source);
  const brief = buildContinuityContextBrief(snapshot, {
    maxChars: options.maxChars,
  });
  const textBlock = renderContinuityContextBlock(brief);
  const fingerprint = createContinuityContextFingerprint(brief);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(brief, null, 2)}\n`);
  } else if (options.text) {
    process.stdout.write(`${textBlock}\n`);
  } else {
    process.stdout.write(
      `${summary(brief, fingerprint, textBlock, snapshot)}\n`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${safeFailure(error)}\n`);
    process.exitCode = 1;
  });
}
