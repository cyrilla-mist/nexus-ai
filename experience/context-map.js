function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values) {
  return values.map(normalizeText).find(Boolean) ?? "";
}

function createNodeId(type, value, index = 0) {
  const identifier = normalizeText(value) || String(index + 1);
  return `${type}:${identifier}`;
}

function createEdge(from, to, relation) {
  return Object.freeze({ from, to, relation });
}

function getProjectMemory(memoryContext) {
  const records = Array.isArray(memoryContext?.projectMemory)
    ? memoryContext.projectMemory
    : [];

  return records.find(
    (memory) =>
      isPlainObject(memory) &&
      memory.type === "project" &&
      isPlainObject(memory.data)
  ) ?? null;
}

function normalizeDecision(decision, index) {
  if (typeof decision === "string") {
    const title = normalizeText(decision);

    return title
      ? {
          id: createNodeId("decision", title, index),
          type: "decision",
          title,
          reason: "",
          source: "project_memory"
        }
      : null;
  }

  if (!isPlainObject(decision)) {
    return null;
  }

  const title = firstText(
    decision.answer,
    decision.decision,
    decision.statement,
    decision.title
  );

  if (!title) {
    return null;
  }

  return {
    id: createNodeId(
      "decision",
      firstText(decision.id, decision.candidateId, title),
      index
    ),
    type: "decision",
    title,
    reason: firstText(decision.reason, decision.question),
    source: firstText(decision.source, "project_memory")
  };
}

function normalizeTask(task, index) {
  if (!isPlainObject(task)) {
    return null;
  }

  const title = normalizeText(task.title);

  if (!title) {
    return null;
  }

  return {
    id: createNodeId("task", firstText(task.id, title), index),
    type: "task",
    title,
    status: firstText(task.status, "todo"),
    criteria: normalizeText(task.criteria)
  };
}

function getProgressTime(projectData, title) {
  const history = Array.isArray(projectData.history)
    ? projectData.history
    : [];
  const entry = history.find((item) => {
    if (!isPlainObject(item) || item.category !== "progress") {
      return false;
    }

    const content = item.content;
    const summary = isPlainObject(content)
      ? normalizeText(content.summary)
      : normalizeText(content);

    return summary === title;
  });

  return normalizeText(entry?.createdAt);
}

function hasContext(atlas, projectMemory, execution) {
  return (
    Object.keys(atlas).length > 0 ||
    Boolean(projectMemory) ||
    Object.keys(execution).length > 0
  );
}

export function createContextMap({
  atlasOutput = {},
  memoryContext = {},
  executionState
} = {}) {
  const atlas = isPlainObject(atlasOutput) ? atlasOutput : {};
  const execution = isPlainObject(executionState)
    ? executionState
    : isPlainObject(atlas.executionPlan)
      ? atlas.executionPlan
      : {};
  const projectMemory = getProjectMemory(memoryContext);

  if (!hasContext(atlas, projectMemory, execution)) {
    return Object.freeze({
      nodes: Object.freeze([]),
      edges: Object.freeze([])
    });
  }

  const projectData = projectMemory?.data ?? {};
  const profile = isPlainObject(atlas.ideaProfile)
    ? atlas.ideaProfile
    : {};
  const blueprint = isPlainObject(atlas.projectBlueprint)
    ? atlas.projectBlueprint
    : {};
  const nodes = [];
  const edges = [];
  const projectId = createNodeId(
    "project",
    firstText(projectMemory?.id, projectData.title, profile.summary, "current")
  );

  nodes.push({
    id: projectId,
    type: "project",
    title: firstText(
      projectData.title,
      profile.title,
      profile.summary,
      "未命名项目"
    ),
    summary: firstText(profile.summary, atlas.summary, blueprint.problem),
    status: firstText(
      execution.status,
      atlas.status,
      projectData.stage,
      "unknown"
    )
  });

  const problemTitle = firstText(
    blueprint.problem,
    profile.problem,
    atlas.problem
  );

  if (problemTitle) {
    const problemId = createNodeId("problem", problemTitle);
    nodes.push({
      id: problemId,
      type: "problem",
      title: problemTitle,
      source: "project_atlas"
    });
    edges.push(createEdge(projectId, problemId, "addresses"));
  }

  const decisions = Array.isArray(projectData.decisions)
    ? projectData.decisions
    : [];

  decisions.map(normalizeDecision).filter(Boolean).forEach((decision) => {
    nodes.push(decision);
    edges.push(createEdge(decision.id, projectId, "supports"));
  });

  const milestone = isPlainObject(execution.milestone)
    ? execution.milestone
    : null;
  let milestoneId = "";

  if (milestone && normalizeText(milestone.title)) {
    milestoneId = createNodeId(
      "milestone",
      firstText(milestone.id, milestone.title)
    );
    nodes.push({
      id: milestoneId,
      type: "milestone",
      title: normalizeText(milestone.title),
      status: firstText(milestone.status, "pending")
    });
  }

  const taskSource = Array.isArray(execution.tasks)
    ? execution.tasks
    : Array.isArray(milestone?.tasks)
      ? milestone.tasks
      : [];

  taskSource.map(normalizeTask).filter(Boolean).forEach((task) => {
    nodes.push(task);

    if (milestoneId) {
      edges.push(createEdge(milestoneId, task.id, "contains"));
    }
  });

  const progress = Array.isArray(projectData.progress)
    ? projectData.progress
    : [];

  progress.forEach((value, index) => {
    const title = normalizeText(value);

    if (!title) {
      return;
    }

    const progressId = createNodeId("progress", title, index);
    nodes.push({
      id: progressId,
      type: "progress",
      title,
      time: getProgressTime(projectData, title)
    });
    edges.push(createEdge(progressId, projectId, "updates"));
  });

  return Object.freeze({
    nodes: Object.freeze(nodes.map(Object.freeze)),
    edges: Object.freeze(edges)
  });
}
