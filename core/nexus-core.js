import { runProjectAtlas } from "../atlas/project-atlas/index.js";
import { normalizeMemory, updateProjectMemory } from "../memory/memory.js";
import { reflectOnResult } from "./reflection.js";
import { detectIntent, listAvailableAtlases, selectAtlas } from "./router.js";

function buildPlan(intentName) {
  if (intentName === "project_creation") {
    return [
      "Understand the user's idea and goal",
      "Route the task to Project Atlas",
      "Collect missing project context",
      "Prepare the next project-development stage"
    ];
  }

  return [
    "Clarify the user's goal",
    "Identify the required professional capability",
    "Recommend an available Atlas or explain the current limitation"
  ];
}

export async function runNexusCore(payload = {}) {
  const message = String(payload.message ?? "").trim();
  const memory = normalizeMemory(payload.memory);

  if (!message) {
    return {
      ok: false,
      error: {
        code: "EMPTY_MESSAGE",
        message: "Please provide an idea or goal for Nexus to understand."
      }
    };
  }

  const intent = detectIntent(message);
  const plan = buildPlan(intent.name);
  const atlasId = selectAtlas(intent.name);

  if (!atlasId) {
    return {
      ok: true,
      nexus: {
        stage: "clarification",
        intent,
        plan,
        selectedAtlas: null,
        availableAtlases: listAvailableAtlases()
      },
      response: {
        status: "needs_clarification",
        message:
          "我暂时无法确定应该调用哪个 Atlas。请说明你希望完成的目标，以及你目前所处的阶段。",
        questions: [
          "你最终想完成什么？",
          "这项任务属于项目、研究、写作，还是其他领域？"
        ],
        nextStep: "补充目标后，由 Nexus Core 重新规划和调度。"
      },
      memory
    };
  }

  let atlasResult;

  switch (atlasId) {
    case "project-atlas":
      atlasResult = await runProjectAtlas({
        message,
        context: payload.context ?? {}
      });
      break;
    default:
      throw new Error(`Atlas is registered but not implemented: ${atlasId}`);
  }

  const reflection = reflectOnResult(atlasResult);
  const updatedMemory = updateProjectMemory(memory, {
    summary: atlasResult.ideaProfile?.summary ?? memory.project.summary,
    stage: atlasResult.currentStage ?? memory.project.stage,
    nextAction: atlasResult.nextStep ?? memory.project.nextAction
  });

  return {
    ok: true,
    nexus: {
      stage: "routed",
      intent,
      plan,
      selectedAtlas: atlasId
    },
    response: atlasResult,
    reflection,
    memory: updatedMemory
  };
}
