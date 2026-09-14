import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildInitialAlignmentProposalV01, confirmInitialAlignmentV01 } from "../experience/continuity-loop-v01/initial-alignment.mjs";
import { createFileTrustedCheckpointStoreV01 } from "../experience/continuity-loop-v01/file-trusted-checkpoint-store.mjs";
import { TrustedCheckpointStoreError } from "../experience/continuity-loop-v01/trusted-checkpoint-store.mjs";
import { validateTrustedCheckpointV01 } from "../experience/continuity-loop-v01/trusted-checkpoint-validator.mjs";

const PROJECT = "project:nexus-atlas";

function proposal() {
  return buildInitialAlignmentProposalV01({
    projectRef: PROJECT,
    proposedAt: "2026-09-14T13:30:00Z",
    trustedDirection: "Prove one real continuity loop before generalizing Nexus Atlas.",
    activeObjective: "Establish a durable trusted continuation boundary.",
    acceptedNextAction: {
      actionRef: "action:phase6c-fresh-evidence",
      summary: "Collect bounded fresh GitHub evidence after the accepted checkpoint cursor.",
      basisRefs: ["decision:phase6-single-real-loop"],
    },
    evidenceCursor: {
      provider: "github",
      scopeRef: "cyrilla-mist/nexus-ai",
      cursorType: "default-branch-head",
      value: "586980fbc9c064a93551d0467d480840c7418a28",
      capturedAt: "2026-09-14T13:29:00Z",
    },
    governingRefs: ["decision:phase6-single-real-loop"],
    unresolvedProtectedAmbiguities: [],
    provenance: {
      provider: "nexus-self-context",
      authority: "accepted-context-plus-human-alignment",
      references: ["docs:Nexus-Atlas-v0.1-Real-Continuity-Loop-Contract"],
    },
  });
}

function checkpointV1() {
  const accepted = proposal();
  return confirmInitialAlignmentV01({
    proposal: accepted,
    confirmation: {
      proposalId: accepted.proposalId,
      accepted: true,
      actorRef: "user:cyrilla",
      confirmedAt: "2026-09-14T13:31:00Z",
    },
  });
}

function checkpointV2(id = "checkpoint:verified-outcome-a") {
  const first = checkpointV1();
  return validateTrustedCheckpointV01({
    ...structuredClone(first),
    checkpointId: id,
    version: 2,
    createdAt: "2026-09-14T14:00:00Z",
    activeObjective: `Continue from verified postcondition ${id}.`,
    evidenceCursor: {
      ...structuredClone(first.evidenceCursor),
      value: id.endsWith("b") ? "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" : "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      capturedAt: "2026-09-14T13:59:00Z",
    },
    confirmation: {
      state: "confirmed",
      authority: "verified-outcome",
      actorRef: "system:continuity-loop",
      confirmedAt: "2026-09-14T14:00:00Z",
      basisRef: `outcome:${id}`,
    },
  });
}

async function withStoreFile(fn) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-phase6b-"));
  const filePath = path.join(directory, "trusted-checkpoints.json");
  try { return await fn({ directory, filePath }); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
}

function store(filePath, options = {}) {
  return createFileTrustedCheckpointStoreV01({ filePath, allowedProjectRefs: [PROJECT], lockRetryMs: 2, ...options });
}

const isCode = code => error => error instanceof TrustedCheckpointStoreError && error.code === code;

test("6B-E01 file store requires an explicit absolute path", () => {
  assert.throws(() => createFileTrustedCheckpointStoreV01({ filePath: "relative.json", allowedProjectRefs: [PROJECT] }), isCode("INVALID_FILE_STORE_OPTIONS"));
});

test("6B-E02 first durable write survives a new store instance", async () => {
  await withStoreFile(async ({ filePath }) => {
    const firstStore = store(filePath);
    await firstStore.writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const restarted = store(filePath);
    assert.deepEqual(await restarted.readLatest({ projectRef: PROJECT }), checkpointV1());
  });
});

test("6B-E03 file store persists deterministic validated state", async () => {
  await withStoreFile(async ({ filePath }) => {
    const target = store(filePath);
    await target.writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.equal(parsed.storeVersion, "nexus-atlas.trusted-checkpoint-store.v0.1");
    assert.equal(parsed.projects[0].checkpoints.length, 1);
    assert.equal(parsed.projects[0].receipts.length, 1);
  });
});

test("6B-E04 idempotency receipt survives restart", async () => {
  await withStoreFile(async ({ filePath }) => {
    await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const replay = await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    assert.equal(replay.replayed, true);
    assert.equal((await store(filePath).exportState()).projects[0].checkpoints.length, 1);
  });
});

test("6B-E05 stale CAS write remains rejected after restart", async () => {
  await withStoreFile(async ({ filePath }) => {
    await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    await assert.rejects(store(filePath).writeCheckpoint({ checkpoint: checkpointV2(), expectedVersion: 0, idempotencyKey: "outcome:two" }), isCode("CHECKPOINT_VERSION_CONFLICT"));
    assert.equal((await store(filePath).readLatest({ projectRef: PROJECT })).version, 1);
  });
});

test("6B-E06 concurrent same-version writers cannot both commit", async () => {
  await withStoreFile(async ({ filePath }) => {
    await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const writerA = store(filePath);
    const writerB = store(filePath);
    const results = await Promise.allSettled([
      writerA.writeCheckpoint({ checkpoint: checkpointV2("checkpoint:verified-outcome-a"), expectedVersion: 1, idempotencyKey: "outcome:a" }),
      writerB.writeCheckpoint({ checkpoint: checkpointV2("checkpoint:verified-outcome-b"), expectedVersion: 1, idempotencyKey: "outcome:b" }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const rejected = results.find(result => result.status === "rejected");
    assert(rejected);
    assert.equal(rejected.reason.code, "CHECKPOINT_VERSION_CONFLICT");
    assert.equal((await store(filePath).exportState()).projects[0].checkpoints.length, 2);
  });
});

test("6B-E07 malformed durable JSON fails closed", async () => {
  await withStoreFile(async ({ filePath }) => {
    await fs.writeFile(filePath, "{not-json", "utf8");
    await assert.rejects(store(filePath).readLatest({ projectRef: PROJECT }), isCode("INVALID_STORE_STATE"));
  });
});

test("6B-E08 structurally invalid durable state fails closed", async () => {
  await withStoreFile(async ({ filePath }) => {
    await fs.writeFile(filePath, JSON.stringify({ storeVersion: "wrong", projects: [] }), "utf8");
    await assert.rejects(store(filePath).readLatest({ projectRef: PROJECT }), isCode("INVALID_STORE_STATE"));
  });
});

test("6B-E09 atomic write leaves no temporary files after success", async () => {
  await withStoreFile(async ({ directory, filePath }) => {
    await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const entries = await fs.readdir(directory);
    assert.deepEqual(entries, ["trusted-checkpoints.json"]);
  });
});

test("6B-E10 occupied lock fails boundedly instead of bypassing coordination", async () => {
  await withStoreFile(async ({ filePath }) => {
    await fs.writeFile(`${filePath}.lock`, "occupied", "utf8");
    const target = store(filePath, { maxLockAttempts: 1, lockRetryMs: 0 });
    await assert.rejects(target.writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" }), isCode("FILE_STORE_LOCK_TIMEOUT"));
  });
});

test("6B-E11 file store does not create data on read-only empty lookup", async () => {
  await withStoreFile(async ({ filePath }) => {
    assert.equal(await store(filePath).readLatest({ projectRef: PROJECT }), null);
    await assert.rejects(fs.stat(filePath), error => error.code === "ENOENT");
  });
});

test("6B-E12 persisted checkpoint data contains no implicit source payload or credentials", async () => {
  await withStoreFile(async ({ filePath }) => {
    await store(filePath).writeCheckpoint({ checkpoint: checkpointV1(), expectedVersion: 0, idempotencyKey: "alignment:one" });
    const text = await fs.readFile(filePath, "utf8");
    for (const forbidden of ["token", "credential", "comments", "reviews", "rawPayload", "sourceSnapshot"]) assert.doesNotMatch(text, new RegExp(forbidden, "i"));
  });
});
