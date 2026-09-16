# Nexus Atlas — Phase 7 Write-back Generalization Entry Audit

**Status:** Complete — implementation entry decision  
**Audit date:** 2026-09-16  
**Repository:** `cyrilla-mist/nexus-ai`  
**Audit baseline:** `772065e06d9ae5ca743956801313d5dc0783a304`  
**Precondition:** Phase 6 — Complete / Accepted

---

## 1. Audit decision

Phase 7 may proceed without reopening the accepted Phase 4 / Phase 5 truth boundaries or the frozen Phase 6 continuity semantics.

The smallest safe generalization path is **policy and adapter composition around the accepted Phase 6 write-back primitives, not a rewrite of those primitives**.

The accepted Phase 6 runtime already proves the essential safety properties:

```text
verified Outcome Record
        ↓ append-only write + exact read-back
Outcome store
        ↓
verified next-checkpoint derivation
        ↓ CAS version+1 write + exact read-back
Trusted Checkpoint store
        ↓
Continuity Closure Receipt
```

Phase 7 therefore should productize this write-back capability by making destination, lifecycle and policy boundaries explicit while preserving the same artifact validators, idempotency semantics, version protection and read-after-write requirements.

---

## 2. Components audited

The audit reviewed the accepted write-back path around:

- `experience/continuity-loop-v01/outcome-record-store.mjs`;
- `experience/continuity-loop-v01/file-outcome-record-store.mjs`;
- `experience/continuity-loop-v01/trusted-checkpoint-store.mjs`;
- `experience/continuity-loop-v01/file-trusted-checkpoint-store.mjs`;
- `experience/continuity-loop-v01/continuity-closure.mjs`;
- `experience/continuity-loop-v01/outcome-verifier.mjs`;
- `experience/continuity-loop-v01/trusted-checkpoint-validator.mjs`;
- `experience/continuity-loop-v01/reentry-package.mjs`;
- Phase 6G real-run evidence and Phase 6H final acceptance.

---

## 3. What is already generalized enough

### 3.1 Store cores are project-scoped, not hard-coded to Nexus

Both accepted in-memory stores take an explicit `allowedProjectRefs` allowlist. Their pure state reducers validate project binding and reject stored artifacts outside the configured scope.

This means Phase 7 must **not** rewrite the state reducers merely to claim multi-project capability.

### 3.2 Closure already consumes injected store behavior

`closeVerifiedContinuityV01` does not instantiate a filesystem or select a database. It consumes only the accepted behavior it needs:

```text
Outcome store:
  appendOutcome
  readOutcome

Checkpoint store:
  writeCheckpoint
  readLatest
```

This is already a provider-neutral dependency boundary at the closure layer.

Phase 7 does not need a second abstract repository interface that simply renames these four methods.

### 3.3 Outcome history and checkpoint state are intentionally different

The accepted Outcome store is append-only by identity and idempotency key. The Trusted Checkpoint store is ordered, contiguous and protected by compare-and-swap version semantics.

These are different persistence models and must remain separate.

Phase 7 must not merge them into one generic `saveState()` API because doing so would erase the semantic distinction between:

- historical attempts, including failed and indeterminate Outcomes; and
- the single latest trusted continuation boundary.

### 3.4 Exact read-after-write is part of the product contract

Both file adapters re-read the durable artifact after persistence. Continuity closure repeats the critical read-back at the orchestration boundary before emitting a closure receipt.

Read-after-write is therefore not an implementation detail that provider adapters may omit.

---

## 4. What is still Phase-6-specific

### 4.1 Concrete durable adapter is Node filesystem only

The only accepted durable implementation currently persists JSON through a local absolute filesystem path with lock files and atomic rename.

That was correct for proving one real loop, but it is not a product-level provider strategy.

Phase 7 should allow another durable provider later without putting local paths, database identifiers or vendor-specific response objects into Outcome / Trusted Checkpoint contracts.

### 4.2 Verification is still GitHub-specific

The accepted Re-entry Package and Outcome Verification support GitHub default-branch cursor semantics and two GitHub postcondition kinds.

This audit explicitly separates **write-back generalization** from **cross-source verification generalization**.

A new storage provider does not authorize new evidence semantics. Phase 7 must not pretend a generic write-back adapter makes the accepted GitHub verification contract provider-neutral.

### 4.3 Lifecycle reads are minimal

The current stores prove the Phase 6 loop, but expose only the reads required by that loop:

- `readOutcome(projectRef, outcomeId)`;
- `readLatest(projectRef)`;
- test/export state helpers.

Product-level history browsing, retention, archival and deletion policy are not yet defined.

### 4.4 Write authorization is implicit in orchestration

Phase 6 validates whether a verified Outcome may advance a checkpoint, but there is no reusable product-level write-back policy artifact describing:

- which project may write to which target;
- which artifact kinds the target accepts;
- which lifecycle operations are allowed;
- which safety invariants are mandatory regardless of provider.

That is the first genuine Phase 7 gap.

---

## 5. Frozen semantics Phase 7 must preserve

The following are not generalization opportunities. They are frozen Phase 6 safety requirements:

1. only accepted Outcome Records may be persisted through the write-back path;
2. failed and indeterminate Outcomes remain first-class history;
3. only `verified` Outcomes with `nextCheckpointAllowed=true` may advance trusted state;
4. checkpoint advancement is exactly `version + 1` under compare-and-swap;
5. replay uses idempotency keys and must not duplicate artifacts;
6. an idempotency key reused for different content fails closed;
7. project scope is explicit and allowlisted;
8. Outcome and Trusted Checkpoint artifacts remain deeply validated before storage;
9. durable writes require exact read-after-write verification;
10. Outcome write happens before checkpoint advancement;
11. a written Outcome does not imply checkpoint advancement succeeded;
12. a closure receipt is emitted only after both accepted durable read-backs succeed;
13. write-back cannot mutate Canonical Context as a side effect;
14. storage metadata cannot become fresh source evidence or Human Authority;
15. provider-specific credentials, paths and transport payloads cannot enter public artifact contracts.

---

## 6. Important partial-failure rule

Phase 6 deliberately writes Outcome first and checkpoint second.

Therefore this state is legitimate:

```text
Outcome persisted successfully
checkpoint CAS/write fails
```

Phase 7 must not invent an all-or-nothing transaction guarantee unless a future provider can actually prove one across both semantic stores.

The portable contract should instead preserve truthful recovery semantics:

- the Outcome remains durable historical evidence;
- trusted state remains at the previous checkpoint;
- retry may replay the same Outcome idempotently;
- checkpoint advancement still requires the original expected version;
- no closure receipt exists until both stores are observably correct.

This is safer than hiding partial success behind a generic transaction abstraction.

---

## 7. Phase 7 product boundary

Phase 7 is allowed to generalize:

- write-back target descriptors and capability declarations;
- reusable write-back policy;
- provider adapters behind the accepted Outcome / Checkpoint behavior;
- bounded history/list reads;
- lifecycle and retention policy;
- additional Outcome categories only when separately specified and tested;
- later cross-source postcondition verification;
- later user-facing write-back management;
- later broader-project acceptance.

Phase 7 is **not** allowed to generalize by weakening validation.

A provider with fewer guarantees must be rejected or exposed with insufficient capabilities; Nexus must not silently downgrade CAS, idempotency, project scope or read-after-write requirements.

---

## 8. First implementation slice: 7B Write-back Target + Policy Gate

The next authorized implementation slice is intentionally narrow.

### 7B should add

1. a deterministic `WritebackTarget` descriptor that describes a configured destination without containing credentials or filesystem paths;
2. an explicit `WritebackPolicy` validator binding project scope, artifact kinds and required capabilities;
3. a provider-neutral capability gate that accepts an injected Outcome store / Checkpoint store pair only when the declared capabilities satisfy the frozen Phase 6 requirements;
4. a small reference adapter that wraps the accepted in-memory/file store pair without modifying their semantics;
5. tests proving project-scope rejection, missing-capability rejection, policy/target binding, deterministic identity, immutability and no provider metadata leakage;
6. all Phase 6B–6F plus Phase 5 / Phase 4 regressions.

### 7B should not add

- a database selection;
- remote credentials or secret handling;
- cross-source outcome verification;
- new Outcome categories;
- retention/deletion;
- UI;
- autonomous external execution;
- Canonical Context write-back.

---

## 9. Proposed 7B conceptual contract

The exact names may be refined during 7B contract work, but the boundary should remain conceptually equivalent to:

```js
{
  targetVersion: "nexus-atlas.writeback-target.v0.1",
  targetId,
  providerKind,          // logical adapter kind, not credential identity
  durability,            // memory | durable
  artifactKinds,         // outcome-record, trusted-checkpoint
  capabilities: {
    projectScopeEnforced: true,
    idempotentOutcomeAppend: true,
    checkpointCompareAndSwap: true,
    exactReadAfterWrite: true
  }
}
```

and:

```js
{
  policyVersion: "nexus-atlas.writeback-policy.v0.1",
  policyId,
  projectRefs,
  targetRef,
  artifactKinds,
  requireVerifiedOutcomeForCheckpointAdvance: true,
  requireExactReadAfterWrite: true
}
```

The target descriptor is configuration metadata, not project truth, fresh evidence or authority.

---

## 10. No provider selection in 7A

This audit does not choose SQLite, Postgres, Supabase, Cloudflare, GitHub, object storage or another backend.

That choice is premature before 7B freezes the capability contract that any provider would have to satisfy.

The accepted file adapter remains a valid reference implementation and regression oracle.

---

## 11. Runtime placement

Phase 7 should use a new namespace downstream of the frozen Phase 6 runtime, for example:

```text
experience/writeback-v01/
```

Candidate early modules:

```text
writeback-target-validator.mjs
writeback-policy.mjs
writeback-capability-gate.mjs
phase6-store-target-adapter.mjs
```

Phase 7 should import the accepted Phase 6 artifact validators and store behavior rather than moving or renaming the frozen files.

---

## 12. Sequencing after 7A

The working sequence is:

```text
7A — Entry Audit
7B — Write-back Target + Policy Gate
7C — Durable provider adapter acceptance
7D — History / lifecycle + retention contract
7E — Wider Outcome category contract
7F — Cross-source postcondition verification
7G — Write-back management surface / broader project proof
7H — Final acceptance
```

These labels are planning aids. Each slice remains blocked by the prior slice and may be narrowed further if implementation evidence requires it.

---

## 13. 7A decision

**Reuse:** accepted Outcome / Trusted Checkpoint validators, state reducers, closure bindings and injected store behavior.  
**Freeze:** Phase 4 / Phase 5 truth boundaries and all accepted Phase 6 safety semantics.  
**Generalize first:** write-back destination description and reusable capability/policy gate.  
**Do not select yet:** a new database/provider, cross-source verification, UI or broader Outcome taxonomy.

The next authorized activity is **7B — Write-back Target + Policy Gate**.