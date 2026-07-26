export const PROJECT_STAGES = Object.freeze([
  "Idea",
  "Explore",
  "Design",
  "Validate",
  "Execute"
]);

export const PROJECT_STATUSES = Object.freeze([
  "active",
  "paused",
  "completed"
]);

function assertPlainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be a plain object.`);
  }
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
}

function assertTimestamp(value, name) {
  assertNonEmptyString(value, name);

  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${name} must be a valid timestamp.`);
  }
}

function normalizeState(state) {
  assertPlainObject(state, "Project State");

  if (!PROJECT_STAGES.includes(state.stage)) {
    throw new TypeError(`Unsupported project stage: ${state.stage}`);
  }

  if (!PROJECT_STATUSES.includes(state.status)) {
    throw new TypeError(`Unsupported project status: ${state.status}`);
  }

  assertNonEmptyString(state.goal, "Project State goal");
  assertTimestamp(state.createdAt, "Project State createdAt");
  assertTimestamp(state.updatedAt, "Project State updatedAt");

  return {
    stage: state.stage,
    status: state.status,
    goal: state.goal.trim(),
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
}

export function createProjectState({
  stage = "Idea",
  status = "active",
  goal,
  timestamp = new Date().toISOString()
} = {}) {
  return normalizeState({
    stage,
    status,
    goal,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export function getProjectState(state) {
  return structuredClone(normalizeState(state));
}

export function updateProjectState(
  state,
  patch = {},
  timestamp = new Date().toISOString()
) {
  assertPlainObject(patch, "Project State patch");
  const current = normalizeState(state);

  return normalizeState({
    ...current,
    stage: patch.stage ?? current.stage,
    status: patch.status ?? current.status,
    goal: patch.goal ?? current.goal,
    updatedAt: timestamp
  });
}
