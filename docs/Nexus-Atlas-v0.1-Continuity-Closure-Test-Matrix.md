# Nexus Atlas v0.1 — Verified Continuity Closure Test Matrix

**Status:** Phase 6F blocking acceptance matrix  
**Contract:** `Nexus-Atlas-v0.1-Continuity-Closure-Contract.md`

---

## A. Upstream advancement eligibility

| ID | Case | Expected |
| --- | --- | --- |
| 6F-A01 | previous checkpoint + matching package + verified outcome | closure may proceed |
| 6F-A02 | failed outcome | block next-checkpoint derivation |
| 6F-A03 | indeterminate outcome | block next-checkpoint derivation |
| 6F-A04 | outcome/package/project/action mismatch | fail closed |
| 6F-A05 | package targets another checkpoint | fail closed |
| 6F-A06 | verified outcome lacks safe observed `ahead` head | fail closed |

## B. Next Checkpoint Proposal

| ID | Case | Expected |
| --- | --- | --- |
| 6F-B01 | bounded new action using accepted basis + verified evidence | accepted |
| 6F-B02 | proposal repeats completed Re-entry action | reject |
| 6F-B03 | proposal invents basis/governance ref | reject |
| 6F-B04 | proposal cites non-verification evidence | reject |
| 6F-B05 | proposal targets another outcome | reject |
| 6F-B06 | proposal timestamp predates outcome recordedAt | reject |
| 6F-B07 | extra protected direction/objective fields | exact-shape rejection |

## C. Next Trusted Checkpoint derivation

| ID | Case | Expected |
| --- | --- | --- |
| 6F-C01 | accepted verified closure inputs | checkpoint v+1 generated |
| 6F-C02 | trustedDirection | byte-for-byte preserved |
| 6F-C03 | activeObjective | byte-for-byte preserved |
| 6F-C04 | governingRefs + unresolvedProtectedAmbiguities | preserved exactly |
| 6F-C05 | acceptedNextAction | proposal action copied without evidenceRefs |
| 6F-C06 | evidence cursor | GitHub scope + verified observed head + outcome.recordedAt |
| 6F-C07 | confirmation | authority=`verified-outcome`, basisRef=outcomeId |
| 6F-C08 | provenance | verified outcome/package/evidence references only |
| 6F-C09 | identical inputs | identical checkpoint ID + deep immutability |

## D. Outcome Record store

| ID | Case | Expected |
| --- | --- | --- |
| 6F-D01 | first valid append | outcome stored, `replayed=false` |
| 6F-D02 | same key + same outcome replay | exact outcome, `replayed=true` |
| 6F-D03 | same key + different outcome | `IDEMPOTENCY_CONFLICT` |
| 6F-D04 | duplicate outcome ID with different/new receipt | reject |
| 6F-D05 | out-of-allowlist project | reject |
| 6F-D06 | malformed stored outcome/state | reject |
| 6F-D07 | readOutcome existing/missing | immutable exact artifact / null |
| 6F-D08 | append order | preserved as append-only history |

## E. File Outcome store

| ID | Case | Expected |
| --- | --- | --- |
| 6F-E01 | absent file | empty valid store state |
| 6F-E02 | append | atomic persist + exact read-after-write |
| 6F-E03 | replay | no duplicate Outcome Record |
| 6F-E04 | malformed JSON/state | fail closed |
| 6F-E05 | lock contention timeout | explicit failure |
| 6F-E06 | write/read corruption | `WRITE_VERIFICATION_FAILED` or IO/state failure |
| 6F-E07 | relative file path | reject |

## F. Closure orchestration

| ID | Case | Expected |
| --- | --- | --- |
| 6F-F01 | verified outcome + valid proposal + healthy stores | Outcome appended, checkpoint written, both read back, receipt emitted |
| 6F-F02 | stale checkpoint version | Outcome may persist; closure receipt not emitted; checkpoint conflict preserved |
| 6F-F03 | Outcome read-back mismatch | closure fails before checkpoint write |
| 6F-F04 | checkpoint read-back mismatch | closure fails; no success receipt |
| 6F-F05 | same idempotency keys replay | safe replay, identical artifacts/receipt |
| 6F-F06 | different content under reused key | fail closed |
| 6F-F07 | closure receipt | exact digests + v→v+1 + `nextReentryAllowed=true` |
| 6F-F08 | tampered closure receipt ID/digest | validator rejects |

## G. Contamination / authority

| ID | Case | Expected |
| --- | --- | --- |
| 6F-G01 | model proposes changed direction/objective | impossible by proposal shape / reject extra fields |
| 6F-G02 | outcome ID used as source evidence for next action | reject unless actual verification evidence identity |
| 6F-G03 | prior action report used as verification evidence | reject / absent from accepted evidence universe |
| 6F-G04 | closure receipt reused as fresh GitHub evidence | reject / not a source identity |
| 6F-G05 | Canonical Context write attempt | outside module boundary |

## H. Frozen regressions

| ID | Case | Expected |
| --- | --- | --- |
| 6F-H01 | Phase 6E Outcome Verification acceptance | green |
| 6F-H02 | Phase 6D Authority/Re-entry acceptance | green |
| 6F-H03 | Phase 6C Continuity Assessment + Fresh Evidence | green |
| 6F-H04 | Phase 6B Trusted Checkpoint acceptance | green |
| 6F-H05 | Phase 5 / Phase 4 acceptance | green |
