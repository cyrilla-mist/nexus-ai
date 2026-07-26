import { renderStarMap } from "./star-map.js";

const THEME_NAMES = Object.freeze({
  light: "晨雾星图",
  dark: "静谧深空"
});

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
      <p class="project-summary">${escapeHtml(
        displayText(overview.summary)
      )}</p>
      <dl class="project-overview-details">
        <div>
          <dt>项目目标</dt>
          <dd>${escapeHtml(displayText(overview.goal))}</dd>
        </div>
        <div>
          <dt>当前理解</dt>
          <dd>${escapeHtml(displayText(overview.description))}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderJourney(journey) {
  const stages = Array.isArray(journey.stages) ? journey.stages : [];

  if (stages.length === 0) {
    return `
      <section class="project-journey" aria-labelledby="project-journey-title">
        <p class="section-kicker">Project Journey</p>
        <h3 id="project-journey-title">项目成长路径</h3>
        <p class="project-space-empty">暂无可显示的项目阶段。</p>
      </section>
    `;
  }

  return `
    <section class="project-journey" aria-labelledby="project-journey-title">
      <p class="section-kicker">Project Journey</p>
      <h3 id="project-journey-title">项目成长路径</h3>
      <ol class="journey-track" aria-label="项目成长路径">
        ${stages
          .map((stage, index) => {
            const status = displayText(stage?.status, "not_started");
            const currentAttribute =
              status === "current" ? ' aria-current="step"' : "";

            return `
              <li data-state="${escapeHtml(status)}"${currentAttribute}>
                <span class="journey-node" aria-hidden="true">${index + 1}</span>
                <span class="journey-label">${escapeHtml(
                  displayText(stage?.name, `阶段 ${index + 1}`)
                )}</span>
              </li>
            `;
          })
          .join("")}
      </ol>
    </section>
  `;
}

function renderActionNavigator(actionNavigator) {
  const actions = Array.isArray(actionNavigator.actions)
    ? actionNavigator.actions
    : [];
  const primaryAction = isPlainObject(actions[0]) ? actions[0] : {};

  return `
    <section class="action-navigator" aria-labelledby="action-navigator-title">
      <p class="section-kicker">Action Navigator</p>
      <h3 id="action-navigator-title">当前行动方向</h3>
      <dl class="action-details">
        <div>
          <dt>当前目标</dt>
          <dd>${escapeHtml(displayText(actionNavigator.goal))}</dd>
        </div>
        <div>
          <dt>下一步行动</dt>
          <dd>${escapeHtml(
            displayText(primaryAction.title, "等待进一步确认")
          )}</dd>
        </div>
        <div>
          <dt>为什么现在做</dt>
          <dd>${escapeHtml(displayText(primaryAction.why))}</dd>
        </div>
        <div>
          <dt>完成标准</dt>
          <dd>${escapeHtml(
            displayText(
              primaryAction.criteria,
              displayText(actionNavigator.criteria)
            )
          )}</dd>
        </div>
      </dl>
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

  return `
    <section class="project-space" aria-labelledby="project-space-title">
      <header class="project-space-intro">
        <p class="eyebrow">Nexus Project Space</p>
        <h2 id="project-space-title">项目认知空间</h2>
      </header>
      <div class="project-space-layout">
        ${renderOverview(overview)}
        ${renderStarMap(contextMap)}
        ${renderJourney(journey)}
        ${renderActionNavigator(actionNavigator)}
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
