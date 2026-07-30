import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  assertContinuityContextParity,
  buildContinuityContextBrief,
  ContinuityContextProviderError,
  createContinuityContextFingerprint,
  renderContinuityContextBlock,
} from "../context/continuity/continuity-context-provider.mjs";

const fixture = JSON.parse(
  fs.readFileSync(
    new URL("../continuity/scenarios/nexus-self-reentry.json", import.meta.url),
    "utf8",
  ),
);
const cliSource = fs.readFileSync(
  new URL("../scripts/verify-continuity-context.mjs", import.meta.url),
  "utf8",
);

function fixtureSnapshot(overrides = {}) {
  return {
    source: "fixture",
    readOnly: true,
    scenario: structuredClone(fixture),
    ...overrides,
  };
}

function dataHubSnapshot(overrides = {}) {
  return {
    source: "datahub-mcp",
    readOnly: true,
    fetchedAt: "2026-07-30T10:00:00.000Z",
    projectUrn:
      "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.continuity.project-nexus-ai.project,DEV)",
    scenario: structuredClone(fixture),
    diagnostics: { actualEntities: 38, actualRelationships: 29 },
    ...overrides,
  };
}

function build(snapshot = fixtureSnapshot(), options = {}) {
  return buildContinuityContextBrief(snapshot, options);
}

test("same snapshot produces byte-identical briefs", () => {
  assert.equal(JSON.stringify(build()), JSON.stringify(build()));
});

test("same brief produces byte-identical text", () => {
  const brief = build();
  assert.equal(
    renderContinuityContextBlock(brief),
    renderContinuityContextBlock(brief),
  );
});

test("provider does not mutate its snapshot input", () => {
  const snapshot = fixtureSnapshot();
  const before = JSON.stringify(snapshot);
  build(snapshot);
  assert.equal(JSON.stringify(snapshot), before);
});

test("write-enabled snapshots are rejected", () => {
  assert.throws(() => build(fixtureSnapshot({ readOnly: false })), {
    code: "SNAPSHOT_INVALID",
  });
});
test("missing project fails explicitly", () => {
  const snapshot = fixtureSnapshot();
  delete snapshot.scenario.project;
  assert.throws(() => build(snapshot), { code: "CONTEXT_PROJECT_MISSING" });
});

test("missing project state fails explicitly", () => {
  const snapshot = fixtureSnapshot();
  delete snapshot.scenario.project.status;
  assert.throws(() => build(snapshot), { code: "CONTEXT_STATE_MISSING" });
});

test("an invalid explicit continuity score fails", () => {
  const snapshot = fixtureSnapshot();
  snapshot.scenario.continuityScore = 101;
  assert.throws(() => build(snapshot), { code: "CONTEXT_SCORE_INVALID" });
});

test("confirmed decisions contain confirmed records only", () => {
  assert.ok(
    build().confirmedDecisions.every((decision) => decision.status === "confirmed"),
  );
});

test("disputed claims are not confirmed decisions", () => {
  assert.ok(
    !build().confirmedDecisions.some(
      (decision) => decision.id === "claim-star-map-primary",
    ),
  );
});

test("superseded claims are not confirmed decisions", () => {
  assert.ok(
    !build().confirmedDecisions.some(
      (decision) => decision.id === "claim-campus-showcase",
    ),
  );
});

test("agent memory conflict remains unresolved", () => {
  const conflict = build().conflicts.find(
    (item) => item.id === "rel-campus-memory-conflict",
  );
  assert.equal(conflict.requiresHumanDecision, true);
  assert.equal(conflict.status, "disputed");
});

test("missing ownership emits a null owner", () => {
  const risk = build().risks.find((item) => item.id === "risk-missing-owner");
  assert.equal(risk.owner, null);
});

test("missing ownership is explicit", () => {
  const risk = build().risks.find((item) => item.id === "risk-missing-owner");
  assert.equal(risk.ownerMissing, true);
});

test("provider does not invent an owner", () => {
  assert.ok(
    !JSON.stringify(build()).match(/Unknown Owner|AI Owner|Nexus Team|Product Owner/),
  );
});

test("recommended actions come from fixture tasks", () => {
  const sourceIds = new Set(
    fixture.entities
      .filter((entity) => entity.type === "task" && entity.metadata?.recommended)
      .map((entity) => entity.id),
  );
  assert.ok(build().recommendedActions.every((action) => sourceIds.has(action.id)));
});

test("recorded task status is preserved", () => {
  const action = build().recommendedActions.find(
    (item) => item.id === "task-core-mcp-bridge",
  );
  assert.equal(action.recordedStatus, "blocked");
  assert.equal(action.currentEvidenceStatus, null);
});

test("evidence references are deduplicated", () => {
  const ids = build().evidenceReferences.map((reference) => reference.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every retained context item keeps at least one evidence reference", () => {
  const brief = build();
  for (const key of [
    "meaningfulChanges",
    "confirmedDecisions",
    "conflicts",
    "risks",
    "recommendedActions",
  ]) {
    assert.ok(brief[key].every((item) => item.evidenceRefs.length >= 1));
  }
});
test("campus-low-carbon namespace is excluded", () => {
  assert.doesNotMatch(JSON.stringify(build()), /campus-low-carbon/i);
});

test("unrelated DataHub namespace is excluded", () => {
  assert.doesNotMatch(JSON.stringify(build(dataHubSnapshot())), /nexus\.other/i);
});

test("evidence reference relationships exist in source graph", () => {
  const relationTypes = new Set(fixture.relationships.map((item) => item.type));
  assert.ok(
    build().evidenceReferences.every((reference) =>
      reference.relationship === null ||
      relationTypes.has(reference.relationship),
    ),
  );
});

test("default collection limits are enforced", () => {
  const brief = build();
  assert.ok(brief.meaningfulChanges.length <= 4);
  assert.ok(brief.confirmedDecisions.length <= 6);
  assert.ok(brief.conflicts.length <= 4);
  assert.ok(brief.risks.length <= 4);
  assert.ok(brief.recommendedActions.length <= 5);
  assert.ok(brief.evidenceReferences.length <= 12);
});

test("custom item limits are enforced", () => {
  const brief = build(fixtureSnapshot(), {
    maxItems: { meaningfulChanges: 2, evidenceReferences: 5 },
  });
  assert.equal(brief.meaningfulChanges.length, 2);
  assert.ok(brief.evidenceReferences.length <= 5);
});

test("maxChars below 2000 is rejected", () => {
  assert.throws(() => build(fixtureSnapshot(), { maxChars: 1999 }), {
    code: "CONTEXT_BUDGET_INVALID",
  });
});

test("maxChars above 20000 is rejected", () => {
  assert.throws(() => build(fixtureSnapshot(), { maxChars: 20001 }), {
    code: "CONTEXT_BUDGET_INVALID",
  });
});

test("rendered text stays within its maxChars budget", () => {
  const brief = build(fixtureSnapshot(), { maxChars: 3000 });
  assert.ok(renderContinuityContextBlock(brief).length <= 3000);
});

test("human-decision conflict survives budget trimming", () => {
  const brief = build(fixtureSnapshot(), { maxChars: 3000 });
  assert.ok(brief.conflicts.some((item) => item.requiresHumanDecision));
});

test("confirmed decisions survive budget trimming", () => {
  const brief = build(fixtureSnapshot(), { maxChars: 3000 });
  assert.equal(brief.confirmedDecisions.length, 4);
});

test("missing ownership survives budget trimming", () => {
  const brief = build(fixtureSnapshot(), { maxChars: 3000 });
  assert.ok(brief.risks.some((item) => item.ownerMissing));
});

test("diagnostics record omitted counts", () => {
  const brief = build(fixtureSnapshot(), {
    maxItems: { meaningfulChanges: 2 },
  });
  assert.equal(brief.diagnostics.omitted.meaningfulChanges, 2);
});

test("diagnostics record truncation", () => {
  const brief = build(fixtureSnapshot(), { maxChars: 3000 });
  assert.equal(brief.diagnostics.truncated, true);
  assert.ok(brief.diagnostics.actualChars <= 3000);
});

test("fixture snapshot builds normally", () => {
  const brief = build();
  assert.equal(brief.source.type, "fixture");
  assert.equal(brief.source.readOnly, true);
  assert.equal(brief.project.id, "project-nexus-ai");
});

test("DataHub-shaped snapshot builds normally", () => {
  const brief = build(dataHubSnapshot());
  assert.equal(brief.source.type, "datahub-mcp");
  assert.equal(brief.source.readOnly, true);
  assert.match(brief.source.projectUrn, /nexus\.continuity/);
});

test("fixture and DataHub semantic fingerprints match", () => {
  assert.equal(
    createContinuityContextFingerprint(build()),
    createContinuityContextFingerprint(build(dataHubSnapshot())),
  );
});

test("fixture and DataHub remain semantically equal at 6000 characters", () => {
  const options = { maxChars: 6000 };
  assert.equal(
    createContinuityContextFingerprint(build(fixtureSnapshot(), options)),
    createContinuityContextFingerprint(build(dataHubSnapshot(), options)),
  );
});
test("fetchedAt does not affect semantic fingerprint", () => {
  const first = build(dataHubSnapshot({ fetchedAt: "2026-07-30T10:00:00Z" }));
  const second = build(dataHubSnapshot({ fetchedAt: "2026-07-31T10:00:00Z" }));
  assert.equal(
    createContinuityContextFingerprint(first),
    createContinuityContextFingerprint(second),
  );
});

test("source transport does not affect semantic fingerprint", () => {
  assert.doesNotThrow(() =>
    assertContinuityContextParity(build(), build(dataHubSnapshot())),
  );
});

test("semantic mismatch fails explicitly", () => {
  const changed = fixtureSnapshot();
  changed.scenario.project.name = "Different Project";
  assert.throws(
    () => assertContinuityContextParity(build(), build(changed)),
    { code: "SEMANTIC_MISMATCH" },
  );
});

test("DataHub CLI never falls back to fixture", () => {
  assert.match(cliSource, /await readContinuitySnapshot\(\)/);
  assert.doesNotMatch(
    cliSource,
    /catch[\s\S]{0,200}fixtureSnapshot\(\)/,
  );
});

test("provider errors do not echo a raw cause", () => {
  const cause = new Error("password=secret C:\\Users\\Private");
  const error = new ContinuityContextProviderError(
    "Live source is unavailable.",
    "LIVE_SOURCE_UNAVAILABLE",
    { cause },
  );
  assert.doesNotMatch(error.message, /password|C:\\Users/i);
});

test("provider output contains no local absolute path", () => {
  assert.doesNotMatch(JSON.stringify(build()), /[A-Z]:\\Users\\/i);
});

test("renderer emits no HTML", () => {
  assert.doesNotMatch(renderContinuityContextBlock(build()), /<[^>]+>/);
});

test("renderer emits no system prompt or AI role instruction", () => {
  assert.doesNotMatch(
    renderContinuityContextBlock(build()),
    /system prompt|you are an ai/i,
  );
});

test("renderer marks the source read-only", () => {
  assert.match(renderContinuityContextBlock(build()), /fixture · read-only/);
});

test("continuity score is the verified derived score", () => {
  assert.equal(build().project.continuityScore, 50);
});

test("invalid relationship references fail explicitly", () => {
  const snapshot = fixtureSnapshot();
  snapshot.scenario.relationships[0].to = "missing-record";
  assert.throws(() => build(snapshot), {
    code: "CONTEXT_RELATIONSHIP_INVALID",
  });
});

test("renderer rejects a lower ad hoc budget than its content", () => {
  const brief = build();
  assert.throws(
    () => renderContinuityContextBlock(brief, { maxChars: 2000 }),
    { code: "CONTEXT_BUDGET_UNSATISFIABLE" },
  );
});
