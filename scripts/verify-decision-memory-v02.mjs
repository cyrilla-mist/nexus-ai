import assert from "node:assert/strict";
import fs from "node:fs";
import { buildDecisionMemoryLedger } from "../experience/context-v02/decision-memory-ledger.mjs";

const generatedAt = "2026-08-03T22:30:00+08:00";
const common = (id, kind, payload, overrides = {}) => ({ id, kind, title: id, summary: id, scope: { userId: "user:verify", territoryId: "territory:verify", projectId: "project:verify" }, lifecycle: { state: "active", createdAt: generatedAt, updatedAt: generatedAt }, epistemic: { verification: "confirmed", confidence: 1, freshness: "current" }, provenance: { provider: "human-decision", reference: `synthetic:${id}`, capturedAt: generatedAt, authority: "human-confirmation" }, governance: { sensitivity: "public", inheritance: "project_only", requiresConfirmation: false }, payload, ...overrides });
const graph = {
  metadata: { schemaVersion: "0.2-proposed", example: true, runtimeEvidence: false, generatedAt },
  nodes: [
    common("project:verify", "project", { purpose: "Verification", currentPhase: "Phase 2B", currentVersion: "0.2", currentMilestoneId: null, territoryIds: ["territory:verify"], lastActiveAt: generatedAt, repositoryRefs: ["synthetic"] }, { provenance: { provider: "synthetic", reference: "synthetic:project", capturedAt: generatedAt, authority: "test-fixture" } }),
    common("evidence:verify", "evidence", { claim: "Fixed verification evidence", sourceRef: "synthetic", observedAt: generatedAt, appliesToVersion: "0.2", verificationMethod: "fixture", result: "confirmed" }, { provenance: { provider: "synthetic", reference: "synthetic:evidence", capturedAt: generatedAt, authority: "test-fixture" } }),
    common("decision:verify", "decision", { subjectKey: "verification.subject", scopeKey: "project:verify", question: "What is verified?", choice: "Phase 2B", rationale: "Fixed synthetic baseline", evidenceRefs: ["evidence:verify"], alternatives: [], constraints: [], decidedAt: generatedAt, decidedBy: "user:verify", decisionStatus: "confirmed", supersededBy: null })
  ], edges: [], contextPackage: {}
};
const catalog = JSON.parse(fs.readFileSync(new URL("../examples/nexus-atlas-decision-memory-cases-v0.2.json", import.meta.url), "utf8"));
const groups = [catalog.decisionCases, catalog.memoryCases, catalog.ledgerCases];
assert.ok(groups.every(Array.isArray));
assert.deepEqual(groups.map((group) => group.length), [12, 12, 7]);
assert.equal(new Set(groups.flat().map((item) => item.id)).size, 31);
const options = { graph, projectId: "project:verify", scopeKey: "project:verify", generatedAt, consentedRecordIds: [] };
const first = buildDecisionMemoryLedger(options);
const second = buildDecisionMemoryLedger(options);
assert.deepEqual(first, second);
assert.equal(first.ledgerVersion, "0.2");
console.log("Nexus Atlas v0.2 Decision / Memory");
console.log(`Decisions: ${first.diagnostics.decisionCount}`);
console.log(`Memories: ${first.diagnostics.memoryCount}`);
console.log(`Effective decisions: ${first.diagnostics.effectiveDecisionCount}`);
console.log(`Decision chains: ${first.diagnostics.chainCount}`);
console.log(`Conflicts: ${first.diagnostics.conflictCount}`);
console.log(`Inherited memories: ${first.diagnostics.inheritedMemoryCount}`);
console.log("Deterministic ledger: PASS");
console.log("Catalog cases: 31");
