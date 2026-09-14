# Nexus Atlas v0.1 — Real Continuity Loop Contract

**Status:** Binding design contract for Phase 6 implementation  
**Product phase:** Phase 6 — Real Continuity Loop  
**Implementation status:** Not started

---

## 1. Contract goal

This contract defines the minimum semantic and authority boundaries for the first real Nexus continuity transaction.

It governs:

`Trusted Checkpoint → Fresh Evidence → Continuity Assessment → Human Authority if required → Re-entry Package → observed real action → Fresh Verification → Outcome Record → next trusted continuation state`

The first target project is Nexus Atlas itself. GitHub is the first bounded fresh-evidence source, but GitHub semantics must not become the core contract.

---

## 2. Non-negotiable invariants

### C1. Old trusted state is not automatically current state

A Trusted Checkpoint is only a prior trusted continuation boundary.

It must be evaluated against fresh accepted evidence before its next action / assumptions are reused.

### C2. Observation, inference, authority and committed state remain distinct

```text
observed evidence
  ≠ interpreted finding
  ≠ human authority
  ≠ committed trusted state
```

No layer may collapse these distinctions for convenience.

### C3. Source failure is not ambiguity

The following must block continuity assessment rather than produce `AMBIGUOUS`:

- source unavailable;
- required evidence missing;
- structurally invalid / rejected evidence;
- checkpoint cannot be safely loaded / validated.

`AMBIGUOUS` is reserved for a validly observed continuity situation where accepted evidence cannot resolve a consequential protected choice without human authority.

### C4. Continuity validity is not project health

`VALID`, `INVALID`, and `AMBIGUOUS` apply only to whether the prior continuation point can safely govern the next continuation.

They must not be used as generic labels for project quality, success or failure.

### C5. Consequential findings require inspectable evidence identity

Every finding that changes continuation validity, invalidates an accepted next action, or triggers Human Authority must resolve to accepted evidence identity.

Free-form model citations alone are insufficient.

### C6. Human Authority is minimum and bounded

A bounded re-entry attempt may ask at most one consequential authority question.

The system must not ask a human to decide information that accepted evidence already determines.

### C7. External execution remains outside autonomous Nexus control in Phase 6

Nexus may produce a bounded continuation action. It may observe a real action performed by the user or explicitly authorized external tool.

Phase 6 does not authorize general autonomous source mutation, coding or project management.

### C8. Action success requires a fresh authoritative re-read

A command, API response, UI success state or user assertion is not enough to mark an Outcome `verified`.

The expected postcondition must be independently observable from accepted fresh evidence.

### C9. Failed / indeterminate outcomes are durable first-class results

A failed or unverifiable action attempt must not disappear from the continuity history and must not manufacture a successful next Trusted Checkpoint.

### C10. Trusted writes are bounded and replay-safe

Checkpoint / Outcome persistence must have:

- one explicit write authority;
- version / compare-and-swap protection or equivalent;
- idempotency / replay protection;
- read-after-write verification.

### C11. Internal continuity artifacts must not contaminate source evidence

Checkpoint / Outcome storage, evaluation fixtures and previous runtime outputs must not silently appear as fresh external project evidence unless the source scope explicitly treats them as project evidence.

### C12. Phase 4 / Phase 5 accepted semantics remain upstream authority

Phase 6 must not reimplement or override:

- Canonical Graph truth semantics;
- Decision / Memory Resolver / Ledger governance;
- Identity confirmation semantics;
- Candidate Evidence admission semantics;
- Phase 5 Product Surface authority rules.

---

## 3. Result envelope

A Phase 6 continuity attempt must distinguish **attempt status** from **continuity validity**.

Conceptual shape:

```js
{
  runId,
  checkpointRef,
  startedAt,
  status, // assessed | blocked
  blockedReason, // null or bounded reason code
  evidenceBatchRef,
  assessment,
  reentryPackage,
  outcome,
  nextCheckpointRef,
  diagnostics
}
```

### `status: "blocked"`

Used when the system cannot safely reach continuity validity.

Allowed initial reason classes:

- `checkpoint-unavailable`
- `checkpoint-invalid`
- `source-unavailable`
- `required-evidence-missing`
- `evidence-invalid`
- `evidence-scope-violation`

When blocked:

- `assessment.validity` must not be invented;
- no Human Authority question should be used to mask the infrastructure/evidence failure;
- no continuation action may be presented as trusted;
- no successful next checkpoint may be created.

### `status: "assessed"`

Requires accepted checkpoint + sufficient accepted fresh evidence.

Only then may `assessment.validity` be one of:

- `VALID`
- `INVALID`
- `AMBIGUOUS`

---

## 4. Trusted Checkpoint contract

A Trusted Checkpoint preserves only the bounded state needed for safe continuation.

Conceptual minimum:

```js
{
  checkpointId,
  projectRef,
  version,
  createdAt,
  trustedDirection,
  activeObjective,
  acceptedNextAction,
  evidenceCursor,
  governingRefs,
  unresolvedProtectedAmbiguities,
  provenance,
  confirmation
}
```

### Required rules

1. `checkpointId` is stable and opaque.
2. `projectRef` identifies exactly one project scope.
3. `version` participates in write-race / replay protection.
4. `trustedDirection`, `activeObjective` and `acceptedNextAction` must be grounded in accepted upstream state or explicit human confirmation.
5. `governingRefs` reference accepted Nexus identities; the checkpoint does not clone full canonical records.
6. `unresolvedProtectedAmbiguities` cannot be silently dropped.
7. `confirmation` distinguishes explicit human confirmation from derived / inherited state.
8. `evidenceCursor` defines the accepted observation boundary from which fresh evidence collection begins.
9. source observations after that cursor do not become trusted merely because they are newer.
10. checkpoint writes require bounded write authority and read-back verification.

### Initial checkpoint

The first experimental checkpoint may be established through a one-time Initial Alignment flow:

`accepted current project reality → proposed bounded checkpoint → explicit user confirmation → durable write → read-back verification`

This mirrors the accepted A+C bootstrap principle without importing STATEWAKE runtime as a second product.

### VALID refresh

A `VALID` run that produces no consequential new project state must not create a semantically different checkpoint merely to inflate history.

Implementation may advance the verified evidence boundary through a bounded checkpoint refresh / verified run record, but it must preserve the existing trusted semantic state and remain replay-safe.

---

## 5. Fresh Evidence contract

Conceptual minimum:

```js
{
  batchId,
  projectRef,
  observedAt,
  source,
  cursorFrom,
  cursorTo,
  records,
  diagnostics
}
```

### Required rules

1. evidence is fetched during the current attempt;
2. source-local authority does not become human / canonical authority;
3. accepted evidence identity is deterministic and inspectable;
4. cursor ordering must be explicit enough to prevent accidental replay as "new" evidence;
5. irrelevant records must not influence the assessment merely because they were retrieved;
6. unavailable, missing, invalid and observed states remain distinct;
7. evidence collection must have a bounded project/scope allow-list;
8. private credentials, tokens and unrelated private payloads must never enter replay evidence;
9. prior Nexus run outputs / checkpoint storage are excluded from GitHub evidence unless deliberately included as project artifacts by contract;
10. model interpretation cannot fabricate records absent from the accepted batch.

---

## 6. Continuity Assessment contract

Conceptual minimum:

```js
{
  assessmentId,
  checkpointRef,
  evidenceBatchRef,
  validity,
  preservedClaims,
  invalidatedClaims,
  invalidatedNextActions,
  unresolvedProtectedAmbiguity,
  evidenceRefs,
  explanation
}
```

### VALID

Use only when fresh accepted evidence does not invalidate the trusted continuation boundary.

A project may contain changes and still be `VALID` if those changes do not invalidate protected direction / accepted next action / governing assumptions.

Required behavior:

- no Human Authority question solely for cosmetic change;
- preserve valid trusted state;
- surface meaningful changes without turning them into invented conflict.

### INVALID

Use when one or more continuation assumptions / accepted next actions no longer hold **and** accepted evidence is sufficient to establish a bounded replacement without inventing protected user intent.

Required behavior:

- identify exactly what became invalid;
- preserve still-valid direction / decisions;
- do not treat "something changed" as total project invalidity;
- produce a bounded replacement only when evidence + accepted authority allow it.

### AMBIGUOUS

Use only when accepted fresh evidence reveals a consequential protected choice that cannot safely be resolved from existing authority.

Required behavior:

- identify one protected ambiguity;
- resolve supporting evidence deterministically;
- ask one minimum authority question;
- do not choose an option before explicit human response;
- do not turn transport/evidence failure into ambiguity.

---

## 7. Human Authority Gate contract

Conceptual minimum:

```js
{
  authorityDecisionId,
  assessmentRef,
  question,
  allowedOptions,
  selectedOption,
  actorRef,
  decidedAt
}
```

### Required rules

1. absent for `VALID` unless a separate consequential action requires explicit product confirmation later;
2. absent for `INVALID` when a bounded continuation follows from already accepted authority;
3. required for `AMBIGUOUS` before final trusted continuation can be established;
4. maximum one question in a bounded re-entry attempt;
5. allowed options must be bounded by the actual ambiguity;
6. previous user choices are not implicit authorization for a new ambiguity;
7. source metadata, branch names, model confidence or majority-agent opinion cannot substitute for human authority;
8. unanswered / cancelled authority leaves the run unresolved rather than inventing default consent.

---

## 8. Re-entry Package contract

Conceptual minimum:

```js
{
  reentryId,
  checkpointRef,
  assessmentRef,
  whatChanged,
  whatStillHolds,
  boundedNextAction,
  authorityDecisionRef,
  evidenceRefs,
  actionExpectedPostcondition
}
```

### Required rules

1. a projection / continuation artifact, never canonical truth by itself;
2. explicitly separates changed state from preserved state;
3. one bounded next action only for the initial real-loop proof;
4. action must reference a predeclared expected postcondition;
5. `AMBIGUOUS` cannot produce a trusted final next action until authority is supplied;
6. no action should be created when the run is blocked;
7. package explanation may be model-assisted but identities, authority and postconditions must be structurally validated.

---

## 9. Real action observation contract

Phase 6 does not own generic external execution.

The execution actor may be:

- the user;
- an explicitly authorized external coding/tool workflow;
- an existing repository operation performed outside the continuity runtime.

The continuity system may record that an attempt occurred, but this is not yet proof of success.

Conceptual observation:

```js
{
  actionRef,
  executionActor,
  reportedAt,
  reportedResult,
  observationOnly: true
}
```

The `reportedResult` must never be reused as the authoritative verification result.

---

## 10. Outcome Verification contract

Conceptual minimum:

```js
{
  outcomeId,
  reentryRef,
  actionRef,
  expectedPostcondition,
  observedPostcondition,
  verificationState, // verified | failed | indeterminate
  verificationEvidenceRefs,
  failureReason,
  recordedAt
}
```

### `verified`

Allowed only when fresh accepted evidence proves the intended postcondition.

### `failed`

Use when fresh accepted evidence proves the intended postcondition did not occur / an incompatible state occurred.

### `indeterminate`

Use when the action may have occurred but accepted verification evidence cannot currently establish success or failure, including verification-source outage.

### Required rules

1. write/API success alone cannot produce `verified`;
2. human assertion alone cannot produce `verified` when an authoritative observable postcondition exists;
3. each consequential postcondition must resolve to verification evidence identity;
4. `failed` and `indeterminate` must not create successful semantic continuation state;
5. outcome attempts are durable enough to prevent silent retry history loss;
6. repeated verification may move `indeterminate` to `verified` or `failed` only with new evidence and an auditable transition.

---

## 11. Next Trusted Checkpoint rules

A semantically new Trusted Checkpoint may be established only when:

- the current run was not blocked;
- required Human Authority was resolved;
- the real project action / state transition relevant to the checkpoint is `verified`;
- governing accepted references remain valid;
- write version / idempotency checks pass;
- read-after-write confirms the intended checkpoint state.

If outcome is `failed` or `indeterminate`:

- preserve the failed / indeterminate Outcome Record;
- do not claim the proposed continuation as trusted;
- keep the previous checkpoint or establish only a specifically authorized failure-state checkpoint if later contract work proves this necessary.

The initial Phase 6 implementation should prefer preserving the previous trusted checkpoint over inventing a new failure checkpoint.

---

## 12. Persistence boundary

Phase 6 needs minimal durability to prove a later re-entry can begin from verified outcome state.

The persistence implementation is intentionally not part of the product identity.

Allowed implementation characteristics:

- small file-backed / database-backed / cloud-backed adapter behind a narrow contract;
- append-only Outcome history where practical;
- checkpoint versioning;
- explicit write/read APIs;
- deterministic serialization;
- sanitized replay export.

Forbidden shortcuts:

- using browser LocalStorage as the only trusted store;
- writing derived assessment results into the Canonical Graph as source truth;
- storing raw credentials / tokens;
- treating GitHub commits created only by Nexus internal bookkeeping as automatic external evidence;
- provider-specific fields leaking into the core contract without an adapter boundary.

---

## 13. Replay / idempotency rules

A real continuity run must have a stable `runId` or equivalent idempotency identity.

Required behavior:

- re-submitting the same successful checkpoint write cannot create duplicate trusted checkpoints;
- re-submitting the same Outcome Record cannot create duplicate success history;
- a stale checkpoint version cannot overwrite a newer trusted state;
- repeated fresh reads may return the same source records without reclassifying them as new changes;
- replaying an old run bundle cannot substitute for current source retrieval;
- live and fixture modes must be explicitly distinguishable.

---

## 14. Model boundary

A model may assist with:

- identifying candidate meaningful changes;
- explaining why evidence may affect continuation;
- proposing bounded interpretations;
- summarizing changed / preserved state;
- phrasing the minimum authority question.

A model must not be sole authority for:

- source record identity;
- freshness / cursor validity;
- schema validity;
- checkpoint versioning;
- human authorization;
- accepted Decision / Memory governance;
- persistent writes;
- postcondition verification;
- Outcome success state.

Deterministic guards must reject model output that references unknown evidence, invalid authorities or impossible contract states.

---

## 15. Product Surface boundary

Phase 6 may later add a bounded Re-entry view, but UI work is downstream of accepted runtime semantics.

The browser must not:

- recalculate continuity validity independently;
- invent evidence references;
- persist Trusted Checkpoints directly;
- translate checkbox / local selection into human authority;
- turn blocked source state into `AMBIGUOUS`;
- claim action success before fresh verification;
- hide failed / indeterminate outcomes.

Phase 5 Product Surface remains accepted and must not be redesigned merely to host Phase 6.

---

## 16. First-source boundary — GitHub

The first implementation may use GitHub repository evidence, but must constrain scope.

Recommended initial evidence categories:

- exact repository identity;
- current `main` head;
- commits after checkpoint cursor;
- bounded PR metadata relevant to the active continuation;
- relevant workflow conclusion;
- explicitly referenced Roadmap / issue state when part of the checkpoint contract.

Do not begin with:

- arbitrary organization-wide scanning;
- every issue / PR / branch;
- user profile data;
- credentials or private secret endpoints;
- generalized GitHub write actions;
- unrelated repositories.

The source adapter should expose Nexus-native evidence records rather than make GitHub response shapes the continuity model.

---

## 17. Blocking product metrics

Phase 6 acceptance requires:

- `falseContinuityClaims = 0`;
- `unverifiedSuccessClaims = 0`;
- `silentProtectedAuthorityGuesses = 0`;
- `consequentialEvidenceCoverage = 100%`;
- `humanAuthorityQuestionsPerBoundedRun <= 1`;
- verified trusted writes pass read-after-write;
- failed / indeterminate outcomes remain non-success.

These are correctness metrics, not marketing metrics.

Usefulness observations such as time-to-trusted-action and reduced manual reconstruction are recorded separately and must not override correctness.

---

## 18. Phase 6 / Phase 7 split

Phase 6 is allowed the **minimum durable Outcome + Checkpoint write path necessary to prove one real loop**.

Phase 7 remains responsible for generalizing Outcome / Trusted-State Write-back into a reusable product capability.

This distinction is binding:

> **Phase 6 proves one loop. Phase 7 generalizes the write-back system.**

Do not use Phase 6 as justification for multi-project, multi-source or generalized persistence expansion.

---

## 19. Acceptance principle

Phase 6 is not accepted because:

- the UI looks complete;
- unit tests pass;
- a model gives plausible explanations;
- a user clicked the recommended action;
- an API returned HTTP 200.

It is accepted only when one real Nexus return-to-work event creates a replayable evidence chain from prior trusted state through fresh verification to a next trusted continuation point, while all blocking failure / adversarial cases remain safe.
