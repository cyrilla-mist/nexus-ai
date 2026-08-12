# Nexus Atlas Phase 5E — Source Intake Review Test Matrix v0.1

**Status:** Blocking contract-design acceptance matrix  
**Target:** Provider-neutral Source Intake Review Product Surface

All cases are blocking for a future Phase 5E implementation. This matrix defines behavior before browser UI work begins.

## A. Input handoff and source metadata — 7 cases

| ID | Case | Expected |
|---|---|---|
| 5E-A01 | accepted Snapshot + Import Plan | review binds to the already-produced pair without source access |
| 5E-A02 | Snapshot source metadata | provider, scope, state, capture time, retrieval mode and authority remain visible |
| 5E-A03 | bounded diagnostics | only accepted counters appear; raw errors and response bodies are absent |
| 5E-A04 | Snapshot/Plan source mismatch | local validation failure; no fallback or re-read |
| 5E-A05 | unsupported provider-native shape | rejected at the provider-neutral boundary |
| 5E-A06 | missing optional source field | explicit omission remains omission; no inferred value |
| 5E-A07 | repeated identical input | deterministic semantic output |

## B. Candidate Evidence projection — 7 cases

| ID | Case | Expected |
|---|---|---|
| 5E-B01 | one accepted Candidate | exactly one Evidence review item with preserved IDs |
| 5E-B02 | Candidate kind | `canonicalKind === "evidence"`; no semantic kind inference |
| 5E-B03 | Candidate admission state | stage is `candidate`, `canonicalWriteAllowed === false`, confirmation requirement preserved |
| 5E-B04 | Candidate provenance | provider/reference/capturedAt/retrievalMode/authority preserved independently |
| 5E-B05 | Candidate payload | only accepted title/summary projection; raw payload/body/comments/reviews absent |
| 5E-B06 | Candidate ordering | accepted Import Plan order is preserved semantically |
| 5E-B07 | duplicate or missing Candidate identity | local validation failure; no partial review output |

## C. Explicit selection and deferred state — 6 cases

| ID | Case | Expected |
|---|---|---|
| 5E-C01 | empty selection | no candidates selected; all candidates deferred |
| 5E-C02 | explicit subset | only supplied existing IDs are selected |
| 5E-C03 | omitted selection | treated as empty, never select-all |
| 5E-C04 | duplicate selection ID | rejected without mutation |
| 5E-C05 | unknown selection ID | rejected without source fallback |
| 5E-C06 | deselection | candidate returns to deferred/unselected presentation state; no rejection or deletion |

## D. Provenance, authority and privacy — 6 cases

| ID | Case | Expected |
|---|---|---|
| 5E-D01 | source-local authority | shown as source authority only, never human/canonical authority |
| 5E-D02 | freshness/time | accepted capture time remains independent from selection and preview state |
| 5E-D03 | safe reference | query fragments, credentials and local filesystem paths are omitted/rejected |
| 5E-D04 | sensitivity | sensitivity is preserved; no new permission model is created |
| 5E-D05 | restricted/private payload | omitted upstream and not reconstructed downstream |
| 5E-D06 | provenance tamper | mismatch fails locally and does not trigger source access |

## E. Local Admission Preview — 7 cases

| ID | Case | Expected |
|---|---|---|
| 5E-E01 | selected Candidates | deterministic Candidate-derived Evidence proposals only |
| 5E-E02 | unselected Candidates | deferred with `not-authorized`; no proposal |
| 5E-E03 | preview mode | `resultMode === "in-memory-preview"` |
| 5E-E04 | write boundary | `canonicalWriteAllowed === false`, `persistentWrite === false`, `applyAllowed === false` |
| 5E-E05 | graph boundary | no persistent Graph mutation and no Edge creation |
| 5E-E06 | conflict/noop disposition | displayed as preview state only; no overwrite, merge or apply |
| 5E-E07 | semantic boundary | no promotion into Identity, Decision, Memory, Action, Risk or Project truth |

## F. Read-only, determinism and compatibility — 7 cases

| ID | Case | Expected |
|---|---|---|
| 5E-F01 | review construction | no fetch, OAuth, source adapter or account scan |
| 5E-F02 | review navigation | no source re-read, refresh or polling |
| 5E-F03 | output mutation attempt | review output is deeply immutable |
| 5E-F04 | upstream mutation check | Snapshot, Import Plan and Admission inputs remain unchanged |
| 5E-F05 | invalid review input | bounded local error; no partial mutation or fallback |
| 5E-F06 | Phase 4 regression | Snapshot, Import Plan, Admission and Phase 4F gates remain green |
| 5E-F07 | Phase 5 compatibility | Phase 5C Desk and Phase 5D Inspector/Identity remain unchanged |

## Matrix closure

**Total cases:** 40  
**Blocking:** Yes  
**Browser UI implementation:** Not authorized by this matrix alone; implementation begins only after contract/matrix review and a separate accepted slice.

