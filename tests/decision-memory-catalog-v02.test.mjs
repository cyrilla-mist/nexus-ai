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
    const ledger = buildDecisionMemoryLedger({ graph, ...options });
    if (item.category === "ledger-determinism") {
      assert.equal(typeof ledger.ledgerVersion, "string", `${item.id} ledger`);
      continue;
    }
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
