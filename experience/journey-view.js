import { PROJECT_STAGES } from "../execution/project-state.js";

function normalizeStage(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return (
    PROJECT_STAGES.find((stage) => stage.toLowerCase() === normalized) ??
    "Idea"
  );
}

function getStageStatus(index, currentIndex) {
  if (index < currentIndex) {
    return "completed";
  }

  if (index === currentIndex) {
    return "current";
  }

  if (index === currentIndex + 1) {
    return "next";
  }

  return "not_started";
}

export function createJourneyView(executionProgress = {}) {
  const stage = normalizeStage(
    typeof executionProgress === "string"
      ? executionProgress
      : executionProgress?.stage
  );
  const currentIndex = PROJECT_STAGES.indexOf(stage);
  const stages = PROJECT_STAGES.map((name, index) =>
    Object.freeze({
      name,
      status: getStageStatus(index, currentIndex)
    })
  );

  return Object.freeze({
    stages: Object.freeze(stages)
  });
}
