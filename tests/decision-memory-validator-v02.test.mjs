import test from "node:test";
import assert from "node:assert/strict";
import { buildDecisionMemoryCase } from "./helpers/decision-memory-case-fixtures.mjs";
import { validateDecisionMemoryGraph, DecisionMemoryValidationError } from "../experience/context-v02/decision-memory-validator.mjs";

const expectCode = (graph, code, projectId = "project:test") => assert.throws(() => validateDecisionMemoryGraph({ graph, projectId, scopeKey: "project:test" }), (error) => error instanceof DecisionMemoryValidationError && error.code === code);

test("valid Decision and Memory graph passes Phase 2 validation", () => assert.equal(validateDecisionMemoryGraph({ graph: buildDecisionMemoryCase("DM-D03").graph, projectId: "project:test", scopeKey: "project:test" }).valid, true));
test("Phase 2 validator rejects required field and authority failures", () => {
  const subject = buildDecisionMemoryCase("DM-D01").graph; delete subject.nodes.find((node) => node.kind === "decision").payload.subjectKey; expectCode(subject, "MISSING_SUBJECT_KEY");
  const scope = buildDecisionMemoryCase("DM-D01").graph; delete scope.nodes.find((node) => node.kind === "decision").payload.scopeKey; expectCode(scope, "MISSING_SCOPE_KEY");
  const authority = buildDecisionMemoryCase("DM-D01").graph; delete authority.nodes.find((node) => node.kind === "decision").provenance.authority; expectCode(authority, "MISSING_AUTHORITY");
});
test("Phase 2 validator rejects invalid references, kinds, and edge consistency", () => {
  const dangling = buildDecisionMemoryCase("DM-D01").graph; dangling.nodes.find((node) => node.kind === "decision").payload.evidenceRefs = ["evidence:nope"]; expectCode(dangling, "DANGLING_REFERENCE");
  const wrong = buildDecisionMemoryCase("DM-D01").graph; wrong.nodes.find((node) => node.kind === "decision").payload.evidenceRefs = ["project:test"]; expectCode(wrong, "WRONG_REFERENCE_KIND");
  expectCode(buildDecisionMemoryCase("DM-D05").graph, "SUPERSESSION_CYCLE");
  expectCode(buildDecisionMemoryCase("DM-D11").graph, "DECISION_EDGE_MISMATCH");
});
test("branching is legal while cross-kind and mismatched subjects are errors", () => {
  assert.doesNotThrow(() => validateDecisionMemoryGraph({ graph: buildDecisionMemoryCase("DM-D06").graph, projectId: "project:test", scopeKey: "project:test" }));
  const cross = buildDecisionMemoryCase("DM-D01").graph; cross.nodes.push({ ...buildDecisionMemoryCase("DM-M01").graph.nodes.find((node) => node.id === "memory:confirmed"), id: "memory:cross" }); cross.edges.push({ ...buildDecisionMemoryCase("DM-D03").graph.edges[0], id: "edge:cross", from: "decision:current", to: "memory:cross" }); expectCode(cross, "WRONG_REFERENCE_KIND");
  const mismatch = buildDecisionMemoryCase("DM-D03").graph; mismatch.nodes.find((node) => node.id === "decision:new").payload.subjectKey = "other"; expectCode(mismatch, "DECISION_SUBJECT_MISMATCH");
});
test("supersession self-loop has its dedicated error before base validation", () => {
  const { graph } = buildDecisionMemoryCase("DM-D01"); const node = graph.nodes.find((item) => item.kind === "decision"); graph.edges.push({ ...buildDecisionMemoryCase("DM-D03").graph.edges[0], id: "edge:self", from: node.id, to: node.id }); expectCode(graph, "SUPERSESSION_SELF_LOOP");
});
test("target project must exist and be a project node", () => {
  const { graph } = buildDecisionMemoryCase("DM-D01"); expectCode(graph, "DANGLING_REFERENCE", "project:missing");
  const wrongKind = buildDecisionMemoryCase("DM-D01").graph; expectCode(wrongKind, "WRONG_REFERENCE_KIND", "evidence:case");
});
test("revoked supersession edge remains historical and validator preserves input", () => {
  const { graph } = buildDecisionMemoryCase("DM-D03"); graph.edges[0].lifecycle.state = "revoked"; graph.nodes.find((node) => node.id === "decision:old").payload.supersededBy = null; const beforeValidation = structuredClone(graph); assert.doesNotThrow(() => validateDecisionMemoryGraph({ graph, projectId: "project:test", scopeKey: "project:test" })); assert.deepEqual(graph, beforeValidation);
});
