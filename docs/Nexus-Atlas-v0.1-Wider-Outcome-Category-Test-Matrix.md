# Nexus Atlas v0.1 — Wider Outcome Category Test Matrix

**Status:** Binding Phase 7E acceptance matrix

## A. Category registry

| ID | Requirement |
| --- | --- |
| 7E-A01 | registry contains exactly `action-execution`, `milestone-transition`, `decision-transition`, `evidence-refresh` |
| 7E-A02 | descriptor identity is deterministic and output deeply immutable |
| 7E-A03 | every category requires fresh authoritative verification |
| 7E-A04 | no category grants checkpoint-advance authority |
| 7E-A05 | no category grants Canonical Context write authority |
| 7E-A06 | `decision-transition` requires explicit Human Authority |
| 7E-A07 | `evidence-refresh` remains non-authoritative for canonical write |
| 7E-A08 | action and milestone Human Authority requirements remain conditional |
| 7E-A09 | unknown category fails closed |
| 7E-A10 | descriptor tampering fails validation |

## B. Category proposal

| ID | Requirement |
| --- | --- |
| 7E-B01 | each accepted category can produce a deterministic scoped proposal |
| 7E-B02 | proposal output is deeply immutable |
| 7E-B03 | builder does not mutate caller arrays/objects |
| 7E-B04 | proposal identity binds category |
| 7E-B05 | proposal identity binds Human Authority reference |
| 7E-B06 | malformed/tampered proposal identity fails closed |
| 7E-B07 | basis references are non-empty and unique |
| 7E-B08 | evidence references are unique and may be empty pre-verification |
| 7E-B09 | malformed timestamps/project/subject refs fail closed |
| 7E-B10 | Decision proposal without Human Authority cannot be accepted |

## C. Frozen Phase 6 adapter

| ID | Requirement |
| --- | --- |
| 7E-C01 | accepted Phase 6 Outcome maps only to `action-execution` |
| 7E-C02 | verification state, evidence and source authority are preserved exactly |
| 7E-C03 | failed Outcome remains classifiable history |
| 7E-C04 | indeterminate Outcome remains classifiable history |
| 7E-C05 | categorized reference grants no checkpoint authority |
| 7E-C06 | categorized reference grants no Canonical Context write authority |
| 7E-C07 | adapter does not mutate frozen Outcome input |
| 7E-C08 | categorized reference is deeply immutable |
| 7E-C09 | reference identity tampering fails closed |
| 7E-C10 | invalid/tampered Phase 6 Outcome is rejected before classification |

## D. Frozen boundary regressions

| ID | Requirement |
| --- | --- |
| 7E-D01 | Phase 7D History + Retention remains green |
| 7E-D02 | Phase 7C D1 durable adapter remains green |
| 7E-D03 | Phase 7B Target + Policy remains green |
| 7E-D04 | Phase 6B checkpoint persistence remains green |
| 7E-D05 | Phase 6C evidence/assessment remains green |
| 7E-D06 | Phase 6D Human Authority/re-entry remains green |
| 7E-D07 | Phase 6E Outcome verification remains green |
| 7E-D08 | Phase 6F continuity closure remains green |
| 7E-D09 | Phase 5 frozen acceptance remains green |
| 7E-D10 | Phase 4 frozen acceptance remains green |
| 7E-D11 | no frozen Phase 6 runtime file is modified |
| 7E-D12 | no browser/UI, production D1 binding, Canonical Context runtime, or source-adapter runtime is modified |

## Acceptance rule

Phase 7E is accepted only when the dedicated category suite passes together with the complete Phase 7D/7C/7B, Phase 6B–6F, Phase 5 and Phase 4 regression chain. Category expansion must not imply new verification or authorization capability.
