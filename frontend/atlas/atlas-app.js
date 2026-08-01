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
  "project-verity": { x: 430, y: 235, kind: "project", label: "衡准 · Verity", type: "PROJECT 01", meta: "Benchmark validation", zone: "governance" },
  "external-asset-rubric": { x: 145, y: 120, kind: "asset", label: "Evaluation Rubric", type: "DATA ASSET", meta: "Governance rubric", zone: "governance" },
  "external-asset-test-materials": { x: 145, y: 235, kind: "asset", label: "Test Materials", type: "DATA ASSET", meta: "Evaluation inputs", zone: "governance" },
  "external-asset-benchmark": { x: 430, y: 105, kind: "risk", label: "Benchmark v1", type: "RISK / MISSING OWNER", meta: "Ownership gap", zone: "governance" },
  "external-asset-calibration-job": { x: 710, y: 120, kind: "calibration", label: "Calibration Context", type: "CALIBRATION CONTEXT", meta: "Scoring context", zone: "evidence" },
  "external-asset-results-v047": { x: 710, y: 245, kind: "evidence", label: "Results v0.4.7", type: "EVIDENCE", meta: "Evaluation results", zone: "evidence" },
  "decision-benchmark-first": { x: 430, y: 430, kind: "decision", label: "Benchmark-first", type: "DECISION", meta: "Confirmed route", zone: "decisions" },
  "task-rebuild-benchmark-set": { x: 710, y: 430, kind: "action", label: "Build validation set", type: "ACTION", meta: "Next execution", zone: "actions" },
};

const MAP_ZONES = [
  { label: "GOVERNANCE", x: 24, y: 34, width: 570, height: 275 },
  { label: "EVIDENCE", x: 614, y: 34, width: 222, height: 275 },
  { label: "DECISIONS", x: 24, y: 335, width: 570, height: 235 },
  { label: "ACTIONS", x: 614, y: 335, width: 222, height: 235 },
];

const state = {
  route: getRouteFromLocation(),
  scenario: null,
  sourceInfo: null,
  selectedTerritory: "innovation",
  selectedEntityId: "project-verity",
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

const VIEW_LABELS = Object.freeze({
  desk: "Desk",
  map: "Map",
  territory: "Workspace",
  reentry: "Re-entry",
});

const VIEW_MODES = Object.freeze({
  desk: "Overview",
  map: "Relations",
  territory: "Decisions",
});

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

function currentTerritoryLabel() {
  return TERRITORIES.find((territory) => territory.id === state.selectedTerritory)?.label || "Innovation";
}

function renderContextPath() {
  return `
    <nav class="atlas-context-path" aria-label="Current context path">
      <span>Nexus Atlas</span><b>/</b>
      <span>${escapeHtml(currentTerritoryLabel())}</span><b>/</b>
      <span>Verity</span><b>/</b>
      <strong>${escapeHtml(VIEW_LABELS[state.route])}</strong>
    </nav>`;
}

function renderViewHeading(eyebrow, title, description, stamp) {
  return `
    <header class="view-heading">
      <div>
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="view-heading-tools">
        <button type="button" class="inspector-open-control" data-open-inspector${state.inspectorOpen ? " hidden" : ""}>Open inspector</button>
        <span class="route-stamp">${escapeHtml(stamp)}</span>
      </div>
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

function mapSelectionState(id) {
  if (!state.selectedEntityId) return "";
  if (id === state.selectedEntityId) return " is-selected";
  if (state.selectedEntityId === "project-verity") return " is-related";
  const related = relatedRecords(state.selectedEntityId).some((item) => item.id === id);
  return related ? " is-related" : " is-dimmed";
}

function mapEdge(fromId, toId, risk = false) {
  const relation = relationForMap(fromId, toId);
  if (!relation) return "";
  const from = mapLayout[relation.from];
  const to = mapLayout[relation.to];
  if (!from || !to) return "";
  const selected = state.selectedEntityId && (relation.from === state.selectedEntityId || relation.to === state.selectedEntityId);
  const controlX = (from.x + to.x) / 2 + (to.y - from.y) * 0.14;
  const controlY = (from.y + to.y) / 2 - (to.x - from.x) * 0.08;
  const labelX = (from.x + 2 * controlX + to.x) / 4;
  const labelY = (from.y + 2 * controlY + to.y) / 4 - 8;
  const dimmed = state.selectedEntityId && state.selectedEntityId !== "project-verity";
  return `
    <path class="map-route${risk ? " is-risk" : ""}${selected ? " is-selected" : dimmed ? " is-dimmed" : ""}" d="M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}" marker-end="url(#${risk ? "map-arrow-risk" : selected ? "map-arrow-selected" : "map-arrow"})" />
    <g class="map-route-label" transform="translate(${labelX} ${labelY})"><rect x="-30" y="-9" width="60" height="16" rx="2" /><text x="0" y="2" text-anchor="middle">${escapeHtml(relation.type)}</text></g>`;
}

function mapNode(id) {
  const item = mapLayout[id];
  if (!item) return "";
  const selection = mapSelectionState(id);
  if (item.kind === "project") {
    return `
      <g class="map-node is-project map-project-landmark${selection}" role="button" tabindex="0" data-map-node="${id}" aria-label="Inspect project ${escapeHtml(item.label)}">
        <rect class="map-landmark-frame" x="${item.x - 112}" y="${item.y - 48}" width="224" height="96" rx="2" />
        <text class="map-landmark-kicker" x="${item.x - 92}" y="${item.y - 26}">${item.type}</text>
        <text class="map-landmark-title" x="${item.x - 92}" y="${item.y + 2}">${escapeHtml(item.label)}</text>
        <text class="map-landmark-meta" x="${item.x - 92}" y="${item.y + 25}">${escapeHtml(item.meta)}</text>
      </g>`;
  }
  return `
    <g class="map-node is-${item.kind}${selection}" role="button" tabindex="0" data-map-node="${id}" aria-label="Inspect ${escapeHtml(item.type)} ${escapeHtml(item.label)}">
      <rect class="map-node-frame" x="${item.x - 78}" y="${item.y - 34}" width="156" height="68" rx="2" />
      <text class="map-node-type" x="${item.x - 64}" y="${item.y - 15}">${item.type}</text>
      <text class="map-node-title" x="${item.x - 64}" y="${item.y + 7}">${escapeHtml(item.label)}</text>
      <text class="map-node-meta" x="${item.x - 64}" y="${item.y + 23}">${escapeHtml(item.meta)}</text>
    </g>`;
}

function renderMapZone(zone) {
  return `<g class="map-zone"><rect x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}" rx="3" /><text x="${zone.x + 14}" y="${zone.y + 20}">${zone.label}</text></g>`;
}

function renderMapLegend() {
  return `
    <div class="map-tools">
      <div class="map-legend" aria-label="Map legend">
        <span><i class="legend-mark legend-project"></i>Project</span>
        <span><i class="legend-mark legend-asset"></i>Asset / Evidence</span>
        <span><i class="legend-mark legend-decision"></i>Decision</span>
        <span><i class="legend-mark legend-action"></i>Action</span>
        <span><i class="legend-mark legend-risk"></i>Risk</span>
      </div>
      <div class="map-controls">
        <button type="button" data-map-action="fit">Fit map</button>
        <button type="button" data-map-action="reset">Reset selection</button>
      </div>
    </div>`;
}

function renderMap() {
  return `
    ${renderViewHeading(
      "PROJECT FOCUS / INNOVATION",
      "Atlas Map",
      "A context route built from stored relations. Every line below corresponds to a real relationship in the Verity scenario.",
      "MAP / PROJECT-VERITY",
    )}
    ${renderMapLegend()}
    <section class="map-stage" aria-label="Verity project context map">
      <svg viewBox="0 0 860 600" role="img" aria-labelledby="map-title map-description">
        <title id="map-title">Verity context map</title>
        <desc id="map-description">Project, data assets, decisions, evidence, and actions connected through stored relationships.</desc>
        <defs>
          <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="map-arrow-selected" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="map-arrow-risk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        </defs>
        ${MAP_ZONES.map(renderMapZone).join("")}
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
        <li tabindex="0" role="button" data-inspect-entity="${escapeHtml(event.id)}" aria-label="Inspect ${escapeHtml(event.title)}">
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

function renderInspector(entityId, open = true) {
  state.selectedEntityId = entityId;
  state.inspectorOpen = open;
  const entity = entityById(entityId);
  const relations = relatedRecords(entityId);
  const visibleRelations = state.route === "map" ? relations.slice(0, 6) : relations;
  const source = entity?.source;
  if (state.inspectorOpen) inspector.classList.remove("is-closed");
  else inspector.classList.add("is-closed");
  const openControl = main.querySelector("[data-open-inspector]");
  if (openControl) openControl.hidden = state.inspectorOpen;
  inspectorTitle.textContent = state.route === "map" ? "SELECTED CONTEXT" : "CONTEXT INSPECTOR";

  if (!entity) {
    inspectorContent.innerHTML = `<p class="inspector-empty">${state.route === "map" ? "Select a node to inspect its context and relations" : "Select a project, decision, signal, or mapped asset to inspect its provenance."}</p>`;
    return;
  }

  const typeLabels = {
    project: "PROJECT",
    external_asset: "DATA ASSET",
    decision: "DECISION",
    action: "ACTION",
    task: "ACTION",
    risk: "RISK",
    event: "EVENT",
  };
  const entityType = typeLabels[entity.type] || String(entity.type || "context").replaceAll("_", " ").toUpperCase();

  inspectorContent.innerHTML = `
    <section class="inspector-panel">
      <span class="inspector-kicker">${escapeHtml(entityType)}</span>
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
          ${visibleRelations.map((item) => `<li><strong>${escapeHtml(item.relation)}</strong> · ${escapeHtml(item.title)}</li>`).join("")}
        </ul>` : ""}
      ${entity.metadata?.requiresConfirmation || entity.metadata?.signal === "missing-ownership" ? `
        <button class="confirm-action" type="button" data-prototype-confirm>Request human confirmation</button>
        <p id="confirmation-feedback" class="inspector-empty" aria-live="polite"></p>` : ""}
    </section>`;
}

function renderActionTray() {
  const selected = Boolean(entityById(state.selectedEntityId));
  const selectionLabel = selected ? "" : " title=\"Select a context item first\" aria-disabled=\"true\" disabled";
  const actions = {
    desk: [
      `<button type="button" data-atlas-route="territory">Resume Verity</button>`,
      `<button type="button" data-open-signal="ownership">Review attention</button>`,
      `<button type="button" data-atlas-route="map" class="tray-primary">Open map</button>`,
    ],
    map: [
      `<button type="button" data-open-inspector${selectionLabel}>Inspect selected</button>`,
      `<button type="button" data-inspect-entity="${escapeHtml(state.selectedEntityId || "project-verity")}"${selectionLabel}>View lineage</button>`,
      `<button type="button" data-atlas-route="territory" class="tray-primary">Open workspace</button>`,
    ],
    territory: [
      `<button type="button" data-atlas-route="reentry">Continue</button>`,
      `<button type="button" data-open-signal="stale">Verify</button>`,
      `<button type="button" data-open-signal="ownership">Repair</button>`,
      `<button type="button" data-atlas-route="reentry" class="tray-primary">Act</button>`,
    ],
    reentry: [
      `<button type="button" data-atlas-route="territory">Continue</button>`,
      `<button type="button" data-open-signal="stale">Verify</button>`,
      `<button type="button" data-open-signal="ownership">Repair</button>`,
      `<button type="button" data-atlas-route="territory" class="tray-primary">Act</button>`,
    ],
  };
  trayActions.innerHTML = actions[state.route].join("");
  trayCurrentView.textContent = VIEW_LABELS[state.route].toUpperCase();
}

function renderRoute() {
  document.body.className = `atlas-route route-${state.route}`;
  state.inspectorOpen = state.route === "map";
  document.querySelectorAll("[data-atlas-route]").forEach((control) => {
    const current = control.dataset.atlasRoute === state.route;
    if (control.closest(".atlas-primary-nav")) {
      control.setAttribute("aria-current", current ? "page" : "false");
    }
  });

  const labels = {
    desk: "Desk",
    map: "Map",
    territory: "Workspace",
    reentry: "Re-entry",
  };
  activeRouteLabel.innerHTML = `<span>${escapeHtml(currentTerritoryLabel())}</span><span>Verity</span><span>${escapeHtml(labels[state.route])}</span>`;

  if (state.route === "map") main.innerHTML = `${renderContextPath()}${renderMap()}`;
  else if (state.route === "territory") main.innerHTML = `${renderContextPath()}${renderTerritory()}`;
  else if (state.route === "reentry") main.innerHTML = `${renderContextPath()}${renderReentry()}`;
  else main.innerHTML = `${renderContextPath()}${renderDesk()}`;

  main.dataset.inspectorOpen = String(state.inspectorOpen);
  main.focus({ preventScroll: true });
  announcement.textContent = `${labels[state.route]} opened.`;
  renderInspector(state.selectedEntityId, state.inspectorOpen);
  renderActionTray();
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

function selectEntity(entityId) {
  state.selectedEntityId = entityId;
  state.inspectorOpen = true;
  if (state.route === "map") renderRoute();
  else renderInspector(entityId, true);
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

  if (event.target.closest("[data-open-inspector]")) {
    main.dataset.inspectorOpen = "true";
    inspector.classList.remove("is-closed");
    renderInspector(state.selectedEntityId, true);
    return;
  }

  const entityControl = event.target.closest("[data-inspect-entity], [data-map-node]");
  if (entityControl) {
    selectEntity(entityControl.dataset.inspectEntity || entityControl.dataset.mapNode);
    return;
  }

  const mapAction = event.target.closest("[data-map-action]");
  if (mapAction) {
    if (mapAction.dataset.mapAction === "reset") {
      state.selectedEntityId = null;
      state.inspectorOpen = true;
      renderRoute();
    } else {
      const mapStage = document.querySelector(".map-stage");
      if (mapStage) {
        mapStage.scrollLeft = 0;
        mapStage.scrollTop = 0;
      }
    }
    return;
  }

  if (event.target.closest("[data-close-inspector]")) {
    state.inspectorOpen = false;
    inspector.classList.add("is-closed");
    main.dataset.inspectorOpen = "false";
    const openControl = main.querySelector("[data-open-inspector]");
    if (openControl) openControl.hidden = false;
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
  if (event.key === "Escape" && state.route === "map" && state.selectedEntityId) {
    event.preventDefault();
    state.selectedEntityId = null;
    state.inspectorOpen = true;
    renderRoute();
    return;
  }
  const mapNodeControl = event.target.closest?.("[data-map-node]");
  if (mapNodeControl && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    selectEntity(mapNodeControl.dataset.mapNode);
  }
  const inspectControl = event.target.closest?.("[data-inspect-entity]");
  if (inspectControl && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    selectEntity(inspectControl.dataset.inspectEntity);
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
  sourceSummary.innerHTML = `<span class="source-primary"><span class="source-name">${escapeHtml(sourceLabel)}</span><span class="source-state">${escapeHtml(sourceMode.toUpperCase())}</span></span><span class="source-detail">${projectSources().length} sources · scenario v${escapeHtml(state.scenario.scenarioVersion)}</span>`;
  renderTerritoryNavigation();
  renderRoute();
} catch (error) {
  console.error(error);
  sourceSummary.innerHTML = `<span class="source-primary"><span class="source-name">Context source</span><span class="source-state">UNAVAILABLE</span></span><span class="source-detail">Context unavailable</span>`;
  main.innerHTML = `
    ${renderViewHeading(
      "SOURCE ERROR",
      "The Atlas could not open",
      "The Verity scenario source is unavailable. Build the fixture or serve the scenario source parts from the repository root.",
      "ERROR / CONTEXT",
    )}
    <section class="atlas-card"><p>${escapeHtml(error.message)}</p></section>`;
}
