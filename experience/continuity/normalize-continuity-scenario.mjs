function cloneScenario(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntity(entity, requestedAt) {
  const normalized = {
    ...entity,
    metadata: isObject(entity.metadata) ? { ...entity.metadata } : {},
  };

  normalized.createdAt ||= requestedAt;
  normalized.updatedAt ||= normalized.createdAt;

  if (
    normalized.type === "risk" &&
    normalized.metadata.signal === "missing-ownership"
  ) {
    normalized.metadata.missingOwner = true;
  }

  if (
    normalized.type === "external_asset" &&
    normalized.metadata.ownerMissing === true &&
    !normalized.ownerId
  ) {
    normalized.metadata.missingOwner = true;
  }

  return normalized;
}

export function normalizeContinuityScenario(input, options = {}) {
  if (!isObject(input)) {
    throw new TypeError("Invalid continuity scenario: expected an object.");
  }

  const scenario = cloneScenario(input);
  const requestedAt =
    scenario.reentryQuery?.requestedAt ||
    scenario.project?.updatedAt ||
    new Date().toISOString();

  scenario.project = {
    ...scenario.project,
    metadata: isObject(scenario.project?.metadata)
      ? { ...scenario.project.metadata }
      : {},
  };

  if (scenario.project?.lastActiveAt) {
    scenario.project.metadata.currentUpdatedAt = scenario.project.updatedAt;
    scenario.project.metadata.lastActiveAt = scenario.project.lastActiveAt;
  }

  scenario.entities = Array.isArray(scenario.entities)
    ? scenario.entities.map((entity) => normalizeEntity(entity, requestedAt))
    : [];

  scenario.relationships = Array.isArray(scenario.relationships)
    ? scenario.relationships.map((relationship) => ({
        ...relationship,
        createdAt: relationship.createdAt || requestedAt,
        metadata: isObject(relationship.metadata)
          ? { ...relationship.metadata }
          : {},
      }))
    : [];

  scenario.runtime = {
    ...(isObject(scenario.runtime) ? scenario.runtime : {}),
    normalizedAt: options.normalizedAt || new Date().toISOString(),
    sourceMode: options.sourceMode || "unknown",
    reentryFromAt:
      scenario.project?.lastActiveAt ||
      scenario.project?.updatedAt ||
      requestedAt,
  };

  return scenario;
}
