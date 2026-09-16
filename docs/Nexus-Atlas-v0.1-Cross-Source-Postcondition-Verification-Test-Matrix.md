# Nexus Atlas v0.1 — Cross-source Postcondition Verification Test Matrix

**Status:** Binding Phase 7F acceptance matrix

## A. Postcondition/profile contract

| ID | Requirement |
| --- | --- |
| 7F-A01 | GitHub Phase 6 profile accepts only `action-execution` |
| 7F-A02 | DataHub continuity profile accepts the four bounded Phase 7E categories |
| 7F-A03 | unsupported provider/profile fails closed |
| 7F-A04 | provider-specific condition vocabulary is enforced |
| 7F-A05 | postcondition identity is deterministic and output immutable |
| 7F-A06 | postcondition declaration cannot predate category proposal |
| 7F-A07 | tampered postcondition identity fails validation |
| 7F-A08 | GitHub head-advanced requires `expectedValue=null` |
| 7F-A09 | GitHub commit-present requires lowercase 40-char SHA |
| 7F-A10 | DataHub entity-status expected value must be bounded text |

## B. GitHub frozen-Phase-6 proof profile

| ID | Requirement |
| --- | --- |
| 7F-B01 | verified Phase 6 Outcome maps to `satisfied` |
| 7F-B02 | failed Phase 6 Outcome maps to `not-satisfied` |
| 7F-B03 | indeterminate Phase 6 Outcome maps to `unknown`, not failure |
| 7F-B04 | verification evidence refs are preserved exactly |
| 7F-B05 | category action must bind frozen Outcome action |
| 7F-B06 | tampered/invalid Phase 6 Outcome is rejected |
| 7F-B07 | adapter does not mutate category/postcondition/package/outcome inputs |
| 7F-B08 | repository scope must bind Re-entry verification plan |
| 7F-B09 | declared postcondition must equal frozen expected postcondition |
| 7F-B10 | proof source authority is fixed to accepted Phase 6 verification |

## C. DataHub continuity proof profile

| ID | Requirement |
| --- | --- |
| 7F-C01 | matching milestone entity status yields `satisfied` proof |
| 7F-C02 | observed status mismatch yields `not-satisfied` proof |
| 7F-C03 | decision state proof remains separate from Canonical write authority |
| 7F-C04 | evidence refresh proof remains source-local/non-canonical |
| 7F-C05 | entity type must match Phase 7E semantic Context kind |
| 7F-C06 | missing subject fails closed rather than becoming a false failed postcondition |
| 7F-C07 | successful representative lineage verification is mandatory |
| 7F-C08 | DataHub snapshot cannot be relabeled to another continuity project/scope |
| 7F-C09 | adapter does not mutate live-read snapshot |
| 7F-C10 | snapshot must be read-only `datahub-mcp` output |
| 7F-C11 | normalized entity IDs must be unique |
| 7F-C12 | evidence reference is bounded source-local identity only |

## D. Generic proof + verification

| ID | Requirement |
| --- | --- |
| 7F-D01 | `satisfied` maps to `verified` |
| 7F-D02 | `not-satisfied` maps to `failed` |
| 7F-D03 | `unknown` maps to `indeterminate` |
| 7F-D04 | proof observed before postcondition declaration is stale and rejected |
| 7F-D05 | verification grants no generalized write-back Outcome authority |
| 7F-D06 | verification grants no checkpoint advance authority |
| 7F-D07 | verification grants no Canonical Context write authority |
| 7F-D08 | proof and verification outputs are deeply immutable |
| 7F-D09 | proof identity tampering fails closed |
| 7F-D10 | verification identity tampering fails closed |
| 7F-D11 | proof from another category/subject/project cannot verify the proposal |
| 7F-D12 | proof provider/profile/scope must exactly bind postcondition |
| 7F-D13 | proof condition must exactly bind declared postcondition |
| 7F-D14 | verified result requires source-local evidence refs |
| 7F-D15 | source adapter validation failure produces no synthetic proof/result |

## E. Frozen regressions

| ID | Requirement |
| --- | --- |
| 7F-E01 | Phase 7E Outcome Category remains green |
| 7F-E02 | Phase 7D History/Retention remains green |
| 7F-E03 | Phase 7C D1 durable adapter remains green |
| 7F-E04 | Phase 7B Target/Policy remains green |
| 7F-E05 | Phase 6B checkpoint persistence remains green |
| 7F-E06 | Phase 6C evidence/assessment remains green |
| 7F-E07 | Phase 6D Human Authority/re-entry remains green |
| 7F-E08 | Phase 6E Outcome verification remains green |
| 7F-E09 | Phase 6F closure remains green |
| 7F-E10 | Phase 5 frozen acceptance remains green |
| 7F-E11 | Phase 4 frozen acceptance remains green |
| 7F-E12 | no frozen Phase 4/5/6, browser/UI, production D1, or legacy DataHub runtime is modified |

## Acceptance rule

Phase 7F is accepted only when the dedicated cross-source suite passes with the complete upstream regression chain. Supporting two source profiles does not authorize arbitrary provider registration or a generalized durable Outcome write path.
