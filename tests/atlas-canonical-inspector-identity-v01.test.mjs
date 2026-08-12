import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

const desk = await readText("frontend/atlas/atlas-desk.js");
const snapshot = JSON.parse(await readText("examples/nexus-atlas-product-surface-phase5-v0.1.json"));

function recordsForSection(section) {
  const sections = {
    project: [{ ...snapshot.project, kind: "project", governance: null, relatedIds: [] }],
    identity: snapshot.identity,
    "decisions.effective": snapshot.decisions.effective,
    "decisions.proposed": snapshot.decisions.proposed,
    "decisions.historical": snapshot.decisions.historical,
    "memories.confirmed": snapshot.memories.confirmed,
    "memories.inferred": snapshot.memories.inferred,
    "memories.disputed": snapshot.memories.disputed,
    "memories.historical": snapshot.memories.historical,
    "evidence.current": snapshot.evidence.current,
    "evidence.stale": snapshot.evidence.stale,
    "evidence.disputed": snapshot.evidence.disputed,
    risks: snapshot.risks,
    actions: snapshot.actions,
  };
  return Object.hasOwn(sections, section) ? sections[section] : null;
}

test("inspectorIndex is a unique closed inspectability set", () => {
  const ids = snapshot.inspectorIndex.map((descriptor) => descriptor.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 14);
});

test("every accepted inspector descriptor resolves exactly one matching Product Surface record", () => {
  for (const descriptor of snapshot.inspectorIndex) {
    const records = recordsForSection(descriptor.section);
    assert.ok(records, `unknown section: ${descriptor.section}`);
    const matches = records.filter((record) => record.id === descriptor.id);
    assert.equal(matches.length, 1, `${descriptor.id} must resolve exactly once`);
    assert.equal(matches[0].kind, descriptor.kind, `${descriptor.id} kind must match descriptor`);
  }
});

test("Desk Inspector resolves through inspectorIndex instead of an unbounded all-record scan", () => {
  assert.match(desk, /function inspectorDescriptorById\(/);
  assert.ok(desk.includes("state.surface?.inspectorIndex?.filter"));
  assert.match(desk, /matches\.length === 1/);
  assert.match(desk, /function recordsForInspectorSection\(/);
  assert.match(desk, /record\.kind !== descriptor\.kind/);
  assert.doesNotMatch(desk, /function allSurfaceRecords\(/);
});

test("unknown or malformed Inspector targets do not fall back to raw Graph or source reads", () => {
  assert.match(desk, /not available through the accepted Product Surface inspector index/);
  assert.match(desk, /No raw source or Graph fallback was attempted/);
  assert.doesNotMatch(desk, /createContinuityProvider|buildGeneralizedContextPackage|validateContextGraph/);
  assert.doesNotMatch(desk, /fetch\(["']https?:\/\//i);
});

test("related-context navigation is filtered through the same canonical Inspector resolver", () => {
  assert.match(desk, /\(record\.relatedIds \|\| \[\]\)\.map\(surfaceRecordById\)\.filter\(Boolean\)/);
  assert.match(desk, /data-inspect-entity/);
});

test("Identity Context surfaces only accepted Product Surface identity records", () => {
  assert.match(desk, /IDENTITY CONTEXT/);
  assert.match(desk, /const identities = surface\.identity/);
  assert.match(desk, /CONFIRMED IDENTITY/);
  assert.match(desk, /INFERRED IDENTITY/);
  assert.match(desk, /no identity capture or promotion occurs in this Desk/);
  assert.equal(snapshot.identity.length, 1);
  assert.equal(snapshot.identity[0].id, "identity:nexus-owner");
  assert.equal(snapshot.identity[0].state.verification, "confirmed");
});

test("Identity Inspector preserves verification, freshness and governance without promotion", () => {
  const identity = snapshot.identity[0];
  assert.equal(identity.state.freshness, "current");
  assert.equal(identity.governance.sensitivity, "personal");
  assert.equal(identity.governance.inheritance, "project_only");
  assert.equal(identity.governance.requiresConfirmation, false);
  assert.match(desk, /IDENTITY AUTHORITY/);
  assert.match(desk, /This Identity record is inferred and is not user-confirmed truth/);
  assert.match(desk, /keeps its upstream verification state without promotion/);
});

test("Phase 5D remains read-only and adds no Identity edit or persistent mutation path", () => {
  assert.doesNotMatch(desk, /localStorage\.setItem|method\s*:\s*["']POST["']|writeFile|appendFile/);
  assert.doesNotMatch(desk, /data-edit-identity|data-save-identity|promoteIdentity|captureIdentity/);
  assert.match(desk, /does not perform persistent canonical writes or external mutations/);
});
