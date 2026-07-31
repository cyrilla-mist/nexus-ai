import { validateLocalBridgeUrl } from "../../experience/continuity/local-bridge-url.mjs";

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
  const source = query.get("source") || "fixture";
  const rawMutationBridge = query.get("mutationBridge") || "";
  return {
    source,
    mutationBridge:
      source === "datahub" && rawMutationBridge
        ? validateLocalBridgeUrl(rawMutationBridge, "mutation")
        : "",
  };
}

async function responsePayload(response) {
  return response.json().catch(() => ({}));
}

function ensureGovernanceSheet() {
  let dialog = document.querySelector("#governance-confirmation-sheet");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "governance-confirmation-sheet";
  dialog.className = "governance-sheet";
  dialog.setAttribute("aria-labelledby", "governance-sheet-title");
  dialog.innerHTML = `
    <form method="dialog" class="governance-sheet__form">
      <header class="governance-sheet__header">
        <div>
          <p>ATLAS GOVERNANCE</p>
          <h2 id="governance-sheet-title">Confirm context repair</h2>
        </div>
        <button class="governance-sheet__close" type="submit" value="cancel" aria-label="Cancel ownership repair">×</button>
      </header>
      <section class="governance-sheet__body">
        <p class="governance-sheet__summary">Review the exact DataHub mutation before it is submitted. Nexus will not close the signal until a fresh read verifies the result.</p>
        <dl class="governance-sheet__data">
          <div><dt>Operation</dt><dd data-governance-operation></dd></div>
          <div><dt>Target</dt><dd data-governance-target></dd></div>
          <div><dt>Current owners</dt><dd data-governance-current></dd></div>
          <div><dt>Proposed owner</dt><dd data-governance-proposed></dd></div>
        </dl>
        <section class="governance-sheet__verification">
          <span>VERIFICATION CONTRACT</span>
          <strong data-governance-verification></strong>
        </section>
        <p class="governance-sheet__warning">This action changes governed DataHub metadata. Cancelling leaves the current ownership state unchanged.</p>
      </section>
      <footer class="governance-sheet__footer">
        <button type="submit" value="cancel">Cancel</button>
        <button class="governance-sheet__confirm" type="submit" value="confirm">Confirm ownership update</button>
      </footer>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

function proposalText(dialog, selector, value) {
  const element = dialog.querySelector(selector);
  if (element) element.textContent = value;
}

function confirmOwnershipProposal(proposal) {
  if (typeof HTMLDialogElement === "undefined") {
    return Promise.resolve(
      window.confirm(
        `Confirm ${proposal.operation} for ${proposal.targetUrn}?\nProposed owner: ${proposal.proposedOwner}\nVerification: ${proposal.verification}`,
      ),
    );
  }

  const dialog = ensureGovernanceSheet();
  proposalText(dialog, "[data-governance-operation]", proposal.operation);
  proposalText(dialog, "[data-governance-target]", proposal.targetUrn);
  proposalText(
    dialog,
    "[data-governance-current]",
    proposal.existingOwners?.length ? proposal.existingOwners.join(", ") : "None",
  );
  proposalText(dialog, "[data-governance-proposed]", proposal.proposedOwner);
  proposalText(dialog, "[data-governance-verification]", proposal.verification);

  return new Promise((resolve) => {
    const onClose = () => resolve(dialog.returnValue === "confirm");
    dialog.addEventListener("close", onClose, { once: true });
    dialog.showModal();
  });
}

async function requestOwnershipRepair(button) {
  let config;
  try {
    config = queryConfiguration();
  } catch (error) {
    setFeedback(
      `Ownership repair is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

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
    const confirmed = await confirmOwnershipProposal(proposal);
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
        proposalId: proposal.proposalId,
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
  } finally {
    if (button.textContent === "Loading proposal…") {
      button.disabled = false;
      button.textContent = originalLabel;
    }
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
