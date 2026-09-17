import { loadContinuityLiveSurfaceIfRequested } from "./atlas-continuity-live-read.js";

const CONTINUITY_URL = new URL("../../examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json", import.meta.url);
const CONTINUITY_VERSION = "nexus-atlas.continuity-product-surface.v0.1";

const TERRITORIES = [
  { id: "innovation", label: "Innovation", detail: "Projects, products, experiments" },
  { id: "learning", label: "Learning", detail: "Skills, courses, practice" },
  { id: "research", label: "Research", detail: "Evidence, inquiry, synthesis" },
  { id: "creation", label: "Creation", detail: "Writing, design, publishing" },
  { id: "evaluation", label: "Evaluation", detail: "Review, standards, quality" },
];

const main = document.querySelector("#atlas-main");
const territoryNavigation = document.querySelector("#territory-navigation");
const sourceSummary = document.querySelector("#atlas-source-summary");
const activeRouteLabel = document.querySelector("#active-route-label");
const inspector = document.querySelector("#context-inspector");
const trayActions = document.querySelector("#tray-actions");
const trayCurrentView = document.querySelector("#tray-current-view");
const announcement = document.querySelector("#atlas-announcement");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).toUpperCase();
}

function replaceRoute(route) {
  const target = new URL(window.location.href);
  target.hash = route;
  window.location.replace(target);
}

function assertBrowserSnapshot(value) {
  if (!value || value.version !== CONTINUITY_VERSION) {
    throw new Error(`Unsupported Continuity Product Surface version: ${value?.version || "missing"}.`);
  }
  if (value.projectRef !== "project:nexus-atlas") {
    throw new Error("Continuity Product Surface is outside the accepted Nexus Atlas project scope.");
  }
  if (
    value.capabilities?.readOnly !== true
    || value.capabilities?.writeAllowed !== false
    || value.capabilities?.deleteAllowed !== false
    || value.capabilities?.productionProvisioningAllowed !== false
    || value.capabilities?.canonicalContextWriteAllowed !== false
    || value.capabilities?.autonomousExecutionAllowed !== false
    || value.capabilities?.humanAuthorityDecisionAllowed !== false
  ) {
    throw new Error("Continuity Product Surface exceeds the accepted read-only browser boundary.");
  }
  return deepFreeze(value);
}

async function loadContinuitySnapshot() {
  const liveRead = await loadContinuityLiveSurfaceIfRequested();
  if (liveRead) return liveRead;

  const response = await fetch(CONTINUITY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Accepted Continuity snapshot unavailable (${response.status}).`);
  return {
    surface: assertBrowserSnapshot(await response.json()),
    sourceInfo: deepFreeze({
      mode: "static",
      label: "ACCEPTED STATIC SNAPSHOT",
      fetchedAt: null,
      readOnly: true,
      mutationEnabled: false,
    }),
  };
}

function continuityTone(validity) {
  if (validity === "VALID") return "valid";
  if (validity === "INVALID") return "warning";
  return "attention";
}

function outcomeTone(state) {
  if (state === "verified") return "valid";
  if (state === "failed") return "warning";
  return "attention";
}

function renderTerritoryNavigation() {
  territoryNavigation.innerHTML = TERRITORIES.map(
    (territory, index) => `
      <button class="territory-button" type="button" data-territory="${territory.id}"
        aria-current="${territory.id === "innovation"}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${territory.label}</strong><small>${territory.detail}</small></span>
      </button>`,
  ).join("");
}

function renderContextPath() {
  return `
    <nav class="atlas-context-path" aria-label="Current context path">
      <span>Nexus Atlas</span><b>/</b>
      <span>Innovation</span><b>/</b>
      <span>Continuity</span><b>/</b>
      <strong>Resume state</strong>
    </nav>`;
}

function renderHeading(surface, sourceInfo) {
  const validity = surface.continuity.validity;
  const sourceLabel = sourceInfo.mode === "live" ? "VALIDATED LOOPBACK LIVE READ" : "ACCEPTED STATIC SNAPSHOT";
  return `
    <header class="view-heading continuity-heading">
      <div>
        <span class="eyebrow">CONTINUITY / ${sourceLabel}</span>
        <h1>Resume without reconstructing the project.</h1>
        <p>This desk shows the accepted continuity projection for Nexus Atlas: what is trusted, what was verified, and whether human authority is currently required. It does not write or execute. Live mode accepts only the same bounded Product Surface schema over an allow-listed loopback read.</p>
      </div>
      <div class="view-heading-tools">
        <span class="continuity-status-pill" data-tone="${continuityTone(validity)}">${escapeHtml(validity)}</span>
        <span class="route-stamp">READ ONLY / V0.1</span>
      </div>
    </header>`;
}

function renderBoundaryStrip(surface, sourceInfo) {
  const authority = surface.continuity.humanAuthorityRequired ? "Human decision required" : "No human decision pending";
  const sourceLabel = sourceInfo.mode === "live" ? "VALIDATED LOOPBACK LIVE READ" : "ACCEPTED STATIC SNAPSHOT";
  return `
    <section class="continuity-boundary" aria-label="Continuity browser boundary">
      <strong>${sourceLabel}</strong>
      <span>${escapeHtml(authority)}</span>
      <span>No external execution</span>
      <span>No checkpoint write</span>
      <span>No deletion</span>
      <span>No canonical mutation</span>
    </section>`;
}

function renderSignalStrip(surface) {
  const outcome = surface.latestOutcome;
  const verificationState = outcome?.verificationState || "none";
  const checkpointVersion = surface.trustedCheckpoint.version;
  const historyCount = surface.history.outcomes.count + surface.history.checkpoints.count;
  return `
    <section class="continuity-signal-grid" aria-label="Continuity state summary">
      <article class="continuity-signal" data-tone="${continuityTone(surface.continuity.validity)}">
        <small>CONTINUITY</small>
        <strong>${escapeHtml(surface.continuity.validity)}</strong>
        <span>${surface.continuity.humanAuthorityRequired ? "Human authority required" : "Trusted state aligned"}</span>
      </article>
      <article class="continuity-signal" data-tone="${outcomeTone(verificationState)}">
        <small>LATEST OUTCOME</small>
        <strong>${escapeHtml(verificationState.toUpperCase())}</strong>
        <span>${outcome ? formatDateTime(outcome.recordedAt) : "No Outcome in snapshot"}</span>
      </article>
      <article class="continuity-signal">
        <small>TRUSTED CHECKPOINT</small>
        <strong>V${checkpointVersion}</strong>
        <span>${escapeHtml(surface.trustedCheckpoint.confirmationAuthority)}</span>
      </article>
      <article class="continuity-signal">
        <small>BOUNDED HISTORY</small>
        <strong>${historyCount}</strong>
        <span>${surface.history.outcomes.count} Outcome · ${surface.history.checkpoints.count} Checkpoint</span>
      </article>
    </section>`;
}

function renderResumeCard(surface) {
  return `
    <section class="workspace-section continuity-resume-card">
      <span class="card-kicker">RESUME STATE</span>
      <h2>${escapeHtml(surface.resumeState.activeObjective)}</h2>
      <p class="continuity-direction">${escapeHtml(surface.resumeState.trustedDirection)}</p>
      <div class="continuity-next-action">
        <small>ACCEPTED NEXT ACTION</small>
        <strong>${escapeHtml(surface.resumeState.nextActionSummary)}</strong>
        <code>${escapeHtml(surface.resumeState.nextActionRef)}</code>
      </div>
      <p class="continuity-footnote">This action is copied from the accepted Trusted Checkpoint. The browser did not generate or authorize a replacement action.</p>
    </section>`;
}

function renderOutcomeCard(surface) {
  const outcome = surface.latestOutcome;
  if (!outcome) {
    return `
      <section class="workspace-section continuity-outcome-card">
        <span class="card-kicker">LATEST OUTCOME</span>
        <h2>No accepted Outcome in this snapshot.</h2>
        <p>The browser does not infer success from execution attempts or provider reports.</p>
      </section>`;
  }
  return `
    <section class="workspace-section continuity-outcome-card" data-tone="${outcomeTone(outcome.verificationState)}">
      <span class="card-kicker">LATEST VERIFIED RESULT</span>
      <div class="continuity-card-heading">
        <h2>${escapeHtml(outcome.verificationState)}</h2>
        <span>${escapeHtml(formatDateTime(outcome.recordedAt))}</span>
      </div>
      <dl class="continuity-data-list">
        <div><dt>ACTION</dt><dd>${escapeHtml(outcome.actionRef)}</dd></div>
        <div><dt>OUTCOME</dt><dd>${escapeHtml(outcome.outcomeRef)}</dd></div>
        <div><dt>FAILURE REASON</dt><dd>${outcome.failureReason ? escapeHtml(outcome.failureReason) : "—"}</dd></div>
      </dl>
      <p class="continuity-footnote">Outcome state is copied from accepted post-action verification. This view does not inspect raw execution or provider payloads.</p>
    </section>`;
}

function renderCheckpointCard(surface) {
  const checkpoint = surface.trustedCheckpoint;
  return `
    <section class="workspace-section continuity-checkpoint-card">
      <span class="card-kicker">TRUSTED CHECKPOINT</span>
      <div class="continuity-card-heading">
        <h2>Checkpoint v${checkpoint.version}</h2>
        <span>${escapeHtml(formatDateTime(checkpoint.createdAt))}</span>
      </div>
      <dl class="continuity-data-list">
        <div><dt>CONFIRMATION</dt><dd>${escapeHtml(checkpoint.confirmationAuthority)}</dd></div>
        <div><dt>EVIDENCE PROVIDER</dt><dd>${escapeHtml(checkpoint.evidenceCursor.provider)}</dd></div>
        <div><dt>SCOPE</dt><dd>${escapeHtml(checkpoint.evidenceCursor.scopeRef)}</dd></div>
        <div><dt>CURSOR</dt><dd>${escapeHtml(checkpoint.evidenceCursor.cursorType)}</dd></div>
        <div><dt>CAPTURED</dt><dd>${escapeHtml(formatDateTime(checkpoint.evidenceCursor.capturedAt))}</dd></div>
      </dl>
    </section>`;
}

function renderHistoryList(records, kind) {
  if (!records.length) return `<p class="continuity-empty">No ${kind} records in the accepted bounded page.</p>`;
  return `<ol class="continuity-history-list">${records.map((record) => {
    if (kind === "Outcome") {
      return `<li><span class="history-state" data-tone="${outcomeTone(record.verificationState)}">${escapeHtml(record.verificationState)}</span><div><strong>${escapeHtml(record.actionRef)}</strong><small>${escapeHtml(formatDateTime(record.recordedAt))}</small></div></li>`;
    }
    return `<li><span class="history-state">v${record.version}</span><div><strong>${escapeHtml(record.nextActionRef)}</strong><small>${escapeHtml(formatDateTime(record.createdAt))}</small></div></li>`;
  }).join("")}</ol>`;
}

function renderHistory(surface) {
  return `
    <section class="workspace-section continuity-history-card is-wide">
      <div class="continuity-section-heading">
        <div>
          <span class="card-kicker">BOUNDED HISTORY</span>
          <h2>What Nexus is allowed to remember here</h2>
          <p>This is the accepted summary layer from write-back history. Full Outcome and Checkpoint artifacts stay outside the browser surface.</p>
        </div>
        <span class="continuity-count">${surface.history.outcomes.count + surface.history.checkpoints.count} records</span>
      </div>
      <div class="continuity-history-grid">
        <div>
          <h3>Outcomes</h3>
          ${renderHistoryList(surface.history.outcomes.records, "Outcome")}
        </div>
        <div>
          <h3>Trusted Checkpoints</h3>
          ${renderHistoryList(surface.history.checkpoints.records, "Checkpoint")}
        </div>
      </div>
    </section>`;
}

function renderSafety(surface) {
  const safety = surface.writebackSafety;
  return `
    <section class="workspace-section continuity-safety-card">
      <span class="card-kicker">WRITE-BACK SAFETY</span>
      <h2>Persistence is visible, not controllable.</h2>
      <dl class="continuity-data-list">
        <div><dt>TRANSPORT</dt><dd>${escapeHtml(safety.providerKind)}</dd></div>
        <div><dt>DURABILITY</dt><dd>${escapeHtml(safety.durability)}</dd></div>
        <div><dt>RETENTION</dt><dd>${escapeHtml(safety.retentionMode)}</dd></div>
        <div><dt>VERIFIED OUTCOME REQUIRED</dt><dd>${safety.requireVerifiedOutcomeForCheckpointAdvance ? "YES" : "NO"}</dd></div>
        <div><dt>EXACT READ-AFTER-WRITE</dt><dd>${safety.requireExactReadAfterWrite ? "YES" : "NO"}</dd></div>
        <div><dt>DELETION ALLOWED</dt><dd>${safety.deletionAllowed ? "YES" : "NO"}</dd></div>
      </dl>
    </section>`;
}

function renderVerification(surface) {
  const verification = surface.verification;
  return `
    <section class="workspace-section continuity-verification-card">
      <span class="card-kicker">CROSS-SOURCE VERIFICATION</span>
      <h2>${verification.total ? `${verification.total} accepted checks` : "No cross-source checks in this snapshot."}</h2>
      <div class="continuity-verification-counts">
        <div><strong>${verification.states.verified}</strong><span>verified</span></div>
        <div><strong>${verification.states.failed}</strong><span>failed</span></div>
        <div><strong>${verification.states.indeterminate}</strong><span>indeterminate</span></div>
      </div>
      <p>Cross-source verification remains evidence about a postcondition. This browser cannot turn it into a durable Outcome or advance a checkpoint.</p>
    </section>`;
}

function renderContinuity(surface, sourceInfo) {
  return `
    ${renderContextPath()}
    ${renderHeading(surface, sourceInfo)}
    ${renderBoundaryStrip(surface, sourceInfo)}
    ${renderSignalStrip(surface)}
    <div class="continuity-grid">
      ${renderResumeCard(surface)}
      ${renderOutcomeCard(surface)}
      ${renderCheckpointCard(surface)}
      ${renderSafety(surface)}
      ${renderVerification(surface)}
      ${renderHistory(surface)}
    </div>`;
}

function renderSourceHealth(surface, sourceInfo) {
  const live = sourceInfo.mode === "live";
  sourceSummary.innerHTML = `
    <span class="source-primary"><span class="source-name">CONTINUITY ${live ? "LIVE READ" : "SNAPSHOT"}</span><span class="source-state">${live ? "LIVE" : "STATIC"}</span></span>
    <span class="source-detail">${live ? "Validated loopback Product Surface · read-only · no raw store access" : "Accepted read-only browser projection · no live store connection"}</span>
    <span class="source-count">${escapeHtml(surface.continuity.validity)} · ${escapeHtml(surface.latestOutcome?.verificationState || "no outcome")}</span>`;
}

function installRouteNavigation() {
  document.querySelectorAll("[data-atlas-route]").forEach((control) => {
    const route = control.dataset.atlasRoute;
    control.setAttribute("aria-current", route === "continuity" ? "page" : "false");
    control.addEventListener("click", (event) => {
      event.preventDefault();
      if (route && route !== "continuity") replaceRoute(route);
    });
  });
}

function renderTray() {
  trayCurrentView.textContent = "CONTINUITY";
  trayActions.innerHTML = `
    <button type="button" data-tray-route="desk">Open Desk</button>
    <button type="button" data-tray-route="source-intake">Review Sources</button>`;
  trayActions.querySelectorAll("[data-tray-route]").forEach((button) => {
    button.addEventListener("click", () => replaceRoute(button.dataset.trayRoute));
  });
}

function renderUnavailable(error) {
  main.innerHTML = `
    <section class="continuity-unavailable" role="alert">
      <span class="eyebrow">CONTINUITY / UNAVAILABLE</span>
      <h1>The accepted continuity source could not be opened.</h1>
      <p>${escapeHtml(error?.message || "Unknown continuity source error.")}</p>
      <p>No fallback source was used. Legacy Re-entry and external providers were not queried.</p>
    </section>`;
  sourceSummary.innerHTML = `
    <span class="source-primary"><span class="source-name">CONTINUITY SOURCE</span><span class="source-state">UNAVAILABLE</span></span>
    <span class="source-detail">No silent fallback attempted</span>`;
}

async function start() {
  installRouteNavigation();
  renderTerritoryNavigation();
  activeRouteLabel.textContent = "Innovation / Nexus Atlas / Continuity";
  inspector.classList.add("is-closed");
  main.dataset.inspectorOpen = "false";
  renderTray();

  try {
    const { surface, sourceInfo } = await loadContinuitySnapshot();
    renderSourceHealth(surface, sourceInfo);
    main.innerHTML = renderContinuity(surface, sourceInfo);
    announcement.textContent = `Continuity Desk opened from ${sourceInfo.mode} source. ${surface.continuity.validity} continuity, ${surface.latestOutcome?.verificationState || "no"} latest Outcome.`;
  } catch (error) {
    renderUnavailable(error);
    announcement.textContent = "Continuity Desk unavailable. No fallback source was used.";
  }
}

start();
