# Nexus Atlas v0.1 — Outcome Observation + Fresh Verification Contract

**Status:** Binding Phase 6E contract  
**Parent:** Phase 6 — Real Continuity Loop  
**Upstream:** Re-entry Package v0.1  
**Scope:** pre-commit one observable postcondition, record the external action report as untrusted observation, independently re-read GitHub, derive verification state, and emit one immutable Outcome Record. Persistence and next-checkpoint advancement remain Phase 6F.

---

## 1. Goal

Phase 6E proves that Nexus does not confuse an execution report with a verified result.

```text
accepted Re-entry Package
        ↓
pre-execution Verification Envelope
(expected postcondition frozen)
        ↓
human / explicitly authorized external tool acts
        ↓
Action Observation
(untrusted report)
        ↓
fresh GitHub Source Snapshot
+ bounded commit-range proof when required
        ↓
Outcome Verification
verified | failed | indeterminate
        ↓
Outcome Record
```

Phase 6E does **not** autonomously execute the action, persist the Outcome Record, or create the next Trusted Checkpoint.

---

## 2. Governing rules

1. An action-return message is never success authority.
2. The expected postcondition must be frozen **before** the external action is treated as complete.
3. Verification must use a GitHub read captured after the action attempt.
4. Verification must bind the exact Re-entry Package repository and baseline head.
5. `verified` requires accepted fresh authoritative evidence.
6. `failed` means a complete authoritative view disproves the declared postcondition.
7. `indeterminate` means the verifier cannot safely prove or disprove the postcondition.
8. A failed or indeterminate attempt still produces an Outcome Record.
9. Only `verified` may authorize Phase 6F to establish a next Trusted Checkpoint.
10. Prior run output, action reports, model confidence and local state are never fresh verification evidence.

---

## 3. Accepted upstream input

The runtime consumes one Re-entry Package accepted by `validateReentryPackageV01`.

The package already freezes:

```text
projectRef
checkpointRef
assessmentRef
evidenceWindowRef
nextAction
verificationPlan.provider = github
verificationPlan.scopeRef
verificationPlan.cursorType = default-branch-head
verificationPlan.baselineValue
verificationPlan.requirement = fresh-authoritative-reread
```

Phase 6E must not change its action, authority decision, evidence references or baseline.

---

## 4. Verification Envelope

Before external execution, Phase 6E freezes one expected postcondition.

### 4.1 Proposal

```js
{
  proposalVersion: "nexus-atlas.postcondition-proposal.v0.1",
  reentryPackageRef,
  actionRef,
  conditionType,
  expectedValue,
  explanation
}
```

Accepted v0.1 condition types are intentionally narrow:

```text
github-default-branch-head-advanced
github-commit-present-after-baseline
```

For `github-default-branch-head-advanced`:

```text
expectedValue = null
```

For `github-commit-present-after-baseline`:

```text
expectedValue = exact lowercase 40-character commit SHA
```

The expected commit must already be grounded in the Re-entry Package evidence universe through this exact source identity:

```text
github:commit:<verificationPlan.scopeRef>:<expectedValue>
```

This prevents a post-action model from inventing a convenient target SHA.

### 4.2 Envelope artifact

```js
{
  envelopeVersion: "nexus-atlas.action-verification-envelope.v0.1",
  envelopeId,
  projectRef,
  reentryPackageRef,
  actionRef,
  declaredAt,
  baseline: {
    provider: "github",
    scopeRef,
    cursorType: "default-branch-head",
    value
  },
  expectedPostcondition: {
    conditionType,
    expectedValue
  },
  explanation,
  authority: "declared-postcondition-boundary"
}
```

Rules:

- `declaredAt` is a strict offset ISO timestamp;
- `declaredAt >= reentryPackage.preparedAt`;
- actionRef must equal the package next action;
- baseline is copied from the package verification plan;
- envelope identity is deterministic and immutable.

The envelope is not an outcome claim.

---

## 5. Action Observation

External execution remains outside Nexus autonomous control.

The caller records only what the executor reported:

```js
{
  observationVersion: "nexus-atlas.action-observation.v0.1",
  observationId,
  projectRef,
  reentryPackageRef,
  envelopeRef,
  actionRef,
  attemptedAt,
  executionActor,
  reportedState, // reported-success | reported-failure | reported-unknown
  reportSummary,
  authority: "external-action-report"
}
```

Rules:

- binds the current package + envelope + action;
- `attemptedAt >= envelope.declaredAt`;
- executionActor is explicit;
- reportSummary is bounded presentation text;
- `reported-success` does not unlock any success capability;
- identity is deterministic and immutable.

The report may disagree with later source evidence. Fresh authoritative evidence wins.

---

## 6. Fresh GitHub verification input

### 6.1 Fresh Source Snapshot

When GitHub is readable, Phase 6E consumes one accepted GitHub Source Snapshot from the frozen Phase 4 validator.

It must satisfy:

```text
snapshot.scope.repositoryRef = envelope.baseline.scopeRef
snapshot.capturedAt > actionObservation.attemptedAt
repository + default branch records are present
```

The branch head is the fresh observed head.

### 6.2 Commit-range proof

If the fresh head differs from the baseline, v0.1 requires an accepted GitHub Commit Range Proof bound to:

```text
repositoryRef = envelope.baseline.scopeRef
baseSha      = envelope.baseline.value
headSha      = fresh branch head
capturedAt   = sourceSnapshot.capturedAt
```

The proof must be complete before absence of an expected commit may be treated as `failed`.

If the head changed but no complete accepted proof is available, verification is `indeterminate`.

### 6.3 Source failure

When no accepted Source Snapshot can be produced because the source read failed, Phase 6E accepts one bounded source-failure observation:

```js
{
  provider: "github",
  repositoryRef,
  failedAt,
  errorCode
}
```

Accepted source failure codes are the source-adapter failure family that prevents an authoritative read, including auth/forbidden/not-found/rate-limit/unavailable/invalid-response/scope-mismatch failures.

A source failure always yields `indeterminate`, never `verified` or `failed`.

---

## 7. Verification semantics

### 7.1 `github-default-branch-head-advanced`

```text
fresh head == baseline
  → failed

complete proof relation == ahead
  → verified

relation behind/diverged OR proof missing/incomplete
  → indeterminate
```

The verifier does not treat an arbitrary different SHA as success without lineage proof.

### 7.2 `github-commit-present-after-baseline`

```text
fresh head == baseline
  → failed

complete proof relation == ahead
AND expected commit is present in proof.commits
  → verified

complete proof relation == ahead
AND expected commit is absent
  → failed

relation behind/diverged OR proof missing/incomplete
  → indeterminate
```

A reported-success message cannot override these rules.

---

## 8. Outcome Verification artifact

```js
{
  verificationVersion: "nexus-atlas.outcome-verification.v0.1",
  verificationId,
  projectRef,
  reentryPackageRef,
  envelopeRef,
  actionObservationRef,
  verifiedAt,
  verificationState, // verified | failed | indeterminate
  expectedPostcondition,
  observedPostcondition: {
    baselineHead,
    observedHead,
    lineage,
    expectedValueObserved
  },
  verificationEvidenceRefs,
  failureReason,
  authority: "fresh-source-verification",
  capabilities: {
    outcomeRecordAllowed: true,
    nextCheckpointAllowed: boolean
  }
}
```

Rules:

- `nextCheckpointAllowed = true` only for `verified`;
- verificationEvidenceRefs contain only identities from the fresh post-action source/proof;
- `failed` must name the disproved condition;
- `indeterminate` must name the missing/unsafe verification boundary;
- identity is deterministic and immutable.

For source failure, observedHead/lineage/expectedValueObserved are null and verification evidence may be empty.

---

## 9. Outcome Record

Every completed verification attempt emits one Outcome Record, including failed and indeterminate attempts.

```js
{
  outcomeVersion: "nexus-atlas.outcome-record.v0.1",
  outcomeId,
  projectRef,
  reentryRef,
  verificationEnvelopeRef,
  actionObservationRef,
  verificationRef,
  actionRef,
  attemptedAt,
  executionActor,
  expectedPostcondition,
  observedPostcondition,
  verificationState,
  verificationEvidenceRefs,
  failureReason,
  recordedAt,
  authority: "derived-outcome-record",
  capabilities: {
    persistAllowed: true,
    nextCheckpointAllowed: boolean
  }
}
```

Rules:

- Outcome Record copies accepted verification state; it does not reinterpret it;
- `recordedAt >= verification.verifiedAt`;
- `nextCheckpointAllowed` is true only for verified outcomes;
- the record is immutable and deterministic;
- persistence remains Phase 6F.

---

## 10. Failure and contamination boundary

Phase 6E fails closed on malformed/tampered artifacts or cross-run bindings.

It must never:

- treat the action report as source evidence;
- use checkpoint/outcome IDs as verification evidence;
- use the pre-action Fresh Evidence Window as post-action verification;
- accept a Source Snapshot captured at or before the action attempt;
- accept a commit proof for another repository/baseline/head/time;
- infer success from `reported-success`;
- infer failure from `reported-failure` when fresh source evidence proves the postcondition;
- create a next checkpoint or write canonical state.

---

## 11. Determinism and immutability

For identical accepted inputs:

- envelopeId is identical;
- observationId is identical;
- verificationId is identical;
- outcomeId is identical;
- ordering of evidence identities is deterministic;
- all outputs are deeply immutable;
- caller inputs remain unchanged.

---

## 12. Acceptance boundary

Phase 6E is accepted only when executable tests prove at minimum:

1. accepted Re-entry Package validator is reused;
2. postcondition is frozen before the action observation;
3. commit-specific postconditions are grounded in package evidence;
4. current action/package/envelope bindings are exact;
5. action-return success alone cannot verify an outcome;
6. fresh snapshot must be captured after the action attempt;
7. unchanged head produces `failed` for the two v0.1 success conditions;
8. complete `ahead` lineage verifies head-advanced;
9. expected commit present in complete `ahead` proof verifies commit-present;
10. expected commit absent from a complete proof produces `failed`;
11. missing/incomplete proof produces `indeterminate` when lineage is required;
12. source read failure produces `indeterminate`;
13. behind/diverged lineage does not silently verify;
14. fresh verification evidence identities are inspectable and current;
15. failed/indeterminate outcomes still emit Outcome Records;
16. only verified outcome enables next-checkpoint capability;
17. deterministic IDs, deep immutability and caller-input preservation hold;
18. Phase 6D / 6C / 6B / Phase 5 / Phase 4 regressions remain green.

After Phase 6E acceptance, the next authorized work is **Phase 6F — persist Outcome Record + derive/write/read-back the next Trusted Checkpoint**.
