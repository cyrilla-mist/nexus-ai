import { PROJECT_STAGES } from "./project-state.js";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalStage(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return (
    PROJECT_STAGES.find((stage) => stage.toLowerCase() === normalized) ?? ""
  );
}

function normalizeMilestone(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: String(value.id ?? "").trim(),
    title: String(value.title ?? "").trim(),
    status: String(value.status ?? "").trim()
  };
}

function normalizeTasks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isPlainObject)
    .map((task) => ({
      id: String(task.id ?? "").trim(),
      title: String(task.title ?? "").trim(),
      criteria: String(task.criteria ?? "").trim(),
      status: String(task.status ?? "").trim()
    }));
}

export function reflectOnExecutionProgress(value) {
  if (value === undefined || value === null) {
    return {
      passed: true,
      skipped: true,
      issues: [],
      progress: null
    };
  }

  const issues = [];

  if (!isPlainObject(value)) {
    return {
      passed: false,
      skipped: false,
      issues: ["Execution progress must be a plain object."],
      progress: null
    };
  }

  const progress = {
    confirmed: value.confirmed === true,
    stage: canonicalStage(value.stage),
    milestone: normalizeMilestone(value.milestone),
    tasks: normalizeTasks(value.tasks)
  };

  if (!progress.confirmed) {
    issues.push("Execution progress must be explicitly confirmed.");
  }

  if (value.stage !== undefined && !progress.stage) {
    issues.push("Execution progress stage is invalid.");
  }

  if (
    progress.milestone?.status === "completed" &&
    (!progress.milestone.id || !progress.milestone.title)
  ) {
    issues.push(
      "A completed Milestone requires both an id and a title."
    );
  }

  progress.tasks
    .filter((task) => task.status === "completed")
    .forEach((task) => {
      if (!task.id || !task.title || !task.criteria) {
        issues.push(
          "A completed Task requires an id, title, and completion criteria."
        );
      }
    });

  return {
    passed: issues.length === 0,
    skipped: false,
    issues,
    progress
  };
}
