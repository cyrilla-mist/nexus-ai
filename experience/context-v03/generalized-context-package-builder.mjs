import { validateContextGraph } from "../context-v02/context-graph-validator.mjs";

export const GENERALIZED_CONTEXT_PACKAGE_VERSION = "0.3";

const LEDGER_ARRAYS = ["effectiveDecisions", "decisionChains", "proposedDecisions", "unresolvedConflicts", "inheritedMemories", "inferredMemories", "disputedMemories", "historicalMemories", "omittedRecords"];
const CHAIN_STATUSES = new Set(["resolved", "branching", "incomplete", "no_effective_decision"]);
const ACTION_STATUSES = new Set(["in_progress", "ready", "blocked", "proposed"]);
const ERROR_CODES = new Set(["INVALID_GRAPH", "INVALID_LEDGER", "INVALID_PROJECT_ID", "INVALID_SCOPE_KEY", "INVALID_GENERATED_AT", "INVALID_PACKAGE_VERSION", "PROJECT_NOT_FOUND", "PROJECT_KIND_MISMATCH", "PROJECT_NOT_ELIGIBLE", "LEDGER_VERSION_MISMATCH", "LEDGER_PROJECT_MISMATCH", "LEDGER_GENERATED_AT_MISMATCH", "LEDGER_SCOPE_MISMATCH", "PACKAGE_REFERENCE_MISSING", "PACKAGE_REFERENCE_KIND_MISMATCH", "PACKAGE_REFERENCE_SCOPE_MISMATCH", "PACKAGE_REFERENCE_RESTRICTED", "PACKAGE_SECTION_DUPLICATE", "PACKAGE_SOURCE_SUMMARY_MISMATCH"]);

export class GeneralizedContextPackageError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GeneralizedContextPackageError";
    this.code = code;
    this.details = { ...details };
  }
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

function fail(code, message, details = {}) {
  if (!ERROR_CODES.has(code)) throw new GeneralizedContextPackageError("INVALID_LEDGER", message, details);
  throw new GeneralizedContextPackageError(code, message, details);
}

function nonEmptyString(value) { return typeof value === "string" && Boolean(value.trim()); }
function strictIsoTimestamp(value) { return nonEmptyString(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)); }
function safeSlug(value) { return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""); }
function timeSlug(value) { return value.replace(/[:+]/g, "-"); }
function localPath(value) { return typeof value === "string" && (/^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || /^\/(?:home|Users)(?:\/|$)/.test(value) || (/^\//.test(value) && !/^\/[^/]+$/.test(value)) || /^file:\/\//i.test(value)); }

function safeSource(node) {
  const provenance = node.provenance || {};
  if (!nonEmptyString(provenance.provider) || !nonEmptyString(provenance.authority)) return null;
  return { provider: provenance.provider, authority: provenance.authority, reference: localPath(provenance.reference) ? null : (provenance.reference ?? null), capturedAt: provenance.capturedAt ?? null, retrievalMode: provenance.retrievalMode ?? null };
}

function safeRecord(node) {
  const source = safeSource(node);
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, lifecycle: node.lifecycle.state, verification: node.epistemic.verification, confidence: node.epistemic.confidence, freshness: node.epistemic.freshness, source };
}

function projectProject(node) {
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, currentPhase: node.payload.currentPhase, currentVersion: node.payload.currentVersion, currentMilestoneId: node.payload.currentMilestoneId, repositoryRefs: [...node.payload.repositoryRefs], source: safeSource(node) };
}

function projectDecision(node) {
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, subjectKey: node.payload.subjectKey, scopeKey: node.payload.scopeKey, question: node.payload.question, choice: node.payload.choice, rationale: node.payload.rationale, evidenceRefs: [...node.payload.evidenceRefs], decisionStatus: node.payload.decisionStatus, verification: node.epistemic.verification, freshness: node.epistemic.freshness, lifecycle: node.lifecycle.state, decidedAt: node.payload.decidedAt, decidedBy: node.payload.decidedBy, supersededBy: node.payload.supersededBy, source: safeSource(node) };
}

function projectMemory(node) {
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, subjectKey: node.payload.subjectKey, scopeKey: node.payload.scopeKey, statement: node.payload.statement, basis: node.payload.basis, memoryStatus: node.payload.memoryStatus, verification: node.epistemic.verification, confidence: node.epistemic.confidence, freshness: node.epistemic.freshness, lifecycle: node.lifecycle.state, relatedEntityRefs: [...node.payload.relatedEntityRefs], conflictsWith: [...node.payload.conflictsWith], source: safeSource(node) };
}

function projectEvidence(node) {
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, claim: node.payload.claim, sourceRef: node.payload.sourceRef, observedAt: node.payload.observedAt, appliesToVersion: node.payload.appliesToVersion, verificationMethod: node.payload.verificationMethod, result: node.payload.result, verification: node.epistemic.verification, confidence: node.epistemic.confidence, freshness: node.epistemic.freshness, lifecycle: node.lifecycle.state, source: safeSource(node) };
}

function projectAction(node) {
  return { id: node.id, kind: node.kind, title: node.title, summary: node.summary, description: node.payload.description, owner: node.payload.owner ?? null, priority: node.payload.priority, actionStatus: node.payload.actionStatus, completionCriteria: node.payload.completionCriteria, relatedDecisionRefs: [...node.payload.relatedDecisionRefs], externalEffect: node.payload.externalEffect, requiresConfirmation: node.payload.requiresConfirmation, lifecycle: node.lifecycle.state, verification: node.epistemic.verification, confidence: node.epistemic.confidence, freshness: node.epistemic.freshness, source: safeSource(node) };
}

function projectNode(node) { return node.kind === "decision" ? projectDecision(node) : node.kind === "memory" ? projectMemory(node) : node.kind === "evidence" ? projectEvidence(node) : node.kind === "action" ? projectAction(node) : safeRecord(node); }
function idOf(item) { return typeof item === "string" ? item : item?.id; }
function compareId(a, b) { return a.id.localeCompare(b.id); }
function compareAtId(a, b, field) { return String(a[field] ?? "").localeCompare(String(b[field] ?? "")) || a.id.localeCompare(b.id); }

function validateGraph(graph) {
  try { validateContextGraph(graph); } catch (error) { fail("INVALID_GRAPH", error.message, { validator: "context-v02", causeName: error.name, causeMessage: error.message }); }
}

function validateLedger(ledger, projectId, generatedAt) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) fail("INVALID_LEDGER", "ledger must be a non-array object.");
  if (ledger.ledgerVersion !== "0.2") fail("LEDGER_VERSION_MISMATCH", "ledgerVersion must be 0.2.");
  if (ledger.projectId !== projectId) fail("LEDGER_PROJECT_MISMATCH", "ledger.projectId must match projectId.");
  if (ledger.generatedAt !== generatedAt) fail("LEDGER_GENERATED_AT_MISMATCH", "ledger.generatedAt must match generatedAt.");
  for (const field of LEDGER_ARRAYS) if (!Array.isArray(ledger[field])) fail("INVALID_LEDGER", `${field} must be an array.`);
}

function validateProject(node) {
  if (!node) fail("PROJECT_NOT_FOUND", "Selected project was not found.");
  if (node.kind !== "project") fail("PROJECT_KIND_MISMATCH", "Selected node is not a project.");
  if (node.lifecycle.state !== "active" || node.epistemic.verification !== "confirmed" || node.epistemic.freshness !== "current" || node.governance.sensitivity === "restricted") fail("PROJECT_NOT_ELIGIBLE", "Selected project is not eligible.");
  if (!nonEmptyString(node.provenance?.provider) || !nonEmptyString(node.provenance?.authority)) fail("PROJECT_NOT_ELIGIBLE", "Selected project provenance is insufficient.", { reason: "provenance-insufficient" });
}

function validateReference(item, node, kind, projectId, scopeKey, field, nodes) {
  if (!node) fail("PACKAGE_REFERENCE_MISSING", `${field} references a missing node.`);
  if (node.kind !== kind) fail("PACKAGE_REFERENCE_KIND_MISMATCH", `${field} references the wrong kind.`);
  if (node.scope.projectId !== projectId || ["decision", "memory"].includes(kind) && node.payload.scopeKey !== scopeKey) fail("PACKAGE_REFERENCE_SCOPE_MISMATCH", `${field} references another scope.`);
  if (item?.scopeKey !== undefined && item.scopeKey !== scopeKey) fail("LEDGER_SCOPE_MISMATCH", `${field} scopeKey does not match.`);
  if (node.governance.sensitivity === "restricted") fail("PACKAGE_REFERENCE_RESTRICTED", `${field} references restricted content.`);
  if (["decision", "memory"].includes(kind) && !safeSource(node)) fail("INVALID_LEDGER", `${field} has insufficient provenance.`);
  return node;
}

function validateFullSections(ledger, nodes, projectId, scopeKey) {
  const full = new Map();
  const sections = [["effectiveDecisions", "decision"], ["proposedDecisions", "decision"], ["inheritedMemories", "memory"], ["inferredMemories", "memory"], ["disputedMemories", "memory"], ["historicalMemories", "memory"]];
  for (const [field, kind] of sections) for (const item of ledger[field]) {
    if (!item || typeof item !== "object" || !nonEmptyString(item.id) || !nonEmptyString(item.scopeKey)) fail("INVALID_LEDGER", `${field} item is invalid.`);
    const node = validateReference(item, nodes.get(item.id), kind, projectId, scopeKey, field, nodes);
    if (full.has(item.id)) fail("PACKAGE_SECTION_DUPLICATE", `${item.id} appears in multiple full sections.`);
    full.set(item.id, field);
    if (item.scopeKey !== scopeKey) fail("LEDGER_SCOPE_MISMATCH", `${field} scopeKey does not match.`);
    if (node.payload.scopeKey !== scopeKey) fail("PACKAGE_REFERENCE_SCOPE_MISMATCH", `${field} payload scope does not match.`);
  }
  return full;
}

function validateChains(ledger, nodes, projectId, scopeKey) {
  const seen = new Map();
  for (const chain of ledger.decisionChains) {
    if (!chain || typeof chain !== "object" || !nonEmptyString(chain.subjectKey) || !nonEmptyString(chain.scopeKey) || !CHAIN_STATUSES.has(chain.chainStatus) || !["rootDecisionIds", "orderedDecisionIds", "terminalDecisionIds"].every((x) => Array.isArray(chain[x]))) fail("INVALID_LEDGER", "decisionChain is invalid.");
    if (chain.scopeKey !== scopeKey) fail("LEDGER_SCOPE_MISMATCH", "decisionChain scopeKey does not match.");
    const normalized = { ...chain, rootDecisionIds: [...new Set(chain.rootDecisionIds)].sort(), orderedDecisionIds: [...chain.orderedDecisionIds], terminalDecisionIds: [...new Set(chain.terminalDecisionIds)].sort() };
    for (const id of [...normalized.rootDecisionIds, ...normalized.orderedDecisionIds, ...normalized.terminalDecisionIds]) validateReference({ scopeKey }, nodes.get(id), "decision", projectId, scopeKey, "decisionChains", nodes);
    const key = JSON.stringify([normalized.subjectKey, normalized.scopeKey]);
    if (seen.has(key) && JSON.stringify(seen.get(key)) !== JSON.stringify(normalized)) fail("INVALID_LEDGER", "Duplicate decision chain differs.");
    seen.set(key, normalized);
  }
  return [...seen.values()].sort((a, b) => a.subjectKey.localeCompare(b.subjectKey) || a.scopeKey.localeCompare(b.scopeKey));
}

function validateConflicts(ledger, nodes, projectId, scopeKey) {
  const seen = new Map();
  for (const conflict of ledger.unresolvedConflicts) {
    if (!conflict || typeof conflict !== "object" || !nonEmptyString(conflict.conflictId) || !nonEmptyString(conflict.type) || !nonEmptyString(conflict.subjectKey) || !nonEmptyString(conflict.scopeKey) || !Array.isArray(conflict.recordIds) || !nonEmptyString(conflict.explanation) || typeof conflict.autoResolvable !== "boolean" || !nonEmptyString(conflict.requiredResolution)) fail("INVALID_LEDGER", "unresolvedConflict is invalid.");
    if (conflict.scopeKey !== scopeKey) fail("LEDGER_SCOPE_MISMATCH", "conflict scopeKey does not match.");
    const output = { ...conflict, recordIds: [...new Set(conflict.recordIds)].sort() };
    if (!output.recordIds.length || output.recordIds.some((id) => !nonEmptyString(id))) fail("INVALID_LEDGER", "conflict recordIds must be non-empty strings.");
    for (const id of output.recordIds) validateReference({ scopeKey }, nodes.get(id), nodes.get(id)?.kind, projectId, scopeKey, "unresolvedConflicts", nodes);
    if (seen.has(output.conflictId) && JSON.stringify(seen.get(output.conflictId)) !== JSON.stringify(output)) fail("INVALID_LEDGER", "Duplicate conflictId differs.");
    seen.set(output.conflictId, output);
  }
  return [...seen.values()].sort((a, b) => a.type.localeCompare(b.type) || a.subjectKey.localeCompare(b.subjectKey) || a.conflictId.localeCompare(b.conflictId));
}

function validateLedgerOmissions(ledger, nodes, projectId, scopeKey) {
  return ledger.omittedRecords.map((item) => {
    if (!item || typeof item !== "object" || !nonEmptyString(item.id) || !nonEmptyString(item.rule)) fail("INVALID_LEDGER", "omittedRecord is invalid.");
    const node = nodes.get(item.id);
    if (!node) fail("PACKAGE_REFERENCE_MISSING", "omittedRecord references a missing node.");
    if (!["decision", "memory"].includes(node.kind)) fail("PACKAGE_REFERENCE_KIND_MISMATCH", "omittedRecord references a non-governed node.");
    if (node.scope.projectId !== projectId || node.payload.scopeKey !== scopeKey) fail("PACKAGE_REFERENCE_SCOPE_MISMATCH", "omittedRecord references another scope.");
    return { id: node.id, kind: node.kind, rule: item.rule, reason: "Excluded by Decision / Memory governance." };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.rule.localeCompare(b.rule));
}

function explicitOmissions(graph) {
  const declarations = graph.contextPackage?.omittedContext;
  if (!Array.isArray(declarations)) return [];
  return declarations.map((item) => {
    if (!item || !nonEmptyString(item.item) || !nonEmptyString(item.reason)) fail("INVALID_GRAPH", "Explicit omission declaration is invalid.");
    return { item: item.item, rule: "explicit-declaration", reason: item.reason };
  });
}

function computedOmissions(nodes) {
  return nodes.flatMap((node) => {
    if (node.governance.sensitivity === "restricted") return [{ id: node.id, kind: node.kind, rule: "restricted", reason: "Restricted sensitivity." }];
    if (node.governance.inheritance === "never") return [{ id: node.id, kind: node.kind, rule: "inheritance-never", reason: "Inheritance is never." }];
    if (node.governance.inheritance === "explicit_only") return [{ id: node.id, kind: node.kind, rule: "explicit-only-no-consent", reason: "No explicit consent was provided." }];
    if (node.lifecycle.state === "revoked") return [{ id: node.id, kind: node.kind, rule: "revoked", reason: "Node is revoked." }];
    if (!safeSource(node)) return [{ id: node.id, kind: node.kind, rule: "provenance-insufficient", reason: "Provenance is insufficient." }];
    return [];
  });
}

function normalizeOmissions(declarations, ledger, computed) {
  const seen = new Set();
  return [...declarations, ...ledger, ...computed].filter((item) => {
    const key = item.item !== undefined ? `d\u0000${item.item}\u0000${item.rule}` : `r\u0000${item.id}\u0000${item.rule}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function buildSummary(project, fullSections, chains, conflicts, nodes) {
  const ids = new Set([project.id, ...fullSections.flatMap((items) => items.map((item) => item.id)), ...chains.flatMap((chain) => [...chain.rootDecisionIds, ...chain.orderedDecisionIds, ...chain.terminalDecisionIds]), ...conflicts.flatMap((item) => item.recordIds)]);
  const included = [...ids].map((id) => nodes.get(id)).filter(Boolean).filter((node) => node.governance.sensitivity !== "restricted");
  const providers = Object.fromEntries([...new Set(included.map((node) => node.provenance.provider))].sort().map((provider) => [provider, included.filter((node) => node.provenance.provider === provider).length]));
  const byKind = Object.fromEntries([...new Set(included.map((node) => node.kind))].sort().map((kind) => [kind, included.filter((node) => node.kind === kind).length]));
  const total = included.length;
  if (Object.values(providers).reduce((a, b) => a + b, 0) !== total || Object.values(byKind).reduce((a, b) => a + b, 0) !== total) fail("PACKAGE_SOURCE_SUMMARY_MISMATCH", "sourceSummary totals do not match.");
  return { basis: "canonical-records", totalIncludedRecords: total, providers, byKind };
}

function classifyNonGoverned(graphNodes, projectId, full) {
  const result = { identityConfirmed: [], identityInferred: [], goals: [], evidenceCurrent: [], evidenceInferred: [], evidenceDisputed: [], evidenceHistorical: [], recordsDisputed: [], recordsHistorical: [], risks: [], actions: [] };
  for (const node of graphNodes) {
    if (node.scope.projectId !== projectId || node.governance.sensitivity === "restricted" || ["project", "decision", "memory"].includes(node.kind)) continue;
    if (!safeSource(node)) continue;
    let destination = null;
    if (node.kind === "identity" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification === "confirmed") destination = "identityConfirmed";
    else if (node.kind === "identity" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification === "inferred") destination = "identityInferred";
    else if (node.kind === "goal" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification !== "disputed") destination = "goals";
    else if (node.kind === "evidence" && node.epistemic.verification === "disputed" && node.lifecycle.state !== "revoked") destination = "evidenceDisputed";
    else if (node.kind === "evidence" && node.epistemic.verification !== "disputed" && (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || ["archived", "superseded"].includes(node.lifecycle.state))) destination = "evidenceHistorical";
    else if (node.kind === "evidence" && node.lifecycle.state === "active" && node.epistemic.verification === "inferred" && node.epistemic.freshness === "current") destination = "evidenceInferred";
    else if (node.kind === "evidence" && node.lifecycle.state === "active" && node.epistemic.verification === "confirmed" && node.epistemic.freshness === "current") destination = "evidenceCurrent";
    else if (node.kind === "risk" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification !== "disputed") destination = "risks";
    else if (node.kind === "action" && node.lifecycle.state === "active" && node.epistemic.freshness === "current" && node.epistemic.verification !== "disputed" && ACTION_STATUSES.has(node.payload.actionStatus)) destination = "actions";
    else if (node.kind !== "evidence" && node.epistemic.verification === "disputed" && node.lifecycle.state !== "revoked") destination = "recordsDisputed";
    else if (node.kind !== "evidence" && node.epistemic.verification !== "disputed" && (node.epistemic.freshness === "stale" || node.epistemic.freshness === "expired" || ["archived", "superseded"].includes(node.lifecycle.state))) destination = "recordsHistorical";
    if (destination && full.has(node.id)) fail("PACKAGE_SECTION_DUPLICATE", `${node.id} appears in multiple full sections.`);
    if (destination) { full.set(node.id, destination); result[destination].push(projectNode(node)); }
  }
  for (const values of Object.values(result)) values.sort(compareId);
  return result;
}

export function buildGeneralizedContextPackage(options = {}) {
  const { graph, ledger, projectId, scopeKey, generatedAt } = options;
  if (!nonEmptyString(projectId)) fail("INVALID_PROJECT_ID", "projectId must be a non-empty string.");
  if (!nonEmptyString(scopeKey)) fail("INVALID_SCOPE_KEY", "scopeKey must be a non-empty string.");
  if (!strictIsoTimestamp(generatedAt)) fail("INVALID_GENERATED_AT", "generatedAt must be a complete ISO date-time.");
  validateGraph(graph);
  validateLedger(ledger, projectId, generatedAt);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const project = nodes.get(projectId); validateProject(project);
  const full = validateFullSections(ledger, nodes, projectId, scopeKey);
  const chains = validateChains(ledger, nodes, projectId, scopeKey);
  const conflicts = validateConflicts(ledger, nodes, projectId, scopeKey);
  const ledgerOmissions = validateLedgerOmissions(ledger, nodes, projectId, scopeKey);
  const decisionsEffective = ledger.effectiveDecisions.map((item) => projectDecision(nodes.get(item.id))).sort((a, b) => compareAtId(a, b, "decidedAt"));
  const decisionsProposed = ledger.proposedDecisions.map((item) => projectDecision(nodes.get(item.id))).sort((a, b) => compareAtId(a, b, "decidedAt"));
  const memories = { inherited: ledger.inheritedMemories.map((item) => projectMemory(nodes.get(item.id))), inferred: ledger.inferredMemories.map((item) => projectMemory(nodes.get(item.id))), disputed: ledger.disputedMemories.map((item) => projectMemory(nodes.get(item.id))), historical: ledger.historicalMemories.map((item) => projectMemory(nodes.get(item.id))) };
  for (const values of Object.values(memories)) values.sort((a, b) => String(a.subjectKey).localeCompare(String(b.subjectKey)) || String(nodes.get(a.id).lifecycle.updatedAt).localeCompare(String(nodes.get(b.id).lifecycle.updatedAt)) || a.id.localeCompare(b.id));
  const classified = classifyNonGoverned(graph.nodes, projectId, full);
  const fullSections = [classified.identityConfirmed, classified.identityInferred, classified.goals, decisionsEffective, decisionsProposed, ...Object.values(memories), classified.evidenceCurrent, classified.evidenceInferred, classified.evidenceDisputed, classified.evidenceHistorical, classified.recordsDisputed, classified.recordsHistorical, classified.risks, classified.actions];
  const omissions = normalizeOmissions(explicitOmissions(graph), ledgerOmissions, computedOmissions(graph.nodes.filter((node) => node.scope.projectId === projectId && !full.has(node.id) && node.kind !== "project" && !["decision", "memory"].includes(node.kind))));
  const result = { packageVersion: GENERALIZED_CONTEXT_PACKAGE_VERSION, packageId: `context-package:${safeSlug(projectId)}:${timeSlug(generatedAt)}`, generatedAt, scope: { projectId, scopeKey }, project: projectProject(project), identity: { confirmed: classified.identityConfirmed, inferred: classified.identityInferred }, goals: { active: classified.goals }, decisions: { effective: decisionsEffective, proposed: decisionsProposed, chains }, memories, evidence: { current: classified.evidenceCurrent, inferred: classified.evidenceInferred, disputed: classified.evidenceDisputed, historical: classified.evidenceHistorical }, records: { disputed: classified.recordsDisputed, historical: classified.recordsHistorical }, risks: { open: classified.risks }, actions: { next: classified.actions }, conflicts: { unresolved: conflicts }, omissions, sourceSummary: buildSummary(project, fullSections, chains, conflicts, nodes) };
  return deepFreeze(clone(result));
}

function legacySource(source) { return { provider: source?.provider ?? null, reference: source?.reference ?? null }; }
function legacySafe(record) { return { id: record.id, kind: record.kind, title: record.title, summary: record.summary, verification: record.verification, freshness: record.freshness, lifecycle: record.lifecycle, source: legacySource(record.source) }; }
function legacyProject(project) { return { id: project.id, title: project.title, summary: project.summary, currentPhase: project.currentPhase, currentVersion: project.currentVersion, currentMilestoneId: project.currentMilestoneId, repositoryRefs: [...project.repositoryRefs], source: legacySource(project.source) }; }
function legacyRecord(record) { return legacySafe(record); }
function legacyDecision(record) { return { ...legacySafe(record), question: record.question, choice: record.choice, rationale: record.rationale, decisionStatus: record.decisionStatus, decidedAt: record.decidedAt, decidedBy: record.decidedBy, supersededBy: record.supersededBy }; }
function legacyEvidence(record) { return { ...legacySafe(record), claim: record.claim, sourceRef: record.sourceRef, observedAt: record.observedAt, appliesToVersion: record.appliesToVersion, verificationMethod: record.verificationMethod, result: record.result }; }
function legacyAction(record) { return { ...legacySafe(record), description: record.description, owner: record.owner, priority: record.priority, actionStatus: record.actionStatus, completionCriteria: record.completionCriteria, relatedDecisionRefs: [...record.relatedDecisionRefs], externalEffect: record.externalEffect, requiresConfirmation: record.requiresConfirmation }; }

export function adaptGeneralizedContextPackageToV02(packageV03) {
  if (!packageV03 || typeof packageV03 !== "object" || Array.isArray(packageV03) || packageV03.packageVersion !== "0.3") fail("INVALID_PACKAGE_VERSION", "Adapter requires a v0.3 package.");
  const identity = [...(packageV03.identity?.confirmed || []), ...(packageV03.identity?.inferred || [])].map(legacyRecord);
  const goals = (packageV03.goals?.active || []).map(legacyRecord);
  const decisions = (packageV03.decisions?.effective || []).map(legacyDecision);
  const evidence = (packageV03.evidence?.current || []).map(legacyEvidence);
  const disputed = [...(packageV03.memories?.disputed || []), ...(packageV03.evidence?.disputed || []), ...(packageV03.records?.disputed || [])].map(legacyRecord);
  const stale = [...(packageV03.memories?.historical || []), ...(packageV03.evidence?.historical || []), ...(packageV03.records?.historical || [])].map(legacyRecord);
  const risks = (packageV03.risks?.open || []).map(legacyRecord);
  const actions = (packageV03.actions?.next || []).map(legacyAction);
  const omittedContext = (packageV03.omissions || []).map((item) => item.item !== undefined ? { item: item.item, reason: item.reason } : { id: item.id, reason: item.reason, rule: item.rule });
  const records = [packageV03.project, ...identity, ...goals, ...decisions, ...evidence, ...disputed, ...stale, ...risks, ...actions];
  const ids = new Set(records.map((item) => item.id));
  const providers = Object.fromEntries([...new Set(records.map((item) => item.source.provider))].sort().map((provider) => [provider, records.filter((item) => item.source.provider === provider).length]));
  const result = { packageVersion: "0.2", packageId: `context-package:${safeSlug(packageV03.scope.projectId.replace(/^project:/, ""))}:${timeSlug(packageV03.generatedAt)}`, generatedAt: packageV03.generatedAt, project: legacyProject(packageV03.project), identitySnapshot: identity, activeGoals: goals, confirmedDecisions: decisions, currentEvidence: evidence, disputedContext: disputed, staleContext: stale, openRisks: risks, nextActions: actions, omittedContext, sourceSummary: { totalIncludedNodes: ids.size, providers } };
  return deepFreeze(clone(result));
}
