const PROJECT_MEMORY_TYPE = "project";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function stableHash(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getCurrentProjectMemory(memoryContext, projectId) {
  const projects = Array.isArray(memoryContext?.projectMemory)
    ? memoryContext.projectMemory
    : [];

  return projects.find((memory) => memory?.id === projectId) ?? null;
}

export function createProjectMemoryCandidates({
  projectId,
  atlasResult,
  reflection,
  context = {},
  clock = () => new Date().toISOString()
} = {}) {
  const normalizedProjectId = String(projectId ?? "").trim();

  if (
    !normalizedProjectId ||
    reflection?.passed !== true ||
    !isPlainObject(atlasResult)
  ) {
    return [];
  }

  const turn = Math.max(1, Number.parseInt(context.turn, 10) || 1);
  const createdAt = clock();
  const answers = normalizeAnswers(context.clarificationAnswers);
  const candidates = answers.map(({ question, answer }) => {
    const fingerprint = stableHash(`${question}\n${answer}`);

    return {
      candidateId:
        `${normalizedProjectId}:decision:turn-${turn}:${fingerprint}`,
      recordId: normalizedProjectId,
      type: PROJECT_MEMORY_TYPE,
      category: "decision",
      content: {
        question,
        answer
      },
      confidence: "high",
      source: "user_confirmed",
      evidence: [
        {
          kind: "clarification_answer",
          reference: `turn-${turn}`
        }
      ],
      turn,
      createdAt
    };
  });

  const currentMemory = getCurrentProjectMemory(
    context.memoryContext,
    normalizedProjectId
  );
  const currentStage = String(currentMemory?.data?.stage ?? "").trim();
  const nextStage = String(atlasResult.currentStage ?? "").trim();
  const modelMode = String(atlasResult.model?.mode ?? "").trim();

  if (nextStage && nextStage !== currentStage) {
    const source =
      modelMode === "fallback" ? "fallback_generated" : "system_verified";

    candidates.push({
      candidateId:
        `${normalizedProjectId}:stage_change:turn-${turn}:` +
        stableHash(`${currentStage}\n${nextStage}`),
      recordId: normalizedProjectId,
      type: PROJECT_MEMORY_TYPE,
      category: "stage_change",
      content: {
        from: currentStage,
        to: nextStage
      },
      confidence: "high",
      source,
      evidence: [
        {
          kind: "reflection",
          reference: `turn-${turn}`
        }
      ],
      turn,
      createdAt
    });
  }

  return candidates;
}
