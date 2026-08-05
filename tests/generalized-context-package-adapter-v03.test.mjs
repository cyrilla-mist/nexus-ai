import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneralizedContextPackage, adaptGeneralizedContextPackageToV02, GeneralizedContextPackageError } from "../experience/context-v03/generalized-context-package-builder.mjs";
import { createFullSyntheticGraph, createFullSyntheticLedger, GENERATED_AT } from "./helpers/generalized-context-package-fixtures.mjs";

function packageValue() { return buildGeneralizedContextPackage({ graph: createFullSyntheticGraph(), ledger: createFullSyntheticLedger(), projectId: "project:alpha", scopeKey: "project:alpha", generatedAt: GENERATED_AT }); }
function expectVersion(value) { assert.throws(() => adaptGeneralizedContextPackageToV02(value), (e) => e instanceof GeneralizedContextPackageError && e.code === "INVALID_PACKAGE_VERSION"); }

test("non-object input is rejected", () => expectVersion(null));
test("non-v0.3 package is rejected", () => expectVersion({ packageVersion: "0.2" }));
test("adapter outputs v0.2", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).packageVersion, "0.2"));
test("legacy packageId removes project prefix", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).packageId, "context-package:alpha:2026-08-05T09-00-00-08-00"));
test("legacy output has fourteen fields", () => assert.equal(Object.keys(adaptGeneralizedContextPackageToV02(packageValue())).length, 14));
test("legacy project omits kind", () => assert.equal("kind" in adaptGeneralizedContextPackageToV02(packageValue()).project, false));
test("legacy sources are down-projected", () => assert.deepEqual(Object.keys(adaptGeneralizedContextPackageToV02(packageValue()).project.source), ["provider", "reference"]));
test("legacy safe records omit confidence", () => assert.equal("confidence" in (adaptGeneralizedContextPackageToV02(packageValue()).openRisks[0] || {}), false));
test("legacy Decision shape omits v0.3 identifiers", () => { const d = adaptGeneralizedContextPackageToV02(packageValue()).confirmedDecisions[0]; assert.equal("subjectKey" in d, false); assert.equal("scopeKey" in d, false); assert.equal("evidenceRefs" in d, false); });
test("legacy Evidence shape is specialized", () => { const d = adaptGeneralizedContextPackageToV02(packageValue()).currentEvidence[0]; assert.ok("claim" in d && "result" in d); });
test("legacy Action shape is specialized", () => { const a = adaptGeneralizedContextPackageToV02(packageValue()).nextActions[0]; assert.ok("description" in a && "requiresConfirmation" in a); });
test("historical Memory becomes safe stale record", () => { const r = adaptGeneralizedContextPackageToV02(packageValue()).staleContext.find((x) => x.id === "memory:alpha-historical"); assert.ok(r); assert.equal("statement" in r, false); });
test("inferred Memory is excluded", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).staleContext.some((x) => x.id === "memory:alpha-inferred"), false));
test("proposed Decision is excluded", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).confirmedDecisions.some((x) => x.id === "decision:alpha-proposed"), false));
test("conflicts are excluded", () => assert.equal("conflicts" in adaptGeneralizedContextPackageToV02(packageValue()), false));
test("historical Decision is excluded", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).staleContext.some((x) => x.id === "decision:alpha-history"), false));
test("declaration omission rule is removed", () => { const p = structuredClone(packageValue()); p.omissions.push({ item: "declared", rule: "explicit-declaration", reason: "reason" }); const out = adaptGeneralizedContextPackageToV02(p); assert.deepEqual(out.omittedContext.at(-1), { item: "declared", reason: "reason" }); });
test("record omission keeps rule", () => { const p = structuredClone(packageValue()); p.omissions.push({ id: "x", kind: "risk", rule: "restricted", reason: "reason" }); assert.deepEqual(adaptGeneralizedContextPackageToV02(p).omittedContext.at(-1), { id: "x", reason: "reason", rule: "restricted" }); });
test("legacy source summary is recomputed", () => assert.equal(adaptGeneralizedContextPackageToV02(packageValue()).sourceSummary.totalIncludedNodes, 11));
test("same ID is counted once", () => { const p = structuredClone(packageValue()); p.identity.confirmed.push({ ...p.risks.open[0] }); assert.equal(adaptGeneralizedContextPackageToV02(p).sourceSummary.totalIncludedNodes, 11); });
test("adapter does not modify input", () => { const p = packageValue(); const before = structuredClone(p); adaptGeneralizedContextPackageToV02(p); assert.deepEqual(p, before); });
test("adapter output is frozen", () => assert.equal(Object.isFrozen(adaptGeneralizedContextPackageToV02(packageValue())), true));
test("adapter does not reuse nested references", () => { const p = packageValue(); const out = adaptGeneralizedContextPackageToV02(p); assert.notStrictEqual(out.project, p.project); });
test("same package maps deterministically", () => assert.deepEqual(adaptGeneralizedContextPackageToV02(packageValue()), adaptGeneralizedContextPackageToV02(packageValue())));
test("adapter does not call network or clock", () => { const oldFetch = globalThis.fetch, oldNow = Date.now, oldRandom = Math.random; globalThis.fetch = () => { throw new Error("unexpected"); }; Date.now = () => { throw new Error("unexpected"); }; Math.random = () => { throw new Error("unexpected"); }; try { assert.doesNotThrow(() => adaptGeneralizedContextPackageToV02(packageValue())); } finally { globalThis.fetch = oldFetch; Date.now = oldNow; Math.random = oldRandom; } });
test("adapter only consumes completed package", () => { const p = structuredClone(packageValue()); p.packageVersion = "0.2"; expectVersion(p); });
