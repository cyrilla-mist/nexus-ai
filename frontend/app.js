import { bindStarMapInteractions } from "./star-map.js";
import {
  applyTheme,
  getNextTheme,
  getThemeName,
  renderProjectSpace
} from "./project-space.js";
import {
  buildClarificationContext,
  commitAnalysisResult,
  createEmptySessionState,
  stagePendingAnswers
} from "./session-state.js";

const SESSION_KEY = "nexus-ai-project-session-v0.1.1";
const THEME_KEY = "nexus-ai-theme-v0.4.1";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_TURNS = 3;

const input = document.querySelector("#idea-input");
const submitButton = document.querySelector("#submit-button");
const clearButton = document.querySelector("#clear-button");
const status = document.querySelector("#system-status");
const modelMode = document.querySelector("#model-mode");
const emptyState = document.querySelector("#empty-state");
const resultContent = document.querySelector("#result-content");
const resultSection = document.querySelector(".result");
const feedbackBanner = document.querySelector("#feedback-banner");
const turnIndicator = document.querySelector("#turn-indicator");
const connectionHint = document.querySelector("#connection-hint");
const themeToggle = document.querySelector("#theme-toggle");
const entrySpace = document.querySelector("#entry-space");
const createProjectPanel = document.querySelector("#create-project-panel");
const createProjectEntryButton = document.querySelector(
  "#create-project-entry-button"
);
const continueProjectEmpty = document.querySelector("#continue-project-empty");
const continueProjectSummary = document.querySelector(
  "#continue-project-summary"
);
const continueProjectTitle = document.querySelector("#continue-project-title");
const continueProjectMeta = document.querySelector("#continue-project-meta");
const continueProjectEntryButton = document.querySelector(
  "#continue-project-entry-button"
);
const exploreSpaceEntry = document.querySelector("#explore-space-entry");
const exploreSpaceButton = document.querySelector("#explore-space-button");
const resultTitle = document.querySelector("#result-title");

function createEmptySession() {
  return createEmptySessionState();
}

let sessionState = createEmptySession();
let isSubmitting = false;

function resolveApiEndpoint() {
  const configured = document
    .querySelector('meta[name="nexus-api-endpoint"]')
    ?.content?.trim();

  if (configured) {
    return configured;
  }

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://localhost:8787/api/nexus";
  }

  return `${window.location.origin}/api/nexus`;
}

const API_ENDPOINT = resolveApiEndpoint();

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items = [], emptyText = "暂无") {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderField(label, value) {
  return `
    <div class="profile-field">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "无法判断")}</dd>
    </div>
  `;
}

function updateModelMode(model = {}) {
  const mode = model.mode ?? "mock";
  const labels = {
    mock: "Mock Mode",
    deepseek: "DeepSeek Mode",
    fallback: "Fallback Mode"
  };

  modelMode.textContent = labels[mode] ?? "Mock Mode";
  modelMode.dataset.mode = mode;
}

function updateThemeControl(theme) {
  const nextTheme = getNextTheme(theme);

  themeToggle.textContent = `切换至${getThemeName(nextTheme)}`;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

function setTheme(theme) {
  const applied = applyTheme(document.documentElement, theme);

  updateThemeControl(applied);

  try {
    localStorage.setItem(THEME_KEY, applied);
  } catch {
    // Theme remains active even when browser storage is unavailable.
  }
}

function restoreTheme() {
  let storedTheme = "";

  try {
    storedTheme = localStorage.getItem(THEME_KEY) ?? "";
  } catch {
    storedTheme = "";
  }

  const preferredTheme = window.matchMedia?.("(prefers-color-scheme: dark)")
    .matches
    ? "dark"
    : "light";

  setTheme(storedTheme || preferredTheme);
}

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionState));
  } catch {
    showFeedback("当前浏览器无法保存临时进度，但本轮仍可继续使用。", "warning");
  }
}

function restoreSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));

    if (!stored || typeof stored !== "object") {
      return;
    }

    sessionState = {
      initialMessage: String(stored.initialMessage ?? ""),
      projectId: stored.projectId ? String(stored.projectId) : null,
      currentAnalysis: stored.currentAnalysis ?? null,
      clarificationAnswers: Array.isArray(stored.clarificationAnswers)
        ? stored.clarificationAnswers
        : [],
      pendingAnswers: Array.isArray(stored.pendingAnswers)
        ? stored.pendingAnswers
        : [],
      turn: Number.parseInt(stored.turn, 10) || 0,
      lastResult: stored.lastResult ?? null
    };
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function hasRecoverableSession(state = sessionState) {
  return Boolean(
    state.initialMessage &&
      state.currentAnalysis &&
      state.lastResult?.response
  );
}

function recoverableProjectSummary(state = sessionState) {
  const response = state.lastResult?.response ?? {};
  const overview = state.lastResult?.experience?.projectOverview ?? {};
  const title = String(
    overview.title ?? response.ideaProfile?.summary ?? state.initialMessage
  ).trim();
  const stage = String(overview.stage ?? response.stage ?? "Idea").trim();
  const turn = Number.parseInt(response.turn ?? state.turn, 10) || 1;

  return {
    title: title || "未命名项目",
    stage: stage || "Idea",
    turn
  };
}

function updateEntryExperience({ projectOpen = false } = {}) {
  const recoverable = hasRecoverableSession();

  entrySpace.dataset.entryState = projectOpen
    ? "project-open"
    : recoverable
      ? "recoverable"
      : "no-session";
  continueProjectEmpty.hidden = recoverable;
  continueProjectSummary.hidden = !recoverable;
  exploreSpaceEntry.hidden = !projectOpen;
  continueProjectEntryButton.disabled = !recoverable || isSubmitting;
  exploreSpaceButton.disabled = !projectOpen || isSubmitting;

  if (recoverable) {
    const summary = recoverableProjectSummary();
    continueProjectTitle.textContent = summary.title;
    continueProjectMeta.textContent = `${summary.stage} 阶段 · 第 ${summary.turn} 轮 · 当前标签页临时进度`;
  } else {
    continueProjectTitle.textContent = "未命名项目";
    continueProjectMeta.textContent = "等待恢复项目状态";
  }
}

function openProjectSpace({ moveFocus = true } = {}) {
  if (!sessionState.lastResult) {
    showFeedback("当前还没有可探索的 Project Space，请先创建项目。", "info");
    createProjectPanel.scrollIntoView?.({ block: "start" });
    input.focus();
    return;
  }

  resultSection.hidden = false;
  updateEntryExperience({ projectOpen: true });
  resultSection.scrollIntoView?.({ block: "start" });

  if (moveFocus) {
    resultTitle.focus?.({ preventScroll: true });
  }
}

function beginProjectCreation() {
  if (hasRecoverableSession()) {
    const confirmed = window.confirm(
      "创建新项目会清除当前标签页中已恢复的项目进度。是否继续？"
    );

    if (!confirmed) {
      return;
    }

    clearWorkspace({ focusInput: false });
  }

  entrySpace.dataset.entryState = "creating";
  createProjectPanel.scrollIntoView?.({ block: "start" });
  input.focus();
}

function showFeedback(message, type = "info") {
  feedbackBanner.hidden = false;
  feedbackBanner.dataset.type = type;
  feedbackBanner.textContent = message;
}

function clearFeedback() {
  feedbackBanner.hidden = true;
  feedbackBanner.textContent = "";
  feedbackBanner.dataset.type = "";
}


function renderIdeaProfile(profile = {}) {
  return `
    <section class="content-card">
      <p class="section-kicker">Idea Profile</p>
      <h3>项目画像</h3>
      <dl class="profile-grid">
        ${renderField("想法摘要", profile.summary)}
        ${renderField("项目目标", profile.goal)}
        ${renderField("目标用户", profile.targetUsers)}
      </dl>
      <div class="split-content">
        <div>
          <h4>已知事实</h4>
          ${renderList(profile.knownFacts, "尚未形成明确事实")}
        </div>
        <div>
          <h4>当前假设</h4>
          ${renderList(profile.assumptions, "暂无需要记录的假设")}
        </div>
      </div>
    </section>
  `;
}

function renderBlueprint(blueprint = {}) {
  return `
    <section class="content-card">
      <p class="section-kicker">Project Blueprint</p>
      <h3>项目蓝图</h3>
      <dl class="blueprint-grid">
        ${renderField("需要解决的问题", blueprint.problem)}
        ${renderField("初步解决方案", blueprint.proposedSolution)}
        ${renderField("核心价值", blueprint.valueProposition)}
      </dl>
      <div class="split-content">
        <div>
          <h4>验证计划</h4>
          ${renderList(blueprint.validationPlan)}
        </div>
        <div>
          <h4>阶段里程碑</h4>
          ${renderList(blueprint.milestones)}
        </div>
      </div>
    </section>
  `;
}

function renderRisks(risks = []) {
  const cards =
    Array.isArray(risks) && risks.length > 0
      ? risks
          .map(
            (item, index) => `
              <article class="risk-card">
                <span class="risk-index">风险 ${index + 1}</span>
                <div class="risk-detail-grid">
                  <div>
                    <h4>风险</h4>
                    <p>${escapeHtml(item?.risk ?? "无法判断")}</p>
                  </div>
                  <div>
                    <h4>判断依据</h4>
                    <p>${escapeHtml(item?.basis ?? "无法判断")}</p>
                  </div>
                  <div>
                    <h4>应对措施</h4>
                    <p>${escapeHtml(item?.mitigation ?? "无法判断")}</p>
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : '<p class="muted">当前没有可确认的风险。</p>';

  return `
    <section class="content-card">
      <p class="section-kicker">Risk Review</p>
      <h3>风险与应对</h3>
      <div class="risk-list">${cards}</div>
    </section>
  `;
}

function renderClarificationForm(
  questions = [],
  turn = 1,
  pendingAnswers = []
) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "";
  }

  if (turn >= MAX_TURNS) {
    return `
      <section class="content-card">
        <p class="section-kicker">Clarification</p>
        <h3>本次协作轮次已完成</h3>
        <p class="muted">当前版本最多支持 ${MAX_TURNS} 轮。你可以根据下一步行动开始执行，或清空后重新规划。</p>
      </section>
    `;
  }

  return `
    <section class="content-card clarification-card">
      <p class="section-kicker">Clarification · 下一轮</p>
      <h3>回答这些问题，继续完善项目</h3>
      <p class="muted">你的回答会与上一轮分析一起交给 Project Atlas，不会被当成新项目。</p>
      <form id="clarification-form" novalidate>
        ${questions
          .map((question, index) => {
            const pendingAnswer =
              pendingAnswers.find((item) => item.question === question)
                ?.answer ?? "";

            return `
              <label class="question-field">
                <span>${index + 1}. ${escapeHtml(question)}</span>
                <textarea
                  rows="3"
                  data-question="${escapeHtml(question)}"
                  placeholder="请填写具体回答"
                  required
                >${escapeHtml(pendingAnswer)}</textarea>
              </label>
            `;
          })
          .join("")}
        <p class="form-error" id="clarification-error" hidden></p>
        <button id="continue-button" type="submit">继续完善项目</button>
      </form>
    </section>
  `;
}

function renderDebugInfo(data) {
  return `
    <details class="debug-panel">
      <summary>开发调试信息</summary>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </details>
  `;
}

function renderResult(data, { revealProjectSpace = true } = {}) {
  const response = data?.response ?? {};
  const reflection = data?.reflection ?? {};

  emptyState.hidden = true;
  resultContent.hidden = false;
  turnIndicator.hidden = false;
  turnIndicator.textContent = `第 ${response.turn ?? sessionState.turn} / ${response.maxTurns ?? MAX_TURNS} 轮`;
  updateModelMode(response.model);

  resultContent.innerHTML = `
    <div class="result-stack">
      ${renderProjectSpace(data?.experience)}
      ${renderIdeaProfile(response.ideaProfile)}
      ${renderBlueprint(response.projectBlueprint)}
      ${renderRisks(response.risks)}
      ${renderClarificationForm(
        response.clarificationQuestions ?? response.questions,
        response.turn ?? sessionState.turn,
        sessionState.pendingAnswers
      )}
      ${
        reflection.passed === false
          ? `<section class="content-card"><h3>质量检查</h3>${renderList(reflection.issues)}</section>`
          : ""
      }
      ${renderDebugInfo(data)}
    </div>
  `;

  bindStarMapInteractions(resultContent, data?.experience?.contextMap);

  if (response.model?.mode === "fallback") {
    showFeedback(
      "模型服务本轮未能正常返回，Project Atlas 已保留你提供的内容并使用安全结果继续分析。",
      "warning"
    );
  } else {
    showFeedback("项目分析已完成，你可以查看结果或回答澄清问题。", "success");
  }

  if (revealProjectSpace) {
    openProjectSpace();
  } else {
    resultSection.hidden = true;
    updateEntryExperience();
  }
}

function renderError(message, { preserveResult = false } = {}) {
  resultSection.hidden = false;
  showFeedback(message, "error");

  if (preserveResult && sessionState.lastResult) {
    emptyState.hidden = true;
    resultContent.hidden = false;
    return;
  }

  emptyState.hidden = false;
  resultContent.hidden = true;
  emptyState.textContent = message;
}

function setLoading(loading, label = "正在分析") {
  isSubmitting = loading;
  submitButton.disabled = loading;
  clearButton.disabled = loading;
  input.disabled = loading;
  resultSection.setAttribute("aria-busy", String(loading));

  if (loading) {
    status.textContent = label;
  }

  const continueButton = document.querySelector("#continue-button");
  if (continueButton) {
    continueButton.disabled = loading;
    continueButton.textContent = loading ? "正在完善…" : "继续完善项目";
  }

  createProjectEntryButton.disabled = loading;
  continueProjectEntryButton.disabled = loading || !hasRecoverableSession();
  exploreSpaceButton.disabled = loading || resultSection.hidden;
}

function friendlyRequestError(error) {
  if (error?.name === "AbortError") {
    return "请求等待时间过长，请稍后重试。你的当前填写内容仍保留在页面中。";
  }

  if (error?.code === "HTTP_400") {
    return error.message || "提交内容不完整，请检查后重试。";
  }

  if (error?.code === "HTTP_500") {
    return "Nexus 服务暂时无法完成分析，请稍后再试。";
  }

  return "无法连接 Nexus Worker，请检查网络或确认本地 Worker 已启动。";
}

async function requestAnalysis(payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    let data;

    try {
      data = await response.json();
    } catch {
      throw Object.assign(new Error("服务返回了无法读取的结果。"), {
        code: response.status >= 500 ? "HTTP_500" : "INVALID_RESPONSE"
      });
    }

    if (!response.ok || !data.ok) {
      throw Object.assign(
        new Error(data?.error?.message ?? "Nexus 无法处理本次请求。"),
        { code: response.status >= 500 ? "HTTP_500" : "HTTP_400" }
      );
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function submitPayload(
  payload,
  loadingLabel,
  { preserveResultOnError = false } = {}
) {
  if (isSubmitting) {
    return;
  }

  clearFeedback();
  setLoading(true, loadingLabel);

  try {
    const data = await requestAnalysis(payload);
    sessionState = commitAnalysisResult(
      sessionState,
      data,
      payload.context?.turn ?? 1
    );
    saveSession();
    renderResult(data);
    status.textContent = "分析完成";
  } catch (error) {
    renderError(friendlyRequestError(error), {
      preserveResult: preserveResultOnError
    });
    status.textContent =
      error?.name === "AbortError" ? "请求超时" : "分析失败";
  } finally {
    setLoading(false);
  }
}

async function submitIdea() {
  const message = input.value.trim();

  if (!message) {
    status.textContent = "需要输入";
    renderError("请先写下你的项目想法或目标。");
    input.focus();
    return;
  }

  if (hasRecoverableSession()) {
    const confirmed = window.confirm(
      "提交当前想法会创建新项目并替换本标签页中的已恢复进度。是否继续？"
    );

    if (!confirmed) {
      return;
    }
  }

  sessionState = {
    ...createEmptySession(),
    initialMessage: message,
    turn: 1
  };
  saveSession();
  resultContent.innerHTML = "";
  resultContent.hidden = true;
  emptyState.hidden = false;
  emptyState.textContent =
    "Nexus 正在建立新的项目空间，完成后将在这里展示项目上下文。";
  turnIndicator.hidden = true;
  resultSection.hidden = true;
  updateEntryExperience();

  await submitPayload(
    {
      message,
      context: {
        clarificationAnswers: [],
        previousAnalysis: null,
        turn: 1
      }
    },
    "正在分析"
  );
}

async function continueProject(form) {
  const fields = [...form.querySelectorAll("textarea[data-question]")];
  const currentAnswers = fields.map((field) => ({
    question: field.dataset.question,
    answer: field.value.trim()
  }));
  const errorElement = form.querySelector("#clarification-error");

  if (currentAnswers.some((item) => !item.answer)) {
    errorElement.hidden = false;
    errorElement.textContent = "请回答全部澄清问题后再继续。";
    fields.find((field) => !field.value.trim())?.focus();
    return;
  }

  errorElement.hidden = true;
  const nextTurn = Math.min(MAX_TURNS, sessionState.turn + 1);
  sessionState = stagePendingAnswers(sessionState, currentAnswers);
  saveSession();

  await submitPayload(
    {
      message: sessionState.initialMessage,
      context: buildClarificationContext(sessionState, nextTurn)
    },
    "正在完善",
    { preserveResultOnError: true }
  );
}

function clearWorkspace({ focusInput = true } = {}) {
  sessionState = createEmptySession();
  sessionStorage.removeItem(SESSION_KEY);
  input.value = "";
  input.disabled = false;
  resultContent.innerHTML = "";
  resultContent.hidden = true;
  emptyState.hidden = false;
  emptyState.textContent =
    "输入想法后，这里会显示项目概览、成长路径、行动方向和详细分析。";
  turnIndicator.hidden = true;
  status.textContent = "待输入";
  updateModelMode();
  clearFeedback();
  resultSection.hidden = true;
  updateEntryExperience();

  if (focusInput) {
    input.focus();
  }
}

submitButton.addEventListener("click", submitIdea);
clearButton.addEventListener("click", () => clearWorkspace());
createProjectEntryButton.addEventListener("click", beginProjectCreation);
continueProjectEntryButton.addEventListener("click", () => openProjectSpace());
exploreSpaceButton.addEventListener("click", () => openProjectSpace());
themeToggle.addEventListener("click", () => {
  setTheme(getNextTheme(document.documentElement.dataset.theme));
});

input.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    submitIdea();
  }
});

resultContent.addEventListener("submit", (event) => {
  if (event.target.id !== "clarification-form") {
    return;
  }

  event.preventDefault();
  continueProject(event.target);
});

connectionHint.textContent = `当前连接：${API_ENDPOINT}`;
restoreTheme();
restoreSession();
updateEntryExperience();

if (sessionState.initialMessage) {
  input.value = sessionState.initialMessage;
}

if (sessionState.lastResult) {
  renderResult(sessionState.lastResult, { revealProjectSpace: false });
  status.textContent = "可继续项目";
}
