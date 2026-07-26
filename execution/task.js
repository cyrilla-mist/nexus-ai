export const TASK_STATUSES = Object.freeze([
  "todo",
  "in_progress",
  "completed"
]);

const TASK_TRANSITIONS = Object.freeze({
  todo: new Set(["todo", "in_progress"]),
  in_progress: new Set(["in_progress", "completed"]),
  completed: new Set(["completed"])
});

function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Task must be a plain object.");
  }
}

function normalizeText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

export function createTask({
  id,
  title,
  description,
  rationale,
  criteria,
  status = "todo"
} = {}) {
  if (!TASK_STATUSES.includes(status)) {
    throw new TypeError(`Unsupported Task status: ${status}`);
  }

  return {
    id: normalizeText(id, "Task id"),
    title: normalizeText(title, "Task title"),
    description: normalizeText(description, "Task description"),
    rationale: normalizeText(rationale, "Task rationale"),
    criteria: normalizeText(criteria, "Task criteria"),
    status
  };
}

export function getTask(task) {
  assertPlainObject(task);
  return structuredClone(createTask(task));
}

export function updateTaskStatus(task, status) {
  const current = getTask(task);

  if (!TASK_STATUSES.includes(status)) {
    throw new TypeError(`Unsupported Task status: ${status}`);
  }

  if (!TASK_TRANSITIONS[current.status].has(status)) {
    throw new TypeError(
      `Invalid Task status transition: ${current.status} -> ${status}`
    );
  }

  return {
    ...current,
    status
  };
}
