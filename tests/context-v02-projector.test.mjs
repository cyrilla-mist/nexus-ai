import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildContextPackageV02 } from "../experience/context-v02/context-package-projector.mjs";
import { buildDecisionMemoryLedger } from "../experience/context-v02/decision-memory-ledger.mjs";

const fixtureUrl = new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url);
async function graph() { return JSON.parse(await readFile(fixtureUrl, "utf8")); }
function clone(value) { return structuredClone(value); }
function refs(value) { const id = (item) => typeof item === "string" ? item : item.id; return { project: id(value.project), identitySnapshot: value.identitySnapshot.map(id), activeGoals: value.activeGoals.map(id), confirmedDecisions: value.confirmedDecisions.map(id), currentEvidence: value.currentEvidence.map(id), disputedContext: value.disputedContext.map(id), staleContext: value.staleContext.map(id), openRisks: value.openRisks.map(id), nextActions: value.nextActions.map(id) }; }

test("projects the expected canonical sections", async () => {
  const input = await graph();
  const result = buildContextPackageV02({ graph: input, generatedAt: "2026-08-03T00:00:00+08:00" });
  assert.equal(result.packageVersion, "0.2");
  assert.equal(result.project.id, "project:nexus-atlas");
  assert.deepEqual(refs(result), {
    project: "project:nexus-atlas",
    identitySnapshot: [],
    activeGoals: [],
    confirmedDecisions: ["decision:context-foundation-first", "decision:long-term-repository", "decision:no-broad-ingestion-first", "decision:no-single-external-store", "decision:self-context-first", "decision:separate-context-states"],
    currentEvidence: ["evidence:architecture-review", "evidence:readme-baseline", "evidence:repository-reference"],
    disputedContext: [],
    staleContext: ["memory:connectors-first-superseded"],
    openRisks: ["risk:broad-ingestion-too-early", "risk:identity-inference-promotion", "risk:single-status-collapse", "risk:ui-defines-model", "risk:unprovenanced-model-facts"],
    nextActions: ["action:define-phase3-context-package-contract"],
  });
  const expected = refs(input.contextPackage);
  assert.deepEqual(refs(result), expected);
});

test("excludes inferred, stale, disputed, restricted, and completed records from trusted sections", async () => {
  const input = await graph();
  const identity = clone(input.nodes.find((node) => node.kind === "project")); identity.id = "identity:inferred"; identity.kind = "identity"; identity.epistemic.verification = "inferred"; input.nodes.push(identity);
  const disputed = clone(input.nodes.find((node) => node.kind === "memory")); disputed.id = "memory:disputed"; disputed.epistemic.verification = "disputed"; input.nodes.push(disputed);
  const staleEvidence = clone(input.nodes.find((node) => node.kind === "evidence")); staleEvidence.id = "evidence:stale"; staleEvidence.epistemic.freshness = "stale"; input.nodes.push(staleEvidence);
  const restricted = clone(input.nodes.find((node) => node.kind === "risk")); restricted.id = "risk:restricted"; restricted.governance.sensitivity = "restricted"; restricted.payload.summary = "must not leak"; input.nodes.push(restricted);
  const completed = clone(input.nodes.find((node) => node.kind === "action")); completed.id = "action:completed"; completed.payload.actionStatus = "completed"; input.nodes.push(completed);
  const result = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt });
  assert.equal(result.identitySnapshot.some((item) => item.id === "identity:inferred"), true);
  assert.equal(result.confirmedDecisions.some((item) => item.id === "identity:inferred"), false);
  assert.equal(result.currentEvidence.some((item) => item.id === "evidence:stale"), false);
  assert.equal(result.disputedContext.some((item) => item.id === "memory:disputed"), true);
  assert.equal(result.openRisks.some((item) => item.id === "risk:restricted"), false);
  assert.equal(result.nextActions.some((item) => item.id === "action:completed"), false);
  assert.equal(result.omittedContext.some((item) => item.id === "risk:restricted" && !item.reason.includes("must not leak")), true);
});

test("counts disputed and stale nodes once in source summary", async () => {
  const input = await graph();
  const disputed = clone(input.nodes.find((node) => node.kind === "memory"));
  disputed.id = "memory:provider-disputed";
  disputed.epistemic.verification = "disputed";
  disputed.provenance.provider = "provider:disputed";
  input.nodes.push(disputed);
  const stale = clone(input.nodes.find((node) => node.kind === "evidence"));
  stale.id = "evidence:provider-stale";
  stale.epistemic.freshness = "stale";
  stale.provenance.provider = "provider:stale";
  input.nodes.push(stale);
  const baseline = buildContextPackageV02({ graph: await graph(), generatedAt: input.metadata.generatedAt });
  const result = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt });
  assert.equal(result.disputedContext.some((item) => item.id === disputed.id), true);
  assert.equal(result.staleContext.some((item) => item.id === stale.id), true);
  assert.equal(result.sourceSummary.providers["provider:disputed"], 1);
  assert.equal(result.sourceSummary.providers["provider:stale"], 1);
  assert.equal(result.sourceSummary.totalIncludedNodes, baseline.sourceSummary.totalIncludedNodes + 2);
  assert.equal(result.sourceSummary.totalIncludedNodes, new Set([
    result.project.id,
    ...result.identitySnapshot.map((item) => item.id),
    ...result.activeGoals.map((item) => item.id),
    ...result.confirmedDecisions.map((item) => item.id),
    ...result.currentEvidence.map((item) => item.id),
    ...result.disputedContext.map((item) => item.id),
    ...result.staleContext.map((item) => item.id),
    ...result.openRisks.map((item) => item.id),
    ...result.nextActions.map((item) => item.id),
  ]).size);
});

test("omits never, explicit-only, and revoked nodes without leaking payload", async () => {
  const input = await graph();
  const never = clone(input.nodes.find((node) => node.kind === "risk"));
  never.id = "risk:never-inherited";
  never.governance.inheritance = "never";
  never.payload.secretSummary = "do not disclose";
  const explicit = clone(input.nodes.find((node) => node.kind === "risk"));
  explicit.id = "risk:explicit-only";
  explicit.governance.inheritance = "explicit_only";
  explicit.payload.secretSummary = "do not disclose";
  const revoked = clone(input.nodes.find((node) => node.kind === "risk"));
  revoked.id = "risk:revoked";
  revoked.lifecycle.state = "revoked";
  revoked.payload.secretSummary = "do not disclose";
  input.nodes.push(never, explicit, revoked);
  const result = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt });
  for (const id of [never.id, explicit.id, revoked.id]) {
    assert.equal(result.openRisks.some((item) => item.id === id), false);
    assert.equal(result.omittedContext.some((item) => item.id === id), true);
  }
  assert.equal(JSON.stringify(result.omittedContext).includes("do not disclose"), false);
});

test("is deterministic, does not mutate input, and freezes output", async () => {
  const input = await graph();
  const before = clone(input);
  const one = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt });
  const two = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt });
  assert.deepEqual(one, two);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(one), true);
  assert.equal(Object.isFrozen(one.nextActions), true);
  assert.equal(Object.isFrozen(one.nextActions[0]), true);
});

test("requires deterministic generatedAt", async () => {
  const input = await graph();
  delete input.metadata.generatedAt;
  assert.throws(() => buildContextPackageV02({ graph: input }), /deterministic generatedAt/i);
});

test("integrates Ledger decisions and historical memories without changing package shape", async () => {
  const input = await graph();
  const ledger = buildDecisionMemoryLedger({ graph: input, projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas", generatedAt: input.metadata.generatedAt });
  const result = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: ledger });
  assert.deepEqual(result.confirmedDecisions.map((item) => item.id).sort(), ledger.effectiveDecisions.map((item) => item.id).sort());
  assert.equal(result.confirmedDecisions.some((item) => item.id === "decision:connectors-first"), false);
  assert.deepEqual(result.staleContext.map((item) => item.id), ["memory:connectors-first-superseded"]);
  assert.equal("decisionMemoryLedger" in result, false);
});

test("rejects Ledger identity, timestamp, and reference violations", async () => {
  const input = await graph();
  const ledger = buildDecisionMemoryLedger({ graph: input, projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas", generatedAt: input.metadata.generatedAt });
  assert.throws(() => buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: { ...ledger, projectId: "project:other" } }), /projectId/i);
  assert.throws(() => buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: { ...ledger, generatedAt: "2026-08-04T00:00:00+08:00" } }), /generatedAt/i);
  assert.throws(() => buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: { ...ledger, effectiveDecisions: [{ id: "memory:model-governance-first" }] } }), /wrong kind/i);
  assert.throws(() => buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: { ...ledger, historicalMemories: [{ id: "decision:context-foundation-first" }] } }), /wrong kind/i);
});

test("preserves Ledger omissions as safe explicit package metadata", async () => {
  const input = await graph();
  const ledger = buildDecisionMemoryLedger({ graph: input, projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas", generatedAt: input.metadata.generatedAt });
  const result = buildContextPackageV02({ graph: input, generatedAt: input.metadata.generatedAt, decisionMemoryLedger: { ...ledger, omittedRecords: [{ id: "decision:connectors-first", kind: "decision", rule: "superseded" }] } });
  const omission = result.omittedContext.find((item) => item.id === "decision:connectors-first");
  assert.deepEqual(omission, { id: "decision:connectors-first", reason: "Decision / Memory governance excluded this record.", rule: "superseded" });
  assert.equal(JSON.stringify(result.omittedContext).includes("choice"), false);
});
