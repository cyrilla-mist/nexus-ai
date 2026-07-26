import { renderContextMap } from "./context-map.js";
import { renderStarMap } from "./star-map.js";

const THEME_NAMES = Object.freeze({
  light: "晨雾星图",
  dark: "静谧深空"
});

const STAGE_OBJECTIVES = Object.freeze({
  Idea: "明确想法",
  Explore: "验证需求",
  Design: "形成方案",
  Validate: "验证可行",
  Execute: "推进落地"
});

const SPACE_NAVIGATION = Object.freeze([
  Object.freeze({ id: "overview", index: "01", label: "Overview", hint: "项目概览" }),
  Object.freeze({ id: "journey", index: "02", label: "Journey", hint: "成长路径" }),
  Object.freeze({ id: "context", index: "03", label: "Context", hint: "项目关系" }),
  Object.freeze({ id: "universe", index: "04", label: "Universe", hint: "项目宇宙" }),
  Object.freeze({ id: "action", index: "05", label: "Action", hint: "下一步" })
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayText(value, fallback = "无法判断") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function renderOverview(overview) {
  return `
    <section class="project-overview" aria-labelledby="project-overview-title">
      <div class="project-space-heading">
        <div>
          <p class="section-kicker">Project Overview</p>
          <h3 id="project-overview-title">${escapeHtml(
            displayText(overview.title, "未命名项目")
          )}</h3>
        </div>
        <span class="project-stage-badge">
          ${escapeHtml(displayText(overview.stage, "Idea"))}
        </span>
      </div>
      <p class="project-summary">${escapeHtml(displayText(overview.summary))}</p>
      <dl class="project-overview-details">
        <div>
          <dt>核心目标</dt>
          <dd>${escapeHtml(displayText(overview.goal))}</dd>
        </div>
        <div>
          <dt>当前理解</dt>
          <dd>${escapeHtml(displayText(overview.description))}</dd>
        </div>
      </dl>
      <p class="project-overview-note">
        Nexus 以当前确认的 Context 组织本空间；未知信息保持可见，不会被自动补全。
      </p>
    </section>
  `;
}

function renderJourney(journey) {
  const stages = Array.isArray(journey.stages) ? journey.stages : [];

  if (stages.length === 0) {
    return `
      <section class="project-journey" aria-labelledby="project-journey-title">
        <p class="section-kicker">Project Journey</p>
        <h3 id="project-journey-title">项目成长轨迹</h3>
        <p class="project-space-empty">暂无可显示的项目阶段。</p>
      </section>
    `;
  }

  return `
    <section class="project-journey" aria-labelledby="project-journey-title">
      <div class="space-view-heading">
        <div>
          <p class="section-kicker">Project Journey</p>
          <h3 id="project-journey-title">项目成长轨迹</h3>
        </div>
        <p>阶段来自当前项目状态；计划不会自动推进项目。</p>
      </div>
      <ol class="journey-track" aria-label="项目成长路径">
        ${stages
          .map((stage, index) => {
            const name = displayText(stage?.name, `阶段 ${index + 1}`);
            const status = displayText(stage?.status, "not_started");
            const currentAttribute = status === "current" ? ' aria-current="step"' : "";

            return `
              <li data-state="${escapeHtml(status)}"${currentAttribute}>
                <span class="journey-node" aria-hidden="true">${index + 1}</span>
                <span class="journey-label">${escapeHtml(name)}</span>
                <small>${escapeHtml(STAGE_OBJECTIVES[name] ?? "等待项目上下文")}</small>
              </li>
            `;
          })
          .join("")}
      </ol>
    </section>
  `;
}

function renderActionNavigator(actionNavigator) {
  const actions = Array.isArray(actionNavigator.actions) ? actionNavigator.actions : [];
  const primaryAction = isPlainObject(actions[0]) ? actions[0] : {};
  const actionStatus = displayText(primaryAction.status, "proposal");

  return `
    <section class="action-navigator" aria-labelledby="action-navigator-title">
      <div class="space-view-heading">
        <div>
          <p class="section-kicker">Action Navigator</p>
          <h3 id="action-navigator-title">当前行动中心</h3>
        </div>
        <span class="action-state">${escapeHtml(actionStatus)}</span>
      </div>
      <div class="action-focus">
        <p class="action-focus-label">Next meaningful action</p>
        <h4>${escapeHtml(displayText(primaryAction.title, "等待进一步确认"))}</h4>
      </div>
      <dl class="action-details">
        <div>
          <dt>当前目标</dt>
          <dd>${escapeHtml(displayText(actionNavigator.goal))}</dd>
        </div>
        <div>
          <dt>为什么现在做</dt>
          <dd>${escapeHtml(displayText(primaryAction.why))}</dd>
        </div>
        <div>
          <dt>完成标准</dt>
          <dd>${escapeHtml(
            displayText(primaryAction.criteria, displayText(actionNavigator.criteria))
          )}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderNavigation() {
  return SPACE_NAVIGATION.map(
    (item) => `
      <label class="project-space-nav-item" for="project-space-tab-${item.id}" data-space-target="${item.id}">
        <span class="project-space-nav-index" aria-hidden="true">${item.index}</span>
        <span class="project-space-nav-copy">
          <strong>${item.label}</strong>
          <small>${item.hint}</small>
        </span>
      </label>
    `
  ).join("");
}

function renderTabControls() {
  return SPACE_NAVIGATION.map(
    (item, index) => `
      <input
        class="project-space-tab-control"
        type="radio"
        name="project-space-view"
        id="project-space-tab-${item.id}"
        aria-controls="project-space-panel-${item.id}"
        aria-label="${item.label} · ${item.hint}"
        ${index === 0 ? "checked" : ""}
      />
    `
  ).join("");
}

function renderPanel(id, label, content) {
  return `
    <section
      class="project-space-panel"
      id="project-space-panel-${id}"
      data-space-panel="${id}"
      aria-label="${label}"
    >
      ${content}
    </section>
  `;
}

export function renderProjectSpace(experience = {}) {
  const normalized = isPlainObject(experience) ? experience : {};
  const overview = isPlainObject(normalized.projectOverview)
    ? normalized.projectOverview
    : {};
  const contextMap = isPlainObject(normalized.contextMap)
    ? normalized.contextMap
    : {};
  const journey = isPlainObject(normalized.projectJourney)
    ? normalized.projectJourney
    : {};
  const actionNavigator = isPlainObject(normalized.actionNavigator)
    ? normalized.actionNavigator
    : {};
  const title = displayText(overview.title, "未命名项目");
  const stage = displayText(overview.stage, "Idea");

  return `
    <section class="project-space" aria-labelledby="project-space-title">
      <header class="project-space-app-header">
        <div class="project-space-identity">
          <p class="eyebrow">Nexus Project Space</p>
          <div>
            <h2 id="project-space-title">${escapeHtml(title)}</h2>
            <span class="project-space-stage">${escapeHtml(stage)}</span>
          </div>
        </div>
        <p class="project-space-context-status">
          <span aria-hidden="true"></span>
          Read-only Context Workspace
        </p>
      </header>

      <div class="project-workspace-shell">
        ${renderTabControls()}
        <nav class="project-space-sidebar" aria-label="Project Space 导航">
          <div class="project-space-sidebar-heading">
            <span>Project views</span>
            <strong>${escapeHtml(stage)}</strong>
          </div>
          <div class="project-space-navigation">
            ${renderNavigation()}
          </div>
          <p class="project-space-sidebar-note">
            Space over Page<br />Context over Content
          </p>
        </nav>

        <main class="project-space-main" tabindex="-1">
          ${renderPanel("overview", "Project Overview", renderOverview(overview))}
          ${renderPanel("journey", "Project Journey", renderJourney(journey))}
          ${renderPanel("context", "Context Space", renderContextMap(contextMap))}
          ${renderPanel("universe", "Project Universe", renderStarMap(contextMap))}
          ${renderPanel("action", "Action Navigator", renderActionNavigator(actionNavigator))}
        </main>
      </div>
    </section>
  `;
}

export function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

export function getNextTheme(value) {
  return normalizeTheme(value) === "dark" ? "light" : "dark";
}

export function applyTheme(root, value) {
  const theme = normalizeTheme(value);

  if (root?.dataset) {
    root.dataset.theme = theme;
  }

  return theme;
}

export function getThemeName(value) {
  return THEME_NAMES[normalizeTheme(value)];
}