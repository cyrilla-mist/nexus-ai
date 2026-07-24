import { generateProjectAnalysis } from "../../model/model-router.js";

export const projectAtlasDefinition = {
  id: "project-atlas",
  name: "Project Atlas",
  identity: "AI project navigation partner",
  mission:
    "Help users transform early ideas into structured and executable projects.",
  persona: ["rational", "curious", "challenging", "supportive"],
  workflow: [
    "understand",
    "explore",
    "design",
    "evaluate",
    "execute"
  ],
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

export function buildProjectAtlasTask({ message, context = {} }) {
  return {
    messages: [
      {
        role: "system",
        content: [
          "你是 Nexus AI 的 Project Atlas，负责把早期想法整理为审慎、可执行的项目分析。",
          "只输出一个 JSON 对象，不要输出 Markdown、代码围栏或 JSON 之外的文字。",
          "不得编造用户未提供的数据、证据、资源、用户反馈或市场结论。",
          "信息不足时必须写明“无法判断”，并优先提出必要的澄清问题。",
          "将用户提供的事实与模型推测明确分开；推测必须放入 assumptions 数组。",
          "必须包含且仅需确保以下顶层字段：ideaProfile、projectBlueprint、risks、clarificationQuestions、nextAction。",
          "ideaProfile 和 projectBlueprint 必须是对象；risks 和 clarificationQuestions 必须是数组；nextAction 必须是非空字符串。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            userIdea: String(message).trim(),
            providedContext: {
              goal: context?.goal ?? "无法判断",
              targetUsers: context?.targetUsers ?? "无法判断",
              availableResources: Array.isArray(context?.availableResources)
                ? context.availableResources
                : []
            },
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

function buildMockResult(message, context, modelResult) {
  const ideaSummary = summarizeIdea(message);
  const questions = [
    "你希望这个想法最终用于比赛、创业、课程项目，还是个人探索？",
    "你最想帮助的具体用户是谁？",
    "你目前已经具备哪些资源，例如团队、技术、数据或用户渠道？"
  ];
  const nextAction = "请先回答三个澄清问题，再进入项目探索阶段。";

  return {
    atlas: {
      id: projectAtlasDefinition.id,
      name: projectAtlasDefinition.name,
      version: "0.1.0-skeleton"
    },
    model: {
      mode: modelResult.mode,
      provider: modelResult.provider,
      model: modelResult.model,
      fallbackReason: modelResult.error
    },
    status: "needs_clarification",
    currentStage: "idea",
    ideaProfile: {
      summary: ideaSummary,
      goal: context?.goal ?? "",
      targetUsers: context?.targetUsers ?? "",
      availableResources: context?.availableResources ?? [],
      assumptions: []
    },
    projectBlueprint: {
      problem: "无法判断",
      proposedSolution: ideaSummary,
      valueProposition: "无法判断",
      validationPlan: ["补充目标用户与真实问题信息"],
      milestones: ["完成项目背景澄清", "生成第一版 Project Blueprint"]
    },
    risks: [
      {
        risk: "当前信息不足，暂时无法判断主要项目风险。",
        basis: "仅收到一条早期想法，缺少目标用户、资源和验证信息。",
        mitigation: "先回答 Project Atlas 的澄清问题。"
      }
    ],
    questions,
    clarificationQuestions: questions,
    preliminaryPlan: [
      "补充目标、用户与资源信息",
      "明确需要验证的真实问题",
      "生成第一版 Project Blueprint",
      "检查创新性、可行性与证据缺口",
      "制定下一步执行任务"
    ],
    nextStep: nextAction,
    nextAction
  };
}

function buildDeepSeekResult(data, modelResult) {
  return {
    atlas: {
      id: projectAtlasDefinition.id,
      name: projectAtlasDefinition.name,
      version: "0.1.0-deepseek"
    },
    model: {
      mode: modelResult.mode,
      provider: modelResult.provider,
      model: modelResult.model,
      fallbackReason: null
    },
    status: "analysis_ready",
    currentStage: "analysis",
    ideaProfile: data.ideaProfile,
    projectBlueprint: data.projectBlueprint,
    risks: data.risks,
    questions: data.clarificationQuestions,
    clarificationQuestions: data.clarificationQuestions,
    preliminaryPlan: Array.isArray(data.projectBlueprint?.milestones)
      ? data.projectBlueprint.milestones
      : [],
    nextStep: data.nextAction,
    nextAction: data.nextAction
  };
}

export async function runProjectAtlas({
  message,
  context = {},
  model = {}
}) {
  const task = buildProjectAtlasTask({ message, context });
  const modelResult = await generateProjectAnalysis({
    apiKey: model.apiKey,
    task,
    fetchImpl: model.fetchImpl,
    timeoutMs: model.timeoutMs
  });

  if (modelResult.mode === "deepseek") {
    return buildDeepSeekResult(modelResult.data, modelResult);
  }

  return buildMockResult(message, context, modelResult);
}
