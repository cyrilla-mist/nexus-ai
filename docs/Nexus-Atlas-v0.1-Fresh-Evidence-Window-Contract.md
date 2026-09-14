# Nexus Atlas v0.1 — Fresh Evidence Window Contract

**Status:** Binding Phase 6C contract  
**Parent:** Phase 6 — Real Continuity Loop  
**Scope:** fresh GitHub evidence sufficiency and checkpoint cursor interval proof only

## 1. Goal

Phase 6C must prove whether Nexus has a sufficient, bounded, current evidence window from one accepted Trusted Checkpoint cursor to observed repository reality.

This contract governs:

`Trusted Checkpoint → frozen Phase-4 GitHub Source Snapshot + bounded Phase-6 commit-range proof → Fresh Evidence Window`

It does **not** determine `VALID`, `INVALID` or `AMBIGUOUS`. Continuity Assessment is downstream and may run only over a `complete` Fresh Evidence Window.

## 2. Required correction to the parent Phase 6 contract

The Phase 6 blocked reason vocabulary is extended with:

- `evidence-window-incomplete`

This reason is required when the source is available and structurally accepted, but the bounded read cannot prove the complete evidence interval needed from checkpoint cursor to current observed head.

It is distinct from:

- `source-unavailable` — source retrieval failed;
- `required-evidence-missing` — a required fact is absent from an otherwise bounded read;
- `evidence-invalid` — supplied evidence/proof failed its accepted structure or binding;
- `evidence-scope-violation` — project/repository/cursor/proof scopes do not bind.

A blocked Fresh Evidence Window never authorizes Continuity Assessment.

## 3. Why the frozen Source Snapshot is necessary but insufficient

The accepted Phase-4 GitHub Source Snapshot remains authoritative for:

- exact repository scope;
- current repository state;
- default branch identity;
- observed default-branch head SHA;
- bounded collection diagnostics;
- source-local authority and safe references.

It must remain frozen.

However, its commit collection is not an ancestry proof. The accepted adapter normalizes commit records and orders them by `committedAt`; commit parent relationships and provider list positions are not retained.

Therefore Phase 6 must not infer the exact cursor→head commit interval from Snapshot timestamps or record position.

Forbidden shortcuts:

- `committedAt > checkpoint.capturedAt` ⇒ fresh;
- record appears before cursor after timestamp sort ⇒ descendant of cursor;
- cursor appears in bounded Snapshot ⇒ exact interval can always be reconstructed;
- absence of cursor in a truncated Snapshot ⇒ no changes / invalid cursor.

## 4. Bounded GitHub Commit Range Proof

Phase 6C may add one new provider-specific read boundary without modifying Phase 4:

```js
readCommitRange({
  repositoryRef,
  baseSha,
  headSha,
  capturedAt,
  limit
})
```

The reader must use an injected read-only client. It does not own OAuth, token storage or concrete transport.

The accepted proof shape is conceptually:

```js
{
  proofVersion: "nexus-atlas.github-commit-range-proof.v0.1",
  proofId,
  provider: "github",
  repositoryRef,
  baseSha,
  headSha,
  capturedAt,
  relation, // identical | ahead | behind | diverged
  aheadBy,
  behindBy,
  commits,
  complete,
  diagnostics: {
    requestedLimit,
    itemsRead,
    continuationAvailable
  }
}
```

### Proof rules

1. Repository scope is explicit and normalized.
2. Base/head SHAs are exact 40-character lowercase commit identities.
3. Proof identity is deterministic over accepted normalized proof content.
4. `identical` requires `aheadBy = 0`, `behindBy = 0`, zero commits and no continuation.
5. `ahead` requires `aheadBy > 0`, `behindBy = 0`.
6. `behind` requires `aheadBy = 0`, `behindBy > 0` and no head-side commit list.
7. `diverged` requires both `aheadBy > 0` and `behindBy > 0`.
8. Head-side commits preserve compare ancestry order; timestamp sorting must not replace ancestry order.
9. A complete `ahead` / `diverged` proof contains all `aheadBy` head-side commits and terminates at `headSha`.
10. If the bounded limit cannot contain the full head-side range, `complete = false` and `continuationAvailable = true`.
11. Commit records expose only safe identity, time, headline, reference and source-local authority.
12. Proofs never imply human/canonical authority.

## 5. Fresh Evidence Window input

Conceptual builder:

```js
buildFreshEvidenceWindowV01({
  checkpoint,
  sourceSnapshot,
  commitRangeProof,
  requiredEvidencePolicy
})
```

`commitRangeProof` may be omitted only when the accepted Snapshot default-branch head equals the checkpoint cursor SHA.

The initial policy is intentionally narrow:

```js
{
  policyVersion: "nexus-atlas.github-default-branch.v1",
  projectRef: "project:nexus-atlas",
  repositoryRef: "cyrilla-mist/nexus-ai",
  maxCommitRange: 20
}
```

This policy is an explicit project/source allowlist. It is not a generalized GitHub policy language.

## 6. Cursor rules

The first accepted cursor is:

```js
{
  provider: "github",
  scopeRef: "cyrilla-mist/nexus-ai",
  cursorType: "default-branch-head",
  value: "<40-char SHA>",
  capturedAt: "<strict offset ISO timestamp>"
}
```

Required bindings:

- checkpoint `projectRef` equals policy `projectRef`;
- cursor provider is `github`;
- cursor scope equals policy repository;
- Snapshot repository equals policy repository;
- Snapshot default branch is the current observed branch authority;
- Snapshot capture time is later than cursor capture time for a genuinely fresh attempt.

Unsupported cursor languages fail contract validation rather than being guessed.

## 7. Window result

Conceptual minimum:

```js
{
  windowVersion: "nexus-atlas.fresh-evidence-window.v0.1",
  windowId,
  projectRef,
  checkpointRef,
  observedAt,
  source,
  policy,
  status, // complete | blocked
  blockedReason,
  cursorFrom,
  cursorTo,
  lineage,
  records,
  diagnostics,
  capabilities
}
```

### `status: complete`

Only when the required interval semantics are proven.

Accepted complete cases:

- **identical:** current default-branch head equals checkpoint cursor; zero head changes are proven by branch-head equality;
- **ahead:** bounded compare proof establishes the full base→head range;
- **behind:** bounded proof establishes that current head moved behind the checkpoint cursor;
- **diverged:** bounded proof establishes lineage divergence and the complete current head-side range.

`behind` and `diverged` are complete evidence states, not continuity-validity conclusions. Downstream assessment decides their consequence.

### `status: blocked`

Required cases include:

- source/cursor/policy repository mismatch → `evidence-scope-violation`;
- Snapshot is not newer than the checkpoint cursor → `required-evidence-missing`;
- changed head but no bound range proof → `required-evidence-missing`;
- range proof base/head does not bind the requested cursor/head → `evidence-invalid`;
- range proof cannot fit the required head-side interval within the bounded read → `evidence-window-incomplete`.

Blocked windows must expose `assessmentAllowed: false`.

## 8. Evidence records

Fresh Evidence records are a bounded Phase-6 projection, not Canonical Graph records.

Every record must preserve:

- deterministic source identity;
- source type;
- source-local authority;
- safe source reference;
- observed time where available;
- only the safe facts required for the continuity transaction.

Initial record classes:

- current repository observation;
- current default-branch observation;
- complete head-side commit range from accepted range proof.

The window must not copy credentials, comments, reviews, author emails, raw bodies or unrelated private payloads.

## 9. No semantic promotion

Fresh Evidence Window does not:

- write the Canonical Graph;
- invoke Context Import Planner;
- invoke Canonical Admission;
- resolve Decision / Memory governance;
- infer user intent;
- determine continuity validity;
- create Human Authority decisions;
- create next actions;
- persist Trusted Checkpoints;
- perform GitHub writes.

Its only authority is whether the accepted evidence interval is sufficient and what source observations belong to that bounded window.

## 10. Determinism and immutability

For identical accepted inputs:

- proof identity is identical;
- window identity is identical;
- record order is identical;
- blocked/complete result is identical.

Inputs are never mutated and all accepted outputs are deeply immutable.

## 11. First runtime acceptance

Phase 6C Fresh Evidence Window is acceptable only when tests prove at minimum:

- frozen Snapshot validation is reused, not forked;
- Trusted Checkpoint validation is reused;
- project/repository/cursor scope binding;
- identical head requires no range proof;
- changed head requires bound range proof;
- exact ancestry order is not replaced by timestamp order;
- ahead complete range;
- behind relation;
- diverged relation;
- bounded range overflow → `evidence-window-incomplete`;
- absent proof → `required-evidence-missing`;
- proof mismatch → `evidence-invalid`;
- no semantic promotion / writes / source reread in the window builder;
- immutability and determinism;
- Phase 6B, Phase 5 and Phase 4 regressions stay green.

Continuity Assessment remains a separate later Phase 6C sub-slice after this window is accepted.
