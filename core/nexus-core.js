import { runProjectAtlas } from "../atlas/project-atlas/index.js";
import { createProjectMemoryCandidates } from "../memory/memory-candidate.js";
import { normalizeMemory, updateProjectMemory } from "../memory/memory.js";
import { MEMORY_TYPES } from "../memory/schema.js";
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

function emptyMemoryContext() {
  return {
    userMemory: [],
    projectMemory: [],
    atlasMemory: []
  };
}

async function retrieveMemoryContext(memoryManager, query) {
  if (!memoryManager) {
    return emptyMemoryContext();
  }

  if (typeof memoryManager.retrieveContext !== "function") {
    throw new TypeError(
      "runtime.memoryManager must provide retrieveContext()."
    );
  }

  return memoryManager.retrieveContext(query);
}

function ensureProjectMemory({
  memoryManager,
  projectId,
  message,
  reflection
}) {
  const normalizedProjectId = String(projectId ?? "").trim();

  if (normalizedProjectId) {
    return {
      projectId: normalizedProjectId,
      created: false
    };
  }

  if (
    !memoryManager ||
    typeof memoryManager.create !== "function" ||
    reflection?.passed !== true
  ) {
    return {
      projectId: null,
      created: false
    };
  }

  try {
    const memory = memoryManager.create({
      type: MEMORY_TYPES.PROJECT,
      data: {
        title: String(message ?? "").trim()
      }
    });

    return {
      projectId: memory.id,
      created: true
    };
  } catch (error) {
    return {
      projectId: null,
      created: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function updateProjectMemoryContext({
  memoryManager,
  projectId,
  atlasResult,
  reflection,
  context
}) {
  if (
    !memoryManager ||
    typeof memoryManager.updateMemoryFromCandidate !== "function"
  ) {
    return {
      attempted: 0,
      applied: 0,
      rejected: 0,
      results: []
    };
  }

  const candidates = createProjectMemoryCandidates({
    projectId,
    atlasResult,
    reflection,
    context
  });
  const results = candidates.map((candidate) => {
    try {
      const result = memoryManager.updateMemoryFromCandidate(candidate);

      return {
        candidateId: candidate.candidateId,
        category: candidate.category,
        updated: result.updated,
        allowed: result.policy.allowed,
        reason: result.policy.reason
      };
    } catch (error) {
      return {
        candidateId: candidate.candidateId,
        category: candidate.category,
        updated: false,
        allowed: false,
        reason: "memory_update_failed",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  return {
    attempted: results.length,
    applied: results.filter((result) => result.updated).length,
    rejected: results.filter((result) => !result.allowed).length,
    results
  };
}

export async function runNexusCore(payload = {}, runtime = {}) {
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
  const memoryContext = await retrieveMemoryContext(runtime.memoryManager, {
    projectId: payload.context?.projectId,
    userId: payload.context?.userId,
    atlasId
  });

  switch (atlasId) {
    case "project-atlas":
      atlasResult = await runProjectAtlas({
        message,
        context: {
          ...(payload.context ?? {}),
          memoryContext
        },
        model: runtime.model ?? {}
      });
      break;
    default:
      throw new Error(`Atlas is registered but not implemented: ${atlasId}`);
  }

  const reflection = reflectOnResult(atlasResult);
  const memoryTarget = ensureProjectMemory({
    memoryManager: runtime.memoryManager,
    projectId: payload.context?.projectId,
    message,
    reflection
  });
  const memoryUpdate = {
    ...updateProjectMemoryContext({
      memoryManager: runtime.memoryManager,
      projectId: memoryTarget.projectId,
      atlasResult,
      reflection,
      context: {
        ...(payload.context ?? {}),
        memoryContext
      }
    }),
    projectId: memoryTarget.projectId,
    created: memoryTarget.created,
    ...(memoryTarget.error ? { error: memoryTarget.error } : {})
  };
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
    memoryUpdate,
    memory: updatedMemory
  };
}
