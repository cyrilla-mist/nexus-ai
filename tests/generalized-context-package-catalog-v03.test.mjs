import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDecisionMemoryLedger } from "../experience/context-v02/decision-memory-ledger.mjs";
import { buildGeneralizedContextPackage, adaptGeneralizedContextPackageToV02 } from "../experience/context-v03/generalized-context-package-builder.mjs";
import { createFullSyntheticGraph, createFullSyntheticLedger, createProjectNode, createBaseRecord, GENERATED_AT } from "./helpers/generalized-context-package-fixtures.mjs";

const catalog = JSON.parse(await readFile(new URL("../examples/nexus-atlas-generalized-context-package-cases-v0.3.json", import.meta.url), "utf8"));
const cases = [catalog.schemaCases, catalog.scopeCases, catalog.governanceCases, catalog.compatibilityCases].flat();
const canonicalGraph = JSON.parse(await readFile(new URL("../examples/nexus-atlas-self-context-v0.2.json", import.meta.url), "utf8"));
const canonicalOptions = { graph: canonicalGraph, projectId: "project:nexus-atlas", scopeKey: "project:nexus-atlas", generatedAt: "2026-08-05T09:00:00+08:00" };

const base = () => ({ graph: createFullSyntheticGraph(), ledger: createFullSyntheticLedger(), projectId: "project:alpha", scopeKey: "project:alpha", generatedAt: GENERATED_AT });
function pathValue(value, path) { return path.split(".").reduce((current, key) => current?.[key], value); }
function idsFor(section, expectedIds) {
  return section.map((item) => item.id ?? item.conflictId ?? item.item).filter((id) => expectedIds.includes(id));
}

function assertCatalogExpected(item, output, legacy = false) {
  const expected = item.expected;
  assert.equal(output.packageVersion, expected.packageVersion, `${item.id}: packageVersion`);
  if (expected.projectId) assert.equal(legacy ? "project:nexus-atlas" : output.scope.projectId, expected.projectId, `${item.id}: projectId`);
  if (expected.packageId) assert.equal(output.packageId, expected.packageId, `${item.id}: packageId`);
  for (const [path, expectedIds] of Object.entries(expected.sectionIds || {})) {
    if (path === "legacy") { for (const legacyPath of expectedIds) assert.ok(Array.isArray(output[legacyPath]), `${item.id}: legacy ${legacyPath}`); continue; }
    if (path === "sourceSummary") { for (const key of expectedIds) assert.ok(key in output.sourceSummary, `${item.id}: sourceSummary.${key}`); continue; }
    const section = path === "project" ? [output.project] : pathValue(output, path);
    assert.ok(Array.isArray(section), `${item.id}: ${path} must be an array`);
    if (path === "decisions.chains") assert.ok(expectedIds.every((id) => section.some((chain) => chain.orderedDecisionIds.includes(id))), `${item.id}: ${path}`);
    else assert.deepEqual(idsFor(section, expectedIds), expectedIds, `${item.id}: ${path}`);
  }
  if (expected.conflictTypes?.length) assert.deepEqual(output.conflicts.unresolved.map((conflict) => conflict.type), expected.conflictTypes, `${item.id}: conflictTypes`);
  if (expected.omissionRules?.length) assert.deepEqual(output.omissions.map((omission) => omission.rule), expected.omissionRules, `${item.id}: omissionRules`);
  if (expected.sourceSummary) for (const [key, value] of Object.entries(expected.sourceSummary)) assert.deepEqual(output.sourceSummary[key], value, `${item.id}: sourceSummary.${key}`);
  if (expected.legacyMapping && typeof expected.legacyMapping === "object") {
    assert.equal(output.packageVersion, "0.2", `${item.id}: legacy package`);
    if (expected.legacyMapping.packageId) assert.equal(output.packageId, expected.legacyMapping.packageId, `${item.id}: legacy packageId`);
    if (expected.legacyMapping.totalIncludedNodes) assert.equal(output.sourceSummary.totalIncludedNodes, expected.legacyMapping.totalIncludedNodes, `${item.id}: legacy total`);
    for (const section of expected.legacyMapping.excludedSections || []) {
      if (section === "decisions.proposed") assert.equal(output.confirmedDecisions.some((record) => record.id === "decision:alpha-proposed"), false);
      if (section === "decision-history") assert.equal(output.staleContext.some((record) => record.kind === "decision"), false);
      if (section === "memories.inferred") assert.equal(output.staleContext.some((record) => record.id === "memory:alpha-inferred"), false);
      if (section === "conflicts.unresolved") assert.equal("conflicts" in output, false);
    }
  }
  for (const assertion of expected.behaviorAssertions || []) {
    if (assertion === "no-sensitive-leak") assert.equal(JSON.stringify(output).includes("Sensitive payload"), false);
    if (assertion === "conflict-references-valid") assert.ok(output.conflicts.unresolved.every((conflict) => conflict.recordIds.every((id) => id.startsWith("decision:") || id.startsWith("memory:"))));
    if (assertion === "source-summary-consistent") assert.equal(Object.values(output.sourceSummary.providers).reduce((sum, value) => sum + value, 0), output.sourceSummary.totalIncludedRecords);
    if (assertion === "deeply-frozen") assert.equal(Object.isFrozen(output), true);
  }
}

function expandedSynthetic() {
  const graph = createFullSyntheticGraph();
  for (let index = 0; index < 8; index += 1) graph.nodes.push(createBaseRecord(`risk:alpha-extra-${index}`, "risk", { payload: { severity: "medium", likelihood: "low", mitigation: "Synthetic mitigation." } }));
  return { graph, ledger: createFullSyntheticLedger(), projectId: "project:alpha", scopeKey: "project:alpha", generatedAt: GENERATED_AT };
}

function execute(item) {
  const v = base();
  switch (item.id) {
    case "CP-S02": return adaptGeneralizedContextPackageToV02({ packageVersion: "0.2" });
    case "CP-S03": v.generatedAt = "2026-08-05"; break;
    case "CP-S04": v.projectId = ""; break;
    case "CP-S05": v.scopeKey = ""; break;
    case "CP-S06": v.ledger.ledgerVersion = "0.1"; break;
    case "CP-S07": v.ledger.generatedAt = "2026-08-05T10:00:00+08:00"; break;
    case "CP-S08": v.ledger.projectId = "project:beta"; break;
    case "CP-P03": v.projectId = "project:missing"; v.scopeKey = "project:missing"; v.ledger.projectId = "project:missing"; break;
    case "CP-P04": v.projectId = "decision:alpha-effective"; v.scopeKey = "decision:alpha-effective"; v.ledger.projectId = v.projectId; break;
    case "CP-P05": v.graph.nodes[0].lifecycle.state = "archived"; break;
    case "CP-P07": v.ledger.effectiveDecisions[0].scopeKey = "project:beta"; break;
    case "CP-P02": v.graph.nodes.push(createProjectNode("project:beta", { scope: { userId: "user:self", territoryId: "territory:innovation", projectId: "project:beta" }, payload: { ...createProjectNode().payload, repositoryRefs: ["fixture/beta"] } })); v.graph.nodes.push(createBaseRecord("risk:beta-out-of-scope", "risk", { scope: { ...v.graph.nodes.find((node) => node.id === "risk:alpha-open").scope, projectId: "project:beta" }, payload: { severity: "medium", likelihood: "low", mitigation: "Out of scope." } })); break;
    case "CP-P06": v.graph.nodes.push(createBaseRecord("risk:beta-out-of-scope", "risk", { scope: { ...v.graph.nodes.find((node) => node.id === "risk:alpha-open").scope, projectId: "project:beta" }, payload: { severity: "medium", likelihood: "low", mitigation: "Out of scope." } })); break;
    case "CP-G04": v.ledger.unresolvedConflicts = [{ conflictId: "conflict:alpha-branching", type: "branching_supersession", subjectKey: "alpha", scopeKey: "project:alpha", recordIds: ["decision:alpha-effective"], explanation: "Branching", autoResolvable: false, requiredResolution: "human" }, { conflictId: "conflict:alpha-memory", type: "memory_statement_conflict", subjectKey: "alpha-memory", scopeKey: "project:alpha", recordIds: ["memory:alpha-disputed"], explanation: "Memory", autoResolvable: false, requiredResolution: "human" }]; break;
    case "CP-G08": v.graph.nodes.push(createBaseRecord("record:alpha-restricted", "milestone", { summary: "Sensitive payload", governance: { sensitivity: "restricted", inheritance: "project_only", requiresConfirmation: false } })); break;
    case "CP-G09": v.graph.nodes.push(createBaseRecord("record:alpha-restricted", "milestone", { summary: "Sensitive payload", governance: { sensitivity: "restricted", inheritance: "project_only", requiresConfirmation: false } })); v.graph.contextPackage.omittedContext = [{ item: "personal sensitive details", reason: "Declared by user." }]; break;
    case "CP-G10": v.ledger.effectiveDecisions.push({ ...v.ledger.effectiveDecisions[0] }); break;
    case "CP-C01": return [buildGeneralizedContextPackage(v), buildGeneralizedContextPackage(v)];
    case "CP-C02": return buildGeneralizedContextPackage(v);
    case "CP-C03": return { output: buildGeneralizedContextPackage(v), graph: v.graph, ledger: v.ledger };
    case "CP-C04": { const shuffled = structuredClone(v); shuffled.graph.nodes.reverse(); shuffled.graph.edges.reverse(); shuffled.ledger.effectiveDecisions.reverse(); shuffled.ledger.inheritedMemories.reverse(); return [buildGeneralizedContextPackage(v), buildGeneralizedContextPackage(shuffled)]; }
    case "CP-C05": return buildGeneralizedContextPackage(expandedSynthetic());
    case "CP-C06": { const ledger = buildDecisionMemoryLedger(canonicalOptions); return adaptGeneralizedContextPackageToV02(buildGeneralizedContextPackage({ ...canonicalOptions, ledger })); }
    default: break;
  }
  return buildGeneralizedContextPackage(v);
}

for (const item of cases) test(`${item.id} ${item.title}`, () => {
  if (item.expected.outcome === "error") assert.throws(() => execute(item), (error) => error.code === item.expected.errorCode, `${item.id}: errorCode`);
  else {
    const output = execute(item);
    if (item.id === "CP-C01") { assert.deepEqual(output[0], output[1]); assertCatalogExpected(item, output[0]); }
    else if (item.id === "CP-C02") { assertCatalogExpected(item, output); assert.equal(Object.isFrozen(output.decisions.chains), true); }
    else if (item.id === "CP-C03") { assertCatalogExpected(item, output.output); assert.deepEqual(output.graph, base().graph); assert.deepEqual(output.ledger, base().ledger); }
    else if (item.id === "CP-C04") { assert.deepEqual(output[0], output[1]); assertCatalogExpected(item, output[0]); }
    else if (item.id === "CP-C06") assertCatalogExpected(item, output, true);
    else assertCatalogExpected(item, output);
  }
});

test("catalog has accepted group counts and unique IDs", () => { assert.deepEqual([catalog.schemaCases.length, catalog.scopeCases.length, catalog.governanceCases.length, catalog.compatibilityCases.length], [8, 8, 10, 6]); assert.equal(new Set(cases.map((item) => item.id)).size, 32); });
