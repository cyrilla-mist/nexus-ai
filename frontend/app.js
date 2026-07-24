const API_ENDPOINT = "http://localhost:8787/api/nexus";

const input = document.querySelector("#idea-input");
const submitButton = document.querySelector("#submit-button");
const clearButton = document.querySelector("#clear-button");
const status = document.querySelector("#system-status");
const emptyState = document.querySelector("#empty-state");
const resultContent = document.querySelector("#result-content");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p>暂无</p>";
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderResult(data) {
  const nexus = data?.nexus ?? {};
  const response = data?.response ?? {};
  const reflection = data?.reflection ?? {};

  emptyState.hidden = true;
  resultContent.hidden = false;
  resultContent.innerHTML = `
    <article class="result-card">
      <h3>Nexus Core</h3>
      <p><strong>意图：</strong>${escapeHtml(nexus.intent?.name ?? "unknown")}</p>
      <p><strong>调度：</strong>${escapeHtml(nexus.selectedAtlas ?? "待确认")}</p>
      <p><strong>原因：</strong>${escapeHtml(nexus.intent?.reason ?? "")}</p>
    </article>

    <article class="result-card">
      <h3>当前阶段</h3>
      <p>${escapeHtml(response.currentStage ?? response.status ?? "unknown")}</p>
      <p><strong>下一步：</strong>${escapeHtml(response.nextStep ?? "")}</p>
    </article>

    <article class="result-card wide">
      <h3>Nexus 任务计划</h3>
      ${renderList(nexus.plan)}
    </article>

    <article class="result-card wide">
      <h3>Project Atlas 澄清问题</h3>
      ${renderList(response.questions)}
    </article>

    <article class="result-card wide">
      <h3>质量检查</h3>
      <p>${reflection.passed ? "已通过基础检查。" : "存在需要后续改进的问题。"}</p>
      ${renderList(reflection.issues)}
    </article>
  `;
}

function renderError(message) {
  emptyState.hidden = false;
  resultContent.hidden = true;
  emptyState.textContent = message;
}

async function submitIdea() {
  const message = input.value.trim();

  if (!message) {
    status.textContent = "需要输入";
    renderError("请先写下一句话形式的想法或目标。");
    input.focus();
    return;
  }

  submitButton.disabled = true;
  status.textContent = "Nexus 思考中";

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data?.error?.message ?? "Nexus Core request failed.");
    }

    renderResult(data);
    status.textContent = "已完成调度";
  } catch (error) {
    renderError(
      `暂时无法连接 Nexus Core。请确认本地 Worker 已启动。详情：${error.message}`
    );
    status.textContent = "连接失败";
  } finally {
    submitButton.disabled = false;
  }
}

function clearWorkspace() {
  input.value = "";
  resultContent.innerHTML = "";
  resultContent.hidden = true;
  emptyState.hidden = false;
  emptyState.textContent =
    "输入目标后，这里会显示 Nexus Core 的意图判断、Atlas 调度与下一步建议。";
  status.textContent = "待输入";
  input.focus();
}

submitButton.addEventListener("click", submitIdea);
clearButton.addEventListener("click", clearWorkspace);

input.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    submitIdea();
  }
});
