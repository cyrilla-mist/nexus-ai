import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderProjectSpace } from "../frontend/project-space.js";

function workspaceExperience() {
  return {
    projectOverview: {
      title: "校园低碳循环计划",
      description: "验证校园一次性用品使用的真实原因。",
      stage: "Explore",
      goal: "完成需求验证并形成可测试方案。",
      summary: "让校园环保从倡议变成可验证项目。"
    },
    projectJourney: {
      stages: [
        { name: "Idea", status: "completed" },
        { name: "Explore", status: "current" },
        { name: "Design", status: "next" },
        { name: "Validate", status: "not_started" },
        { name: "Execute", status: "not_started" }
      ]
    },
    contextMap: {
      nodes: [
        { id: "project:campus", type: "project", title: "校园低碳循环计划", status: "active" },
        { id: "problem:waste", type: "problem", title: "使用原因尚未验证", source: "project_atlas" },
        { id: "decision:users", type: "decision", title: "聚焦大学生", source: "user_confirmed" },
        { id: "milestone:research", type: "milestone", title: "完成需求验证", status: "in_progress" },
        { id: "task:interviews", type: "task", title: "完成用户访谈", status: "todo", criteria: "20 份记录" },
        { id: "progress:explore", type: "progress", title: "进入 Explore", time: "2026-07-27" }
      ],
      edges: [
        { from: "project:campus", to: "problem:waste", relation: "addresses" },
        { from: "decision:users", to: "project:campus", relation: "supports" },
        { from: "milestone:research", to: "task:interviews", relation: "contains" },
        { from: "progress:explore", to: "project:campus", relation: "updates" }
      ]
    },
    actionNavigator: {
      goal: "完成真实需求验证",
      actions: [{
        title: "完成 20 份校园访谈",
        why: "方案设计前需要确认问题。",
        criteria: "形成 20 份可追溯记录。",
        status: "in_progress"
      }]
    }
  };
}

const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

test("Workspace Shell integrates project identity into spatial navigation", () => {
  const html = renderProjectSpace(workspaceExperience());

  assert.doesNotMatch(html, /project-space-app-header/);
  assert.match(html, /project-space-project-anchor/);
  assert.match(html, /project-space-mobile-anchor/);
  assert.match(html, /project-workspace-shell/);
  assert.match(html, /project-space-sidebar/);
  assert.match(html, /project-space-main/);
  assert.match(html, /Context linked · Growth visible/);
});

test("Sidebar provides five native, keyboard-accessible workspace controls", () => {
  const html = renderProjectSpace(workspaceExperience());

  for (const space of ["overview", "journey", "context", "universe", "action"]) {
    assert.match(html, new RegExp(`id="project-space-tab-${space}"`));
    assert.match(html, new RegExp(`for="project-space-tab-${space}"`));
    assert.match(html, new RegExp(`data-space-panel="${space}"`));
  }

  assert.equal((html.match(/name="project-space-view"/g) ?? []).length, 5);
  assert.equal((html.match(/\schecked/g) ?? []).length, 1);
  assert.match(css, /#project-space-tab-overview:checked[\s\S]*?data-space-panel="overview"/);
});

test("All five Spaces consume one read-only Experience projection", () => {
  const experience = workspaceExperience();
  const before = structuredClone(experience);
  const html = renderProjectSpace(experience);

  assert.match(html, /Project Overview/);
  assert.match(html, /Project Journey/);
  assert.match(html, /Context Map/);
  assert.match(html, /Star Map/);
  assert.match(html, /Action Navigator/);
  assert.deepEqual(experience, before);
});

test("Universe keeps Project Core, semantic orbits, and subdued connections", () => {
  const html = renderProjectSpace(workspaceExperience());

  assert.match(html, /data-node-type="project"/);
  assert.match(html, /data-orbit="understanding"/);
  assert.match(html, /data-orbit="execution"/);
  assert.match(html, /data-orbit="growth"/);
  assert.match(html, /data-relation="addresses"/);
  assert.match(html, /data-relation="supports"/);
  assert.match(html, /data-relation="contains"/);
  assert.match(html, /data-relation="updates"/);
  assert.match(css, /\.project-space-panel \.star-map-edge\s*\{[\s\S]*?opacity: 0\.18/);
});

test("Context and Universe expose read-only detail panels", () => {
  const html = renderProjectSpace(workspaceExperience());

  assert.match(html, /data-context-map-detail/);
  assert.match(html, /data-star-map-detail/);
  assert.match(html, /Context Explanation/);
  assert.match(html, /选择一个节点/);
  assert.match(html, /来源/);
  assert.match(html, /状态/);
});

test("Workspace preserves both themes and has a mobile bottom navigation", () => {
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?grid-template-areas:[\s\S]*?"main"[\s\S]*?"sidebar"/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.project-space-navigation\s*\{[\s\S]*?repeat\(5/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.star-map-canvas\s*\{[\s\S]*?display: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Mobile Project Space uses app-like identity, current space, and bottom navigation", () => {
  const html = renderProjectSpace(workspaceExperience());

  assert.match(html, /Project Identity/);
  assert.match(html, /data-mobile-label="Universe"/);
  assert.match(html, /class="mobile-current-space"/);
  assert.match(html, /Current Space/);
  assert.match(css, /Nexus AI v0\.8\.6 Mobile Universe & Final Experience Refinement/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.project-space-main\s*\{[\s\S]*?padding-bottom: 88px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.project-space-sidebar\s*\{[\s\S]*?bottom: 10px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.mobile-current-space\s*\{[\s\S]*?display: grid/);
});
