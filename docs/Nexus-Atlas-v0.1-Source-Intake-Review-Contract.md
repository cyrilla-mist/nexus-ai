# Nexus Atlas Source Intake Review Contract v0.1

**Status:** Phase 5E Contract Design — Complete / Implementation Not Started  
**Product boundary:** already-produced Source Snapshot / Context Import Plan → read-only Product Surface review

## 1. Purpose

Source Intake Review is a provider-neutral Product Surface projection for reviewing Candidate Evidence produced by the accepted Phase 4 Snapshot and Import Plan contracts. It is not a source client, connector setup flow, canonical store, authorization token or semantic promotion mechanism.

The input is an already-produced, validated Snapshot/Import Plan pair. Phase 5E does not fetch, refresh, re-plan, mutate, persist or re-resolve upstream artifacts.

## 2. Top-level shape

```js
{
  version: "nexus-atlas.source-intake-review.v0.1",
  reviewId,
  source: {
    provider,
    scopeRef,
    state,
    capturedAt,
    retrievalMode,
    authority,
    recordCount,
    diagnostics
  },
  candidates: [CandidateEvidence],
  selection: {
    selectedCandidateIds,
    selectionMode: "explicit-only",
    deferredCandidateIds
  },
  admissionPreview: AdmissionPreview,
  capabilities: {
    liveRead: false,
    sourceReread: false,
    persistentWrite: false,
    canonicalGraphMutation: false,
    edgeCreation: false,
    semanticPromotion: false
  }
}
```

`reviewId` is an input-bound deterministic identifier or accepted upstream plan reference. It is not a user/account identity and must not be generated from secrets, local paths or unbounded source state.

## 3. Source metadata

`source` contains only safe metadata projected from the accepted Snapshot/Import Plan:

- `provider`: provider-neutral source label;
- `scopeRef`: normalized, bounded source scope reference;
- `state`: accepted source state such as `available`, `empty` or `unavailable`;
- `capturedAt`: the accepted observation time, not a new UI time;
- `retrievalMode`: read mode already present upstream;
- `authority`: source-local authority class, never human or canonical authority;
- `recordCount`: count of accepted Snapshot records represented by the plan;
- `diagnostics`: bounded counters only; no raw errors, response bodies or credentials.

No field may imply that the source is currently live, connected, refreshed or authoritative for personal truth.

## 4. Candidate Evidence

Each `CandidateEvidence` is an immutable projection of exactly one accepted Import Plan candidate:

```js
{
  candidateId,
  sourceRecordId,
  canonicalKind: "evidence",
  title,
  summary,
  provenance: {
    provider,
    reference,
    capturedAt,
    retrievalMode,
    authority
  },
  admission: {
    stage: "candidate",
    canonicalWriteAllowed: false,
    confirmationRequirement: "source-authority-sufficient"
  },
  privacy: {
    sensitivity,
    payloadOmitted: true
  },
  selectionState: "unselected" | "selected" | "deferred"
}
```

Rules:

- `candidateId` and `sourceRecordId` are preserved exactly from the accepted plan.
- `canonicalKind` is fixed to `evidence` for the Phase 4 GitHub mapping; no other canonical kind is inferred.
- `title`, `summary` and `provenance` are copied from the accepted Candidate only. The surface must not reconstruct raw Snapshot payloads.
- `canonicalWriteAllowed` is always `false`; the UI cannot elevate it.
- `selectionState` is review state, not canonical lifecycle, authorization or confirmation.
- Candidate Evidence remains source observation, not Identity, Decision, Memory, Action, Risk or Project truth.

## 5. Selection and deferred state

Selection is explicit-only:

- `selectedCandidateIds` must be supplied by the review flow as unique existing Candidate IDs;
- omitted selection means an empty selection, never “select all”;
- selection order has no semantic meaning and is normalized to accepted Import Plan Candidate order;
- only selected IDs enter `admissionPreview`; every other candidate remains `deferred` with reason `not-authorized`;
- deselection does not reject, delete, revoke or mutate the Candidate;
- selection does not itself authorize a persistent write or canonical mutation.

## 6. Local Admission Preview

```js
{
  selectedCandidateIds,
  proposals,
  decisions: [
    {
      candidateId,
      disposition,
      reason
    }
  ],
  deferredCandidateIds,
  diagnostics: {
    candidateCount,
    authorizedCount,
    deferredCount,
    proposalCount,
    insertCount,
    noopCount,
    conflictCount,
    applyAllowed: false
  },
  resultMode: "in-memory-preview",
  reconciliation: "not-run" | "admission-plan",
  persistentWrite: false,
  graphMutation: false,
  edgeCreation: false,
  semanticPromotion: false
}
```

When no Context Graph is injected, the preview is explicitly `reconciliation: "not-run"`: `decisions` is empty, and it may display selected Candidate-derived Evidence proposal summaries without inventing `insert`, `noop` or `conflict` dispositions. Selection/deferred presentation remains separate: unselected Candidates are deferred with `not-authorized` in the review selection state, not Graph reconciliation.

When an optional validated Context Graph is injected, the projector reuses the accepted pure Canonical Admission builder and mechanically projects its per-Candidate `decisions` as exactly `{ candidateId, disposition, reason }`, including `deferred` / `not-authorized` decisions. Phase 5E must not calculate or normalize `insert`, `noop` or `conflict` itself, and it must not call Apply. In both modes it must not apply anything to a persistent or shared Graph, and `applyAllowed` is fixed to `false` at the Product Surface boundary even when the underlying pure in-memory admission plan has no conflict.

No preview proposal may create or modify an Edge, Project, Identity, Decision, Memory, Action or other canonical semantic record. A later write flow, if ever proposed, requires a separate accepted contract and explicit authorization boundary.

## 7. Provenance, authority and privacy

- Preserve source provider, bounded reference, capture time, retrieval mode and source-local authority independently from selection state.
- Display source-local authority as authority over the observed source state only; never label it user-confirmed, human-confirmed or canonical.
- Preserve sensitivity and omission. The current accepted Phase 4 Snapshot / Import Plan does not supply a sensitivity classification, so `privacy.sensitivity === null` means **upstream sensitivity classification unavailable / not supplied**. It does not mean public, non-sensitive, safe or user-approved. Restricted/private payloads, credentials, tokens, local paths, issue/PR bodies, comments and reviews are not review fields.
- A missing or omitted field remains missing; the surface must not infer source facts or personal meaning.
- Safe references must follow the existing Product Surface privacy sanitizer and must not contain query fragments, credentials or local filesystem paths.

## 8. Read-only and compatibility boundary

Phase 5E introduces no:

- live GitHub OAuth or account connection;
- repository/account scanning;
- source re-read or polling;
- persistent write, POST or external mutation;
- canonical Graph mutation or Edge creation;
- semantic promotion;
- change to Source Snapshot, Import Plan or Canonical Admission runtime contracts;
- change to the accepted Phase 5C browser snapshot or Phase 5D Inspector/Identity semantics.

## 9. Determinism and error boundary

Identical accepted Snapshot/Import Plan inputs and identical explicit selections produce semantically identical, deeply immutable review output. Invalid input, unknown Candidate IDs, duplicate IDs, kind mismatches, provenance mismatches or privacy violations are local review-input failures. They must not trigger a source fallback, mutate upstream artifacts or partially apply a preview.

## 10. Acceptance criteria

Phase 5E contract design is complete when the blocking matrix proves:

- exact Snapshot/Import Plan handoff;
- provider-neutral metadata and Candidate Evidence projection;
- explicit-only selection and deferred/unselected state;
- provenance, authority and privacy preservation;
- local preview-only behavior with `canonicalWriteAllowed === false` and `applyAllowed === false`;
- no source re-read, persistence, Edge creation or semantic promotion;
- Phase 4B–4F and Phase 5C–5D boundaries remain unchanged.
