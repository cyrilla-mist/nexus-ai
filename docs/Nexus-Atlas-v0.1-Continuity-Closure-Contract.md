# Nexus Atlas v0.1 — Verified Continuity Closure Contract

**Status:** Binding Phase 6F contract  
**Parent:** Phase 6 — Real Continuity Loop  
**Upstream:** Trusted Checkpoint v0.1 + Re-entry Package v0.1 + verified Outcome Record v0.1  
**Scope:** durably append one verified Outcome Record, derive exactly one next Trusted Checkpoint without changing protected intent, compare-and-write it, read both artifacts back, and emit one immutable closure receipt.

---

## 1. Goal

Phase 6F closes the durable continuity transaction.

```text
previous Trusted Checkpoint
        +
accepted Re-entry Package
        +
verified Outcome Record
        ↓
validated bounded next-action proposal
        ↓
append Outcome Record
        ↓
derive next Trusted Checkpoint
        ↓
checkpoint CAS write
        ↓
read Outcome back
+ read latest Checkpoint back
        ↓
Verified Continuity Closure Receipt
```

The closure succeeds only when both durable artifacts are observable after their writes.

Phase 6F does not generalize storage providers, change protected project intent, write Canonical Context, or run the next re-entry attempt.

---

## 2. Governing rules

1. Only an Outcome Record with `verificationState = verified` and `capabilities.nextCheckpointAllowed = true` may advance trusted state.
2. `failed` and `indeterminate` outcomes may be persisted as history, but they may not create a next Trusted Checkpoint through the closure path.
3. Protected `trustedDirection` and `activeObjective` are copied exactly from the previous Trusted Checkpoint.
4. Existing `governingRefs` and unresolved protected ambiguities are copied exactly; Phase 6F does not silently resolve or rewrite them.
5. The completed Re-entry Package action may not silently become the next accepted action again.
6. A new bounded next action may use only already accepted governing/basis references and fresh verification evidence from the verified Outcome Record.
7. The next checkpoint evidence cursor advances to the verified post-action GitHub head.
8. The next checkpoint version advances by exactly one.
9. The next checkpoint confirmation authority is `verified-outcome`, never model confidence or an action-return report.
10. Outcome and checkpoint persistence are separate narrow stores; cross-store atomicity is not claimed. Replay safety is achieved through deterministic artifacts plus independent idempotency keys.
11. A closure receipt is emitted only after read-after-write verification succeeds for both stores.

---

## 3. Accepted upstream bindings

Phase 6F consumes:

- one previous Trusted Checkpoint accepted by `validateTrustedCheckpointV01`;
- one Re-entry Package accepted by `validateReentryPackageV01`;
- one Outcome Record accepted by `validateOutcomeRecordV01`.

Required bindings:

```text
reentryPackage.projectRef   = previousCheckpoint.projectRef
reentryPackage.checkpointRef = previousCheckpoint.checkpointId
outcome.projectRef          = previousCheckpoint.projectRef
outcome.reentryRef          = reentryPackage.packageId
outcome.actionRef           = reentryPackage.nextAction.actionRef
```

Advancement additionally requires:

```text
outcome.verificationState = verified
outcome.capabilities.nextCheckpointAllowed = true
outcome.observedPostcondition.observedHead = lowercase 40-character SHA
outcome.observedPostcondition.lineage = ahead
```

A cross-project, cross-checkpoint, cross-package or non-verified artifact fails closed.

---

## 4. Outcome Record store

Phase 6F adds a separate append-only store for accepted Outcome Records rather than modifying the frozen Phase 6B Trusted Checkpoint store.

### 4.1 State

Conceptually:

```js
{
  storeVersion: "nexus-atlas.outcome-record-store.v0.1",
  projects: [
    {
      projectRef,
      outcomes: [OutcomeRecord],
      receipts: [
        {
          idempotencyKey,
          outcomeId,
          outcomeDigest
        }
      ]
    }
  ]
}
```

### 4.2 Required semantics

- exact project allowlist;
- Outcome Record validation on every state load and append;
- append-only history;
- duplicate outcome IDs rejected unless the same idempotency receipt is replayed;
- idempotency key reuse with different content rejected;
- immutable reads;
- deterministic serialization;
- in-memory test implementation;
- Node file-backed implementation with lock + atomic replace;
- durable append followed by exact `readOutcome` verification.

The Outcome store does not store Trusted Checkpoints and is not Canonical Context.

---

## 5. Next Checkpoint Proposal

The semantic interpreter may supply one bounded proposal:

```js
{
  proposalVersion: "nexus-atlas.next-checkpoint-proposal.v0.1",
  outcomeRef,
  proposedAt,
  nextAction: {
    actionRef,
    summary,
    basisRefs,
    evidenceRefs
  },
  explanation
}
```

The proposal is untrusted until deterministic validation succeeds.

### 5.1 Rules

- `outcomeRef` must equal the current verified Outcome Record ID;
- `proposedAt >= outcome.recordedAt`;
- `nextAction.actionRef` is non-empty and differs from the completed Re-entry Package action;
- `basisRefs` are non-empty, unique and contained in the union of:
  - `previousCheckpoint.governingRefs`;
  - `previousCheckpoint.acceptedNextAction.basisRefs`;
- `evidenceRefs` are non-empty, unique and contained in `outcome.verificationEvidenceRefs`;
- explanation is bounded presentation text;
- the proposal cannot supply direction, objective, checkpoint version, evidence cursor, confirmation authority or provenance.

If a safe next action cannot be proposed without changing protected intent or inventing authority, Phase 6F fails closed. A new Human Authority / alignment path is required outside this slice.

---

## 6. Derived next Trusted Checkpoint

The deterministic builder produces an existing Trusted Checkpoint v0.1 artifact rather than inventing a second checkpoint schema.

Required derivation:

```text
checkpointSchemaVersion = nexus-atlas.trusted-checkpoint.v0.1
projectRef              = previousCheckpoint.projectRef
version                 = previousCheckpoint.version + 1
createdAt               = nextCheckpointProposal.proposedAt
trustedDirection        = previousCheckpoint.trustedDirection
activeObjective         = previousCheckpoint.activeObjective
acceptedNextAction      = proposal nextAction without evidenceRefs
governingRefs           = previousCheckpoint.governingRefs
unresolvedProtectedAmbiguities = previousCheckpoint.unresolvedProtectedAmbiguities
```

Evidence cursor:

```js
{
  provider: "github",
  scopeRef: reentryPackage.verificationPlan.scopeRef,
  cursorType: "default-branch-head",
  value: outcome.observedPostcondition.observedHead,
  capturedAt: outcome.recordedAt
}
```

Using `outcome.recordedAt` as the first v0.1 cursor timestamp is conservative: it is later than the fresh verification read and therefore cannot make older evidence appear new. The cursor SHA remains the actual authoritative observed head.

Provenance:

```js
{
  provider: "nexus-continuity-closure",
  authority: "verified-outcome",
  references: [
    outcome.outcomeId,
    reentryPackage.packageId,
    ...nextCheckpointProposal.nextAction.evidenceRefs
  ]
}
```

Confirmation:

```js
{
  state: "confirmed",
  authority: "verified-outcome",
  actorRef: "system:nexus-continuity-closure-v01",
  confirmedAt: nextCheckpointProposal.proposedAt,
  basisRef: outcome.outcomeId
}
```

Checkpoint identity is deterministic over the previous checkpoint, verified outcome and accepted proposal content, then validated by the frozen Trusted Checkpoint validator.

---

## 7. Persistence order and replay safety

The closure orchestration uses this order:

```text
1. validate/build all artifacts in memory
2. append Outcome Record with outcomeIdempotencyKey
3. read Outcome Record back and require exact equality
4. CAS-write next Trusted Checkpoint with:
     expectedVersion = previousCheckpoint.version
     checkpointIdempotencyKey
5. read latest Trusted Checkpoint back and require exact equality
6. emit closure receipt
```

Why Outcome is written first:

- a verified attempt remains valuable history even if checkpoint advancement later conflicts;
- retrying with the same idempotency keys safely replays the Outcome append;
- checkpoint CAS prevents stale closure attempts from overwriting a newer trusted state.

A partial closure is not mislabeled successful. The absence of a closure receipt means the full durable transition was not verified.

---

## 8. Closure Receipt

After both read-backs succeed:

```js
{
  closureVersion: "nexus-atlas.continuity-closure.v0.1",
  closureId,
  projectRef,
  previousCheckpointRef,
  reentryPackageRef,
  outcomeRef,
  nextCheckpointRef,
  previousVersion,
  nextVersion,
  closedAt,
  outcomeDigest,
  nextCheckpointDigest,
  authority: "verified-continuity-closure",
  capabilities: {
    nextReentryAllowed: true
  }
}
```

Rules:

- `closedAt = nextCheckpoint.createdAt`;
- digests bind the exact durable artifacts verified by read-back;
- `nextVersion = previousVersion + 1`;
- receipt identity is deterministic and immutable;
- receipt itself is not a new source of project evidence.

---

## 9. File-backed Outcome store

The first concrete durable Outcome store mirrors the accepted Phase 6B local-store safety pattern:

- absolute configured file path;
- store location outside tracked product fixtures / ignored when under working tree;
- lock file acquired with exclusive creation;
- bounded lock retries;
- temp-file write followed by atomic rename;
- state validation on every read;
- exact read-after-write verification;
- no machine-specific path serialized into Outcome or closure artifacts.

This is a Phase 6 proof adapter, not a product database decision.

---

## 10. Fail-closed boundary

Phase 6F fails closed when:

- any upstream artifact fails its accepted validator;
- project/checkpoint/package/outcome bindings mismatch;
- Outcome state is failed or indeterminate;
- verified Outcome lacks a safe authoritative observed head;
- proposal attempts to repeat the completed action;
- proposal invents governing authority;
- proposal cites evidence outside the verified Outcome evidence universe;
- proposal timestamp predates the Outcome Record;
- checkpoint version/CAS is stale;
- idempotency key conflicts with different content;
- Outcome append cannot be read back exactly;
- checkpoint write cannot be read back exactly;
- generated checkpoint fails the frozen validator;
- any step attempts Canonical Context mutation.

No guessed checkpoint is written.

---

## 11. Determinism and immutability

For identical accepted inputs:

- next checkpoint ID is identical;
- Outcome append content is identical;
- closure receipt ID is identical;
- all derived artifacts are deeply immutable;
- caller inputs remain unchanged.

Persistence replay state may differ operationally (`replayed=true/false`) but does not alter artifact identities.

---

## 12. Acceptance boundary

Phase 6F is accepted only when executable tests prove at minimum:

1. frozen Trusted Checkpoint, Re-entry Package and Outcome Record validators are reused;
2. failed/indeterminate Outcome Records cannot advance a checkpoint;
3. exact upstream project/checkpoint/package/action binding;
4. protected direction/objective/governing state is preserved exactly;
5. completed action cannot silently become the next accepted action;
6. next action basis/evidence constraints fail closed;
7. next evidence cursor advances to the verified authoritative head;
8. checkpoint version advances exactly one with `verified-outcome` confirmation;
9. Outcome store append-only/idempotency/duplicate-ID semantics;
10. file Outcome store atomic write + read-after-write behavior;
11. checkpoint stale-version conflict is preserved from Phase 6B;
12. closure writes Outcome first and requires both exact read-backs;
13. replay with the same idempotency keys is safe;
14. closure receipt identities/digests are deterministic and immutable;
15. Phase 6E / 6D / 6C / 6B / Phase 5 / Phase 4 regressions remain green.

After Phase 6F acceptance, the next authorized work is **Phase 6G — adversarial evaluation + first real Nexus continuity-run evidence**. No additional broad runtime expansion is authorized inside 6F.
