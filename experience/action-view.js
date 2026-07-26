const UNKNOWN_VALUE = "无法判断";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAction(task) {
  if (!isPlainObject(task)) {
    return null;
  }

  const title = normalizeText(task.title);

  if (!title) {
    return null;
  }

  return Object.freeze({
    id: normalizeText(task.id),
    title,
    description: normalizeText(task.description) || title,
    why: normalizeText(task.rationale) || UNKNOWN_VALUE,
    criteria: normalizeText(task.criteria) || UNKNOWN_VALUE,
    status: normalizeText(task.status) || "todo"
  });
}

export function createActionView(executionPlan = {}) {
  const plan = isPlainObject(executionPlan) ? executionPlan : {};
  const milestone = isPlainObject(plan.milestone)
    ? plan.milestone
    : {};
  const tasks = Array.isArray(plan.tasks)
    ? plan.tasks
    : Array.isArray(milestone.tasks)
      ? milestone.tasks
      : [];
  const actions = tasks.map(normalizeAction).filter(Boolean);
  const primaryAction = actions[0];

  return Object.freeze({
    goal:
      normalizeText(milestone.goal) ||
      normalizeText(plan.goal) ||
      UNKNOWN_VALUE,
    actions: Object.freeze(actions),
    criteria: primaryAction?.criteria ?? UNKNOWN_VALUE
  });
}
