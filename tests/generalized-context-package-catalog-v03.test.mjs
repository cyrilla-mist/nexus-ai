import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGeneralizedContextPackage, adaptGeneralizedContextPackageToV02 } from "../experience/context-v03/generalized-context-package-builder.mjs";
import { createFullSyntheticGraph, createFullSyntheticLedger, createProjectNode, GENERATED_AT } from "./helpers/generalized-context-package-fixtures.mjs";

const catalog = JSON.parse(await readFile(new URL("../examples/nexus-atlas-generalized-context-package-cases-v0.3.json", import.meta.url), "utf8"));
const cases = [catalog.schemaCases, catalog.scopeCases, catalog.governanceCases, catalog.compatibilityCases].flat();
const base = () => ({ graph: createFullSyntheticGraph(), ledger: createFullSyntheticLedger(), projectId: "project:alpha", scopeKey: "project:alpha", generatedAt: GENERATED_AT });
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
    case "CP-G04": v.ledger.unresolvedConflicts = [{ conflictId: "conflict:alpha-branching", type: "branching_supersession", subjectKey: "alpha", scopeKey: "project:alpha", recordIds: ["decision:alpha-effective"], explanation: "Branching", autoResolvable: false, requiredResolution: "human" }, { conflictId: "conflict:alpha-memory", type: "memory_statement_conflict", subjectKey: "alpha-memory", scopeKey: "project:alpha", recordIds: ["memory:alpha-disputed"], explanation: "Memory", autoResolvable: false, requiredResolution: "human" }]; break;
    case "CP-G10": v.ledger.effectiveDecisions.push({ ...v.ledger.effectiveDecisions[0] }); break;
    case "CP-P02": v.graph.nodes.push(createProjectNode("project:beta", { scope: { userId: "user:self", territoryId: "territory:innovation", projectId: "project:beta" }, payload: { ...createProjectNode().payload, repositoryRefs: ["fixture/beta"] } })); break;
    case "CP-C06": return adaptGeneralizedContextPackageToV02(buildGeneralizedContextPackage(v));
    default: break;
  }
  return buildGeneralizedContextPackage(v);
}

for (const item of cases) test(`${item.id} ${item.title}`, () => {
  if (item.expected.outcome === "error") assert.throws(() => execute(item), (error) => error.code === item.expected.errorCode);
  else { const output = execute(item); assert.ok(output); if (item.id === "CP-C06") assert.equal(output.packageVersion, "0.2"); else assert.equal(output.packageVersion, "0.3"); }
});

test("catalog has accepted group counts and unique IDs", () => { assert.deepEqual([catalog.schemaCases.length, catalog.scopeCases.length, catalog.governanceCases.length, catalog.compatibilityCases.length], [8, 8, 10, 6]); assert.equal(new Set(cases.map((item) => item.id)).size, 32); });
