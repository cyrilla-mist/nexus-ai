export const PRODUCT_SURFACE_VERSION = "nexus-atlas.product-surface.v0.1";

const ERROR_CODES = new Set([
  "INVALID_PRODUCT_SURFACE_INPUT",
  "PROJECT_SCOPE_NOT_FOUND",
  "DUPLICATE_SURFACE_RECORD_ID",
  "INVALID_SURFACE_STATE",
  "PRIVACY_BOUNDARY_VIOLATION",
  "UNSUPPORTED_PRODUCT_SURFACE_VERSION",
]);

const STATE_LIFECYCLE = new Set(["active", "completed", "archived", "superseded", "revoked"]);
const STATE_VERIFICATION = new Set(["confirmed", "inferred", "unverified", "disputed"]);
const STATE_FRESHNESS = new Set(["current", "stale", "expired", "unknown"]);

export class ProductSurfaceProjectionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProductSurfaceProjectionError";
    this.code = ERROR_CODES.has(code) ? code : "INVALID_PRODUCT_SURFACE_INPUT";
    this.details = { ...details };
  }
}

function fail(code, message, details = {}) {
  throw new ProductSurfaceProjectionError(code, message, details);
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_PRODUCT_SURFACE_INPUT", `${label} must be an object.`);
  }
  return value;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function nonEmpty(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isLocalPath(value) {
  return typeof value === "string" && (
    /^[A-Za-z]:[\\/]/.test(value)
    || /^\\\\/.test(value)
    || /^file:\/\//i.test(value)
    || /^\/(?:Users|home|tmp|mnt|private|var|etc)\//.test(value)
  );
}

function sanitizeReference(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") fail("PRIVACY_BOUNDARY_VIOLATION", "Provenance reference must be a string or null.");
  if (isLocalPath(value)) return null;
  if (/[?#]/.test(value)) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      if (parsed.username || parsed.password) return null;
    }
  } catch {
    return null;
  }
  return value;
}

function normalizeSource(source, node) {
  const input = source && typeof source === "object" ? source : node?.provenance || {};
  return {
    provider: nonEmpty(input.provider) ? input.provider : null,
    reference: sanitizeReference(input.reference),
    capturedAt: nonEmpty(input.capturedAt) ? input.capturedAt : null,
    retrievalMode: nonEmpty(input.retrievalMode) ? input.retrievalMode : null,
    authority: nonEmpty(input.authority) ? input.authority : null,
  };
}

function normalizeState(record, node) {
  const lifecycle = record?.lifecycle ?? node?.lifecycle?.state;
  const verification = record?.verification ?? node?.epistemic?.verification;
  const freshness = record?.freshness ?? node?.epistemic?.freshness;
  if (!STATE_LIFECYCLE.has(lifecycle) || !STATE_VERIFICATION.has(verification) || !STATE_FRESHNESS.has(freshness)) {
    fail("INVALID_SURFACE_STATE", `Record ${node?.id || record?.id || "<unknown>"} has an invalid state.`, { lifecycle, verification, freshness });
  }
  return { lifecycle, verification, freshness };
}

function normalizeGovernance(node) {
  const governance = node?.governance || {};
  if (governance.sensitivity === "restricted") {
    fail("PRIVACY_BOUNDARY_VIOLATION", `Restricted record cannot enter Product Surface: ${node.id}`, { id: node.id });
  }
  return {
    sensitivity: governance.sensitivity ?? null,
    inheritance: governance.inheritance ?? null,
    requiresConfirmation: governance.requiresConfirmation === true,
  };
}

function relatedIds(node, nodeMap) {
  const payload = node?.payload || {};
  const values = [];
  for (const key of ["evidenceRefs", "relatedEntityRefs", "relatedDecisionRefs", "conflictsWith"]) {
    for (const id of array(payload[key])) if (nonEmpty(id) && nodeMap.has(id)) values.push(id);
  }
  for (const key of ["supersededBy", "currentMilestoneId"]) {
    const id = payload[key];
    if (nonEmpty(id) && nodeMap.has(id)) values.push(id);
  }
  return [...new Set(values)].sort();
}

function surfaceRecord(record, node, nodeMap) {
  if (!node) fail("INVALID_PRODUCT_SURFACE_INPUT", `Surface record is missing canonical node: ${record?.id || "<unknown>"}`);
  if (record?.id && record.id !== node.id) fail("INVALID_PRODUCT_SURFACE_INPUT", "Surface record identity does not match canonical node.");
  if (record?.kind && record.kind !== node.kind) fail("INVALID_PRODUCT_SURFACE_INPUT", `Surface record kind mismatch for ${node.id}.`);
  return {
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary,
    state: normalizeState(record, node),
    provenance: normalizeSource(record?.source, node),
    governance: normalizeGovernance(node),
    relatedIds: relatedIds(node, nodeMap),
  };
}

function actionRecord(record, node, nodeMap) {
  return {
    ...surfaceRecord(record, node, nodeMap),
    actionStatus: record?.actionStatus ?? node.payload.actionStatus,
    owner: record?.owner ?? node.payload.owner ?? null,
    priority: record?.priority ?? node.payload.priority ?? null,
    completionCriteria: record?.completionCriteria ?? node.payload.completionCriteria ?? null,
    externalEffect: record?.externalEffect ?? node.payload.externalEffect ?? false,
    requiresConfirmation: record?.requiresConfirmation ?? node.payload.requiresConfirmation ?? false,
  };
}

function sortRecords(records) {
  return records.sort((a, b) => a.id.localeCompare(b.id));
}

function projectRecords(records, nodeMap, mapper = surfaceRecord) {
  return sortRecords(array(records).map((record) => mapper(record, nodeMap.get(record.id), nodeMap)));
}

function historicalDecisions(ledger, generalizedPackage, nodeMap) {
  const effective = new Set(array(generalizedPackage.decisions?.effective).map((item) => item.id));
  const proposed = new Set(array(generalizedPackage.decisions?.proposed).map((item) => item.id));
  const omitted = new Set(array(ledger.omittedRecords).map((item) => item.id));
  const ids = [];
  for (const chain of array(ledger.decisionChains)) {
    for (const id of array(chain.orderedDecisionIds)) {
      if (!effective.has(id) && !proposed.has(id) && !omitted.has(id)) ids.push(id);
    }
  }
  return sortRecords([...new Set(ids)].map((id) => {
    const node = nodeMap.get(id);
    if (!node || node.kind !== "decision") fail("INVALID_PRODUCT_SURFACE_INPUT", `Historical decision cannot resolve: ${id}`);
    return surfaceRecord(null, node, nodeMap);
  }));
}

function projectSummary(pkg, projectNode) {
  const milestoneId = projectNode.payload.currentMilestoneId;
  return {
    id: projectNode.id,
    title: pkg.project.title,
    summary: pkg.project.summary,
    currentPhase: pkg.project.currentPhase ?? projectNode.payload.currentPhase ?? null,
    currentVersion: pkg.project.currentVersion ?? projectNode.payload.currentVersion ?? null,
    currentMilestone: milestoneId ?? null,
    lastActiveAt: projectNode.payload.lastActiveAt ?? null,
    territoryIds: [...array(projectNode.payload.territoryIds)],
    repositoryRefs: array(pkg.project.repositoryRefs ?? projectNode.payload.repositoryRefs).map(sanitizeReference).filter(Boolean),
    state: normalizeState(null, projectNode),
    provenance: normalizeSource(pkg.project.source, projectNode),
  };
}

function flattenSurfaceRecords(surface) {
  return [
    { section: "project", record: surface.project },
    ...surface.identity.map((record) => ({ section: "identity", record })),
    ...surface.decisions.effective.map((record) => ({ section: "decisions.effective", record })),
    ...surface.decisions.proposed.map((record) => ({ section: "decisions.proposed", record })),
    ...surface.decisions.historical.map((record) => ({ section: "decisions.historical", record })),
    ...surface.memories.confirmed.map((record) => ({ section: "memories.confirmed", record })),
    ...surface.memories.inferred.map((record) => ({ section: "memories.inferred", record })),
    ...surface.memories.disputed.map((record) => ({ section: "memories.disputed", record })),
    ...surface.memories.historical.map((record) => ({ section: "memories.historical", record })),
    ...surface.evidence.current.map((record) => ({ section: "evidence.current", record })),
    ...surface.evidence.stale.map((record) => ({ section: "evidence.stale", record })),
    ...surface.evidence.disputed.map((record) => ({ section: "evidence.disputed", record })),
    ...surface.risks.map((record) => ({ section: "risks", record })),
    ...surface.actions.map((record) => ({ section: "actions", record })),
  ];
}

function buildInspectorIndex(surface) {
  const seen = new Set();
  return flattenSurfaceRecords(surface).map(({ section, record }) => {
    if (seen.has(record.id)) fail("DUPLICATE_SURFACE_RECORD_ID", `Duplicate inspectable record id: ${record.id}`, { id: record.id });
    seen.add(record.id);
    return { id: record.id, kind: record.kind ?? "project", section, title: record.title };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function buildSourceSummary(surface, sourceInfo) {
  const records = flattenSurfaceRecords(surface).map((item) => item.record);
  const byId = new Map(records.map((record) => [record.id, record]));
  const providers = new Map();
  for (const record of byId.values()) {
    const provenance = record.provenance || {};
    const provider = provenance.provider;
    if (!provider) continue;
    if (!providers.has(provider)) providers.set(provider, []);
    providers.get(provider).push(record);
  }
  return [...providers.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([provider, providerRecords]) => {
    const captured = providerRecords.map((record) => record.provenance?.capturedAt).filter(nonEmpty).sort();
    return {
      provider,
      recordCount: providerRecords.length,
      currentCount: providerRecords.filter((record) => record.state?.freshness === "current").length,
      staleCount: providerRecords.filter((record) => ["stale", "expired"].includes(record.state?.freshness)).length,
      disputedCount: providerRecords.filter((record) => record.state?.verification === "disputed").length,
      latestCapturedAt: captured.at(-1) ?? null,
      mode: sourceInfo?.mode ?? "unknown",
    };
  });
}

export function buildProductSurface({ providerResult, view = "desk", territoryId } = {}) {
  object(providerResult, "providerResult");
  const graph = object(providerResult.graph, "providerResult.graph");
  const ledger = object(providerResult.decisionMemoryLedger, "providerResult.decisionMemoryLedger");
  const pkg = object(providerResult.generalizedContextPackage, "providerResult.generalizedContextPackage");
  if (pkg.packageVersion !== "0.3") fail("UNSUPPORTED_PRODUCT_SURFACE_VERSION", "Product Surface v0.1 requires generalized Context Package v0.3.");
  if (!Array.isArray(graph.nodes)) fail("INVALID_PRODUCT_SURFACE_INPUT", "providerResult.graph.nodes must be an array.");
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const projectId = pkg.scope?.projectId;
  const projectNode = nodeMap.get(projectId);
  if (!projectNode || projectNode.kind !== "project") fail("PROJECT_SCOPE_NOT_FOUND", `Selected project was not found: ${projectId}`);

  const identity = projectRecords([...(pkg.identity?.confirmed || []), ...(pkg.identity?.inferred || [])], nodeMap);
  const decisions = {
    effective: projectRecords(pkg.decisions?.effective, nodeMap),
    proposed: projectRecords(pkg.decisions?.proposed, nodeMap),
    historical: historicalDecisions(ledger, pkg, nodeMap),
  };
  const memories = {
    confirmed: projectRecords(pkg.memories?.inherited, nodeMap),
    inferred: projectRecords(pkg.memories?.inferred, nodeMap),
    disputed: projectRecords(pkg.memories?.disputed, nodeMap),
    historical: projectRecords(pkg.memories?.historical, nodeMap),
  };
  const evidence = {
    current: projectRecords([...(pkg.evidence?.current || []), ...(pkg.evidence?.inferred || [])], nodeMap),
    stale: projectRecords(pkg.evidence?.historical, nodeMap),
    disputed: projectRecords(pkg.evidence?.disputed, nodeMap),
  };
  const risks = projectRecords(pkg.risks?.open, nodeMap);
  const actions = projectRecords(pkg.actions?.next, nodeMap, actionRecord);

  const surface = {
    version: PRODUCT_SURFACE_VERSION,
    generatedAt: pkg.generatedAt,
    scope: {
      projectId,
      territoryId: territoryId ?? projectNode.scope?.territoryId ?? null,
      view,
    },
    project: projectSummary(pkg, projectNode),
    identity,
    decisions,
    memories,
    evidence,
    risks,
    actions,
    sourceSummary: [],
    inspectorIndex: [],
  };
  surface.inspectorIndex = buildInspectorIndex(surface);
  surface.sourceSummary = buildSourceSummary(surface, providerResult.sourceInfo);
  return deepFreeze(clone(surface));
}
