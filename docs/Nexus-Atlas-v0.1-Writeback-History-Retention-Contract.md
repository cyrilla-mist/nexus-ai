# Nexus Atlas v0.1 — Write-back History + Retention Contract

**Status:** Binding Phase 7D contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization  
**Accepted upstream:** Phase 7B Target + Policy Gate, Phase 7C D1 durable adapter, frozen Phase 6 continuity semantics

---

## 1. Purpose

Phase 7D adds one bounded lifecycle surface for durable write-back artifacts:

```text
Outcome Record history
Trusted Checkpoint history
        ↓
retention policy
        ↓
read-only bounded pagination
```

The goal is to make retained continuity history inspectable without weakening the accepted write path.

This phase does **not** add destructive cleanup, automatic expiry, canonical-context mutation, provider-specific lifecycle authority, or browser/UI behavior.

---

## 2. Frozen upstream rules

Phase 7D must preserve the following accepted behavior:

- every Outcome Record remains append-only;
- `verified`, `failed`, and `indeterminate` Outcomes are all legitimate retained history;
- Trusted Checkpoints remain versioned and ordered by contiguous version;
- only a verified Outcome may advance Trusted Checkpoint state;
- write idempotency and checkpoint CAS remain write-path concerns;
- exact read-after-write verification remains mandatory for accepted writes;
- history reads never create authority, verification, or authorization;
- reading retained artifacts cannot mutate the Outcome or Trusted Checkpoint stores;
- Canonical Context is not mutated as a side effect of history reads.

Phase 7D therefore composes downstream of the accepted Phase 6/7 write path. It does not retrofit the Phase 6 store cores.

---

## 3. Retention policy v0.1

Schema:

```text
nexus-atlas.writeback-retention-policy.v0.1
```

The initial policy is intentionally conservative:

```text
retentionMode = retain-all
retainOutcomeStates = [verified, failed, indeterminate]
retainCheckpointHistory = true
deletionAllowed = false
maxHistoryPageSize <= 100
```

### 3.1 Why retain all Outcome states

A failed or indeterminate attempt is part of the continuity audit trail. Removing it would allow the remaining history to imply a cleaner success story than actually occurred.

Therefore v0.1 must not expose a policy that keeps only verified Outcomes.

### 3.2 Why deletion is disabled

The accepted real continuity proof depends on reconstructable Outcome → Trusted Checkpoint transitions. Automatic retention expiry would introduce a new destructive authority before Nexus has a proven archival/deletion model.

Therefore:

> Phase 7D authorizes read retention policy only. It does not authorize lifecycle deletion.

Any later deletion/expiry feature requires a separate contract, explicit authority model, dependency checks, and acceptance gate.

---

## 4. History artifact kinds

Phase 7D exposes only:

```text
outcome-record
trusted-checkpoint
```

It does not expose arbitrary provider payloads, credentials, source snapshots, comments, model traces, or hidden execution metadata.

Each returned item must pass the already accepted artifact validator before it can appear in history.

---

## 5. Query contract

Conceptual reader boundary:

```js
readWritebackHistoryV01({
  historyReader,
  retentionPolicy,
  projectRef,
  artifactKind,
  limit,
  cursor
})
```

Binding rules:

1. `projectRef` must be inside the retention-policy allowlist.
2. `artifactKind` must be one of the two accepted history kinds.
3. `limit` must be positive and must not exceed the policy bound.
4. history order is always `newest-first`.
5. pagination is cursor-based; no numeric page offset is authoritative.
6. a cursor must resolve inside the same retained project history.
7. an invalid/foreign cursor fails closed.
8. reader results must not exceed the requested limit.
9. a continuation cursor is allowed only when another page exists.
10. history pages are deterministic and deeply immutable.

---

## 6. Outcome history ordering

Outcome history is ordered by:

```text
recordedAt DESC
outcomeId DESC   # deterministic tie-break
```

Every item must:

- pass `validateOutcomeRecordV01`;
- belong to the requested project;
- have a verification state retained by the accepted policy;
- appear at most once in a page;
- preserve exact accepted artifact content.

The reader must not reinterpret `failed` or `indeterminate` as lower-authority records that can be skipped.

---

## 7. Trusted Checkpoint history ordering

Checkpoint history is ordered by:

```text
version DESC
```

Every item must:

- pass `validateTrustedCheckpointV01`;
- belong to the requested project;
- appear at most once in a page;
- preserve exact accepted artifact content.

History inspection does not change which checkpoint is current. The write-path store remains the current-state authority.

---

## 8. History page result

Conceptual shape:

```js
{
  historyVersion: "nexus-atlas.writeback-history-page.v0.1",
  historyId,
  retentionPolicyRef,
  projectRef,
  artifactKind,
  order: "newest-first",
  limit,
  cursorFrom,
  items,
  nextCursor,
  truncated
}
```

`historyId` deterministically binds normalized page content.

`truncated` means only that another retained page exists. It must not be interpreted as missing evidence, failed persistence, or incomplete Outcome verification.

---

## 9. Phase 6 store history adapter

The accepted Phase 6 in-memory/file stores expose `exportState()` for tests/reference runtime.

Phase 7D may wrap that existing state in a read-only history adapter with only:

```text
listOutcomes
listCheckpoints
```

The adapter must not expose append/write/delete methods and must not change Phase 6 store validation or persistence semantics.

This adapter is a reference/history bridge, not a new persistence authority.

---

## 10. Cloudflare D1 history reader

The Phase 7C D1 schema already persists normalized Outcome and Trusted Checkpoint artifacts separately.

Phase 7D adds a read-only D1 history reader over those existing tables.

Rules:

- use `withSession("first-primary")` for a consistent primary-read boundary;
- use bound parameters only;
- fetch at most `limit + 1` rows to determine continuation;
- validate every decoded JSON payload with the frozen Phase 6 validator;
- verify stored artifact identity, project binding, timestamp/version and digest against decoded payload;
- never expose D1 database IDs, binding names, credentials, bookmarks, or connection metadata in history output;
- never mutate D1 state.

Outcome cursor anchors bind both `recorded_at` and `outcome_id` to preserve deterministic ordering.
Checkpoint cursor anchors bind `checkpoint_id` and `version`.

---

## 11. Cursor safety

A history cursor is an artifact identity, not an authorization token.

A cursor must resolve inside the requested project's retained history before it can be used.

The implementation must reject:

- nonexistent cursors;
- cross-project cursors;
- malformed cursors;
- cursors whose backing D1 row cannot be validated;
- cursor reads that would cross artifact kinds.

No cursor may be guessed from timestamps alone.

---

## 12. Privacy and authority

History pages may contain only already-accepted Outcome Records or Trusted Checkpoints.

They must not add:

- provider credentials;
- local filesystem paths;
- D1 binding/database identifiers;
- raw GitHub responses;
- source comments/reviews/bodies outside accepted artifact contracts;
- model chain-of-thought or private execution traces.

History is observational. It cannot by itself:

- authorize an action;
- verify an Outcome;
- advance a Trusted Checkpoint;
- resolve Human Authority ambiguity;
- mutate Canonical Context.

---

## 13. Explicit non-goals

Phase 7D does not implement:

- retention expiry by age;
- count-based compaction;
- destructive deletion;
- legal/compliance deletion workflows;
- archival tiering;
- history search/full-text indexing;
- provider-agnostic verification;
- UI/history browser;
- production D1 provisioning;
- cross-project aggregate history.

---

## 14. Acceptance boundary

Phase 7D is accepted only if:

1. retention policy is deterministic and immutable;
2. all three Outcome verification states are retained;
3. deletion remains disabled;
4. Phase 6 history paging is deterministic and project-scoped;
5. D1 history paging matches the logical ordering semantics;
6. invalid cursors fail closed;
7. every returned artifact is revalidated and digest-bound;
8. read surfaces expose no write/delete capability;
9. the dedicated 7D suite passes;
10. Phase 7B/7C regressions pass;
11. Phase 6B–6F regressions pass;
12. frozen Phase 5 and Phase 4 acceptance remains green;
13. no browser/UI, `wrangler.toml`, Phase 4/5 source contracts, or frozen Phase 6 runtime file is modified for convenience.

---

## 15. Next boundary after 7D

After 7D acceptance, Phase 7 may proceed to the next bounded generalization slice. Retention/deletion semantics remain frozen at `retain-all / deletionAllowed=false` until a separately justified lifecycle phase explicitly reopens them.
