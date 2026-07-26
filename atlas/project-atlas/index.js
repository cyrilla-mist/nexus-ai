import { createExecutionPlan } from "../../execution/index.js";
import { generateProjectAnalysis } from "../../model/model-router.js";
import { evaluateProjectStage } from "./stage.js";

export const MAX_PROJECT_TURNS = 3;

export const projectAtlasDefinition = {
  id: "project-atlas",
  name: "Project Atlas",
  identity: "AI project navigation partner",
  mission:
    "Help users transform early ideas into structured and executable projects.",
  persona: ["rational", "curious", "challenging", "supportive"],
  workflow: ["understand", "explore", "design", "evaluate", "execute"],
  boundaries: [
    "Do not invent evidence, users, data, or resources.",
    "Do not promise awards, commercial success, or technical feasibility.",
    "Ask for missing information before producing a final blueprint.",
    "Keep the human user as the final decision-maker."
  ]
};

function summarizeIdea(message) {
  const value = String(message).trim();
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeAnswers(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      question: String(item?.question ?? "").trim(),
      answer: String(item?.answer ?? "").trim()
    }))
    .filter((item) => item.question && item.answer);
}

function normalizeAnalysis(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    ideaProfile: isPlainObject(value.ideaProfile) ? value.ideaProfile : {},
    projectBlueprint: isPlainObject(value.projectBlueprint)
      ? value.projectBlueprint
      : {},
    risks: Array.isArray(value.risks) ? value.risks : [],
    clarificationQuestions: toStringArray(
      value.clarificationQuestions ?? value.questions
    ),
    nextAction: String(value.nextAction ?? value.nextStep ?? "").trim()
  };
}

function normalizeMemoryList(value, type) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (memory) =>
        isPlainObject(memory) &&
        memory.type === type &&
        isPlainObject(memory.data)
    )
    .map((memory) => ({
      id: String(memory.id ?? "").trim(),
      type,
      data: structuredClone(memory.data)
    }))
    .filter((memory) => memory.id);
}

function normalizeMemoryContext(value) {
  const memoryContext = isPlainObject(value) ? value : {};

  return {
    userMemory: normalizeMemoryList(memoryContext.userMemory, "user"),
    projectMemory: normalizeMemoryList(
      memoryContext.projectMemory,
      "project"
    ),
    atlasMemory: normalizeMemoryList(memoryContext.atlasMemory, "atlas")
  };
}

export function normalizeProjectContext(context = {}) {
  return {
    goal: String(context?.goal ?? "").trim(),
    targetUsers: String(context?.targetUsers ?? "").trim(),
    availableResources: toStringArray(context?.availableResources),
    clarificationAnswers: normalizeAnswers(context?.clarificationAnswers),
    previousAnalysis: normalizeAnalysis(context?.previousAnalysis),
    memoryContext: normalizeMemoryContext(context?.memoryContext),
    turn: Math.min(
      MAX_PROJECT_TURNS,
      Math.max(1, Number.parseInt(context?.turn, 10) || 1)
    )
  };
}

export function buildProjectAtlasTask({ message, context = {} }) {
  const normalizedContext = normalizeProjectContext(context);

  return {
    messages: [
      {
        role: "system",
        content: [
          "你是 Nexus AI 的 Project Atlas，负责把早期想法逐轮整理为审慎、可执行的项目分析。",
          "只输出一个 JSON 对象，不要输出 Markdown、代码围栏或 JSON 之外的文字。",
          "不得编造用户未提供的数据、证据、资源、用户反馈或市场结论。",
          "信息不足时必须写明“无法判断”，并优先提出必要的澄清问题。",
          "将用户提供的事实与模型推测明确分开；推测必须放入 assumptions 数组。",
          "已得到回答的问题不要重复询问；仅提出仍会实质影响项目方向的问题。",
          "存在 previousAnalysis 时，优先基于它更新 Blueprint，不要重新生成毫无关联的方案。",
          "必须包含顶层字段：ideaProfile、projectBlueprint、risks、clarificationQuestions、nextAction。",
          "ideaProfile 和 projectBlueprint 必须是对象；risks 和 clarificationQuestions 必须是数组；nextAction 必须是非空字符串。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            userIdea: String(message).trim(),
            sessionContext: normalizedContext,
            requestedSchema: {
              ideaProfile: {
                summary: "string",
                goal: "string",
                targetUsers: "string",
                knownFacts: ["string"],
                assumptions: ["string"]
              },
              projectBlueprint: {
                problem: "string",
                proposedSolution: "string",
                valueProposition: "string",
                validationPlan: ["string"],
                milestones: ["string"]
              },
              risks: [
                {
                  risk: "string",
                  basis: "string",
                  mitigation: "string"
                }
              ],
              clarificationQuestions: ["string"],
              nextAction: "string"
            }
          },
          null,
          2
        )
      }
    ]
  };
}

function answerFact({ question, answer }) {
  return `用户回答“${question}”：${answer}`;
}

function findAnswer(answers, pattern) {
  return answers.find((item) => pattern.test(item.question))?.answer ?? "";
}

function buildMockAnalysis(message, context) {
  const previous = context.previousAnalysis;
  const answers = context.clarificationAnswers;
  const projectMemory = context.memoryContext.projectMemory[0]?.data ?? {};
  const priorProfile = previous?.ideaProfile ?? {};
  const priorBlueprint = previous?.projectBlueprint ?? {};
  const ideaSummary =
    String(priorProfile.summary ?? "").trim() ||
    String(projectMemory.title ?? "").trim() ||
    summarizeIdea(message);
  const knownFacts = [
    ...toStringArray(priorProfile.knownFacts),
    ...(projectMemory.title
      ? [`Existing project: ${String(projectMemory.title).trim()}`]
      : []),
    ...(projectMemory.stage
      ? [`Existing project stage: ${String(projectMemory.stage).trim()}`]
      : []),
    ...answers.map(answerFact)
  ].filter((value, index, all) => all.indexOf(value) === index);
  const goalAnswer = findAnswer(answers, /(目标|最终|比赛|创业|课程|探索)/);
  const userAnswer = findAnswer(answers, /(用户|帮助谁|人群)/);
  const problemAnswer = findAnswer(answers, /(问题|痛点|困难|环节)/);
  const resourceAnswer = findAnswer(answers, /(资源|团队|技术|数据|渠道)/);
  const goal =
    goalAnswer ||
    String(priorProfile.goal ?? context.goal ?? "").trim() ||
    "无法判断";
  const targetUsers =
    userAnswer ||
    String(priorProfile.targetUsers ?? context.targetUsers ?? "").trim() ||
    "无法判断";
  const problem =
    problemAnswer ||
    String(priorBlueprint.problem ?? "").trim() ||
    "无法判断";
  const proposedSolution =
    String(priorBlueprint.proposedSolution ?? "").trim() || ideaSummary;
  const valueProposition =
    String(priorBlueprint.valueProposition ?? "").trim() || "无法判断";
  const validationPlan = toStringArray(priorBlueprint.validationPlan);
  const milestones = toStringArray(priorBlueprint.milestones);
  const baseQuestions = [
    "你希望这个想法最终用于比赛、创业、课程项目，还是个人探索？",
    "你最想帮助的具体用户是谁？",
    "这些用户当前最需要解决的具体问题是什么？",
    "你目前已经具备哪些资源，例如团队、技术、数据或用户渠道？"
  ];
  const answeredQuestions = new Set(answers.map((item) => item.question));
  let clarificationQuestions = baseQuestions.filter(
    (question) => !answeredQuestions.has(question)
  );

  if (context.turn > 1) {
    const followUps = [
      "你准备用什么方式验证目标用户确实需要这个方案？",
      "下一阶段最希望优先完成哪个可检查的成果？"
    ];
    clarificationQuestions = [
      ...clarificationQuestions,
      ...followUps.filter((question) => !answeredQuestions.has(question))
    ];
  }

  clarificationQuestions = clarificationQuestions.slice(
    0,
    context.turn >= MAX_PROJECT_TURNS ? 0 : 3
  );

  if (resourceAnswer) {
    knownFacts.push(`用户已说明当前资源：${resourceAnswer}`);
  }

  const nextAction =
    clarificationQuestions.length > 0
      ? "请回答仍未明确的澄清问题，Project Atlas 将继续细化项目。"
      : "整理现有结论，选择验证计划中的第一项任务开始执行。";

  return {
    ideaProfile: {
      summary: ideaSummary,
      goal,
      targetUsers,
      knownFacts: knownFacts.filter(
        (value, index, all) => all.indexOf(value) === index
      ),
      assumptions: toStringArray(priorProfile.assumptions)
    },
    projectBlueprint: {
      problem,
      proposedSolution,
      valueProposition,
      validationPlan:
        validationPlan.length > 0
          ? validationPlan
          : ["补充目标用户与真实问题信息后制定验证计划"],
      milestones:
        milestones.length > 0
          ? milestones
          : ["完成项目背景澄清", "生成第一版 Project Blueprint"]
    },
    risks:
      previous?.risks?.length > 0
        ? previous.risks
        : [
            {
              risk: "当前信息不足，主要项目风险仍需确认。",
              basis:
                answers.length > 0
                  ? "用户已补充部分信息，但关键验证证据仍然不足。"
                  : "仅收到早期想法，缺少目标用户、资源和验证信息。",
              mitigation: "继续回答澄清问题，并优先验证真实用户需求。"
            }
          ],
    clarificationQuestions,
    nextAction
  };
}

function buildAtlasResult(data, modelResult, context) {
  const stageProgress = evaluateProjectStage(data);
  const executionPlan = createExecutionPlan({
    stage: stageProgress.current,
    analysis: data,
    turn: context.turn
  });
  const needsClarification =
    data.clarificationQuestions.length > 0 &&
    context.turn < MAX_PROJECT_TURNS;

  return {
    atlas: {
      id: projectAtlasDefinition.id,
      name: projectAtlasDefinition.name,
      version: "0.1.1"
    },
    model: {
      mode: modelResult.mode,
      provider: modelResult.provider,
      model: modelResult.model,
      fallbackReason: modelResult.error
    },
    status: needsClarification ? "needs_clarification" : "analysis_ready",
    currentStage: stageProgress.current,
    stageProgress,
    executionPlan,
    turn: context.turn,
    maxTurns: MAX_PROJECT_TURNS,
    ideaProfile: data.ideaProfile,
    projectBlueprint: data.projectBlueprint,
    risks: data.risks,
    questions: data.clarificationQuestions,
    clarificationQuestions: data.clarificationQuestions,
    preliminaryPlan: toStringArray(data.projectBlueprint?.milestones),
    nextStep: data.nextAction,
    nextAction: data.nextAction
  };
}

export async function runProjectAtlas({
  message,
  context = {},
  model = {}
}) {
  const normalizedContext = normalizeProjectContext(context);
  const task = buildProjectAtlasTask({
    message,
    context: normalizedContext
  });
  const modelResult = await generateProjectAnalysis({
    apiKey: model.apiKey,
    task,
    fetchImpl: model.fetchImpl,
    timeoutMs: model.timeoutMs
  });
  const data =
    modelResult.mode === "deepseek"
      ? modelResult.data
      : buildMockAnalysis(message, normalizedContext);

  return buildAtlasResult(data, modelResult, normalizedContext);
}
