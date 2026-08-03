import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildDecisionMemoryCase } from "./helpers/decision-memory-case-fixtures.mjs";
import { buildDecisionMemoryLedger } from "../experience/context-v02/decision-memory-ledger.mjs";
import { DecisionMemoryValidationError } from "../experience/context-v02/decision-memory-validator.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../examples/nexus-atlas-decision-memory-cases-v0.2.json", import.meta.url), "utf8"));
const cases = [...catalog.decisionCases, ...catalog.memoryCases, ...catalog.ledgerCases];

test("Phase 2B catalog has 31 unique cases and all execute", () => {
  assert.equal(cases.length, 31);
  assert.equal(new Set(cases.map((item) => item.id)).size, 31);
  for (const item of cases) {
    const { graph, options } = buildDecisionMemoryCase(item.id);
    if (item.expected.errorCode) {
      assert.throws(() => buildDecisionMemoryLedger({ graph, ...options }), (error) => error instanceof DecisionMemoryValidationError && error.code === item.expected.errorCode, item.id);
      continue;
    }
    if (item.category === "ledger-determinism") {
      if (item.id === "DM-L01") {
        assert.deepEqual(buildDecisionMemoryLedger({ graph, ...options }), buildDecisionMemoryLedger({ graph, ...options }));
      } else if (item.id === "DM-L02") {
        const ledger = buildDecisionMemoryLedger({ graph, ...options }); assert.equal(Object.isFrozen(ledger), true); assert.ok(Object.values(ledger).every((value) => value === null || typeof value !== "object" || Object.isFrozen(value))); assert.equal(Object.isFrozen(ledger.diagnostics), true); assert.equal(Object.isFrozen(ledger.sourceSummary), true);
      } else if (item.id === "DM-L03") {
        const before = structuredClone(graph); buildDecisionMemoryLedger({ graph, ...options }); assert.deepEqual(graph, before);
      } else if (item.id === "DM-L04") {
        const shuffled = structuredClone(graph); shuffled.nodes.reverse(); shuffled.edges.reverse(); assert.deepEqual(buildDecisionMemoryLedger({ graph, ...options }), buildDecisionMemoryLedger({ graph: shuffled, ...options }));
      } else if (item.id === "DM-L05") {
        const ledger = buildDecisionMemoryLedger({ graph, ...options }); const providerTotal = Object.values(ledger.sourceSummary.providers).reduce((sum, count) => sum + count, 0); assert.equal(ledger.sourceSummary.totalIncludedRecords, providerTotal); assert.equal(ledger.sourceSummary.totalIncludedRecords, 1);
      } else if (item.id === "DM-L06") {
        const ledger = buildDecisionMemoryLedger({ graph, ...options }); assert.equal(ledger.omittedRecords.some((record) => record.rule === "restricted"), true); assert.equal(ledger.effectiveDecisions.length + ledger.proposedDecisions.length + ledger.inheritedMemories.length + ledger.inferredMemories.length + ledger.disputedMemories.length + ledger.historicalMemories.length, 0); assert.equal(JSON.stringify(ledger).includes("Statement for memory:restricted"), false);
      } else if (item.id === "DM-L07") {
        const originalFetch = globalThis.fetch; const originalNow = Date.now; const originalRandom = Math.random; const modules = ["decision-memory-validator.mjs", "decision-memory-resolver.mjs", "decision-memory-ledger.mjs"].map((name) => fs.readFileSync(new URL(`../experience/context-v02/${name}`, import.meta.url), "utf8")).join("\n"); assert.equal(modules.includes("process.env"), false);
        try { globalThis.fetch = () => { throw new Error("fetch called"); }; Date.now = () => { throw new Error("Date.now called"); }; Math.random = () => { throw new Error("Math.random called"); }; assert.doesNotThrow(() => buildDecisionMemoryLedger({ graph, ...options })); } finally { globalThis.fetch = originalFetch; Date.now = originalNow; Math.random = originalRandom; }
      }
      continue;
    }
    const ledger = buildDecisionMemoryLedger({ graph, ...options });
    const ids = (values) => values.map((value) => value.id).sort();
    assert.deepEqual(ids(ledger.effectiveDecisions), [...item.expected.effectiveDecisionIds].sort(), `${item.id} effective`);
    assert.deepEqual(ids(ledger.proposedDecisions), [...item.expected.proposedDecisionIds].sort(), `${item.id} proposed`);
    assert.deepEqual(ledger.decisionChains, item.expected.decisionChains, `${item.id} chains`);
    assert.deepEqual(ids(ledger.inheritedMemories), [...item.expected.inheritedMemoryIds].sort(), `${item.id} inherited`);
    assert.deepEqual(ids(ledger.inferredMemories), [...item.expected.inferredMemoryIds].sort(), `${item.id} inferred`);
    assert.deepEqual(ids(ledger.disputedMemories), [...item.expected.disputedMemoryIds].sort(), `${item.id} disputed`);
    assert.deepEqual(ids(ledger.historicalMemories), [...item.expected.historicalMemoryIds].sort(), `${item.id} historical`);
    assert.deepEqual(ledger.unresolvedConflicts.map((conflict) => conflict.type).sort(), [...item.expected.conflictTypes].sort(), `${item.id} conflicts`);
    assert.deepEqual(ledger.omittedRecords.map((record) => record.rule).sort(), [...item.expected.omissionRules].sort(), `${item.id} omissions`);
  }
});
