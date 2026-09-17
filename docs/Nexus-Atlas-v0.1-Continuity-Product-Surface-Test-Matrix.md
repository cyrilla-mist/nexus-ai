# Nexus Atlas v0.1 — Continuity Product Surface Test Matrix

**Status:** Binding Phase 8A acceptance matrix

All cases are blocking.

## A. Accepted projection semantics

| ID | Case | Expected |
|---|---|---|
| 8A-A01 | same accepted inputs projected twice | deterministic deep-equal surface; deeply immutable |
| 8A-A02 | resume state | copied exactly from accepted Trusted Checkpoint |
| 8A-A03 | VALID assessment | VALID preserved; no Human Authority required; re-entry allowed |
| 8A-A04 | AMBIGUOUS assessment | AMBIGUOUS preserved; Human Authority required; browser cannot decide |
| 8A-A05 | failed Outcome | failed preserved exactly; failure reason preserved |
| 8A-A06 | browser capabilities | strictly read-only; all write/delete/execution/authority flags false |
| 8A-A07 | write-back safety | verified Outcome requirement, exact read-after-write and no-delete preserved |
| 8A-A08 | history projection | bounded Phase 7G summaries only; no full Outcome/Checkpoint payloads |

## B. Binding / adversarial cases

| ID | Case | Expected |
|---|---|---|
| 8A-B01 | checkpoint from another project | fail closed |
| 8A-B02 | supplied checkpoint is not management latest | fail closed |
| 8A-B03 | management has Outcome but latest Outcome omitted | fail closed |
| 8A-B04 | management has no Outcome and latest Outcome is null | accepted |
| 8A-B05 | assessment bound to another checkpoint/project | fail closed |
| 8A-B06 | generatedAt predates accepted inputs | fail closed |
| 8A-B07 | tampered deterministic surface identity | fail closed |
| 8A-B08 | projector execution | upstream accepted artifacts remain unchanged |

## C. Browser data-minimization boundary

| ID | Requirement |
|---|---|
| 8A-C01 | surface has no credentials/tokens |
| 8A-C02 | surface has no D1 database identifier or connection metadata |
| 8A-C03 | surface has no filesystem path |
| 8A-C04 | Outcome history omits observed postcondition internals |
| 8A-C05 | Checkpoint history omits trusted direction/objective text |
| 8A-C06 | checkpoint summary omits governingRefs/provenance payload |
| 8A-C07 | latest Outcome does not expose execution/provider raw payload |
| 8A-C08 | verification remains count/profile summary, not durable generalized Outcome |

## D. Frozen authority boundary

| ID | Requirement |
|---|---|
| 8A-D01 | no Canonical Context write capability |
| 8A-D02 | no checkpoint advance capability |
| 8A-D03 | no autonomous execution capability |
| 8A-D04 | no Human Authority decision capability |
| 8A-D05 | no retention deletion capability |
| 8A-D06 | no production provisioning capability |
| 8A-D07 | projector does not synthesize replacement next action |
| 8A-D08 | projector does not reinterpret VALID/INVALID/AMBIGUOUS |

## E. Regressions

| ID | Required suite |
|---|---|
| 8A-E01 | Phase 7G Write-back Management regression |
| 8A-E02 | Phase 7F Cross-source Verification regression |
| 8A-E03 | Phase 7E Outcome Category regression |
| 8A-E04 | Phase 7D History / Retention regression |
| 8A-E05 | Phase 7C D1 adapter regression |
| 8A-E06 | Phase 7B Write-back target/policy regression |
| 8A-E07 | Phase 6 Trusted Checkpoint / Assessment / Outcome regressions |
| 8A-E08 | Phase 5 and Phase 4 frozen acceptance regressions |

Phase 8A acceptance does not authorize route/UI changes. Browser route work begins only after this projection contract is accepted.