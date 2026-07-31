const PACKAGE_VERSION = "1.0";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function summarizeSource(entity) {
  const provider = text(entity?.source?.provider) || "nexus";
  const reference = text(entity?.source?.reference) || text(entity?.id);
  return { provider, reference };
}

function recordView(entity) {
  return Object.freeze({
    id: text(entity?.id),
    type: text(entity?.type) || "record",
    title: text(entity?.title) || text(entity?.name) || text(entity?.id),
    summary: text(entity?.summary) || text(entity?.description),
    status: text(entity?.status) || "unknown",
    source: Object.freeze(summarizeSource(entity)),
  });
}

function isUnresolved(entity) {
  return (
    ["stale", "disputed", "superseded", "blocked"].includes(entity?.status) ||
    entity?.metadata?.missingOwner === true ||
    entity?.metadata?.ownerMissing === true
  );
}

function isTrustedEvidence(entity) {
  if (!["evidence", "external_asset", "source", "claim"].includes(entity?.type)) {
    return false;
  }
  return !isUnresolved(entity);
}

function isOpenAction(entity) {
  if (!["task", "action"].includes(entity?.type)) return false;
  return !["completed", "confirmed", "cancelled"].includes(entity?.status);
}

function uniqueStrings(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function normalizeAuditRepair(event) {
  return Object.freeze({
    id: text(event?.id),
    type: text(event?.type) || "context_repair",
    entityId: text(event?.entityId),
    targetUrn: text(event?.targetUrn),
    operation: text(event?.operation),
    ownerUrn: text(event?.ownerUrn),
    verifiedAt: text(event?.verifiedAt) || text(event?.recordedAt),
    verification: text(event?.verification),
  });
}

export function buildContextPackage(options = {}) {
  const scenario = options.scenario;
  if (!isObject(scenario) || !isObject(scenario.project)) {
    throw new TypeError("A continuity scenario with a project is required.");
  }

  const entities = list(scenario.entities);
  const auditEvents = list(options.auditEvents);
  const now = options.now || (() => new Date());
  const sourceInfo = isObject(options.sourceInfo) ? options.sourceInfo : {};

  const validDecisions = entities
    .filter(
      (entity) => entity.type === "decision" && entity.status === "confirmed",
    )
    .map(recordView);

  const trustedEvidence = entities.filter(isTrustedEvidence).map(recordView);
  const unresolvedRisks = entities.filter(isUnresolved).map(recordView);
  const entityActions = entities.filter(isOpenAction).map(recordView);
  const recommendedActions = uniqueStrings(
    list(scenario.expectedFindings?.recommendedActions),
  ).map((label, index) =>
    Object.freeze({
      id: `recommended-action-${String(index + 1).padStart(2, "0")}`,
      type: "recommended_action",
      title: label,
      summary: "",
      status: "recommended",
      source: Object.freeze({ provider: "nexus", reference: scenario.project.id }),
    }),
  );

  const completedRepairs = auditEvents
    .filter(
      (event) =>
        event?.type === "context_repair" &&
        (event?.verified === true || event?.verifiedAt),
    )
    .map(normalizeAuditRepair);

  const policies = uniqueStrings([
    ...list(scenario.policies),
    ...list(scenario.project?.metadata?.policies),
    ...list(options.policies),
  ]);

  const requestedCapabilities = uniqueStrings([
    ...list(scenario.reentryQuery?.requestedCapabilities),
    ...list(scenario.project?.metadata?.requestedCapabilities),
    ...list(options.requestedCapabilities),
  ]);

  return Object.freeze({
    packageVersion: PACKAGE_VERSION,
    persistence: "session-local",
    durable: false,
    generatedAt: now().toISOString(),
    projectId: text(scenario.project.id),
    territory: text(options.territory) || "innovation",
    currentGoal:
      text(scenario.project.currentMilestone) ||
      text(scenario.project.goal) ||
      text(scenario.project.description),
    validDecisions: Object.freeze(validDecisions),
    trustedEvidence: Object.freeze(trustedEvidence),
    unresolvedRisks: Object.freeze(unresolvedRisks),
    completedRepairs: Object.freeze(completedRepairs),
    nextActions: Object.freeze([...entityActions, ...recommendedActions]),
    policies: Object.freeze(policies),
    requestedCapabilities: Object.freeze(requestedCapabilities),
    sourceInfo: Object.freeze({
      mode: text(sourceInfo.mode) || text(scenario.runtime?.sourceMode) || "unknown",
      label: text(sourceInfo.label),
      live: sourceInfo.live === true,
      readOnly: sourceInfo.readOnly !== false,
      fetchedAt: text(sourceInfo.fetchedAt),
    }),
  });
}
