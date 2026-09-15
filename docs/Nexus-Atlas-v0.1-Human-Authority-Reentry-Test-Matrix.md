# Nexus Atlas v0.1 — Human Authority Gate + Re-entry Package Test Matrix

**Status:** Blocking Phase 6D matrix  
**Contract:** `Nexus-Atlas-v0.1-Human-Authority-Reentry-Contract.md`

---

## A. Upstream acceptance and binding

| ID | Case | Expected |
| --- | --- | --- |
| 6D-A01 | accepted checkpoint + complete Fresh Evidence Window + accepted assessment | Phase 6D may proceed |
| 6D-A02 | malformed checkpoint | fail closed |
| 6D-A03 | malformed/tampered Fresh Evidence Window | fail closed |
| 6D-A04 | malformed/tampered Continuity Assessment | fail closed |
| 6D-A05 | assessment project mismatch | binding failure |
| 6D-A06 | assessment checkpoint mismatch | binding failure |
| 6D-A07 | assessment evidenceWindowRef mismatch | binding failure |
| 6D-A08 | window cursorFrom differs from checkpoint cursor | binding failure |

## B. Human Authority Question eligibility

| ID | Case | Expected |
| --- | --- | --- |
| 6D-B01 | `VALID` assessment requests question | rejected |
| 6D-B02 | `INVALID` assessment requests question | rejected |
| 6D-B03 | `AMBIGUOUS` with humanAuthorityRequired=true | one question may be built |
| 6D-B04 | AMBIGUOUS assessment lacks unresolved ambiguity | rejected by upstream validator |
| 6D-B05 | proposal targets different assessment | rejected |
| 6D-B06 | proposal targets different ambiguityRef | rejected |
| 6D-B07 | extra/missing proposal field | rejected |

## C. Human Authority Question structure

| ID | Case | Expected |
| --- | --- | --- |
| 6D-C01 | exactly 2 options | accepted |
| 6D-C02 | exactly 4 options | accepted |
| 6D-C03 | fewer than 2 or more than 4 options | rejected |
| 6D-C04 | duplicate optionRef | rejected |
| 6D-C05 | empty/oversized/untrimmed question text | rejected |
| 6D-C06 | empty/oversized/untrimmed option text | rejected |
| 6D-C07 | option contains extra/missing field | rejected |
| 6D-C08 | option action contains extra/missing field | rejected |
| 6D-C09 | option evidence outside current Fresh Evidence Window | rejected |
| 6D-C10 | option evidence absent from assessment evidence universe | rejected |
| 6D-C11 | duplicate local evidence refs | rejected |
| 6D-C12 | option basisRef invents new governing authority | rejected |
| 6D-C13 | option has no basisRef | rejected |
| 6D-C14 | question attempts default/recommended/selected option field | exact-shape rejection |
| 6D-C15 | accepted question carries exact protectedRef from assessment ambiguity | accepted |

## D. Human Authority response and decision

| ID | Case | Expected |
| --- | --- | --- |
| 6D-D01 | response selects existing current option | Human Authority Decision emitted |
| 6D-D02 | response targets different question | rejected |
| 6D-D03 | response targets different assessment | rejected |
| 6D-D04 | unknown selectedOptionRef | rejected |
| 6D-D05 | selectedOptionRef omitted/empty | rejected |
| 6D-D06 | actorRef omitted/empty | rejected |
| 6D-D07 | answeredAt not strict offset ISO | rejected |
| 6D-D08 | extra/missing response field | rejected |
| 6D-D09 | prior response replayed against a newly identified question | rejected by questionRef binding |
| 6D-D10 | selected option is copied exactly without reinterpretation | accepted |
| 6D-D11 | decision authority is exactly `human` | accepted |

## E. INVALID replacement proposal

| ID | Case | Expected |
| --- | --- | --- |
| 6D-E01 | INVALID + one different evidence-grounded replacement | accepted |
| 6D-E02 | VALID supplies replacement proposal | rejected |
| 6D-E03 | AMBIGUOUS supplies standalone replacement proposal | rejected |
| 6D-E04 | replacement actionRef equals stale checkpoint actionRef | rejected |
| 6D-E05 | replacement has empty basisRefs | rejected |
| 6D-E06 | replacement invents basisRef outside checkpoint accepted authority | rejected |
| 6D-E07 | replacement evidence outside current window | rejected |
| 6D-E08 | replacement evidence not cited by accepted assessment | rejected |
| 6D-E09 | replacement contains duplicate evidence/basis refs | rejected |
| 6D-E10 | replacement extra/missing field | rejected |

## F. VALID Re-entry Package

| ID | Case | Expected |
| --- | --- | --- |
| 6D-F01 | VALID package requires no question/decision/replacement | accepted |
| 6D-F02 | package actionRef equals checkpoint accepted next action | accepted |
| 6D-F03 | package action summary/basis copied from checkpoint | accepted |
| 6D-F04 | package evidence derives from assessment preserved accepted-next-action finding | accepted |
| 6D-F05 | VALID package given Human Authority Decision | rejected |
| 6D-F06 | VALID package given replacement proposal | rejected |

## G. INVALID Re-entry Package

| ID | Case | Expected |
| --- | --- | --- |
| 6D-G01 | INVALID package with one accepted replacement | accepted |
| 6D-G02 | INVALID package without replacement | blocked |
| 6D-G03 | INVALID package with Human Authority Decision | rejected |
| 6D-G04 | old stale action reappears as package next action | rejected |
| 6D-G05 | package copies replacement exactly | accepted |

## H. AMBIGUOUS Re-entry Package

| ID | Case | Expected |
| --- | --- | --- |
| 6D-H01 | unanswered Human Authority Question | package blocked |
| 6D-H02 | accepted current Human Authority Decision | package accepted |
| 6D-H03 | decision from different assessment/question | rejected |
| 6D-H04 | standalone INVALID replacement proposal supplied | rejected |
| 6D-H05 | package next action equals selected Human Authority option action | accepted |
| 6D-H06 | humanAuthorityDecisionRef equals accepted decisionId | accepted |

## I. Verification and execution boundary

| ID | Case | Expected |
| --- | --- | --- |
| 6D-I01 | verification provider | `github` |
| 6D-I02 | verification scope | current window repository |
| 6D-I03 | verification cursorType | `default-branch-head` |
| 6D-I04 | verification baselineValue | current window `cursorTo.value` |
| 6D-I05 | verification requirement | `fresh-authoritative-reread` |
| 6D-I06 | package exposes externalExecutionRequired=true | accepted |
| 6D-I07 | package exposes freshVerificationRequired=true | accepted |
| 6D-I08 | package autonomousExecutionAllowed | always false |
| 6D-I09 | package checkpointWriteAllowed/outcomeWriteAllowed | always false |
| 6D-I10 | package contains success/completed/verified outcome field | exact-shape rejection |

## J. Evidence / contamination boundary

| ID | Case | Expected |
| --- | --- | --- |
| 6D-J01 | question/package evidence only current sourceRecordIds | accepted |
| 6D-J02 | question/decision IDs inserted as fresh evidence | rejected |
| 6D-J03 | prior assessment/outcome/checkpoint ID used as fresh evidence | rejected |
| 6D-J04 | arbitrary URL used as fresh evidence | rejected |
| 6D-J05 | decision authority artifact remains separate from evidenceRefs | accepted |
| 6D-J06 | no token/email/comment/review/raw source payload fields | exact-shape boundary |

## K. Determinism and immutability

| ID | Case | Expected |
| --- | --- | --- |
| 6D-K01 | identical accepted question inputs | identical questionId |
| 6D-K02 | identical accepted response/question | identical decisionId |
| 6D-K03 | identical accepted package inputs | identical packageId |
| 6D-K04 | question output deeply immutable | pass |
| 6D-K05 | decision output deeply immutable | pass |
| 6D-K06 | package output deeply immutable | pass |
| 6D-K07 | caller inputs remain unchanged | pass |
| 6D-K08 | deterministic evidence union/order | pass |

## L. Regression boundary

| ID | Case | Expected |
| --- | --- | --- |
| 6D-L01 | Phase 6C Continuity Assessment dedicated acceptance | green |
| 6D-L02 | Phase 6C Fresh Evidence Window acceptance | green |
| 6D-L03 | Phase 6B acceptance | green |
| 6D-L04 | Phase 5 acceptance | green |
| 6D-L05 | Phase 4 acceptance | green |
| 6D-L06 | no browser/UI files modified by this slice | pass |

---

## Exit condition

Phase 6D is accepted only when this matrix is executable and green together with the frozen upstream regressions. External execution, post-action source reread, success/failure interpretation and Outcome Record remain Phase 6E.
