import assert from "node:assert/strict";
import test from "node:test";

import {
  bindStarMapInteractions,
  createStarMapView,
  renderStarMap
} from "../frontend/star-map.js";

function sampleGraph() {
  return {
    nodes: [
      { id: "project:campus", type: "project", title: "校园环保项目", summary: "减少一次性用品使用", status: "active" },
      { id: "problem:waste", type: "problem", title: "使用原因尚未验证", source: "project_atlas" },
      { id: "decision:users", type: "decision", title: "目标用户为大学生", reason: "用户确认", source: "user_confirmed" },
      { id: "milestone:research", type: "milestone", title: "完成需求验证", status: "in_progress" },
      { id: "task:interviews", type: "task", title: "完成用户访谈", criteria: "形成 20 份记录", status: "todo" },
      { id: "progress:explore", type: "progress", title: "进入 Explore 阶段", time: "2026-07-27T09:00:00.000Z" }
    ],
    edges: [
      { from: "project:campus", to: "problem:waste", relation: "addresses" },
      { from: "decision:users", to: "project:campus", relation: "supports" },
      { from: "milestone:research", to: "task:interviews", relation: "contains" },
      { from: "progress:explore", to: "project:campus", relation: "updates" }
    ]
  };
}

test("Context Graph converts to a read-only Star Map View", () => {
  const graph = sampleGraph();
  const before = structuredClone(graph);
  const view = createStarMapView(graph);

  assert.equal(view.nodes.length, 6);
  assert.equal(view.edges.length, 4);
  assert.ok(view.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.nodes), true);
  assert.deepEqual(graph, before);
});

test("Star Map renders every supported node type and semantic relation", () => {
  const html = renderStarMap(sampleGraph());

  for (const type of ["project", "problem", "decision", "milestone", "task", "progress"]) {
    assert.match(html, new RegExp(`data-node-type="${type}"`));
  }

  for (const relation of ["addresses", "supports", "contains", "updates"]) {
    assert.match(html, new RegExp(`data-relation="${relation}"`));
  }
});

test("deterministic orbit layout is stable", () => {
  const first = createStarMapView(sampleGraph());
  const second = createStarMapView(sampleGraph());
  const byType = (view, type) => view.nodes.find((node) => node.type === type);

  assert.deepEqual(first, second);
  assert.deepEqual(
    { x: byType(first, "project").x, y: byType(first, "project").y, layer: byType(first, "project").layer },
    { x: 480, y: 320, layer: "core" }
  );
  assert.equal(byType(first, "problem").orbit, 132);
  assert.equal(byType(first, "milestone").orbit, 224);
  assert.equal(byType(first, "progress").orbit, 286);
});

test("node click and keyboard selection reveal read-only details", () => {
  const graph = sampleGraph();
  const before = structuredClone(graph);
  const listeners = new Map();
  const detail = { innerHTML: "" };
  const controls = graph.nodes.map((node) => ({
    dataset: { starNodeId: node.id },
    setAttribute() {},
    addEventListener(event, handler) {
      listeners.set(`${node.id}:${event}`, handler);
    }
  }));
  const container = {
    querySelector: () => detail,
    querySelectorAll: () => controls
  };

  bindStarMapInteractions(container, graph);
  listeners.get("problem:waste:click")();

  assert.match(detail.innerHTML, /使用原因尚未验证/);
  assert.match(detail.innerHTML, /project_atlas/);
  assert.deepEqual(graph, before);
});

test("empty Context Graph renders a safe empty state", () => {
  const view = createStarMapView({ nodes: [], edges: [] });
  const html = renderStarMap({ nodes: [], edges: [] });

  assert.deepEqual(view.nodes, []);
  assert.deepEqual(view.edges, []);
  assert.match(html, /暂无可显示的项目星图/);
  assert.doesNotMatch(html, /star-map-canvas/);
});
