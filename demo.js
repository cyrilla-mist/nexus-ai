import {
  bindContextMapInteractions,
  renderContextMap
} from "./frontend/context-map.js";
import {
  applyTheme,
  getNextTheme,
  getThemeName,
  renderProjectSpace
} from "./frontend/project-space.js";
import { bindStarMapInteractions } from "./frontend/star-map.js";

const demoContextMap = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({
      id: "project:campus-loop",
      type: "project",
      title: "校园低碳循环计划",
      summary: "用可验证的校园循环机制减少一次性用品浪费。",
      status: "active"
    }),
    Object.freeze({
      id: "problem:single-use",
      type: "problem",
      title: "一次性用品使用原因尚未被验证",
      source: "Project Atlas"
    }),
    Object.freeze({
      id: "decision:student-first",
      type: "decision",
      title: "首轮聚焦在校大学生",
      reason: "校园场景明确，便于完成小范围验证。",
      source: "user_confirmed"
    }),
    Object.freeze({
      id: "milestone:needs-validation",
      type: "milestone",
      title: "完成真实需求验证",
      status: "in_progress"
    }),
    Object.freeze({
      id: "task:interviews",
      type: "task",
      title: "完成 20 份校园访谈",
      criteria: "形成 20 份可追溯访谈记录，并归纳前三个高频障碍。",
      status: "in_progress"
    }),
    Object.freeze({
      id: "task:observation",
      type: "task",
      title: "记录 3 个高频消费场景",
      criteria: "每个场景至少完成两次实地观察。",
      status: "todo"
    }),
    Object.freeze({
      id: "progress:explore",
      type: "progress",
      title: "项目进入 Explore 阶段",
      time: "2026-07-27T10:00:00.000Z",
      source: "execution_confirmed"
    })
  ]),
  edges: Object.freeze([
    Object.freeze({
      from: "project:campus-loop",
      to: "problem:single-use",
      relation: "addresses"
    }),
    Object.freeze({
      from: "decision:student-first",
      to: "project:campus-loop",
      relation: "supports"
    }),
    Object.freeze({
      from: "milestone:needs-validation",
      to: "task:interviews",
      relation: "contains"
    }),
    Object.freeze({
      from: "milestone:needs-validation",
      to: "task:observation",
      relation: "contains"
    }),
    Object.freeze({
      from: "progress:explore",
      to: "project:campus-loop",
      relation: "updates"
    })
  ])
});

const demoExperience = Object.freeze({
  projectOverview: Object.freeze({
    title: "校园低碳循环计划",
    description:
      "项目希望从真实校园行为出发，验证一次性用品浪费的关键原因，再设计小规模、可测量的循环方案。",
    stage: "Explore",
    goal: "在 6 周内完成需求验证，并形成一套可测试的校园低碳 MVP 方案。",
    summary: "让校园环保从倡议变成可以被验证和持续推进的项目。"
  }),
  projectJourney: Object.freeze({
    stages: Object.freeze([
      Object.freeze({ name: "Idea", status: "completed" }),
      Object.freeze({ name: "Explore", status: "current" }),
      Object.freeze({ name: "Design", status: "next" }),
      Object.freeze({ name: "Validate", status: "not_started" }),
      Object.freeze({ name: "Execute", status: "not_started" })
    ])
  }),
  actionNavigator: Object.freeze({
    goal: "验证校园一次性用品使用的真实障碍",
    actions: Object.freeze([
      Object.freeze({
        title: "完成首轮 20 份校园用户访谈",
        why: "在设计方案前，需要区分便利性、价格、习惯和设施不足等不同原因。",
        criteria: "完成 20 份可追溯访谈记录，并归纳前三个高频障碍。",
        status: "in_progress"
      })
    ]),
    criteria: "形成可用于下一阶段方案设计的真实问题清单。"
  }),
  contextMap: demoContextMap
});

const projectSpaceRoot = document.querySelector("#demo-project-space");
const themeToggle = document.querySelector("#demo-theme-toggle");
const THEME_STORAGE_KEY = "nexus-demo-theme";

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? "light";
  } catch {
    return "light";
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme persistence is optional for this static demo.
  }
}

function updateThemeButton(theme) {
  themeToggle.textContent = `切换至${getThemeName(getNextTheme(theme))}`;
  themeToggle.setAttribute("aria-label", themeToggle.textContent);
}

function setTheme(theme) {
  const applied = applyTheme(document.documentElement, theme);
  updateThemeButton(applied);
  storeTheme(applied);
}

function renderDemo() {
  projectSpaceRoot.innerHTML = renderProjectSpace(demoExperience);
  const layout = projectSpaceRoot.querySelector(".project-space-layout");
  const starMap = layout?.querySelector(".star-map");

  if (layout && starMap) {
    const template = document.createElement("template");
    template.innerHTML = renderContextMap(demoContextMap);
    starMap.before(template.content);
  }

  bindContextMapInteractions(projectSpaceRoot, demoContextMap);
  bindStarMapInteractions(projectSpaceRoot, demoContextMap);
}

themeToggle.addEventListener("click", () => {
  setTheme(getNextTheme(document.documentElement.dataset.theme));
});

setTheme(readStoredTheme());
renderDemo();