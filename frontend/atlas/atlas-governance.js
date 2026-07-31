const AUDIT_KEY = "nexus.atlas.audit.v1";
const SIGNAL_TARGETS = Object.freeze({
  changes: "event-roadmap-shifted",
  decisions: "decision-benchmark-first",
  stale: "risk-stale-v046-results",
  ownership: "risk-benchmark-missing-owner",
});

let selectedEntityId = "project-verity";

function readAuditEvents() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AUDIT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendAuditEvent(event) {
  const events = readAuditEvents();
  events.push({
    id: `audit-${Date.now()}`,
    recordedAt: new Date().toISOString(),
    ...event,
  });
  sessionStorage.setItem(AUDIT_KEY, JSON.stringify(events.slice(-50)));
  return events.at(-1);
}

function feedbackElement() {
  return document.querySelector("#confirmation-feedback");
}

function renderAuditReceipt(event) {
  const panel = document.querySelector("#inspector-content .inspector-panel");
  if (!panel) return;
  panel.querySelector(".audit-receipt")?.remove();

  const receipt = document.createElement("section");
  receipt.className = "audit-receipt";

  const kicker = document.createElement("span");
  kicker.className = "inspector-kicker";
  kicker.textContent = "NEXUS AUDIT EVENT";

  const typeLine = document.createElement("p");
  const type = document.createElement("strong");
  type.textContent = String(event.type || "audit_event").replaceAll("_", " ");
  typeLine.append(type);

  const summary = document.createElement("p");
  summary.textContent = String(event.summary || "");

  const time = document.createElement("small");
  time.textContent = String(event.recordedAt || "");

  receipt.append(kicker, typeLine, summary, time);
  panel.append(receipt);
}

function confirmConflict(button) {
  const event = appendAuditEvent({
    type: "decision_confirmation",
    projectId: "project-verity",
    entityId: "risk-agent-roadmap-conflict",
    decisionId: "decision-benchmark-first",
    resolution: "keep-benchmark-first",
    summary:
      "Human confirmed the Benchmark-first route. The earlier feature-expansion memory remains in history but is not inherited.",
  });
  const feedback = feedbackElement();
  if (feedback) {
    feedback.textContent =
      "DecisionConfirmationEvent recorded. Benchmark-first remains current; the conflicting memory is preserved as deferred history.";
  }
  const status = document.querySelector("#inspector-content .inspector-status");
  if (status) status.textContent = "resolved by decision";
  button.disabled = true;
  button.textContent = "Decision confirmed";
  renderAuditReceipt(event);
}

function handleOwnership(button) {
  const feedback = feedbackElement();
  if (feedback) {
    feedback.innerHTML =
      'Ownership is not marked repaired in fixture mode. Open the <a href="./reentry.html?source=datahub&amp;bridge=http%3A%2F%2F127.0.0.1%3A8790%2Fapi%2Fcontinuity%2Freentry&amp;mutationBridge=http%3A%2F%2F127.0.0.1%3A8791%2Fapi%2Fcontext%2Frepair%2Fbenchmark-owner#evidence">governed Verity DataHub workspace</a> after ingesting the assets and configuring the owner URN.';
  }
  button.textContent = "Live verification required";
}

document.addEventListener("click", (event) => {
  const entityControl = event.target.closest("[data-inspect-entity], [data-map-node]");
  if (entityControl) {
    selectedEntityId =
      entityControl.dataset.inspectEntity || entityControl.dataset.mapNode;
  }

  const signalControl = event.target.closest("[data-open-signal]");
  if (signalControl) {
    selectedEntityId =
      SIGNAL_TARGETS[signalControl.dataset.openSignal] || "project-verity";
  }

  const detailedLink = event.target.closest('.workspace-link[href="./reentry.html"]');
  if (detailedLink) {
    event.preventDefault();
    window.location.href = "./reentry.html?scenario=verity#brief";
    return;
  }

  const confirmation = event.target.closest("[data-prototype-confirm]");
  if (!confirmation) return;

  if (selectedEntityId === "risk-agent-roadmap-conflict") {
    confirmConflict(confirmation);
    return;
  }

  if (selectedEntityId === "risk-benchmark-missing-owner") {
    handleOwnership(confirmation);
  }
});
