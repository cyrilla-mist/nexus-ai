import test from "node:test";
import assert from "node:assert/strict";
import { buildDecisionMemoryCase } from "./helpers/decision-memory-case-fixtures.mjs";
import { resolveDecisionMemory } from "../experience/context-v02/decision-memory-resolver.mjs";

const resolve = (id) => { const { graph, options } = buildDecisionMemoryCase(id); return resolveDecisionMemory({ graph, ...options }); };
const ids = (values) => values.map((value) => value.id).sort();
test("Resolver resolves chains, authority, branching, and revoked terminals", () => {
  assert.deepEqual(ids(resolve("DM-D04").effectiveDecisionNodes), ["decision:C"]);
  assert.equal(resolve("DM-D06").decisionChains[0].chainStatus, "branching");
  assert.deepEqual(ids(resolve("DM-D07").effectiveDecisionNodes), ["decision:human"]);
  assert.deepEqual(ids(resolve("DM-D07").proposedDecisionNodes), ["decision:ai"]);
  assert.deepEqual(ids(resolve("DM-D10").effectiveDecisionNodes), []);
});
test("Resolver separates subjects and handles identical or contradictory choices", () => {
  const d08 = resolve("DM-D08"); assert.deepEqual(ids(d08.effectiveDecisionNodes), ["decision:human-direction", "decision:repository-state"]); assert.equal(d08.decisionChains.length, 2);
  assert.equal(resolve("DM-D12").decisionChains[0].chainStatus, "incomplete");
});
test("Resolver classifies Memory governance and explicit conflicts", () => {
  assert.deepEqual(ids(resolve("DM-M01").inheritedMemoryNodes), ["memory:confirmed"]);
  assert.deepEqual(ids(resolve("DM-M02").inferredMemoryNodes), ["memory:inferred"]);
  assert.deepEqual(ids(resolve("DM-M03").disputedMemoryNodes), ["memory:disputed"]);
  assert.deepEqual(ids(resolve("DM-M04").historicalMemoryNodes), ["memory:stale"]);
  assert.equal(resolve("DM-M11").conflicts[0].type, "memory_statement_conflict");
  const consented = resolve("DM-M09"); assert.deepEqual(ids(consented.inheritedMemoryNodes), ["memory:explicit-consented"]);
});
test("Resolver does not mutate graph or consent array and is order independent", () => {
  const fixture = buildDecisionMemoryCase("DM-D04"); const before = JSON.stringify(fixture.graph); const consent = [...fixture.options.consentedRecordIds]; resolveDecisionMemory(fixture.options ? { graph: fixture.graph, ...fixture.options, consentedRecordIds: consent } : {}); assert.equal(JSON.stringify(fixture.graph), before); assert.deepEqual(consent, fixture.options.consentedRecordIds);
  const shuffled = JSON.parse(JSON.stringify(fixture.graph)); shuffled.nodes.reverse(); shuffled.edges.reverse(); const a = resolveDecisionMemory({ graph: fixture.graph, ...fixture.options }); const b = resolveDecisionMemory({ graph: shuffled, ...fixture.options }); assert.deepEqual(a.decisionChains, b.decisionChains);
});
