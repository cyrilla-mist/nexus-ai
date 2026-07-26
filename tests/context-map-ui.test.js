import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  bindContextMapInteractions,
  renderContextMap
} from "../frontend/context-map.js";
import { renderProjectSpace } from "../frontend/project-space.js";

function sampleMap() {
  return {
    nodes: [
      {
        id: "project:campus",
        type: "project",
        title: "校园环保项目",
        summary: "减少校园一次性用品使用。",
        status: "active"
      },
      {
        id: "problem:waste",
        type: "problem",
        title: "一次性用品使用原因尚未验证",
        source: "project_atlas"
      },
      {
        id: "decision:users",
        type: "decision",
        title: "目标用户为在校大学生",
        reason: "用户已确认",
        source: "user_confirmed"
      },
      {
        id: "milestone:research",
        type: "milestone",
        title: "完成用户需求验证",
        status: "in_progress"
      },
      {
        id: "task:interviews",
        type: "task",
        title: "完成 20 份用户访谈",
        status: "in_progress",
        criteria: "形成 20 份访谈记录"
      },
      {
        id: "progress:explore",
        type: "progress",
        title: "项目进入 Explore 阶段",
        time: "2026-07-27T09:00:00.000Z"
      }
    ],
    edges: [
      {
        from: "project:campus",
        to: "problem:waste",
        relation: "addresses"
      },
      {
        from: "decision:users",
        to: "project:campus",
        relation: "supports"
      },
      {
        from: "milestone:research",
        to: "task:interviews",
        relation: "contains"
      },
      {
        from: "progress:explore",
        to: "project:campus",
        relation: "updates"
      }
    ]
  };
}

test("Context Map UI renders nodes and semantic relationships", () => {
  const html = renderContextMap(sampleMap());

  assert.match(html, /项目关系地图/);
  assert.match(html, /校园环保项目/);
  assert.match(html, /一次性用品使用原因尚未验证/);
  assert.match(html, /解决/);
  assert.match(html, /支持/);
  assert.match(html, /包含/);
  assert.match(html, /更新/);
});

test("Context Map UI safely renders an empty graph", () => {
  const html = renderContextMap({ nodes: [], edges: [] });

  assert.match(html, /暂无可显示的项目上下文/);
  assert.doesNotMatch(html, /context-map-node/);
});

test("Context Map UI supports every first-version node type", () => {
  const html = renderContextMap(sampleMap());

  for (const type of [
    "project",
    "problem",
    "decision",
    "milestone",
    "task",
    "progress"
  ]) {
    assert.match(html, new RegExp(`data-node-type="${type}"`));
  }
});

test("Context Map rendering and interaction binding are read-only", () => {
  const contextMap = sampleMap();
  const before = structuredClone(contextMap);
  const handlers = [];
  const detail = { innerHTML: "" };
  const buttons = contextMap.nodes.map((node) => ({
    dataset: { contextNodeId: node.id },
    addEventListener: (_event, handler) => handlers.push(handler),
    setAttribute() {}
  }));
  const container = {
    querySelector: () => detail,
    querySelectorAll: () => buttons
  };

  renderContextMap(contextMap);
  bindContextMapInteractions(container, contextMap);
  handlers[1]();

  assert.match(detail.innerHTML, /一次性用品使用原因尚未验证/);
  assert.match(detail.innerHTML, /project_atlas/);
  assert.deepEqual(contextMap, before);
});

test("Project Space places Context Map between Overview and Journey", () => {
  const html = renderProjectSpace({
    projectOverview: { title: "校园环保项目" },
    contextMap: sampleMap(),
    projectJourney: { stages: [{ name: "Idea", status: "current" }] },
    actionNavigator: {}
  });

  const overviewIndex = html.indexOf("project-overview");
  const mapIndex = html.indexOf("context-map");
  const journeyIndex = html.indexOf("project-journey");

  assert.ok(overviewIndex < mapIndex);
  assert.ok(mapIndex < journeyIndex);
});

test("Frontend entry binds Context Map interaction and responsive styles", () => {
  const app = readFileSync(
    new URL("../frontend/app.js", import.meta.url),
    "utf8"
  );
  const css = readFileSync(
    new URL("../frontend/style.css", import.meta.url),
    "utf8"
  );

  assert.match(app, /bindContextMapInteractions\(resultContent/);
  assert.match(css, /\.context-map-layout/);
  assert.match(css, /\.context-map-node\[aria-pressed="true"\]/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
