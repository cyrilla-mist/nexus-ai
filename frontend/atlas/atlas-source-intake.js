const REVIEW_URL = new URL("../../examples/nexus-atlas-source-intake-review-browser-v0.1.json", import.meta.url);
const REVIEW_VERSION = "nexus-atlas.source-intake-review.v0.1";

const TERRITORIES = [
  { id: "innovation", label: "Innovation", detail: "Projects, products, experiments" },
  { id: "learning", label: "Learning", detail: "Skills, courses, practice" },
  { id: "research", label: "Research", detail: "Evidence, inquiry, synthesis" },
  { id: "creation", label: "Creation", detail: "Writing, design, publishing" },
  { id: "evaluation", label: "Evaluation", detail: "Review, standards, quality" },
];

const state = {
  review: null,
  selectedCandidateIds: new Set(),
  acceptedSelectedCandidateIds: new Set(),
  filter: "all",
  selectedCandidateId: null,
  inspectorOpen: false,
  selectionDirty: false,
};

const main = document.querySelector("#atlas-main");
const territoryNavigation = document.querySelector("#territory-navigation");
const sourceSummary = document.querySelector("#atlas-source-summary");
const activeRouteLabel = document.querySelector("#active-route-label");
const inspector = document.querySelector("#context-inspector");
const inspectorContent = document.querySelector("#inspector-content");
const inspectorTitle = document.querySelector("#inspector-title");
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
  if (Number.isNaN(date.getTime())) return "Unknown";
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

async function loadReview() {
  const response = await fetch(REVIEW_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Accepted Source Intake Review snapshot unavailable (${response.status}).`);
  const review = await response.json();
  if (review?.version !== REVIEW_VERSION) {
    throw new Error(`Unsupported Source Intake Review version: ${review?.version || "missing"}.`);
  }
  return deepFreeze(review);
}

function sameSelection(a, b) {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

function candidateById(candidateId) {
  return state.review?.candidates.find((candidate) => candidate.candidateId === candidateId) || null;
}

function decisionByCandidateId(candidateId) {
  return state.review?.admissionPreview?.decisions.find((decision) => decision.candidateId === candidateId) || null;
}

function dispositionLabel(disposition) {
  const labels = {
    insert: "Would add",
    noop: "Already aligned",
    conflict: "Conflict",
    deferred: "Deferred",
  };
  return labels[disposition] || "Not reconciled";
}

function reasonLabel(reason) {
  const labels = {
    "authorized-new-observation": "No matching canonical Evidence exists in the preview Graph.",
    "authorized-existing-identical": "An identical canonical Evidence record already exists.",
    "authorized-existing-conflict": "The preview Graph contains a different record at the same canonical identity.",
    "not-authorized": "This Candidate was not selected for the accepted preview.",
  };
  return labels[reason] || reason || "No reconciliation reason supplied.";
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
      <span>Source Intake</span><b>/</b>
      <strong>Review</strong>
    </nav>`;
}

function renderHeading() {
  return `
    <header class="view-heading">
      <div>
        <span class="eyebrow">SOURCE INTAKE / LOCAL REVIEW</span>
        <h1>Review before anything enters context.</h1>
        <p>Inspect accepted Candidate Evidence, adjust a temporary local selection, and compare it with the frozen admission preview. Nothing on this page connects, applies, or writes.</p>
      </div>
      <div class="view-heading-tools">
        <button type="button" class="inspector-open-control" data-open-inspector${state.inspectorOpen ? " hidden" : ""}>Open detail</button>
        <span class="route-stamp">REVIEW ONLY / V0.1</span>
      </div>
    </header>`;
}

function renderBoundaryStrip() {
  return `
    <section class="source-review-boundary" aria-label="Source intake boundaries">
      <strong>LOCAL REVIEW ONLY</strong>
      <span>No source connection</span>
      <span>No Apply</span>
      <span>No persistent write</span>
      <span>No Graph mutation</span>
      <span>No semantic promotion</span>
    </section>`;
}

function renderSourceCard() {
  const source = state.review.source;
  return `
    <section class="atlas-card source-review-source-card">
      <div>
        <span class="card-kicker">ACCEPTED SOURCE SNAPSHOT</span>
        <h2>${escapeHtml(source.provider)} · ${escapeHtml(source.scopeRef)}</h2>
        <p>This is bounded source metadata already present in the accepted review snapshot. The browser does not refresh or re-read the source.</p>
      </div>
      <dl class="source-review-metadata">
        <div><dt>CAPTURED</dt><dd>${escapeHtml(formatDateTime(source.capturedAt))}</dd></div>
        <div><dt>RETRIEVAL</dt><dd>${escapeHtml(source.retrievalMode)}</dd></div>
        <div><dt>AUTHORITY</dt><dd>${escapeHtml(source.authority)}</dd></div>
        <div><dt>RECORDS</dt><dd>${source.recordCount} source records</dd></div>
      </dl>
    </section>`;
}

function visibleCandidates() {
  const candidates = state.review.candidates;
  if (state.filter === "selected") return candidates.filter((candidate) => state.selectedCandidateIds.has(candidate.candidateId));
  if (state.filter === "deferred") return candidates.filter((candidate) => !state.selectedCandidateIds.has(candidate.candidateId));
  return candidates;
}

function renderFilterButton(value, label) {
  return `<button type="button" data-review-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`;
}

function renderCandidate(candidate) {
  const localSelected = state.selectedCandidateIds.has(candidate.candidateId);
  const acceptedSelected = state.acceptedSelectedCandidateIds.has(candidate.candidateId);
  const decision = decisionByCandidateId(candidate.candidateId);
  const disposition = state.review.admissionPreview.reconciliation === "admission-plan" ? decision?.disposition : null;

  return `
    <article class="candidate-review-card ${localSelected ? "is-selected" : "is-deferred"}" data-candidate-card="${escapeHtml(candidate.candidateId)}">
      <label class="candidate-selection-control">
        <input type="checkbox" data-candidate-selection="${escapeHtml(candidate.candidateId)}"${localSelected ? " checked" : ""}>
        <span aria-hidden="true"></span>
        <small>${localSelected ? "Selected" : "Deferred"}</small>
      </label>
      <div class="candidate-review-copy">
        <span class="card-kicker">${escapeHtml(candidate.canonicalKind)} · candidate evidence</span>
        <h3>${escapeHtml(candidate.title)}</h3>
        <p>${escapeHtml(candidate.summary)}</p>
        <div class="candidate-review-meta">
          <span>${escapeHtml(candidate.provenance.authority)}</span>
          <span>Accepted snapshot: ${acceptedSelected ? "selected" : "deferred"}</span>
          <span>No canonical write</span>
        </div>
      </div>
      <div class="candidate-review-side">
        ${disposition
          ? `<span class="preview-disposition" data-disposition="${escapeHtml(disposition)}">${escapeHtml(dispositionLabel(disposition))}</span>`
          : `<span class="preview-disposition" data-disposition="not-run">Not reconciled</span>`}
        <button type="button" class="candidate-detail-control" data-inspect-candidate="${escapeHtml(candidate.candidateId)}">Details</button>
      </div>
    </article>`;
}

function renderCandidateSection() {
  const candidates = visibleCandidates();
  const localSelectedCount = state.selectedCandidateIds.size;
  const localDeferredCount = state.review.candidates.length - localSelectedCount;

  return `
    <section class="workspace-section source-review-candidates">
      <div class="source-review-section-heading">
        <div>
          <span class="card-kicker">CANDIDATE EVIDENCE</span>
          <h2>Choose what you are reviewing locally</h2>
          <p>Selection is ephemeral browser state. It does not authorize Apply and it does not change the accepted preview snapshot.</p>
        </div>
        <div class="source-review-local-count">
          <strong>${localSelectedCount}</strong>
          <span>selected locally</span>
          <small>${localDeferredCount} deferred locally</small>
        </div>
      </div>
      <div class="source-review-filters" aria-label="Candidate filters">
        ${renderFilterButton("all", "All")}
        ${renderFilterButton("selected", "Selected")}
        ${renderFilterButton("deferred", "Deferred")}
      </div>
      ${state.selectionDirty ? `<p class="source-review-change-note">Local selection differs from the accepted snapshot. The canonical preview at right stays frozen and is not recalculated in this browser.</p>` : ""}
      <div class="candidate-review-list">
        ${candidates.length ? candidates.map(renderCandidate).join("") : `<p class="inspector-empty">No Candidates match this local filter.</p>`}
      </div>
    </section>`;
}

function renderDecision(decision) {
  const candidate = candidateById(decision.candidateId);
  return `
    <li class="preview-decision" data-disposition="${escapeHtml(decision.disposition)}">
      <span class="preview-disposition" data-disposition="${escapeHtml(decision.disposition)}">${escapeHtml(dispositionLabel(decision.disposition))}</span>
      <div>
        <strong>${escapeHtml(candidate?.title || decision.candidateId)}</strong>
        <p>${escapeHtml(reasonLabel(decision.reason))}</p>
      </div>
    </li>`;
}

function renderPreviewSection() {
  const preview = state.review.admissionPreview;
  const reconciled = preview.reconciliation === "admission-plan";

  return `
    <aside class="workspace-section source-review-preview" aria-label="Accepted admission preview">
      <span class="card-kicker">ACCEPTED CANONICAL PREVIEW</span>
      <h2>${reconciled ? "What the frozen preview found" : "Reconciliation was not run"}</h2>
      <p>${reconciled
        ? "These dispositions were copied from the accepted Canonical Admission Plan. They do not change when you adjust the temporary selection on the left."
        : "This accepted review contains no Graph reconciliation. The browser does not invent insert, noop, or conflict states."}</p>

      ${state.selectionDirty ? `<div class="preview-freeze-note"><strong>PREVIEW UNCHANGED</strong><span>Your local selection changed; this accepted preview remains the original snapshot.</span></div>` : ""}

      <dl class="source-review-preview-counts">
        <div><dt>ACCEPTED SELECTED</dt><dd>${preview.diagnostics.authorizedCount}</dd></div>
        <div><dt>DEFERRED</dt><dd>${preview.diagnostics.deferredCount}</dd></div>
        <div><dt>WOULD ADD</dt><dd>${preview.diagnostics.insertCount ?? "—"}</dd></div>
        <div><dt>ALREADY ALIGNED</dt><dd>${preview.diagnostics.noopCount ?? "—"}</dd></div>
        <div><dt>CONFLICT</dt><dd>${preview.diagnostics.conflictCount ?? "—"}</dd></div>
      </dl>

      ${reconciled
        ? `<ol class="preview-decision-list">${preview.decisions.map(renderDecision).join("")}</ol>`
        : `<p class="inspector-empty">No per-Candidate reconciliation decisions are present in this snapshot.</p>`}

      <div class="source-review-safety-note">
        <strong>Nothing can be applied here.</strong>
        <p><code>applyAllowed</code> is false. This surface has no persistent write, Graph mutation, Edge creation, or semantic-promotion capability.</p>
      </div>
    </aside>`;
}

function renderReview() {
  return `
    ${renderHeading()}
    ${renderBoundaryStrip()}
    ${renderSourceCard()}
    <div class="source-review-grid">
      ${renderCandidateSection()}
      ${renderPreviewSection()}
    </div>`;
}

function renderSourceHealth() {
  const review = state.review;
  sourceSummary.innerHTML = `
    <span class="source-primary"><span class="source-name">ACCEPTED SOURCE INTAKE · REVIEW ONLY</span><span class="source-state">LOCAL</span></span>
    <span class="source-detail">Frozen review snapshot. No live source connection or refresh.</span>
    <span class="source-count">${review.candidates.length} Candidates · ${review.selection.selectedCandidateIds.length} accepted selected</span>`;
}

function renderInspector(candidateId, open = true) {
  state.selectedCandidateId = candidateId;
  state.inspectorOpen = open;

  if (state.inspectorOpen) inspector.classList.remove("is-closed");
  else inspector.classList.add("is-closed");
  main.dataset.inspectorOpen = String(state.inspectorOpen);
  const openControl = main.querySelector("[data-open-inspector]");
  if (openControl) openControl.hidden = state.inspectorOpen;
  inspectorTitle.textContent = "SOURCE REVIEW DETAIL";

  const candidate = candidateById(candidateId);
  if (!candidate) {
    inspectorContent.innerHTML = `<p class="inspector-empty">This Candidate is not present in the accepted Source Intake Review snapshot. No raw Snapshot, Import Plan, or Graph fallback was attempted.</p>`;
    return;
  }

  const decision = decisionByCandidateId(candidateId);
  const sensitivity = candidate.privacy.sensitivity === null ? "Not supplied upstream" : candidate.privacy.sensitivity;
  const localState = state.selectedCandidateIds.has(candidateId) ? "selected" : "deferred";

  inspectorContent.innerHTML = `
    <section class="inspector-panel">
      <span class="inspector-kicker">CANDIDATE EVIDENCE · REVIEW ONLY</span>
      <h2>${escapeHtml(candidate.title)}</h2>
      <span class="inspector-status">${escapeHtml(localState)} locally · ${escapeHtml(candidate.selectionState)} in accepted snapshot</span>
      <p>${escapeHtml(candidate.summary)}</p>
      <dl class="inspector-data">
        <div><dt>SOURCE RECORD</dt><dd>${escapeHtml(candidate.sourceRecordId)}</dd></div>
        <div><dt>PROVIDER</dt><dd>${escapeHtml(candidate.provenance.provider)}</dd></div>
        <div><dt>REFERENCE</dt><dd>${escapeHtml(candidate.provenance.reference)}</dd></div>
        <div><dt>CAPTURED</dt><dd>${escapeHtml(formatDateTime(candidate.provenance.capturedAt))}</dd></div>
        <div><dt>AUTHORITY</dt><dd>${escapeHtml(candidate.provenance.authority)}</dd></div>
        <div><dt>SENSITIVITY</dt><dd>${escapeHtml(sensitivity)}</dd></div>
        <div><dt>PAYLOAD</dt><dd>${candidate.privacy.payloadOmitted ? "Omitted upstream" : "Available"}</dd></div>
        <div><dt>CANONICAL WRITE</dt><dd>${candidate.admission.canonicalWriteAllowed ? "Allowed" : "Not allowed"}</dd></div>
      </dl>
      ${decision && state.review.admissionPreview.reconciliation === "admission-plan" ? `
        <span class="inspector-kicker">ACCEPTED PREVIEW</span>
        <div class="preview-freeze-note">
          <strong>${escapeHtml(dispositionLabel(decision.disposition))}</strong>
          <span>${escapeHtml(reasonLabel(decision.reason))}</span>
        </div>` : `
        <p class="inspector-empty">Graph reconciliation was not run in the accepted review snapshot.</p>`}
      <p class="inspector-empty">This detail view reads only fields already present in the accepted browser review snapshot.</p>
    </section>`;
}

function renderActionTray() {
  trayActions.innerHTML = `
    <button type="button" class="tray-primary" data-atlas-route="desk">Back to Desk</button>
    <button type="button" data-review-filter="selected">Show selected</button>
    <button type="button" data-review-filter="deferred">Show deferred</button>
    <button type="button" data-atlas-route="reentry">Historical Re-entry</button>`;
  trayCurrentView.textContent = "SOURCE INTAKE";
}

function renderRoute() {
  document.body.className = "atlas-route route-source-intake product-surface-source-intake";
  document.querySelectorAll("[data-atlas-route]").forEach((control) => {
    if (control.closest(".atlas-primary-nav")) {
      control.setAttribute("aria-current", control.dataset.atlasRoute === "source-intake" ? "page" : "false");
    }
  });
  activeRouteLabel.innerHTML = "<span>Innovation</span><span>Nexus Atlas</span><span>Source Intake</span>";
  main.innerHTML = `${renderContextPath()}${renderReview()}`;
  main.dataset.inspectorOpen = String(state.inspectorOpen);
  main.focus({ preventScroll: true });
  renderInspector(state.selectedCandidateId, state.inspectorOpen);
  renderActionTray();
}

function applyFilter(filter) {
  state.filter = new Set(["all", "selected", "deferred"]).has(filter) ? filter : "all";
  renderRoute();
  announcement.textContent = `Source Intake filter: ${state.filter}.`;
}

document.addEventListener("click", (event) => {
  const routeControl = event.target.closest("[data-atlas-route]");
  if (routeControl) {
    event.preventDefault();
    const route = routeControl.dataset.atlasRoute;
    if (route !== "source-intake") replaceRoute(route);
    return;
  }

  const territoryControl = event.target.closest("[data-territory]");
  if (territoryControl) {
    const territory = TERRITORIES.find((item) => item.id === territoryControl.dataset.territory);
    announcement.textContent = territory?.id === "innovation"
      ? "Source Intake Review is currently scoped to the Innovation project context."
      : `${territory?.label || "Territory"} is not connected to this accepted review snapshot.`;
    return;
  }

  const filterControl = event.target.closest("[data-review-filter]");
  if (filterControl) {
    applyFilter(filterControl.dataset.reviewFilter);
    return;
  }

  const inspectControl = event.target.closest("[data-inspect-candidate]");
  if (inspectControl) {
    renderInspector(inspectControl.dataset.inspectCandidate, true);
    return;
  }

  if (event.target.closest("[data-open-inspector]")) {
    renderInspector(state.selectedCandidateId, true);
    return;
  }

  if (event.target.closest("[data-close-inspector]")) {
    state.inspectorOpen = false;
    inspector.classList.add("is-closed");
    main.dataset.inspectorOpen = "false";
    const openControl = main.querySelector("[data-open-inspector]");
    if (openControl) openControl.hidden = false;
  }
});

document.addEventListener("change", (event) => {
  const control = event.target.closest?.("[data-candidate-selection]");
  if (!control) return;
  const candidateId = control.dataset.candidateSelection;
  if (!candidateById(candidateId)) return;
  const checked = control.checked;

  if (checked) state.selectedCandidateIds.add(candidateId);
  else state.selectedCandidateIds.delete(candidateId);

  state.selectionDirty = !sameSelection(state.selectedCandidateIds, state.acceptedSelectedCandidateIds);
  state.selectedCandidateId = candidateId;
  renderRoute();
  announcement.textContent = `${candidateById(candidateId)?.title || "Candidate"} is ${checked ? "selected" : "deferred"} in local review state. Accepted canonical preview unchanged.`;
});

window.addEventListener("hashchange", () => {
  const route = window.location.hash.replace("#", "") || "desk";
  if (route !== "source-intake") window.location.reload();
});

try {
  state.review = await loadReview();
  state.acceptedSelectedCandidateIds = new Set(state.review.selection.selectedCandidateIds);
  state.selectedCandidateIds = new Set(state.review.selection.selectedCandidateIds);
  state.selectedCandidateId = state.review.candidates[0]?.candidateId || null;
  renderTerritoryNavigation();
  renderSourceHealth();
  renderRoute();
  announcement.textContent = "Source Intake Review opened. Review only; nothing can be applied.";
} catch (error) {
  console.error(error);
  renderTerritoryNavigation();
  sourceSummary.innerHTML = `<span class="source-primary"><span class="source-name">SOURCE INTAKE REVIEW</span><span class="source-state">UNAVAILABLE</span></span><span class="source-detail">Accepted browser review snapshot could not be opened.</span>`;
  activeRouteLabel.innerHTML = "<span>Innovation</span><span>Nexus Atlas</span><span>Source Intake</span>";
  main.innerHTML = `
    ${renderContextPath()}
    <header class="view-heading"><div><span class="eyebrow">REVIEW SNAPSHOT ERROR</span><h1>Source Intake Review could not open</h1><p>No source fallback, source refresh, or raw artifact access was attempted.</p></div><span class="route-stamp">ERROR / REVIEW ONLY</span></header>
    <section class="atlas-card"><p>${escapeHtml(error.message)}</p></section>`;
}
