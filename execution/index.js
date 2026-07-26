import { createMilestone } from "./milestone.js";
import { createProjectState } from "./project-state.js";
import { createTask } from "./task.js";

const STAGE_CONFIGURATION = Object.freeze({
  Idea: {
    goal: "明确项目问题、目标用户和初步方向。",
    milestoneTitle: "完成项目定义",
    defaultTask: "补充项目问题和目标用户信息。",
    criteria: "项目问题和目标用户均已明确记录。"
  },
  Explore: {
    goal: "验证目标用户是否存在真实且值得解决的问题。",
    milestoneTitle: "完成问题验证",
    defaultTask: "开展一项目标用户需求验证。",
    criteria: "记录一项可追溯的用户或问题验证结果。"
  },
  Design: {
    goal: "形成范围明确、可以验证的解决方案。",
    milestoneTitle: "形成可验证方案",
    defaultTask: "明确解决方案范围和关键取舍。",
    criteria: "方案范围、核心价值和阶段里程碑已经记录。"
  },
  Validate: {
    goal: "通过 MVP 或测试验证最重要的项目假设。",
    milestoneTitle: "完成关键假设验证",
    defaultTask: "执行验证计划中的第一项测试。",
    criteria: "测试结果已记录，并能支持继续或调整的决定。"
  },
  Execute: {
    goal: "按已验证方向推进交付并复盘结果。",
    milestoneTitle: "交付当前阶段成果",
    defaultTask: "完成当前计划中的第一项交付任务。",
    criteria: "交付结果满足明确标准并完成一次复盘。"
  }
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function createExecutionPlan({
  stage,
  analysis = {},
  turn = 1,
  timestamp = new Date().toISOString()
} = {}) {
  const configuration = STAGE_CONFIGURATION[stage];

  if (!configuration) {
    throw new TypeError(`Unsupported execution stage: ${stage}`);
  }

  const normalizedTurn = Math.max(1, Number.parseInt(turn, 10) || 1);
  const blueprintMilestone = Array.isArray(
    analysis.projectBlueprint?.milestones
  )
    ? analysis.projectBlueprint.milestones.find(
        (item) => normalizeText(item)
      )
    : "";
  const nextAction =
    normalizeText(analysis.nextAction ?? analysis.nextStep) ||
    configuration.defaultTask;
  const stageKey = stage.toLowerCase();
  const task = createTask({
    id: `project-atlas-${stageKey}-turn-${normalizedTurn}-task-1`,
    title: nextAction,
    description: nextAction,
    rationale: `推进 ${stage} 阶段目标：${configuration.goal}`,
    criteria: configuration.criteria
  });
  const milestone = createMilestone({
    id: `project-atlas-${stageKey}-turn-${normalizedTurn}-milestone-1`,
    title:
      normalizeText(blueprintMilestone) ||
      configuration.milestoneTitle,
    goal: configuration.goal,
    tasks: [task]
  });
  const projectState = createProjectState({
    stage,
    status: "active",
    goal: configuration.goal,
    timestamp
  });

  return {
    ...projectState,
    milestone,
    tasks: milestone.tasks.map((item) => structuredClone(item))
  };
}
