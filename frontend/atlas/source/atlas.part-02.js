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
  sourceSummary.textContent = `${projectSources().length} sources · scenario v${state.scenario.scenarioVersion}`;
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
