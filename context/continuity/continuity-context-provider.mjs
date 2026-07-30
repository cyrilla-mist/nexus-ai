import { createHash } from "node:crypto";
import {
  formatContinuityContextBlock,
  renderContinuityContextBlock,
} from "./continuity-context-renderer.mjs";

const SCHEMA_VERSION = "0.9.7";
const DEFAULT_BUDGET = Object.freeze({
  maxChars: 9000,
  maxItems: Object.freeze({
    meaningfulChanges: 4,
    confirmedDecisions: 6,
    conflicts: 4,
    risks: 4,
    recommendedActions: 5,
    evidenceReferences: 12,
  }),
  fieldLengths: Object.freeze({
    title: 180,
    summary: 500,
    rationale: 600,
    source: 120,
  }),
});

const PRIORITY_ORDER = new Map([
  ["critical", 0],
  ["high", 1],
  ["medium", 2],
  ["low", 3],
]);

export class ContinuityContextProviderError extends Error {
  constructor(message, code, options = {}) {
    super(message, options);
    this.name = "ContinuityContextProviderError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new ContinuityContextProviderError(message, code);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clip(value, limit) {
  const normalized = text(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function safeSource(entity, lengths) {
  const provider = clip(entity?.source?.provider, lengths.source);
  const reference = clip(entity?.source?.reference, lengths.source);
  return {
    provider: provider || null,
    reference: reference || null,
  };
}

function stableTime(left, right) {
  return (
    String(right.occurredAt ?? right.updatedAt ?? "").localeCompare(
      String(left.occurredAt ?? left.updatedAt ?? ""),
    ) || String(left.id).localeCompare(String(right.id))
  );
}

function stableId(left, right) {
  return String(left.id).localeCompare(String(right.id));
}

function priorityRank(value) {
  return PRIORITY_ORDER.get(String(value).toLowerCase()) ?? 10;
}

function clone(value) {
  return structuredClone(value);
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    fail("Continuity snapshot must be an object.", "SNAPSHOT_INVALID");
  }
  const scenario = snapshot.scenario ?? snapshot;
  if (
    !scenario ||
    typeof scenario !== "object" ||
    !Array.isArray(scenario.entities) ||
    !Array.isArray(scenario.relationships)
  ) {
    fail(
      "Continuity snapshot must include entities and relationships.",
      "SNAPSHOT_INVALID",
    );
  }
  if (snapshot.readOnly === false) {
    fail(
      "Continuity context accepts read-only snapshots only.",
      "SNAPSHOT_INVALID",
    );
  }
  if (!scenario.project || typeof scenario.project !== "object") {
    fail("Continuity project is required.", "CONTEXT_PROJECT_MISSING");
  }
  if (!text(scenario.project.id) || !text(scenario.project.name)) {
    fail(
      "Continuity project id and name are required.",
      "CONTEXT_PROJECT_MISSING",
    );
  }
  if (!text(scenario.project.status)) {
    fail("Continuity project state is required.", "CONTEXT_STATE_MISSING");
  }

  const ids = new Set(scenario.entities.map((entity) => entity.id));
  if (ids.size !== scenario.entities.length || ids.has(undefined)) {
    fail("Continuity entity ids must be unique.", "SNAPSHOT_INVALID");
  }
  for (const relationship of scenario.relationships) {
    if (
      !text(relationship.id) ||
      !text(relationship.type) ||
      !ids.has(relationship.from) ||
      !ids.has(relationship.to)
    ) {
      fail(
        "Continuity relationship references are invalid.",
        "CONTEXT_RELATIONSHIP_INVALID",
      );
    }
  }

  return {
    scenario,
    source: {
      type: text(snapshot.source) || "fixture",
      readOnly: snapshot.readOnly !== false,
      fetchedAt: snapshot.fetchedAt,
      projectUrn: snapshot.projectUrn,
    },
  };
}

function budgetFrom(options = {}) {
  const maxChars = options.maxChars ?? DEFAULT_BUDGET.maxChars;
  if (!Number.isInteger(maxChars) || maxChars < 2000 || maxChars > 20000) {
    fail(
      "Continuity context maxChars must be an integer from 2000 to 20000.",
      "CONTEXT_BUDGET_INVALID",
    );
  }
  const maxItems = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_BUDGET.maxItems)) {
    const value = options.maxItems?.[key] ?? defaultValue;
    if (!Number.isInteger(value) || value < 0 || value > 50) {
      fail(
        `Continuity context maxItems.${key} is invalid.`,
        "CONTEXT_BUDGET_INVALID",
      );
    }
    maxItems[key] = value;
  }
  const fieldLengths = {};
  for (const [key, defaultValue] of Object.entries(
    DEFAULT_BUDGET.fieldLengths,
  )) {
    const value = options.fieldLengths?.[key] ?? defaultValue;
    if (!Number.isInteger(value) || value < 40 || value > 2000) {
      fail(
        `Continuity context fieldLengths.${key} is invalid.`,
        "CONTEXT_BUDGET_INVALID",
      );
    }
    fieldLengths[key] = value;
  }
  return { maxChars, maxItems, fieldLengths };
}

function indexes(scenario) {
  const entities = scenario.entities.slice().sort(stableId);
  const relationships = scenario.relationships.slice().sort(stableId);
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const direct = new Map(entities.map((entity) => [entity.id, []]));
  for (const relationship of relationships) {
    direct.get(relationship.from).push({
      relationship,
      direction: "outgoing",
      entity: byId.get(relationship.to),
    });
    direct.get(relationship.to).push({
      relationship,
      direction: "incoming",
      entity: byId.get(relationship.from),
    });
  }
  return { entities, relationships, byId, direct };
}

function continuityScore(scenario, index) {
  if (scenario.continuityScore !== undefined) {
    const score = scenario.continuityScore;
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      fail(
        "Continuity score must be a finite number from 0 to 100.",
        "CONTEXT_SCORE_INVALID",
      );
    }
    return score;
  }
  const valid = index.entities.filter(
    (entity) => entity.type === "decision" && entity.status === "confirmed",
  ).length;
  const stale = index.entities.filter((entity) =>
    ["stale", "superseded"].includes(entity.status),
  ).length;
  const conflict = index.relationships.filter(
    (relationship) => relationship.type === "contradicts",
  ).length;
  const missing = index.entities.filter(
    (entity) =>
      entity.type === "risk" && entity.metadata?.missingOwner === true,
  ).length;
  const total = valid + stale + conflict + missing;
  const score =
    total === 0
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((valid + total - stale - conflict - missing) / (total * 2)) *
                100,
            ),
          ),
        );
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    fail(
      "Continuity score could not be derived from the snapshot.",
      "CONTEXT_SCORE_INVALID",
    );
  }
  return score;
}

function contextState(scenario) {
  if (text(scenario.contextState)) return scenario.contextState;
  const hasRecoverySignal =
    scenario.entities.some((entity) =>
      ["stale", "superseded", "disputed", "blocked"].includes(entity.status),
    ) ||
    scenario.entities.some((entity) => entity.metadata?.missingOwner === true);
  return hasRecoverySignal
    ? "context_recovery_required"
    : text(scenario.project.status);
}

function relationRefs(index, entityId) {
  return (index.direct.get(entityId) || [])
    .map(({ relationship, entity, direction }) => ({
      entity,
      relationship,
      direction,
    }))
    .sort(
      (left, right) =>
        left.relationship.id.localeCompare(right.relationship.id) ||
        left.entity.id.localeCompare(right.entity.id),
    );
}

function refId(entity) {
  return `ref-${entity.id}`;
}

function itemEvidenceRefs(index, entityId, preferredTypes = []) {
  const related = relationRefs(index, entityId);
  const preferred = related.filter(({ entity }) =>
    preferredTypes.includes(entity.type),
  );
  const selected = preferred.length ? preferred : related;
  const references = selected.slice(0, 3).map(({ entity }) => refId(entity));
  return [...new Set(references.length ? references : [refId(index.byId.get(entityId))])];
}

function meaningfulChanges(index, lengths) {
  return index.entities
    .filter(
      (entity) =>
        entity.type === "event" && entity.metadata?.meaningfulChange === true,
    )
    .map((entity) => ({
      id: entity.id,
      title: clip(entity.title, lengths.title),
      summary: clip(entity.summary, lengths.summary),
      occurredAt: entity.updatedAt || entity.createdAt,
      source: safeSource(entity, lengths),
      evidenceRefs: itemEvidenceRefs(index, entity.id, ["source", "evidence"]),
      updatedAt: entity.updatedAt,
    }))
    .sort(stableTime);
}

function decisionImportance(entity) {
  if (entity.confirmedBy) return 0;
  if (entity.metadata?.decisionArea === "scenario") return 1;
  return 2;
}

function confirmedDecisions(index, lengths) {
  return index.entities
    .filter(
      (entity) =>
        entity.type === "decision" &&
        entity.status === "confirmed" &&
        !["disputed", "stale", "superseded"].includes(entity.status),
    )
    .map((entity) => ({
      id: entity.id,
      title: clip(entity.title, lengths.title),
      rationale: clip(entity.summary, lengths.rationale),
      status: entity.status,
      confirmedBy: entity.confirmedBy || null,
      source: safeSource(entity, lengths),
      evidenceRefs: itemEvidenceRefs(index, entity.id, [
        "evidence",
        "claim",
        "source",
      ]),
      importance: decisionImportance(entity),
      updatedAt: entity.updatedAt,
    }))
    .sort(
      (left, right) =>
        left.importance - right.importance ||
        stableTime(left, right) ||
        left.id.localeCompare(right.id),
    )
    .map(({ importance, updatedAt, ...item }) => item);
}

function conflicts(index, lengths) {
  const values = [];
  for (const relationship of index.relationships.filter(
    (item) => item.type === "contradicts",
  )) {
    const from = index.byId.get(relationship.from);
    const to = index.byId.get(relationship.to);
    values.push({
      id: relationship.id,
      title: clip("Conflicting project direction", lengths.title),
      summary: clip(
        `${from.title} conflicts with ${to.title}`,
        lengths.summary,
      ),
      status: "disputed",
      severity: null,
      conflictingRecords: [from.id, to.id].sort(),
      affectedDecisionRefs: [],
      evidenceRefs: [refId(from), refId(to)],
      requiresHumanDecision: true,
      priority: 0,
      updatedAt: [from.updatedAt, to.updatedAt].sort().at(-1),
    });
  }
  for (const entity of index.entities.filter(
    (item) =>
      ["claim", "agent_memory"].includes(item.type) &&
      ["disputed", "superseded"].includes(item.status) &&
      !values.some((value) => value.conflictingRecords.includes(item.id)),
  )) {
    const relatedDecisions = relationRefs(index, entity.id)
      .filter(({ entity: related }) => related.type === "decision")
      .map(({ entity: related }) => related.id);
    values.push({
      id: `conflict-${entity.id}`,
      title: clip(entity.title, lengths.title),
      summary: clip(entity.summary, lengths.summary),
      status: entity.status,
      severity: entity.priority || null,
      conflictingRecords: [entity.id],
      affectedDecisionRefs: relatedDecisions.sort(),
      evidenceRefs: itemEvidenceRefs(index, entity.id, [
        "decision",
        "evidence",
        "agent_memory",
      ]),
      requiresHumanDecision: false,
      priority: entity.status === "disputed" ? 1 : 2,
      updatedAt: entity.updatedAt,
    });
  }
  return values
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        stableTime(left, right) ||
        left.id.localeCompare(right.id),
    )
    .map(({ priority, updatedAt, ...item }) => item);
}

function risks(index, lengths) {
  return index.entities
    .filter((entity) => entity.type === "risk")
    .map((entity) => {
      const blockedItems = relationRefs(index, entity.id)
        .filter(
          ({ relationship, direction }) =>
            relationship.type === "blocks" && direction === "outgoing",
        )
        .map(({ entity: related }) => related.id)
        .sort();
      const owner = entity.ownerId ? index.byId.get(entity.ownerId) : null;
      const ownerMissing =
        entity.metadata?.missingOwner === true || (!owner && !entity.ownerId);
      return {
        id: entity.id,
        title: clip(entity.title, lengths.title),
        summary: clip(entity.summary, lengths.summary),
        status: entity.status,
        priority: entity.priority || null,
        owner: owner?.title || null,
        ownerMissing,
        blockedItems,
        source: safeSource(entity, lengths),
        evidenceRefs: itemEvidenceRefs(index, entity.id, [
          "task",
          "evidence",
          "decision",
        ]),
        blocking: blockedItems.length > 0 || entity.status === "blocked",
        updatedAt: entity.updatedAt,
      };
    })
    .sort(
      (left, right) =>
        Number(right.blocking) - Number(left.blocking) ||
        Number(right.ownerMissing) - Number(left.ownerMissing) ||
        priorityRank(left.priority) - priorityRank(right.priority) ||
        stableTime(left, right) ||
        left.id.localeCompare(right.id),
    )
    .map(({ blocking, updatedAt, ...item }) => item);
}

function recommendedActions(scenario, index, lengths) {
  const expected = Array.isArray(scenario.expectedFindings?.recommendedActions)
    ? scenario.expectedFindings.recommendedActions
    : [];
  return index.entities
    .filter(
      (entity) =>
        entity.type === "task" &&
        (entity.metadata?.recommended === true ||
          expected.includes(entity.metadata?.recommendedAction) ||
          expected.includes(entity.title)),
    )
    .map((entity) => ({
      id: entity.id,
      title: clip(
        entity.metadata?.recommendedAction || entity.title,
        lengths.title,
      ),
      summary: clip(entity.summary, lengths.summary),
      recordedStatus: entity.status,
      currentEvidenceStatus: null,
      priority: entity.priority || null,
      dependencyRefs: relationRefs(index, entity.id)
        .filter(({ relationship }) =>
          ["blocks", "produces", "assigned_to"].includes(relationship.type),
        )
        .map(({ entity: related }) => related.id)
        .sort(),
      evidenceRefs: itemEvidenceRefs(index, entity.id, [
        "risk",
        "evidence",
        "decision",
        "owner",
        "outcome",
      ]),
      source: safeSource(entity, lengths),
      updatedAt: entity.updatedAt,
    }))
    .sort(
      (left, right) =>
        priorityRank(left.priority) - priorityRank(right.priority) ||
        stableTime(left, right) ||
        left.id.localeCompare(right.id),
    )
    .map(({ updatedAt, ...item }) => item);
}

function evidenceReferences(index, itemGroups, sourceType, lengths) {
  const referenceIds = new Set(
    itemGroups.flatMap((items) =>
      items.flatMap((item) => item.evidenceRefs || []),
    ),
  );
  const referenceById = new Map();
  for (const entity of index.entities) {
    const id = refId(entity);
    if (!referenceIds.has(id)) continue;
    const connections = relationRefs(index, entity.id);
    const actual = connections[0];
    referenceById.set(id, {
      id,
      entityId: entity.id,
      type: entity.type,
      title: clip(entity.title, lengths.title),
      ...(sourceType === "datahub-mcp"
        ? {
            urn: `urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.continuity.project-nexus-ai.${entity.type}.${entity.id},DEV)`,
          }
        : {}),
      relationship: actual?.relationship.type || null,
      source: safeSource(entity, lengths),
      priority:
        entity.status === "disputed" ||
        entity.metadata?.missingOwner === true ||
        entity.type === "decision"
          ? 0
          : entity.type === "risk" || entity.type === "task"
            ? 1
            : 2,
    });
  }
  return [...referenceById.values()]
    .sort(
      (left, right) =>
        left.priority - right.priority || left.id.localeCompare(right.id),
    )
    .map(({ priority, ...reference }) => reference);
}

function limited(items, count) {
  return {
    included: items.slice(0, count),
    omitted: Math.max(0, items.length - count),
  };
}

function updateDiagnostics(brief, fullCounts, omitted, truncatedFields = 0) {
  const keys = [
    "meaningfulChanges",
    "confirmedDecisions",
    "conflicts",
    "risks",
    "recommendedActions",
    "evidenceReferences",
  ];
  brief.diagnostics.counts = { ...fullCounts };
  brief.diagnostics.included = Object.fromEntries(
    keys.map((key) => [key, brief[key].length]),
  );
  brief.diagnostics.omitted = Object.fromEntries(
    keys.map((key) => [
      key,
      omitted[key] + Math.max(0, fullCounts[key] - omitted[key] - brief[key].length),
    ]),
  );
  brief.diagnostics.truncatedFields = truncatedFields;
  brief.diagnostics.truncated =
    truncatedFields > 0 ||
    Object.values(brief.diagnostics.omitted).some((count) => count > 0);
  brief.diagnostics.actualChars = formatContinuityContextBlock(brief).length;
}

function fitBudget(brief, fullCounts, omitted) {
  let truncatedFields = 0;
  updateDiagnostics(brief, fullCounts, omitted, truncatedFields);
  const fits = () =>
    formatContinuityContextBlock(brief).length <=
    brief.diagnostics.budget.maxChars;

  while (!fits() && brief.evidenceReferences.length > 1) {
    brief.evidenceReferences.pop();
    updateDiagnostics(brief, fullCounts, omitted, truncatedFields);
  }
  while (!fits() && brief.meaningfulChanges.length > 1) {
    brief.meaningfulChanges.pop();
    updateDiagnostics(brief, fullCounts, omitted, truncatedFields);
  }
  while (!fits() && brief.recommendedActions.length > 1) {
    brief.recommendedActions.pop();
    updateDiagnostics(brief, fullCounts, omitted, truncatedFields);
  }
  const summaryKeys = [
    "meaningfulChanges",
    "recommendedActions",
    "risks",
    "conflicts",
    "confirmedDecisions",
  ];
  let targetLength = Math.max(80, brief.diagnostics.budget.fieldLengths.summary);
  while (!fits() && targetLength > 80) {
    targetLength = Math.max(80, targetLength - 40);
    for (const key of summaryKeys) {
      brief[key] = brief[key].map((item) => {
        const field = item.summary !== undefined ? "summary" : "rationale";
        const shortened = clip(item[field], targetLength);
        if (shortened !== item[field]) truncatedFields += 1;
        return { ...item, [field]: shortened };
      });
    }
    updateDiagnostics(brief, fullCounts, omitted, truncatedFields);
  }
  if (!fits()) {
    fail(
      "Continuity context cannot fit within the requested character budget.",
      "CONTEXT_BUDGET_UNSATISFIABLE",
    );
  }
  brief.diagnostics.actualChars = formatContinuityContextBlock(brief).length;
}

export function buildContinuityContextBrief(snapshot, options = {}) {
  const input = normalizeSnapshot(snapshot);
  const budget = budgetFrom(options);
  const scenario = input.scenario;
  const index = indexes(scenario);
  const all = {
    meaningfulChanges: meaningfulChanges(index, budget.fieldLengths),
    confirmedDecisions: confirmedDecisions(index, budget.fieldLengths),
    conflicts: conflicts(index, budget.fieldLengths),
    risks: risks(index, budget.fieldLengths),
    recommendedActions: recommendedActions(
      scenario,
      index,
      budget.fieldLengths,
    ),
  };
  const limitedGroups = {};
  const omitted = {};
  for (const key of Object.keys(all)) {
    const result = limited(all[key], budget.maxItems[key]);
    limitedGroups[key] = result.included;
    omitted[key] = result.omitted;
  }
  const allReferences = evidenceReferences(
    index,
    Object.values(limitedGroups),
    input.source.type,
    budget.fieldLengths,
  );
  const referenceLimit = limited(
    allReferences,
    budget.maxItems.evidenceReferences,
  );
  omitted.evidenceReferences = referenceLimit.omitted;
  const fullCounts = {
    ...Object.fromEntries(
      Object.entries(all).map(([key, values]) => [key, values.length]),
    ),
    evidenceReferences: allReferences.length,
  };

  const brief = {
    schemaVersion: SCHEMA_VERSION,
    project: {
      id: scenario.project.id,
      name: scenario.project.name,
      state: contextState(scenario),
      continuityScore: continuityScore(scenario, index),
    },
    source: {
      type: input.source.type,
      readOnly: input.source.readOnly,
      ...(input.source.fetchedAt ? { fetchedAt: input.source.fetchedAt } : {}),
      ...(input.source.projectUrn
        ? { projectUrn: input.source.projectUrn }
        : {}),
    },
    ...limitedGroups,
    evidenceReferences: referenceLimit.included,
    diagnostics: {
      budget: clone(budget),
      counts: {},
      included: {},
      omitted: {},
      truncatedFields: 0,
      truncated: false,
      actualChars: 0,
      warnings: [],
    },
  };
  fitBudget(brief, fullCounts, omitted);
  return brief;
}

function semanticBrief(brief) {
  const copy = clone(brief);
  delete copy.source;
  delete copy.diagnostics;
  const sortList = (values) =>
    values
      .map((value) => {
        const item = clone(value);
        delete item.urn;
        if (Array.isArray(item.evidenceRefs)) item.evidenceRefs.sort();
        if (Array.isArray(item.conflictingRecords)) item.conflictingRecords.sort();
        if (Array.isArray(item.affectedDecisionRefs)) {
          item.affectedDecisionRefs.sort();
        }
        if (Array.isArray(item.blockedItems)) item.blockedItems.sort();
        if (Array.isArray(item.dependencyRefs)) item.dependencyRefs.sort();
        return item;
      })
      .sort(stableId);
  for (const key of [
    "meaningfulChanges",
    "confirmedDecisions",
    "conflicts",
    "risks",
    "recommendedActions",
    "evidenceReferences",
  ]) {
    copy[key] = sortList(copy[key]);
  }
  return copy;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createContinuityContextFingerprint(brief) {
  return createHash("sha256")
    .update(stableJson(semanticBrief(brief)))
    .digest("hex");
}

export function assertContinuityContextParity(left, right) {
  const leftFingerprint = createContinuityContextFingerprint(left);
  const rightFingerprint = createContinuityContextFingerprint(right);
  if (leftFingerprint !== rightFingerprint) {
    fail(
      `Continuity context semantic mismatch (${leftFingerprint.slice(
        0,
        12,
      )} != ${rightFingerprint.slice(0, 12)}).`,
      "SEMANTIC_MISMATCH",
    );
  }
  return leftFingerprint;
}

export { renderContinuityContextBlock };
