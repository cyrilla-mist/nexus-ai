export function createEmptyMemory() {
  return {
    user: {
      goals: [],
      preferences: {},
      capabilities: []
    },
    project: {
      title: "",
      stage: "idea",
      summary: "",
      nextAction: ""
    },
    decisions: [],
    atlasEvolution: {}
  };
}

export function normalizeMemory(memory) {
  const empty = createEmptyMemory();

  return {
    user: {
      ...empty.user,
      ...(memory?.user ?? {})
    },
    project: {
      ...empty.project,
      ...(memory?.project ?? {})
    },
    decisions: Array.isArray(memory?.decisions) ? memory.decisions : [],
    atlasEvolution:
      memory?.atlasEvolution && typeof memory.atlasEvolution === "object"
        ? memory.atlasEvolution
        : {}
  };
}

export function updateProjectMemory(memory, patch = {}) {
  const normalized = normalizeMemory(memory);

  return {
    ...normalized,
    project: {
      ...normalized.project,
      ...patch
    }
  };
}

export function appendDecision(memory, decision) {
  const normalized = normalizeMemory(memory);

  if (!decision?.summary) {
    return normalized;
  }

  return {
    ...normalized,
    decisions: [
      ...normalized.decisions,
      {
        summary: decision.summary,
        reason: decision.reason ?? "",
        createdAt: new Date().toISOString()
      }
    ]
  };
}
