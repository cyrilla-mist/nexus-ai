import {
  defaultLocalBridgeUrl,
  validateLocalBridgeUrl,
} from "../../experience/continuity/local-bridge-url.mjs";

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

function currentSourceConfiguration() {
  const query = new URLSearchParams(window.location.search);
  const source = query.get("source") || "fixture";
  if (source !== "datahub") {
    return { source: "fixture" };
  }

  return {
    source: "datahub",
    bridge: validateLocalBridgeUrl(
      query.get("bridge") || defaultLocalBridgeUrl("read"),
      "read",
    ),
    mutationBridge: validateLocalBridgeUrl(
      query.get("mutationBridge") || defaultLocalBridgeUrl("mutation"),
      "mutation",
    ),
  };
}

function reentryUrl(hash = "brief") {
  let config;
  try {
    config = currentSourceConfiguration();
  } catch {
    config = { source: "fixture" };
  }

  const query = new URLSearchParams({ source: config.source });
  if (config.source === "fixture") {
    query.set("scenario", "verity");
  } else {
    query.set("bridge", config.bridge);
    query.set("mutationBridge", config.mutationBridge);
  }
  return `./reentry.html?${query.toString()}#${hash}`;
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
    const link = document.createElement("a");
    link.href = reentryUrl("evidence");
    link.textContent = "Open the governed Verity ownership workspace";
    feedback.replaceChildren(
      document.createTextNode(
        "Ownership is not marked repaired from the Atlas inspector. ",
      ),
      link,
      document.createTextNode(
        " to review the proposal, confirm the write, and verify the fresh DataHub read.",
      ),
    );
  }
  button.textContent = "Governed verification required";
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
    window.location.href = reentryUrl("brief");
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
