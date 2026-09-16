# Nexus Atlas v0.1 — Wider Outcome Category Contract

**Status:** Binding Phase 7E contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization  
**Accepted upstream:** Phase 7B Target + Policy, Phase 7C durable D1 adapter, Phase 7D History + Retention, frozen Phase 6 Outcome semantics

---

## 1. Purpose

Phase 6 proved one narrow Outcome shape: the result of a bounded re-entry action verified against fresh GitHub evidence.

Phase 7E defines a broader **semantic category boundary** for outcomes without weakening or rewriting that proven artifact.

The first bounded category set is:

```text
action-execution
milestone-transition
decision-transition
evidence-refresh
```

These categories align with already-existing Canonical Context kinds (`action`, `milestone`, `decision`, `evidence`). No new canonical kind is introduced.

---

## 2. Core distinction

Three concepts remain separate:

```text
Outcome category
  = what kind of project consequence is being described

Verification state
  = whether the proposed consequence was authoritatively verified

Authority / governance
  = whether the consequence is allowed to change protected project state
```

A category name is never evidence and never authority.

`decision-transition` does not become confirmed merely because it is categorized as a decision result. `evidence-refresh` does not become canonical Evidence merely because fresh source data exists.

---

## 3. Frozen Phase 6 Outcome

`nexus-atlas.outcome-record.v0.1` remains frozen.

Phase 7E must not:

- add a `category` field to the Phase 6 Outcome Record;
- change its deterministic identity;
- change its `verified / failed / indeterminate` semantics;
- alter `nextCheckpointAllowed`;
- reinterpret failed or indeterminate records;
- broaden the existing GitHub verification contract.

Instead, Phase 7E adds a downstream classification contract and a one-way adapter that maps an accepted Phase 6 Outcome to `action-execution`.

---

## 4. Outcome category descriptor

Schema:

```text
nexus-atlas.outcome-category.v0.1
```

Conceptual shape:

```js
{
  categoryVersion,
  categoryId,
  category,
  contextKind,
  semantics,
  requirements: {
    freshAuthoritativeVerification,
    humanAuthority,
    canonicalAdmissionForContextWrite
  },
  capabilities: {
    classificationOnly,
    checkpointAdvanceAuthority,
    canonicalContextWriteAllowed
  }
}
```

All v0.1 categories require fresh authoritative verification before an accepted category-specific Outcome can exist.

All category descriptors are **classification-only**:

```text
checkpointAdvanceAuthority = false
canonicalContextWriteAllowed = false
```

This is deliberately stricter than the frozen Phase 6 closure path. A categorized reference cannot be substituted for the actual accepted Outcome Record when advancing trusted state.

---

## 5. Initial category registry

### 5.1 `action-execution`

Canonical semantic neighbor: `action`.

Meaning: observed result of a bounded action attempt.

Human Authority requirement: `conditional`.

The existing Phase 6 Outcome maps here because it is bound to one Re-entry Package action and a frozen expected postcondition.

### 5.2 `milestone-transition`

Canonical semantic neighbor: `milestone`.

Meaning: an observed transition of a bounded project milestone state.

Human Authority requirement: `conditional`.

A source may prove that an externally represented milestone changed, but the category alone cannot decide whether that change modifies protected project direction.

### 5.3 `decision-transition`

Canonical semantic neighbor: `decision`.

Meaning: explicit resolution, supersession, or revocation of a governed Decision.

Human Authority requirement: `required`.

Fresh source evidence may support a decision, but cannot replace the human authority required to confirm, supersede, or revoke a protected decision.

### 5.4 `evidence-refresh`

Canonical semantic neighbor: `evidence`.

Meaning: fresh verification that updates the observed applicability or result of evidence.

Human Authority requirement: `not-required` at the category layer.

This does not authorize canonical admission. If the refreshed observation should enter Canonical Context, it still crosses the existing Canonical Admission boundary.

---

## 6. Human Authority vocabulary

The descriptor uses:

```text
required
conditional
not-required
```

Interpretation:

- `required`: an accepted category proposal must bind an explicit Human Authority reference before later verification can proceed to a governed decision outcome;
- `conditional`: the category itself does not always require Human Authority, but downstream governance may require it when protected ambiguity or external effect exists;
- `not-required`: the category does not itself require a human decision, though later canonical admission or protected-state mutation may still require a separate governed boundary.

This vocabulary must not be interpreted as permission to bypass the existing Human Authority Gate.

---

## 7. Outcome category proposal

Schema:

```text
nexus-atlas.outcome-category-proposal.v0.1
```

Conceptual shape:

```js
{
  proposalVersion,
  proposalId,
  projectRef,
  category,
  subjectRef,
  proposedAt,
  basisRefs,
  evidenceRefs,
  humanAuthorityRef,
  explanation
}
```

A proposal is a **verification request boundary**, not an accepted Outcome.

It says which consequence Nexus intends to verify next. It does not say that the consequence occurred.

Rules:

1. category must be in the frozen v0.1 registry;
2. project and subject scope are explicit;
3. basis references must be non-empty and unique;
4. evidence references may be empty before fresh verification;
5. `decision-transition` requires a non-null `humanAuthorityRef`;
6. proposal identity deterministically binds all normalized content;
7. proposal output is deeply immutable;
8. proposal construction cannot mutate caller inputs.

---

## 8. Phase 6 categorized reference

Schema:

```text
nexus-atlas.categorized-outcome-reference.v0.1
```

The Phase 6 adapter accepts only an already-valid `nexus-atlas.outcome-record.v0.1` and derives:

```text
category = action-execution
subjectRef = Outcome.actionRef
verificationState = preserved exactly
evidenceRefs = preserved exactly
sourceAuthority = preserved exactly
```

`verified`, `failed`, and `indeterminate` Phase 6 Outcomes all remain classifiable history.

The derived reference has:

```text
historyReferenceAllowed = true
checkpointAdvanceAuthority = false
canonicalContextWriteAllowed = false
```

The frozen original Outcome—not this reference—remains the authority consumed by Phase 6 continuity closure.

---

## 9. Category does not alter verification state

Category and verification are orthogonal.

Examples:

```text
action-execution + verified
action-execution + failed
action-execution + indeterminate
```

are all valid historical classifications.

Future Phase 7F verification may create category-specific verified results, but it must retain the same principle: a category cannot force a positive verification state.

---

## 10. Canonical Context boundary

The category registry is aligned to Canonical Context kinds for semantic consistency only.

Phase 7E performs no Canonical Graph write.

In particular:

- `decision-transition` cannot confirm/supersede/revoke a Decision node by itself;
- `evidence-refresh` cannot admit a new Evidence node by itself;
- `milestone-transition` cannot silently rewrite Project current milestone;
- `action-execution` cannot mark a canonical Action completed by itself.

Any later Canonical Context mutation requires a separately accepted admission/write-back contract.

---

## 11. Checkpoint advancement boundary

No Outcome Category descriptor, proposal, or categorized reference grants Trusted Checkpoint advancement.

For the accepted Phase 6 path, advancement remains governed by the original frozen rules:

```text
accepted Phase 6 Outcome Record
verificationState = verified
nextCheckpointAllowed = true
safe authoritative ahead lineage
verified-outcome confirmation
checkpoint CAS version + 1
exact read-after-write
```

Future category-specific checkpoint effects require a separately specified rule; they are not inferred in 7E.

---

## 12. Privacy and safety

Category artifacts contain semantic references only. They must not contain:

- provider credentials;
- Cloudflare D1 IDs/binding names;
- local filesystem paths;
- raw GitHub payloads;
- hidden model reasoning;
- private conversation text;
- arbitrary provider metadata.

Category metadata cannot become fresh evidence or Human Authority.

---

## 13. Non-goals

Phase 7E does not implement:

- cross-source postcondition verification;
- a provider-neutral source adapter;
- new durable Outcome storage schema;
- D1 migration changes;
- Canonical Context write-back;
- automatic Decision confirmation;
- checkpoint advancement for new categories;
- browser/UI management;
- retention deletion;
- production D1 provisioning;
- autonomous external execution.

---

## 14. Acceptance boundary

Phase 7E is accepted only if:

1. exactly four initial categories are registered;
2. category identity is deterministic and output immutable;
3. all categories require fresh authoritative verification;
4. no category descriptor grants checkpoint or Canonical Context write authority;
5. Decision transition requires explicit Human Authority reference;
6. Evidence refresh remains separate from Canonical Admission;
7. category proposals are deterministic, scoped and immutable;
8. frozen Phase 6 Outcome maps only to `action-execution`;
9. Phase 6 verification state/evidence/authority are preserved in the derived reference;
10. failed and indeterminate Outcomes remain visible as categorized history;
11. the adapter does not mutate the accepted Outcome;
12. Phase 7D/7C/7B regressions pass;
13. Phase 6B–6F regressions pass;
14. frozen Phase 5 and Phase 4 regressions pass;
15. no frozen Phase 6 runtime, browser/UI, D1 production binding, or Canonical Context runtime is modified for convenience.

---

## 15. Next boundary

After Phase 7E acceptance, the planned next slice is **Phase 7F — Cross-source Postcondition Verification**.

7F may generalize how a category proposal is proven from authoritative source evidence. It may not treat the category registry itself as evidence or authority.
