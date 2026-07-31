import { readFile, writeFile } from "node:fs/promises";

const path = "frontend/continuity/reentry.js";

async function replaceExactly(source, before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected one replacement target, found ${occurrences}`);
  }
  return source.replace(before, after);
}

let source = await readFile(path, "utf8");

source = await replaceExactly(
  source,
  `function renderSignalLens(detail) {`,
  `function governanceActionForSignal(key) {\n  const actions = {\n    stale: "create-revalidation-task",\n    conflict: "confirm-decision",\n    missing: "repair-ownership",\n    valid: "confirm-inheritance",\n  };\n  return actions[key] || "review-action";\n}\n\nfunction renderSignalLens(detail) {`,
  "insert signal governance mapper",
);

source = await replaceExactly(
  source,
  `<button class="primary-instrument-action" type="button" data-prototype-action>Request Human Decision</button>`,
  `<button class="primary-instrument-action" type="button" data-prototype-action data-governance-action="${"${escapeHtml(governanceActionForSignal(detail.key))}"}" data-entity-id="${"${escapeHtml(detail.selectedId)}"}" data-decision-id="${"${escapeHtml(detail.affectedDecision?.id || \"\")}"}">Request Human Decision</button>`,
  "bind Signal Lens action",
);

source = await replaceExactly(
  source,
  `<button class="text-action" type="button" data-prototype-action>Review action</button>`,
  `<button class="text-action" type="button" data-prototype-action data-governance-action="review-action" data-entity-id="${"${escapeHtml(action.id)}"}">Review action</button>`,
  "bind action ledger record",
);

source = await replaceExactly(
  source,
  `<button class="primary-instrument-action" type="button" data-prototype-action>Request Human Decision</button>\n      <button class="secondary-action" type="button" data-review-evidence>Review evidence <span aria-hidden="true">→</span></button>`,
  `<button class="primary-instrument-action" type="button" data-prototype-action data-governance-action="confirm-decision" data-entity-id="${"${escapeHtml(pending.id)}"}" data-decision-id="${"${escapeHtml(affected?.id || \"\")}"}">Request Human Decision</button>\n      <button class="secondary-action" type="button" data-review-evidence>Review evidence <span aria-hidden="true">→</span></button>`,
  "bind Decision Gate action",
);

source = await replaceExactly(
  source,
  `  app.querySelectorAll("[data-prototype-action]").forEach((button) => button.addEventListener("click", () => {`,
  `  app.querySelectorAll("[data-prototype-action]:not([data-governance-action])").forEach((button) => button.addEventListener("click", () => {`,
  "exclude governed actions from prototype fallback",
);

await writeFile(path, source, "utf8");
console.log("Stable governance action attributes applied.");
