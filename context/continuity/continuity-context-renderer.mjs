const SECTION_DEFINITIONS = Object.freeze([
  ["meaningfulChanges", "WHAT CHANGED"],
  ["confirmedDecisions", "CONFIRMED DECISIONS"],
  ["conflicts", "CONFLICTS REQUIRING ATTENTION"],
  ["risks", "RISKS"],
  ["recommendedActions", "RECOMMENDED ACTIONS"],
]);

function clean(value) {
  return String(value ?? "").replaceAll(/\s+/g, " ").trim();
}

function lineForItem(section, item) {
  const evidence = item.evidenceRefs?.length
    ? ` [evidence: ${item.evidenceRefs.join(", ")}]`
    : "";
  const status = clean(item.status || item.recordedStatus);
  const statusText = status ? ` (${status})` : "";
  const human =
    section === "conflicts" && item.requiresHumanDecision
      ? " [REQUIRES HUMAN DECISION]"
      : "";
  const ownership =
    section === "risks" && item.ownerMissing
      ? " [OWNER MISSING]"
      : "";
  const current =
    section === "recommendedActions" && item.currentEvidenceStatus
      ? ` Current evidence: ${clean(item.currentEvidenceStatus)}.`
      : "";
  return `- ${clean(item.title)}${statusText}${human}${ownership}: ${clean(
    item.summary || item.rationale,
  )}.${current}${evidence}`;
}

export function formatContinuityContextBlock(brief) {
  const lines = [
    "PROJECT",
    clean(brief.project.name),
    `State: ${clean(brief.project.state)}`,
    `Continuity score: ${brief.project.continuityScore}/100`,
    "",
  ];

  for (const [key, heading] of SECTION_DEFINITIONS) {
    lines.push(heading);
    const items = Array.isArray(brief[key]) ? brief[key] : [];
    if (items.length === 0) {
      lines.push("- None recorded.");
    } else {
      lines.push(...items.map((item) => lineForItem(key, item)));
    }
    lines.push("");
  }

  lines.push("EVIDENCE REFERENCES");
  if (brief.evidenceReferences.length === 0) {
    lines.push("- None included.");
  } else {
    for (const reference of brief.evidenceReferences) {
      const relationship = reference.relationship
        ? ` · ${clean(reference.relationship)}`
        : "";
      lines.push(
        `- [${reference.id}] ${clean(reference.type)} · ${clean(
          reference.title,
        )}${relationship}`,
      );
    }
  }
  lines.push("");
  lines.push("SOURCE");
  lines.push(
    `${clean(brief.source.type)} · ${
      brief.source.readOnly ? "read-only" : "write-enabled"
    }`,
  );
  return lines.join("\n").trim();
}

export function renderContinuityContextBlock(brief, options = {}) {
  const text = formatContinuityContextBlock(brief);
  const maxChars =
    options.maxChars ?? brief?.diagnostics?.budget?.maxChars ?? 9000;
  if (!Number.isInteger(maxChars) || maxChars < 2000 || maxChars > 20000) {
    const error = new Error(
      "Continuity context maxChars must be an integer from 2000 to 20000.",
    );
    error.name = "ContinuityContextProviderError";
    error.code = "CONTEXT_BUDGET_INVALID";
    throw error;
  }
  if (text.length > maxChars) {
    const error = new Error(
      "Continuity context cannot fit within the requested character budget.",
    );
    error.name = "ContinuityContextProviderError";
    error.code = "CONTEXT_BUDGET_UNSATISFIABLE";
    throw error;
  }
  return text;
}
