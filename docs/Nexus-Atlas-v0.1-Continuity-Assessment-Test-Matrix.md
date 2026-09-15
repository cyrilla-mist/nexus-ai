# Nexus Atlas v0.1 — Continuity Assessment Test Matrix

**Status:** Phase 6C assessment acceptance matrix  
**Contract:** `Nexus-Atlas-v0.1-Continuity-Assessment-Contract.md`

---

## A. Upstream acceptance / binding

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-A01 | valid Trusted Checkpoint + complete accepted Fresh Evidence Window | assessment may proceed |
| 6C-CA-A02 | malformed Trusted Checkpoint | fail `INVALID_TRUSTED_CHECKPOINT` |
| 6C-CA-A03 | malformed / tampered Fresh Evidence Window | fail `INVALID_FRESH_EVIDENCE_WINDOW` |
| 6C-CA-A04 | blocked Fresh Evidence Window | fail `ASSESSMENT_EVIDENCE_BLOCKED` |
| 6C-CA-A05 | `assessmentAllowed=false` | fail closed |
| 6C-CA-A06 | checkpointRef mismatch | fail `ASSESSMENT_BINDING_MISMATCH` |
| 6C-CA-A07 | projectRef mismatch | fail `ASSESSMENT_BINDING_MISMATCH` |
| 6C-CA-A08 | cursorFrom differs from checkpoint cursor | fail `ASSESSMENT_BINDING_MISMATCH` |
| 6C-CA-A09 | proposal checkpoint/window refs mismatch | fail `ASSESSMENT_BINDING_MISMATCH` |

---

## B. Proposal structure

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-B01 | exact proposal v0.1 field set | accepted structurally |
| 6C-CA-B02 | missing / extra top-level field | fail `INVALID_ASSESSMENT_PROPOSAL` |
| 6C-CA-B03 | unsupported validity | fail |
| 6C-CA-B04 | malformed preserved/invalidated finding | fail |
| 6C-CA-B05 | malformed invalidated action | fail |
| 6C-CA-B06 | malformed ambiguity / unsupported ambiguity kind | fail |
| 6C-CA-B07 | empty or over-bounded summary/explanation | fail |
| 6C-CA-B08 | unsupported checkpoint synthetic claimRef | fail |
| 6C-CA-B09 | claimType does not match claimRef | fail |
| 6C-CA-B10 | actionRef differs from current accepted next action | fail |

---

## C. Fresh evidence linkage / contamination

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-C01 | all findings cite current-window `sourceRecordId`s | accepted |
| 6C-CA-C02 | finding has empty evidenceRefs | fail `ASSESSMENT_EVIDENCE_INVALID` |
| 6C-CA-C03 | unknown sourceRecordId | fail |
| 6C-CA-C04 | prior assessment ID used as evidence | fail |
| 6C-CA-C05 | prior outcome/checkpoint storage ID used as evidence | fail |
| 6C-CA-C06 | arbitrary URL used as evidence | fail |
| 6C-CA-C07 | duplicate evidence refs inside one finding | fail |
| 6C-CA-C08 | derived top-level evidenceRefs are de-duplicated deterministically in first-use order | accepted |
| 6C-CA-C09 | caller tries to inject top-level evidenceRefs in proposal | fail exact-shape validation |

---

## D. `VALID`

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-D01 | all 3 continuation surfaces preserved; no invalidations/ambiguity | `VALID` |
| 6C-CA-D02 | missing trusted-direction preserved finding | fail state semantics |
| 6C-CA-D03 | missing active-objective preserved finding | fail |
| 6C-CA-D04 | missing accepted-next-action preserved finding | fail |
| 6C-CA-D05 | any invalidated claim present | fail |
| 6C-CA-D06 | invalidated next action present | fail |
| 6C-CA-D07 | ambiguity present | fail |
| 6C-CA-D08 | same claim both preserved and invalidated | fail |

---

## E. `INVALID`

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-E01 | direction + objective preserved; current next action invalidated | `INVALID` |
| 6C-CA-E02 | current next action not invalidated | fail |
| 6C-CA-E03 | invalidated action repeated | fail |
| 6C-CA-E04 | accepted-next-action also preserved | fail |
| 6C-CA-E05 | trusted-direction invalidated | fail — must use `AMBIGUOUS` |
| 6C-CA-E06 | active-objective invalidated | fail — must use `AMBIGUOUS` |
| 6C-CA-E07 | direction not preserved | fail |
| 6C-CA-E08 | objective not preserved | fail |
| 6C-CA-E09 | ambiguity present | fail |

---

## F. `AMBIGUOUS`

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-F01 | protected direction conflict + one ambiguity | `AMBIGUOUS` |
| 6C-CA-F02 | active objective conflict + one ambiguity | `AMBIGUOUS` |
| 6C-CA-F03 | consequential next-action choice + one ambiguity | `AMBIGUOUS` |
| 6C-CA-F04 | no ambiguity object | fail |
| 6C-CA-F05 | ambiguity protectedRef not one of accepted surfaces | fail |
| 6C-CA-F06 | ambiguity has no accepted fresh evidence | fail |
| 6C-CA-F07 | protected claim invalidated but ambiguity points at another surface | fail |
| 6C-CA-F08 | protected claim invalidated while validity=`INVALID` | fail authority semantics |
| 6C-CA-F09 | ambiguity is simultaneously represented as resolved preserved state | fail conflicting state |

---

## G. Output / authority

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-G01 | accepted output authority | exactly `derived-continuity-assessment` |
| 6C-CA-G02 | `VALID` capabilities | human=false, reentry=true |
| 6C-CA-G03 | `INVALID` capabilities | human=false, reentry=true |
| 6C-CA-G04 | `AMBIGUOUS` capabilities | human=true, reentry=false |
| 6C-CA-G05 | assessment contains no canonical-authority promotion | pass |
| 6C-CA-G06 | assessment contains no project mutation/action-execution capability | pass |

---

## H. Determinism / immutability

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-H01 | identical inputs twice | identical `assessmentId` and payload |
| 6C-CA-H02 | finding/evidence order | preserved; no timestamp resorting |
| 6C-CA-H03 | output mutation attempt | rejected / no effect due deep freeze |
| 6C-CA-H04 | checkpoint/window/proposal inputs after build | byte-equivalent/deep-equal to before |
| 6C-CA-H05 | assessment ID tamper through validator | rejected |

---

## I. Fresh Evidence Window validator extension

| ID | Case | Expected |
| --- | --- | --- |
| 6C-CA-I01 | builder-produced complete window | validator accepts |
| 6C-CA-I02 | builder-produced blocked window | validator accepts as a window artifact, but assessment later blocks |
| 6C-CA-I03 | tampered `windowId` | validator rejects |
| 6C-CA-I04 | tampered capability/status pairing | validator rejects |
| 6C-CA-I05 | duplicate source record identity | validator rejects |
| 6C-CA-I06 | commit count diagnostics mismatch | validator rejects |
| 6C-CA-I07 | builder-produced scope mismatch with `blockedReason=evidence-scope-violation` | validator accepts artifact; assessment blocks |
| 6C-CA-I08 | source/policy/cursor scope mismatch without the dedicated blocker | validator rejects |

---

## J. Frozen regressions

| ID | Gate | Expected |
| --- | --- | --- |
| 6C-CA-J01 | Fresh Evidence Window dedicated suite | green |
| 6C-CA-J02 | Phase 6B checkpoint/store suite | green |
| 6C-CA-J03 | Phase 5 acceptance | green |
| 6C-CA-J04 | Phase 4 acceptance | green |

---

## Exit condition

The assessment slice may merge only when the dedicated matrix is green and all upstream frozen regressions remain green. A passing `VALID` happy path alone is not sufficient.