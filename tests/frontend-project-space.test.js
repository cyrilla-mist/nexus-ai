import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyTheme,
  getNextTheme,
  getThemeName,
  renderProjectSpace
} from "../frontend/project-space.js";

function sampleExperience() {
  return {
    projectOverview: {
      title: "校园环保项目",
      description: "需要验证校园一次性用品的真实使用原因。",
      stage: "Explore",
      goal: "形成有真实证据支持的解决方案。",
      summary: "帮助大学生减少不必要的一次性用品使用。"
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
    actionNavigator: {
      goal: "完成真实问题验证",
      actions: [
        {
          title: "完成 20 份用户访谈",
          why: "方案设计前需要确认问题是否真实存在。",
          criteria: "完成并整理 20 份可追溯访谈记录。",
          status: "in_progress"
        }
      ],
      criteria: "完成并整理 20 份可追溯访谈记录。"
    }
  };
}

test("Project Space renders Experience output without changing it", () => {
  const experience = sampleExperience();
  const before = structuredClone(experience);
  const html = renderProjectSpace(experience);

  assert.match(html, /项目认知空间/);
  assert.match(html, /校园环保项目/);
  assert.match(html, /Explore/);
  assert.match(html, /完成 20 份用户访谈/);
  assert.match(html, /完成并整理 20 份可追溯访谈记录/);
  assert.deepEqual(experience, before);
});

test("Project Space safely renders empty Experience data", () => {
  const html = renderProjectSpace();

  assert.match(html, /未命名项目/);
  assert.match(html, /暂无可显示的项目阶段/);
  assert.match(html, /等待进一步确认/);
  assert.match(html, /无法判断/);
});

test("Dark and Light themes switch without relying on browser APIs", () => {
  const root = { dataset: {} };
  const dark = applyTheme(root, "dark");
  const light = applyTheme(root, getNextTheme(dark));

  assert.equal(dark, "dark");
  assert.equal(getThemeName(dark), "静谧深空");
  assert.equal(light, "light");
  assert.equal(getThemeName(light), "晨雾星图");
  assert.equal(root.dataset.theme, "light");
  assert.equal(applyTheme(null, "unsupported"), "light");
});

test("Frontend entry includes Project Space and both theme foundations", () => {
  const html = readFileSync(
    new URL("../frontend/index.html", import.meta.url),
    "utf8"
  );
  const app = readFileSync(
    new URL("../frontend/app.js", import.meta.url),
    "utf8"
  );
  const css = readFileSync(
    new URL("../frontend/style.css", import.meta.url),
    "utf8"
  );

  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(app, /from "\.\/project-space\.js"/);
  assert.match(app, /renderProjectSpace\(data\?\.experience\)/);
  assert.match(css, /--background:/);
  assert.match(css, /--surface:/);
  assert.match(css, /--text:/);
  assert.match(css, /--accent:/);
  assert.match(css, /--node:/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /\.project-space-layout/);
  assert.match(css, /\.journey-track/);
  assert.match(css, /\.action-navigator/);
});
