import assert from "node:assert/strict";
import test from "node:test";

import { buildContextPackage } from "../experience/continuity/context-package-builder.mjs";

function scenario() {
  return {
    project: {
      id: "project-verity",
      description: "Prepare a reliable Verity v1.0 release.",
      currentMilestone: "Complete Benchmark v1",
      metadata: {
        policies: ["Consequential writes require confirmation."],
        requestedCapabilities: ["benchmark-planning"],
      },
    },
    reentryQuery: {
      requestedCapabilities: ["evaluation-reliability-review"],
    },
    runtime: { sourceMode: "fixture:verity" },
    policies: ["Write success requires a verified re-read."],
    entities: [
      {
        id: "decision-benchmark-first",
        type: "decision",
        title: "Benchmark first",
        summary: "Complete Benchmark v1 before expanding features.",
        status: "confirmed",
        source: { provider: "nexus", reference: "decision-benchmark-first" },
      },
      {
        id: "evidence-v047",
        type: "evidence",
        title: "Evaluation Results v0.4.7",
        summary: "Current evaluation evidence.",
        status: "current",
        source: { provider: "datahub", reference: "urn:li:dataset:results" },
      },
      {
        id: "risk-owner",
        type: "risk",
        title: "Benchmark owner missing",
        summary: "Ownership must be repaired.",
        status: "blocked",
        metadata: { missingOwner: true },
        source: { provider: "datahub", reference: "urn:li:dataset:benchmark" },
      },
      {
        id: "task-build-set",
        type: "task",
        title: "Build validation set",
        summary: "Prepare benchmark cases.",
        status: "open",
        source: { provider: "nexus", reference: "task-build-set" },
      },
    ],
    expectedFindings: {
      recommendedActions: ["Assign the Benchmark owner", "Build the validation set"],
    },
  };
}

test("builds a provider-neutral session-local Context Package", () => {
  const value = buildContextPackage({
    scenario: scenario(),
    sourceInfo: {
      mode: "datahub",
      label: "DataHub MCP",
      live: true,
      readOnly: true,
      fetchedAt: "2026-08-01T00:00:00Z",
    },
    auditEvents: [
      {
        id: "repair-1",
        type: "context_repair",
        entityId: "external-asset-benchmark",
        targetUrn: "urn:li:dataset:benchmark",
        operation: "assign_owner",
        ownerUrn: "urn:li:corpuser:cyrilla-mist",
        verifiedAt: "2026-08-01T00:05:00Z",
      },
    ],
    now: () => new Date("2026-08-01T00:06:00Z"),
  });

  assert.equal(value.packageVersion, "1.0");
  assert.equal(value.persistence, "session-local");
  assert.equal(value.durable, false);
  assert.equal(value.projectId, "project-verity");
  assert.equal(value.currentGoal, "Complete Benchmark v1");
  assert.equal(value.validDecisions.length, 1);
  assert.equal(value.trustedEvidence.length, 1);
  assert.equal(value.unresolvedRisks.length, 1);
  assert.equal(value.completedRepairs.length, 1);
  assert.equal(value.sourceInfo.live, true);
  assert.deepEqual(value.requestedCapabilities, [
    "evaluation-reliability-review",
    "benchmark-planning",
  ]);
});

test("does not treat stale or blocked evidence as trusted", () => {
  const input = scenario();
  input.entities.push({
    id: "evidence-old",
    type: "evidence",
    title: "Old evidence",
    status: "stale",
  });

  const value = buildContextPackage({ scenario: input });

  assert.deepEqual(
    value.trustedEvidence.map((item) => item.id),
    ["evidence-v047"],
  );
  assert.equal(
    value.unresolvedRisks.some((item) => item.id === "evidence-old"),
    true,
  );
});

test("rejects an invalid continuity scenario", () => {
  assert.throws(
    () => buildContextPackage({ scenario: {} }),
    /continuity scenario with a project is required/i,
  );
});
