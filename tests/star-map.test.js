import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  bindStarMapInteractions,
  createStarMapFocusState,
  createStarMapView,
  getDefaultUniverseViewBox,
  getNodeTypeDisplayName,
  getNodeLabelPlacement,
  getNodeLabelPosition,
  getUniverseContentBounds,
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
    { x: 750, y: 520, layer: "core" }
  );
  assert.equal(byType(first, "problem").orbit, 330);
  assert.equal(byType(first, "milestone").orbit, 470);
  assert.equal(byType(first, "problem").layer, "understanding");
  assert.equal(byType(first, "decision").layer, "understanding");
  assert.equal(byType(first, "milestone").layer, "execution");
  assert.equal(byType(first, "task").layer, "execution");
  assert.equal(byType(first, "progress").layer, "growth");
  assert.ok(byType(first, "problem").x < byType(first, "project").x);
  assert.ok(byType(first, "decision").x > byType(first, "project").x);
  assert.ok(byType(first, "milestone").y < byType(first, "project").y);
  assert.ok(byType(first, "task").y > byType(first, "project").y);
  assert.ok(byType(first, "progress").y < byType(first, "milestone").y);
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
test("Universe layout keeps wide spacing and avoids center-crossing edges", () => {
  const view = createStarMapView(sampleGraph());

  for (let leftIndex = 0; leftIndex < view.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < view.nodes.length; rightIndex += 1) {
      const left = view.nodes[leftIndex];
      const right = view.nodes[rightIndex];
      const distance = Math.hypot(left.x - right.x, left.y - right.y);

      assert.ok(distance >= left.size + right.size + 66);
    }
  }

  assert.ok(view.edges.every((edge) => edge.crossesCore === false));
  assert.ok(view.edges.find((edge) => edge.relation === "addresses").x1 >= view.nodes.find((node) => node.type === "project").x - 100);
});

test("Project Core and semantic orbits preserve visual hierarchy", () => {
  const view = createStarMapView(sampleGraph());
  const html = renderStarMap(sampleGraph());
  const byType = (type) => view.nodes.find((node) => node.type === type);

  assert.ok(byType("project").size > byType("milestone").size);
  assert.ok(byType("milestone").size > byType("task").size);
  assert.match(html, /class="star-map-project-halo"/);
  assert.match(html, /data-orbit="understanding"/);
  assert.match(html, /理解 · 为什么开始/);
  assert.match(html, /data-orbit="execution"/);
  assert.match(html, /执行 · 如何推进/);
  assert.match(html, /data-orbit="growth"/);
  assert.match(html, /成长 · 如何变化/);
});

test("focus state identifies selected, related, and quiet context", () => {
  const graph = sampleGraph();
  const view = createStarMapView(graph);
  const focus = createStarMapFocusState(graph, "decision:users");
  const edgeIndex = (relation) =>
    view.edges.findIndex((edge) => edge.relation === relation);

  assert.equal(focus.selectedId, "decision:users");
  assert.equal(focus.nodes["decision:users"], "selected");
  assert.equal(focus.nodes["project:campus"], "related");
  assert.equal(focus.nodes["problem:waste"], "related");
  assert.equal(focus.nodes["milestone:research"], "related");
  assert.equal(focus.nodes["task:interviews"], "related");
  assert.equal(focus.edges[edgeIndex("supports")], "related");
  assert.equal(focus.edges[edgeIndex("contains")], "related");
});

test("selection updates related nodes, edges, and relationship details", () => {
  const graph = sampleGraph();
  const listeners = new Map();
  const detail = { innerHTML: "" };
  const attributes = new Map();
  const controls = graph.nodes.map((node) => ({
    dataset: { starNodeId: node.id },
    setAttribute(name, value) {
      attributes.set(`${node.id}:${name}`, value);
    },
    addEventListener(event, handler) {
      listeners.set(`${node.id}:${event}`, handler);
    }
  }));
  const visualNodes = controls.map((control) => ({
    ...control,
    dataset: { ...control.dataset },
    setAttribute(name, value) {
      attributes.set(`visual:${control.dataset.starNodeId}:${name}`, value);
    }
  }));
  const visualEdges = graph.edges.map((_edge, index) => ({
    dataset: { edgeIndex: String(index) },
    setAttribute(name, value) {
      attributes.set(`edge:${index}:${name}`, value);
    }
  }));
  const visualLabels = controls.map((control) => ({
    dataset: { starLabelId: control.dataset.starNodeId },
    setAttribute(name, value) {
      attributes.set(`label:${control.dataset.starNodeId}:${name}`, value);
    }
  }));
  const container = {
    querySelector: () => detail,
    querySelectorAll(selector) {
      if (selector.startsWith(".star-map-node")) {
        return visualNodes;
      }

      if (selector.startsWith(".star-map-edge")) {
        return visualEdges;
      }

      if (selector.startsWith(".star-map-screen-label")) {
        return visualLabels;
      }

      return controls;
    }
  };

  bindStarMapInteractions(container, graph);
  listeners.get("decision:users:click")();

  assert.equal(
    attributes.get("visual:decision:users:data-focus-state"),
    "selected"
  );
  assert.equal(
    attributes.get("visual:project:campus:data-focus-state"),
    "related"
  );
  assert.equal(attributes.get("edge:1:data-focus-state"), "related");
  assert.equal(attributes.get("label:decision:users:data-focus-state"), "selected");
  assert.equal(attributes.get("label:project:campus:data-focus-state"), "related");
  assert.match(detail.innerHTML, /Relationship/);
  assert.match(detail.innerHTML, /支持/);
  assert.match(detail.innerHTML, /校园环保项目/);

  listeners.get("problem:waste:pointerenter")();
  assert.equal(
    attributes.get("visual:problem:waste:data-focus-state"),
    "hovered"
  );
  assert.equal(attributes.get("label:problem:waste:data-focus-state"), "hovered");
  assert.equal(attributes.get("label:decision:users:data-focus-state"), "default");
  listeners.get("problem:waste:pointerleave")();
  assert.equal(
    attributes.get("visual:decision:users:data-focus-state"),
    "selected"
  );
});


test("Project Universe starts in observation mode before node selection", () => {
  const graph = sampleGraph();
  const focus = createStarMapFocusState(graph);
  const html = renderStarMap(graph);

  assert.equal(focus.selectedId, "");
  assert.ok(Object.values(focus.nodes).every((state) => state === "default"));
  assert.ok(focus.edges.every((state) => state === "default"));
  assert.match(html, /data-universe-state="default"/);
  assert.match(html, /data-detail-state="closed"/);
  assert.match(html, /data-detail-state="closed"[\s\S]*?hidden/);
  assert.doesNotMatch(html, /Context Inspector/);
  assert.match(html, /star-map-guide-popover/);
  assert.match(html, /aria-label="[^"]*Project Universe"/);
  assert.doesNotMatch(html, /star-map-spatial-legend/);
  assert.doesNotMatch(html, /star-map-reading-guide/);
  assert.match(html, /star-map-entry-copy/);
  assert.match(html, /universe-label-layer/);
  assert.match(html, /data-label-placement="/);
});

test("keyboard Escape clears selection and restores observation mode", () => {
  const graph = sampleGraph();
  const listeners = new Map();
  const attributes = new Map();
  const detail = {
    innerHTML: "",
    setAttribute(name, value) {
      attributes.set(`detail:${name}`, value);
    },
    removeAttribute(name) {
      attributes.set(`detail:${name}`, "");
    }
  };
  const stage = {
    setAttribute(name, value) {
      attributes.set(`stage:${name}`, value);
    }
  };
  const canvas = {
    setAttribute(name, value) {
      attributes.set(`canvas:${name}`, value);
    }
  };
  const controls = graph.nodes.map((node) => ({
    dataset: { starNodeId: node.id },
    setAttribute(name, value) {
      attributes.set(`${node.id}:${name}`, value);
    },
    addEventListener(event, handler) {
      listeners.set(`${node.id}:${event}`, handler);
    }
  }));
  const visualNodes = controls.map((control) => ({
    dataset: { ...control.dataset },
    setAttribute(name, value) {
      attributes.set(`visual:${control.dataset.starNodeId}:${name}`, value);
    }
  }));
  const visualEdges = graph.edges.map((_edge, index) => ({
    dataset: { edgeIndex: String(index) },
    setAttribute(name, value) {
      attributes.set(`edge:${index}:${name}`, value);
    }
  }));
  const visualLabels = controls.map((control) => ({
    dataset: { starLabelId: control.dataset.starNodeId },
    setAttribute(name, value) {
      attributes.set(`label:${control.dataset.starNodeId}:${name}`, value);
    }
  }));
  const container = {
    querySelector(selector) {
      if (selector === "[data-star-map-detail]") {
        return detail;
      }

      if (selector === ".star-map-stage") {
        return stage;
      }

      if (selector === ".star-map-canvas") {
        return canvas;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith(".star-map-node")) {
        return visualNodes;
      }

      if (selector.startsWith(".star-map-edge")) {
        return visualEdges;
      }

      if (selector.startsWith(".star-map-screen-label")) {
        return visualLabels;
      }

      return controls;
    },
    addEventListener() {}
  };

  bindStarMapInteractions(container, graph);
  listeners.get("decision:users:keydown")({
    key: "Enter",
    preventDefault() {}
  });
  assert.equal(attributes.get("detail:data-detail-state"), "selected");
  assert.equal(attributes.get("stage:data-universe-state"), "selected");

  listeners.get("decision:users:keydown")({
    key: "Escape",
    preventDefault() {}
  });

  assert.equal(attributes.get("detail:data-detail-state"), "closed");
  assert.equal(attributes.get("detail:hidden"), "");
  assert.equal(attributes.get("stage:data-universe-state"), "default");
  assert.equal(attributes.get("canvas:data-selected-node"), "");
  assert.equal(attributes.get("decision:users:aria-pressed"), "false");
  assert.equal(attributes.get("visual:decision:users:data-focus-state"), "default");
  assert.equal(attributes.get("label:decision:users:data-focus-state"), "default");
  assert.equal(attributes.get("edge:1:data-focus-state"), "default");
  assert.equal(detail.innerHTML, "");
});
test("theme tokens, reduced motion, and mobile semantic fallback are present", () => {
  const css = readFileSync(
    new URL("../frontend/style.css", import.meta.url),
    "utf8"
  );
  const html = renderStarMap(sampleGraph());

  for (const token of [
    "--star-project-fill",
    "--star-project-halo",
    "--star-orbit-understanding",
    "--star-orbit-execution",
    "--star-orbit-growth"
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /\.star-map-canvas\s*\{\s*display: none;/s);
  assert.match(html, /star-map-outline-group/);
  assert.match(html, /Understanding · 为什么开始/);
  assert.match(html, /Execution · 如何推进/);
  assert.match(html, /Growth · 如何成长/);
});

test("Project Universe visual system defines core, orbit, node, and edge hierarchy", () => {
  const css = readFileSync(
    new URL("../frontend/style.css", import.meta.url),
    "utf8"
  );

  for (const token of [
    "--universe-core-atmosphere",
    "--universe-core-aura",
    "--universe-core-shadow",
    "--universe-edge-default",
    "--universe-edge-focus",
    "--universe-orbit-understanding",
    "--universe-orbit-execution",
    "--universe-orbit-growth"
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.match(css, /:root\[data-theme="dark"\][\s\S]*?--universe-depth-1/);
  assert.match(css, /\.project-space-panel \.star-map-stage\s*\{[\s\S]*?--universe-core-atmosphere/);
  assert.match(css, /data-orbit="understanding"[\s\S]*?--universe-orbit-understanding/);
  assert.match(css, /data-orbit="execution"[\s\S]*?--universe-orbit-execution/);
  assert.match(css, /data-orbit="growth"[\s\S]*?--universe-orbit-growth/);
  assert.match(css, /\.project-space-panel \.star-map-edge\s*\{[\s\S]*?opacity: 0\.18/);
  assert.match(css, /data-focus-state="related"\][\s\S]*?opacity: 0\.78/);
});

test("Project Universe maps all six node types to distinct visual roles", () => {
  const css = readFileSync(
    new URL("../frontend/style.css", import.meta.url),
    "utf8"
  );

  for (const type of ["project", "problem", "decision", "milestone", "task", "progress"]) {
    assert.match(css, new RegExp(`data-node-type="${type}"`));
  }

  assert.match(css, /data-node-type="project"[\s\S]*?--star-project-fill/);
  assert.match(css, /data-node-type="problem"[\s\S]*?--universe-problem-core/);
  assert.match(css, /data-node-type="decision"[\s\S]*?--universe-decision-core/);
  assert.match(css, /data-node-type="milestone"[\s\S]*?--universe-milestone-core/);
  assert.match(css, /data-node-type="task"[\s\S]*?--universe-task-core/);
  assert.match(css, /data-node-type="progress"[\s\S]*?--universe-progress-core/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.star-map-node/);
});

test("mobile Universe Explorer replaces compressed SVG with semantic node exploration", () => {
  const html = renderStarMap(sampleGraph());
  const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

  assert.match(html, /aria-label="移动端 Universe Explorer"/);
  assert.match(html, /Universe Explorer/);
  assert.match(html, /移动端节点探索/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.star-map-canvas\s*\{[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.star-map-outline-intro\s*\{[\s\S]*?display: grid/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.project-space-panel \.star-map-detail\s*\{[\s\S]*?border-top: 1px solid var\(--border-soft\)/);
});
test("Desktop Project Universe uses large semantic spatial regions", () => {
  const view = createStarMapView(sampleGraph());
  const byType = (type) => view.nodes.find((node) => node.type === type);

  assert.equal(view.width, 1500);
  assert.equal(view.height, 940);
  assert.equal(byType("project").size, 86);
  assert.equal(byType("problem").x, 300);
  assert.equal(byType("decision").x, 1200);
  assert.equal(byType("milestone").y, 250);
  assert.equal(byType("task").y, 735);
  assert.equal(byType("progress").y, 115);
  assert.ok(Math.hypot(byType("progress").x - byType("project").x, byType("progress").y - byType("project").y) > 390);
});
test("Project Universe polish defines quiet core, node identity, orbit atmosphere, and trails", () => {
  const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

  for (const token of [
    "--universe-core-fill",
    "--universe-core-rim",
    "--universe-core-glow-inner",
    "--universe-core-glow-outer",
    "--universe-trail-default",
    "--universe-trail-focus",
    "--universe-label-muted"
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.match(css, /Nexus AI v0\.8\.8 Project Universe Visual Polish/);
  assert.match(css, /data-space-panel="universe"\] \.star-map-node\[data-node-type="project"\][\s\S]*?--universe-core-fill/);
  assert.match(css, /data-node-type="problem"\][\s\S]*?--universe-problem-rim/);
  assert.match(css, /data-node-type="decision"\][\s\S]*?--universe-decision-rim/);
  assert.match(css, /data-node-type="milestone"\][\s\S]*?--universe-milestone-rim/);
  assert.match(css, /data-node-type="task"\][\s\S]*?--universe-task-rim/);
  assert.match(css, /data-node-type="progress"\][\s\S]*?--universe-progress-rim/);
  assert.match(css, /data-orbit="understanding"\][\s\S]*?stroke-dasharray: 1 18/);
  assert.match(css, /data-orbit="execution"\][\s\S]*?stroke-dasharray: 3 18/);
  assert.match(css, /data-orbit="growth"\][\s\S]*?stroke-dasharray: 1 25/);
  assert.match(css, /data-focus-state="related"\] line[\s\S]*?--universe-trail-focus/);
});

test("Project Universe simplification keeps the default map quiet and focused", () => {
  const html = renderStarMap(sampleGraph());
  const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");
  const view = createStarMapView(sampleGraph());
  const project = view.nodes.find((node) => node.type === "project");
  const problem = view.nodes.find((node) => node.type === "problem");
  const decision = view.nodes.find((node) => node.type === "decision");
  const milestone = view.nodes.find((node) => node.type === "milestone");
  const task = view.nodes.find((node) => node.type === "task");
  const progress = view.nodes.find((node) => node.type === "progress");
  const projectLabel = getNodeLabelPosition(project, view.viewBox);

  assert.match(html, /star-map-guide-popover/);
  assert.doesNotMatch(html, /star-map-spatial-legend/);
  assert.match(html, /universe-label-layer/);
  assert.match(html, /star-map-screen-label/);
  assert.match(html, /data-star-label-id="project:campus"/);
  assert.match(html, /data-label-placement="below"/);
  assert.match(html, /star-map-node-glyph/);
  assert.doesNotMatch(html, /class="star-map-node-label"/);
  assert.match(html, /data-detail-state="closed"/);
  assert.match(html, /data-detail-state="closed"[\s\S]*?hidden/);
  assert.equal(Number.isFinite(projectLabel.left), true);
  assert.equal(Number.isFinite(projectLabel.top), true);
  assert.ok(projectLabel.left > 0 && projectLabel.left < 100);
  assert.ok(projectLabel.top > 0 && projectLabel.top < 100);
  assert.equal(getNodeLabelPlacement(project), "below");
  assert.equal(getNodeLabelPlacement(problem), "right");
  assert.equal(getNodeLabelPlacement(decision), "left");
  assert.equal(getNodeLabelPlacement(milestone), "below");
  assert.equal(getNodeLabelPlacement(task), "above");
  assert.equal(getNodeLabelPlacement(progress), "below");

  assert.match(css, /Nexus AI v0\.8\.12 Universe Simplification & Focus Mode/);
  assert.match(css, /\.star-map-spatial-legend\s*\{[\s\S]*?display: none/);
  assert.match(css, /data-focus-state="default"\]:not\(\[data-node-type="project"\]\)[\s\S]*?opacity: 0/);
  assert.match(css, /min-height: clamp\(560px, calc\(100dvh - 300px\), 720px\)/);
  assert.match(css, /\.star-map-edge\s*\{[\s\S]*?opacity: 0\.06/);
  assert.match(css, /\.star-map-orbit\s*\{[\s\S]*?opacity: 0\.24/);
});


test("Project Universe uses full readable node type names inside nodes", () => {
  const html = renderStarMap(sampleGraph());
  const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

  const expectedTypes = [
    "\u9879\u76ee",
    "\u95ee\u9898",
    "\u51b3\u7b56",
    "\u91cc\u7a0b\u7891",
    "\u4efb\u52a1",
    "\u8fdb\u5c55"
  ];

  assert.deepEqual(
    ["project", "problem", "decision", "milestone", "task", "progress"].map(getNodeTypeDisplayName),
    expectedTypes
  );

  assert.match(html, /universe-node-type-layer/);
  assert.match(html, /universe-node-type-label/);
  assert.match(html, /data-star-type-label-id="project:campus"/);

  for (const label of expectedTypes) {
    assert.match(html, new RegExp(label));
  }

  assert.doesNotMatch(html, />\u9879</);
  assert.doesNotMatch(html, />\u95ee</);
  assert.doesNotMatch(html, />\u51b3</);
  assert.doesNotMatch(html, />\u91cc</);
  assert.doesNotMatch(html, />\u4efb</);
  assert.doesNotMatch(html, />\u8fdb</);
  assert.doesNotMatch(html, /star-map-screen-label-type/);
  assert.match(css, /Nexus AI v0\.8\.13 Node Label & Inspector Boundary Fix/);
  assert.match(css, /\.universe-node-type-label\s*\{[\s\S]*?font-size: 13px/);
  assert.match(css, /\.universe-node-type-label\[data-node-type="project"\][\s\S]*?font-size: 15px/);
  assert.match(css, /\.universe-node-type-label\[data-node-type="milestone"\][\s\S]*?font-size: 12px/);
});

test("Project Universe labels use inward placement and safe area clamping", () => {
  const view = createStarMapView(sampleGraph());
  const byType = (type) => view.nodes.find((node) => node.type === type);
  const problem = byType("problem");
  const decision = byType("decision");
  const task = byType("task");
  const project = byType("project");
  const progress = byType("progress");
  const problemLabel = getNodeLabelPosition(problem, view.viewBox);
  const decisionLabel = getNodeLabelPosition(decision, view.viewBox);
  const taskLabel = getNodeLabelPosition(task, view.viewBox);

  assert.equal(getNodeLabelPlacement(problem), "right");
  assert.equal(getNodeLabelPlacement(decision), "left");
  assert.equal(getNodeLabelPlacement(task), "above");
  assert.equal(getNodeLabelPlacement(project), "below");
  assert.equal(getNodeLabelPlacement(progress), "below");
  assert.ok(problemLabel.left >= 6);
  assert.ok(problemLabel.left <= 58);
  assert.ok(decisionLabel.left <= 74);
  assert.ok(taskLabel.top <= 91);
});

test("Project Universe Inspector close control is geometric and font-independent", () => {
  const source = readFileSync(new URL("../frontend/star-map.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

  assert.match(source, /class="star-map-detail-close"[\s\S]*?data-star-map-close/);
  assert.match(source, /<span aria-hidden="true"><\/span>/);
  assert.doesNotMatch(source, /data-star-map-close[^`]*>×<\/button>/);
  assert.match(css, /\.star-map-detail-close\s*\{[\s\S]*?inline-size: 38px[\s\S]*?block-size: 38px[\s\S]*?display: grid[\s\S]*?place-items: center[\s\S]*?padding: 0[\s\S]*?border-radius: 50%/);
  assert.match(css, /\.star-map-detail-close::before,[\s\S]*?\.star-map-detail-close::after[\s\S]*?inline-size: 14px[\s\S]*?block-size: 2px/);
  assert.match(css, /\.star-map-detail-close::before[\s\S]*?rotate\(45deg\)/);
  assert.match(css, /\.star-map-detail-close::after[\s\S]*?rotate\(-45deg\)/);
  assert.match(css, /\.star-map-detail-close:focus-visible[\s\S]*?outline: 2px solid var\(--focus-ring\)/);
});
test("Project Universe camera uses content bounds instead of the full virtual canvas", () => {
  const view = createStarMapView(sampleGraph());
  const bounds = getUniverseContentBounds(view.nodes);
  const camera = getDefaultUniverseViewBox(view.nodes);
  const html = renderStarMap(sampleGraph());
  const project = view.nodes.find((node) => node.type === "project");
  const problem = view.nodes.find((node) => node.type === "problem");
  const decision = view.nodes.find((node) => node.type === "decision");
  const milestone = view.nodes.find((node) => node.type === "milestone");
  const task = view.nodes.find((node) => node.type === "task");
  const progress = view.nodes.find((node) => node.type === "progress");
  const primaryNodeSpan = decision.x - problem.x;

  assert.deepEqual(view.contentBounds, bounds);
  assert.deepEqual(view.viewBox, camera);
  assert.notDeepEqual(view.viewBox, { x: 0, y: 0, width: 1500, height: 940 });
  assert.ok(view.viewBox.width < view.width);
  assert.ok(view.viewBox.height < view.height);
  assert.ok(bounds.minX >= view.viewBox.x);
  assert.ok(bounds.maxX <= view.viewBox.x + view.viewBox.width);
  assert.ok(bounds.minY >= view.viewBox.y);
  assert.ok(bounds.maxY <= view.viewBox.y + view.viewBox.height);
  assert.ok(primaryNodeSpan / view.viewBox.width >= 0.7);
  assert.ok(project.x > view.viewBox.x + view.viewBox.width * 0.42);
  assert.ok(project.x < view.viewBox.x + view.viewBox.width * 0.58);
  assert.ok(problem.x < project.x);
  assert.ok(decision.x > project.x);
  assert.ok(milestone.y < project.y);
  assert.ok(task.y > project.y);
  assert.ok(progress.y < milestone.y);
  assert.match(html, /viewBox="120\.28 37 1260 840"/);
  assert.match(html, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(html, /data-camera="default"/);
  assert.match(html, /默认 Camera 会聚焦有效节点区域/);
});
