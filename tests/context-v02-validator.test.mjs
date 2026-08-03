import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ContextGraphValidationError, validateContextGraph } from "../experience/context-v02/context-graph-validator.mjs";

const fixturePath = new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url);
async function graph() { return JSON.parse(await readFile(fixturePath, "utf8")); }
function clone(value) { return structuredClone(value); }
function expectInvalid(value, message) { assert.throws(() => validateContextGraph(value), (error) => error instanceof ContextGraphValidationError && (!message || error.message.includes(message))); }

test("validates the canonical self-context fixture", async () => {
  const result = validateContextGraph(await graph());
  assert.deepEqual({ nodeCount: result.nodeCount, edgeCount: result.edgeCount }, { nodeCount: 26, edgeCount: 8 });
});

test("rejects duplicate node and edge ids", async () => {
  const duplicateNode = await graph();
  duplicateNode.nodes.push(clone(duplicateNode.nodes[0]));
  expectInvalid(duplicateNode, "Duplicate node id");
  const duplicateEdge = await graph();
  duplicateEdge.edges.push(clone(duplicateEdge.edges[0]));
  expectInvalid(duplicateEdge, "Duplicate edge id");
});

test("rejects missing edge endpoints", async () => {
  const from = await graph();
  from.edges[0].from = "missing:node";
  expectInvalid(from, "missing from");
  const to = await graph();
  to.edges[0].to = "missing:node";
  expectInvalid(to, "missing to");
});

test("rejects invalid lifecycle, verification, and freshness", async () => {
  const lifecycle = await graph(); lifecycle.nodes[0].lifecycle.state = "unknown"; expectInvalid(lifecycle, "lifecycle.state");
  const verification = await graph(); verification.nodes[0].epistemic.verification = "guessed"; expectInvalid(verification, "verification");
  const freshness = await graph(); freshness.nodes[0].epistemic.freshness = "guessed"; expectInvalid(freshness, "freshness");
});

test("rejects dangling decision and action references", async () => {
  const decision = await graph();
  decision.nodes.find((node) => node.kind === "decision").payload.supersededBy = "decision:missing";
  expectInvalid(decision, "dangling supersededBy");
  const action = await graph();
  action.nodes.find((node) => node.kind === "action").payload.relatedDecisionRefs = ["decision:missing"];
  expectInvalid(action, "dangling relatedDecisionRef");
});

test("rejects unsafe external actions and dangling milestones", async () => {
  const action = await graph();
  const actionNode = action.nodes.find((node) => node.kind === "action");
  actionNode.payload.externalEffect = true;
  actionNode.payload.requiresConfirmation = false;
  expectInvalid(action, "requires confirmation");
  const project = await graph();
  project.nodes.find((node) => node.kind === "project").payload.currentMilestoneId = "milestone:missing";
  expectInvalid(project, "dangling currentMilestoneId");
});

test("rejects ContextPackage kind mismatches", async () => {
  const value = await graph();
  value.contextPackage.confirmedDecisions = ["project:nexus-atlas"];
  expectInvalid(value, "wrong kind");
});

test("does not modify the input object", async () => {
  const value = await graph();
  const before = structuredClone(value);
  validateContextGraph(value);
  assert.deepEqual(value, before);
});
