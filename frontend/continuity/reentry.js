import { createContinuityProvider } from "../../experience/continuity/continuity-provider.mjs";
import { buildReentryViewModel } from "../../experience/continuity/reentry-view-model.mjs";

const WORKSPACES = ["brief", "evidence", "memory", "action"];
const WORKSPACE_LABELS = {
  brief: "Re-entry Brief",
  evidence: "Evidence & Conflict",
  memory: "Memory Ledger",
  action: "Decision & Action",
};

const app = document.querySelector("#reentry-app");
const status = document.querySelector("#reentry-status");
const reportDate = document.querySelector("#report-date");
const railName = document.querySelector("#rail-project-name");
const railStatus = document.querySelector("#rail-project-status");
const railSource = document.querySelector("#rail-project-source");
const sourceLabel = document.querySelector("#continuity-source-label");
const sourceDetail = document.querySelector("#continuity-source-detail");
const reportMain = document.querySelector("#continuity-workspace");
const announcement = document.querySelector("#workspace-announcement");
const workspaceTabs = [...document.querySelectorAll("[data-workspace]")];

const state = {
  view: null,
  workspace: "brief",
  selectedSignal: "stale",
  memoryFilter: "all",
  sourceInfo: null,
  focusedDecision: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date).toUpperCase();
}

function statusLabel(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function currentDetail() {
  return state.view.selectedSignalDetails[state.selectedSignal] ||
    state.view.selectedSignalDetails.stale;
}

function renderWorkspaceHeading(index, label, title, description, meta = "") {
  return `
    <header class="workspace-heading">
      <p class="section-index">${String(index).padStart(2, "0")} <span>${escapeHtml(label)}</span></p>
      <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </header>`;
}

function renderSignal(signal, role = "brief") {
  const selected = signal.key === state.selectedSignal;
  return `
    <button class="signal-reading signal-${escapeHtml(signal.tone)}" type="button"
      data-signal="${escapeHtml(signal.key)}" data-signal-role="${role}" aria-pressed="${selected}">
      <span>${escapeHtml(signal.label)}</span>
      <strong>${String(signal.count).padStart(2, "0")}</strong>
      <small>${escapeHtml(signal.title)}</small>
      <i aria-hidden="true">→</i>
    </button>`;
}

function renderChanges(changes, limit = changes.length) {
  if (!changes.length) return `<p class="empty-copy">No meaningful changes are recorded.</p>`;
  return `<ol class="timeline-list">${changes.slice(0, limit).map((change) => `
    <li><time>${escapeHtml(formatDate(change.time))}</time><div>
      <strong>${escapeHtml(change.title)}</strong>
      <p>${escapeHtml(change.summary)}</p>
      <small>${escapeHtml(change.source)}</small>
    </div></li>`).join("")}</ol>`;
}

function renderEvidenceChain(chain) {
  if (!chain.length) return `<p class="empty-copy">No linked evidence chain is recorded.</p>`;
  return `<ol class="evidence-chain">${chain.slice(0, 8).map((item) => `
    <li>
      <span class="chain-type">${escapeHtml(statusLabel(item.type))}</span>
      <strong class="chain-title">${escapeHtml(item.title)}</strong>
      <small class="chain-meta">${escapeHtml(item.relation)} · ${escapeHtml(item.source)}</small>
    </li>`).join("")}</ol>`;
}

function renderBroken(records) {
  if (!records.length) return `<p class="empty-copy">No broken context is currently detected.</p>`;
  return `<div class="broken-list">${records.map((record) => `
    <article>
      <div><span>${escapeHtml(record.type)}</span><em>${escapeHtml(statusLabel(record.status))}</em></div>
      <strong>${escapeHtml(record.title)}</strong>
      <p>${escapeHtml(record.reason)}</p>
      <small>${escapeHtml(record.source)}</small>
    </article>`).join("")}</div>`;
}

function renderBrief(view) {
  const detail = currentDetail();
  const action = view.recommendedActions[0];
  return `
    <section class="workspace-view brief-workspace" data-view="brief">
      <section class="project-intro" aria-labelledby="project-title">
        <div>
          <p class="section-index">01 <span>PROJECT</span></p>
          <h2 id="project-title">${escapeHtml(view.project.name)}</h2>
          <p>${escapeHtml(view.project.description)}</p>
          <small>${escapeHtml(view.reportMeta.elapsedLabel)}. Here is what matters now.</small>
        </div>
        <div class="current-state"><span>CURRENT STATE</span><strong>${escapeHtml(view.status)}</strong>
          <p>Continuity score <b>${view.continuityScore}/100</b></p></div>
      </section>
      <section class="signal-strip" aria-label="Continuity signals">${view.signals.map((signal) => renderSignal(signal)).join("")}</section>
      <div class="brief-grid">
        <section class="report-section brief-changes" aria-labelledby="changes-title">
          <header><span>01</span><h2 id="changes-title">WHAT CHANGED</h2><small>${view.meaningfulChanges.length} recent events</small></header>
          ${renderChanges(view.meaningfulChanges, 3)}
        </section>
        <section class="brief-focus" aria-labelledby="focus-title">
          <p> CURRENT FOCUS </p><h2 id="focus-title">${escapeHtml(detail.selectedTitle)}</h2>
          <span class="record-status">${escapeHtml(statusLabel(detail.status))}</span>
          <p>${escapeHtml(detail.whyItMatters)}</p>
        </section>
        <section class="next-best-action" aria-labelledby="next-action-title">
          <p>NEXT BEST ACTION</p>
          <h2 id="next-action-title">${escapeHtml(action?.label || "Review continuity evidence")}</h2>
          <small>${escapeHtml(action?.completionCriteria || "Inspect the evidence before continuing.")}</small>
          <button class="primary-instrument-action" type="button" data-workspace-link="evidence">Review evidence</button>
        </section>
      </div>
    </section>`;
}

function renderSignalLens(detail) {
  return `<aside class="signal-lens signal-${escapeHtml(detail.tone)}" aria-labelledby="signal-lens-title">
    <div class="inspector-heading"><p>SIGNAL LENS</p><span>${escapeHtml(statusLabel(detail.status))}</span></div>
    <h2 id="signal-lens-title">${escapeHtml(detail.selectedTitle)}</h2>
    <p class="inspector-summary">${escapeHtml(detail.selectedSummary)}</p>
    <section><h3>WHY THIS MATTERS</h3><p>${escapeHtml(detail.whyItMatters)}</p></section>
    <dl class="lens-counts"><div><dt>Evidence links</dt><dd>${detail.evidenceChain.length}</dd></div><div><dt>Affected decisions</dt><dd>${detail.affectedDecision ? 1 : 0}</dd></div></dl>
    <p class="lens-next-action"><strong>Next:</strong> ${escapeHtml(detail.recommendedAction)}</p>
    <button class="primary-instrument-action" type="button" data-view-evidence>View Evidence</button>
    ${detail.affectedDecision ? `<button type="button" class="secondary-action" data-related-decision="${escapeHtml(detail.affectedDecision.id)}" aria-label="View related decision: ${escapeHtml(detail.affectedDecision.title)}">View Related Decision</button>` : ""}
    <p class="prototype-feedback" aria-live="polite"></p>
  </aside>`;
}

function renderEvidence(view) {
  const detail = currentDetail();
  return `
    <section class="workspace-view evidence-workspace" data-view="evidence">
      ${renderWorkspaceHeading(2, "EVIDENCE", "Evidence & Conflict", "Trace what the current project state relies on, and where it breaks.", `${view.brokenContext.length} records need attention`)}
      <section class="signal-classifier" aria-label="Evidence classifier">${view.signals.map((signal) => renderSignal(signal, "evidence")).join("")}</section>
      <div class="evidence-layout">
        <div class="evidence-main">
          <section class="report-section" aria-labelledby="conflict-title">
            <header><span>01</span><h2 id="conflict-title">BROKEN / CONFLICTING CONTEXT</h2><small>${view.brokenContext.length} records</small></header>
            ${renderBroken(view.brokenContext)}
          </section>
          <section class="report-section" id="evidence-chain" aria-labelledby="evidence-title">
            <header><span>02</span><h2 id="evidence-title">EVIDENCE CHAIN</h2><small>${detail.evidenceChain.length} links</small></header>
            ${renderEvidenceChain(detail.evidenceChain)}
          </section>
          ${detail.affectedDecision ? `<section class="linked-decision" aria-labelledby="linked-decision-title"><p>LINKED DECISION</p><h2 id="linked-decision-title">${escapeHtml(detail.affectedDecision.title)}</h2><span>${escapeHtml(statusLabel(detail.affectedDecision.status))}</span><small>${escapeHtml(detail.affectedDecision.source)}</small></section>` : ""}
        </div>
        ${renderSignalLens(detail)}
      </div>
    </section>`;
}

function renderMemoryRecord(record) {
  return `<details class="memory-record" data-memory-group="${escapeHtml(record.group)}">
    <summary><span class="memory-type">${escapeHtml(statusLabel(record.type))}</span><strong>${escapeHtml(record.title)}</strong><em>${escapeHtml(statusLabel(record.status))}</em></summary>
    <div class="memory-detail"><p>${escapeHtml(record.summary)}</p><dl>
      <div><dt>SOURCE</dt><dd>${escapeHtml(record.source)}</dd></div>
      <div><dt>UPDATED</dt><dd>${escapeHtml(formatDate(record.time))}</dd></div>
      <div><dt>RELATIONS</dt><dd>${record.relationCount}</dd></div>
    </dl>${record.relations.length ? `<ul>${record.relations.slice(0, 4).map((item) => `<li>${escapeHtml(item.relation)} · ${escapeHtml(item.title)}</li>`).join("")}</ul>` : ""}</div>
  </details>`;
}

function renderMemoryGroup(title, records, group) {
  if (state.memoryFilter !== "all" && state.memoryFilter !== group) return "";
  return `<section class="memory-group" aria-labelledby="memory-${group}-title"><header><h3 id="memory-${group}-title">${escapeHtml(title)}</h3><span>${records.length}</span></header>${records.length ? records.map(renderMemoryRecord).join("") : `<p class="empty-copy">No records in this group.</p>`}</section>`;
}

function renderMemory(view) {
  const ledger = view.memoryLedger;
  return `
    <section class="workspace-view memory-workspace" data-view="memory">
      ${renderWorkspaceHeading(3, "MEMORY", "Memory Ledger", "Review which project memories remain valid, conflict, or have been replaced.", `${ledger.all.length} governed records`)}
      <div class="ledger-filters" role="group" aria-label="Filter memory records">${[
        ["all", "All"], ["confirmed", "Confirmed"], ["disputed", "Disputed"], ["superseded", "Superseded"],
      ].map(([key, label]) => `<button type="button" data-memory-filter="${key}" aria-pressed="${state.memoryFilter === key}">${label}</button>`).join("")}</div>
      <div class="memory-ledger">
        ${renderMemoryGroup("Confirmed / Valid", ledger.confirmed, "confirmed")}
        ${renderMemoryGroup("Disputed", ledger.disputed, "disputed")}
        ${renderMemoryGroup("Superseded / Stale", ledger.superseded, "superseded")}
      </div>
    </section>`;
}

function renderDecision(decision) {
  const focus = decision.id === state.focusedDecision ? " is-related-focus" : "";
  return `<article class="ledger-item${focus}" id="decision-record-${escapeHtml(decision.id)}" data-decision-record="${escapeHtml(decision.id)}"><div><span>DECISION</span><em>${escapeHtml(statusLabel(decision.status))}</em></div><h3>${escapeHtml(decision.title)}</h3><p>${escapeHtml(decision.summary)}</p><small>${escapeHtml(decision.source)}</small></article>`;
}

function renderAction(action, index) {
  return `<article class="action-record"><span class="action-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(action.label)}</h3><p>${escapeHtml(action.summary)}</p><small>${escapeHtml(action.completionCriteria)}</small><dl><div><dt>OWNER</dt><dd class="${action.ownershipRisk ? "is-risk" : ""}">${escapeHtml(action.owner)}</dd></div><div><dt>STATUS</dt><dd>${escapeHtml(statusLabel(action.status))}</dd></div><div><dt>PRIORITY</dt><dd>${escapeHtml(action.priority)}</dd></div></dl></div>${index === 0 ? `<button class="primary-instrument-action" type="button" data-prototype-action>Prepare action</button>` : `<button class="text-action" type="button" data-prototype-action>Review</button>`}</article>`;
}

function renderActionWorkspace(view) {
  const ledger = view.decisionActionLedger;
  return `
    <section class="workspace-view action-workspace" data-view="action">
      ${renderWorkspaceHeading(4, "ACTION", "Decision & Action", "Separate what is confirmed from what still needs a human decision or owner.", `${ledger.recommendedActions.length} recommended actions`)}
      <div class="action-layout">
        <section class="ledger-section" aria-labelledby="confirmed-title"><header><h2 id="confirmed-title">CONFIRMED DECISIONS</h2><span>${ledger.confirmedDecisions.length}</span></header>${ledger.confirmedDecisions.map(renderDecision).join("")}</section>
        <section class="ledger-section" aria-labelledby="pending-title"><header><h2 id="pending-title">PENDING HUMAN DECISIONS</h2><span>${ledger.pendingHumanDecisions.length}</span></header>${ledger.pendingHumanDecisions.map((decision) => `<article class="ledger-item requires-decision"><div><span>CONFLICT</span><em>requires decision</em></div><h3>${escapeHtml(decision.title)}</h3><p>${escapeHtml(decision.summary)}</p><small>${escapeHtml(decision.source)}</small></article>`).join("") || `<p class="empty-copy">No human decision is pending.</p>`}</section>
        <section class="ledger-section action-ledger" aria-labelledby="recommended-title"><header><h2 id="recommended-title">RECOMMENDED ACTIONS</h2><span>${ledger.recommendedActions.length}</span></header>${ledger.recommendedActions.map(renderAction).join("")}<p class="prototype-feedback" aria-live="polite"></p></section>
        <section class="ledger-section" aria-labelledby="ownership-title"><header><h2 id="ownership-title">MISSING OWNERSHIP</h2><span>${ledger.ownershipRisks.length}</span></header>${ledger.ownershipRisks.map((risk) => `<article class="ledger-item ownership-risk"><div><span>RISK</span><em>${escapeHtml(risk.status)}</em></div><h3>${escapeHtml(risk.title)}</h3><p>${escapeHtml(risk.summary)}</p><small>Owner not assigned · ${escapeHtml(risk.source)}</small></article>`).join("")}</section>
      </div>
    </section>`;
}

function updateTabs() {
  workspaceTabs.forEach((tab) => {
    const active = tab.dataset.workspace === state.workspace;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  app.setAttribute("aria-labelledby", `tab-${state.workspace}`);
}

function render(view) {
  const renderers = { brief: renderBrief, evidence: renderEvidence, memory: renderMemory, action: renderActionWorkspace };
  app.innerHTML = renderers[state.workspace](view);
  updateTabs();
  bindPanelInteractions();
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function scrollWorkspaceTop() {
  const top = Math.max(0, reportMain.getBoundingClientRect().top + window.scrollY - 8);
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function activateWorkspace(workspace, { updateHash = true, announce = true } = {}) {
  const next = WORKSPACES.includes(workspace) ? workspace : "brief";
  const changed = state.workspace !== next;
  state.workspace = next;
  if (updateHash && window.location.hash !== `#${next}`) window.location.hash = next;
  if (state.view?.empty) renderEmpty();
  else if (state.view) render(state.view);
  else updateTabs();
  if (changed) scrollWorkspaceTop();
  if (announce) announcement.textContent = `${WORKSPACE_LABELS[next]} workspace selected.`;
}

function bindPanelInteractions() {
  app.querySelectorAll("[data-signal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSignal = button.dataset.signal;
      render(state.view);
      app.querySelector(`[data-signal="${state.selectedSignal}"]`)?.focus();
    });
  });
  app.querySelectorAll("[data-workspace-link]").forEach((button) => button.addEventListener("click", () => activateWorkspace(button.dataset.workspaceLink)));
  app.querySelector("[data-view-evidence]")?.addEventListener("click", () => {
    app.querySelector("#evidence-chain")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  });
  app.querySelectorAll("[data-memory-filter]").forEach((button) => button.addEventListener("click", () => {
    state.memoryFilter = button.dataset.memoryFilter;
    render(state.view);
    app.querySelector(`[data-memory-filter="${state.memoryFilter}"]`)?.focus();
  }));
  app.querySelector("[data-related-decision]")?.addEventListener("click", (event) => {
    state.focusedDecision = event.currentTarget.dataset.relatedDecision;
    activateWorkspace("action");
    window.requestAnimationFrame(() => {
      const record = app.querySelector(`[data-decision-record="${CSS.escape(state.focusedDecision)}"]`);
      record?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    });
  });
  app.querySelectorAll("[data-prototype-action]").forEach((button) => button.addEventListener("click", () => {
    const feedback = app.querySelector(".prototype-feedback");
    if (feedback) feedback.textContent = "Prototype feedback recorded locally. Runtime write-back is not enabled in v0.9.6.";
  }));
}

function bindWorkspaceNavigation() {
  workspaceTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateWorkspace(tab.dataset.workspace));
    tab.addEventListener("keydown", (event) => {
      let targetIndex = null;
      if (event.key === "ArrowRight") targetIndex = (index + 1) % workspaceTabs.length;
      if (event.key === "ArrowLeft") targetIndex = (index - 1 + workspaceTabs.length) % workspaceTabs.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = workspaceTabs.length - 1;
      if (targetIndex !== null) {
        event.preventDefault();
        workspaceTabs[targetIndex].focus();
        activateWorkspace(workspaceTabs[targetIndex].dataset.workspace);
      }
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        activateWorkspace(tab.dataset.workspace);
      }
    });
  });
  window.addEventListener("hashchange", () => activateWorkspace(workspaceFromHash(), { updateHash: false }));
}

function workspaceFromHash() {
  const key = window.location.hash.replace(/^#/, "").toLowerCase();
  return WORKSPACES.includes(key) ? key : "brief";
}

function normalizeInitialHash() {
  const workspace = workspaceFromHash();
  if (window.location.hash !== `#${workspace}`) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${workspace}`);
  }
  state.workspace = workspace;
  updateTabs();
}

function renderEmpty() {
  status.hidden = true;
  app.hidden = false;
  app.innerHTML = `<section class="state-message"><p>CONTINUITY SOURCE</p><h2>No continuity records are available.</h2><p>The source loaded successfully, but it does not contain records for this workspace.</p></section>`;
}

function renderSourceInfo(sourceInfo) {
  state.sourceInfo = sourceInfo;
  sourceLabel.textContent = sourceInfo.label;
  sourceDetail.textContent = sourceInfo.live && sourceInfo.fetchedAt ? `${sourceInfo.detail} · Last fetched ${formatDate(sourceInfo.fetchedAt, true)}` : sourceInfo.detail;
  sourceLabel.classList.toggle("source-live", sourceInfo.live);
  railSource.textContent = sourceInfo.live ? "DataHub MCP · read-only" : "Development fixture";
}

function renderError(error, mode) {
  status.hidden = true;
  app.hidden = false;
  if (mode === "datahub") {
    sourceLabel.textContent = "DataHub live read unavailable";
    sourceDetail.textContent = "Local bridge required";
    sourceLabel.classList.remove("source-live");
    railSource.textContent = "Live read unavailable";
    app.innerHTML = `<section class="state-message error-message live-error" role="alert"><p>DATAHUB LIVE READ UNAVAILABLE</p><h2>DataHub live read is unavailable.</h2><ol><li>Start DataHub.</li><li>Start the local read-only bridge.</li><li>Reload this page.</li></ol><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p><a class="fixture-mode-action" href="./reentry.html?source=fixture#${state.workspace}">Use fixture mode</a></section>`;
    return;
  }
  const unsupportedSource = mode !== "fixture";
  app.innerHTML = `<section class="state-message error-message" role="alert"><p>${unsupportedSource ? "UNSUPPORTED CONTINUITY SOURCE" : "CONTEXT RECOVERY FAILED"}</p><h2>${unsupportedSource ? "The requested continuity source is not supported." : "Unable to load the continuity fixture."}</h2><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p><p>Run this page through a local HTTP server, for example <code>python -m http.server 8000</code>.</p></section>`;
}

async function initialize() {
  let mode = "fixture";
  normalizeInitialHash();
  bindWorkspaceNavigation();
  try {
    const query = new URLSearchParams(window.location.search);
    mode = query.get("source") || "fixture";
    const bridgeUrl = query.get("bridge") || reportMain.dataset.continuityBridgeUrl;
    const provider = createContinuityProvider({ mode, bridgeUrl });
    const loaded = await provider.loadScenario();
    renderSourceInfo(loaded.sourceInfo);
    state.view = buildReentryViewModel(loaded.scenario);
    if (state.view.empty) { renderEmpty(); return; }
    reportDate.textContent = formatDate(state.view.reportMeta.reportDate, true);
    railName.textContent = state.view.project.name;
    railStatus.textContent = state.view.status;
    status.hidden = true;
    app.hidden = false;
    render(state.view);
  } catch (error) {
    renderError(error, mode);
  }
}

initialize();