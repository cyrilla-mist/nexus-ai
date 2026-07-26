const ALLOWED_PROJECT_CATEGORIES = new Set([
  "decision",
  "stage_change",
  "progress"
]);
const ALLOWED_PROGRESS_KINDS = new Set([
  "stage_change",
  "milestone_completed",
  "task_completed"
]);

function hasContent(value) {
  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function reject(reason) {
  return {
    allowed: false,
    reason
  };
}

export function evaluateMemoryCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return reject("invalid_candidate");
  }

  if (candidate.type !== "project") {
    return reject("unsupported_memory_type");
  }

  if (
    typeof candidate.candidateId !== "string" ||
    !candidate.candidateId.trim() ||
    typeof candidate.recordId !== "string" ||
    !candidate.recordId.trim()
  ) {
    return reject("missing_candidate_identity");
  }

  if (!ALLOWED_PROJECT_CATEGORIES.has(candidate.category)) {
    return reject("unsupported_category");
  }

  if (!hasContent(candidate.content)) {
    return reject("empty_content");
  }

  if (candidate.confidence !== "high") {
    return reject("insufficient_confidence");
  }

  if (candidate.category === "progress") {
    if (candidate.source !== "execution_confirmed") {
      return reject("progress_requires_execution_confirmation");
    }

    const kind = String(candidate.content.kind ?? "").trim();
    const summary = String(candidate.content.summary ?? "").trim();

    if (!ALLOWED_PROGRESS_KINDS.has(kind) || !summary) {
      return reject("invalid_progress_content");
    }

    return {
      allowed: true,
      reason: "execution_progress_confirmed"
    };
  }

  if (candidate.category === "decision") {
    const decision =
      typeof candidate.content === "string"
        ? candidate.content.trim()
        : String(
            candidate.content.answer ?? candidate.content.statement ?? ""
          ).trim();

    if (!decision) {
      return reject("invalid_decision_content");
    }

    return candidate.source === "user_confirmed"
      ? { allowed: true, reason: "user_confirmed_decision" }
      : reject("decision_requires_user_confirmation");
  }

  const nextStage = String(candidate.content.to ?? "").trim();

  if (!nextStage) {
    return reject("invalid_stage_change_content");
  }

  if (
    candidate.source === "user_confirmed" ||
    candidate.source === "system_verified"
  ) {
    return {
      allowed: true,
      reason: "verified_stage_change"
    };
  }

  return reject("stage_change_requires_verified_source");
}
