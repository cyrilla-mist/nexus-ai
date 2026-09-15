# Nexus Atlas — Phase 6G Acceptance

**Status:** Accepted  
**Accepted main baseline:** `4559bbf87e86b55505f7b17e9d6592986abe78af`  
**Real action:** merge PR #24, `Phase 6G: Adversarial Evaluation + First Real Continuity Run`

---

## 1. Decision

Phase 6G is accepted.

The accepted Phase 6B–6F runtime completed one real Nexus continuity transaction against the live `cyrilla-mist/nexus-ai` repository rather than a synthetic fixture.

The transaction began from the project-owner-confirmed Trusted Checkpoint and closed into a verified next Trusted Checkpoint after an actual repository merge.

---

## 2. Starting trusted boundary

The pre-action workflow created and exactly re-read:

```text
checkpointId = checkpoint:77b7379f2946ea4c875b1dbe
version      = 1
main cursor  = a9f431c675a5aa1183a06c9131def863ad8e5e69
authority    = human
ambiguity    = none
```

The live pre-action read independently observed the same `main` head and produced:

```text
Continuity Assessment = VALID
Human Authority questions = 0
Re-entry Package = reentry-package:cc7652a255ce0585832a902d
Expected postcondition = github-default-branch-head-advanced
```

Pre-action workflow run: `34977525471`  
Pre-action artifact: `10399629296`  
Artifact digest: `sha256:001bee0b832c8da894d174d2870ece20e15e9f658153b456b9d3c2d33f37f239`

---

## 3. Genuine external action

The bounded project action was the actual merge of the Phase 6G implementation PR.

```text
PR       = #24
baseline = a9f431c675a5aa1183a06c9131def863ad8e5e69
new main = 4559bbf87e86b55505f7b17e9d6592986abe78af
merge at = 2026-09-15T13:51:35Z
```

The GitHub merge result was stored only as an Action Observation. It was not treated as success authority.

---

## 4. Independent post-action verification

The post-merge workflow independently re-read GitHub and proved a complete `ahead` commit range from the frozen baseline to the new `main` head.

Accepted Outcome:

```text
outcomeId          = outcome:527d0373e75cadcd166e22b0
verificationState  = verified
baselineHead       = a9f431c675a5aa1183a06c9131def863ad8e5e69
observedHead       = 4559bbf87e86b55505f7b17e9d6592986abe78af
lineage            = ahead
failureReason      = null
nextCheckpointAllowed = true
```

Post-action workflow run: `34977754315`  
Replay artifact: `10400615165`  
Artifact digest: `sha256:f257ca53a417665548730ea7ab5f5257083fd7e41d43a8cd3b0eeda69473a7ea`

---

## 5. Durable closure

Outcome and next Trusted Checkpoint both passed exact read-after-write verification.

```text
next checkpoint = checkpoint:ffdbd0c35aa03628a8df2442
version         = 2
evidence cursor = 4559bbf87e86b55505f7b17e9d6592986abe78af
confirmation    = verified-outcome
closure receipt = continuity-closure:da325c65143af997730c7a43
```

Observed closure flags:

```text
outcomeReadBackVerified    = true
checkpointReadBackVerified = true
nextReentryAllowed         = true
```

A second fresh read then started from checkpoint v2 and produced:

```text
assessment validity = VALID
checkpoint ref      = checkpoint:ffdbd0c35aa03628a8df2442
history replay      = not required
```

This satisfies the Phase 6 requirement that a later re-entry can begin from the new trusted state rather than reconstructing checkpoint v1.

---

## 6. Adversarial result

The Phase 6G gate re-ran the accepted dedicated suites for:

- checkpoint integrity, persistence, idempotency and stale-version protection;
- fresh-evidence freshness, scope, missing/incomplete evidence and lineage;
- `VALID / INVALID / AMBIGUOUS` continuation semantics;
- protected Human Authority and response replay rejection;
- external report vs fresh-source outcome verification;
- failed / indeterminate outcome blocking;
- Outcome append-only persistence;
- verified closure and checkpoint CAS;
- Phase 5 frozen regression;
- Phase 4 frozen regression.

All Phase 6G adversarial jobs completed successfully in both the pre-action and post-merge workflow runs.

Observed real-run blocking metrics:

```text
false continuity claims            = 0
unverified successful outcomes     = 0
silent protected-authority guesses = 0
consequential evidence linkage     = present
human authority questions          = 0 / <=1
```

---

## 7. Evidence packaging note

One packaging mismatch was detected during acceptance review: the Stage-B artifact did not duplicate the Stage-A `02-fresh-evidence.json` and `03-assessment.json` files even though the Phase 6G evaluation document described a single final artifact containing them.

This did **not** affect runtime truth, verification, persistence, or closure. Both Stage-A and Stage-B artifacts are immutable, independently hashed, and together contain the complete transaction.

Phase 6H treats the two artifact digests above as one accepted replay set and does not claim that Artifact `10400615165` alone contains the complete pre/post transaction.

---

## 8. User-observed usefulness

The previously pending user usefulness boundary has now been resolved by an explicit post-run observation.

Recorded category:

```text
materially-reduced
```

Sanitized observation note:

> The continuity flow materially reduced reconstruction effort because the assistant already had the development progress and subsequent plan available; the user judged this beneficial to development efficiency and quality.

This is one user's observation from one real Nexus run. It is not converted into a productivity percentage, generalized causal claim, or source-evidence identity.

With this observation recorded, Phase 6G has no remaining user-evidence blocker and Phase 6H final acceptance may complete after its frozen regression gate passes.
