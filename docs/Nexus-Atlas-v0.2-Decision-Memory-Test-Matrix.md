# Nexus Atlas v0.2 — Decision and Memory Test Matrix

**Status:** Accepted
**Target:** Phase 2B

Each case is a synthetic contract case. Expected sections are Ledger sections; `—` means empty or not applicable. No case authorizes automatic resolution of user content.

| Case ID | Category | Input State | Expected Effective Decisions | Expected Decision Chain / Status | Expected Memory Section | Expected Conflicts | Expected Omissions | Expected Error | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| DM-D01 | decision-resolution | One active confirmed current decision | current | current → current; resolved | — | — | — | — | A single eligible Decision is effective. |
| DM-D02 | decision-resolution | Old confirmed current plus newer proposed decision | old | old; resolved; no active proposed coverage | proposed: newer | — | — | — | Proposal is retained for review and cannot replace confirmed choice. |
| DM-D03 | decision-resolution | Confirmed old Decision with legal edge old → new | new | old → new; terminal new; resolved | — | — | — | — | Explicit legal supersession selects the confirmed successor and preserves history in the chain. |
| DM-D04 | decision-resolution | Legal chain A → B → C | C | A → B → C; terminal C; resolved | — | — | — | — | Terminal traversal is deterministic and stable. |
| DM-D05 | decision-resolution | Supersession cycle A → B → A | — | —; no chain | — | — | — | SUPERSESSION_CYCLE | Cycles are structural Validation Errors and produce no Ledger. |
| DM-D06 | decision-resolution | A has two active successors B and C | — | A → B, C; terminals B, C; branching | — | branching_supersession | — | — | Multiple successors are an unresolved conflict, not a Validation Error. |
| DM-D07 | decision-resolution | Inferred AI Decision attempts to replace confirmed human Decision | human | human root; resolved; inferred edge not effective | proposed: ai | authority_conflict | — | — | Inference is a proposed Decision and cannot override human confirmation. |
| DM-D08 | decision-resolution | Human direction, repository SHA state, and external direction attempt | human direction; repository state | two separate chains: product.direction and repository.current-sha; resolved | — | authority_conflict | — | — | External authority is limited to verifiable repository state; subjects never share a chain. |
| DM-D09 | decision-resolution | Confirmed Decision is stale with no current replacement | — | stale; terminal stale; no_effective_decision | — | — | — | — | Stale confirmation is not current and yields no effective Decision. |
| DM-D10 | decision-resolution | Terminal Decision is revoked | — | old → revoked-terminal; terminal revoked-terminal; no_effective_decision | — | — | — | — | Revocation does not restore the old Decision. |
| DM-D11 | decision-resolution | Payload supersededBy disagrees with active edge | — | —; no chain | — | — | — | DECISION_EDGE_MISMATCH | Canonical edge and redundant payload index must agree. |
| DM-D12 | decision-resolution | Two active confirmed current mutually exclusive Decisions, no supersession | — | two terminals; incomplete | — | contradictory_confirmed_decisions | — | — | Contradiction is unresolved while the structure remains readable. |
| DM-M01 | memory-inheritance | Active confirmed current recorded Memory, eligible scope | — | —; no chain | inherited: memory | — | — | — | Eligible confirmed current Memory is inherited. |
| DM-M02 | memory-inheritance | Active inferred current Memory | — | —; no chain | inferred: memory | — | — | — | Inference is retained with its label but is not inherited. |
| DM-M03 | memory-inheritance | Disputed Memory with conflict references | — | —; no chain | disputed: memory | — | — | — | Disputed content is preserved for review, not inherited. |
| DM-M04 | memory-inheritance | Confirmed Memory is stale | — | —; no chain | historical: memory | — | — | — | Stale content remains historical, not current default. |
| DM-M05 | memory-inheritance | Memory is actively superseded | — | —; no chain | historical: memory | — | — | — | Superseded value is historical and not inherited. |
| DM-M06 | memory-inheritance | Restricted Memory | — | —; no chain | — | — | restricted | — | Restricted content is omitted without leaking payload. |
| DM-M07 | memory-inheritance | Memory inheritance is never | — | —; no chain | — | — | inheritance-never | — | Governance prevents inheritance. |
| DM-M08 | memory-inheritance | explicit_only Memory without caller consent | — | —; no chain | — | — | explicit-only-no-consent | — | Explicit-only content requires consent. |
| DM-M09 | memory-inheritance | explicit_only Memory with caller consent | — | —; no chain | corresponding verification section | — | — | — | Consent permits the governed projection. |
| DM-M10 | memory-inheritance | project_only Memory from another project scope | — | —; no chain | — | — | scope-mismatch | — | Project-only inheritance requires matching project scope. |
| DM-M11 | memory-inheritance | Two confirmed current Memories linked by explicit contradicts | — | —; no chain | — | memory_statement_conflict | — | — | Neither contradictory Memory is silently selected. |
| DM-M12 | memory-inheritance | Inferred Memory conflicts with confirmed Memory | — | —; no chain | inherited: confirmed; inferred: inferred | — | — | — | Confirmed Memory inherits; inference cannot override it. |
| DM-L01 | ledger-determinism | Same graph and generatedAt supplied twice | same result | same chain result; stable | — | — | — | — | Deterministic output must be deeply equal. |
| DM-L02 | ledger-determinism | Ledger returned to caller | same result | same chain result; stable | — | — | — | — | Output is deeply frozen. |
| DM-L03 | ledger-determinism | Graph snapshot supplied to projection | same result | same chain result; stable | — | — | — | — | Input graph remains unchanged. |
| DM-L04 | ledger-determinism | Same records supplied in different array orders | same sorted result | same sorted chains; stable | — | — | — | — | Stable sort keys remove input-order dependence. |
| DM-L05 | ledger-determinism | Repeated provenance references | same result | same chains; stable | — | — | — | — | Source summary is deterministic and deduplicated. |
| DM-L06 | ledger-determinism | Restricted records included in source graph | no restricted content | same chains; stable | — | — | restricted | — | Omission cannot leak restricted payload. |
| DM-L07 | ledger-determinism | Inspect for Date.now, Math.random, fetch, or env access | same result | same chains; stable | — | — | — | — | Behavior test does not pretend to have run a Resolver; it specifies no implicit side effects. |
