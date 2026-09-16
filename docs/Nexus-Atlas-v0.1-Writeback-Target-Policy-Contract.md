# Nexus Atlas v0.1 — Write-back Target + Policy Contract

**Status:** Binding Phase 7B contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization  
**Upstream:** Phase 6 Complete / Accepted

---

## 1. Purpose

Phase 7B makes write-back destination and required guarantees explicit without changing accepted Phase 6 artifact semantics.

The target architecture is:

```text
accepted Outcome / Trusted Checkpoint artifacts
        ↓
Writeback Policy
        +
Writeback Target capability descriptor
        ↓
Capability Gate
        ↓
accepted Phase 6 store behavior
```

A target descriptor is configuration metadata. It is not project truth, fresh evidence, Human Authority or a credential container.

---

## 2. Writeback Target

A target describes one logical write-back adapter class:

```js
{
  targetVersion: "nexus-atlas.writeback-target.v0.1",
  targetId,
  providerKind,
  durability,       // memory | durable
  artifactKinds,    // outcome-record | trusted-checkpoint
  capabilities: {
    projectScopeEnforced,
    idempotentOutcomeAppend,
    checkpointCompareAndSwap,
    exactReadAfterWrite
  }
}
```

Rules:

1. identity is deterministic over normalized descriptor content;
2. providerKind is a bounded logical adapter identifier, not a URL/path/credential identity;
3. artifactKinds are unique and canonicalized;
4. capability values are explicit booleans;
5. validation may accept an insufficient target descriptor, but the capability gate must reject it;
6. output is deeply immutable;
7. machine-local paths, tokens, passwords, connection strings and vendor response payloads are forbidden from the descriptor.

---

## 3. Writeback Policy

A policy binds explicit projects and artifact kinds to one target:

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

Rules:

1. projectRefs are explicit, unique and canonicalized;
2. targetRef must resolve to the accepted target identity;
3. artifactKinds are explicit and must be supported by the target;
4. v0.1 may not disable verified-Outcome checkpoint advancement;
5. v0.1 may not disable exact read-after-write;
6. policy identity is deterministic;
7. policy output is deeply immutable;
8. policy does not grant Human Authority or source authority.

---

## 4. Capability Gate

A target/policy pair is usable only if the target declares all frozen Phase 6 storage guarantees:

```text
projectScopeEnforced        = true
idempotentOutcomeAppend     = true
checkpointCompareAndSwap    = true
exactReadAfterWrite         = true
```

The gate also checks the concrete injected store boundary required by the policy:

```text
outcome-record:
  appendOutcome
  readOutcome

trusted-checkpoint:
  writeCheckpoint
  readLatest
```

Missing capabilities fail closed. Phase 7B has no compatibility mode that silently downgrades accepted Phase 6 guarantees.

---

## 5. Binding

An accepted binding is a deterministic, serializable statement that a policy and target satisfy the gate:

```js
{
  bindingVersion: "nexus-atlas.writeback-binding.v0.1",
  bindingId,
  targetRef,
  policyRef,
  projectRefs,
  artifactKinds,
  capabilities
}
```

Store function objects are not serialized into the binding. Runtime store references remain injected behavior outside the public artifact.

---

## 6. Phase 6 reference adapters

Phase 7B provides two reference target factories over already accepted Phase 6 stores:

- `phase6-memory-pair` — in-memory Outcome + Trusted Checkpoint stores;
- `phase6-file-pair` — Node file-backed Outcome + Trusted Checkpoint stores.

The file target keeps local file paths inside adapter construction only. Two adapters using different local paths produce the same logical target descriptor when their capability contract is otherwise identical.

The Outcome and Trusted Checkpoint files must remain distinct because they preserve different semantics.

---

## 7. Frozen upstream semantics

Phase 7B does not change:

- Outcome Record validation;
- Trusted Checkpoint validation;
- append-only Outcome history;
- checkpoint version/CAS rules;
- idempotency/replay behavior;
- Outcome-first then Checkpoint write order;
- truthful partial-failure state;
- Continuity Closure Receipt rules;
- fresh verification requirements;
- Human Authority boundaries;
- Canonical Context boundaries;
- GitHub source/evidence semantics.

---

## 8. Non-goals

Phase 7B does not:

- select a new database or cloud provider;
- add credentials or secret handling;
- add retention/deletion policy;
- add wider Outcome categories;
- generalize GitHub verification;
- add browser/UI surfaces;
- authorize autonomous project actions;
- mutate Canonical Context.

---

## 9. Acceptance

Phase 7B is accepted only when:

1. target/policy/binding identities are deterministic;
2. inputs are not mutated and outputs are immutable;
3. policy cannot weaken verified-Outcome advancement or exact read-after-write;
4. target/policy mismatch fails closed;
5. unsupported artifact kinds fail closed;
6. every missing mandatory capability fails closed;
7. required store methods are enforced;
8. accepted Phase 6 memory/file stores bind successfully through the reference adapters;
9. file paths do not leak into logical target descriptors;
10. Phase 6B–6F, Phase 5 and Phase 4 regressions remain green.

Passing this contract authorizes only the next bounded Phase 7 slice.