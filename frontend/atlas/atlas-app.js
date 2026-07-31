import { createContinuityProvider } from "../../experience/continuity/continuity-provider.mjs";

const ROUTES = ["desk", "map", "territory", "reentry"];
const TERRITORIES = [
  { id: "innovation", label: "Innovation", status: "Active", detail: "Projects, products, experiments" },
  { id: "learning", label: "Learning", status: "Structure defined", detail: "Skills, courses, practice" },
  { id: "research", label: "Research", status: "Structure defined", detail: "Evidence, inquiry, synthesis" },
  { id: "creation", label: "Creation", status: "Structure defined", detail: "Writing, design, publishing" },
  { id: "evaluation", label: "Evaluation", status: "Structure defined", detail: "Review, standards, quality" },
];

const mapLayout = {
  "project-verity": { x: 430, y: 295, kind: "project", label: "衡准 · Verity", type: "PROJECT" },
  "external-asset-rubric": { x: 175, y: 120, kind: "asset", label: "Evaluation Rubric", type: "DATA ASSET" },
  "external-asset-test-materials": { x: 175, y: 270, kind: "asset", label: "Test Materials", type: "DATA ASSET" },
  "external-asset-benchmark": { x: 425, y: 145, kind: "risk", label: "Benchmark v1", type: "MISSING OWNER" },
  "external-asset-calibration-job": { x: 680, y: 145, kind: "asset", label: "Calibration Context", type: "CALIBRATION CONTEXT" },
  "external-asset-results-v047": { x: 680, y: 300, kind: "asset", label: "Results v0.4.7", type: "EVIDENCE" },
  "decision-benchmark-first": { x: 425, y: 455, kind: "decision", label: "Benchmark-first", type: "DECISION" },
  "task-rebuild-benchmark-set": { x: 680, y: 470, kind: "action", label: "Build validation set", type: "ACTION" },
};

const state = {
  route: getRouteFromLocation(),
  scenario: null,
  sourceInfo: null,
  selectedTerritory: "innovation",
  selectedEntityId: "project-verity",
  inspectorOpen: true,
};

const main = document.querySelector("#atlas-main");
const territoryNavigation = document.querySelector("#territory-navigation");
const sourceSummary = document.querySelector("#atlas-source-summary");
const activeRouteLabel = document.querySelector("#active-route-label");
const inspector = document.querySelector("#context-inspector");
const inspectorContent = document.querySelector("#inspector-content");
const announcement = document.querySelector("#atlas-announcement");

function getRouteFromLocation() {
  const route = window.location.hash.replace("#", "");
  return ROUTES.includes(route) ? route : "desk";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStatus(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
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

function sourceConfiguration() {
  const query = new URLSearchParams(window.location.search);
  return {
    mode: query.get("source") || "fixture",
    scenario: "verity",
    bridgeUrl: query.get("bridge") || undefined,
  };
}

async function loadScenario() {
  const provider = createContinuityProvider(sourceConfiguration());
  const loaded = await provider.loadScenario();
  state.sourceInfo = loaded.sourceInfo;
  return loaded.scenario;
}

function entityById(id) {
  if (id === "project-verity") return state.scenario.project;
  return state.scenario.entities.find((entity) => entity.id === id);
}

function relatedRecords(id) {
  return state.scenario.relationships
    .filter((relationship) => relationship.from === id || relationship.to === id)
    .map((relationship) => {
      const otherId = relationship.from === id ? relationship.to : relationship.from;
      const other = entityById(otherId);
      return {
        relation: relationship.type,
        direction: relationship.from === id ? "outgoing" : "incoming",
        id: otherId,
        title: other?.title || other?.name || otherId,
      };
    });
}

function meaningfulChanges() {
  return state.scenario.entities
    .filter((entity) => entity.type === "event" && entity.metadata?.meaningfulChange)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function validDecisions() {
  return state.scenario.entities.filter(
    (entity) => entity.type === "decision" && entity.status === "confirmed",
  );
}

function staleRecords() {
  return state.scenario.entities.filter(
    (entity) => entity.status === "stale" || entity.metadata?.signal === "stale-evidence",
  );
}

function conflictRecords() {
  return state.scenario.entities.filter((entity) => entity.metadata?.signal === "agent-conflict");
}

function ownershipRecords() {
  return state.scenario.entities.filter((entity) => entity.metadata?.signal === "missing-ownership");
}

function projectSources() {
  return [...new Set(state.scenario.entities.map((entity) => entity.source?.provider).filter(Boolean))];
}

function renderTerritoryNavigation() {
  territoryNavigation.innerHTML = TERRITORIES.map(
    (territory, index) => `
      <button class="territory-button" type="button" data-territory="${territory.id}"
        aria-current="${state.selectedTerritory === territory.id}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${territory.label}</strong><small>${territory.detail}</small></span>
      </button>`,
  ).join("");
}

function renderViewHeading(eyebrow, title, description, stamp) {
  return `
    <header class="view-heading">
      <div>
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </div>
      <span class="route-stamp">${escapeHtml(stamp)}</span>
    </header>`;
}

function renderSignalButton(key, label, count, tone, detail) {
  return `
    <button class="signal-value" type="button" data-open-signal="${key}" data-tone="${tone}">
      <small>${escapeHtml(label)}</small>
      <strong>${String(count).padStart(2, "0")}</strong>
      <span>${escapeHtml(detail)}</span>
    </button>`;
}

function renderDesk() {
  const project = state.scenario.project;
  const findings = state.scenario.expectedFindings;
  return `
    ${renderViewHeading(
      "PERSONAL INTELLIGENCE INFRASTRUCTURE",
      "Atlas Desk",
      "A working index of projects, decisions, evidence, and actions that need attention across your territories.",
      "INDEX / 30 JUL 2026",
    )}

    <div class="desk-grid">
      <section class="atlas-card reentry-card">
        <span class="card-kicker">NEEDS RE-ENTRY · INNOVATION</span>
        <h2>${escapeHtml(project.name)}</h2>
        <p>${escapeHtml(project.description)}</p>
        <dl class="project-metadata">
          <div><dt>LAST ACTIVE</dt><dd>${formatDate(project.lastActiveAt)}</dd></div>
          <div><dt>CURRENT VERSION</dt><dd>${escapeHtml(project.currentVersion)}</dd></div>
          <div><dt>MILESTONE</dt><dd>${escapeHtml(project.currentMilestone)}</dd></div>
          <div><dt>CONTEXT ATTENTION</dt><dd>${findings.staleRecords + findings.agentConflicts + findings.missingOwners} records</dd></div>
        </dl>
        <div class="inline-actions">
          <button type="button" data-atlas-route="territory">Enter territory</button>
          <button type="button" class="secondary" data-atlas-route="map">Inspect map</button>
        </div>
      </section>

      <section class="atlas-card">
        <span class="card-kicker">TERRITORY INDEX</span>
        <h2>One graph, five views</h2>
        <p>Territories do not own separate databases. They change which context, relations, and capabilities are foregrounded.</p>
        <div class="territory-summary-list">
          ${TERRITORIES.map(
            (territory, index) => `
       <div class="territory-summary">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div><strong>${territory.label}</strong><small>${territory.detail}</small></div>
                <em>${territory.status}</em>
              </div>`,
          ).join("")}
        </div>
      </section>
    </div>

    <section class="signal-grid" aria-label="Current continuity signals">
      ${renderSignalButton("changes", "Meaningful changes", findings.meaningfulChanges, "valid", "Events after the last active point")}
      ${renderSignalButton("decisions", "Valid decisions", findings.validDecisions, "valid", "Confirmed routes that remain usable")}
      ${renderSignalButton("stale", "Stale evidence", findings.staleRecords, "warning", "Records that cannot support current work")}
      ${renderSignalButton("ownership", "Broken context", findings.agentConflicts + findings.missingOwners, "attention", "Conflict and ownership repair")}
    </section>`;
}

function relationForMap(from, to) {
  return state.scenario.relationships.find(
    (relationship) =>
      (relationship.from === from && relationship.to === to) ||
      (relationship.from === to && relationship.to === from),
  );
}

function mapEdge(fromId, toId, risk = false) {
  const from = mapLayout[fromId];
  const to = mapLayout[toId];
  const relation = relationForMap(fromId, toId);
  if (!from || !to || !relation) return "";
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;
  return `
    <line class="map-route ${risk ? "is-risk" : ""}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
    <text class="map-route-label" x="${middleX}" y="${middleY - 7}" text-anchor="middle">${escapeHtml(relation.type)}</text>`;
}

function mapNode(id) {
  const item = mapLayout[id];
  if (!item) return "";
  if (item.kind === "project") {
    return `
      <g class="map-node is-project" role="button" tabindex="0" data-map-node="${id}" aria-label="Inspect ${escapeHtml(item.label)}">
        <circle cx="${item.x}" cy="${item.y}" r="72" />
        <text x="${item.x}" y="${item.y - 4}" text-anchor="middle">${escapeHtml(item.label)}</text>
        <text class="map-node-type" x="${item.x}" y="${item.y + 16}" text-anchor="middle">${item.type}</text>
      </g>`;
  }
  return `
    <g class="map-node ${item.kind === "risk" ? "is-risk" : ""}" role="button" tabindex="0" data-map-node="${id}" aria-label="Inspect ${escapeHtml(item.label)}">
      <rect x="${item.x - 76}" y="${item.y - 31}" width="152" height="62" rx="2" />
      <text x="${item.x}" y="${item.y - 3}" text-anchor="middle">${escapeHtml(item.label)}</text>
      <text class="map-node-type" x="${item.x}" y="${item.y + 15}" text-anchor="middle">${item.type}</text>
    </g>`;
}

function renderMap() {
  return `
    ${renderViewHeading(
      "PROJECT FOCUS / INNOVATION",
      "Atlas Map",
      "A context route built from stored relations. Every line below corresponds to a real relationship in the Verity scenario.",
      "MAP / PROJECT-VERITY",
    )}
    <section class="map-stage" aria-label="Verity project context map">
      <svg viewBox="0 0 860 600" role="img" aria-labelledby="map-title map-description">
        <title id="map-title">Verity context map</title>
        <desc id="map-description">Project, data assets, decisions, evidence, and actions connected through stored relationships.</desc>
        ${mapEdge("external-asset-rubric", "external-asset-benchmark")}
        ${mapEdge("external-asset-test-materials", "external-asset-benchmark")}
        ${mapEdge("external-asset-benchmark", "external-asset-calibration-job", true)}
        ${mapEdge("external-asset-calibration-job", "external-asset-results-v047")}
        ${mapEdge("decision-benchmark-first", "task-rebuild-benchmark-set")}
        ${Object.keys(mapLayout).map(mapNode).join("")}
      </svg>
    </section>`;
}

function renderRouteList() {
  return meaningfulChanges()
    .map(
      (event) => `
        <li>
          <time>${formatDate(event.createdAt)}</time>
          <strong>${escapeHtml(event.title)}</strong>
          <em>${escapeHtml(event.metadata?.version || event.metadata?.priority || "ROUTE")}</em>
        </li>`,
    )
    .join("");
}

function renderFindingButton(entity, label) {
  return `
    <button type="button" data-inspect-entity="${escapeHtml(entity.id)}">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(entity.title)}</strong>
      <em>${escapeHtml(formatStatus(entity.status))}</em>
    </button>`;
}

function renderTerritory() {
  const project = state.scenario.project;
  const decisions = validDecisions();
  const broken = [...staleRecords(), ...conflictRecords(), ...ownershipRecords()];
  return `
    <section class="project-hero">
      <div>
        <span class="eyebrow">INNOVATION TERRITORY / PROJECT 01</span>
        <h1>${escapeHtml(project.name)}</h1>
        <p>${escapeHtml(project.description)}</p>
      </div>
      <div class="project-status-block">
        <span class="card-kicker">CURRENT MILESTONE</span>
        <strong>${escapeHtml(project.currentMilestone)}</strong>
        <p>Version ${escapeHtml(project.currentVersion)} · Re-entry required</p>
        <div class="inline-actions">
          <button type="button" data-atlas-route="reentry">Restore context</button>
        </div>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="workspace-section">
        <span class="card-kicker">PROJECT ROUTE</span>
        <h2>What changed</h2>
        <ul class="route-list">${renderRouteList()}</ul>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">DECISION CONTEXT</span>
        <h2>What remains valid</h2>
        <div class="finding-list">
          ${decisions.map((decision) => renderFindingButton(decision, "CONFIRMED")).join("")}
        </div>
      </section>

      <section class="workspace-section is-wide">
        <span class="card-kicker">CONTEXT HEALTH</span>
        <h2>What needs attention</h2>
        <div class="finding-list">
          ${broken.map((entity) => renderFindingButton(entity, entity.metadata?.signal || entity.type)).join("")}
        </div>
      </section>
    </div>`;
}

function firstEntityById(id) {
  return state.scenario.entities.find((entity) => entity.id === id);
}

function renderReentry() {
  const groups = state.scenario.expectedFindings.actionGroups;
  const primaryDecision = firstEntityById("decision-benchmark-first");
  const conflict = firstEntityById("risk-agent-roadmap-conflict");
  const ownerRisk = firstEntityById("risk-benchmark-missing-owner");
  const stale = firstEntityById("risk-stale-v046-results");
  return `
    ${renderViewHeading(
      "INNOVATION RE-ENTRY / VERITY",
      "Restore the route",
      "Recover what changed, preserve decisions that still hold, repair broken context, and return to an executable next action.",
      "RE-ENTRY / 21 DAYS",
    )}

    <section class="signal-grid">
      ${renderSignalButton("changes", "Meaningful changes", 4, "valid", "Current project events")}
      ${renderSignalButton("decisions", "Valid decisions", 4, "valid", "Confirmed and unsuperseded")}
      ${renderSignalButton("stale", "Stale evidence", 2, "warning", "Requires verification")}
      ${renderSignalButton("ownership", "Broken context", 2, "attention", "Conflict and missing owner")}
    </section>

    <div class="workspace-grid">
      <section class="workspace-section">
        <span class="card-kicker">DECISION TRACE</span>
        <h2>${escapeHtml(primaryDecision.title)}</h2>
        <p>${escapeHtml(primaryDecision.summary)}</p>
        <div class="inline-actions">
          <button type="button" data-inspect-entity="${primaryDecision.id}">Inspect decision</button>
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">CONTEXT REPAIR</span>
        <h2>${escapeHtml(ownerRisk.title)}</h2>
     <p>${escapeHtml(ownerRisk.summary)}</p>
        <div class="inline-actions">
          <button type="button" data-inspect-entity="${ownerRisk.id}">Inspect DataHub asset</button>
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">AGENT MEMORY</span>
        <h2>${escapeHtml(conflict.title)}</h2>
        <p>${escapeHtml(conflict.summary)}</p>
        <div class="inline-actions">
          <button type="button" data-inspect-entity="${conflict.id}">Resolve with context</button>
        </div>
      </section>

      <section class="workspace-section">
        <span class="card-kicker">EVIDENCE INTEGRITY</span>
        <h2>${escapeHtml(stale.title)}</h2>
        <p>${escapeHtml(stale.summary)}</p>
        <div class="inline-actions">
          <button type="button" data-inspect-entity="${stale.id}">Review evidence</button>
        </div>
      </section>

      <section class="workspace-section is-wide">
        <span class="card-kicker">RE-ENTRY PLAN</span>
        <h2>Continue with a restored Context Package</h2>
        <div class="action-groups">
          ${Object.entries(groups)
            .map(
              ([key, items]) => `
                <article class="action-group">
                  <span>${escapeHtml(key)}</span>
                  <strong>${escapeHtml(items[0])}</strong>
                  <p>${escapeHtml(items.slice(1).join(" ") || "Ready for the next validated step.")}</p>
                </article>`,
            )
            .join("")}
        </div>
        <div class="inline-actions" style="margin-top: 18px">
          <a class="workspace-link" href="./reentry.html">Open detailed continuity workspace</a>
          <button type="button" class="secondary" data-atlas-route="territory">Return to project workspace</button>
        </div>
      </section>
    </div>`;
}

function renderInspector(entityId) {
  state.selectedEntityId = entityId;
  const entity = entityById(entityId);
  const relations = relatedRecords(entityId);
  const source = entity?.source;
  state.inspectorOpen = true;
  inspector.classList.remove("is-closed");

  if (!entity) {
    inspectorContent.innerHTML = `<p class="inspector-empty">The selected context record is unavailable.</p>`;
    return;
  }

  inspectorContent.innerHTML = `
    <section class="inspector-panel">
      <span class="inspector-kicker">${escapeHtml(entity.type || "project")}</span>
      <h2>${escapeHtml(entity.title || entity.name)}</h2>
      <span class="inspector-status">${escapeHtml(formatStatus(entity.status))}</span>
      <p>${escapeHtml(entity.summary || entity.description)}</p>
      <dl class="inspector-data">
        <div><dt>SOURCE</dt><dd>${escapeHtml(source?.provider || "nexus")}</dd></div>
        <div><dt>REFERENCE</dt><dd>${escapeHtml(source?.reference || entity.id)}</dd></div>
        <div><dt>CREATED</dt><dd>${escapeHtml(formatDate(entity.createdAt))}</dd></div>
        <div><dt>RELATIONS</dt><dd>${relations.length}</dd></div>
      </dl>
      ${relations.length ? `
        <span class="inspector-kicker">RELATIONSHIPS</span>
        <ul class="inspector-relations">
          ${relations.map((item) => `<li><strong>${escapeHtml(item.relation)}</strong> · ${escapeHtml(item.title)}</li>`).join("")}
        </ul>` : ""}
      ${entity.metadata?.requiresConfirmation || entity.metadata?.signal === "missing-ownership" ? `
        <button class="confirm-action" type="button" data-prototype-confirm>Request human confirmation</button>
        <p id="confirmation-feedback" class="inspector-empty" aria-live="polite"></p>` : ""}
    </section>`;
}

function renderRoute() {
  document.querySelectorAll("[data-atlas-route]").forEach((control) => {
    const current = control.dataset.atlasRoute === state.route;
    if (control.closest(".atlas-primary-nav")) {
      control.setAttribute("aria-current", current ? "page" : "false");
    }
  });

  const labels = {
    desk: "Atlas Desk",
    map: "Atlas Map / Verity",
    territory: "Innovation / Verity",
    reentry: "Innovation Re-entry",
  };
  activeRouteLabel.textContent = labels[state.route];

  if (state.route === "map") main.innerHTML = renderMap();
  else if (state.route === "territory") main.innerHTML = renderTerritory();
  else if (state.route === "reentry") main.innerHTML = renderReentry();
  else main.innerHTML = renderDesk();

  main.focus({ preventScroll: true });
  announcement.textContent = `${labels[state.route]} opened.`;
  renderInspector(state.selectedEntityId);
}

function navigate(route) {
  if (!ROUTES.includes(route)) return;
  state.route = route;
  window.history.replaceState(null, "", `#${route}`);
  renderRoute();
}

function inspectSignal(signal) {
  const targets = {
    changes: "event-roadmap-shifted",
    decisions: "decision-benchmark-first",
    stale: "risk-stale-v046-results",
    ownership: "risk-benchmark-missing-owner",
  };
  renderInspector(targets[signal] || "project-verity");
}

document.addEventListener("click", (event) => {
  const routeControl = event.target.closest("[data-atlas-route]");
  if (routeControl) {
    event.preventDefault();
    navigate(routeControl.dataset.atlasRoute);
    return;
  }

  const territoryControl = event.target.closest("[data-territory]");
  if (territoryControl) {
    state.selectedTerritory = territoryControl.dataset.territory;
    renderTerritoryNavigation();
    if (state.selectedTerritory === "innovation") navigate("territory");
    else {
      announcement.textContent = `${territoryControl.textContent.trim()} structure is defined but not implemented yet.`;
      renderInspector("project-verity");
    }
    return;
  }

  const signalControl = event.target.closest("[data-open-signal]");
  if (signalControl) {
    inspectSignal(signalControl.dataset.openSignal);
    return;
  }

  const entityControl = event.target.closest("[data-inspect-entity], [data-map-node]");
  if (entityControl) {
    renderInspector(entityControl.dataset.inspectEntity || entityControl.dataset.mapNode);
    return;
  }

  if (event.target.closest("[data-close-inspector]")) {
    state.inspectorOpen = false;
    inspector.classList.add("is-closed");
    return;
  }

  if (event.target.closest("[data-prototype-confirm]")) {
    const feedback = document.querySelector("#confirmation-feedback");
    if (feedback) {
      feedback.textContent = "Confirmation UI is ready; the governed DataHub mutation will be connected in the next implementation slice.";
    }
  }
});

document.addEventListener("keydown", (event) => {
  const mapNodeControl = event.target.closest?.("[data-map-node]");
  if (mapNodeControl && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    renderInspector(mapNodeControl.dataset.mapNode);
  }
});

window.addEventListener("hashchange", () => {
  state.route = getRouteFromLocation();
  renderRoute();
});

try {
  state.scenario = await loadScenario();
  const sourceLabel = state.sourceInfo?.label || "Context source";
  const sourceMode = state.sourceInfo?.live ? "live" : "fixture";
  sourceSummary.textContent = `${sourceLabel} · ${sourceMode} · ${projectSources().length} sources · scenario v${state.scenario.scenarioVersion}`;
  renderTerritoryNavigation();
  renderRoute();
} catch (error) {
  console.error(error);
  sourceSummary.textContent = "Context unavailable";
  main.innerHTML = `
    ${renderViewHeading(
      "SOURCE ERROR",
      "The Atlas could not open",
      "The Verity scenario source is unavailable. Build the fixture or serve the scenario source parts from the repository root.",
      "ERROR / CONTEXT",
    )}
    <section class="atlas-card"><p>${escapeHtml(error.message)}</p></section>`;
}
