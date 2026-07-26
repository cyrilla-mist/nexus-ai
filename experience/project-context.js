import { PROJECT_STAGES } from "../execution/project-state.js";

const UNKNOWN_VALUE = "无法判断";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values) {
  return values.map(normalizeText).find(Boolean) ?? "";
}

function normalizeStage(value) {
  const normalized = normalizeText(value).toLowerCase();

  return (
    PROJECT_STAGES.find((stage) => stage.toLowerCase() === normalized) ??
    "Idea"
  );
}

function getProjectMemory(memoryContext) {
  const projectMemory = Array.isArray(memoryContext?.projectMemory)
    ? memoryContext.projectMemory
    : [];

  return isPlainObject(projectMemory[0]?.data)
    ? projectMemory[0].data
    : {};
}

export function createProjectContext({
  atlasOutput = {},
  memoryContext = {},
  executionState = {}
} = {}) {
  const atlas = isPlainObject(atlasOutput) ? atlasOutput : {};
  const profile = isPlainObject(atlas.ideaProfile)
    ? atlas.ideaProfile
    : {};
  const blueprint = isPlainObject(atlas.projectBlueprint)
    ? atlas.projectBlueprint
    : {};
  const execution = isPlainObject(executionState) ? executionState : {};
  const projectMemory = getProjectMemory(memoryContext);
  const summary = firstText(
    profile.summary,
    projectMemory.title,
    atlas.summary
  );
  const title = firstText(projectMemory.title, summary, "未命名项目");

  return Object.freeze({
    title,
    description:
      firstText(blueprint.problem, atlas.description, summary) ||
      UNKNOWN_VALUE,
    stage: normalizeStage(
      firstText(execution.stage, projectMemory.stage, atlas.currentStage)
    ),
    goal:
      firstText(execution.goal, profile.goal, atlas.goal) || UNKNOWN_VALUE,
    summary: summary || UNKNOWN_VALUE
  });
}
