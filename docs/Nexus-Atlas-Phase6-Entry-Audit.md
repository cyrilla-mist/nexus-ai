# Nexus Atlas — Phase 6 Entry Audit

**Status:** Complete — implementation entry decision  
**Audit date:** 2026-09-14  
**Repository:** `cyrilla-mist/nexus-ai`  
**Audit baseline:** `5a9e6b050709f3f013e8b4073be231a318b8db41`  
**Phase 6 runtime:** Not started

---

## 1. Audit decision

Phase 6 may proceed without reopening the accepted Phase 4 / Phase 5 runtime.

The smallest safe implementation path is:

```text
accepted Nexus context/governance semantics
        +
new Phase-6 Trusted Checkpoint store
        +
frozen Phase-4 GitHub Source Snapshot
        ↓
new Fresh Evidence Window
        ↓
new Continuity Assessment
        ↓
new Human Authority Gate
        ↓
new Re-entry Package
        ↓
human / explicitly authorized external action
        ↓
fresh GitHub Source Snapshot
        ↓
new Outcome Verification
        ↓
new Outcome Record + next Trusted Checkpoint
        ↓
read-after-write verification
```

The key architectural decision is **composition, not retrofit**.

Phase 6 should reuse accepted upstream outputs and source snapshots, then add a new bounded continuity layer downstream. It should not turn legacy continuity code, Memory storage or the Phase 4 GitHub adapter into new authorities by modifying them in place.

---

## 2. Repository components audited

The audit reviewed the current accepted repository structure around:

- `experience/context-v02/self-context-provider.mjs`;
- `experience/context-v03/generalized-context-package-builder.mjs`;
- `experience/source-v01/github-source-adapter.mjs`;
- `experience/source-v01/source-snapshot-validator.mjs`;
- `context/continuity/continuity-context-provider.mjs`;
- `experience/continuity/*`;
- `continuity/scenarios/nexus-self-reentry.json`;
- `memory/memory-store.js`;
- `execution/*`;
- accepted Phase 5 Product Surface files and acceptance gates.

---

## 3. Reuse classification

| Component | Phase 6 decision | Reason |
| --- | --- | --- |
| Canonical Graph validator | **REUSE AS FROZEN UPSTREAM** | accepted truth validation; Phase 6 must not fork it |
| Decision / Memory Resolver + Ledger | **REUSE AS FROZEN UPSTREAM** | accepted governance authority |
| Generalized Context Package v0.3 | **REUSE AS ACCEPTED CONTEXT INPUT** | already projects accepted project / decision / memory / evidence / action semantics without UI inference |
| Self-Context Provider v0.2/v0.3 | **REUSE SEMANTICS, NOT AS LIVE REALITY** | current provider is deterministic-fixture, `live: false`, `runtimeEvidence: false` |
| GitHub Source Adapter v0.1 | **REUSE AS FROZEN SNAPSHOT PRODUCER** | already has bounded read-only source/error/privacy semantics |
| Source Snapshot validator | **REUSE AS FROZEN SOURCE CONTRACT** | prevents Phase 6 from accepting arbitrary GitHub response shapes |
| Context Import Planner / Canonical Admission | **NOT IN THE DEFAULT PHASE-6 PATH** | fresh evidence used for continuity assessment does not automatically need canonical admission; source observation must not be silently promoted |
| legacy `context/continuity` provider | **REFERENCE ONLY** | legacy 0.9.x scenario logic derives continuity score/recovery state and is not the Phase 6 validity authority |
| `experience/continuity/*` legacy providers / view model | **REFERENCE ONLY** | useful prior UX/runtime work but predates the accepted Phase 4/5 authority model |
| `continuity/scenarios/nexus-self-reentry.json` | **HISTORICAL FIXTURE ONLY** | captures July-era project state and cannot prove current Nexus reality |
| `memory/memory-store.js` | **DO NOT REUSE FOR CHECKPOINTS** | in-memory Map, no durability/version/CAS/idempotency; Memory semantics are not Trusted Checkpoint semantics |
| `execution/*` | **REFERENCE ONLY** | legacy task/project-state layer predates current accepted architecture; Phase 6 does not authorize autonomous execution |
| Phase 5 Product Surface | **FROZEN / NO INITIAL UI WORK** | Phase 6 must first prove runtime continuity before expanding presentation |

---

## 4. Accepted context input: what may be reused

### 4.1 Self-Context Provider is not a live source

The current Self-Context Provider validates a fixture-backed Canonical Graph, builds the accepted Decision / Memory Ledger and returns both v0.2 and v0.3 Context Packages.

That pipeline is valuable because it preserves the accepted governance model.

However, its declared source semantics are explicitly:

```text
source: deterministic-fixture
live: false
readOnly: true
runtimeEvidence: false
```

Therefore Phase 6 must not claim:

> “Self-Context Provider output is current project reality.”

It may instead use the provider / Generalized Context Package as an **accepted semantic baseline** for project direction, accepted Decisions, Memories and Actions where those records remain valid.

Freshness of the real repository must come from a separate fresh evidence path.

### 4.2 Initial Alignment must reconcile accepted context with fresh reality

The first Trusted Checkpoint should not simply copy the Phase 5 fixture.

The initial bootstrap must conceptually be:

```text
accepted Nexus context/governance output
        +
fresh bounded GitHub repository evidence
        ↓
proposed Trusted Checkpoint
        ↓
explicit human confirmation
        ↓
durable checkpoint write
        ↓
read-after-write verification
```

If an accepted Context record is clearly stale relative to fresh project reality, Initial Alignment must surface the mismatch instead of silently copying the stale value.

This preserves the A+C bootstrap principle:

- system proposes from accepted evidence;
- human confirms the first trusted continuation boundary.

---

## 5. GitHub fresh-evidence path

### 5.1 Freeze the Phase 4 adapter

`experience/source-v01/github-source-adapter.mjs` already provides a useful source boundary:

- explicit repository scope;
- deterministic source record identity;
- read-only client injection;
- bounded collection limits;
- source-native authority;
- auth / forbidden / not-found / rate-limit / unavailable distinction;
- invalid-response and scope-mismatch failure;
- privacy-preserving normalized records;
- pagination diagnostics.

Phase 6 should consume this accepted Source Snapshot **without modifying the Phase 4 adapter**.

### 5.2 Add a downstream Fresh Evidence Window

Phase 6 needs a new layer that applies checkpoint cursor semantics to the frozen Source Snapshot.

Conceptually:

```js
buildFreshEvidenceWindow({
  checkpoint,
  sourceSnapshot,
  requiredEvidencePolicy
})
```

Responsibilities:

- verify repository/project scope binding;
- verify the checkpoint cursor belongs to the expected source scope;
- determine whether the retrieved snapshot proves the evidence interval after the checkpoint cursor;
- partition fresh records from already-seen records;
- preserve exact Source Snapshot identities / authority / provenance;
- expose sufficiency / incompleteness deterministically;
- never re-fetch the source itself;
- never promote source records into canonical Context.

### 5.3 Primary first cursor

For the first Nexus experiment, the simplest primary GitHub cursor should be the accepted default-branch head SHA at checkpoint creation.

The checkpoint may record additional bounded cursor metadata if required, but the first implementation should avoid a generalized cursor language.

### 5.4 Bounded-window problem

The frozen Phase 4 adapter intentionally limits commits to at most 20 per read and exposes:

```text
itemsRead
pagesRead
truncated
continuationAvailable
```

This creates one important Phase 6 rule:

> **If the checkpoint cursor is not reachable inside a snapshot and the collection is truncated / continuation remains, Phase 6 cannot prove the complete evidence interval.**

The system must not interpret that condition as “no relevant changes.”

It must block the assessment with a dedicated reason:

`evidence-window-incomplete`

This is distinct from:

- `source-unavailable` — source could not be read;
- `required-evidence-missing` — a required fact is genuinely absent from an otherwise sufficient evidence view;
- `evidence-invalid` — source material failed accepted validation.

A small Phase 6 contract clarification should add this blocked reason before Fresh Evidence runtime implementation.

### 5.5 No generalized GitHub expansion in the first slice

The existing Phase 4 adapter already reads repository, default branch, commits, issues, pull requests, releases and tags.

Phase 6 should begin only with the categories actually needed by the first real Nexus continuity experiment.

Workflow / CI evidence is not mandatory for the first slice. If a later bounded action has a postcondition that depends on CI, Phase 6 may add a narrowly scoped verification reader rather than expanding the Phase 4 adapter casually.

---

## 6. Trusted Checkpoint / Outcome persistence

### 6.1 Do not reuse MemoryStore

`memory/memory-store.js` is an in-memory `Map`-backed store for Memory records.

It does not provide:

- durability;
- version / compare-and-swap protection;
- idempotency keys;
- append-only Outcome history;
- write/read verification;
- Trusted Checkpoint semantics.

Reusing it would also blur the accepted distinction between **Memory Context** and **continuity control state**.

Therefore:

> **Trusted Checkpoint and Outcome persistence must use a new Phase-6-specific narrow store contract.**

### 6.2 Minimal store boundary

The first runtime should expose an injected persistence boundary conceptually equivalent to:

```js
readCurrentCheckpoint(projectRef)
createInitialCheckpoint({ checkpoint, idempotencyKey })
compareAndWriteCheckpoint({ expectedVersion, checkpoint, idempotencyKey })
appendOutcome({ outcome, idempotencyKey })
readOutcome(outcomeId)
```

Exact function names are deferred to Phase 6B contract design.

Required semantics are not deferred:

- checkpoint version protection;
- idempotency / replay safety;
- immutable read results;
- exact project binding;
- deterministic serialization;
- no arbitrary Canonical Graph writes;
- read-after-write verification.

### 6.3 First concrete store

The smallest acceptable first implementation is a **Node-only file-backed local runtime adapter behind the injected store contract**, plus an in-memory test double.

The local store must:

- live outside tracked product source / accepted fixtures;
- be git-ignored if stored under the working directory;
- never serialize machine-specific local paths into public checkpoint/outcome contracts;
- never become part of GitHub fresh project evidence by accident;
- write atomically enough to avoid partial JSON state;
- preserve Outcome history rather than overwrite failed attempts.

This is intentionally not a database selection decision.

Phase 7 may later generalize storage providers after the real loop is proven.

---

## 7. Legacy Continuity code

### 7.1 `context/continuity/continuity-context-provider.mjs`

This file belongs to an earlier continuity model (`SCHEMA_VERSION = 0.9.7`). It includes derived continuity score / recovery-state logic over the old scenario entity model.

That behavior conflicts with the Phase 6 rule that:

- `VALID / INVALID / AMBIGUOUS` are continuation-validity states only;
- source failure blocks assessment;
- authority and fresh evidence determine protected continuation;
- a numeric continuity score is not the new authority.

Decision:

**Do not extend or wrap this provider into Phase 6 authority.**

It may remain regression-protected historical functionality.

### 7.2 `experience/continuity/*`

Existing fixture/datahub continuity providers and Re-entry view-model code are valuable historical product work.

They can inform:

- changed / preserved presentation;
- evidence display;
- Re-entry language;
- bounded action UX.

They must not determine the new Phase 6 runtime state machine.

### 7.3 `continuity/scenarios/nexus-self-reentry.json`

This fixture captures an earlier Nexus project period and contains dated July-era product state.

Decision:

- retain as regression / design history;
- do not mutate it into the Phase 6 real-run source of truth;
- do not delete it merely because Phase 6 supersedes its role.

---

## 8. Phase 6 runtime placement

To avoid reopening legacy modules, the first runtime should use a new bounded namespace.

Recommended path:

```text
experience/continuity-loop-v01/
```

Candidate modules over Phase 6:

```text
trusted-checkpoint-validator.mjs
trusted-continuity-store.mjs          # interface / common semantics
file-continuity-store.mjs             # local runtime adapter
fresh-evidence-window.mjs
continuity-assessment.mjs
human-authority-gate.mjs
reentry-package.mjs
outcome-verifier.mjs
continuity-runner.mjs                 # only after lower slices are accepted
```

The folder name is a product/runtime namespace, not permission to implement the entire list at once.

---

## 9. Product Surface decision

No Phase 6 browser route is required for the first runtime slices.

This is intentional.

The first product proof is:

> checkpoint → fresh reality → truthful assessment → bounded continuation → real action → fresh verification → next trusted state

not:

> another page.

Phase 5 Product Surface remains frozen while 6B–6F prove runtime semantics.

A browser Re-entry surface should be considered only after runtime contracts are stable enough that the UI cannot become the accidental authority.

---

## 10. Canonical admission relationship

Phase 4 Source Intake / Canonical Admission remain available for a different question:

> should an external source observation become canonical Evidence in the Context Graph?

Phase 6 asks:

> does fresh source reality invalidate or preserve this Trusted Checkpoint?

Those are not the same operation.

Therefore Phase 6 Fresh Evidence should **not** automatically pass through Canonical Admission merely to be usable for a continuity assessment.

If a later verified Outcome should become canonical project history, that write-back policy belongs to the Phase 7 generalization work unless Phase 6 needs a narrowly scoped artifact to close the experiment.

---

## 11. External action boundary

The audit confirms the Phase 6 Definition decision:

- `execution/*` is not promoted to Phase 6 authority;
- Nexus does not autonomously modify GitHub during the first real loop;
- a user or explicitly authorized external coding/tool workflow performs the bounded real action;
- Nexus treats the action report as observation only;
- Nexus independently re-reads GitHub and verifies the declared postcondition.

This prevents Phase 6 from becoming an autonomous-agent project by accident.

---

## 12. Implementation sequence after Entry Audit

The definition listed:

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

This audit completes **6A design/audit work only**.

### Next authorized implementation slice: 6B

6B should implement only:

1. Trusted Checkpoint validator / contract runtime;
2. injected narrow continuity store interface;
3. deterministic in-memory store for tests;
4. local file-backed store with version/idempotency/read-back semantics;
5. Initial Alignment proposal / explicit-confirmation boundary;
6. tests covering checkpoint integrity, stale-version write, replay/idempotency and read-after-write;
7. Phase 4 / Phase 5 frozen regression gates.

6B must **not** implement:

- GitHub fresh-evidence interpretation;
- `VALID / INVALID / AMBIGUOUS` assessment;
- Human Authority Gate;
- Outcome verification;
- browser UI;
- autonomous GitHub mutation.

Those belong to later slices.

---

## 13. 6B Initial Alignment input policy

Because the accepted Self-Context Provider is fixture-backed, 6B should not hard-code a stale Phase 5 fixture as the initial checkpoint.

The 6B boundary should accept an already-prepared **Initial Alignment Proposal** whose fields are grounded by:

- accepted Nexus context/governance references where still valid;
- explicit current project evidence references;
- human confirmation.

A deterministic fixture may test the contract, but the first real checkpoint must later be created from current Nexus reality.

The actual fresh GitHub assembly can be wired in 6C; 6B only needs to prove that an explicitly confirmed, structurally valid proposal can be durably and replay-safely stored.

---

## 14. Frozen-boundary requirements

Phase 6 work must not modify accepted Phase 4 / Phase 5 files merely for implementation convenience.

In particular, do not change without a separately proven defect:

- `experience/source-v01/github-source-adapter.mjs`;
- Source Snapshot / Context Import Plan / Canonical Admission accepted contracts and runtimes;
- Context Graph validators;
- Decision / Memory Resolver / Ledger;
- accepted Phase 5 Product Surface projectors / snapshots / browser semantics;
- Phase 4 / Phase 5 frozen acceptance baselines.

New Phase 6 CI should eventually verify these frozen boundaries against accepted SHAs just as Phase 5F did.

---

## 15. Entry Audit closure

### Reuse

- accepted Graph / Resolver / Ledger / Generalized Context Package semantics;
- frozen GitHub Source Snapshot adapter and validator;
- existing Phase 4 / Phase 5 regression gates.

### New Phase 6 runtime

- new continuity-loop namespace;
- new Trusted Checkpoint / Outcome persistence contract;
- new Fresh Evidence Window downstream of Source Snapshot;
- new Continuity Assessment and Human Authority semantics;
- new Outcome Verification and next-checkpoint closure.

### Do not reuse as authority

- MemoryStore for checkpoint persistence;
- legacy continuity score/recovery provider;
- old Nexus self-reentry fixture as current truth;
- legacy execution layer as autonomous action engine;
- browser state as trusted persistence/authority.

### Required small design correction before 6C

Add `evidence-window-incomplete` as a blocked run reason and require cursor reachability / interval completeness before a bounded GitHub snapshot can support continuity assessment.

### Entry status

**Phase 6A — Entry Audit: COMPLETE / DESIGN ACCEPTED**  
**Phase 6B — Trusted Checkpoint + bounded persistence: NEXT / NOT STARTED**  
**Phase 6 runtime implementation overall: NOT STARTED at this audit commit**
