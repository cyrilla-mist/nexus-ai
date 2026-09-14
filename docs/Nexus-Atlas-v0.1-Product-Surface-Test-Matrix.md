# Nexus Atlas Product Surface v0.1 — Test Matrix

**Status:** Phase 5B Contract Matrix — Complete / Accepted  
**Contract:** `docs/Nexus-Atlas-v0.1-Product-Surface-Contract.md`  
**Runtime:** Not started; executable implementation begins in Phase 5C

This matrix defines the blocking acceptance behavior for the future Product Surface projector and first Nexus Self-Context Desk integration.

## A. Contract and Scope — 5 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-A01 | Accepted self-context input builds v0.1 shape | All required top-level sections exist; `version` is exact |
| PS-A02 | Missing selected project | `PROJECT_SCOPE_NOT_FOUND`; no partial surface |
| PS-A03 | Unknown surface version | `UNSUPPORTED_PRODUCT_SURFACE_VERSION` |
| PS-A04 | Territory selection | Territory changes view scope only; canonical meaning unchanged |
| PS-A05 | No fake multi-project library | Only actually available selected project is represented |

## B. State and Classification — 6 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-B01 | Lifecycle/verification/freshness | Three independent fields retained |
| PS-B02 | Confirmed but stale record | Remains confirmed + stale; not collapsed into one status |
| PS-B03 | Inferred Identity | Remains inferred; never presented as confirmed |
| PS-B04 | Effective vs proposed Decision | Sections remain separate |
| PS-B05 | Disputed Memory | Remains in disputed classification |
| PS-B06 | Historical Decision/Memory | Never silently returns to current/effective section |

## C. Evidence and Phase 4 Boundary — 5 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-C01 | Current Evidence | Appears only in `evidence.current` |
| PS-C02 | Stale Evidence | Appears only in stale/history-capable projection, not current support |
| PS-C03 | Disputed Evidence | Explicit disputed classification retained |
| PS-C04 | GitHub-admitted observation | Remains canonical kind `evidence` |
| PS-C05 | Semantic promotion attempt | Product Surface rejects/does not create Identity, Decision, Memory or Action from provider observation |

## D. Provenance, Governance and Privacy — 6 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-D01 | Safe provenance | Provider/reference/capturedAt/retrievalMode/authority retained |
| PS-D02 | Restricted record | Excluded by default |
| PS-D03 | Explicit-only record without accepted selection | Excluded |
| PS-D04 | Credential/private-path sentinel | Absent from complete serialized surface |
| PS-D05 | Omitted upstream record | Cannot be reconstructed through relations or Inspector |
| PS-D06 | Unknown provider-native payload field | Not projected |

## E. Project, Risk and Action — 5 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-E01 | Project identity | Uses selected canonical Project title/id; no invention |
| PS-E02 | Missing optional project metadata | Null/absent semantic value remains unguessed |
| PS-E03 | Risk ownership missing upstream | Missing ownership remains explicit; UI does not invent owner |
| PS-E04 | Action requires confirmation | `requiresConfirmation` preserved |
| PS-E05 | Surfaced Action | Display does not imply executable authority or external mutation |

## F. Source Summary and Inspector — 4 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-F01 | Source counts | Derived only from accepted selected scope |
| PS-F02 | Source mode | Does not claim live connected account without transport |
| PS-F03 | Inspector index | Every descriptor resolves to exactly one surfaced record; IDs unique |
| PS-F04 | Inspector access | Reveals only already-projected safe state/provenance/governance; no provider re-read |

## G. Optional Source Intake Review — 5 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-G01 | Accepted Import Plan projection | Candidates appear as review items without canonical mutation |
| PS-G02 | Candidate canonical kind | GitHub mapping remains `evidence` |
| PS-G03 | Planner write flag | `canonicalWriteAllowed === false` preserved |
| PS-G04 | Explicit selection | Only explicitly selected Candidate IDs enter admission preview; ordering normalized by accepted admission contract |
| PS-G05 | Preview semantics | `resultMode === "in-memory-preview"`; no persistent-write claim, source re-read or OAuth behavior |

## H. Determinism, Immutability and Regression — 4 cases

| ID | Case | Expected |
| --- | --- | --- |
| PS-H01 | Same accepted input twice | Semantically identical deterministic Product Surface output |
| PS-H02 | Output mutation attempt | Built surface is deeply immutable |
| PS-H03 | Upstream mutation check | Graph, Ledger, generalized Context Package and source/admission artifacts unchanged |
| PS-H04 | Legacy vertical slice regression | Verity Re-entry/competition routes remain functional during Desk-only migration |

## Matrix Closure

Total: **40 blocking cases**.

Phase 5C Runtime acceptance must implement executable coverage for the applicable non-UI cases and add Desk integration tests for the first self-context slice. Phase 5D/5E may extend the catalog but must not weaken any v0.1 invariant.

Phase 5B is contract-only. No passing claim is made for these cases until the corresponding Runtime/tests exist.
