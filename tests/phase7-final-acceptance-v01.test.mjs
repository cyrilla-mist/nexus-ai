import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const target = read("experience/writeback-v01/writeback-target-validator.mjs");
const policy = read("experience/writeback-v01/writeback-policy.mjs");
const d1 = read("experience/writeback-v01/cloudflare-d1-writeback-adapter.mjs");
const retention = read("experience/writeback-v01/writeback-retention-policy.mjs");
const history = read("experience/writeback-v01/writeback-history.mjs");
const category = read("experience/writeback-v01/writeback-outcome-category.mjs");
const crossSource = read("experience/writeback-v01/cross-source-postcondition.mjs");
const management = read("experience/writeback-v01/writeback-management-surface.mjs");
const entryAudit = read("docs/Nexus-Atlas-Phase7-Writeback-Generalization-Entry-Audit.md");
const finalContract = read("docs/Nexus-Atlas-Phase7-Final-Acceptance-Contract.md");
const finalMatrix = read("docs/Nexus-Atlas-Phase7-Final-Acceptance-Matrix.md");

function includesAll(source, values) {
  for (const value of values) assert.equal(source.includes(value), true, `missing ${value}`);
}

test("7H-A01 Phase 7 sequencing remains the audited 7A through 7H plan", () => {
  includesAll(entryAudit, [
    "7B — Write-back Target + Policy Gate",
    "7C — Durable provider adapter acceptance",
    "7D — History / lifecycle + retention contract",
    "7E — Wider Outcome category contract",
    "7F — Cross-source postcondition verification",
    "7G — Write-back management surface / broader project proof",
    "7H — Final acceptance",
  ]);
});

test("7H-A02 write-back target still requires the four frozen capabilities", () => {
  includesAll(target, [
    "projectScopeEnforced",
    "idempotentOutcomeAppend",
    "checkpointCompareAndSwap",
    "exactReadAfterWrite",
  ]);
});

test("7H-A03 write-back policy still requires verified Outcome and exact read-after-write", () => {
  includesAll(policy, [
    "requireVerifiedOutcomeForCheckpointAdvance",
    "requireExactReadAfterWrite",
  ]);
  assert.equal(policy.includes("verified Outcome must remain mandatory"), true);
  assert.equal(policy.includes("exact read-after-write must remain mandatory"), true);
});

test("7H-A04 durable D1 adapter remains an adapter rather than artifact authority", () => {
  includesAll(d1, ["D1", "projectRef", "idempotency", "checkpoint"]);
  assert.equal(d1.includes("canonicalContextWriteAllowed: true"), false);
});

test("7H-A05 retention remains retain-all and destructive deletion stays disabled", () => {
  includesAll(retention, [
    'WRITEBACK_RETENTION_MODE_V01 = "retain-all"',
    'const OUTCOME_STATES = ["verified", "failed", "indeterminate"]',
    "deletionAllowed",
  ]);
  assert.equal(retention.includes("value.deletionAllowed !== false"), true);
});

test("7H-A06 history remains bounded and project scoped", () => {
  includesAll(history, ["projectRef", "maxHistoryPageSize", "PROJECT_SCOPE_NOT_ALLOWED", "WRITEBACK_HISTORY_SCOPE_MISMATCH"]);
  assert.equal(history.includes("limit > 100"), true);
});

test("7H-A07 wider Outcome categories remain explicit and bounded", () => {
  includesAll(category, ["action-execution", "milestone-transition", "decision-transition", "evidence-refresh"]);
  includesAll(category, ["Human Authority", "canonicalContextWriteAllowed"]);
});

test("7H-A08 cross-source verification supports only the accepted bounded profiles", () => {
  includesAll(crossSource, [
    '"phase6-outcome-v0.1"',
    '"continuity-mcp-v0.9.5"',
    "UNSUPPORTED_SOURCE_PROFILE",
    "STALE_POSTCONDITION_PROOF",
    "CROSS_SOURCE_BINDING_MISMATCH",
  ]);
});

test("7H-A09 cross-source verification grants no write/checkpoint/canonical authority", () => {
  includesAll(crossSource, [
    "writebackOutcomeAllowed",
    "checkpointAdvanceAuthority",
    "canonicalContextWriteAllowed",
  ]);
  assert.equal(crossSource.includes("value.capabilities.writebackOutcomeAllowed !== false"), true);
  assert.equal(crossSource.includes("value.capabilities.checkpointAdvanceAuthority !== false"), true);
  assert.equal(crossSource.includes("value.capabilities.canonicalContextWriteAllowed !== false"), true);
});

test("7H-A10 management surface remains explicitly read-only", () => {
  includesAll(management, [
    "readOnly: true",
    "writeAllowed: false",
    "deleteAllowed: false",
    "productionProvisioningAllowed: false",
    "canonicalContextWriteAllowed: false",
  ]);
});

test("7H-A11 management projection still enforces project isolation", () => {
  includesAll(management, ["PROJECT_SCOPE_NOT_ALLOWED", "WRITEBACK_MANAGEMENT_SCOPE_MISMATCH"]);
});

test("7H-A12 final contract does not overclaim Phase 7 capabilities", () => {
  includesAll(finalContract, [
    "arbitrary source/provider support",
    "production D1 provisioning",
    "autonomous external execution",
    "Canonical Context write-back",
    "real-world proof against a second external project",
  ]);
});

test("7H-A13 final acceptance matrix contains 80 blocking cases", () => {
  assert.equal(finalMatrix.includes("All 80 cases are blocking"), true);
});
