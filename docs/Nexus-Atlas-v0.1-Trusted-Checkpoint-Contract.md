# Nexus Atlas v0.1 — Trusted Checkpoint and Initial Alignment Contract

**Status:** Phase 6B implementation contract  
**Parent:** Phase 6 — Real Continuity Loop  
**Scope:** Trusted Checkpoint, Initial Alignment, bounded persistence only

## 1. Goal

Phase 6B proves that Nexus can establish one explicit, durable, replay-safe trusted continuation boundary before any fresh-evidence assessment is implemented.

The bounded flow is:

`accepted current context → Initial Alignment proposal → explicit human acceptance → Trusted Checkpoint v0.1 → bounded store write → read-after-write verification`

Phase 6B does **not** perform GitHub fresh-evidence collection, continuity validity assessment, Human Authority for a newly discovered ambiguity, external action execution, Outcome verification, or browser UI work.

## 2. Trusted Checkpoint

A Trusted Checkpoint is a prior accepted continuation boundary, not a claim that the represented project state remains current forever.

Required fields:

- stable opaque `checkpointId`;
- exactly one `projectRef`;
- positive monotonic `version`;
- `createdAt`;
- bounded `trustedDirection`;
- bounded `activeObjective`;
- one `acceptedNextAction` with inspectable basis references;
- one explicit `evidenceCursor`;
- accepted `governingRefs`;
- preserved unresolved protected ambiguities;
- bounded provenance;
- explicit confirmation metadata.

The v0.1 confirmation envelope separates the authority class from the record that supplied that authority:

```js
{
  state: "confirmed",
  authority: "human" | "verified-outcome",
  actorRef,
  confirmedAt,
  basisRef
}
```

Phase 6B itself produces `authority: "human"` through Initial Alignment. `verified-outcome` is structurally reserved for the later accepted Outcome path and is not produced by Phase 6B.

## 3. Evidence cursor

The checkpoint cursor identifies the accepted observation boundary from which a later fresh-evidence window must begin.

```js
{
  provider,
  scopeRef,
  cursorType,
  value,
  capturedAt
}
```

The cursor does not prove future completeness. Phase 6C remains responsible for proving that the bounded source window reaches this cursor. If it cannot, continuity assessment must block with the previously audited `evidence-window-incomplete` class.

## 4. Initial Alignment

Initial Alignment is the only Phase 6B path that creates a new Trusted Checkpoint.

Rules:

1. Proposal identity is deterministic over the exact bounded proposal payload.
2. Unknown convenience fields are rejected.
3. Explicit `accepted: true` is mandatory.
4. Confirmation must bind to exactly one proposal identity.
5. Confirmation cannot predate the proposal.
6. Human actor identity is explicit.
7. Initial Alignment always creates checkpoint version `1`.
8. Checkpoint identity is deterministic over the accepted proposal + actor + confirmation time.
9. Proposal / checkpoint output is deeply immutable.
10. No model confidence, branch name, source metadata or prior user choice substitutes for explicit Initial Alignment acceptance.

## 5. Store contract

The store is a narrow persistence boundary, not the product's semantic authority.

Each configured store has an explicit project allowlist.

A write requires:

```js
{
  checkpoint,
  expectedVersion,
  idempotencyKey
}
```

Required semantics:

- compare-and-swap against current trusted version;
- checkpoint version must advance exactly one step;
- first project write requires `expectedVersion: 0` and checkpoint `version: 1`;
- same successful idempotency key + same checkpoint is a no-op replay;
- same idempotency key + different checkpoint fails closed;
- duplicate checkpoint identity without its accepted replay receipt fails closed;
- project scopes outside the configured allowlist fail closed;
- accepted history is append-only within the store state;
- malformed persisted state is rejected before use;
- caller-owned input objects are never mutated;
- returned records/state are immutable copies.

The deterministic state envelope is:

```js
{
  storeVersion: "nexus-atlas.trusted-checkpoint-store.v0.1",
  projects: [
    {
      projectRef,
      checkpoints: [...],
      receipts: [
        { idempotencyKey, checkpointId, checkpointDigest }
      ]
    }
  ]
}
```

Receipts are persistence/idempotency metadata only. They are not Canonical Graph records, Memory records, Outcome records or source evidence.

## 6. Read-after-write verification

A non-replayed accepted write is not considered complete until the store can read back the intended trusted checkpoint.

The in-memory reference store performs this verification directly. The file-backed adapter must additionally verify the serialized durable state after its atomic write.

A replay may resolve the original checkpoint through its durable idempotency receipt even if a later trusted checkpoint is already current.

## 7. Persistence separation

Phase 6B persistence must remain separate from:

- Canonical Context Graph;
- Decision / Memory Ledger;
- Source Snapshot;
- Context Import Plan;
- Canonical Admission;
- Product Surface browser state;
- legacy `memory/memory-store.js`;
- browser LocalStorage.

No Phase 6B store write is source evidence by itself.

## 8. File-backed adapter requirements

The local durable adapter may be implemented only behind the same store semantics.

It must use:

- explicit caller-provided file path;
- deterministic JSON serialization;
- atomic replace on successful write;
- bounded exclusive write coordination;
- read-after-write verification;
- fail-closed malformed-state handling;
- no token, credential or raw private payload persistence;
- a repository ignore rule for the default local runtime-data directory.

The file path / storage provider is implementation detail, not part of Trusted Checkpoint identity.

## 9. Explicit non-goals

Phase 6B does not:

- read GitHub;
- determine `VALID`, `INVALID` or `AMBIGUOUS`;
- create a Fresh Evidence batch;
- ask the later Human Authority question for newly discovered ambiguity;
- execute project actions;
- verify action outcomes;
- create Outcome Records;
- mutate the Canonical Graph;
- write Decision / Memory records;
- change Phase 4 or Phase 5 runtime;
- add browser UI.

## 10. Acceptance gate

Phase 6B is acceptable only when automated tests prove at minimum:

- deterministic proposal identity;
- explicit Initial Alignment acceptance;
- proposal binding;
- strict timestamp and structural validation;
- version-1 checkpoint bootstrap;
- immutable output;
- project allowlist;
- CAS stale-write rejection;
- exact one-step version advancement;
- replay-safe idempotency;
- idempotency conflict rejection;
- append-only accepted history;
- malformed store rejection;
- read-after-write verification;
- file-backed restart durability;
- atomic/concurrent write behavior;
- Phase 4 / Phase 5 frozen regression remains green.
