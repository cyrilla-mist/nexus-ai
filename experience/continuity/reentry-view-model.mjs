const SIGNAL_ORDER = ["stale", "conflict", "missing", "valid"];
const CHAIN_ORDER = new Map([
  ["source", 0],
  ["evidence", 1],
  ["claim", 2],
  ["agent_memory", 2],
  ["risk", 2],
  ["decision", 3],
  ["task", 4],
  ["outcome", 5],
  ["event", 6],
  ["owner", 7],
]);

const SIGNAL_DEFINITIONS = Object.freeze({
  stale: Object.freeze({
    key: "stale",
    label: "STALE EVIDENCE",
    tone: "oxide",
    title: "Some context no longer holds.",
    summary:
      "Superseded or stale records can invalidate decisions that still appear current.",
    actionLabel: "Create Revalidation Task",
  }),
  conflict: Object.freeze({
    key: "conflict",
    label: "AGENT CONFLICT",
    tone: "amber",
    title: "Agent memories disagree.",
    summary:
      "A human decision is required before conflicting scenario directions can be inherited.",
    actionLabel: "Request Human Decision",
  }),
  missing: Object.freeze({
    key: "missing",
    label: "MISSING OWNERSHIP",
    tone: "amber",
    title: "A blocked action has no owner.",
    summary:
      "Work cannot safely continue until responsibility is explicit.",
    actionLabel: "Assign Owner",
  }),
  valid: Object.freeze({
    key: "valid",
    label: "VALID CONTEXT",
    tone: "green",
    title: "Confirmed decisions remain safe to inherit.",
    summary:
      "These decisions have human confirmation and can guide the next working session.",
    actionLabel: "Confirm as Inherited",
  }),
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function freezeList(values) {
  return Object.freeze(values.map((value) => Object.freeze(value)));
}

function assertScenario(scenario) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    throw new TypeError("Invalid continuity scenario: expected an object.");
  }
  if (!scenario.project || typeof scenario.project !== "object") {
    throw new TypeError("Invalid continuity scenario: project is required.");
  }
  if (!Array.isArray(scenario.entities)) {
    throw new TypeError("Invalid continuity scenario: entities must be an array.");
  }
  if (!Array.isArray(scenario.relationships)) {
    throw new TypeError(
      "Invalid continuity scenario: relationships must be an array.",
    );
  }
}

function stableEntitySort(left, right) {
  return (
    String(right.updatedAt ?? right.createdAt ?? "").localeCompare(
      String(left.updatedAt ?? left.createdAt ?? ""),
    ) || String(left.id).localeCompare(String(right.id))
  );
}

function getIndexes(scenario) {
  const entities = scenario.entities.slice().sort(stableEntitySort);
  return {
    entities,
    byId: new Map(entities.map((entity) => [entity.id, entity])),
    relationships: scenario.relationships
      .slice()
      .sort((left, right) => String(left.id).localeCompare(String(right.id))),
  };
}

function countObservedFindings(scenario) {
  const { entities, byId, relationships } = getIndexes(scenario);
  return {
    meaningfulChanges: entities.filter(
      (entity) =>
        entity.type === "event" && entity.metadata?.meaningfulChange === true,
    ).length,
    staleRecords: entities.filter(
      (entity) =>
        entity.status === "stale" || entity.status === "superseded",
    ).length,
    agentConflicts: relationships.filter((relationship) => {
      const from = byId.get(relationship.from);
      const to = byId.get(relationship.to);
      return (
        relationship.type === "contradicts" &&
        from?.type === "agent_memory" &&
        to?.type === "agent_memory"
      );
    }).length,
    missingOwners: entities.filter(
      (entity) =>
        entity.type === "risk" && entity.metadata?.missingOwner === true,
    ).length,
    validDecisions: entities.filter(
      (entity) =>
        entity.type === "decision" && entity.status === "confirmed",
    ).length,
  };
}

function expectedCount(scenario, key, observed) {
  const expected = scenario.expectedFindings?.[key];
  return Number.isInteger(expected) && expected >= 0 ? expected : observed;
}

function summarizeSource(entity) {
  const provider = normalizeText(entity?.source?.provider);
  const reference = normalizeText(entity?.source?.reference);
  return [provider, reference].filter(Boolean).join(" · ") || "No source recorded";
}

function relationMatchesEntity(relationship, entityId) {
  return relationship.from === entityId || relationship.to === entityId;
}

function directRelations(scenario, entityId) {
  const { byId, relationships } = getIndexes(scenario);
  return relationships
    .filter((relationship) => relationMatchesEntity(relationship, entityId))
    .map((relationship) => {
      const outgoing = relationship.from === entityId;
      const relatedId = outgoing ? relationship.to : relationship.from;
      return {
        id: relationship.id,
        relation: relationship.type,
        direction: outgoing ? "outgoing" : "incoming",
        from: relationship.from,
        to: relationship.to,
        entity: byId.get(relatedId),
      };
    })
    .filter((item) => item.entity);
}

export function buildEvidenceChain(scenario, entityId) {
  assertScenario(scenario);
  const { byId, relationships } = getIndexes(scenario);
  if (!byId.has(entityId)) return Object.freeze([]);

  const visited = new Set([entityId]);
  const queue = [{ id: entityId, depth: 0 }];
  const collected = [];

  while (queue.length) {
    const current = queue.shift();
    if (current.depth >= 3) continue;

    for (const relationship of relationships) {
      if (!relationMatchesEntity(relationship, current.id)) continue;
      const outgoing = relationship.from === current.id;
      const relatedId = outgoing ? relationship.to : relationship.from;
      const entity = byId.get(relatedId);
      if (!entity) continue;

      collected.push({
        id: relationship.id,
        entityId: entity.id,
        type: entity.type,
        title: entity.title,
        status: entity.status,
        relation: relationship.type,
        direction: outgoing ? "outgoing" : "incoming",
        from: relationship.from,
        to: relationship.to,
        source: summarizeSource(entity),
        depth: current.depth + 1,
      });

      if (!visited.has(relatedId)) {
        visited.add(relatedId);
        queue.push({ id: relatedId, depth: current.depth + 1 });
      }
    }
  }

  const unique = new Map();
  for (const item of collected) {
    const key = `${item.entityId}:${item.relation}:${item.from}:${item.to}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  return freezeList(
    [...unique.values()].sort(
      (left, right) =>
        (CHAIN_ORDER.get(left.type) ?? 99) -
          (CHAIN_ORDER.get(right.type) ?? 99) ||
        left.depth - right.depth ||
        left.entityId.localeCompare(right.entityId),
    ),
  );
}

function relatedContext(scenario, entity) {
  const chain = buildEvidenceChain(scenario, entity.id);
  return {
    evidence: chain.filter((item) => item.type === "evidence"),
    decisions: chain.filter((item) => item.type === "decision"),
    tasks: chain.filter((item) => item.type === "task"),
  };
}

export function getMeaningfulChanges(scenario) {
  assertScenario(scenario);
  const { entities } = getIndexes(scenario);
  return freezeList(
    entities
      .filter(
        (entity) =>
          entity.type === "event" && entity.metadata?.meaningfulChange === true,
      )
      .map((entity) => {
        const related = relatedContext(scenario, entity);
        return {
          id: entity.id,
          title: entity.title,
          summary: entity.summary,
          time: entity.updatedAt || entity.createdAt,
          source: summarizeSource(entity),
          evidence: related.evidence.map((item) => item.title),
          decisions: related.decisions.map((item) => item.title),
        };
      }),
  );
}

function decisionPriority(decision) {
  if (decision.id === "decision-self-reentry-demo") return 0;
  if (decision.id === "decision-no-campus-demo") return 1;
  if (decision.id === "decision-archive-star-map") return 2;
  if (decision.id === "decision-editorial-direction") return 3;
  return 10;
}

export function getValidDecisions(scenario) {
  assertScenario(scenario);
  const { entities } = getIndexes(scenario);
  return freezeList(
    entities
      .filter(
        (entity) =>
          entity.type === "decision" && entity.status === "confirmed",
      )
      .sort(
        (left, right) =>
          decisionPriority(left) - decisionPriority(right) ||
          stableEntitySort(left, right),
      )
      .map((entity) => {
        const related = relatedContext(scenario, entity);
        return {
          id: entity.id,
          title: entity.title,
          summary: entity.summary,
          status: entity.status,
          confirmedBy: entity.confirmedBy || "Human confirmation",
          source: summarizeSource(entity),
          context:
            related.evidence[0]?.title ||
            relatedContext(scenario, entity).decisions[0]?.title ||
            entity.summary,
        };
      }),
  );
}

function getBrokenContext(scenario) {
  const { entities, byId, relationships } = getIndexes(scenario);
  const broken = new Map();

  for (const entity of entities) {
    if (
      ["stale", "disputed", "superseded", "blocked"].includes(entity.status) ||
      entity.metadata?.missingOwner === true
    ) {
      broken.set(entity.id, {
        id: entity.id,
        type: entity.type,
        title: entity.title,
        summary: entity.summary,
        status: entity.status,
        source: summarizeSource(entity),
        reason: entity.metadata?.missingOwner
          ? "No confirmed owner"
          : `Record is ${entity.status}`,
      });
    }
  }

  for (const relationship of relationships) {
    if (relationship.type !== "contradicts") continue;
    for (const id of [relationship.from, relationship.to]) {
      const entity = byId.get(id);
      if (!entity) continue;
      broken.set(entity.id, {
        id: entity.id,
        type: entity.type,
        title: entity.title,
        summary: entity.summary,
        status: entity.status,
        source: summarizeSource(entity),
        reason: "Conflicts with another agent memory",
      });
    }
  }

  return freezeList([...broken.values()].sort(stableEntitySort));
}

export function getRecommendedActions(scenario) {
  assertScenario(scenario);
  const { entities } = getIndexes(scenario);
  const tasks = entities.filter((entity) => entity.type === "task");
  const expected = Array.isArray(scenario.expectedFindings?.recommendedActions)
    ? scenario.expectedFindings.recommendedActions
    : [];

  const actionNames =
    expected.length > 0
      ? expected
      : tasks
          .filter((task) => task.metadata?.recommended === true)
          .map((task) => task.metadata?.recommendedAction || task.title);

  return freezeList(
    actionNames.map((label, index) => {
      const task = tasks.find(
        (candidate) =>
          candidate.metadata?.recommendedAction === label ||
          candidate.title === label,
      );
      return {
        id: task?.id || `recommended-action-${index + 1}`,
        label,
        title: task?.title || label,
        summary: task?.summary || "Recommended by the continuity findings.",
        status: task?.status || "proposed",
        priority: task?.priority || "medium",
        ownerId: task?.ownerId || "",
        completionCriteria:
          task?.completionCriteria || "Requires explicit human confirmation.",
      };
    }),
  );
}

function signalEntities(scenario, key) {
  const { entities, byId, relationships } = getIndexes(scenario);
  if (key === "stale") {
    return entities.filter((entity) =>
      ["stale", "superseded"].includes(entity.status),
    );
  }
  if (key === "conflict") {
    const ids = new Set();
    relationships
      .filter((relationship) => {
        const from = byId.get(relationship.from);
        const to = byId.get(relationship.to);
        return (
          relationship.type === "contradicts" &&
          from?.type === "agent_memory" &&
          to?.type === "agent_memory"
        );
      })
      .forEach((relationship) => {
        ids.add(relationship.from);
        ids.add(relationship.to);
      });
    return [...ids].map((id) => byId.get(id)).filter(Boolean);
  }
  if (key === "missing") {
    return entities.filter(
      (entity) =>
        entity.type === "risk" && entity.metadata?.missingOwner === true,
    );
  }
  return entities.filter(
    (entity) => entity.type === "decision" && entity.status === "confirmed",
  );
}

function signalCountKey(key) {
  return {
    stale: "staleRecords",
    conflict: "agentConflicts",
    missing: "missingOwners",
    valid: "validDecisions",
  }[key];
}

export function getContinuitySignals(scenario) {
  assertScenario(scenario);
  const observed = countObservedFindings(scenario);
  return freezeList(
    SIGNAL_ORDER.map((key) => {
      const definition = SIGNAL_DEFINITIONS[key];
      const findingKey = signalCountKey(key);
      const entities = signalEntities(scenario, key);
      return {
        ...definition,
        count: expectedCount(scenario, findingKey, observed[findingKey]),
        observedCount: observed[findingKey],
        compatible:
          expectedCount(scenario, findingKey, observed[findingKey]) ===
          observed[findingKey],
        entityIds: entities.map((entity) => entity.id),
      };
    }),
  );
}

function primaryEntityForSignal(scenario, key) {
  const entities = signalEntities(scenario, key);
  if (key === "stale") {
    return (
      entities.find((entity) => entity.id === "claim-campus-showcase") ||
      entities[0]
    );
  }
  if (key === "conflict") {
    return (
      entities.find((entity) => entity.status === "disputed") || entities[0]
    );
  }
  if (key === "missing") return entities[0];
  return (
    entities.find((entity) => entity.id === "decision-self-reentry-demo") ||
    entities[0]
  );
}

export function buildSignalDetails(scenario) {
  assertScenario(scenario);
  const signals = getContinuitySignals(scenario);
  const details = {};

  for (const signal of signals) {
    const selected = primaryEntityForSignal(scenario, signal.key);
    const relations = selected
      ? directRelations(scenario, selected.id).map((item) => ({
          relation: item.relation,
          direction: item.direction,
          title: item.entity.title,
          type: item.entity.type,
        }))
      : [];
    const evidenceChain = selected
      ? buildEvidenceChain(scenario, selected.id)
      : [];

    details[signal.key] = Object.freeze({
      ...signal,
      selectedId: selected?.id || "",
      selectedTitle: selected?.title || signal.title,
      selectedSummary: selected?.summary || signal.summary,
      status: selected?.status || "unavailable",
      source: selected ? summarizeSource(selected) : "No source recorded",
      whyItMatters: signal.summary,
      relations: freezeList(relations),
      evidenceChain,
      affectedDecision:
        evidenceChain.find((item) => item.type === "decision")?.title ||
        (selected?.type === "decision" ? selected.title : "No linked decision"),
      recommendedAction: signal.actionLabel,
    });
  }

  return Object.freeze(details);
}

function continuityScore(signals) {
  const valid = signals.find((signal) => signal.key === "valid")?.count ?? 0;
  const stale = signals.find((signal) => signal.key === "stale")?.count ?? 0;
  const conflict =
    signals.find((signal) => signal.key === "conflict")?.count ?? 0;
  const missing =
    signals.find((signal) => signal.key === "missing")?.count ?? 0;
  const total = valid + stale + conflict + missing;
  if (total === 0) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round(((valid + total - stale - conflict - missing) / (total * 2)) * 100)),
  );
}

function elapsedLabel(scenario) {
  const updated = Date.parse(scenario.project.updatedAt);
  const requested = Date.parse(scenario.reentryQuery?.requestedAt);
  if (!Number.isFinite(updated) || !Number.isFinite(requested)) {
    return "Elapsed time unavailable";
  }
  const days = Math.max(0, Math.floor((requested - updated) / 86_400_000));
  return days === 0 ? "Updated today" : `${days} days since last update`;
}

export function buildReentryViewModel(scenario) {
  assertScenario(scenario);
  const signals = getContinuitySignals(scenario);
  const signalDetails = buildSignalDetails(scenario);
  const meaningfulChanges = getMeaningfulChanges(scenario);
  const validDecisions = getValidDecisions(scenario);
  const brokenContext = getBrokenContext(scenario);
  const recommendedActions = getRecommendedActions(scenario);
  const hasRecords = scenario.entities.length > 0;

  return Object.freeze({
    project: Object.freeze({
      id: scenario.project.id,
      name: scenario.project.name,
      description: scenario.project.description,
      status: scenario.project.status,
      updatedAt: scenario.project.updatedAt,
    }),
    reportMeta: Object.freeze({
      title: "Project Re-entry Brief",
      prototype: "v0.9.4 Prototype",
      reportDate:
        scenario.reentryQuery?.requestedAt || scenario.project.updatedAt,
      sourceLabel: "Continuity fixture",
      runtimeLabel: "Runtime mapping verified",
      elapsedLabel: elapsedLabel(scenario),
    }),
    status: hasRecords ? "Context recovery required" : "No context available",
    continuityScore: continuityScore(signals),
    signals,
    meaningfulChanges,
    validDecisions,
    brokenContext,
    recommendedActions,
    selectedSignalDetails: signalDetails,
    empty: !hasRecords,
  });
}
