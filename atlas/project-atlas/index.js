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

export async function runProjectAtlas({ message, context = {} }) {
  const ideaSummary = summarizeIdea(message);

  return {
    atlas: {
      id: projectAtlasDefinition.id,
      name: projectAtlasDefinition.name,
      version: "0.1.0-skeleton"
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
    questions: [
      "你希望这个想法最终用于比赛、创业、课程项目，还是个人探索？",
      "你最想帮助的具体用户是谁？",
      "你目前已经具备哪些资源，例如团队、技术、数据或用户渠道？"
    ],
    preliminaryPlan: [
      "补充目标、用户与资源信息",
      "明确需要验证的真实问题",
      "生成第一版 Project Blueprint",
      "检查创新性、可行性与证据缺口",
      "制定下一步执行任务"
    ],
    nextStep: "请先回答三个澄清问题，再进入项目探索阶段。"
  };
}
