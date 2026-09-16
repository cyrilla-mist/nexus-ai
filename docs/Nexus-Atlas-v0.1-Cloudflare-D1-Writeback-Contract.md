# Nexus Atlas v0.1 — Cloudflare D1 Write-back Contract

**Status:** Binding Phase 7C durable-provider contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization  
**Upstream:** accepted Phase 7B Target + Policy Gate

---

## 1. Provider decision

The first durable provider beyond the Phase 6 local file reference is **Cloudflare D1**.

This is intentionally narrow:

- Nexus already deploys its Worker on Cloudflare;
- Phase 7B froze the provider capability contract first;
- D1 is injected as a Worker binding and does not need provider credentials in Nexus artifacts;
- the adapter is testable without provisioning a live database;
- actual production D1 provisioning/binding is deferred until a later real-provider deployment proof.

Phase 7C does not modify `wrangler.toml` and does not claim a live D1 database exists yet.

---

## 2. Frozen safety mapping

The D1 target declares the accepted Phase 7B capabilities:

```text
providerKind                 = cloudflare-d1
durability                   = durable
projectScopeEnforced         = true
idempotentOutcomeAppend      = true
checkpointCompareAndSwap     = true
exactReadAfterWrite          = true
```

These claims are accepted only because the adapter behavior is executable under dedicated tests and remains behind the Phase 7B capability gate.

---

## 3. D1 consistency boundary

Every runtime store read/write operation begins with:

```js
const session = db.withSession("first-primary")
```

This is binding Phase 7C behavior.

The purpose is to require the operation to begin from the primary/current database state and then preserve sequential consistency for the read/write/read sequence.

The adapter must not use an unconstrained first read for CAS or exact read-after-write verification.

---

## 4. Tables remain semantically separate

Phase 7C uses four v0.1 tables:

```text
nexus_writeback_outcomes_v01
nexus_writeback_outcome_receipts_v01
nexus_writeback_checkpoints_v01
nexus_writeback_checkpoint_receipts_v01
```

Outcome and Trusted Checkpoint artifacts are not combined into a generic state table.

Reasons:

- Outcome history is append-only;
- failed/indeterminate Outcomes remain durable history;
- Trusted Checkpoints are contiguous versioned trusted state;
- checkpoint advancement has CAS semantics;
- idempotency receipts belong to the semantic write they protect.

---

## 5. Outcome append

For one accepted Outcome append:

1. validate the Outcome through frozen `validateOutcomeRecordV01`;
2. enforce configured project allowlist;
3. open a `first-primary` session;
4. read the idempotency receipt;
5. if an identical receipt exists, exact-read the Outcome and return replay;
6. if the idempotency key points to different content, fail `IDEMPOTENCY_CONFLICT`;
7. reject an Outcome identity that exists without this receipt;
8. execute Outcome row + idempotency receipt INSERTs through one D1 `batch()`;
9. exact-read the Outcome through the same session;
10. return success only if the frozen artifact exactly matches.

A failed batch must not be represented as a successful append.

---

## 6. Checkpoint CAS write

For one accepted Trusted Checkpoint write:

1. validate through frozen `validateTrustedCheckpointV01`;
2. enforce configured project allowlist;
3. open a `first-primary` session;
4. read the idempotency receipt;
5. replay only identical receipt/artifact content;
6. read latest checkpoint;
7. require `expectedVersion === currentVersion`;
8. require `checkpoint.version === currentVersion + 1`;
9. reject duplicate checkpoint identity without matching receipt;
10. execute checkpoint row + receipt INSERTs through one D1 `batch()`;
11. exact-read latest checkpoint through the same session;
12. return success only when exact content is observable.

Concurrency/race errors must fail closed or resolve to a proven identical replay. They must not silently overwrite current trusted state.

---

## 7. Truthful partial failure remains

D1 does not change Phase 6 continuity closure ordering:

```text
Outcome durable append
        ↓
Checkpoint CAS write
```

These are two semantic operations. Phase 7C does not wrap them in a fictional cross-store all-or-nothing transaction.

If Outcome persists and later checkpoint advancement fails, the correct state remains:

```text
Outcome = durable history
Trusted Checkpoint = unchanged
Closure Receipt = absent
```

---

## 8. Schema initialization

`initializeD1WritebackSchemaV01({ db })` is explicit.

Runtime store construction does not silently create or migrate tables during normal reads/writes.

The tracked SQL schema is mirrored in:

`migrations/phase7c-d1-writeback-v01.sql`

Actual environment migration execution is deferred to the later deployment proof.

---

## 9. Public target privacy

The logical Writeback Target contains no:

- D1 database ID;
- Worker binding name;
- account identifier;
- API token;
- connection secret;
- local filesystem path;
- raw D1 response payload.

Those are environment/runtime configuration concerns and cannot become project truth, source evidence or authority.

---

## 10. Non-goals

Phase 7C does not:

- provision a Cloudflare D1 database;
- change Worker production bindings;
- add credentials/secrets;
- generalize GitHub outcome verification;
- add history list/retention/deletion operations;
- add new Outcome categories;
- add UI;
- modify Canonical Context;
- authorize autonomous execution.

---

## 11. Acceptance

Phase 7C is accepted only when:

1. explicit schema initialization is deterministic;
2. D1 target passes the Phase 7B capability gate;
3. public target leaks no database/binding identity;
4. every runtime session begins `first-primary`;
5. Outcome append/read/replay semantics match Phase 6;
6. Outcome idempotency conflict and duplicate identity fail closed;
7. a failed D1 batch leaves no partial Outcome pair in the acceptance driver;
8. Checkpoint initial write/replay semantics match Phase 6;
9. checkpoint CAS and exact version advancement remain enforced;
10. a failed D1 checkpoint batch leaves trusted state unchanged;
11. Outcome and Checkpoint tables remain semantically separate;
12. no delete/update lifecycle API is introduced in 7C;
13. Phase 7B and Phase 6B–6F regressions remain green;
14. Phase 5 / Phase 4 regressions remain green.

Passing Phase 7C proves the adapter contract, not live Cloudflare provisioning.