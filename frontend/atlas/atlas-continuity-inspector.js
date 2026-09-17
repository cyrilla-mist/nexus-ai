import { loadContinuityLiveSurfaceIfRequested } from "./atlas-continuity-live-read.js";

const CONTINUITY_URL = new URL("../../examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json", import.meta.url);
const CONTINUITY_VERSION = "nexus-atlas.continuity-product-surface.v0.1";

const main = document.querySelector("#atlas-main");
const inspector = document.querySelector("#context-inspector");
const inspectorContent = document.querySelector("#inspector-content");
const inspectorTitle = document.querySelector("#inspector-title");
const closeInspectorControl = document.querySelector("[data-close-inspector]");
const announcement = document.querySelector("#atlas-announcement");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).toUpperCase();
}

function assertSnapshot(value) {
  if (!value || value.version !== CONTINUITY_VERSION || value.projectRef !== "project:nexus-atlas") {
    throw new Error("Accepted Continuity snapshot is unavailable or outside the expected project scope.");
  }
  if (value.capabilities?.readOnly !== true || value.capabilities?.writeAllowed !== false) {
    throw new Error("Continuity snapshot exceeds the accepted Inspector read-only boundary.");
  }
  return Object.freeze(value);
}

async function loadSnapshot() {
  const liveRead = await loadContinuityLiveSurfaceIfRequested();
  if (liveRead) return liveRead.surface;

  const response = await fetch(CONTINUITY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Accepted Continuity snapshot unavailable (${response.status}).`);
  return assertSnapshot(await response.json());
}

function waitForContinuityDesk() {
  if (main?.querySelector(".continuity-grid")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Continuity Desk did not finish rendering."));
    }, 5000);
    const observer = new MutationObserver(() => {
      if (!main?.querySelector(".continuity-grid")) return;
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    observer.observe(main, { childList: true, subtree: true });
  });
}

function detailRows(rows) {
  return `<dl class="continuity-inspector-data">${rows.map(([label, value]) => `
    <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? "—")}</dd></div>`).join("")}</dl>`;
}

function panel(kicker, title, body, rows, note) {
  return `
    <section class="inspector-panel continuity-inspector-panel">
      <span class="inspector-kicker">${escapeHtml(kicker)}</span>
      <h2>${escapeHtml(title)}</h2>
      ${body ? `<p>${escapeHtml(body)}</p>` : ""}
      ${detailRows(rows)}
      <div class="continuity-inspector-note">
        <strong>READ-ONLY PROJECTED DETAIL</strong>
        <p>${escapeHtml(note)}</p>
      </div>
    </section>`;
}

function resumeDetail(surface) {
  return panel(
    "RESUME STATE",
    "Where Nexus says work can continue",
    surface.resumeState.activeObjective,
    [
      ["Trusted direction", surface.resumeState.trustedDirection],
      ["Next action", surface.resumeState.nextActionSummary],
      ["Action ref", surface.resumeState.nextActionRef],
      ["Continuity", surface.continuity.validity],
      ["Human authority", surface.continuity.humanAuthorityRequired ? "required" : "not required"],
    ],
    "All values are already present in the accepted browser projection. This Inspector does not propose or authorize another action.",
  );
}

function outcomeDetail(surface) {
  const outcome = surface.latestOutcome;
  if (!outcome) {
    return panel("LATEST OUTCOME", "No accepted Outcome", "No Outcome exists in this accepted snapshot.", [], "The Inspector does not infer success from execution attempts.");
  }
  return panel(
    "LATEST OUTCOME",
    outcome.verificationState,
    outcome.failureReason || "The accepted Outcome has no failure reason.",
    [
      ["Outcome ref", outcome.outcomeRef],
      ["Action ref", outcome.actionRef],
      ["Recorded", formatDateTime(outcome.recordedAt)],
      ["Verification state", outcome.verificationState],
    ],
    "Observed postcondition internals and raw provider payloads are intentionally absent from the browser projection.",
  );
}

function checkpointDetail(surface) {
  const checkpoint = surface.trustedCheckpoint;
  return panel(
    "TRUSTED CHECKPOINT",
    `Checkpoint v${checkpoint.version}`,
    "The latest accepted trusted-state summary available to this browser snapshot.",
    [
      ["Checkpoint ref", checkpoint.checkpointRef],
      ["Created", formatDateTime(checkpoint.createdAt)],
      ["Confirmation authority", checkpoint.confirmationAuthority],
      ["Evidence provider", checkpoint.evidenceCursor.provider],
      ["Evidence scope", checkpoint.evidenceCursor.scopeRef],
      ["Cursor type", checkpoint.evidenceCursor.cursorType],
      ["Captured", formatDateTime(checkpoint.evidenceCursor.capturedAt)],
    ],
    "Governing refs, provenance payloads and internal confirmation basis details are not exposed here.",
  );
}

function verificationDetail(surface) {
  const verification = surface.verification;
  const profiles = verification.sourceProfiles.length
    ? verification.sourceProfiles.map((item) => `${item.provider}/${item.profile} × ${item.count}`).join(", ")
    : "none in accepted snapshot";
  return panel(
    "CROSS-SOURCE VERIFICATION",
    `${verification.total} accepted checks`,
    "Verification remains evidence about postconditions; it is not converted into a durable Outcome by this browser.",
    [
      ["Verified", verification.states.verified],
      ["Failed", verification.states.failed],
      ["Indeterminate", verification.states.indeterminate],
      ["Source profiles", profiles],
    ],
    "Only aggregate browser-safe verification fields are available. No provider response is fetched from the Inspector.",
  );
}

function safetyDetail(surface) {
  const safety = surface.writebackSafety;
  return panel(
    "WRITE-BACK SAFETY",
    "Persistence boundary",
    "The browser can show accepted write-back policy state but cannot control persistence.",
    [
      ["Target ref", safety.targetRef],
      ["Provider kind", safety.providerKind],
      ["Durability", safety.durability],
      ["Retention", safety.retentionMode],
      ["Verified Outcome required", safety.requireVerifiedOutcomeForCheckpointAdvance ? "yes" : "no"],
      ["Exact read-after-write", safety.requireExactReadAfterWrite ? "yes" : "no"],
      ["Deletion allowed", safety.deletionAllowed ? "yes" : "no"],
    ],
    "No database identity, credentials, write controls or deletion controls are present in this Product Surface.",
  );
}

function historyOutcomeDetail(surface, index) {
  const record = surface.history.outcomes.records[index];
  if (!record) return null;
  return panel(
    "OUTCOME HISTORY",
    record.verificationState,
    "Bounded Outcome history summary.",
    [
      ["Outcome ref", record.outcomeRef],
      ["Action ref", record.actionRef],
      ["Recorded", formatDateTime(record.recordedAt)],
      ["Verification state", record.verificationState],
    ],
    "The full Outcome artifact is not available to this browser Inspector.",
  );
}

function historyCheckpointDetail(surface, index) {
  const record = surface.history.checkpoints.records[index];
  if (!record) return null;
  return panel(
    "CHECKPOINT HISTORY",
    `Checkpoint v${record.version}`,
    "Bounded Trusted Checkpoint history summary.",
    [
      ["Checkpoint ref", record.checkpointRef],
      ["Version", record.version],
      ["Created", formatDateTime(record.createdAt)],
      ["Next action ref", record.nextActionRef],
    ],
    "Trusted direction, objective, governing refs and provenance are not reconstructed from history summaries.",
  );
}

function detailFor(surface, key, index = null) {
  if (key === "resume") return resumeDetail(surface);
  if (key === "outcome") return outcomeDetail(surface);
  if (key === "checkpoint") return checkpointDetail(surface);
  if (key === "verification") return verificationDetail(surface);
  if (key === "safety") return safetyDetail(surface);
  if (key === "history-outcome") return historyOutcomeDetail(surface, index);
  if (key === "history-checkpoint") return historyCheckpointDetail(surface, index);
  return null;
}

function openInspector(surface, key, index = null) {
  const detail = detailFor(surface, key, index);
  inspectorTitle.textContent = "CONTINUITY DETAIL";
  inspector.classList.remove("is-closed");
  main.dataset.inspectorOpen = "true";
  if (!detail) {
    inspectorContent.innerHTML = `<p class="inspector-empty">This detail is not present in the accepted Continuity Product Surface. No raw-source fallback was attempted.</p>`;
    announcement.textContent = "Continuity detail unavailable. No fallback source was used.";
    return;
  }
  inspectorContent.innerHTML = detail;
  announcement.textContent = "Read-only Continuity detail opened.";
}

function closeInspector() {
  inspector.classList.add("is-closed");
  main.dataset.inspectorOpen = "false";
  inspectorContent.innerHTML = `<p class="inspector-empty">Select a Continuity summary to inspect its bounded projected detail.</p>`;
  announcement.textContent = "Continuity detail closed.";
}

function addInspectButton(container, key, label, index = null) {
  if (!container || container.querySelector(":scope > .continuity-detail-control")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "continuity-detail-control";
  button.dataset.continuityDetail = key;
  if (index !== null) button.dataset.continuityIndex = String(index);
  button.textContent = label;
  container.append(button);
}

function installControls(surface) {
  addInspectButton(main.querySelector(".continuity-resume-card"), "resume", "Inspect resume state");
  addInspectButton(main.querySelector(".continuity-outcome-card"), "outcome", "Inspect Outcome");
  addInspectButton(main.querySelector(".continuity-checkpoint-card"), "checkpoint", "Inspect checkpoint");
  addInspectButton(main.querySelector(".continuity-verification-card"), "verification", "Inspect verification");
  addInspectButton(main.querySelector(".continuity-safety-card"), "safety", "Inspect write-back safety");

  main.querySelectorAll(".continuity-history-grid > div:first-child .continuity-history-list li").forEach((item, index) => {
    addInspectButton(item, "history-outcome", "Inspect", index);
  });
  main.querySelectorAll(".continuity-history-grid > div:last-child .continuity-history-list li").forEach((item, index) => {
    addInspectButton(item, "history-checkpoint", "Inspect", index);
  });

  main.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-continuity-detail]");
    if (!control) return;
    const index = control.dataset.continuityIndex === undefined ? null : Number(control.dataset.continuityIndex);
    openInspector(surface, control.dataset.continuityDetail, index);
  });
}

async function startInspector() {
  if (window.location.hash.replace("#", "") !== "continuity") return;
  try {
    const [surface] = await Promise.all([loadSnapshot(), waitForContinuityDesk()]);
    installControls(surface);
    closeInspectorControl?.addEventListener("click", closeInspector);
  } catch (error) {
    inspectorTitle.textContent = "CONTINUITY DETAIL";
    inspectorContent.innerHTML = `<p class="inspector-empty">${escapeHtml(error?.message || "Continuity detail unavailable.")} No fallback source was used.</p>`;
  }
}

startInspector();
