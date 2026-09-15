# Nexus Atlas — Phase 6G Adversarial Evaluation + First Real Run

**Status:** Binding Phase 6G evaluation gate  
**Parent:** Phase 6 — Real Continuity Loop  
**Upstream:** accepted Phase 6B–6F runtime  
**Live target:** `cyrilla-mist/nexus-ai` default branch only

---

## 1. Purpose

Phase 6G does not add another continuity authority. It evaluates the accepted runtime against adversarial cases and then uses that same runtime for the first real Nexus continuity transaction.

The real run must begin from the human-confirmed Trusted Checkpoint recorded in `evaluation/phase6g/real-run/manifest.json`.

The external action is the genuine repository action of merging the Phase 6G evaluation implementation itself. It is not synthetic busywork. Nexus must freeze the expected postcondition before that merge, then independently re-read GitHub after the merge and decide whether the action actually succeeded.

---

## 2. Blocking adversarial coverage

Phase 6G re-runs the accepted dedicated suites rather than inventing a competing test model.

| Required adversarial class | Executable evidence |
| --- | --- |
| source unavailable / malformed / scope mismatch | Phase 4 Source Adapter acceptance + Phase 6E source-failure cases |
| stale evidence / missing evidence / incomplete range | Fresh Evidence Window acceptance |
| irrelevant evidence affecting assessment | Continuity Assessment evidence-universe rejection |
| previous next action invalidated while direction/objective remain | Continuity Assessment `INVALID` cases |
| protected direction conflict | Continuity Assessment `AMBIGUOUS` protected-intent cases |
| insufficient consequential choice | Continuity Assessment + Human Authority Gate cases |
| model chooses protected option without authority | Human Authority Gate fail-closed cases |
| prior answer reused as new authority | Human Authority Decision replay/binding cases |
| external action reports success but GitHub disagrees | Outcome Verification unchanged-head case |
| external action reports failure but GitHub proves success | Outcome Verification fresh-proof case |
| verification source unavailable | Outcome Verification indeterminate source-failure case |
| replay duplicates trusted write | Outcome Store + Trusted Checkpoint Store idempotency cases |
| stale checkpoint version | Continuity Closure CAS conflict case |
| unverified outcome attempts checkpoint advancement | Continuity Closure fail-closed case |
| internal continuity artifacts treated as fresh GitHub evidence | evidence-universe / source-identity rejection cases |
| frozen Phase 4 / Phase 5 behavior regresses | Phase 4 and Phase 5 acceptance workflows |

Phase 6G is blocked if any upstream dedicated suite is red.

---

## 3. Human-confirmed starting boundary

The confirmed starting boundary is:

```text
project        = project:nexus-atlas
repository     = cyrilla-mist/nexus-ai
trustedDirection
  = Prove one real continuity loop before generalizing Nexus Atlas.
activeObjective
  = Run Phase 6G adversarial evaluation and the first real Nexus continuity-run evidence.
acceptedNextAction
  = Implement and execute the bounded Phase 6G adversarial evaluation and first real continuity-run evidence flow.
evidenceCursor = main @ a9f431c675a5aa1183a06c9131def863ad8e5e69
ambiguity      = none
confirmation   = explicit current human confirmation
```

The runtime must build this through the accepted Initial Alignment builder, persist it through the file-backed Trusted Checkpoint store, and prove exact read-after-write before collecting fresh project evidence.

---

## 4. Two-stage real transaction

### Stage A — before the real action

The pull-request workflow must:

1. build the Initial Alignment proposal from the recorded confirmed boundary;
2. create and durably re-read Trusted Checkpoint v1;
3. live-read GitHub through the frozen Phase 4 Source Adapter boundary;
4. require the current default-branch head to equal the confirmed cursor;
5. build a complete Fresh Evidence Window;
6. derive a `VALID` Continuity Assessment without a Human Authority question;
7. build one Re-entry Package;
8. freeze `github-default-branch-head-advanced` as the expected postcondition;
9. upload the sanitized pre-action evidence as a workflow artifact.

The pull request must not be merged unless Stage A succeeds.

### Stage B — after the real action

The real external action is merging the Phase 6G pull request to `main`.

The post-merge workflow must:

1. download the exact Stage-A evidence artifact;
2. re-read the durable initial checkpoint from its store artifact;
3. perform a new live GitHub read;
4. prove complete `ahead` lineage from the frozen baseline to the new `main` head;
5. record GitHub's merge result only as an Action Observation;
6. independently derive Outcome Verification from the fresh source read;
7. require `verificationState = verified` before checkpoint advancement;
8. append and re-read the Outcome Record;
9. CAS-write and re-read Trusted Checkpoint v2;
10. emit a Continuity Closure Receipt only after both durable read-backs succeed;
11. start one additional fresh re-entry from checkpoint v2 and require that it can produce a valid assessment without replaying checkpoint v1 history;
12. upload a sanitized replayable full-run artifact.

---

## 5. Replayable evidence bundle

The final artifact must contain, at minimum:

```text
01-checkpoint.json
02-fresh-evidence.json
03-assessment.json
05-reentry-package.json
06-action-observation.json
07-fresh-verification.json
08-outcome.json
09-next-checkpoint.json
10-write-readback.json
11-next-reentry-window.json
12-next-reentry-assessment.json
run-summary.json
runtime/trusted-checkpoints.json
runtime/outcomes.json
```

No token, credential, local machine path, private chat content, author email, or unrelated GitHub payload may be serialized.

---

## 6. Real-run acceptance conditions

The real run is accepted only if all are true:

- the first checkpoint is created from explicit human confirmation and survives exact durable read-back;
- the pre-action live head equals the confirmed checkpoint cursor;
- the pre-action assessment is evidence-linked and `VALID`;
- no Human Authority question is asked when none is required;
- the merge report is not treated as verification;
- a fresh post-action GitHub read proves complete `ahead` lineage;
- the Outcome Record is `verified` only from fresh source evidence;
- Outcome and next-checkpoint writes both survive exact read-back;
- the next checkpoint advances exactly one version and uses `verified-outcome` authority;
- a subsequent re-entry starts from the new checkpoint successfully;
- all adversarial and frozen regression suites remain green;
- the evidence bundle is replayable and sanitized;
- user usefulness judgment remains explicitly unfilled until the user is asked; the runtime must not infer it.

After these conditions are met, Phase 6G may be marked **Accepted** and Phase 6H final acceptance may begin.
