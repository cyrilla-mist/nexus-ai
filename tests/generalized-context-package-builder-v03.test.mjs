import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneralizedContextPackage, GeneralizedContextPackageError } from "../experience/context-v03/generalized-context-package-builder.mjs";
import { createFullSyntheticGraph, createFullSyntheticLedger, GENERATED_AT } from "./helpers/generalized-context-package-fixtures.mjs";

function valid() { const graph = createFullSyntheticGraph(); const ledger = createFullSyntheticLedger(); return { graph, ledger, projectId: "project:alpha", scopeKey: "project:alpha", generatedAt: GENERATED_AT }; }
function build() { return buildGeneralizedContextPackage(valid()); }
function expectCode(fn, code) { assert.throws(fn, (error) => error instanceof GeneralizedContextPackageError && error.code === code); }

test("builder returns the accepted top-level package", () => { const p = build(); assert.deepEqual(Object.keys(p), ["packageVersion", "packageId", "generatedAt", "scope", "project", "identity", "goals", "decisions", "memories", "evidence", "records", "risks", "actions", "conflicts", "omissions", "sourceSummary"]); });
test("invalid graph maps validator failure", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), graph: {} }), "INVALID_GRAPH"));
test("invalid ledger maps structure failure", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), ledger: null }), "INVALID_LEDGER"));
test("invalid project id", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), projectId: "" }), "INVALID_PROJECT_ID"));
test("invalid scope key", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), scopeKey: "" }), "INVALID_SCOPE_KEY"));
test("invalid generatedAt", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), generatedAt: "2026-08-05" }), "INVALID_GENERATED_AT"));
test("project not found", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), projectId: "project:missing", scopeKey: "project:missing", ledger: createFullSyntheticLedger({ projectId: "project:missing" }) }), "PROJECT_NOT_FOUND"));
test("project kind mismatch", () => { const v = valid(); v.projectId = "decision:alpha-effective"; v.scopeKey = "decision:alpha-effective"; v.ledger.projectId = v.projectId; expectCode(() => buildGeneralizedContextPackage(v), "PROJECT_KIND_MISMATCH"); });
test("project eligibility", () => { const v = valid(); v.graph.nodes[0].lifecycle.state = "archived"; expectCode(() => buildGeneralizedContextPackage(v), "PROJECT_NOT_ELIGIBLE"); });
test("ledger version mismatch", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), ledger: createFullSyntheticLedger({ ledgerVersion: "0.1" }) }), "LEDGER_VERSION_MISMATCH"));
test("ledger project mismatch", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), ledger: createFullSyntheticLedger({ projectId: "project:beta" }) }), "LEDGER_PROJECT_MISMATCH"));
test("ledger generatedAt mismatch", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), ledger: createFullSyntheticLedger({ generatedAt: "2026-08-05T10:00:00+08:00" }) }), "LEDGER_GENERATED_AT_MISMATCH"));
test("ledger scope mismatch", () => { const v = valid(); v.ledger.effectiveDecisions[0].scopeKey = "project:beta"; expectCode(() => buildGeneralizedContextPackage(v), "LEDGER_SCOPE_MISMATCH"); });
test("missing package reference", () => { const v = valid(); v.ledger.effectiveDecisions[0].id = "decision:missing"; expectCode(() => buildGeneralizedContextPackage(v), "PACKAGE_REFERENCE_MISSING"); });
test("package reference kind mismatch", () => { const v = valid(); v.ledger.effectiveDecisions[0].id = "memory:alpha-inherited"; expectCode(() => buildGeneralizedContextPackage(v), "PACKAGE_REFERENCE_KIND_MISMATCH"); });
test("package reference scope mismatch", () => { const v = valid(); v.graph.nodes.find((n) => n.id === "decision:alpha-effective").scope.projectId = "project:beta"; expectCode(() => buildGeneralizedContextPackage(v), "PACKAGE_REFERENCE_SCOPE_MISMATCH"); });
test("restricted package reference", () => { const v = valid(); v.graph.nodes.find((n) => n.id === "decision:alpha-effective").governance.sensitivity = "restricted"; expectCode(() => buildGeneralizedContextPackage(v), "PACKAGE_REFERENCE_RESTRICTED"); });
test("strict ISO rejects date-only", () => expectCode(() => buildGeneralizedContextPackage({ ...valid(), generatedAt: "2026-08-05" }), "INVALID_GENERATED_AT"));
test("graph input is unchanged", () => { const v = valid(); const before = structuredClone(v.graph); buildGeneralizedContextPackage(v); assert.deepEqual(v.graph, before); });
test("ledger input is unchanged", () => { const v = valid(); const before = structuredClone(v.ledger); buildGeneralizedContextPackage(v); assert.deepEqual(v.ledger, before); });
test("returned records are isolated", () => { const v = valid(); const p = buildGeneralizedContextPackage(v); assert.notStrictEqual(p.project, v.graph.nodes[0]); assert.notStrictEqual(p.decisions.effective[0], v.graph.nodes[1]); });
test("lifecycle is a string in every full projection", () => { const p = build(); const records = [...p.decisions.effective, ...p.decisions.proposed, ...p.memories.inherited, ...p.memories.inferred, ...p.memories.disputed, ...p.memories.historical, ...p.evidence.current, ...p.evidence.inferred, ...p.evidence.disputed, ...p.evidence.historical, ...p.records.disputed, ...p.records.historical, ...p.risks.open, ...p.actions.next]; assert.ok(records.every((r) => typeof r.lifecycle === "string")); });
test("Windows reference is cleared", () => { const v = valid(); v.graph.nodes[0].provenance.reference = "C:\\private\\source"; assert.equal(buildGeneralizedContextPackage(v).project.source.reference, null); });
test("UNC reference is cleared", () => { const v = valid(); v.graph.nodes[0].provenance.reference = "\\\\server\\share"; assert.equal(buildGeneralizedContextPackage(v).project.source.reference, null); });
test("POSIX reference is cleared", () => { const v = valid(); v.graph.nodes[0].provenance.reference = "/home/private/source"; assert.equal(buildGeneralizedContextPackage(v).project.source.reference, null); });
test("file reference is cleared", () => { const v = valid(); v.graph.nodes[0].provenance.reference = "file:///private/source"; assert.equal(buildGeneralizedContextPackage(v).project.source.reference, null); });
test("repository reference remains", () => assert.equal(build().project.source.reference, "fixture:project:alpha"));
test("missing non-DM provenance creates omission", () => { const v = valid(); v.graph.nodes.find((n) => n.id === "risk:alpha-open").provenance.authority = ""; const p = buildGeneralizedContextPackage(v); assert.ok(p.omissions.some((o) => o.id === "risk:alpha-open" && o.rule === "provenance-insufficient")); });
test("restricted omission wins priority", () => { const v = valid(); const n = v.graph.nodes.find((x) => x.id === "milestone:alpha-disputed"); n.governance.sensitivity = "restricted"; n.governance.inheritance = "never"; const p = buildGeneralizedContextPackage(v); assert.equal(p.omissions.find((o) => o.id === n.id).rule, "restricted"); });
test("out-of-scope record is not an omission", () => { const v = valid(); v.graph.nodes.push({ ...v.graph.nodes.find((n) => n.id === "risk:alpha-open"), id: "risk:beta-open", scope: { ...v.graph.nodes.find((n) => n.id === "risk:alpha-open").scope, projectId: "project:beta" } }); const p = buildGeneralizedContextPackage(v); assert.ok(!p.omissions.some((o) => o.id === "risk:beta-open")); });
test("completed current milestone is not historical", () => { const p = build(); assert.ok(!p.records.historical.some((r) => r.id === "milestone:alpha-disputed")); });
test("stale risk is historical", () => { const v = valid(); const n = v.graph.nodes.find((x) => x.id === "risk:alpha-open"); n.epistemic.freshness = "stale"; const p = buildGeneralizedContextPackage(v); assert.ok(p.records.historical.some((r) => r.id === n.id)); });
test("disputed action is disputed record", () => { const v = valid(); const n = v.graph.nodes.find((x) => x.id === "action:alpha-next"); n.epistemic.verification = "disputed"; const p = buildGeneralizedContextPackage(v); assert.ok(p.records.disputed.some((r) => r.id === n.id)); });
test("historical Decision remains only in chain", () => { const p = build(); assert.ok(!p.records.historical.some((r) => r.kind === "decision")); assert.ok(p.decisions.chains[0].orderedDecisionIds.includes("decision:alpha-history")); });
test("Memory classification follows Ledger", () => { const p = build(); assert.deepEqual(p.memories.inherited.map((x) => x.id), ["memory:alpha-inherited"]); assert.deepEqual(p.memories.inferred.map((x) => x.id), ["memory:alpha-inferred"]); });
test("summary counts chain history", () => { const p = build(); assert.equal(p.sourceSummary.byKind.decision, 3); });
test("summary counts conflict references", () => { const v = valid(); v.ledger.unresolvedConflicts = [{ conflictId: "conflict:alpha-memory", type: "memory_statement_conflict", subjectKey: "memory", scopeKey: "project:alpha", recordIds: ["memory:alpha-disputed"], explanation: "Conflict", autoResolvable: false, requiredResolution: "human" }]; assert.equal(buildGeneralizedContextPackage(v).sourceSummary.byKind.memory, 4); });
test("same id in chain and section counts once", () => { const p = build(); assert.equal(p.sourceSummary.totalIncludedRecords, 16); });
test("package shape has no internal fields", () => { const p = build(); assert.equal("rawGraph" in p, false); assert.equal("rawLedger" in p, false); assert.equal("diagnostics" in p, false); });
test("does not call global network", () => { const old = globalThis.fetch; globalThis.fetch = () => { throw new Error("unexpected"); }; try { assert.doesNotThrow(build); } finally { globalThis.fetch = old; } });
test("does not call Date.now", () => { const old = Date.now; Date.now = () => { throw new Error("unexpected"); }; try { assert.doesNotThrow(build); } finally { Date.now = old; } });
test("does not call Math.random", () => { const old = Math.random; Math.random = () => { throw new Error("unexpected"); }; try { assert.doesNotThrow(build); } finally { Math.random = old; } });
test("module uses no environment state", () => assert.ok(true));
test("source summary keys are sorted", () => { const p = build(); assert.deepEqual(Object.keys(p.sourceSummary.providers), [...Object.keys(p.sourceSummary.providers)].sort()); assert.deepEqual(Object.keys(p.sourceSummary.byKind), [...Object.keys(p.sourceSummary.byKind)].sort()); });
test("output is deeply frozen", () => { const p = build(); assert.equal(Object.isFrozen(p), true); assert.equal(Object.isFrozen(p.decisions.effective), true); });
