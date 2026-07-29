import { buildReentryViewModel } from "../../experience/continuity/reentry-view-model.mjs";

const app = document.querySelector("#reentry-app");
const status = document.querySelector("#reentry-status");
const reportDate = document.querySelector("#report-date");
const railName = document.querySelector("#rail-project-name");
const railStatus = document.querySelector("#rail-project-status");

const state = {
  view: null,
  selectedSignal: "stale",
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
        <li>
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
          <span>${escapeHtml(item.type)}</span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.relation)} · ${escapeHtml(item.source)}</small>
          </div>
        </li>`,
    )
    .join("")}</ol>`;
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
        <p>${escapeHtml(detail.affectedDecision)}</p>
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

  app.querySelector("[data-prototype-action]")?.addEventListener("click", (event) => {
    const feedback = event.currentTarget.parentElement.querySelector(
      ".prototype-feedback",
    );
    feedback.textContent =
      "Action prepared for the prototype. Runtime write-back is not enabled in v0.9.4.";
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

function renderError(error) {
  status.hidden = true;
  app.hidden = false;
  app.innerHTML = `
    <section class="state-message error-message" role="alert">
      <p>CONTEXT RECOVERY FAILED</p>
      <h2>Unable to load the continuity fixture.</h2>
      <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
      <p>Run this page through a local HTTP server, for example <code>python -m http.server 8000</code>.</p>
    </section>`;
}

async function initialize() {
  try {
    const response = await fetch("./continuity/scenarios/nexus-self-reentry.json");
    if (!response.ok) throw new Error(`Fixture request returned ${response.status}.`);
    const scenario = await response.json();
    state.view = buildReentryViewModel(scenario);

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
    renderError(error);
  }
}

initialize();
