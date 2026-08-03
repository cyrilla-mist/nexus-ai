import test from "node:test";
import assert from "node:assert/strict";
import { buildDecisionMemoryCase } from "./helpers/decision-memory-case-fixtures.mjs";
import { buildDecisionMemoryLedger, DECISION_MEMORY_LEDGER_VERSION } from "../experience/context-v02/decision-memory-ledger.mjs";
import { DecisionMemoryValidationError } from "../experience/context-v02/decision-memory-validator.mjs";

const make = (id = "DM-D01") => { const { graph, options } = buildDecisionMemoryCase(id); return buildDecisionMemoryLedger({ graph, ...options }); };
test("Ledger has accepted shape, fixed version, diagnostics, and source summary", () => {
  const ledger = make(); assert.equal(ledger.ledgerVersion, DECISION_MEMORY_LEDGER_VERSION); assert.ok(ledger.generatedAt); for (const section of ["effectiveDecisions", "decisionChains", "proposedDecisions", "unresolvedConflicts", "inheritedMemories", "inferredMemories", "disputedMemories", "historicalMemories", "omittedRecords", "diagnostics", "sourceSummary"]) assert.ok(section in ledger); assert.equal(ledger.diagnostics.effectiveDecisionCount, ledger.effectiveDecisions.length); assert.ok(ledger.sourceSummary.providers);
});
test("Ledger requires caller generatedAt and is deeply frozen", () => {
  const { graph, options } = buildDecisionMemoryCase("DM-D01"); assert.throws(() => buildDecisionMemoryLedger({ graph, ...options, generatedAt: undefined }), (error) => error instanceof DecisionMemoryValidationError && error.code === "INVALID_GENERATED_AT"); const ledger = buildDecisionMemoryLedger({ graph, ...options }); assert.equal(Object.isFrozen(ledger), true); assert.equal(Object.isFrozen(ledger.effectiveDecisions), true); assert.equal(Object.isFrozen(ledger.diagnostics), true);
});
test("Ledger is deterministic, input-safe, and keeps kinds separated", () => {
  const fixture = buildDecisionMemoryCase("DM-M01"); const before = JSON.stringify(fixture.graph); const a = buildDecisionMemoryLedger({ graph: fixture.graph, ...fixture.options }); const shuffled = JSON.parse(JSON.stringify(fixture.graph)); shuffled.nodes.reverse(); const b = buildDecisionMemoryLedger({ graph: shuffled, ...fixture.options }); assert.deepEqual(a, b); assert.equal(JSON.stringify(fixture.graph), before); assert.equal(a.effectiveDecisions.length, 0); assert.equal(a.inheritedMemories.length, 1);
});
test("Ledger omits restricted records without leaking payload", () => { const ledger = make("DM-M06"); assert.equal(ledger.omittedRecords[0].rule, "restricted"); assert.equal(JSON.stringify(ledger).includes("Statement for memory:restricted"), false); });
test("Ledger source summary counts unique legal records only", () => {
  const ledger = make("DM-D04"); const providerTotal = Object.values(ledger.sourceSummary.providers).reduce((sum, count) => sum + count, 0); assert.equal(ledger.sourceSummary.totalIncludedRecords, providerTotal); assert.equal(ledger.sourceSummary.totalIncludedRecords, 3);
  const restricted = make("DM-L06"); assert.equal(restricted.sourceSummary.totalIncludedRecords, 0); assert.deepEqual(restricted.sourceSummary.providers, {});
});
test("Ledger accepts frozen Resolver output and preserves restricted provenance safety", () => {
  const { graph, options } = buildDecisionMemoryCase("DM-M06"); const ledger = buildDecisionMemoryLedger({ graph, ...options }); assert.equal(Object.isFrozen(ledger), true); assert.equal(JSON.stringify(ledger).includes("synthetic:memory:restricted"), false);
  const shuffled = structuredClone(graph); shuffled.nodes.reverse(); shuffled.edges.reverse(); assert.deepEqual(ledger, buildDecisionMemoryLedger({ graph: shuffled, ...options }));
});
