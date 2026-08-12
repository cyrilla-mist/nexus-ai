# Nexus Atlas v0.1 — Phase 4F Acceptance Test Matrix

**Status:** Accepted / Automated
**Baseline:** `c1376a682210396cdca525013edd6d18abcd8447`
**Target:** Phase 4F Acceptance and policy hardening

Phase 4F does not replace the accepted Phase 4B–4E catalogs. It adds cross-layer proofs and regression gates that those layers do not prove independently.

## A. Frozen baseline and fixture stability

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-A01 | Accepted Source Snapshot validates independently | PASS |
| 4F-A02 | Accepted Context Import Plan validates independently | PASS |
| 4F-A03 | Accepted Canonical Admission Plan validates independently | PASS |
| 4F-A04 | End-to-end execution leaves imported fixture inputs unchanged | PASS |
| 4F-A05 | Existing 36 / 32 / 32 catalog cardinalities and closed behavior vocabularies remain unchanged | PASS |

## B. Source failure policy

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-B01 | Authentication required | `SOURCE_AUTH_REQUIRED`, non-retryable, no Snapshot |
| 4F-B02 | Forbidden repository access | `SOURCE_FORBIDDEN`, non-retryable, no Snapshot |
| 4F-B03 | Rate limited read | `SOURCE_RATE_LIMITED`, retryable, no Snapshot |
| 4F-B04 | Source unavailable | `SOURCE_UNAVAILABLE`, retryable, no Snapshot |
| 4F-B05 | Repository not found | `SOURCE_NOT_FOUND`, non-retryable, no empty-state Snapshot |
| 4F-B06 | Unsafe upstream error details | Adapter error details expose only accepted safe keys |

## C. Cross-layer privacy

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-C01 | Repository raw payload contains secret/token sentinel | Sentinel absent from Snapshot |
| 4F-C02 | Commit raw payload contains author-email sentinel | Sentinel absent from Snapshot |
| 4F-C03 | Issue/PR raw payload contains body/comment sentinel | Sentinel absent from Snapshot |
| 4F-C04 | Excluded privacy sentinel is absent from Plan, Admission and applied Graph | PASS |
| 4F-C05 | GitHub references contain no query or fragment leakage | PASS |

## D. Explicit canonical proposal review

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-D01 | Planner candidates remain candidate-only | every Candidate has `canonicalWriteAllowed === false` |
| 4F-D02 | Explicit subset authorization | proposals created only for selected Candidates |
| 4F-D03 | Reversed/duplicated authorization input | normalized as a set in Import Plan order or rejected per contract |
| 4F-D04 | Apply authorization differs from build authorization | `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH` |
| 4F-D05 | Unselected Candidates | remain `deferred`; no proposal emitted |
| 4F-D06 | Admission proposal kinds | Evidence only |
| 4F-D07 | Semantic kinds | no Project/Decision/Memory/Action/Identity/Risk/Goal promotion |

## E. End-to-end application

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-E01 | Snapshot -> Plan -> reviewed Admission -> Apply | returns valid immutable Context Graph |
| 4F-E02 | Successful Apply | only authorized Evidence nodes are added |
| 4F-E03 | Existing edges / Project / ContextPackage | unchanged |
| 4F-E04 | Same observation applied twice | idempotent; no duplicate Evidence |
| 4F-E05 | Later captured observation | prior Evidence history remains present |
| 4F-E06 | Apply failure after tampering | atomic; original Graph unchanged |

## F. Regression and repository hygiene

| ID | Acceptance case | Expected result |
|---|---|---|
| 4F-F01 | `npm test` | PASS |
| 4F-F02 | `npm run check` | PASS |
| 4F-F03 | Phase 3 final verifier | PASS |
| 4F-F04 | Source Snapshot verifier | PASS |
| 4F-F05 | Context Import Plan verifier | PASS |
| 4F-F06 | Canonical Admission verifier | PASS |
| 4F-F07 | Phase 4F verifier | PASS |
| 4F-F08 | root `package-lock.json` | excluded from Phase 4 changes |
| 4F-F09 | Phase 4F changed-file review | only acceptance/policy-hardening files unless a blocker reopening is explicitly recorded |

## Required automation shape

The dedicated Phase 4F automation:

1. executes the accepted Source Snapshot, Planner and Canonical Admission APIs rather than matching strings only;
2. uses a real injected client fixture for source failure-policy tests;
3. uses a unique privacy sentinel and verifies absence across every downstream artifact;
4. performs a real reviewed subset admission and Apply;
5. independently validates the final Graph;
6. verifies the source, planner and admission catalog cardinalities;
7. runs without credentials, OAuth, persistent writes or new dependencies.

## Accepted automation coverage

The 38 matrix requirements are closed through three complementary proof layers:

- **30 dedicated Phase 4F executable checks** in `scripts/verify-phase4-v01.mjs`, covering A01–A05, B01–B06, C01–C05, D01–D07, E01–E06 and F08;
- **existing accepted Phase 4B–4E catalogs and verifiers**, preserving the Source Snapshot `36`, Context Import Plan `32`, Canonical Admission `32` and Canonical Admission behavior vocabulary `14` closures;
- **clean-checkout workflow and changed-file review**, covering F01–F07 and F09.

GitHub Actions run `31399296273` completed all 12 job steps successfully, including `npm run verify:phase4-v01`, the full `npm test` suite and the full `npm run check` gate. The final documentation/status head is required to pass the same clean-checkout workflow before the Phase 4F frozen SHA is recorded.

## Acceptance threshold

All matrix cases are blocking for Phase 4F completion. No accepted Phase 4B–4E fixture or Runtime was rewritten to satisfy Phase 4F.

Any future failure against this frozen matrix must be classified as one of:

- acceptance-test defect;
- documentation/policy mismatch;
- real Runtime regression requiring an explicit reopening decision.
