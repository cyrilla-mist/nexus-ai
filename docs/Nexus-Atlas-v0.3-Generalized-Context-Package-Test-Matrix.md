# Nexus Atlas — Generalized Context Package v0.3 Test Matrix

**Status:** Proposed  
**Target:** Phase 3B  
**Total Cases:** 32

Each case records Case ID, Category, Input State, Expected Package Sections, Expected Omissions, Expected Source Summary, Expected Error, Legacy Mapping, and Rationale. This matrix is a contract catalog for Phase 3B, not runtime evidence.

## Schema cases (8)

| ID | Input state | Expected |
|---|---|---|
| CP-S01 | Minimum valid Graph, Ledger, projectId, scopeKey, generatedAt | v0.3 package; no error |
| CP-S02 | Invalid package version | v0.3 is the only canonical package version |
| CP-S03 | Missing or invalid generatedAt | `INVALID_GENERATED_AT` |
| CP-S04 | Missing projectId | `INVALID_PROJECT_ID` |
| CP-S05 | Missing scopeKey | `INVALID_SCOPE_KEY` |
| CP-S06 | Ledger version is not 0.2 | `LEDGER_VERSION_MISMATCH` |
| CP-S07 | Ledger generatedAt differs | `LEDGER_GENERATED_AT_MISMATCH` |
| CP-S08 | Ledger projectId differs | `LEDGER_PROJECT_MISMATCH` |

## Scope cases (8)

| ID | Input state | Expected |
|---|---|---|
| CP-P01 | One project explicitly selected | Selected project is projected |
| CP-P02 | Multiple projects, one explicit selection | Only selected project enters package |
| CP-P03 | Unknown projectId | `PROJECT_NOT_FOUND` |
| CP-P04 | ID points to non-project | `PROJECT_KIND_MISMATCH` |
| CP-P05 | Inactive, disputed, stale, or restricted project | `PROJECT_NOT_ELIGIBLE` |
| CP-P06 | Records from another project | Excluded, not omissions |
| CP-P07 | Ledger section scope differs | `LEDGER_SCOPE_MISMATCH` |
| CP-P08 | Same projectId and generatedAt | Stable deterministic packageId |

## Governance cases (10)

| ID | Input state | Expected |
|---|---|---|
| CP-G01 | Ledger effective Decision IDs | Only Ledger effective IDs in `decisions.effective` |
| CP-G02 | Proposed/inferred Decisions | `decisions.proposed`, preserving inferred verification |
| CP-G03 | Historical Decision | `decisions.chains` IDs only |
| CP-G04 | Branching, authority, or Memory conflict | Top-level `conflicts.unresolved` |
| CP-G05 | Four Ledger Memory classifications | Matching four `memories` sections |
| CP-G06 | Evidence lifecycle/epistemic states | Four evidence sections |
| CP-G07 | Generic disputed/historical records | Matching `records` sections |
| CP-G08 | Restricted record | Safe omission without payload/provenance leakage |
| CP-G09 | Repeated record/declaration omissions | Normalized, de-duplicated, first-wins order |
| CP-G10 | Same record assigned to multiple exclusive sections | `PACKAGE_SECTION_DUPLICATE` |

## Compatibility and determinism cases (6)

| ID | Input state | Expected |
|---|---|---|
| CP-C01 | Identical inputs twice | Deep-equal output |
| CP-C02 | Returned package | Package and nested structures deeply frozen |
| CP-C03 | Build invocation | Graph and Ledger unchanged |
| CP-C04 | Shuffled Graph/Ledger arrays | Same output |
| CP-C05 | Source summary totals | Providers, byKind, and total agree |
| CP-C06 | Adapt v0.3 to v0.2 | Legacy sections preserved; historical Decision excluded from staleContext |

Total: 8 + 8 + 10 + 6 = 32. No case claims that the Builder has already been implemented or executed.
