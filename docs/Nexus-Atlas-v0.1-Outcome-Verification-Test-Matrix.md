# Nexus Atlas v0.1 — Outcome Verification Test Matrix

**Status:** Phase 6E blocking acceptance matrix  
**Contract:** `Nexus-Atlas-v0.1-Outcome-Verification-Contract.md`

---

## A. Verification Envelope

| ID | Case | Expected |
| --- | --- | --- |
| 6E-A01 | accepted Re-entry Package + head-advanced proposal | deterministic envelope accepted |
| 6E-A02 | proposal targets another package/action | fail closed |
| 6E-A03 | declaredAt before package preparedAt | fail closed |
| 6E-A04 | commit-present expected SHA is not grounded by package commit evidence | fail closed |
| 6E-A05 | unsupported postcondition type | fail closed |
| 6E-A06 | identical accepted inputs | identical envelope ID + deep immutability |

## B. Action Observation

| ID | Case | Expected |
| --- | --- | --- |
| 6E-B01 | current package/envelope + reported-success | observation accepted, no verified capability |
| 6E-B02 | current package/envelope + reported-failure | observation accepted, no verified capability |
| 6E-B03 | observation targets another envelope/package/action | fail closed |
| 6E-B04 | attemptedAt before envelope declaredAt | fail closed |
| 6E-B05 | malformed actor/report/timestamp | fail closed |
| 6E-B06 | identical inputs | identical observation ID + deep immutability |

## C. Fresh verification binding

| ID | Case | Expected |
| --- | --- | --- |
| 6E-C01 | accepted GitHub Source Snapshot after attempt, same repository | verification may proceed |
| 6E-C02 | snapshot captured at/before attemptedAt | fail closed |
| 6E-C03 | snapshot repository mismatch | fail closed |
| 6E-C04 | changed head + proof bound to another baseline/head/time/repository | fail closed |
| 6E-C05 | changed head + no proof | `indeterminate` |
| 6E-C06 | changed head + incomplete proof | `indeterminate` |
| 6E-C07 | source failure observation | `indeterminate` |

## D. Postcondition semantics

| ID | Case | Expected |
| --- | --- | --- |
| 6E-D01 | head-advanced + unchanged head | `failed` |
| 6E-D02 | head-advanced + complete `ahead` proof | `verified` |
| 6E-D03 | head-advanced + behind/diverged relation | `indeterminate` |
| 6E-D04 | commit-present + expected SHA in complete `ahead` proof | `verified` |
| 6E-D05 | commit-present + expected SHA absent from complete `ahead` proof | `failed` |
| 6E-D06 | commit-present + unchanged head | `failed` |
| 6E-D07 | reported-success + authoritative evidence disproves postcondition | remains `failed` |
| 6E-D08 | reported-failure + authoritative evidence proves postcondition | becomes `verified` |

## E. Outcome Verification artifact

| ID | Case | Expected |
| --- | --- | --- |
| 6E-E01 | verified result | `nextCheckpointAllowed=true` |
| 6E-E02 | failed result | `nextCheckpointAllowed=false` |
| 6E-E03 | indeterminate result | `nextCheckpointAllowed=false` |
| 6E-E04 | tampered verification ID/state/evidence | validator rejects |
| 6E-E05 | identical accepted inputs | identical verification ID + deep immutability |

## F. Outcome Record

| ID | Case | Expected |
| --- | --- | --- |
| 6E-F01 | verified verification | immutable verified Outcome Record |
| 6E-F02 | failed verification | failed Outcome Record still emitted |
| 6E-F03 | indeterminate verification | indeterminate Outcome Record still emitted |
| 6E-F04 | recordedAt before verifiedAt | fail closed |
| 6E-F05 | cross-run package/envelope/observation/verification binding | fail closed |
| 6E-F06 | tampered outcome identity | validator rejects |
| 6E-F07 | only verified record | `nextCheckpointAllowed=true` |

## G. Contamination / regressions

| ID | Case | Expected |
| --- | --- | --- |
| 6E-G01 | action report inserted as verification evidence | reject / impossible by builder |
| 6E-G02 | prior Fresh Evidence Window IDs used as post-action verification evidence | reject / impossible by builder |
| 6E-G03 | outcome/checkpoint IDs used as fresh evidence | reject / impossible by builder |
| 6E-G04 | Phase 6D acceptance regression | green |
| 6E-G05 | Phase 6C Fresh Evidence + Assessment regressions | green |
| 6E-G06 | Phase 6B regression | green |
| 6E-G07 | Phase 5 / Phase 4 frozen gates | green |
