export const PROJECT_STAGES = [
  "Idea",
  "Explore",
  "Design",
  "Validate",
  "Execute"
];

const UNKNOWN_VALUES = new Set(["", "无法判断", "未知", "暂无"]);

function hasMeaningfulText(value) {
  return (
    typeof value === "string" &&
    !UNKNOWN_VALUES.has(value.trim()) &&
    value.trim().length > 1
  );
}

function hasMeaningfulItems(value) {
  return Array.isArray(value) && value.some(hasMeaningfulText);
}

function hasActionableValidation(value) {
  return (
    Array.isArray(value) &&
    value.some(
      (item) =>
        hasMeaningfulText(item) &&
        !/(补充.*后|待确认|尚未制定|无法判断)/.test(item)
    )
  );
}

function looksLikeExecutionAction(value) {
  if (!hasMeaningfulText(value)) {
    return false;
  }

  return /(开发|实现|制作|部署|上线|执行|完成|搭建|发布|build|implement|deploy)/i.test(
    value
  );
}

export function evaluateProjectStage(analysis = {}) {
  const profile = analysis.ideaProfile ?? {};
  const blueprint = analysis.projectBlueprint ?? {};
  const hasExploreSignals =
    hasMeaningfulText(profile.targetUsers) &&
    hasMeaningfulText(blueprint.problem);
  const hasDesignSignals =
    hasExploreSignals &&
    hasMeaningfulText(blueprint.proposedSolution) &&
    hasMeaningfulItems(blueprint.milestones);
  const hasValidationSignals =
    hasDesignSignals && hasActionableValidation(blueprint.validationPlan);
  const hasExecutionSignals =
    hasValidationSignals && looksLikeExecutionAction(analysis.nextAction);

  let currentIndex = 0;
  let rationale = "目标用户或需要解决的问题仍不清晰。";

  if (hasExploreSignals) {
    currentIndex = 1;
    rationale = "目标用户和需要解决的问题已经明确。";
  }

  if (hasDesignSignals) {
    currentIndex = 2;
    rationale = "初步解决方案和阶段里程碑已经形成。";
  }

  if (hasValidationSignals) {
    currentIndex = 3;
    rationale = "项目已经具备可执行的验证计划。";
  }

  if (hasExecutionSignals) {
    currentIndex = 4;
    rationale = "验证路径已具备，下一步行动已进入实施阶段。";
  }

  return {
    current: PROJECT_STAGES[currentIndex],
    completed: PROJECT_STAGES.slice(0, currentIndex),
    next:
      currentIndex < PROJECT_STAGES.length - 1
        ? PROJECT_STAGES[currentIndex + 1]
        : null,
    rationale
  };
}
