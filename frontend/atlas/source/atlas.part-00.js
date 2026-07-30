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
  "external-asset-calibration-job": { x: 680, y: 145, kind: "asset", label: "Calibration Job", type: "DATA JOB" },
  "external-asset-results-v047": { x: 680, y: 300, kind: "asset", label: "Results v0.4.7", type: "EVIDENCE" },
  "decision-benchmark-first": { x: 425, y: 455, kind: "decision", label: "Benchmark-first", type: "DECISION" },
  "task-rebuild-benchmark-set": { x: 680, y: 470, kind: "action", label: "Build validation set", type: "ACTION" },
};

const state = {
  route: getRouteFromLocation(),
  scenario: null,
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

async function loadScenario() {
  const generatedResponse = await fetch("./continuity/scenarios/verity-reentry.json", { cache: "no-store" });
  if (generatedResponse.ok) return generatedResponse.json();

  const partNames = ["00", "01", "02", "03"];
  const parts = await Promise.all(
    partNames.map(async (part) => {
      const response = await fetch(
        `./continuity/scenarios/verity-reentry/verity-reentry.part-${part}.json`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(`Scenario part ${part} is unavailable.`);
      return response.text();
    }),
  );
  return JSON.parse(parts.join(""));
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
