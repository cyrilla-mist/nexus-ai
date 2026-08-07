# Nexus Atlas — Canonical Admission v0.1 Test Matrix

**Status:** Accepted
**Target:** Phase 4E Canonical Admission Runtime
**Total Cases:** 32
**Runtime:** Not implemented

The matrix is design-only. It describes the future runtime boundary; it does not execute Graph application or create ContextNodes.

| Case ID | Category | Input State | Expected Admission | Expected Decisions | Expected Proposals | Expected Error | Behavior Assertions | Rationale |
|---|---|---|---|---|---:|---|---|---|
| CA-S01 | schema | Structurally valid Admission Plan with one tampered canonicalNodeId | reject | — | — | CANONICAL_NODE_ID_INVALID | — | Every Decision ID follows source observation plus generatedAt |
| CA-S02 | schema | admissionVersion missing | reject | — | — | CANONICAL_ADMISSION_PLAN_INVALID | — | Exact top-level schema |
| CA-S03 | schema | Unsupported admission policy | reject | — | — | CANONICAL_ADMISSION_PLAN_INVALID | — | Fixed v0.1 policy |
| CA-S04 | schema | decisions is not an array | reject | — | — | CANONICAL_ADMISSION_PLAN_INVALID | — | One ordered decision per Candidate |
| CA-S05 | schema | Decisions and proposals partition differently | reject | — | — | CANONICAL_ADMISSION_COVERAGE_MISMATCH | — | Exact authorized coverage |
| CA-S06 | schema | Diagnostics counts disagree | reject | — | — | CANONICAL_ADMISSION_COVERAGE_MISMATCH | — | Diagnostics prove the partition |
| CA-P01 | input/target | Valid Graph and eight-Candidate Plan; all authorized | insert 8 | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | explicit-authorization; evidence-only; source-authority-preserved; no-semantic-promotion | Complete design example |
| CA-P02 | input/target | authorizedCandidateIds omitted | reject | — | — | INVALID_CANONICAL_ADMISSION_INPUT | — | Omitted is never all |
| CA-P03 | input/target | Invalid policyVersion | reject | — | — | INVALID_ADMISSION_POLICY_VERSION | — | Only GitHub v1 policy |
| CA-P04 | input/target | Graph fails validation | reject before proposal construction | — | — | INVALID_CONTEXT_GRAPH | — | Validate Graph first |
| CA-P05 | input/target | Import Plan fails validation | reject | — | — | INVALID_IMPORT_PLAN | — | Accept only validated Plan |
| CA-P06 | input/target | Target Project absent | reject | — | — | TARGET_PROJECT_NOT_FOUND | — | Scope comes from Project |
| CA-P07 | input/target | scopeKey differs from projectId | reject | — | — | TARGET_SCOPE_UNSUPPORTED | — | v1 is project scoped |
| CA-A01 | admission/reconciliation | Only one Commit Candidate authorized | one insert; seven deferred | 1 insert, 0 noop, 0 conflict, 7 deferred | 1 | — | explicit-authorization; idempotent-admission | Unselected remains deferred |
| CA-A02 | admission/reconciliation | Duplicate authorization ID | reject | — | — | INVALID_AUTHORIZATION_SELECTION | — | Selection is unique |
| CA-A03 | admission/reconciliation | Unknown authorization ID | reject | — | — | CANDIDATE_NOT_FOUND | — | Selection must reference Plan |
| CA-A04 | admission/reconciliation | Existing identical Evidence | noop | 0 insert, 1 noop, 0 conflict, 0 deferred | 1 | — | idempotent-admission; deterministic-canonical-identity | Same observation is idempotent |
| CA-A05 | admission/reconciliation | Structurally valid Plan; proposal payload.observedAt differs from Import Plan Candidate | structural validation passes; apply rejects | — | — | CANONICAL_ADMISSION_SOURCE_MISMATCH | source-authority-preserved; atomic-apply | Apply rebinds exact Candidate content |
| CA-A06 | admission/reconciliation | Admission Plan has conflictCount > 0 | reject with zero mutation | — | — | CANONICAL_APPLY_CONFLICT | atomic-apply; input-unchanged | Conflict is an apply-time public error |
| CA-A07 | admission/reconciliation | Rebuild after first application | noop 8 | 0 insert, 8 noop, 0 conflict, 0 deferred | 8 | — | idempotent-admission; deep-equal | No duplicate observation nodes |
| CA-A08 | admission/reconciliation | Same Source Record, new capturedAt | new insert; old retained | 1 insert, 0 noop, 0 conflict, 0 deferred | 1 | — | history-preserved; deterministic-canonical-identity | Capture is part of identity |
| CA-G01 | governance/safety | All authorized GitHub Evidence Candidates | all proposals kind evidence | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | evidence-only; no-semantic-promotion | No semantic promotion |
| CA-G02 | governance/safety | Source-local confirmation and fixed governance defaults | confirmed; freshness unknown; personal/project_only/no confirmation | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | source-authority-preserved; freshness-not-promoted; no-semantic-promotion | Confirmed is not current; defaults remain conservative |
| CA-G03 | governance/safety | Target ID resolves to existing non-project node | reject | — | — | TARGET_PROJECT_INVALID | — | Existing non-Project target is invalid |
| CA-G04 | governance/safety | Authorization omits Candidate | all omitted deferred | 0 insert, 0 noop, 0 conflict, 8 deferred | 0 | — | explicit-authorization | source-authority is not authorization |
| CA-G05 | governance/safety | Issue Candidate authorized | Evidence only | 1 insert, 0 noop, 0 conflict, 0 deferred | 1 | — | evidence-only; no-semantic-promotion | Issue does not create Action |
| CA-G06 | governance/safety | Merged PR and published Release | Evidence; Project unchanged | 2 insert, 0 noop, 0 conflict, 0 deferred | 2 | — | no-semantic-promotion; no-derived-projection-mutation | No phase/version mutation |
| CA-G07 | governance/safety | Complete authorized admission | Evidence; edges/package unchanged | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | no-derived-projection-mutation; no-semantic-promotion | No Edge or derived mutation |
| CA-C01 | determinism/application | Same Graph, Plan and authorization twice | byte-stable Admission Plan | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | deep-equal; deterministic-canonical-identity | No clock or randomness |
| CA-C02 | determinism/application | Mutable ordinary inputs | unchanged inputs; frozen future output | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | input-unchanged; deeply-frozen | Pure boundary |
| CA-C03 | determinism/application | Complete authorization in source order | decisions/proposals preserve order | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | deterministic-canonical-identity | Preserve source lineage |
| CA-C04 | determinism/application | Conflict-free accepted Admission Plan | new valid Graph; Evidence appended only | 8 insert, 0 noop, 0 conflict, 0 deferred | 8 | — | atomic-apply; graph-valid-after-apply; input-unchanged; no-derived-projection-mutation | Pure valid Graph application |

The behavior vocabulary is closed to these 14 names: `deep-equal`, `deeply-frozen`, `input-unchanged`, `explicit-authorization`, `evidence-only`, `source-authority-preserved`, `freshness-not-promoted`, `deterministic-canonical-identity`, `idempotent-admission`, `history-preserved`, `no-semantic-promotion`, `no-derived-projection-mutation`, `atomic-apply`, and `graph-valid-after-apply`.
