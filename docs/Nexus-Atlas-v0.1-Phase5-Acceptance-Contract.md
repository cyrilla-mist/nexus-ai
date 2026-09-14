# Nexus Atlas Phase 5 Acceptance Contract v0.1

**Status:** Phase 5F Contract Design — Binding / Implementation Not Started  
**Purpose:** final cross-layer acceptance and product-boundary hardening for Phase 5A–5E  
**Re-entry audit:** `docs/Nexus-Atlas-Phase5F-Re-entry-Audit.md`

## 1. Purpose

Phase 5F closes the Phase 5 Product Surface. It does not introduce a new Product Surface schema, new source capability, new semantic resolver or new runtime loop.

The acceptance question is:

> Do the already-accepted Phase 5A–5E surfaces remain a truthful, deterministic and read-only projection of accepted Nexus context and source-review semantics without reopening frozen Phase 4 authority, transport or persistence boundaries?

Phase 5F is therefore an **acceptance phase, not a feature phase**.

## 2. Accepted baseline

Phase 5F begins from the validated re-entry state recorded on 2026-09-14.

Binding baseline:

- Phase 4 merged `main`: `79d66207bbd5818010eae0695e9923e174f5b47a`;
- Phase 5D accepted/frozen closure: `17289a65735f3a2314c94919cdde8ab21f3d5146`;
- Phase 5E projector/validator Runtime frozen: `87abd8cf878cd4086c7257b29170579e02f4c0b1`;
- Phase 5E closure baseline: `f0e86622ea243068e12a703189a94d6a5060d211`;
- Phase 5F Re-entry Audit: `257b94865f28a3bf2ce8875f48d08002dda82cd6`;
- Draft PR #13 remains the Phase 5 integration PR against `main`.

No Phase 5F convenience change may silently redefine any accepted Phase 4 or Phase 5A–5E semantic contract.

## 3. Accepted product topology

Phase 5 contains two accepted downstream product paths.

### 3.1 Self-Context Product Surface path

```text
Canonical Context Graph
        ↓
Decision / Memory Resolver + Ledger
        ↓
Self-Context Provider
        ↓
Generalized Context Package v0.3
        ↓
Product Surface Projector v0.1
        ↓
Accepted Product Surface snapshot
        ↓
Atlas Desk
        ├─ Canonical Inspector
        └─ Identity Context
```

### 3.2 Source Intake Review path

```text
Accepted Source Snapshot
        ↓
Accepted Context Import Plan
        ↓
explicit review selection
        ↓
optional pure Canonical Admission preview
        ↓
Source Intake Review Projector v0.1
        ↓
Accepted Source Intake Review snapshot
        ↓
#source-intake browser surface
```

These paths share Product Surface truthfulness principles but do not collapse into one another. Source Candidate Evidence is not automatically promoted into Self-Context truth.

## 4. Authority invariants

Phase 5 acceptance requires all of the following authority relationships to remain true.

### 4.1 Canonical Graph

The Canonical Graph stores accepted canonical records. It does not become the storage location for derived effective Decision or inherited Memory results merely because those results are displayed downstream.

### 4.2 Decision / Memory governance

The accepted Resolver and Ledger remain the authority for effective/historical Decision and confirmed/inferred/disputed/historical Memory governance.

Neither Product Surface projector nor browser UI may independently recompute those semantics.

### 4.3 Product Surface projector

The Product Surface projector is mechanical projection. It may filter, group, normalize safe presentation structure and sanitize bounded provenance references, but it must not:

- create new user facts;
- promote inferred Identity to confirmed;
- re-resolve Decision or Memory governance;
- reinterpret stale/disputed/historical state as current;
- infer missing provenance or authority;
- mutate upstream input.

### 4.4 Inspector

`inspectorIndex` remains the sole accepted inspectability authority for the migrated Desk. Unknown or invalid targets fail closed and cannot trigger Graph/provider/source fallback.

### 4.5 Source Intake Review

Source Intake Review remains downstream of an already-produced Snapshot and Import Plan. Candidate identity is accepted upstream identity and remains opaque downstream.

Browser review selection is local review state. It is not canonical authorization, Apply permission, Graph mutation, rejection or deletion.

### 4.6 Canonical Admission preview

When an optional Graph is injected into the frozen Source Intake Review runtime, per-Candidate reconciliation decisions are copied from the accepted pure Canonical Admission builder.

The Product Surface boundary still fixes:

- `applyAllowed: false`;
- `persistentWrite: false`;
- `graphMutation: false`;
- `edgeCreation: false`;
- `semanticPromotion: false`.

No Phase 5 browser may call Apply.

## 5. State-truth invariants

Phase 5 acceptance requires state dimensions to remain independently truthful.

- `confirmed` does not imply current.
- `stale` does not imply false.
- `inferred` does not imply confirmed.
- `disputed` does not silently replace accepted current truth.
- `historical` does not become effective merely because it is inspectable.
- source-local authority does not become human or canonical authority.
- `privacy.sensitivity === null` in Source Intake Review means upstream classification unavailable / not supplied, never public or safe.
- a selected Candidate remains a selected source Evidence candidate, not a confirmed personal/project fact.

The browser must not simplify these distinctions into a single success/current/accepted status.

## 6. Provenance and privacy invariants

Accepted safe provenance must survive projection sufficiently to explain where a displayed record came from without leaking restricted payloads or transport credentials.

Phase 5 surfaces must not reconstruct or expose:

- credentials or tokens;
- credential-bearing URLs;
- query/fragment secrets;
- private local filesystem paths;
- restricted raw payloads;
- omitted issue/PR bodies, comments or reviews;
- personal facts inferred only from source metadata.

Omission is meaningful. Missing/restricted fields remain missing/restricted downstream.

## 7. Browser capability boundary

The accepted Phase 5 browser is a bounded Product Surface, not a live connector or persistence client.

Phase 5 browser code must not introduce or imply:

- live OAuth/account connection;
- arbitrary GitHub/DataHub/source transport;
- repository/account scanning;
- source polling/refresh;
- persistent POST/write APIs;
- canonical Graph mutation;
- Canonical Admission Apply;
- Edge creation;
- semantic promotion;
- autonomous external action execution;
- browser `localStorage` persistence for accepted/canonical state.

Ephemeral in-memory presentation/review state is allowed when it is visibly distinct from accepted system truth.

## 8. Route and compatibility boundary

The incremental migration boundary remains explicit:

- Desk is Product Surface driven;
- `#source-intake` is the bounded Source Intake Review Product Surface route;
- Map, Territory Workspace and Re-entry remain legacy routes during Phase 5 unless separately migrated and accepted;
- Phase 5F must not silently reinterpret legacy routes as newly accepted Product Surface implementations.

Existing legacy behavior must continue to load and remain outside the migrated authority boundary.

## 9. Accepted snapshot equivalence

Committed browser snapshots are acceptance artifacts, not independent hand-authored truth.

Phase 5F must prove:

1. the accepted Nexus Product Surface browser snapshot is mechanically deep-equal to current output of its accepted Node projection pipeline over the accepted Phase-5 fixture/provider path;
2. the accepted Source Intake Review browser snapshot is mechanically deep-equal to the frozen Source Intake Review projector output over its accepted upstream artifacts;
3. browser code reads only the accepted browser artifact for the corresponding migrated surface and does not re-run Node-only governance/source layers in the browser.

Snapshot drift is blocking until regenerated through the accepted upstream pipeline and reviewed as an explicit semantic change. Phase 5F itself should not create such semantic change.

## 10. Frozen-boundary policy

Phase 5F should normally change only acceptance documentation, tests, verification scripts, package verification wiring and final status bookkeeping.

The following are frozen unless a proven blocking defect is first documented:

- Phase 4B Source Snapshot runtime/contract;
- Phase 4C Source Adapter runtime semantics;
- Phase 4D Context Import Planner runtime/contract;
- Phase 4E Canonical Admission runtime/contract;
- Context Graph Validator;
- Decision / Memory Resolver and Ledger;
- Self-Context Provider semantics;
- Product Surface projector v0.1 semantics;
- Phase 5D Inspector / Identity semantics;
- Phase 5E Source Intake Review projector / validator semantics;
- accepted browser snapshots except through their accepted generation pipeline.

A test failure caused only by stale acceptance wording or a brittle source assertion may be fixed without reopening runtime semantics. Any actual runtime semantic change must be treated as an explicit re-opened blocker, not silently folded into Phase 5F.

## 11. Phase 5F acceptance artifact

Phase 5F implementation should add one dedicated executable acceptance entry point, preferably:

```text
npm run verify:phase5-v01
```

The verifier must execute real behavioral/cross-layer checks for the blocking matrix rather than merely grep documentation for expected phrases.

Static/source absence checks are permitted only where they directly prove a repository/product boundary such as absence of browser Apply, live source transport or persistence wiring.

The dedicated verifier must be included in the repository acceptance gate before Phase 5 is closed.

## 12. Clean-checkout regression gate

Phase 5 cannot be accepted from an unverified local working tree alone.

Required clean-checkout gates:

- dedicated Phase 5F / Phase 5 acceptance verifier: PASS;
- all dedicated accepted Phase 5C–5E suites: PASS;
- full Node suite: PASS;
- `npm run check`: PASS;
- Phase 4F dedicated acceptance: PASS;
- GitHub Actions on the exact accepted Phase 5F closure SHA: SUCCESS.

No regression may be waived merely because the changed files are documentation/tests.

## 13. Phase 5 closure and merge policy

Phase 5 may be marked **Complete / Accepted** only after the blocking matrix passes and frozen-boundary review finds no unauthorized semantic drift.

Closure sequence:

1. create the Phase 5F acceptance implementation and run all gates;
2. record an exact Phase 5 accepted/frozen closure SHA on `feature/phase5-product-surface`;
3. verify GitHub Actions success for that exact SHA;
4. update Roadmap / PR #13 to Phase 5 Complete / Accepted;
5. confirm PR #13 is mergeable and contains no unresolved acceptance blocker;
6. mark PR #13 ready only after acceptance is complete;
7. merge the accepted Phase 5 content to `main` without adding feature work during merge;
8. verify the resulting `main` content matches the accepted Phase 5 closure content, aside from merge topology/bookkeeping.

Phase 6 or any post-Phase-5 feature work must begin from the merged stable baseline, not be mixed into PR #13.

## 14. Explicit non-goals

Phase 5F does not implement:

- Outcome Write-back;
- trusted checkpoints;
- Validate-before-Recover runtime;
- a real Continuity Loop;
- new source adapters;
- persistent canonical writes;
- multi-project Atlas;
- new Territories;
- autonomous agent execution;
- broad UI redesign;
- new semantic inference.

Those are post-Phase-5 product-definition topics.

## 15. Acceptance decision rule

Phase 5F has only two valid outcomes:

### ACCEPT

All blocking cases pass, frozen boundaries hold, clean-checkout CI is green, and PR #13 is safe to close as the accepted Phase 5 Product Surface.

### BLOCK

Any authority, truthfulness, provenance, capability, snapshot-equivalence, regression or frozen-boundary invariant fails. The failure must be resolved explicitly before Phase 5 closure; it cannot be hidden by changing acceptance wording.

There is no partial acceptance state for Phase 5F.
