import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = resolve(MODULE_DIR, "schema", "continuity-schema.json");
const DEFAULT_SCENARIO_PATH = resolve(
  MODULE_DIR,
  "scenarios",
  "nexus-self-reentry.json",
);

export class ContinuityValidationError extends Error {
  constructor(errors) {
    super(`Nexus continuity scenario validation failed:\n- ${errors.join("\n- ")}`);
    this.name = "ContinuityValidationError";
    this.errors = errors;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadContinuitySchema(path = DEFAULT_SCHEMA_PATH) {
  return readJson(path);
}

export async function loadContinuityScenario(path = DEFAULT_SCENARIO_PATH) {
  return readJson(path);
}

function requireFields(value, fields, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const field of fields) {
    if (!(field in value) || value[field] === null || value[field] === "") {
      errors.push(`${label}.${field} is required`);
    }
  }
}

function findDuplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  }))];
}

function hasTypedChain(entities, relationships, expectedTypes) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const outgoing = new Map();

  for (const relationship of relationships) {
    if (!outgoing.has(relationship.from)) outgoing.set(relationship.from, []);
    outgoing.get(relationship.from).push(relationship.to);
  }

  const walk = (id, index, visited) => {
    if (index === expectedTypes.length - 1) return true;

    for (const nextId of outgoing.get(id) ?? []) {
      const next = byId.get(nextId);
      const key = `${nextId}:${index + 1}`;
      if (
        next?.type === expectedTypes[index + 1]
        && !visited.has(key)
        && walk(nextId, index + 1, new Set([...visited, key]))
      ) {
        return true;
      }
    }

    return false;
  };

  return entities
    .filter((entity) => entity.type === expectedTypes[0])
    .some((entity) => walk(entity.id, 0, new Set([`${entity.id}:0`])));
}

function calculateFindings(entities, relationships) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const recommendedActions = entities
    .filter((entity) => entity.type === "task" && entity.metadata?.recommended)
    .map((entity) => entity.metadata.recommendedAction);

  return {
    meaningfulChanges: entities.filter(
      (entity) => entity.type === "event" && entity.metadata?.meaningfulChange === true,
    ).length,
    staleRecords: entities.filter(
      (entity) => entity.status === "stale" || entity.status === "superseded",
    ).length,
    agentConflicts: relationships.filter((relationship) => {
      const from = byId.get(relationship.from);
      const to = byId.get(relationship.to);
      return relationship.type === "contradicts"
        && from?.type === "agent_memory"
        && to?.type === "agent_memory";
    }).length,
    missingOwners: entities.filter(
      (entity) => entity.type === "risk" && entity.metadata?.missingOwner === true,
    ).length,
    validDecisions: entities.filter(
      (entity) => entity.type === "decision" && entity.status === "confirmed",
    ).length,
    recommendedActions,
  };
}

function sameArray(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function validateContinuityScenario(scenario, schema) {
  const errors = [];
  const rootRequired = schema?.required ?? [];
  const projectRequired = schema?.$defs?.project?.required ?? [];
  const entityRequired = schema?.$defs?.entity?.required ?? [];
  const relationshipRequired = schema?.$defs?.relationship?.required ?? [];
  const queryRequired = schema?.$defs?.reentryQuery?.required ?? [];
  const findingsRequired = schema?.$defs?.expectedFindings?.required ?? [];
  const allowedStatuses = new Set(schema?.$defs?.status?.enum ?? []);
  const allowedEntityTypes = new Set(schema?.$defs?.entityType?.enum ?? []);
  const allowedRelationshipTypes = new Set(
    schema?.$defs?.relationshipType?.enum ?? [],
  );

  requireFields(scenario, rootRequired, "scenario", errors);
  requireFields(scenario?.project, projectRequired, "project", errors);
  requireFields(scenario?.reentryQuery, queryRequired, "reentryQuery", errors);
  requireFields(
    scenario?.expectedFindings,
    findingsRequired,
    "expectedFindings",
    errors,
  );

  if (!Array.isArray(scenario?.entities)) {
    errors.push("scenario.entities must be an array");
  }
  if (!Array.isArray(scenario?.relationships)) {
    errors.push("scenario.relationships must be an array");
  }

  const entities = Array.isArray(scenario?.entities) ? scenario.entities : [];
  const relationships = Array.isArray(scenario?.relationships)
    ? scenario.relationships
    : [];

  entities.forEach((entity, index) => {
    requireFields(entity, entityRequired, `entities[${index}]`, errors);
    if (!allowedEntityTypes.has(entity.type)) {
      errors.push(`entity ${entity.id ?? index} has invalid type: ${entity.type}`);
    }
    if (!allowedStatuses.has(entity.status)) {
      errors.push(`entity ${entity.id ?? index} has invalid status: ${entity.status}`);
    }
    if (
      typeof entity.confidence !== "number"
      || entity.confidence < 0
      || entity.confidence > 1
    ) {
      errors.push(`entity ${entity.id ?? index} confidence must be between 0 and 1`);
    }
  });

  relationships.forEach((relationship, index) => {
    requireFields(
      relationship,
      relationshipRequired,
      `relationships[${index}]`,
      errors,
    );
    if (!allowedRelationshipTypes.has(relationship.type)) {
      errors.push(
        `relationship ${relationship.id ?? index} has invalid type: ${relationship.type}`,
      );
    }
  });

  if (!allowedStatuses.has(scenario?.project?.status)) {
    errors.push(`project has invalid status: ${scenario?.project?.status}`);
  }

  const duplicateEntityIds = findDuplicates(entities.map((entity) => entity.id));
  if (duplicateEntityIds.length) {
    errors.push(`duplicate entity id: ${duplicateEntityIds.join(", ")}`);
  }

  const duplicateRelationshipIds = findDuplicates(
    relationships.map((relationship) => relationship.id),
  );
  if (duplicateRelationshipIds.length) {
    errors.push(`duplicate relationship id: ${duplicateRelationshipIds.join(", ")}`);
  }

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const owners = new Set(
    entities.filter((entity) => entity.type === "owner").map((entity) => entity.id),
  );

  for (const relationship of relationships) {
    if (!entityById.has(relationship.from)) {
      errors.push(`relationship ${relationship.id} has invalid from: ${relationship.from}`);
    }
    if (!entityById.has(relationship.to)) {
      errors.push(`relationship ${relationship.id} has invalid to: ${relationship.to}`);
    }
  }

  for (const entity of entities) {
    if (entity.ownerId != null && !owners.has(entity.ownerId)) {
      errors.push(`entity ${entity.id} ownerId must reference an owner: ${entity.ownerId}`);
    }
    for (const field of ["supersedes", "supersededBy"]) {
      if (entity[field] && !entityById.has(entity[field])) {
        errors.push(`entity ${entity.id}.${field} has invalid reference: ${entity[field]}`);
      }
    }
  }

  const findings = calculateFindings(entities, relationships);
  const expected = scenario?.expectedFindings ?? {};
  for (const key of [
    "meaningfulChanges",
    "staleRecords",
    "agentConflicts",
    "missingOwners",
    "validDecisions",
  ]) {
    if (expected[key] !== findings[key]) {
      errors.push(
        `expectedFindings.${key} is ${expected[key]}, actual value is ${findings[key]}`,
      );
    }
  }
  if (!sameArray(expected.recommendedActions, findings.recommendedActions)) {
    errors.push("expectedFindings.recommendedActions does not match recommended task data");
  }

  if (
    !hasTypedChain(
      entities,
      relationships,
      ["source", "evidence", "claim", "decision", "task", "outcome"],
    )
  ) {
    errors.push("missing complete source → evidence → claim → decision → task → outcome chain");
  }

  if (findings.agentConflicts < 1) {
    errors.push("at least one Agent Memory conflict is required");
  }

  if (!relationships.some((relationship) => relationship.type === "supersedes")) {
    errors.push("at least one supersedes relationship is required");
  }

  if (findings.missingOwners < 1) {
    errors.push("at least one missing owner risk is required");
  }

  const campusClaim = entityById.get("claim-campus-showcase");
  const campusDecision = entityById.get("decision-no-campus-demo");
  if (
    campusClaim?.status !== "superseded"
    || campusClaim?.metadata?.finalDemo !== false
    || campusDecision?.status !== "confirmed"
  ) {
    errors.push(
      "campus fixture must be rejected or superseded and cannot be the final Demo",
    );
  }

  const starMap = entityById.get("source-star-map-experiment");
  if (
    starMap?.status !== "archived"
    || starMap?.metadata?.archivedVisualExperiment !== true
    || starMap?.metadata?.primaryExperience !== false
  ) {
    errors.push("Star Map must remain an archived visual experiment");
  }

  if (errors.length) throw new ContinuityValidationError(errors);
  return { valid: true, findings };
}

async function runCli() {
  const schema = await loadContinuitySchema();
  const scenario = await loadContinuityScenario(process.argv[2]);
  validateContinuityScenario(scenario, schema);
  console.log("PASS: Nexus continuity scenario is valid");
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
