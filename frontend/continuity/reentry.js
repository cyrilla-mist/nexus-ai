import { createContinuityProvider } from "../../experience/continuity/continuity-provider.mjs";
import { buildReentryViewModel } from "../../experience/continuity/reentry-view-model.mjs";

const app = document.querySelector("#reentry-app");
const status = document.querySelector("#reentry-status");
const reportDate = document.querySelector("#report-date");
const railName = document.querySelector("#rail-project-name");
const railStatus = document.querySelector("#rail-project-status");
const railSource = document.querySelector("#rail-project-source");
const sourceLabel = document.querySelector("#continuity-source-label");
const sourceDetail = document.querySelector("#continuity-source-detail");
const reportMain = document.querySelector("#brief");

const state = {
  view: null,
  selectedSignal: "stale",
  sourceInfo: null,
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
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  })
    .format(date)
    .toUpperCase();
}

function statusLabel(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function renderSignal(signal) {
  const selected = signal.key === state.selectedSignal;
  return `
    <button
      class="signal-reading signal-${escapeHtml(signal.tone)}"
      type="button"
      data-signal="${escapeHtml(signal.key)}"
      aria-pressed="${selected}"
    >
      <span>${escapeHtml(signal.label)}</span>
      <strong>${String(signal.count).padStart(2, "0")}</strong>
      <small>${escapeHtml(signal.title)}</small>
      <i aria-hidden="true">→</i>
    </button>`;
}

function renderChanges(changes) {
  if (!changes.length) return `<p class="empty-copy">No meaningful changes are recorded.</p>`;
  return `<ol class="timeline-list">${changes
    .map(
      (change) => `
        <li>
          <time>${escapeHtml(formatDate(change.time))}</time>
          <div>
            <strong>${escapeHtml(change.title)}</strong>
            <p>${escapeHtml(change.summary)}</p>
            <small>${escapeHtml(change.source)}</small>
          </div>
        </li>`,
    )
    .join("")}</ol>`;
}

function renderDecisions(decisions) {
  if (!decisions.length) return `<p class="empty-copy">No confirmed decisions are available.</p>`;
  return `<ul class="decision-list">${decisions
    .map(
      (decision) => `
        <li id="decision-record-${escapeHtml(decision.id)}" data-decision-record="${escapeHtml(decision.id)}">
          <span aria-hidden="true">●</span>
          <div>
            <strong>${escapeHtml(decision.title)}</strong>
            <p>${escapeHtml(decision.summary)}</p>
            <small>${escapeHtml(decision.confirmedBy)} · ${escapeHtml(decision.source)}</small>
          </div>
        </li>`,
    )
    .join("")}</ul>`;
}

function renderBroken(records) {
  if (!records.length) return `<p class="empty-copy">No broken context is currently detected.</p>`;
  return `<div class="broken-list">${records
    .slice(0, 5)
    .map(
      (record) => `
        <article>
          <div>
            <span>${escapeHtml(record.type)}</span>
            <em>${escapeHtml(statusLabel(record.status))}</em>
          </div>
          <strong>${escapeHtml(record.title)}</strong>
          <p>${escapeHtml(record.reason)}</p>
        </article>`,
    )
    .join("")}</div>`;
}

function renderActions(actions) {
  if (!actions.length) return `<p class="empty-copy">No recommended actions are available.</p>`;
  return `<ol class="action-list">${actions
    .map(
      (action, index) => `
        <li>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>${escapeHtml(action.label)}</strong>
            <p>${escapeHtml(action.summary)}</p>
            <small>${escapeHtml(action.completionCriteria)}</small>
          </div>
          <em class="priority-${escapeHtml(action.priority)}">${escapeHtml(action.priority)}</em>
        </li>`,
    )
    .join("")}</ol>`;
}

function renderEvidenceChain(chain) {
  if (!chain.length) return `<p class="empty-copy">No linked evidence chain is recorded.</p>`;
  return `<ol class="evidence-chain">${chain
    .slice(0, 5)
    .map(
      (item) => `
        <li>
          <span class="chain-type">${escapeHtml(statusLabel(item.type))}</span>
          <strong class="chain-title">${escapeHtml(item.title)}</strong>
            <small class="chain-meta">${escapeHtml(item.relation)} · ${escapeHtml(item.source)}</small>
        </li>`,
    )
    .join("")}</ol>`;
}

function renderAffectedDecision(decision) {
  if (!decision) {
    return `<p class="affected-decision-empty">No related decision was found.</p>`;
  }
  return `
    <div class="affected-decision">
      <strong>${escapeHtml(decision.title)}</strong>
      <span>${escapeHtml(statusLabel(decision.status))}</span>
      <p>${escapeHtml(decision.summary)}</p>
      <small>${escapeHtml(decision.matchReason)} · ${escapeHtml(decision.source)}</small>
      <button
        type="button"
        class="related-decision-action"
        data-related-decision="${escapeHtml(decision.id)}"
        aria-label="View related decision: ${escapeHtml(decision.title)}"
      >View Related Decision</button>
    </div>`;
}

function renderInspector(detail) {
  return `
    <aside class="signal-inspector signal-${escapeHtml(detail.tone)}" aria-labelledby="inspector-title">
      <div class="inspector-heading">
        <p>SELECTED SIGNAL</p>
        <span>${escapeHtml(statusLabel(detail.status))}</span>
      </div>
      <h2 id="inspector-title">${escapeHtml(detail.selectedTitle)}</h2>
      <p class="inspector-summary">${escapeHtml(detail.selectedSummary)}</p>

      <section>
        <h3>WHY THIS MATTERS</h3>
        <p>${escapeHtml(detail.whyItMatters)}</p>
      </section>
      <section>
        <h3>EVIDENCE CHAIN</h3>
        ${renderEvidenceChain(detail.evidenceChain)}
      </section>
      <section>
        <h3>AFFECTED DECISION</h3>
        ${renderAffectedDecision(detail.affectedDecision)}
      </section>
      <section>
        <h3>RECOMMENDED NEXT STEP</h3>
        <button class="primary-instrument-action" type="button" data-prototype-action>
          ${escapeHtml(detail.recommendedAction)}
        </button>
        <p class="prototype-feedback" aria-live="polite"></p>
      </section>
    </aside>`;
}

function render(view) {
  const selected =
    view.selectedSignalDetails[state.selectedSignal] ||
    view.selectedSignalDetails.stale;

  app.innerHTML = `
    <div class="report-copy">
      <section class="project-intro" aria-labelledby="project-title">
        <div>
          <p class="section-index">01 <span>PROJECT</span></p>
          <h2 id="project-title">${escapeHtml(view.project.name)}</h2>
          <p>${escapeHtml(view.project.description)}</p>
          <small>${escapeHtml(view.reportMeta.elapsedLabel)}. Here is what matters now.</small>
        </div>
        <div class="current-state">
          <span>CURRENT STATE</span>
          <strong>${escapeHtml(view.status)}</strong>
          <p>Continuity score <b>${view.continuityScore}/100</b></p>
        </div>
      </section>

      <section class="signal-strip" aria-label="Continuity signals">
        ${view.signals.map(renderSignal).join("")}
      </section>

      <div class="report-content-grid">
        <div class="report-sections">
          <section class="report-section" aria-labelledby="changes-title">
            <header><span>01</span><h2 id="changes-title">WHAT CHANGED</h2><small>${view.meaningfulChanges.length} meaningful events</small></header>
            ${renderChanges(view.meaningfulChanges)}
          </section>
          <div class="paired-sections">
            <section class="report-section" aria-labelledby="holds-title">
              <header><span>02</span><h2 id="holds-title">WHAT STILL HOLDS</h2><small>${view.validDecisions.length} confirmed decisions</small></header>
              ${renderDecisions(view.validDecisions)}
            </section>
            <section class="report-section" aria-labelledby="broken-title">
              <header><span>03</span><h2 id="broken-title">BROKEN CONTEXT</h2><small>Requires attention</small></header>
              ${renderBroken(view.brokenContext)}
            </section>
          </div>
          <section class="report-section" aria-labelledby="actions-title">
            <header><span>04</span><h2 id="actions-title">NEXT ACTIONS</h2><small>${view.recommendedActions.length} priorities</small></header>
            ${renderActions(view.recommendedActions)}
          </section>
        </div>
        ${renderInspector(selected)}
      </div>
    </div>`;

  bindInteractions();
}

function bindInteractions() {
  app.querySelectorAll("[data-signal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSignal = button.dataset.signal;
      render(state.view);
      app.querySelector(`[data-signal="${state.selectedSignal}"]`)?.focus();
    });
  });

  app.querySelector("[data-related-decision]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.relatedDecision;
    const record = app.querySelector(`[data-decision-record="${CSS.escape(id)}"]`);
    if (!record) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    record.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    record.classList.add("is-related-focus");
    window.setTimeout(() => record.classList.remove("is-related-focus"), 1600);
  });

  app.querySelector("[data-prototype-action]")?.addEventListener("click", (event) => {
    const feedback = event.currentTarget.parentElement.querySelector(
      ".prototype-feedback",
    );
    feedback.textContent =
      "Action prepared for the prototype. Runtime write-back is not enabled in v0.9.5.";
  });
}

function renderEmpty() {
  status.hidden = true;
  app.hidden = false;
  app.innerHTML = `
    <section class="state-message">
      <p>CONTINUITY FIXTURE</p>
      <h2>No continuity records are available.</h2>
      <p>The fixture loaded successfully, but it does not contain records to recover.</p>
    </section>`;
}

function renderSourceInfo(sourceInfo) {
  state.sourceInfo = sourceInfo;
  sourceLabel.textContent = sourceInfo.label;
  sourceDetail.textContent =
    sourceInfo.live && sourceInfo.fetchedAt
      ? `${sourceInfo.detail} \u00b7 Last fetched ${formatDate(sourceInfo.fetchedAt, true)}`
      : sourceInfo.detail;
  sourceLabel.classList.toggle("source-live", sourceInfo.live);
  railSource.textContent = sourceInfo.live
    ? "DataHub MCP \u00b7 read-only"
    : "Development fixture";
}

function renderError(error, mode) {
  status.hidden = true;
  app.hidden = false;
  if (mode === "datahub") {
    sourceLabel.textContent = "DataHub live read unavailable";
    sourceDetail.textContent = "Local bridge required";
    sourceLabel.classList.remove("source-live");
    railSource.textContent = "Live read unavailable";
    app.innerHTML = `
      <section class="state-message error-message live-error" role="alert">
        <p>DATAHUB LIVE READ UNAVAILABLE</p>
        <h2>DataHub live read is unavailable.</h2>
        <ol>
          <li>Start DataHub.</li>
          <li>Start the local read-only bridge.</li>
          <li>Reload this page.</li>
        </ol>
        <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
        <a class="fixture-mode-action" href="./reentry.html?source=fixture">Use fixture mode</a>
      </section>`;
    return;
  }
  const unsupportedSource = mode !== "fixture";
  app.innerHTML = `
    <section class="state-message error-message" role="alert">
      <p>${unsupportedSource ? "UNSUPPORTED CONTINUITY SOURCE" : "CONTEXT RECOVERY FAILED"}</p>
      <h2>${unsupportedSource ? "The requested continuity source is not supported." : "Unable to load the continuity fixture."}</h2>
      <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
      <p>Run this page through a local HTTP server, for example <code>python -m http.server 8000</code>.</p>
    </section>`;
}

async function initialize() {
  let mode = "fixture";
  try {
    const query = new URLSearchParams(window.location.search);
    mode = query.get("source") || "fixture";
    const bridgeUrl =
      query.get("bridge") || reportMain.dataset.continuityBridgeUrl;
    const provider = createContinuityProvider({ mode, bridgeUrl });
    const loaded = await provider.loadScenario();
    renderSourceInfo(loaded.sourceInfo);
    state.view = buildReentryViewModel(loaded.scenario);

    if (state.view.empty) {
      renderEmpty();
      return;
    }

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
