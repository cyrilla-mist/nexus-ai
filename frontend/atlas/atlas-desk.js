const PRODUCT_SURFACE_URL = new URL("../../examples/nexus-atlas-product-surface-phase5-v0.1.json", import.meta.url);
const PRODUCT_SURFACE_VERSION = "nexus-atlas.product-surface.v0.1";

const TERRITORIES = [
  { id: "innovation", label: "Innovation", status: "Active", detail: "Projects, products, experiments" },
  { id: "learning", label: "Learning", status: "Structure defined", detail: "Skills, courses, practice" },
  { id: "research", label: "Research", status: "Structure defined", detail: "Evidence, inquiry, synthesis" },
  { id: "creation", label: "Creation", status: "Structure defined", detail: "Writing, design, publishing" },
  { id: "evaluation", label: "Evaluation", status: "Structure defined", detail: "Review, standards, quality" },
];

const state = {
  surface: null,
  selectedEntityId: "project:nexus-atlas",
  inspectorOpen: false,
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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date).toUpperCase();
}

function replaceRoute(route) {
  const target = new URL(window.location.href);
  target.hash = route;
  window.location.replace(target);
}

async function loadProductSurface() {
  const response = await fetch(PRODUCT_SURFACE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Product Surface snapshot unavailable (${response.status}).`);
  const surface = await response.json();
  if (surface?.version !== PRODUCT_SURFACE_VERSION) {
    throw new Error(`Unsupported Product Surface version: ${surface?.version || "missing"}.`);
  }
  if (surface?.scope?.projectId !== "project:nexus-atlas" || surface?.scope?.view !== "desk") {
    throw new Error("Product Surface snapshot does not describe the accepted Nexus Self-Context Desk scope.");
  }
  return surface;
}

function inspectorDescriptorById(id) {
  const matches = state.surface?.inspectorIndex?.filter((descriptor) => descriptor.id === id) || [];
  return matches.length === 1 ? matches[0] : null;
}

function recordsForInspectorSection(section) {
  const surface = state.surface;
  if (!surface) return null;
  const sections = {
    project: [{ ...surface.project, kind: "project", governance: null, relatedIds: [] }],
    identity: surface.identity,
    "decisions.effective": surface.decisions.effective,
    "decisions.proposed": surface.decisions.proposed,
    "decisions.historical": surface.decisions.historical,
    "memories.confirmed": surface.memories.confirmed,
    "memories.inferred": surface.memories.inferred,
    "memories.disputed": surface.memories.disputed,
    "memories.historical": surface.memories.historical,
    "evidence.current": surface.evidence.current,
    "evidence.stale": surface.evidence.stale,
    "evidence.disputed": surface.evidence.disputed,
    risks: surface.risks,
    actions: surface.actions,
  };
  return Object.hasOwn(sections, section) ? sections[section] : null;
}

function surfaceRecordById(id) {
  const descriptor = inspectorDescriptorById(id);
  if (!descriptor) return null;
  const records = recordsForInspectorSection(descriptor.section);
  if (!records) return null;
  const matches = records.filter((record) => record.id === descriptor.id);
  if (matches.length !== 1) return null;
  const [record] = matches;
  if (record.kind !== descriptor.kind) return null;
  return record;
}

function sectionRecords(key) {
  const surface = state.surface;
  const sections = {
    decisions: surface?.decisions?.effective || [],
    evidence: surface?.evidence?.current || [],
    risks: surface?.risks || [],
    actions: surface?.actions || [],
    memories: surface?.memories?.confirmed || [],
    identity: surface?.identity || [],
  };
  return sections[key] || [];
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
      <span>Self-Context</span><b>/</b>
      <strong>Desk</strong>
    </nav>`;
}

function renderViewHeading() {
  return `
    <header class="view-heading">
      <div>
        <span class="eyebrow">NEXUS SELF-CONTEXT / INNOVATION</span>
        <h1>Atlas Desk</h1>
        <p>A read-only working index of the current project context, decisions, evidence, risks, and next actions.</p>
      </div>
      <div class="view-heading-tools">
        <button type="button" class="inspector-open-control" data-open-inspector${state.inspectorOpen ? " hidden" : ""}>Open inspector</button>
        <span class="route-stamp">PRODUCT SURFACE / V0.1</span>
      </div>
    </header>`;
}

function renderSignalButton(key, label, count, tone, detail) {
  return `
    <button class="signal-value" type="button" data-open-surface="${key}" data-tone="${tone}">
      <small>${escapeHtml(label)}</small>
      <strong>${String(count).padStart(2, "0")}</strong>
      <span>${escapeHtml(detail)}</span>
    </button>`;
}

function renderRecordButton(record, label) {
  return `
    <button type="button" data-inspect-entity="${escapeHtml(record.id)}">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(record.title)}</strong>
      <em>${escapeHtml(record.state?.verification || "record")}</em>
    </button>`;
}

function renderDesk() {
  const surface = state.surface;
  const project = surface.project;
  const totalRecords = surface.inspectorIndex.length;
  const identities = surface.identity;
  const confirmedIdentities = identities.filter((record) => record.state?.verification === "confirmed");
  const inferredIdentities = identities.filter((record) => record.state?.verification === "inferred");
  const decisions = surface.decisions.effective;
  const memories = surface.memories.confirmed;
  const evidence = surface.evidence.current;
  const risks = surface.risks;
  const actions = surface.actions;

  return `
    ${renderViewHeading()}

    <div class="desk-grid">
      <section class="atlas-card reentry-card">
        <span class="card-kicker">CURRENT SELF-CONTEXT · INNOVATION</span>
        <h2>${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(project.summary)}</p>
        <dl class="project-metadata">
          <div><dt>LAST ACTIVE</dt><dd>${formatDate(project.lastActiveAt)}</dd></div>
          <div><dt>CURRENT VERSION</dt><dd>${escapeHtml(project.currentVersion)}</dd></div>
          <div><dt>PHASE</dt><dd>${escapeHtml(project.currentPhase)}</dd></div>
          <div><dt>PROJECTED RECORDS</dt><dd>${totalRecords} records</dd></div>
        </dl>
        <div class="inline-actions">
          <button type="button" data-inspect-entity="project:nexus-atlas">Inspect project context</button>
          <button type="button" class="secondary" data-open-surface="actions">Review next actions</button>
        </div>
      </section>

      <section class="atlas-card">
        <span class="card-kicker">CONTEXT MODEL</span>
        <h2>One context, explicit states</h2>
        <p>The Desk reads Product Surface v0.1. It preserves verification, freshness, provenance, and governance without creating new canonical truth.</p>
        <div class="territory-summary-list">
          <div class="territory-summary"><span>01</span><div><strong>Identity</strong><small>Accepted identity records</small></div><em>${surface.identity.length}</em></div>
          <div class="territory-summary"><span>02</span><div><strong>Memory</strong><small>Confirmed continuity records</small></div><em>${memories.length}</em></div>
          <div class="territory-summary"><span>03</span><div><strong>Evidence</strong><small>Current accepted support</small></div><em>${evidence.length}</em></div>
          <div class="territory-summary"><span>04</span><div><strong>Sources</strong><small>Bounded projected providers</small></div><em>${surface.sourceSummary.length}</em></div>
        </div>
      </section>
    </div>

    <section class="signal-grid" aria-label="Current Product Surface signals">
      ${renderSignalButton("decisions", "Effective decisions", decisions.length, "valid", "Confirmed governed decisions in force")}
      ${renderSignalButton("evidence", "Current evidence", evidence.length, "valid", "Accepted current support for this project")}
      ${renderSignalButton("risks", "Open context risks", risks.length, "warning", "Known context integrity issues")}
      ${renderSignalButton("actions", "Next actions", actions.length, "attention", "Read-only actions ready for review")}
    </section>

    <div class="workspace-grid">
      <section class="workspace-section is-wide">
        <span class="card-kicker">IDENTITY CONTEXT</span>
        <h2>Who has authority in this project</h2>
        <p>Identity records come only from accepted upstream context. Inferred identity, when present, remains explicitly inferred and is never presented as user-confirmed truth.</p>
        <div class="finding-list">
          ${identities.map((record) => renderRecordButton(record, record.state?.verification === "confirmed" ? "CONFIRMED IDENTITY" : "INFERRED IDENTITY")).join("")}
        </div>
        <p class="inspector-empty">${confirmedIdentities.length} confirmed · ${inferredIdentities.length} inferred · no identity capture or promotion occurs in this Desk.</p>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">DECISION CONTEXT</span>
        <h2>What remains effective</h2>
        <div class="finding-list">
          ${decisions.map((record) => renderRecordButton(record, "CONFIRMED")).join("")}
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">CONTINUITY MEMORY</span>
        <h2>What the project carries forward</h2>
        <div class="finding-list">
          ${memories.map((record) => renderRecordButton(record, "CONFIRMED")).join("")}
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">EVIDENCE</span>
        <h2>What supports the current surface</h2>
        <div class="finding-list">
          ${evidence.map((record) => renderRecordButton(record, "CURRENT")).join("")}
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">CONTEXT HEALTH</span>
        <h2>What needs attention</h2>
        <div class="finding-list">
          ${risks.map((record) => renderRecordButton(record, "RISK")).join("")}
        </div>
      </section>

      <section class="workspace-section is-wide">
        <span class="card-kicker">NEXT ACTIONS</span>
        <h2>What can continue next</h2>
        <div class="finding-list">
          ${actions.map((record) => renderRecordButton(record, record.actionStatus || "ACTION")).join("")}
        </div>
        <p class="inspector-empty">Actions are surfaced for review only. This Desk does not perform persistent canonical writes or external mutations.</p>
      </section>
    </div>`;
}

function renderSourceHealth() {
  const surface = state.surface;
  const recordCount = surface.inspectorIndex.length;
  const providerCount = surface.sourceSummary.length;
  sourceSummary.innerHTML = `
    <span class="source-primary"><span class="source-name">ACCEPTED PRODUCT SURFACE · READ-ONLY</span><span class="source-state">CURRENT</span></span>
    <span class="source-detail">Deterministic Phase 5 self-context snapshot. No live source connection.</span>
    <span class="source-count">${recordCount} records · ${providerCount} projected providers</span>`;
}

function renderInspector(entityId, open = true) {
  state.selectedEntityId = entityId;
  state.inspectorOpen = open;
  const descriptor = inspectorDescriptorById(entityId);
  const record = surfaceRecordById(entityId);

  if (state.inspectorOpen) inspector.classList.remove("is-closed");
  else inspector.classList.add("is-closed");
  main.dataset.inspectorOpen = String(state.inspectorOpen);
  const openControl = main.querySelector("[data-open-inspector]");
  if (openControl) openControl.hidden = state.inspectorOpen;
  inspectorTitle.textContent = "CONTEXT INSPECTOR";

  if (!record || !descriptor) {
    inspectorContent.innerHTML = `<p class="inspector-empty">This record is not available through the accepted Product Surface inspector index. No raw source or Graph fallback was attempted.</p>`;
    return;
  }

  const provenance = record.provenance || {};
  const governance = record.governance || {};
  const related = (record.relatedIds || []).map(surfaceRecordById).filter(Boolean);
  const actionDetails = record.kind === "action" ? `
    <span class="inspector-kicker">ACTION BOUNDARY</span>
    <dl class="inspector-data">
      <div><dt>STATUS</dt><dd>${escapeHtml(record.actionStatus || "unknown")}</dd></div>
      <div><dt>PRIORITY</dt><dd>${escapeHtml(record.priority || "unknown")}</dd></div>
      <div><dt>OWNER</dt><dd>${escapeHtml(record.owner || "unassigned")}</dd></div>
      <div><dt>CONFIRMATION</dt><dd>${record.requiresConfirmation ? "required" : "not required"}</dd></div>
    </dl>` : "";
  const identityDetails = record.kind === "identity" ? `
    <span class="inspector-kicker">IDENTITY AUTHORITY</span>
    <dl class="inspector-data">
      <div><dt>VERIFICATION</dt><dd>${escapeHtml(record.state?.verification || "unknown")}</dd></div>
      <div><dt>FRESHNESS</dt><dd>${escapeHtml(record.state?.freshness || "unknown")}</dd></div>
      <div><dt>INHERITANCE</dt><dd>${escapeHtml(governance.inheritance || "unknown")}</dd></div>
      <div><dt>CONFIRMATION</dt><dd>${governance.requiresConfirmation ? "required" : "not required"}</dd></div>
    </dl>
    <p class="inspector-empty">${record.state?.verification === "confirmed"
      ? "This Identity record is confirmed by accepted upstream authority."
      : record.state?.verification === "inferred"
        ? "This Identity record is inferred and is not user-confirmed truth."
        : "This Identity record keeps its upstream verification state without promotion."}</p>` : "";

  inspectorContent.innerHTML = `
    <section class="inspector-panel">
      <span class="inspector-kicker">${escapeHtml(record.kind.toUpperCase())} · ${escapeHtml(descriptor.section)}</span>
      <h2>${escapeHtml(record.title)}</h2>
      <span class="inspector-status">${escapeHtml(record.state?.verification || "unknown")} · ${escapeHtml(record.state?.freshness || "unknown")}</span>
      <p>${escapeHtml(record.summary)}</p>
      <dl class="inspector-data">
        <div><dt>LIFECYCLE</dt><dd>${escapeHtml(record.state?.lifecycle || "unknown")}</dd></div>
        <div><dt>SOURCE</dt><dd>${escapeHtml(provenance.provider || "unknown")}</dd></div>
        <div><dt>REFERENCE</dt><dd>${escapeHtml(provenance.reference || "not exposed")}</dd></div>
        <div><dt>CAPTURED</dt><dd>${escapeHtml(formatDate(provenance.capturedAt))}</dd></div>
        <div><dt>AUTHORITY</dt><dd>${escapeHtml(provenance.authority || "unknown")}</dd></div>
        <div><dt>SENSITIVITY</dt><dd>${escapeHtml(governance.sensitivity || "project")}</dd></div>
      </dl>
      ${identityDetails}
      ${actionDetails}
      ${related.length ? `
        <span class="inspector-kicker">RELATED CONTEXT</span>
        <ul class="inspector-relations">
          ${related.map((item) => `<li><button type="button" data-inspect-entity="${escapeHtml(item.id)}"><strong>${escapeHtml(item.kind)}</strong> · ${escapeHtml(item.title)}</button></li>`).join("")}
        </ul>` : ""}
      ${record.requiresConfirmation || governance.requiresConfirmation ? `<p class="inspector-empty">This record requires human confirmation before any consequential action. No mutation is available from this Desk.</p>` : ""}
    </section>`;
}

function renderActionTray() {
  const [primaryAction] = state.surface.actions;
  const [risk] = state.surface.risks;
  trayActions.innerHTML = [
    primaryAction ? `<button type="button" data-inspect-entity="${escapeHtml(primaryAction.id)}" class="tray-primary">Review current action</button>` : "",
    risk ? `<button type="button" data-inspect-entity="${escapeHtml(risk.id)}">Review context risk</button>` : "",
    `<button type="button" data-atlas-route="reentry">Open historical Re-entry</button>`,
  ].filter(Boolean).join("");
  trayCurrentView.textContent = "DESK";
}

function renderDeskRoute() {
  document.body.className = "atlas-route route-desk product-surface-desk";
  document.querySelectorAll("[data-atlas-route]").forEach((control) => {
    if (control.closest(".atlas-primary-nav")) {
      control.setAttribute("aria-current", control.dataset.atlasRoute === "desk" ? "page" : "false");
    }
  });
  activeRouteLabel.innerHTML = "<span>Innovation</span><span>Nexus Atlas</span><span>Desk</span>";
  main.innerHTML = `${renderContextPath()}${renderDesk()}`;
  main.dataset.inspectorOpen = String(state.inspectorOpen);
  main.focus({ preventScroll: true });
  renderInspector(state.selectedEntityId, state.inspectorOpen);
  renderActionTray();
  announcement.textContent = "Nexus Self-Context Desk opened.";
}

document.addEventListener("click", (event) => {
  const routeControl = event.target.closest("[data-atlas-route]");
  if (routeControl) {
    event.preventDefault();
    const route = routeControl.dataset.atlasRoute;
    if (route !== "desk") replaceRoute(route);
    return;
  }

  const territoryControl = event.target.closest("[data-territory]");
  if (territoryControl) {
    const territory = TERRITORIES.find((item) => item.id === territoryControl.dataset.territory);
    announcement.textContent = territory?.id === "innovation"
      ? "Innovation is the active Territory for this Desk."
      : `${territory?.label || "Territory"} structure is defined but not implemented yet.`;
    return;
  }

  const sectionControl = event.target.closest("[data-open-surface]");
  if (sectionControl) {
    const [record] = sectionRecords(sectionControl.dataset.openSurface);
    if (record) renderInspector(record.id, true);
    return;
  }

  const inspectControl = event.target.closest("[data-inspect-entity]");
  if (inspectControl) {
    renderInspector(inspectControl.dataset.inspectEntity, true);
    return;
  }

  if (event.target.closest("[data-open-inspector]")) {
    renderInspector(state.selectedEntityId, true);
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

window.addEventListener("hashchange", () => {
  const route = window.location.hash.replace("#", "") || "desk";
  if (route !== "desk") window.location.reload();
});

try {
  state.surface = await loadProductSurface();
  renderTerritoryNavigation();
  renderSourceHealth();
  renderDeskRoute();
} catch (error) {
  console.error(error);
  renderTerritoryNavigation();
  sourceSummary.innerHTML = `<span class="source-primary"><span class="source-name">PRODUCT SURFACE</span><span class="source-state">UNAVAILABLE</span></span><span class="source-detail">Accepted Desk snapshot could not be opened.</span>`;
  activeRouteLabel.innerHTML = "<span>Innovation</span><span>Nexus Atlas</span><span>Desk</span>";
  main.innerHTML = `
    ${renderContextPath()}
    <header class="view-heading"><div><span class="eyebrow">SOURCE ERROR</span><h1>The Desk could not open</h1><p>The accepted Product Surface snapshot is unavailable. No fallback to stale historical context was performed.</p></div><span class="route-stamp">ERROR / PRODUCT SURFACE</span></header>
    <section class="atlas-card"><p>${escapeHtml(error.message)}</p></section>`;
}