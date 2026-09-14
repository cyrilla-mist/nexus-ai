# Nexus Atlas — Phase 6 Real Continuity Loop Definition

**Status:** Definition only — implementation not started  
**Definition baseline:** `24fb442f8d272a32c444f7ba20fbdcdabf8021dd`  
**Precondition:** Phase 5 — Complete / Accepted / Merged  
**Knowledge input:** `Nexus-Atlas-Hackathon-Knowledge-Harvest.md`

---

## 1. Phase 6 purpose

Phase 6 exists to answer one product question:

> **Can Nexus take one previously trusted project state, compare it against fresh reality, determine whether continuation is still valid, ask at most one necessary human authority question, produce a bounded continuation plan, observe the resulting real work, verify the outcome from fresh evidence, and establish the next trusted continuation point?**

Phase 6 is not an expansion phase.

It is the first attempt to prove one real continuity transaction end to end.

The governing rule remains:

> **Single real loop first. Generalize second. Expand last.**

---

## 2. First real project: Nexus Atlas itself

The first Phase 6 target project is **Nexus Atlas**.

This choice is deliberate:

- the project is genuinely long-running;
- it already contains accepted Decisions, Evidence, Product Surface state, Roadmap history and frozen boundaries;
- it naturally experiences pauses and resumptions;
- its repository state changes for real rather than through a synthetic demo fixture;
- continuity mistakes would be visible and consequential to subsequent development;
- using Nexus to resume Nexus creates a direct product test without inventing another showcase project.

### Initial evidence source

The first external source of fresh project reality is the real GitHub repository:

`cyrilla-mist/nexus-ai`

The initial source scope should be intentionally narrow and read-only. Candidate evidence includes only the bounded repository facts needed for continuation, for example:

- current `main` head;
- commits after the checkpoint evidence cursor;
- merged / open pull requests relevant to the active phase;
- accepted workflow / CI status when it affects continuation;
- explicitly scoped issue or Roadmap state when it governs the next action.

Phase 6 does **not** authorize a generalized GitHub connector framework.

The core contract must remain provider-neutral even though GitHub is the first implementation source.

---

## 3. What Phase 6 must prove

A successful Phase 6 loop must demonstrate all of the following on the real Nexus project:

1. restore one durable Trusted Checkpoint;
2. collect fresh evidence from current project reality;
3. distinguish source unavailable, missing, invalid and successfully observed evidence;
4. resolve consequential findings to inspectable accepted evidence identities;
5. classify **continuation validity** as `VALID`, `INVALID` or `AMBIGUOUS`;
6. never treat the tri-state as a generic project-health score;
7. ask no human question when accepted evidence already determines a safe continuation;
8. ask at most one minimum necessary question when protected ambiguity remains;
9. produce one bounded continuation action / plan rather than a broad project-management plan;
10. keep external action execution outside autonomous Nexus control in Phase 6;
11. observe what actually happened after the user / authorized external tool performs the action;
12. perform a fresh re-read rather than trusting an action-return message;
13. record success only when the expected postcondition is actually observed;
14. persist an Outcome Record for the completed attempt;
15. establish the next Trusted Checkpoint only from verified outcome state;
16. prove by read-after-write that the new trusted artifact is durably observable;
17. support a later re-entry beginning from the new checkpoint rather than reconstructing the original one;
18. retain replayable evidence for the entire transaction.

---

## 4. Phase 6 loop

The target loop is:

```text
Trusted Checkpoint
        ↓
Fresh Project Evidence
        ↓
Evidence / Sufficiency Checks
        ↓
Continuity Assessment
VALID / INVALID / AMBIGUOUS
        ↓
Minimum Human Authority Question
only if consequential ambiguity remains
        ↓
Re-entry Package / Bounded Continuation Plan
        ↓
User or authorized external tool performs the real action
        ↓
Fresh Re-read
        ↓
Postcondition Verification
        ↓
Outcome Record
        ↓
Next Trusted Checkpoint
        ↓
Read-after-write Verification
```

A loop is not successful merely because a command, API call or user action reported success.

> **Success means the intended postcondition and the resulting trusted continuation artifact are observable after fresh reads.**

---

## 5. Authority model

Phase 6 must preserve the accepted Phase 4 / Phase 5 authority structure.

### Canonical Context Graph

Still owns canonical project truth.

It must not become a dumping ground for derived continuity results.

### Resolver / Ledger

Remain authoritative for effective Decision / Memory governance.

Phase 6 may consume accepted results; it must not fork those rules.

### Trusted Checkpoint

A **Trusted Checkpoint** is a bounded continuity artifact derived from accepted Nexus state.

It is not:

- a second Canonical Context Graph;
- a replacement Decision Ledger;
- a complete copy of the project;
- an AI summary treated as truth.

Its purpose is only to preserve the minimum trusted continuation boundary needed for a later re-entry.

### Continuity Assessment

A derived assessment over a Trusted Checkpoint plus fresh accepted evidence.

It may be model-assisted, but structural validity, accepted identities, authorization state and evidence linkage must remain deterministically checked.

### Human Authority Gate

The only place Phase 6 may cross a protected ambiguity boundary.

It must ask the smallest question necessary to resolve the consequential uncertainty.

### Outcome writer

Phase 6 may introduce one bounded writer for experimental Outcome / Trusted Checkpoint artifacts.

That writer must be:

- explicit;
- version-aware;
- idempotent or replay-safe;
- unable to mutate arbitrary Canonical Context;
- followed by read-after-write verification.

The exact storage implementation is not frozen by this definition. Provider-specific storage must not become the product contract.

---

## 6. Candidate Phase 6 primitives

The following shapes are conceptual contracts for later implementation design. Field names may be refined before runtime work begins, but the semantic boundaries are binding.

### 6.1 Trusted Checkpoint

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

Required semantics:

- references accepted project identities rather than duplicating their full contents;
- records the evidence boundary used to establish the checkpoint;
- distinguishes explicit confirmation from inference;
- cannot silently absorb new source observations.

### 6.2 Fresh Evidence Batch

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

Required semantics:

- fresh means retrieved during the current re-entry attempt;
- evidence is observation, not authorization;
- unavailable / missing / invalid / observed states remain distinct;
- every consequential interpreted finding resolves to accepted evidence identity.

### 6.3 Continuity Assessment

```js
{
  assessmentId,
  checkpointRef,
  evidenceBatchRef,
  validity, // VALID | INVALID | AMBIGUOUS
  preservedClaims,
  invalidatedClaims,
  invalidatedNextActions,
  unresolvedProtectedAmbiguity,
  evidenceRefs,
  explanation
}
```

Required semantics:

- `VALID` means the continuation point still holds;
- `INVALID` means one or more continuation assumptions / next actions no longer hold and a bounded replacement can be established without inventing protected intent;
- `AMBIGUOUS` means fresh evidence conflicts with protected intent / authority and one human decision is required;
- the assessment is not canonical truth by itself.

### 6.4 Human Authority Decision

```js
{
  authorityDecisionId,
  assessmentRef,
  question,
  allowedOptions,
  selectedOption,
  decidedAt,
  actorRef
}
```

Required semantics:

- absent when no consequential ambiguity exists;
- at most one question per bounded re-entry attempt;
- cannot be inferred from model confidence, source metadata or previous behavior;
- only resolves the ambiguity actually presented.

### 6.5 Re-entry Package

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

Required semantics:

- projection / continuation artifact only;
- does not become a competing canonical state store;
- one bounded next action, not a generic project plan;
- expected postcondition must be defined before the action is treated as complete.

### 6.6 Outcome Record

```js
{
  outcomeId,
  reentryRef,
  actionRef,
  attemptedAt,
  executionActor,
  expectedPostcondition,
  observedPostcondition,
  verificationState, // verified | failed | indeterminate
  verificationEvidenceRefs,
  failureReason,
  recordedAt
}
```

Required semantics:

- an action-return message is not the observed postcondition;
- `verified` requires fresh authoritative evidence;
- failed / indeterminate outcomes remain first-class records;
- an unsuccessful attempt must not manufacture a successful Trusted Checkpoint.

---

## 7. Phase 6 vs Phase 7

Phase 6 must close one real loop, which means it requires a **minimal durable Outcome Record and next Trusted Checkpoint**.

This does **not** collapse the later Outcome Write-back phase into Phase 6.

The distinction is:

### Phase 6 — prove one real transaction

- one project: Nexus Atlas;
- one bounded source: GitHub project evidence;
- one continuity workflow;
- one minimal persistence path for checkpoints / outcomes;
- enough write-back to prove that a later re-entry starts from verified outcome state;
- no claim of generalized product-level write-back infrastructure.

### Phase 7 — generalize Outcome / Trusted-State Write-back

Only after Phase 6 succeeds should Nexus generalize:

- storage / provider abstractions;
- wider outcome categories;
- reusable write-back policy;
- stronger lifecycle / retention rules;
- cross-source postcondition verification;
- user-facing write-back management;
- broader project support.

Therefore:

> **Phase 6 proves the loop. Phase 7 productizes the write-back capability.**

---

## 8. External action boundary

Phase 6 does not authorize an autonomous project-management or code-writing agent.

The first real loop should use this boundary:

```text
Nexus proposes bounded continuation
        ↓
Human authorizes if necessary
        ↓
Human / explicitly authorized external tool performs the real project action
        ↓
Nexus independently re-reads project reality
        ↓
Nexus verifies or rejects the claimed result
```

This keeps the experiment focused on continuity rather than conflating continuity with autonomous execution.

A later phase may evaluate bounded action execution separately.

---

## 9. First experiment design

The first Phase 6 experiment should occur during real Nexus development rather than through a synthetic demo.

### Experiment setup

1. establish a user-confirmed Trusted Checkpoint at a real stopping point;
2. persist its evidence cursor and governing references;
3. leave the project for a meaningful interruption window;
4. allow normal real project work / repository changes to occur;
5. return through the Phase 6 re-entry path rather than manually reconstructing state first.

### Required assessment outcomes

The implementation must support all three states in deterministic / adversarial tests, but the live experiment should report whichever state reality produces rather than forcing a scripted result.

Do not manufacture a conflict merely to demonstrate `AMBIGUOUS`.

### Real action

The bounded next action must be a genuine project action the user would have taken anyway.

Examples may include:

- accepting / rejecting a scoped Phase definition;
- merging an already-reviewed documentation or implementation PR;
- changing the active next milestone after fresh evidence invalidates the prior one;
- completing a bounded repository task whose postcondition is observable through GitHub.

The experiment must not invent busywork solely to create a favorable demo.

---

## 10. Product evidence and metrics

Phase 6 has two different success dimensions.

### 10.1 Blocking correctness evidence

These are non-negotiable:

- **0 false continuity claims** — Nexus must not state that a continuation assumption still holds when accepted evidence disproves it;
- **0 unverified successful outcomes** — no action may be recorded as successful without fresh postcondition evidence;
- **0 silent protected-authority guesses**;
- **100% evidence linkage for consequential findings**;
- **≤ 1 human authority question per bounded re-entry attempt**;
- successful checkpoint / outcome writes must pass read-after-write verification;
- failed and indeterminate verification must remain visibly non-success states.

### 10.2 Product-usefulness evidence

Record, but do not overclaim causality from one run:

- time from re-entry start to first trusted next action;
- number of stale assumptions identified before execution;
- number of source artifacts Nexus surfaced automatically;
- number of manual reconstruction steps the user still had to perform;
- whether the user needed to restate previously accepted project direction;
- whether the next re-entry can begin from the new checkpoint without replaying the prior history;
- user judgment: did the re-entry materially reduce reconstruction effort?

A single Phase 6 run is a product proof, not a statistically controlled trial.

The result should be reported truthfully as an observed case rather than generalized productivity evidence.

---

## 11. Replayable runtime evidence

Every accepted real loop should generate a sanitized evidence bundle conceptually equivalent to:

```text
continuity-run/
├── 01-checkpoint.json
├── 02-fresh-evidence.json
├── 03-assessment.json
├── 04-authority-decision.json        # only if required
├── 05-reentry-package.json
├── 06-action-observation.json
├── 07-fresh-verification.json
├── 08-outcome.json
├── 09-next-checkpoint.json            # only if valid to create
├── 10-write-readback.json
└── run-summary.json
```

The exact filenames are not binding. The evidence requirements are.

Sensitive credentials, private local paths, tokens and unrelated private content must never be included in a public evidence bundle.

---

## 12. Required failure / adversarial cases

Phase 6 implementation cannot be accepted using only a happy-path live run.

It must prove at least these classes:

### Evidence failures

- source unavailable;
- required evidence missing;
- malformed / invalid source response;
- stale evidence incorrectly offered as current;
- irrelevant evidence attempting to influence assessment.

### Validity failures

- previous next action invalidated while broader direction remains valid;
- protected direction conflict;
- evidence insufficient to distinguish two consequential interpretations;
- no meaningful change.

### Authority failures

- model tries to choose a protected option without authorization;
- source metadata is incorrectly treated as human intent;
- previous user choice is incorrectly reused for a new ambiguity.

### Outcome failures

- external action reports success but fresh evidence disagrees;
- action genuinely fails;
- verification source becomes unavailable after action;
- replay attempts to duplicate the same trusted write;
- checkpoint version changed before commit;
- next checkpoint would be based on an unverified outcome.

### Evaluation contamination

- prior run output must not be fed back as if it were fresh source truth;
- internal checkpoint / outcome storage must not silently contaminate GitHub project evidence collection;
- test fixtures must be distinguishable from live evidence.

---

## 13. Non-goals

Phase 6 explicitly excludes:

- multi-project Atlas;
- additional Territories;
- generalized source connector marketplace / framework expansion;
- autonomous coding or project-management execution;
- broad Outcome Write-back productization;
- new graph visualization;
- Sideglance-style general interpretation;
- DataHub as a required backend;
- Google / Gemini / Vertex / Cloudflare as required product infrastructure;
- a second canonical state database;
- redesigning the accepted Phase 5 Product Surface merely to look newer.

Any implementation proposal that requires these to prove the first loop is too broad.

---

## 14. Relationship to accepted Phase 5

Phase 6 must build downstream of, not reopen, Phase 5.

The following remain frozen unless a genuine defect is proven:

- Canonical Graph truth boundary;
- Resolver / Ledger governance authority;
- provider / validator / projector separation;
- Identity confirmation semantics;
- Candidate Evidence / Source Intake admission boundary;
- Phase 5 Product Surface truthfulness requirements;
- frozen Phase 4 / Phase 5 acceptance baselines.

Phase 6 may add new continuity artifacts and runtime behavior, but it must not redefine accepted Phase 5 semantics for convenience.

---

## 15. Phase 6 exit criteria

Phase 6 is Complete / Accepted only when:

1. a real Nexus Trusted Checkpoint is durably created and re-read;
2. at least one real re-entry run starts from that checkpoint;
3. fresh GitHub reality is collected through a bounded read path;
4. the run produces a valid Continuity Assessment with inspectable evidence;
5. any consequential ambiguity uses at most one Human Authority question;
6. a bounded real project action is identified and actually occurs;
7. Nexus independently re-reads the authoritative source afterward;
8. the outcome is classified `verified`, `failed` or `indeterminate` without inventing success;
9. a verified run establishes the next Trusted Checkpoint and proves read-after-write;
10. a subsequent re-entry can begin from that new checkpoint;
11. adversarial / failure tests prove the safety boundaries above;
12. a sanitized replayable runtime evidence bundle exists;
13. the accepted Phase 4 / Phase 5 regression suites remain green;
14. the user can describe whether the run reduced reconstruction effort without the documentation overstating that observation.

If these cannot be demonstrated, Phase 6 remains incomplete regardless of UI polish or test volume.

---

## 16. Implementation sequencing after this definition

Implementation should proceed in this order:

```text
6A — Entry Audit / source and storage boundary
6B — Trusted Checkpoint contract + bounded persistence
6C — Fresh Evidence + Continuity Assessment
6D — Human Authority Gate + Re-entry Package
6E — Outcome observation + fresh verification
6F — next checkpoint + read-after-write closure
6G — adversarial evaluation + real-run evidence
6H — final acceptance
```

These labels are planning aids, not permission to implement all slices at once.

Each slice must prove the minimum boundary needed for the next one.

---

## 17. Phase 6 definition decision

**Project:** Nexus Atlas itself  
**Fresh external evidence:** bounded read-only GitHub repository state  
**Primary proof:** one real, replayable continuity loop  
**Autonomous external execution:** not authorized  
**Minimal Outcome / Checkpoint persistence:** required to close the experiment  
**Generalized Outcome Write-back:** deferred to Phase 7  
**Multi-project / additional connectors / Territories:** deferred

The next authorized activity after this definition is a **Phase 6 Entry Audit** that maps the existing repository components to these contracts and chooses the smallest checkpoint persistence and GitHub evidence path without modifying Phase 4 / Phase 5 semantics.