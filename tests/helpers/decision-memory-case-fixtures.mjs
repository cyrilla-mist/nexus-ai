const stamp = "2026-08-03T22:30:00+08:00";
const projectId = "project:test";
const scopeKey = "project:test";

const base = (id, kind, payload, overrides = {}) => ({
  id, kind, title: id, summary: `${kind} ${id}`,
  scope: { userId: "user:test", territoryId: "territory:test", projectId },
  lifecycle: { state: "active", createdAt: stamp, updatedAt: stamp },
  epistemic: { verification: "confirmed", confidence: 1, freshness: "current" },
  provenance: { provider: "human-decision", reference: `synthetic:${id}`, capturedAt: stamp, authority: "human-confirmation" },
  governance: { sensitivity: "public", inheritance: "project_only", requiresConfirmation: false }, payload, ...overrides,
});
const decision = (id, subject = "product.direction", choice = id, overrides = {}) => base(id, "decision", { subjectKey: subject, scopeKey, question: `Question for ${id}`, choice, rationale: `Rationale for ${id}`, evidenceRefs: ["evidence:case"], alternatives: [], constraints: [], decidedAt: stamp, decidedBy: "user:test", decisionStatus: "confirmed", supersededBy: null }, overrides);
const memory = (id, overrides = {}) => base(id, "memory", { subjectKey: "memory.subject", scopeKey, statement: `Statement for ${id}`, basis: "explicit synthetic basis", relatedEntityRefs: ["project:test"], conflictsWith: [], supersededBy: null, memoryStatus: "recorded" }, overrides);
const evidence = () => base("evidence:case", "evidence", { claim: "Synthetic evidence", sourceRef: "synthetic", observedAt: stamp, appliesToVersion: "0.2", verificationMethod: "fixture", result: "confirmed" }, { provenance: { provider: "synthetic", reference: "synthetic:evidence", capturedAt: stamp, authority: "test-fixture" } });
const project = () => base("project:test", "project", { purpose: "Synthetic Decision / Memory test project", currentPhase: "Phase 2B", currentVersion: "0.2", currentMilestoneId: null, territoryIds: ["territory:test"], lastActiveAt: stamp, repositoryRefs: ["synthetic"] }, { provenance: { provider: "synthetic", reference: "synthetic:project", capturedAt: stamp, authority: "test-fixture" } });
const edge = (id, from, to, type = "supersedes", state = "active") => ({ id, from, to, type, lifecycle: { state, createdAt: stamp, updatedAt: stamp }, provenance: { provider: "synthetic", reference: `synthetic:${id}` }, metadata: {} });
const graphOf = (nodes, edges = []) => ({ metadata: { schemaVersion: "0.2-proposed", example: true, runtimeEvidence: false, generatedAt: stamp }, nodes: [project(), evidence(), ...nodes], edges, contextPackage: {} });

export function buildDecisionMemoryCase(caseId) {
  let nodes = []; let edges = []; let consentedRecordIds = [];
  switch (caseId) {
    case "DM-D01": nodes = [decision("decision:current")]; break;
    case "DM-D02": nodes = [decision("decision:old"), decision("decision:new-proposed", "product.direction", "new", { epistemic: { verification: "inferred", confidence: 0.5, freshness: "current" }, provenance: { provider: "ai", reference: "synthetic:proposal", capturedAt: stamp, authority: "ai-inference" }, payload: { ...decision("tmp").payload, subjectKey: "product.direction", scopeKey, choice: "new", decisionStatus: "proposed", supersededBy: null } })]; break;
    case "DM-D03": { const old = decision("decision:old"); old.payload.supersededBy = "decision:new"; nodes = [old, decision("decision:new")]; edges = [edge("edge:old-new", "decision:old", "decision:new")]; break; }
    case "DM-D04": { const a = decision("decision:A"); const b = decision("decision:B"); a.payload.supersededBy = "decision:B"; b.payload.supersededBy = "decision:C"; nodes = [a, b, decision("decision:C")]; edges = [edge("edge:A-B", "decision:A", "decision:B"), edge("edge:B-C", "decision:B", "decision:C")]; break; }
    case "DM-D05": { const a = decision("decision:A"); const b = decision("decision:B"); a.payload.supersededBy = "decision:B"; b.payload.supersededBy = "decision:A"; nodes = [a, b]; edges = [edge("edge:A-B", "decision:A", "decision:B"), edge("edge:B-A", "decision:B", "decision:A")]; break; }
    case "DM-D06": { const a = decision("decision:A"); a.payload.supersededBy = null; nodes = [a, decision("decision:B"), decision("decision:C")]; edges = [edge("edge:A-B", "decision:A", "decision:B"), edge("edge:A-C", "decision:A", "decision:C")]; break; }
    case "DM-D07": { const human = decision("decision:human"); human.payload.supersededBy = "decision:ai"; const ai = decision("decision:ai", "product.direction", "ai", { epistemic: { verification: "inferred", confidence: 0.4, freshness: "current" }, provenance: { provider: "ai", reference: "synthetic:ai", capturedAt: stamp, authority: "ai-inference" }, payload: { ...decision("tmp").payload, subjectKey: "product.direction", scopeKey, choice: "ai", decisionStatus: "proposed", supersededBy: null } }); nodes = [human, ai]; edges = [edge("edge:human-ai", "decision:human", "decision:ai")]; break; }
    case "DM-D08": { const human = decision("decision:human-direction"); human.payload.subjectKey = "product.direction"; const repo = decision("decision:repository-state", "repository.current-sha", "sha-1", { provenance: { provider: "repository", reference: "synthetic:repo", capturedAt: stamp, authority: "repository" } }); const external = decision("decision:external-direction-attempt", "product.direction", "external", { provenance: { provider: "external", reference: "synthetic:external", capturedAt: stamp, authority: "external-system" } }); human.payload.supersededBy = "decision:external-direction-attempt"; nodes = [human, repo, external]; edges = [edge("edge:human-external", human.id, external.id)]; break; }
    case "DM-D09": nodes = [decision("decision:stale", "product.direction", "stale", { epistemic: { verification: "confirmed", confidence: 1, freshness: "stale" } })]; break;
    case "DM-D10": { const old = decision("decision:old"); old.payload.supersededBy = "decision:revoked-terminal"; const revoked = decision("decision:revoked-terminal", "product.direction", "revoked", { lifecycle: { state: "revoked", createdAt: stamp, updatedAt: stamp }, payload: { ...decision("tmp").payload, subjectKey: "product.direction", scopeKey, choice: "revoked", decisionStatus: "revoked", supersededBy: null } }); nodes = [old, revoked]; edges = [edge("edge:old-revoked", old.id, revoked.id)]; break; }
    case "DM-D11": { const old = decision("decision:old"); old.payload.supersededBy = "decision:other"; nodes = [old, decision("decision:new"), decision("decision:other")]; edges = [edge("edge:old-new", old.id, "decision:new")]; break; }
    case "DM-D12": nodes = [decision("decision:left", "product.direction", "left"), decision("decision:right", "product.direction", "right")]; break;
    case "DM-M01": nodes = [memory("memory:confirmed")]; break;
    case "DM-M02": nodes = [memory("memory:inferred", { epistemic: { verification: "inferred", confidence: 0.5, freshness: "current" }, provenance: { provider: "ai", reference: "synthetic:inferred", capturedAt: stamp, authority: "ai-inference" } })]; break;
    case "DM-M03": nodes = [memory("memory:disputed", { epistemic: { verification: "disputed", confidence: 0.5, freshness: "current" }, payload: { ...memory("tmp").payload, memoryStatus: "disputed" } })]; break;
    case "DM-M04": nodes = [memory("memory:stale", { epistemic: { verification: "confirmed", confidence: 1, freshness: "stale" } })]; break;
    case "DM-M05": nodes = [memory("memory:superseded", { lifecycle: { state: "superseded", createdAt: stamp, updatedAt: stamp }, payload: { ...memory("tmp").payload, memoryStatus: "superseded" } })]; break;
    case "DM-M06": nodes = [memory("memory:restricted", { governance: { sensitivity: "restricted", inheritance: "project_only", requiresConfirmation: false } })]; break;
    case "DM-M07": nodes = [memory("memory:never", { governance: { sensitivity: "public", inheritance: "never", requiresConfirmation: false } })]; break;
    case "DM-M08": nodes = [memory("memory:explicit")]; nodes[0].governance.inheritance = "explicit_only"; break;
    case "DM-M09": nodes = [memory("memory:explicit-consented")]; nodes[0].governance.inheritance = "explicit_only"; consentedRecordIds = ["memory:explicit-consented"]; break;
    case "DM-M10": nodes = [memory("memory:other-project", { scope: { userId: "user:test", territoryId: "territory:test", projectId: "project:other" }, payload: { ...memory("tmp").payload, scopeKey: "project:other" } })]; break;
    case "DM-M11": { const a = memory("memory:left"); a.payload.conflictsWith = ["memory:right"]; const b = memory("memory:right"); b.payload.conflictsWith = ["memory:left"]; nodes = [a, b]; break; }
    case "DM-M12": nodes = [memory("memory:confirmed"), memory("memory:inferred", { epistemic: { verification: "inferred", confidence: 0.4, freshness: "current" }, provenance: { provider: "ai", reference: "synthetic:inferred", capturedAt: stamp, authority: "ai-inference" } })]; break;
    case "DM-L01": nodes = [decision("decision:current")]; break;
    case "DM-L02": nodes = [decision("decision:current")]; break;
    case "DM-L03": nodes = [decision("decision:current")]; break;
    case "DM-L04": nodes = [decision("decision:current"), memory("memory:baseline")]; break;
    case "DM-L05": nodes = [decision("decision:current")]; nodes[0].provenance.provider = "human-decision"; break;
    case "DM-L06": nodes = [memory("memory:restricted", { governance: { sensitivity: "restricted", inheritance: "project_only", requiresConfirmation: false } })]; break;
    case "DM-L07": nodes = [decision("decision:current")]; break;
    default: throw new Error(`Unknown Decision / Memory case: ${caseId}`);
  }
  return { graph: graphOf(nodes, edges), options: { projectId, scopeKey, generatedAt: stamp, consentedRecordIds } };
}
