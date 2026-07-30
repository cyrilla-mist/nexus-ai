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
    id: event.id || `audit-${Date.now()}`,
    recordedAt: event.recordedAt || event.verifiedAt || new Date().toISOString(),
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

function queryConfiguration() {
  const query = new URLSearchParams(window.location.search);
  return {
    source: query.get("source") || "fixture",
    mutationBridge: query.get("mutationBridge") || "",
  };
}

async function responsePayload(response) {
  return response.json().catch(() => ({}));
}

async function requestOwnershipRepair(button) {
  const config = queryConfiguration();
  if (config.source !== "datahub" || !config.mutationBridge) {
    setFeedback(
      "No repair was claimed. Ownership requires the live DataHub source and the separate governed mutation bridge.",
    );
    return;
  }

  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = "Loading proposal…";
  try {
    const proposalResponse = await fetch(config.mutationBridge, {
      headers: { Accept: "application/json" },
    });
    const proposalPayload = await responsePayload(proposalResponse);
    if (!proposalResponse.ok || !proposalPayload.proposal) {
      throw new Error(
        proposalPayload?.error?.message || "Ownership proposal is unavailable.",
      );
    }
    const proposal = proposalPayload.proposal;
    const confirmed = window.confirm(
      [
        "Confirm governed DataHub ownership repair?",
        "",
        `Target: ${proposal.targetUrn}`,
        `Current owners: ${proposal.existingOwners.length ? proposal.existingOwners.join(", ") : "none"}`,
        `Proposed owner: ${proposal.proposedOwner}`,
        `Verification: ${proposal.verification}`,
      ].join("\n"),
    );
    if (!confirmed) {
      setFeedback("Ownership repair cancelled. DataHub was not changed.");
      return;
    }

    button.textContent = "Writing and verifying…";
    const repairResponse = await fetch(config.mutationBridge, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirmed: true,
        operation: proposal.operation,
        entityId: proposal.entityId,
        targetUrn: proposal.targetUrn,
      }),
    });
    const result = await responsePayload(repairResponse);
    if (!repairResponse.ok || result.verified !== true) {
      throw new Error(
        result?.error?.message ||
          "Ownership mutation did not pass read-after-write verification.",
      );
    }

    writeEvent(result.auditEvent);
    button.textContent = "Ownership verified";
    setFeedback(
      `ContextRepairEvent recorded. DataHub returned ${result.proposal.proposedOwner} on the verified re-read; refreshing the live Continuity state.`,
    );
    window.setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    button.disabled = false;
    button.textContent = originalLabel;
    setFeedback(
      `Ownership remains unresolved: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

document.addEventListener("click", async (event) => {
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
    await requestOwnershipRepair(button);
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
