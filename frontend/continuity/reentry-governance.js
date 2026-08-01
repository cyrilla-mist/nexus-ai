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

function feedbackElement(button) {
  const scoped = button
    ?.closest(".signal-lens, .decision-gate, .action-record, .workspace-view")
    ?.querySelector(".prototype-feedback");
  return scoped || document.querySelector(".prototype-feedback");
}

function setFeedback(message, button) {
  const feedback = feedbackElement(button);
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
        <button class="governance-sheet__confirm" type="submit" value="confirm">Confirm repair proposal</button>
      </footer>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

function sheetFocusableElements(dialog) {
  return [...dialog.querySelectorAll(
    'button:not([disabled]):not([hidden]), [href], input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getClientRects().length > 0);
}

function proposalText(dialog, selector, value) {
  const element = dialog.querySelector(selector);
  if (element) element.textContent = value;
}

function confirmOwnershipProposal(proposal, triggerButton) {
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
    let settled = false;
    const cleanup = () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("keydown", onKeydown);
      dialog.removeEventListener("close", onClose);
    };
    const finish = (reason) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        confirmed: dialog.returnValue === "confirm",
        reason,
      });
    };
    const onCancel = (event) => {
      event.preventDefault();
      if (dialog.open) dialog.close("cancel");
    };
    const onKeydown = (event) => {
      if (event.key !== "Tab") return;
      const focusable = sheetFocusableElements(dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onClose = () => {
      const reason = dialog.returnValue === "confirm" ? "confirm" : dialog.returnValue === "cancel" ? "cancel" : "close";
      finish(reason);
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("keydown", onKeydown);
    dialog.addEventListener("close", onClose);
    try {
      dialog.showModal();
      window.requestAnimationFrame(() => {
        if (!dialog.open) return;
        const cancel = dialog.querySelector('.governance-sheet__footer button[value="cancel"]');
        const close = dialog.querySelector(".governance-sheet__close");
        (cancel || close || sheetFocusableElements(dialog)[0])?.focus();
      });
    } catch (error) {
      cleanup();
      throw error;
    }
  });
}

async function requestOwnershipRepair(button) {
  let config;
  try {
    config = queryConfiguration();
  } catch (error) {
    setFeedback(
      `Ownership repair is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      button,
    );
    return;
  }

  if (config.source !== "datahub" || !config.mutationBridge) {
    setFeedback(
      "No repair was claimed. Ownership requires the live DataHub source and the separate governed mutation bridge.",
      button,
    );
    return;
  }

  const originalLabel = button.textContent;
  const restoreButton = () => {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = originalLabel;
  };
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
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
    button.removeAttribute("aria-busy");
    button.textContent = originalLabel;
    const confirmation = await confirmOwnershipProposal(proposal, button);
    if (!confirmation.confirmed) {
      restoreButton();
      if (button.isConnected) button.focus();
      setFeedback("Ownership repair cancelled. DataHub was not changed.", button);
      return;
    }

    button.textContent = proposal.alreadyApplied
      ? "Verifying existing ownership…"
      : "Writing and verifying…";
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
      button,
    );
    window.setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    restoreButton();
    if (button.isConnected) button.focus();
    setFeedback(
      `Ownership remains unresolved: ${error instanceof Error ? error.message : String(error)}`,
      button,
    );
  } finally {
    if (button.getAttribute("aria-busy") === "true") restoreButton();
  }
}

function confirmDecision(button) {
  const entityId = button.dataset.entityId || "risk-agent-roadmap-conflict";
  const decisionId = button.dataset.decisionId || "decision-benchmark-first";
  writeEvent({
    type: "decision_confirmation",
    projectId: "project-verity",
    entityId,
    decisionId,
    resolution: "keep-benchmark-first",
    summary:
      "Human confirmed Benchmark-first and prevented the superseded feature-expansion memory from being inherited.",
  });
  button.disabled = true;
  button.textContent = "Decision confirmed";
  setFeedback(
    "DecisionConfirmationEvent recorded locally. Both agent memories remain traceable; Benchmark-first is inherited.",
    button,
  );
}

function createRevalidationTask(button) {
  const entityId = button.dataset.entityId || "risk-stale-v046-results";
  writeEvent({
    type: "revalidation_task_created",
    projectId: "project-verity",
    entityId,
    actionId: "task-rerun-stale-samples",
    summary: "Created a revalidation task for evidence generated before v0.4.7.",
  });
  setFeedback("Revalidation task recorded in the local Nexus audit ledger.", button);
}

function confirmInheritance(button) {
  writeEvent({
    type: "context_inheritance_confirmation",
    projectId: "project-verity",
    entityId: button.dataset.entityId || "",
    summary: "Human confirmed the selected context as safe to inherit.",
  });
  setFeedback("Context inheritance confirmation recorded locally.", button);
}

function reviewAction(button) {
  writeEvent({
    type: "action_reviewed",
    projectId: "project-verity",
    entityId: button.dataset.entityId || "",
    summary: "The user reviewed a recommended action without changing governed state.",
  });
  setFeedback("Action review recorded locally. No external write was performed.", button);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-governance-action]");
  if (!button) return;

  const action = button.dataset.governanceAction;
  if (action === "confirm-decision") {
    confirmDecision(button);
    return;
  }
  if (action === "repair-ownership") {
    await requestOwnershipRepair(button);
    return;
  }
  if (action === "create-revalidation-task") {
    createRevalidationTask(button);
    return;
  }
  if (action === "confirm-inheritance") {
    confirmInheritance(button);
    return;
  }
  if (action === "review-action") {
    reviewAction(button);
    return;
  }

  setFeedback(`Unsupported governance action: ${action || "missing"}.`, button);
});
