import assert from "node:assert/strict";
import test from "node:test";

import {
  createContextExperience,
  createContextMap
} from "../experience/index.js";

function sampleInputs() {
  return {
    atlasOutput: {
      status: "analysis_ready",
      ideaProfile: {
        summary: "帮助大学生减少校园一次性用品使用。"
      },
      projectBlueprint: {
        problem: "校园一次性用品使用原因尚未得到验证。"
      }
    },
    memoryContext: {
      projectMemory: [
        {
          id: "project-campus",
          type: "project",
          data: {
            title: "校园环保项目",
            stage: "Explore",
            decisions: [
              {
                candidateId: "decision-target-user",
                question: "目标用户是谁？",
                answer: "在校大学生",
                source: "user_confirmed"
              }
            ],
            history: [
              {
                candidateId: "progress-stage-explore",
                category: "progress",
                content: { summary: "项目进入 Explore 阶段" },
                source: "execution_confirmed",
                createdAt: "2026-07-27T09:00:00.000Z"
              }
            ],
            progress: ["项目进入 Explore 阶段"]
          }
        }
      ]
    },
    executionState: {
      stage: "Explore",
      status: "active",
      milestone: {
        id: "milestone-research",
        title: "完成用户需求验证",
        status: "in_progress",
        tasks: []
      },
      tasks: [
        {
          id: "task-interviews",
          title: "完成 20 份用户访谈",
          status: "in_progress",
          criteria: "整理 20 份可追溯访谈记录。"
        }
      ]
    }
  };
}

function nodesOfType(graph, type) {
  return graph.nodes.filter((node) => node.type === type);
}

test("Context Map creates supported nodes from existing context", () => {
  const graph = createContextMap(sampleInputs());

  assert.equal(nodesOfType(graph, "project").length, 1);
  assert.equal(nodesOfType(graph, "project")[0].title, "校园环保项目");
  assert.equal(nodesOfType(graph, "problem").length, 1);
  assert.equal(nodesOfType(graph, "decision").length, 1);
  assert.equal(nodesOfType(graph, "decision")[0].source, "user_confirmed");
  assert.equal(nodesOfType(graph, "milestone").length, 1);
  assert.equal(nodesOfType(graph, "task").length, 1);
  assert.equal(
    nodesOfType(graph, "task")[0].criteria,
    "整理 20 份可追溯访谈记录。"
  );
  assert.equal(nodesOfType(graph, "progress").length, 1);
  assert.equal(
    nodesOfType(graph, "progress")[0].time,
    "2026-07-27T09:00:00.000Z"
  );
});

test("Context Map creates semantic edges", () => {
  const graph = createContextMap(sampleInputs());
  const relations = graph.edges.map((edge) => edge.relation);

  assert.deepEqual(
    relations.sort(),
    ["addresses", "contains", "supports", "updates"].sort()
  );
  assert.ok(
    graph.edges.every(
      (edge) =>
        graph.nodes.some((node) => node.id === edge.from) &&
        graph.nodes.some((node) => node.id === edge.to)
    )
  );
});

test("Context Map is read-only and freezes its graph", () => {
  const input = sampleInputs();
  const before = structuredClone(input);
  const graph = createContextMap(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(graph), true);
  assert.equal(Object.isFrozen(graph.nodes), true);
  assert.equal(Object.isFrozen(graph.edges), true);
  assert.ok(graph.nodes.every(Object.isFrozen));
  assert.ok(graph.edges.every(Object.isFrozen));
});

test("Context Map safely returns an empty graph without context", () => {
  assert.deepEqual(createContextMap(), { nodes: [], edges: [] });
});

test("Context Experience includes Context Map without removing existing views", () => {
  const experience = createContextExperience(sampleInputs());

  assert.ok(experience.projectOverview);
  assert.ok(experience.projectJourney);
  assert.ok(experience.actionNavigator);
  assert.ok(experience.contextMap);
  assert.equal(experience.contextMap.nodes.length, 6);
  assert.equal(experience.contextMap.edges.length, 4);
});
