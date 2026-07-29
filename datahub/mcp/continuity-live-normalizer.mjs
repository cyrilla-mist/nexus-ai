export const CONTINUITY_PROJECT_ID = "project-nexus-ai";
export const CONTINUITY_NAMESPACE =
  "nexus.continuity.project-nexus-ai";
export const CONTINUITY_URN_PREFIX =
  "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.continuity.project-nexus-ai.";
export const CONTINUITY_PROJECT_URN =
  `${CONTINUITY_URN_PREFIX}project,DEV)`;

const DATASET_URN_PATTERN =
  /urn:li:dataset:\(urn:li:dataPlatform:nexus,nexus\.continuity\.[^)]+\)/g;
const JSON_PROPERTIES = new Set([
  "nexusSource",
  "nexusMetadata",
  "nexusIncomingRelationships",
  "nexusOutgoingRelationships",
  "nexusReentryQuery",
  "nexusRecommendedActions",
]);
const NUMBER_PROPERTIES = new Set([
  "confidence",
  "nexusConfidence",
  "nexusEntityCount",
  "nexusRelationshipCount",
  "nexusMeaningfulChanges",
  "nexusStaleRecords",
  "nexusAgentConflicts",
  "nexusMissingOwners",
  "nexusValidDecisions",
]);
const BOOLEAN_PROPERTIES = new Set(["nexusIsFixture"]);

export class ContinuityLiveReadError extends Error {
  constructor(message, code = "CONTINUITY_LIVE_READ_ERROR", options = {}) {
    super(message, options);
    this.name = "ContinuityLiveReadError";
    this.code = code;
  }
}

export function toolResultValue(result) {
  if (result?.structuredContent !== undefined) return result.structuredContent;
  const texts = (result?.content || [])
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean);
  if (!texts.length) return result ?? {};
  if (texts.length === 1) {
    try {
      return JSON.parse(texts[0]);
    } catch {
      return texts[0];
    }
  }
  return texts.map((text) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}

function walk(value, visitor, seen = new Set()) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    visitor(value);
    return;
  }
  if (typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor, seen));
  } else {
    Object.values(value).forEach((item) => walk(item, visitor, seen));
  }
}

export function extractDatasetUrns(result) {
  const urns = new Set();
  walk(toolResultValue(result), (value) => {
    if (typeof value === "string") {
      for (const match of value.match(DATASET_URN_PATTERN) || []) urns.add(match);
    } else if (typeof value?.urn === "string") {
      urns.add(value.urn);
    }
  });
  return [...urns].sort();
}

export function isContinuityDatasetUrn(urn) {
  return (
    typeof urn === "string" &&
    urn.startsWith(CONTINUITY_URN_PREFIX) &&
    urn.endsWith(",DEV)") &&
    !urn.includes("campus-low-carbon")
  );
}

export function filterContinuityDatasetUrns(urns, maxRecords = 200) {
  const filtered = [...new Set(urns.filter(isContinuityDatasetUrn))].sort();
  if (filtered.length > maxRecords) {
    throw new ContinuityLiveReadError(
      `Continuity search returned more than the ${maxRecords} record limit.`,
      "ENTITY_LIMIT_EXCEEDED",
    );
  }
  return filtered;
}

function parseJsonProperty(key, value, urn) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new ContinuityLiveReadError(
      `Invalid JSON in ${key} for ${urn}.`,
      "INVALID_CUSTOM_PROPERTY_JSON",
      { cause: error },
    );
  }
}

export function parseCustomProperty(key, value, urn = "unknown entity") {
  if (value === "" || value === null || value === undefined) return undefined;
  if (JSON_PROPERTIES.has(key)) return parseJsonProperty(key, value, urn);
  if (BOOLEAN_PROPERTIES.has(key)) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    throw new ContinuityLiveReadError(
      `Invalid boolean in ${key} for ${urn}.`,
      "INVALID_CUSTOM_PROPERTY_BOOLEAN",
    );
  }
  if (NUMBER_PROPERTIES.has(key)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new ContinuityLiveReadError(
        `Invalid number in ${key} for ${urn}.`,
        "INVALID_CUSTOM_PROPERTY_NUMBER",
      );
    }
    return parsed;
  }
  return value;
}

function findRecords(value, records = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return records;
  seen.add(value);
  if (typeof value.urn === "string") records.push(value);
  if (Array.isArray(value)) {
    value.forEach((item) => findRecords(item, records, seen));
  } else {
    for (const [key, item] of Object.entries(value)) {
      if (isContinuityDatasetUrn(key) && item && typeof item === "object") {
        records.push({ urn: key, ...item });
      }
      findRecords(item, records, seen);
    }
  }
  return records;
}

function aspectValue(record, key) {
  const aspects = record.aspects || record.aspect || {};
  return (
    record[key] ??
    record.properties?.[key] ??
    record.datasetProperties?.[key] ??
    aspects.datasetProperties?.[key] ??
    aspects["com.linkedin.dataset.DatasetProperties"]?.[key]
  );
}

export function extractEntityRecords(result) {
  const payload = toolResultValue(result);
  const found = findRecords(payload);
  const byUrn = new Map();
  for (const record of found) {
    if (!isContinuityDatasetUrn(record.urn)) continue;
    const customProperties = aspectValue(record, "customProperties") || {};
    byUrn.set(record.urn, {
      urn: record.urn,
      name: aspectValue(record, "name") || record.name || "",
      description:
        aspectValue(record, "description") || record.description || "",
      customProperties,
    });
  }
  return [...byUrn.values()].sort((left, right) =>
    left.urn.localeCompare(right.urn),
  );
}

function parseProperties(record) {
  return Object.fromEntries(
    Object.entries(record.customProperties || {})
      .map(([key, value]) => [
        key,
        parseCustomProperty(key, value, record.urn),
      ])
      .filter(([, value]) => value !== undefined),
  );
}

function requireValue(value, message, code = "INVALID_CONTINUITY_RECORD") {
  if (value === undefined || value === null || value === "") {
    throw new ContinuityLiveReadError(message, code);
  }
  return value;
}

function relationshipFrom(value, urn) {
  if (!value || typeof value !== "object") {
    throw new ContinuityLiveReadError(
      `Invalid outgoing relationship for ${urn}.`,
      "INVALID_RELATIONSHIP",
    );
  }
  return {
    id: String(requireValue(value.id, `Relationship id missing for ${urn}.`)),
    type: String(
      requireValue(value.type, `Relationship type missing for ${urn}.`),
    ),
    from: String(
      requireValue(value.from, `Relationship source missing for ${urn}.`),
    ),
    to: String(
      requireValue(value.to, `Relationship target missing for ${urn}.`),
    ),
    ...(value.createdAt ? { createdAt: String(value.createdAt) } : {}),
    ...(value.metadata ? { metadata: value.metadata } : {}),
  };
}

export function normalizeContinuityRecords(records) {
  const parsed = records.map((record) => ({
    ...record,
    properties: parseProperties(record),
  }));
  const roots = parsed.filter(
    (record) => record.properties.nexusRecordKind === "project",
  );
  if (roots.length !== 1 || roots[0].urn !== CONTINUITY_PROJECT_URN) {
    throw new ContinuityLiveReadError(
      "The Nexus continuity project root is missing or ambiguous.",
      "PROJECT_ROOT_MISSING",
    );
  }
  const root = roots[0];
  const rootProps = root.properties;
  const entityRecords = parsed.filter(
    (record) => record.properties.nexusEntityId,
  );
  const expectedEntities = requireValue(
    rootProps.nexusEntityCount,
    "Project root does not define nexusEntityCount.",
    "ENTITY_COUNT_MISSING",
  );
  if (entityRecords.length !== expectedEntities) {
    throw new ContinuityLiveReadError(
      `Entity count mismatch: expected ${expectedEntities}, found ${entityRecords.length}.`,
      "ENTITY_COUNT_MISMATCH",
    );
  }

  const entities = entityRecords.map((record) => {
    const props = record.properties;
    if (props.nexusProjectId !== CONTINUITY_PROJECT_ID) {
      throw new ContinuityLiveReadError(
        `Record is outside the Nexus continuity project: ${record.urn}.`,
        "PROJECT_SCOPE_MISMATCH",
      );
    }
    const entity = {
      id: String(
        requireValue(
          props.nexusEntityId,
          `nexusEntityId missing for ${record.urn}.`,
        ),
      ),
      type: String(
        requireValue(
          props.nexusEntityType,
          `nexusEntityType missing for ${record.urn}.`,
        ),
      ),
      title: String(requireValue(record.name, `name missing for ${record.urn}.`)),
      summary: String(
        requireValue(
          record.description,
          `description missing for ${record.urn}.`,
        ),
      ),
      status: String(
        requireValue(
          props.nexusStatus,
          `nexusStatus missing for ${record.urn}.`,
        ),
      ),
      createdAt: String(
        requireValue(
          props.nexusCreatedAt,
          `nexusCreatedAt missing for ${record.urn}.`,
        ),
      ),
      updatedAt: String(
        requireValue(
          props.nexusUpdatedAt,
          `nexusUpdatedAt missing for ${record.urn}.`,
        ),
      ),
    };
    const optional = {
      confidence: props.nexusConfidence,
      ownerId: props.nexusOwnerId,
      confirmedBy: props.nexusConfirmedBy,
      confirmedAt: props.nexusConfirmedAt,
      expiresAt: props.nexusExpiresAt,
      agent: props.nexusAgent,
      priority: props.nexusPriority,
      completionCriteria: props.nexusCompletionCriteria,
      supersedes: props.nexusSupersedes,
      supersededBy: props.nexusSupersededBy,
      source: props.nexusSource,
      metadata: props.nexusMetadata,
    };
    for (const [key, value] of Object.entries(optional)) {
      if (value !== undefined) entity[key] = value;
    }
    return {
      entity,
      urn: record.urn,
      outgoing: props.nexusOutgoingRelationships || [],
    };
  });
  entities.sort((left, right) => left.entity.id.localeCompare(right.entity.id));

  const entityIds = new Set(entities.map((item) => item.entity.id));
  const relationships = new Map();
  for (const item of entities) {
    for (const value of item.outgoing) {
      const relationship = relationshipFrom(value, item.urn);
      if (
        !entityIds.has(relationship.from) ||
        !entityIds.has(relationship.to)
      ) {
        throw new ContinuityLiveReadError(
          `Relationship ${relationship.id} references an unknown entity.`,
          "INVALID_RELATIONSHIP_TARGET",
        );
      }
      const existing = relationships.get(relationship.id);
      if (
        existing &&
        JSON.stringify(existing) !== JSON.stringify(relationship)
      ) {
        throw new ContinuityLiveReadError(
          `Relationship id is not unique: ${relationship.id}.`,
          "DUPLICATE_RELATIONSHIP_ID",
        );
      }
      relationships.set(relationship.id, relationship);
    }
  }
  const relationshipList = [...relationships.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const expectedRelationships = requireValue(
    rootProps.nexusRelationshipCount,
    "Project root does not define nexusRelationshipCount.",
    "RELATIONSHIP_COUNT_MISSING",
  );
  if (relationshipList.length !== expectedRelationships) {
    throw new ContinuityLiveReadError(
      `Relationship count mismatch: expected ${expectedRelationships}, found ${relationshipList.length}.`,
      "RELATIONSHIP_COUNT_MISMATCH",
    );
  }

  const scenario = {
    schemaVersion: String(
      requireValue(rootProps.nexusSchemaVersion, "Schema version is missing."),
    ),
    project: {
      id: CONTINUITY_PROJECT_ID,
      name: String(requireValue(root.name, "Project name is missing.")),
      description: String(
        requireValue(root.description, "Project description is missing."),
      ),
      status: String(
        requireValue(rootProps.nexusProjectStatus, "Project status is missing."),
      ),
      createdAt: String(
        requireValue(rootProps.nexusCreatedAt, "Project createdAt is missing."),
      ),
      updatedAt: String(
        requireValue(rootProps.nexusUpdatedAt, "Project updatedAt is missing."),
      ),
    },
    entities: entities.map((item) => item.entity),
    relationships: relationshipList,
    reentryQuery: requireValue(
      rootProps.nexusReentryQuery,
      "Project re-entry query is missing.",
    ),
    expectedFindings: {
      meaningfulChanges: rootProps.nexusMeaningfulChanges,
      staleRecords: rootProps.nexusStaleRecords,
      agentConflicts: rootProps.nexusAgentConflicts,
      missingOwners: rootProps.nexusMissingOwners,
      validDecisions: rootProps.nexusValidDecisions,
      recommendedActions: rootProps.nexusRecommendedActions || [],
    },
  };

  return {
    projectUrn: root.urn,
    scenario,
    diagnostics: {
      projectRootFound: true,
      expectedEntities,
      actualEntities: scenario.entities.length,
      totalDatasets: records.length,
      expectedRelationships,
      actualRelationships: relationshipList.length,
    },
    urnByEntityId: Object.fromEntries(
      entities.map((item) => [item.entity.id, item.urn]),
    ),
  };
}

export function extractLineageUrns(result) {
  return extractDatasetUrns(result).filter(isContinuityDatasetUrn);
}
