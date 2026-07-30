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
