# Nexus Atlas v0.2 — Decision and Memory Test Matrix

**Status:** Proposed
**Target:** Phase 2B

Each case is a synthetic contract case. Expected sections are Ledger sections; `—` means empty or not applicable. No case authorizes automatic resolution of user content.

| Case ID | Category | Input State | Expected Effective Decisions | Expected Memory Section | Expected Conflicts | Expected Omissions | Expected Error | Rationale |
|---|---|---|---|---|---|---|---|---|
| DM-D01 | decision-resolution | One active confirmed current decision | current | — | — | — | — | A single eligible decision is effective. |
| DM-D02 | decision-resolution | Old confirmed current plus newer proposed decision | old | proposed: newer | — | — | — | Proposal is retained for review and cannot replace confirmed choice. |
| DM-D03 | decision-resolution | Confirmed old decision with legal confirmed supersedes edge to new decision | new | — | — | — | — | Explicit legal supersession selects the confirmed successor and preserves history. |
| DM-D04 | decision-resolution | Legal chain A → B → C | C | — | — | — | — | Terminal traversal is deterministic and stable. |
| DM-D05 | decision-resolution | Supersession cycle A → B → A | — | — | — | — | SUPERSESSION_CYCLE | Cycles are structural validation errors. |
| DM-D06 | decision-resolution | A has two active successors B and C | — | — | branching_supersession | — | — | No latest branch is chosen automatically. |
| DM-D07 | decision-resolution | Inferred AI decision attempts to replace confirmed human decision | human | inferred: ai | authority_conflict | — | — | Inference cannot override human confirmation. |
| DM-D08 | decision-resolution | Newer repository state differs from human product direction | human direction; repository state separate subject | — | authority_conflict only when same subject | — | — | External authority is limited to its own verifiable state; distinct subjects remain distinct. |
| DM-D09 | decision-resolution | Confirmed decision is stale with no current replacement | — | — | — | — | — | Stale confirmation is not current and yields no effective decision. |
| DM-D10 | decision-resolution | Terminal decision is revoked | — | — | — | — | — | Revocation does not restore an older decision; chain is no_effective_decision. |
| DM-D11 | decision-resolution | Payload supersededBy disagrees with active supersedes edge | — | — | — | — | DECISION_EDGE_MISMATCH | Canonical edge and redundant payload index must agree. |
| DM-D12 | decision-resolution | Two active confirmed current mutually exclusive decisions, no supersession | — | — | contradictory_confirmed_decisions | — | — | Contradictory confirmed content remains unresolved. |
| DM-M01 | memory-inheritance | Active confirmed current recorded memory, eligible scope | — | inherited: memory | — | — | — | Eligible confirmed current memory is inherited. |
| DM-M02 | memory-inheritance | Active inferred current memory | — | inferred: memory | — | — | — | Inference is retained with its label but is not inherited. |
| DM-M03 | memory-inheritance | Disputed memory with conflict references | — | disputed: memory | — | — | — | Disputed content is preserved for review, not inherited. |
| DM-M04 | memory-inheritance | Confirmed memory is stale | — | historical: memory | — | — | — | Stale content remains historical, not current default. |
| DM-M05 | memory-inheritance | Memory is actively superseded | — | historical: memory | — | — | — | Superseded value is historical and is not inherited. |
| DM-M06 | memory-inheritance | Restricted memory | — | — | — | restricted | — | Restricted content is omitted without leaking payload. |
| DM-M07 | memory-inheritance | Memory inheritance is never | — | — | — | inheritance-never | — | Governance prevents inheritance. |
| DM-M08 | memory-inheritance | explicit_only memory without caller consent | — | — | — | explicit-only-no-consent | — | Explicit-only content requires consent. |
| DM-M09 | memory-inheritance | explicit_only memory with caller consent | — | corresponding verification section | — | — | — | Consent permits the governed projection. |
| DM-M10 | memory-inheritance | project_only memory from another project scope | — | — | — | scope-mismatch | — | Project-only inheritance requires matching project scope. |
| DM-M11 | memory-inheritance | Two confirmed current memories linked by explicit contradicts | — | — | memory_statement_conflict | — | — | Neither contradictory memory is silently selected. |
| DM-M12 | memory-inheritance | Inferred memory conflicts with confirmed memory | — | inherited: confirmed; inferred: inferred | — | — | — | Confirmed memory inherits; inference cannot override it. |
| DM-L01 | ledger-determinism | Same graph and generatedAt supplied twice | same result | — | — | — | — | Deterministic output must be deeply equal. |
| DM-L02 | ledger-determinism | Ledger returned to caller | same result | — | — | — | — | Output is deeply frozen. |
| DM-L03 | ledger-determinism | Graph snapshot supplied to projection | same result | — | — | — | — | Input graph remains unchanged. |
| DM-L04 | ledger-determinism | Same records supplied in different array orders | same sorted result | — | — | — | — | Stable sort keys remove input-order dependence. |
| DM-L05 | ledger-determinism | Repeated provenance references | same deduplicated sourceSummary | — | — | — | — | Source summary is deterministic and deduplicated. |
| DM-L06 | ledger-determinism | Restricted records included in source graph | no restricted content | — | — | restricted | — | Omission cannot leak restricted payload. |
| DM-L07 | ledger-determinism | Execution inspected for Date.now, Math.random, fetch, env access | same result | — | — | — | — | Ledger generation has no implicit time, randomness, network, or secret dependency. |
