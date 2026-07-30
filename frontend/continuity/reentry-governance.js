const AUDIT_KEY = "nexus.atlas.audit.v1";

function readEvents() {
  try {
    const value = JSON.parse(sessionStorage.getItem(AUDIT_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeEvent(event) {
  const events = readEvents();
  const record = {
    id: `audit-${Date.now()}`,
    recordedAt: new Date().toISOString(),
    ...event,
  };
  events.push(record);
  sessionStorage.setItem(AUDIT_KEY, JSON.stringify(events.slice(-50)));
  return record;
}

function signalTitle() {
  return document.querySelector("#signal-lens-title")?.textContent?.trim() || "";
}

function setFeedback(message) {
  const feedback = document.querySelector(".prototype-feedback");
  if (feedback) feedback.textContent = message;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prototype-action]");
  if (!button) return;

  const title = signalTitle().toLowerCase();
  if (title.includes("roadmap") || title.includes("agent")) {
    writeEvent({
      type: "decision_confirmation",
      projectId: "project-verity",
      decisionId: "decision-benchmark-first",
      resolution: "keep-benchmark-first",
      summary:
        "Human confirmed Benchmark-first and prevented the superseded feature-expansion memory from being inherited.",
    });
    button.disabled = true;
    button.textContent = "Decision confirmed";
    setFeedback(
      "DecisionConfirmationEvent recorded locally. Both agent memories remain traceable; Benchmark-first is inherited.",
    );
    return;
  }

  if (title.includes("owner")) {
    setFeedback(
      "No repair was claimed. Ownership requires a live DataHub mutation followed by a successful re-read.",
    );
    return;
  }

  if (title.includes("outdated") || title.includes("stale")) {
    writeEvent({
      type: "revalidation_task_created",
      projectId: "project-verity",
      actionId: "task-rerun-stale-samples",
      summary: "Created a revalidation task for evidence generated before v0.4.7.",
    });
    setFeedback("Revalidation task recorded in the local Nexus audit ledger.");
    return;
  }

  writeEvent({
    type: "context_inheritance_confirmation",
    projectId: "project-verity",
    summary: "Human confirmed the selected context as safe to inherit.",
  });
  setFeedback("Context inheritance confirmation recorded locally.");
});
