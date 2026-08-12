# Nexus Atlas v0.1 — Phase 4 Acceptance Contract

**Status:** Accepted / Frozen
**Phase:** 4F — Acceptance and policy hardening
**Baseline:** `c1376a682210396cdca525013edd6d18abcd8447`
**Baseline state:** Phase 4E COMPLETE / FROZEN

## 1. Purpose

Phase 4F closes the first Source Adapter delivery without expanding product scope. It proves that the accepted Phase 4B–4E contracts behave coherently as one bounded pipeline:

`GitHub read-only Adapter -> Source Snapshot -> Context Import Plan -> explicit Canonical Admission -> pure in-memory Context Graph result`

Phase 4F is an acceptance layer. It must not silently redesign or broaden Source Snapshot, Planner, Canonical Admission, Context Graph, Context Package, Provider, UI, transport or persistence behavior.

## 2. Frozen Baseline

Phase 4F starts from the exact Phase 4E frozen commit:

`c1376a682210396cdca525013edd6d18abcd8447`

The following Phase 4 boundaries are treated as accepted inputs to Phase 4F:

- Source Snapshot v0.1 contract, accepted example and 36-case catalog;
- GitHub read-only Adapter v1 profile/runtime;
- Context Import Plan v0.1 contract, accepted example and 32-case catalog;
- Canonical Admission v0.1 contract, accepted example and 32-case catalog;
- 14-item Canonical Admission behavior vocabulary and exact behavior-handler proof;
- Context Graph validation and pre-existing Phase 0–3 governance boundaries.

Phase 4F may add acceptance-only documents, tests, verifier gates and package scripts. A Phase 4B–4E Runtime or accepted fixture may be changed only if Phase 4F demonstrates a real blocker that cannot be closed at the acceptance layer. Any such reopening must be explicit and separately recorded.

## 3. Acceptance Invariants

### 3.1 Fixture and contract stability

1. Accepted Phase 4 examples remain valid against their independent validators.
2. Running Snapshot, Planner, Admission build and Apply does not mutate accepted fixture inputs.
3. Phase 4F must not rewrite accepted examples merely to make a failing Runtime pass.
4. Existing Source Snapshot, Import Plan and Canonical Admission catalogs remain exact closed sets.

### 3.2 Source failure policy

1. Authentication failure does not produce a successful or partial Snapshot.
2. Forbidden access does not produce a successful or partial Snapshot.
3. Rate limiting does not produce a successful or partial Snapshot and remains retryable.
4. Source unavailability does not produce a successful or partial Snapshot and remains retryable.
5. Not-found behavior stays non-retryable and must not be converted to empty repository state.
6. Error details remain sanitized to the accepted allowlist.

### 3.3 Privacy boundary

1. Only the GitHub profile allowlist may cross the Adapter boundary.
2. Credentials, tokens, author email, Issue/PR bodies, comments and unknown raw fields must not appear in Snapshot output.
3. A privacy sentinel excluded at Snapshot must remain absent from Import Plan, Admission Plan and the applied Graph.
4. Source references remain bounded GitHub references with no query or fragment leakage.

### 3.4 Explicit canonical-write review

1. Import Planner output remains candidate-only and keeps `canonicalWriteAllowed === false`.
2. Canonical Admission requires an explicit `authorizedCandidateIds` selection.
3. Authorization is rebound independently at Apply.
4. Selected Candidate IDs are treated as a set and normalized in Import Plan order.
5. Unselected Candidates remain deferred; they are not silently admitted.
6. Only Evidence proposals may cross the Phase 4E canonical boundary.
7. No semantic promotion to Project, Decision, Memory, Action, Identity, Risk or Goal is allowed.

### 3.5 Atomic and bounded application

1. Apply remains pure/local/in-memory and atomic.
2. Source re-read is prohibited during Admission build/apply.
3. External writes and persistent writes are prohibited.
4. Edges, existing Project state and ContextPackage are unchanged by Phase 4 admission.
5. A successful result validates as a Context Graph.
6. Re-applying the same accepted observation is idempotent.
7. A later observation preserves prior Evidence history.

### 3.6 Regression and repository hygiene

Phase 4F acceptance requires all of the following gates to pass from a clean checkout:

- `npm test`
- `npm run check`
- Phase 3 final acceptance verifier
- Source Snapshot v0.1 verifier
- Context Import Plan v0.1 verifier
- Canonical Admission v0.1 verifier
- Phase 4F end-to-end acceptance verifier

The repository root `package-lock.json` is excluded from Phase 4 delivery unless dependency policy is intentionally changed in a separate decision. Phase 4F must not introduce a dependency merely to implement acceptance.

## 4. Phase 4F End-to-End Boundary

A successful Phase 4F pipeline has exactly these responsibilities:

1. An explicitly selected repository is read through the injected read-only GitHub client.
2. The Adapter returns one immutable, validated Source Snapshot.
3. The Planner consumes only that Snapshot and returns an immutable candidate-only Import Plan.
4. A caller explicitly reviews/selects Candidate IDs.
5. Canonical Admission builds proposals only for the selected Candidates.
6. Apply independently re-validates Graph, Import Plan, Admission Plan and authorization binding.
7. Apply returns a new immutable Graph containing only the permitted Evidence additions.

No later layer may reinterpret raw GitHub free text into user identity, preferences, rationale, confirmed decisions, actions or project truth.

## 5. Explicit Non-Goals

Phase 4F does not add:

- OAuth or token acquisition;
- a concrete GitHub HTTP transport;
- account/repository scanning;
- persistent Context Graph writes;
- Source re-read during planning/admission;
- Edge creation;
- ContextPackage refresh or mutation;
- Self-Context Provider integration;
- UI source controls;
- Identity inference;
- Decision/Memory semantic extraction;
- additional Source Adapters;
- autonomous external mutation.

## 6. Acceptance Evidence

Phase 4F acceptance is backed by repository evidence:

- Phase 4E frozen baseline: `c1376a682210396cdca525013edd6d18abcd8447`;
- dedicated cross-layer verifier: `scripts/verify-phase4-v01.mjs`;
- 30 dedicated executable cross-layer checks covering fixture stability, source failure policy, privacy, explicit review/authorization and end-to-end Graph application;
- accepted catalog closure retained at Source Snapshot `36`, Context Import Plan `32` and Canonical Admission `32`, with Canonical Admission behavior vocabulary `14`;
- clean-checkout GitHub Actions run `31399296273` completed the dedicated Phase 4F acceptance step, full `npm test` step and full `npm run check` step successfully;
- all 12 workflow/job steps in that clean-checkout run completed successfully;
- root `package-lock.json` is explicitly excluded and no dependency was added;
- frozen-boundary review found only Phase 4F acceptance/policy/CI files changed relative to the Phase 4E SHA before final status recording;
- no Phase 4B–4E Runtime, accepted JSON fixture/catalog, Context Graph Validator, Provider, UI, live transport or persistence boundary was reopened.

The final acceptance-record commits modify documentation/status only beyond the already accepted Phase 4F verification surface. The branch head is re-run through the same clean-checkout gate before the Phase 4F frozen SHA is recorded externally.

## 7. Completion Rule

Phase 4F is accepted when the final branch head passes the same clean-checkout gate with the frozen-boundary review intact. At that point Phase 4 is frozen as a bounded first Source Adapter foundation.

Completion does **not** mean GitHub becomes authoritative for user identity, preferences, rationale or confirmed Decisions, and does **not** authorize live persistent writes.
