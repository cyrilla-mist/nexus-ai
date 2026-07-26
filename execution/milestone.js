import { createTask, getTask } from "./task.js";

export const MILESTONE_STATUSES = Object.freeze([
  "pending",
  "in_progress",
  "completed"
]);

const MILESTONE_TRANSITIONS = Object.freeze({
  pending: new Set(["pending", "in_progress"]),
  in_progress: new Set(["in_progress", "completed"]),
  completed: new Set(["completed"])
});

function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Milestone must be a plain object.");
  }
}

function normalizeText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

export function createMilestone({
  id,
  title,
  goal,
  status = "pending",
  tasks = []
} = {}) {
  if (!MILESTONE_STATUSES.includes(status)) {
    throw new TypeError(`Unsupported Milestone status: ${status}`);
  }

  if (!Array.isArray(tasks)) {
    throw new TypeError("Milestone tasks must be an array.");
  }

  const normalizedTasks = tasks.map((task) => createTask(task));
  const taskIds = normalizedTasks.map((task) => task.id);

  if (new Set(taskIds).size !== taskIds.length) {
    throw new TypeError("Milestone Task ids must be unique.");
  }

  return {
    id: normalizeText(id, "Milestone id"),
    title: normalizeText(title, "Milestone title"),
    goal: normalizeText(goal, "Milestone goal"),
    status,
    tasks: normalizedTasks
  };
}

export function getMilestone(milestone) {
  assertPlainObject(milestone);
  return structuredClone(createMilestone(milestone));
}

export function updateMilestoneStatus(milestone, status) {
  const current = getMilestone(milestone);

  if (!MILESTONE_STATUSES.includes(status)) {
    throw new TypeError(`Unsupported Milestone status: ${status}`);
  }

  if (!MILESTONE_TRANSITIONS[current.status].has(status)) {
    throw new TypeError(
      `Invalid Milestone status transition: ${current.status} -> ${status}`
    );
  }

  return {
    ...current,
    status
  };
}

export function addTaskToMilestone(milestone, task) {
  const current = getMilestone(milestone);
  const normalizedTask = getTask(task);

  if (current.tasks.some((item) => item.id === normalizedTask.id)) {
    throw new TypeError(
      `Milestone already contains Task: ${normalizedTask.id}`
    );
  }

  return {
    ...current,
    tasks: [...current.tasks, normalizedTask]
  };
}
