# Nexus Atlas Product Surface Contract v0.1

**Status:** Phase 5B Contract Design — Complete / Accepted  
**Phase 5A baseline:** `0d615ab6cf6b13156bc8ff635f9314252ef63e0a`  
**Product shell:** `atlas.html`  
**First target slice:** Nexus Self-Context Desk

## 1. Purpose

The Product Surface Model is the provider-neutral, read-only boundary between canonical/generalized Context outputs and Nexus Atlas product views.

It exists so Atlas Desk, Context Inspector, Identity Context and later Territory surfaces do not consume Verity Continuity Scenario fields, GitHub-native records, raw canonical Graph internals, or provider-specific transport objects directly.

```text
Canonical Context Graph / Generalized Context Package
                ↓
      Product Surface Projector
                ↓
      Product Surface Model v0.1
                ↓
Desk / Inspector / Identity / later Territory views
```

The Product Surface Model is a projection. It is not canonical truth, not a persistence format, not an authorization token and not a mutation command.

## 2. Design Principles

1. **Provider-neutral** — no GitHub-, DataHub- or Verity-specific required fields.
2. **Read-only by default** — surfacing a record never grants write authority.
3. **State is explicit** — lifecycle, verification and freshness stay separate.
4. **Provenance is visible** — important surfaced records retain a safe source summary.
5. **Governance is preserved** — sensitivity, inheritance and confirmation requirements are not erased for display convenience.
6. **Deterministic** — identical accepted input produces byte-equivalent semantic output after canonical serialization.
7. **Privacy-minimal** — only fields required for the product surface are projected.
8. **Presentation-independent** — the contract carries semantic data, not CSS classes, DOM IDs or visual coordinates.

## 3. Top-level Shape

```js
{
  version: "nexus-atlas.product-surface.v0.1",
  generatedAt,
  scope,
  project,
  identity,
  decisions,
  memories,
  evidence,
  risks,
  actions,
  sourceSummary,
  inspectorIndex,
  sourceIntakeReview
}
```

`sourceIntakeReview` is optional. Every other top-level field is required, even when represented by an empty array.

## 4. Scope

```js
{
  projectId,
  territoryId,
  view
}
```

Rules:

- `projectId` is required and must resolve to exactly one selected canonical Project.
- `territoryId` is optional. A Territory remains a view, not a separate data owner.
- `view` is one of `desk`, `inspector`, `identity`, `source-intake`.
- changing `territoryId` or `view` must not silently change canonical record meaning.

Phase 5B does not define a persistent multi-project library. A future project selector may choose among real available projects, but v0.1 does not fabricate unavailable projects.

## 5. Surface Record

Shared record projection:

```js
{
  id,
  kind,
  title,
  summary,
  state: {
    lifecycle,
    verification,
    freshness
  },
  provenance: {
    provider,
    reference,
    capturedAt,
    retrievalMode,
    authority
  },
  governance: {
    sensitivity,
    inheritance,
    requiresConfirmation
  },
  relatedIds
}
```

### Required invariants

- `id` preserves the stable canonical/source-derived record identity appropriate to the accepted upstream contract.
- `kind` is canonical semantic kind, never a component name.
- `state.lifecycle`, `state.verification` and `state.freshness` are distinct fields.
- missing provenance must be represented as an explicit omission upstream; the Product Surface projector must not invent provider/reference values.
- `relatedIds` contains only identifiers already present in the accepted selected scope or explicitly represented as omitted/unavailable by the upstream package contract.
- the surface record must not contain raw tokens, credentials, private local paths or arbitrary provider payloads.

## 6. Project Summary

```js
{
  id,
  title,
  summary,
  currentPhase,
  currentVersion,
  currentMilestone,
  lastActiveAt,
  territoryIds,
  repositoryRefs,
  state,
  provenance
}
```

Rules:

- project identity comes from the selected canonical Project; the UI must not invent a project title.
- repository references are bounded references already allowed by upstream governance; query strings, fragments, credentials and local paths are prohibited.
- `currentPhase`, `currentVersion`, `currentMilestone` may be `null` when not available; absence must not be converted into guessed text.

## 7. Identity Surface

`identity` is an array of Surface Records whose canonical kind is `identity`.

The record summary may represent one of the canonical identity categories:

- role;
- direction;
- capability;
- preference;
- constraint.

Rules:

- inferred Identity remains `verification: "inferred"`.
- inferred Identity must not be styled or labeled as user-confirmed truth by the presentation adapter.
- `restricted` Identity is excluded from Product Surface v0.1 by default.
- `explicit_only` Identity may surface only when the accepted upstream selection explicitly permits it.
- one observation or provider record must never be promoted into Identity by the Product Surface projector.

## 8. Decision Surface

```js
{
  effective: SurfaceRecord[],
  proposed: SurfaceRecord[],
  historical: SurfaceRecord[]
}
```

Rules:

- `effective` is derived from accepted Decision governance/ledger output, not timestamp recency alone.
- proposed Decisions remain separate from effective Decisions.
- superseded/revoked Decisions may appear only in `historical` when allowed by the accepted package.
- Product Surface must not resolve Decision conflicts itself.

## 9. Memory Surface

```js
{
  confirmed: SurfaceRecord[],
  inferred: SurfaceRecord[],
  disputed: SurfaceRecord[],
  historical: SurfaceRecord[]
}
```

Rules:

- classification comes from accepted Decision/Memory resolution and generalized package semantics.
- inferred and disputed Memories remain visibly classified.
- historical Memory is not silently reintroduced as current context.
- the Product Surface projector does not create Memory from UI activity.

## 10. Evidence Surface

```js
{
  current: SurfaceRecord[],
  stale: SurfaceRecord[],
  disputed: SurfaceRecord[]
}
```

Rules:

- stale Evidence remains available for history/inspection when allowed but must not be displayed as current support.
- freshness and verification remain independent.
- provider observations admitted through Phase 4 remain Evidence only unless a separate accepted semantic promotion contract exists.

## 11. Risks

`risks` is an array of Surface Records with canonical kind `risk`.

Rules:

- risk title/summary must come from accepted canonical/package data.
- presentation may prioritize but must not increase severity or invent ownership.
- missing ownership remains explicit when present upstream.

## 12. Actions

`actions` is an array of Surface Records with canonical kind `action` plus the optional semantic projection:

```js
{
  actionStatus,
  owner,
  priority,
  completionCriteria,
  externalEffect,
  requiresConfirmation
}
```

Rules:

- `requiresConfirmation` must remain visible for consequential actions.
- a surfaced Action is not executable merely because it is displayed.
- Phase 5B defines no autonomous external mutation path.

## 13. Source Summary

```js
[
  {
    provider,
    recordCount,
    currentCount,
    staleCount,
    disputedCount,
    latestCapturedAt,
    mode
  }
]
```

Rules:

- source summary is informational and read-only.
- `mode` may describe accepted retrieval mode such as fixture/local/read-only, but must not imply a live connected account when no transport exists.
- no secret/token/auth status may be exposed.
- counts are derived from records present in the accepted projection scope, not from unbounded provider account state.

## 14. Inspector Index

`inspectorIndex` is a deterministic array of inspectable record descriptors:

```js
{
  id,
  kind,
  section,
  title
}
```

Rules:

- every descriptor resolves to exactly one record already present in the Product Surface Model.
- Inspector may reveal the record state/provenance/governance already present in the model; it must not fetch arbitrary provider-private payloads.
- duplicate IDs are invalid.
- ordering is deterministic.

## 15. Optional Source Intake Review

Phase 5E may populate:

```js
{
  sourcePlanId,
  source: {
    provider,
    scopeRef,
    capturedAt
  },
  candidates: [
    {
      candidateId,
      sourceRecordId,
      title,
      summary,
      provenance,
      canonicalKind,
      canonicalWriteAllowed,
      selectionState
    }
  ],
  admissionPreview: {
    selectedCandidateIds,
    proposalCount,
    deferredCount,
    resultMode
  }
}
```

Hard rules:

- `canonicalKind` is `evidence` for the accepted Phase 4 GitHub mapping.
- `canonicalWriteAllowed` remains `false` at the Planner boundary.
- `selectionState` is presentation state only (`selected` or `unselected`).
- `selectedCandidateIds` must be explicitly supplied by the user/review flow and normalized according to the accepted Canonical Admission contract.
- `resultMode` for Phase 5E is `in-memory-preview`.
- the UI must not claim that review performs a persistent write.
- no OAuth, repository scanning, source re-read or semantic promotion is introduced by this projection.

## 16. Ordering Rules

Unless a section has a stronger accepted upstream ordering rule:

1. preserve accepted upstream deterministic order when semantically meaningful;
2. otherwise order by stable `id` ascending;
3. never use browser locale collation as the sole canonical order;
4. the presentation adapter may visually group records but must not mutate the semantic Product Surface Model.

## 17. Immutability

A built Product Surface Model must be deeply immutable for the duration of a render/inspection transaction.

The projector must not mutate:

- canonical Context Graph;
- Decision/Memory Ledger;
- generalized Context Package;
- Source Snapshot;
- Context Import Plan;
- Canonical Admission Plan.

## 18. Privacy and Omission Rules

The Product Surface projector must exclude:

- credentials, tokens and authentication headers;
- private local filesystem paths;
- unknown provider-native fields not explicitly accepted upstream;
- source bodies/comments/raw payloads excluded by Source Adapter contracts;
- `restricted` records by default;
- any record omitted by accepted Context Package governance.

It must not reconstruct omitted content from related records.

## 19. Error Boundary

Product Surface projection errors are local projection errors. They must not be converted into canonical Graph changes.

Minimum error classes for future Runtime:

- `INVALID_PRODUCT_SURFACE_INPUT`
- `PROJECT_SCOPE_NOT_FOUND`
- `DUPLICATE_SURFACE_RECORD_ID`
- `INVALID_SURFACE_STATE`
- `PRIVACY_BOUNDARY_VIOLATION`
- `UNSUPPORTED_PRODUCT_SURFACE_VERSION`

Phase 5B defines the vocabulary; Runtime implementation begins in Phase 5C.

## 20. Explicit Non-goals

Product Surface v0.1 does not provide:

- DOM rendering;
- CSS/layout coordinates;
- live GitHub OAuth/transport;
- account or repository discovery;
- persistent Context Graph writes;
- source polling;
- automatic Identity/Decision/Memory promotion;
- multi-user permissions;
- cross-device project storage;
- autonomous external actions;
- a fake multi-project selector.

## 21. Phase 5C Handoff

Phase 5C may implement a deterministic projector/adapter from the accepted Self-Context Provider v0.3/generalized Context Package into Product Surface v0.1 and render **Nexus Self-Context Desk** through the existing `atlas.html` shell.

Phase 5C must initially change the Desk route only. Existing Verity Re-entry and competition-specific routes must remain available while migration is incremental.

## 22. Phase 5B Acceptance Criteria

Contract Design is accepted when:

- the model is provider-neutral;
- all user-facing semantic sections have explicit shapes;
- lifecycle, verification and freshness remain distinct;
- provenance/governance survive projection;
- Decision/Memory classification is not re-resolved in UI;
- Phase 4 provider observations remain Evidence-only;
- source review is explicitly non-persistent;
- restricted/omitted content cannot leak back into product surfaces;
- no DOM, visual coordinate, transport or persistence dependency is required;
- Nexus Self-Context Desk can be built from this contract without consuming Verity Scenario fields.
