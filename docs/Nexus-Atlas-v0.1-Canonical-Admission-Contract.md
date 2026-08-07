# Nexus Atlas — Canonical Admission v0.1 Contract

**Status:** Proposed for Phase 4E acceptance
**Target:** Phase 4E Canonical Admission Runtime
**Implementation:** Not started
**Phase:** Phase 4E Canonical Integration Contract Design
**External Read:** None
**External Write:** None
**Canonical Mutation Runtime:** Not implemented

## Contract boundary

Canonical Admission is the governance boundary that converts explicitly authorized, validated Evidence Candidates into deterministic canonical Evidence node proposals. It does not reinterpret source observations, create non-Evidence context, or mutate the caller's Graph by itself.

The three layers remain separate:

`Context Import Plan → Canonical Admission Plan → Canonical Graph Application`

Phase 4D converts Source Snapshot records into Evidence Candidates. Phase 4E defines Candidate-to-Canonical-Evidence proposals and a future pure Graph application. Phase 4F is end-to-end acceptance.

The future APIs are separate and are design-only in v0.1:

```js
buildCanonicalAdmissionPlanV01({ graph, plan, policyVersion, authorizedCandidateIds })
validateCanonicalAdmissionPlanV01(plan)
applyCanonicalAdmissionPlanV01({ graph, admissionPlan })
```

`build` receives a validated Graph, Import Plan, policy and explicit authorization. `validate` validates only an Admission Plan. `apply` receives a Graph and accepted Admission Plan and never accesses Source, Snapshot, Planner or GitHub.

## Admission input and authorization

The future build input has exactly `graph`, `plan`, `policyVersion`, and `authorizedCandidateIds`. There are no defaults. The v1 policy is `github-evidence-canonical-admission-v1`. `authorizedCandidateIds` is an array of unique exact Candidate IDs and may be empty; omitted authorization never means “authorize all”.

`source-authority-sufficient` means that the Candidate does not require a second confirmation of what GitHub returned. It does not grant canonical write authority. Phase 4E authorization is still explicit. A Candidate not selected is `deferred`, never rejected, false, or revoked.

Future input validation order is fixed: exact input shape, policy, Context Graph, Import Plan, target project, scope policy, authorization selection, Candidate admissibility, proposal construction, Graph reconciliation, then Admission Plan validation. Graph validation happens before node construction.

## Target and scope

`plan.target.projectId` must resolve to an existing Graph node whose `kind` is `project`; otherwise the future boundary returns the appropriate target error. The canonical Evidence `scope` is a deep copy of that Project node's `scope`. GitHub cannot determine `userId`, `territoryId`, or `projectId`.

The GitHub v1 policy is project-scoped and requires `plan.target.scopeKey === plan.target.projectId`. This is an admission policy restriction, not a Phase 4D Planner assumption.

## Candidate admissibility

Only Candidates with `targetKind: "evidence"`, `admission.stage: "candidate"`, `admission.canonicalWriteAllowed: false`, and `admission.confirmationRequirement: "source-authority-sufficient"` are admissible. The Candidate's false write flag means it cannot authorize itself; explicit Phase 4E authorization supplies the separate admission authority.

## Canonical Evidence proposal

Each authorized Candidate produces one proposal with exactly these conceptual fields:

```js
{
  id, kind, title, summary, scope,
  lifecycle, epistemic, provenance, governance, payload
}
```

`kind` is `evidence`. `title`, `summary`, `payload`, and `provenance` are deep copies of the Candidate values; the claim is never rewritten. `scope` is the target Project scope.

The canonical Evidence ID is deterministic and observation-specific:

```text
evidence:source-observation:
+ encodeURIComponent(sourceRecordId)
+ ":captured:"
+ encodeURIComponent(candidate.provenance.capturedAt)
```

It uses neither array position, randomness, current time, title, nor summary. The same source record at the same capture produces the same ID. A later capture produces a different Evidence node and preserves the earlier observation; there is no latest-wins overwrite, automatic supersession, or heuristic dedupe.

The fixed v0.1 defaults are:

```js
lifecycle: { state: "active", createdAt: plan.generatedAt, updatedAt: plan.generatedAt }
epistemic: { verification: "confirmed", confidence: 1, freshness: "unknown" }
governance: { sensitivity: "personal", inheritance: "project_only", requiresConfirmation: false }
```

`confirmed` is source-local authority over GitHub's own observable state, not human confirmation. `freshness` remains `unknown`; Phase 4E does not read current time or compare Project versions. The conservative `personal` and `project_only` governance defaults do not infer public suitability.

Canonical admission never promotes an Evidence Candidate to Project, Decision, Memory, Action, Milestone, Identity, Risk, or Goal. It never changes Project lifecycle, phase, version or milestone, and never creates Decision, Memory or Action records.

## Reconciliation and application boundary

Every Import Plan Candidate has exactly one ordered Decision:

```js
{ candidateId, canonicalNodeId, disposition, reason }
```

Dispositions are `insert`, `noop`, `conflict`, and `deferred`. Reasons are fixed: `authorized-new-observation`, `authorized-existing-identical`, `authorized-existing-conflict`, and `not-authorized`, respectively. Decisions preserve Import Plan Candidate order. `nodeProposals` contains authorized `insert`, `noop`, and `conflict` proposals in that same order, never deferred proposals.

Missing ID means `insert`; an existing deeply identical node means `noop`; an existing node with the same ID but different content means `conflict`. Conflict never overwrites, merges, silently updates, or latest-wins.

Diagnostics have exactly `candidateCount`, `authorizedCount`, `deferredCount`, `proposalCount`, `insertCount`, `noopCount`, `conflictCount`, and `applyAllowed`. Counts partition Candidates, proposals equal authorized Candidates, and `applyAllowed` is exactly `conflictCount === 0`.

Future application is atomic: any conflict or `applyAllowed !== true` rejects the entire operation. A successful pure application validates the input Graph and Admission Plan, rechecks current reconciliation, returns a new deeply frozen Graph, leaves the input unchanged and unfrozen, retains existing node order, appends insert proposals in order, and leaves edges, metadata, and `contextPackage` unchanged. The resulting Graph must validate. Re-applying the same observation becomes noop; a new capture remains a new historical Evidence node.

v0.1 creates no Edge (`belongs_to`, `supports`, `derived_from`, `implements`, or any other type) and never mutates `graph.contextPackage`; package projection is a later deterministic concern.

## Error vocabulary

The future public boundary defines these 16 non-retryable codes and wraps lower-level errors rather than leaking `ContextGraphValidationError` or `ContextImportPlanError`:

`INVALID_CANONICAL_ADMISSION_INPUT`, `INVALID_ADMISSION_POLICY_VERSION`, `INVALID_CONTEXT_GRAPH`, `INVALID_IMPORT_PLAN`, `INVALID_AUTHORIZATION_SELECTION`, `TARGET_PROJECT_NOT_FOUND`, `TARGET_PROJECT_INVALID`, `TARGET_SCOPE_UNSUPPORTED`, `CANDIDATE_NOT_FOUND`, `CANDIDATE_NOT_ADMISSIBLE`, `CANONICAL_NODE_ID_INVALID`, `CANONICAL_NODE_CONFLICT`, `CANONICAL_ADMISSION_PLAN_INVALID`, `CANONICAL_ADMISSION_COVERAGE_MISMATCH`, `CANONICAL_APPLY_CONFLICT`, `CANONICAL_GRAPH_RESULT_INVALID`.

## Example and acceptance boundary

`examples/nexus-atlas-canonical-admission-v0.1.json` is a design example based on the accepted Self-Context Graph and accepted Context Import Plan. It contains eight explicitly authorized Candidates, eight Evidence proposals, eight inserts, zero noop, zero conflict and zero deferred. It does not copy the source files or mutate the canonical fixture.

`examples/nexus-atlas-canonical-admission-cases-v0.1.json` freezes 32 design cases: Schema 6, Input/Target 7, Admission/Reconciliation 8, Governance/Safety 7, and Determinism/Application 4. Its behavior vocabulary is a closed set of 14 handlers. The Test Matrix expands all 32 cases and does not substitute “see catalog” for expected semantics.

Phase 4E Contract Design is complete after these design artifacts and machine self-checks pass. Canonical Admission Runtime remains planned. Phase 4F remains planned.
