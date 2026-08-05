# Nexus Atlas — Generalized Context Package v0.3 Test Matrix

**Status:** Accepted
**Target:** Phase 3C
**Implementation:** Phase 3B automated suite accepted
**Total Cases:** 32

This is the machine-aligned Phase 3B contract matrix. Every case records the same nine fields: Case ID, Category, Input State, Expected Package Sections, Expected Omissions, Expected Source Summary, Expected Error, Legacy Mapping, and Rationale. `—` means not applicable. The matrix defines future behavior; it is not runtime evidence.

| Case ID | Category | Input State | Expected Package Sections | Expected Omissions | Expected Source Summary | Expected Error | Legacy Mapping | Rationale |
|---|---|---|---|---|---|---|---|---|
| CP-S01 | schema | Valid Graph, Ledger, and explicit inputs | v0.3 minimum package | — | — | — | — | Smallest successful projection |
| CP-S02 | schema | Adapter receives packageVersion other than 0.3 | — | — | — | INVALID_PACKAGE_VERSION | — | Adapter accepts only completed v0.3 packages |
| CP-S03 | schema | Missing or invalid generatedAt | — | — | — | INVALID_GENERATED_AT | — | Explicit valid time is required |
| CP-S04 | schema | Missing projectId | — | — | — | INVALID_PROJECT_ID | — | Project is never inferred |
| CP-S05 | schema | Missing scopeKey | — | — | — | INVALID_SCOPE_KEY | — | Ledger scope requires explicit input |
| CP-S06 | schema | Ledger version is not 0.2 | — | — | — | LEDGER_VERSION_MISMATCH | — | Consumes the accepted Phase 2 Ledger |
| CP-S07 | schema | Ledger timestamp differs | — | — | — | LEDGER_GENERATED_AT_MISMATCH | — | One projection moment is required |
| CP-S08 | schema | Ledger project differs | — | — | — | LEDGER_PROJECT_MISMATCH | — | Governance cannot cross projects |
| CP-P01 | scope | One eligible project selected explicitly | project:alpha | — | — | — | — | Selection remains explicit |
| CP-P02 | scope | project:alpha and project:beta; select alpha | project:alpha only | — | — | — | — | No multi-project aggregation |
| CP-P03 | scope | Unknown projectId | — | — | — | PROJECT_NOT_FOUND | — | No fallback project |
| CP-P04 | scope | ID points to evidence:alpha-current | — | — | — | PROJECT_KIND_MISMATCH | — | Only project nodes anchor packages |
| CP-P05 | scope | Inactive, disputed, stale, or restricted project | — | — | — | PROJECT_NOT_ELIGIBLE | — | Eligibility is governance-bound |
| CP-P06 | scope | project:beta records beside selected alpha | alpha records only | — | — | — | — | Other-project records are out of scope |
| CP-P07 | scope | Ledger section has another scopeKey | — | — | — | LEDGER_SCOPE_MISMATCH | — | All governed sections share scope |
| CP-P08 | scope | Same projectId and generatedAt | deterministic packageId | — | — | — | — | Package identity is stable |
| CP-G01 | governance | decision:alpha-effective is Ledger-effective | decisions.effective: decision:alpha-effective | — | — | — | confirmedDecisions | Ledger governs effective status |
| CP-G02 | governance | decision:alpha-proposed is proposed/inferred | decisions.proposed: decision:alpha-proposed | — | — | — | — | Inferred status stays inferred |
| CP-G03 | governance | decision:alpha-history is ordered history | decisions.chains: decision:alpha-history | — | — | — | — | Historical Decision is chain reference only |
| CP-G04 | governance | Branching or Memory conflict with conflict:alpha-branching and conflict:alpha-memory | conflicts.unresolved: conflict IDs; recordIds validated separately | — | — | — | — | Conflict IDs and record references are distinct |
| CP-G05 | governance | Four Memory classifications | all four memories sections | — | — | — | — | One destination per Ledger class |
| CP-G06 | governance | Four Evidence states | all four evidence sections | — | — | — | currentEvidence | Evidence uses canonical state dimensions |
| CP-G07 | governance | Disputed/historical generic records | records.disputed/historical | — | — | — | disputedContext/staleContext | Generic records stay exclusive |
| CP-G08 | governance | Restricted record | — | restricted | — | — | omittedContext | No restricted payload leakage |
| CP-G09 | governance | Declarations, sorted Ledger omissions, and sorted Builder omissions | — | restricted, explicit-declaration | — | — | omittedContext | Source precedence then first-wins normalization |
| CP-G10 | governance | One record classified twice | — | — | — | PACKAGE_SECTION_DUPLICATE | — | Full records are mutually exclusive |
| CP-C01 | compatibility | Same immutable inputs twice | identical v0.3 packages | — | — | — | — | Repeated build is deep-equal |
| CP-C02 | compatibility | Inspect package and nested structures | deeply frozen v0.3 package | — | — | — | — | Derived context is immutable |
| CP-C03 | compatibility | Snapshot Graph and Ledger before build | unchanged inputs | — | — | — | — | Projection is read-only |
| CP-C04 | compatibility | Shuffle Graph and Ledger arrays | order-independent package | — | — | — | — | Stable sorting removes incidental order |
| CP-C05 | compatibility | Count included canonical IDs | sourceSummary providers/byKind | — | totalIncludedRecords: 24 | — | — | Summary totals agree |
| CP-C06 | compatibility | Phase 3B passes completed v0.3 package to pure adapter | v0.2 legacy nested sections | — | totalIncludedNodes: 19 | — | Adapter output packageVersion 0.2, legacy packageId, down-projected source, recomputed summary; exclude proposed, history, inferred memories, conflicts | Pure adapter preserves compatibility without reusing v0.3 objects |

Total: 8 schema + 8 scope + 10 governance + 6 compatibility = 32.
