# Nexus Atlas v0.1 — Cross-source Postcondition Verification Contract

**Status:** Binding Phase 7F contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization  
**Accepted upstream:** Phase 7E Outcome Categories, Phase 7D History/Retention, Phase 7C D1, Phase 7B Write-back Policy, frozen Phase 6 verification

---

## 1. Purpose

Phase 7F separates **what consequence is being verified** from **which authoritative source profile proves it**.

The first accepted profiles are deliberately narrow:

```text
GitHub / phase6-outcome-v0.1
DataHub / continuity-mcp-v0.9.5
```

This is the first cross-source proof boundary. It does not claim that Nexus has a generic live connector for arbitrary services.

---

## 2. Architecture

```text
Phase 7E Outcome Category Proposal
        ↓
Cross-source Postcondition Proposal
        ↓
provider-specific accepted adapter
        ↓
Postcondition Proof
        ↓
Cross-source Verification
```

Provider transport stays outside the generic verifier.

The generic verifier accepts only a normalized proof that is produced from a registered source profile and binds the exact category proposal, subject, scope and condition.

---

## 3. Category, evidence and authority remain separate

Phase 7F preserves the Phase 7E distinction:

- category says what semantic consequence is being examined;
- source proof says what a source actually observed;
- verification state says whether the declared postcondition was satisfied;
- Human Authority remains a separate governance boundary;
- Canonical Admission remains a separate context-write boundary.

A source proving `decision-transition` evidence does not itself confirm a Decision. A source proving `evidence-refresh` does not itself admit canonical Evidence.

---

## 4. Cross-source postcondition proposal

Schema:

```text
nexus-atlas.cross-source-postcondition.v0.1
```

Conceptual shape:

```js
{
  postconditionVersion,
  postconditionId,
  categoryProposalRef,
  projectRef,
  category,
  subjectRef,
  provider,
  profile,
  scopeRef,
  declaredAt,
  condition: {
    conditionType,
    expectedValue
  },
  explanation
}
```

The proposal must bind one accepted Phase 7E category proposal.

`declaredAt` cannot predate the category proposal. The postcondition must be frozen before later source observation is accepted as proof.

---

## 5. Source profile registry

### 5.1 GitHub `phase6-outcome-v0.1`

This profile is a compatibility adapter over the already accepted Phase 6 Outcome verification path. It does not reimplement or weaken GitHub verification.

Allowed category:

```text
action-execution
```

Allowed postconditions:

```text
github-default-branch-head-advanced
github-commit-present-after-baseline
```

Accepted source authority:

```text
accepted-phase6-outcome-verification
```

The adapter must bind:

- category project and action subject;
- Re-entry Package project/action;
- frozen Outcome project/action/reentry reference;
- GitHub repository scope from the Re-entry verification plan;
- exact frozen expected postcondition.

It maps the frozen Phase 6 states without reinterpretation:

```text
verified      → satisfied
failed        → not-satisfied
indeterminate → unknown
```

### 5.2 DataHub `continuity-mcp-v0.9.5`

This profile consumes the existing read-only local DataHub Continuity snapshot.

It is a **local development source profile**, not a production DataHub claim. The existing bridge remains loopback-only and read-only.

Allowed categories:

```text
action-execution
milestone-transition
decision-transition
evidence-refresh
```

Initial postcondition:

```text
datahub-entity-status-equals
```

Accepted source authority:

```text
datahub-read-only-metadata-state
```

The adapter requires:

- `source = datahub-mcp`;
- `readOnly = true`;
- the accepted Nexus Continuity project URN;
- `project-nexus-ai` normalized project identity;
- successful representative lineage verification;
- unique normalized entity IDs;
- exact subject presence;
- entity semantic type matching the Phase 7E category's Canonical Context kind.

A missing or kind-mismatched subject fails closed. It must not be converted into a false postcondition failure.

---

## 6. Postcondition Proof

Schema:

```text
nexus-atlas.postcondition-proof.v0.1
```

Conceptual shape:

```js
{
  proofVersion,
  proofId,
  postconditionRef,
  projectRef,
  categoryProposalRef,
  category,
  subjectRef,
  provider,
  profile,
  scopeRef,
  observedAt,
  condition,
  result,          // satisfied | not-satisfied | unknown
  observedValue,
  evidenceRefs,
  sourceAuthority,
  authority: "source-postcondition-proof"
}
```

Proof identity deterministically binds all normalized content.

`satisfied` requires at least one source-local evidence reference.

`unknown` is not equivalent to `not-satisfied`.

If an adapter cannot read or safely validate its source, it should fail closed rather than manufacture a proof. Phase 7F does not turn source unavailability into a postcondition failure.

---

## 7. Freshness

A proof is acceptable only when:

```text
proof.observedAt >= postcondition.declaredAt
```

An older observation is `STALE_POSTCONDITION_PROOF` and cannot verify the new postcondition.

`verifiedAt` must not predate the proof observation.

This is a temporal binding rule, not merely a timestamp-format check.

---

## 8. Cross-source Verification

Schema:

```text
nexus-atlas.cross-source-verification.v0.1
```

Result mapping:

```text
satisfied     → verified
not-satisfied → failed
unknown       → indeterminate
```

The verifier binds the exact:

- Phase 7E category proposal;
- postcondition proposal;
- proof;
- project;
- semantic category;
- subject;
- provider/profile;
- source scope;
- condition.

Cross-source verification is deterministic and deeply immutable.

---

## 9. Non-authority rule

A Phase 7F Cross-source Verification has fixed capabilities:

```text
writebackOutcomeAllowed = false
checkpointAdvanceAuthority = false
canonicalContextWriteAllowed = false
```

This is essential.

Phase 7F proves a source postcondition; it does **not** yet define a new durable generalized Outcome Record, allow it into the Phase 7B write-back store, advance Trusted Checkpoint state, or mutate Canonical Context.

The frozen Phase 6 Outcome remains the only accepted artifact with the existing verified-outcome checkpoint closure path.

---

## 10. Decision and Evidence safeguards

For `decision-transition`, the Phase 7E category proposal must already carry its required Human Authority reference. Phase 7F can verify source state but cannot use that source state as a replacement for Human Authority.

For `evidence-refresh`, Phase 7F can verify fresh source-local evidence state but cannot bypass Phase 4 Canonical Admission.

The same separation applies to milestone/action canonical state changes.

---

## 11. Provider metadata/privacy

Public Phase 7F artifacts may contain only bounded logical source metadata:

- provider;
- profile;
- logical scope reference;
- source-local evidence references;
- observed values required for the declared postcondition.

They must not contain:

- tokens/credentials;
- DataHub GMS tokens;
- MCP process environment;
- D1 database IDs or binding names;
- local filesystem paths;
- raw GitHub/DataHub provider payloads;
- hidden model reasoning.

---

## 12. Explicit non-goals

Phase 7F does not:

- add arbitrary provider registration;
- create a hosted DataHub connector;
- deploy DataHub to Cloudflare;
- create a generalized durable Outcome schema;
- extend Phase 7B artifact kinds;
- change Phase 6 OutcomeRecord or checkpoint closure;
- mutate Canonical Context;
- add browser/UI;
- provision D1;
- add autonomous external execution.

---

## 13. Acceptance boundary

Phase 7F is accepted only if:

1. provider/profile and condition vocabularies are explicit and fail closed;
2. GitHub compatibility uses the frozen Phase 6 Outcome rather than reimplementing success semantics;
3. verified/failed/indeterminate Phase 6 states map exactly to satisfied/not-satisfied/unknown;
4. DataHub proof requires the accepted read-only continuity scope and passed lineage verification;
5. DataHub subject presence and semantic kind are validated;
6. stale proof observations are rejected;
7. proof/category/postcondition/provider/scope binding is exact;
8. cross-source result mapping remains deterministic;
9. Phase 7F grants no write-back, checkpoint, or canonical-write authority;
10. source failure cannot be mislabeled as postcondition failure;
11. Phase 7E/7D/7C/7B regressions pass;
12. Phase 6B–6F regressions pass;
13. Phase 5 and Phase 4 frozen acceptance remains green;
14. no frozen source/continuity/browser/runtime boundary is modified for convenience.

---

## 14. Next boundary

After Phase 7F acceptance, the planned next slice is **Phase 7G — Write-back Management Surface / Broader Project Proof**.

7G must consume only accepted Phase 7 artifacts and may not reinterpret a 7F verification as a durable generalized Outcome unless that write-back transition is separately specified and proven.
