# Nexus Atlas — Canonical Admission v0.1 Contract

**Status:** Accepted
**Target:** Phase 4F Acceptance
**Implementation:** Phase 4E Canonical Admission Runtime complete
**Phase:** Phase 4E Canonical Integration Complete
**External Read:** None
**External Write:** None
**Canonical Mutation Runtime:** Pure in-memory Graph application implemented; no persistent canonical store write

## Contract boundary

Canonical Admission is the governance boundary that converts explicitly authorized, validated Evidence Candidates into deterministic canonical Evidence node proposals. It does not reinterpret source observations, create non-Evidence context, or mutate the caller's Graph by itself.

The three layers remain separate:

`Context Import Plan → Canonical Admission Plan → Canonical Graph Application`

Phase 4D converts Source Snapshot records into Evidence Candidates. Phase 4E defines Candidate-to-Canonical-Evidence proposals and a future pure Graph application. Phase 4F is end-to-end acceptance.

The future APIs are separate and are design-only in v0.1:

```js
buildCanonicalAdmissionPlanV01({ graph, plan, policyVersion, authorizedCandidateIds })
validateCanonicalAdmissionPlanV01(plan)
applyCanonicalAdmissionPlanV01({ graph, importPlan, admissionPlan, authorizedCandidateIds })
```

`build` receives a validated Graph, Import Plan, policy and explicit authorization. `validate` validates only an Admission Plan. `apply` receives a Graph, the validated Import Plan, and an Admission Plan; it never accesses Source, Snapshot, Planner or GitHub.

The `sourcePlan` descriptor has exactly `{ planVersion, policyVersion, generatedAt, candidateIds }`; `candidateIds` preserves exact Import Plan Candidate order and no Candidate payload is copied. Structural validity is not equivalent to upstream provenance binding. The apply boundary must receive the validated Import Plan again, validate it, verify exact source descriptor and target binding, reconstruct each expected proposal from the exact Candidate, compare proposals, then reconcile the current Graph.

## Admission input and authorization

The future build input has exactly `graph`, `plan`, `policyVersion`, and `authorizedCandidateIds`. There are no defaults. The v1 policy is `github-evidence-canonical-admission-v1`. `authorizedCandidateIds` is an array of unique exact Candidate IDs and may be empty; omitted authorization never means “authorize all”.

`source-authority-sufficient` means that the Candidate does not require a second confirmation of what GitHub returned. It does not grant canonical write authority. Phase 4E authorization is still explicit. A Candidate not selected is `deferred`, never rejected, false, or revoked.

Future input validation order is fixed: exact input shape, Context Graph, Import Plan, Admission Plan, authorization selection, Candidate existence, sourcePlan binding, target binding, Candidate-to-proposal binding, authorization-to-Decision/proposal binding, target Project scope, Graph reconciliation, conflict check, atomic construction, then result Graph validation. Graph validation happens before node construction and authorization binding happens before reconciliation. Build validates policy and authorization selection before proposal construction. Apply input has exactly `graph`, `importPlan`, `admissionPlan`, and `authorizedCandidateIds`; it does not accept `plan`, `sourcePlan`, `snapshot`, `source`, `client`, `GitHub`, `planner`, `policyVersion`, or a new authorization object.

`authorizedCandidateIds` supplied to Apply is the authoritative admission selection for that invocation. It is independently revalidated; an Admission Plan is a deterministic governance result, not a cryptographic authorization token. Structural validity and upstream Candidate binding cannot substitute for apply-time explicit authorization rebinding.

The authorization selection is an array of unique non-empty trimmed Candidate IDs and may be empty. Each ID must exist in the validated Import Plan. The array is a set: caller order has no semantic meaning, and Build and Apply normalize it in Import Plan Candidate order. A non-array, duplicate, empty, or whitespace ID is `INVALID_AUTHORIZATION_SELECTION`; a structurally valid but unknown ID is `CANDIDATE_NOT_FOUND`.

## Target and scope

`plan.target.projectId` must resolve to an existing Graph node whose `kind` is `project`; otherwise the future boundary returns the appropriate target error. The canonical Evidence `scope` is a deep copy of that Project node's `scope`. GitHub cannot determine `userId`, `territoryId`, or `projectId`.

The GitHub v1 policy is project-scoped and requires `plan.target.scopeKey === plan.target.projectId`. This is an admission policy restriction, not a Phase 4D Planner assumption.

## Target Project validity

Target errors have two ordered layers. Layer 1 is generic Graph validity: `validateContextGraph(graph)` runs before any target resolution. If it fails, the public boundary returns `INVALID_CONTEXT_GRAPH` and does not attempt or reclassify the failure as `TARGET_PROJECT_NOT_FOUND`, `TARGET_PROJECT_INVALID`, or `TARGET_SCOPE_UNSUPPORTED`. The Graph must first be a valid canonical Graph. Layer 2 is Phase 4E target policy: only after generic validation succeeds does an absent Graph ID return `TARGET_PROJECT_NOT_FOUND`; an existing node whose `kind` is not `project` return `TARGET_PROJECT_INVALID`; an existing Project whose scope fails the Phase 4E v0.1 exact target policy return `TARGET_PROJECT_INVALID`; and a valid Project with `Import Plan.target.scopeKey !== Import Plan.target.projectId` return `TARGET_SCOPE_UNSUPPORTED`.

The Phase 4E GitHub Evidence admission policy is stricter than the generic Context Graph validator. The resolved Project `scope` has exactly these keys and no extras:

```js
{
  userId,
  territoryId,
  projectId
}
```

All three values must be strings that are non-empty and exactly trimmed. `Project.scope.projectId === Project.id`, and `Project.id === Import Plan.target.projectId`; consequently `Project.scope.projectId` also equals the Import Plan target project ID. `territoryId` is required even though the generic validator does not require it. No default territory, inference, `undefined` copy, `Project.payload.territoryIds[0]`, or repository-derived value is permitted. The canonical proposal scope is an exact deep copy of this resolved `Project.scope`; Build does not reconstruct an alternate scope.

Build validation precedence is: exact input, policy, `validateContextGraph` (failure is `INVALID_CONTEXT_GRAPH`), Import Plan, target ID resolution, target kind, exact Project scope, scopeKey policy, authorization, and only then proposal construction. Target checks never precede generic Graph validation. Apply precedence is: exact input, current Graph validation (failure is `INVALID_CONTEXT_GRAPH`), Import Plan, Admission Plan, authorization shape/existence, source and target descriptor binding, current target ID resolution, target kind, additional Phase 4E scope policy, proposal scope/source binding, authorization binding, race reconciliation, and atomic application. If the current Graph is itself invalid, Apply returns `INVALID_CONTEXT_GRAPH`, not `TARGET_PROJECT_INVALID`. If the current Project becomes scope-invalid after Build while the Graph remains generically valid, Apply returns `TARGET_PROJECT_INVALID` before mutation. A proposal scope tamper remains `CANONICAL_ADMISSION_SOURCE_MISMATCH`.

Normative additional-policy examples are: an existing `evidence` node used as target; a Project scope missing `territoryId`; `scope.projectId !== Project.id`; a non-empty but non-exact-trimmed `scope.userId` such as `" user:self "`; or an extra scope key. Each returns `TARGET_PROJECT_INVALID`. An empty or whitespace-only `scope.userId`, and likewise an empty or whitespace-only `scope.projectId`, is already rejected by the generic Graph boundary and returns `INVALID_CONTEXT_GRAPH`; Phase 4E does not reclassify it. A valid Project with a non-matching Import Plan `scopeKey` returns `TARGET_SCOPE_UNSUPPORTED`.

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

`INVALID_CANONICAL_ADMISSION_INPUT`, `INVALID_ADMISSION_POLICY_VERSION`, `INVALID_CONTEXT_GRAPH`, `INVALID_IMPORT_PLAN`, `INVALID_AUTHORIZATION_SELECTION`, `TARGET_PROJECT_NOT_FOUND`, `TARGET_PROJECT_INVALID`, `TARGET_SCOPE_UNSUPPORTED`, `CANDIDATE_NOT_FOUND`, `CANONICAL_NODE_ID_INVALID`, `CANONICAL_ADMISSION_PLAN_INVALID`, `CANONICAL_ADMISSION_COVERAGE_MISMATCH`, `CANONICAL_ADMISSION_SOURCE_MISMATCH`, `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH`, `CANONICAL_APPLY_CONFLICT`, `CANONICAL_GRAPH_RESULT_INVALID`.

`CANDIDATE_NOT_ADMISSIBLE` is not a v0.1 public code because the accepted Import Plan Validator already fixes the only supported Candidate admissibility shape. `CANONICAL_NODE_CONFLICT` is not a build/plan error: same-ID different-content is a `conflict` Decision and becomes `CANONICAL_APPLY_CONFLICT` only at the write boundary.

`TARGET_PROJECT_NOT_FOUND` means the target ID is absent. `TARGET_PROJECT_INVALID` means it exists but is not a Project or its Project scope is invalid/inconsistent. `TARGET_SCOPE_UNSUPPORTED` means the valid target has `scopeKey !== projectId`.

The standalone Admission Plan Validator checks exact schema, canonical ID formula, fixed values, ordering, decision/proposal coverage, counts, and mechanical safety. It does not claim to prove upstream Import Plan binding. Apply uses `CANONICAL_ADMISSION_SOURCE_MISMATCH` for sourcePlan/target mismatches and any Candidate-derived proposal mismatch, including title, summary, payload, provenance, or scope tampering.

`CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH` is separate and non-retryable. It is used only when a valid apply-time selection disagrees with the Admission Plan's authorized/deferred Decision and proposal partition. Standalone structural validity proves neither upstream Candidate provenance nor external explicit authorization; Apply rebinds the former through `importPlan` and the latter through `authorizedCandidateIds`.

The canonical ID must be recomputed from the Candidate ID's implied `sourceRecordId` and Admission Plan `generatedAt`; mismatch is `CANONICAL_NODE_ID_INVALID`. Each node proposal has exactly `id`, `kind`, `title`, `summary`, `scope`, `lifecycle`, `epistemic`, `provenance`, `governance`, and `payload`.

## Apply-time reconciliation races

Apply rechecks current Graph state after all validation and before any append. A planned `insert` with a missing current node remains insertable; with an exact identical current node it is an idempotent noop; with different content it fails with `CANONICAL_APPLY_CONFLICT`. A planned `noop` remains noop only when the identical node is still present; if it is missing or different, apply fails with `CANONICAL_APPLY_CONFLICT`. A planned `conflict` always fails with that code. Deferred Candidates do not participate in apply. All checks complete before one atomic new Graph is constructed; any failure produces zero insertion.

Before reconciliation, Apply constructs `authorizedSet = new Set(authorizedCandidateIds)` and walks Candidates in Import Plan order. A selected Candidate must have exactly one `insert`, `noop`, or `conflict` Decision and exactly one proposal. An unselected Candidate must have `deferred` with reason `not-authorized` and no proposal. The selection set and the Decision/proposal authorization partition must be exactly equal; any mismatch is `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH`, with zero mutation. This check precedes all race reconciliation.

`CANONICAL_GRAPH_RESULT_INVALID` is a defensive-only result boundary for a pure append whose final Graph unexpectedly fails Context Graph validation; it is normally unreachable for accepted validated inputs.

## Example and acceptance boundary

`examples/nexus-atlas-canonical-admission-v0.1.json` is a design example based on the accepted Self-Context Graph and accepted Context Import Plan. It contains eight explicitly authorized Candidates, eight Evidence proposals, eight inserts, zero noop, zero conflict and zero deferred. It does not copy the source files or mutate the canonical fixture.

`examples/nexus-atlas-canonical-admission-cases-v0.1.json` is Accepted and freezes 32 design cases: Schema 6, Input/Target 7, Admission/Reconciliation 8, Governance/Safety 7, and Determinism/Application 4. Its behavior vocabulary is a closed set of 14 handlers and its public error coverage includes every normally triggerable code; only `CANONICAL_GRAPH_RESULT_INVALID` is defensive-only. The Test Matrix is Accepted, expands all 32 cases, and does not substitute “see catalog” for expected semantics. CA-G04 is the apply-time authorization binding mismatch case: an Admission Plan built with one authorized Candidate is applied with an empty selection and must reject atomically with `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH`.

Phase 4E Contract Design is Accepted and the Canonical Admission Runtime is complete after the standalone Validator, Build, Apply, explicit authorization rebinding, upstream binding, target policy, reconciliation, atomic Graph application, 32-case suite, and Accepted Example checks pass. Phase 4F remains planned.

Implementation note: `CanonicalAdmissionError`, the standalone Plan Validator, deterministic admission Builder, apply-time Import Plan and authorization rebinding, strict target Project policy, atomic pure Graph application, and automated 32-case Catalog are implemented. Runtime performs no source re-read, semantic promotion, Edge or ContextPackage mutation, persistent write, or Provider integration.

## Admission Plan exact schema

The Admission Plan has exactly these eight top-level keys and no extras:

```js
{
  admissionVersion,
  policyVersion,
  generatedAt,
  sourcePlan,
  target,
  decisions,
  nodeProposals,
  diagnostics
}
```

`admissionVersion` is exactly `"0.1"`. `policyVersion` is exactly `"github-evidence-canonical-admission-v1"`. `generatedAt` is a valid offset-aware ISO 8601 timestamp and must equal `sourcePlan.generatedAt`; a mismatch is `CANONICAL_ADMISSION_PLAN_INVALID` because it is internal coherence, not upstream source mismatch.

`sourcePlan` has exactly four keys:

```js
{ planVersion, policyVersion, generatedAt, candidateIds }
```

Its fixed values are `planVersion: "0.1"` and `policyVersion: "github-context-import-policy-v1"`; its `generatedAt` equals the Admission Plan `generatedAt`. `candidateIds` has at least two unique non-empty trimmed strings, each beginning `candidate:evidence:github:`, and preserves source order. Apply still compares this descriptor exactly with the real Import Plan Candidate order.

`target` has exactly `{ projectId, scopeKey }`, both non-empty trimmed strings. The v1 standalone Plan rule requires `scopeKey === projectId` and reports a malformed generated Plan as `CANONICAL_ADMISSION_PLAN_INVALID`; build-time policy rejection remains `TARGET_SCOPE_UNSUPPORTED`.

Every Decision has exactly `{ candidateId, canonicalNodeId, disposition, reason }`. Each source Candidate ID occurs exactly once and Decisions preserve `sourcePlan.candidateIds` order. The only disposition/reason pairs are `insert/authorized-new-observation`, `noop/authorized-existing-identical`, `conflict/authorized-existing-conflict`, and `deferred/not-authorized`.

For `candidateId: "candidate:evidence:<sourceRecordId>"`, the canonical ID is exactly:

```text
evidence:source-observation:
+ encodeURIComponent(sourceRecordId)
+ ":captured:"
+ encodeURIComponent(admissionPlan.generatedAt)
```

For a valid upstream chain, `Candidate.provenance.capturedAt === Import Plan.generatedAt === Admission Plan.generatedAt`, so this is one unified capture-time rule rather than two independent time sources. No second admission timestamp, current clock, or `Date.now()` is permitted.

## Canonical proposal exact schema

Every `nodeProposal` has exactly these ten top-level keys:

```js
{
  id, kind, title, summary,
  scope, lifecycle, epistemic, provenance, governance, payload
}
```

`kind` is exactly `"evidence"`; `id` equals its Decision's canonical ID. `title` and `summary` are non-empty trimmed strings and `summary === payload.claim`. `scope` has exactly `{ userId, territoryId, projectId }`, with all three values non-empty trimmed strings. Standalone validation checks only this shape; build and apply additionally require exact equality with the target Project scope.

`lifecycle` has exactly `{ state, createdAt, updatedAt }` and is `{ state: "active", createdAt: generatedAt, updatedAt: generatedAt }`. `epistemic` has exactly `{ verification, confidence, freshness }` and is `{ verification: "confirmed", confidence: 1, freshness: "unknown" }`. `governance` has exactly `{ sensitivity, inheritance, requiresConfirmation }` and is `{ sensitivity: "personal", inheritance: "project_only", requiresConfirmation: false }`.

`provenance` has exactly `{ provider, reference, capturedAt, retrievalMode, authority }`; its internal minimum is `provider: "github"`, a non-empty trimmed reference, `capturedAt === generatedAt`, `retrievalMode: "read-only-api"`, and a non-empty trimmed authority. Apply compares it deep-equal to the exact Import Plan Candidate provenance. `payload` has exactly `{ claim, sourceRef, observedAt, appliesToVersion, verificationMethod, result }`; claim and sourceRef are non-empty trimmed strings, observedAt is null or offset-aware ISO, appliesToVersion is exactly null, verificationMethod is exactly `"github-source-snapshot-v0.1"`, result is non-empty, and summary equals claim. Apply compares it deep-equal to the exact Candidate proposedPayload.

## Standalone and upstream boundaries

`validateCanonicalAdmissionPlanV01(admissionPlan)` proves only exact internal schema, fixed policy/version, the unified capture time, target descriptor shape, canonical ID formula, Decision order and pairing, proposal structure and defaults, proposal coverage, and diagnostics consistency. Structural validity is not equivalent to upstream provenance binding.

`applyCanonicalAdmissionPlanV01({ graph, importPlan, admissionPlan, authorizedCandidateIds })` validates the Graph, Import Plan, Admission Plan, and authorization selection; compares sourcePlan descriptor and target exactly; reconstructs the expected proposal from each exact Candidate; and compares title, summary, payload, provenance, and scope. These provenance/content mismatches are `CANONICAL_ADMISSION_SOURCE_MISMATCH`. It then verifies the independent authorization partition before performing the frozen reconciliation and atomic application checks already defined above. The exact apply input is four keys and no authorization object is embedded in the Admission Plan.

`nodeProposals` contains exactly one proposal for each `insert`, `noop`, or `conflict` Decision, none for `deferred`, and preserves the relative order of non-deferred Decisions. Any relation mismatch is `CANONICAL_ADMISSION_COVERAGE_MISMATCH`.

`diagnostics` has exactly `{ candidateCount, authorizedCount, deferredCount, proposalCount, insertCount, noopCount, conflictCount, applyAllowed }`. Every count is a non-negative safe integer; candidate count equals source Candidate count, authorized plus deferred equals candidate count, proposal count equals authorized count, disposition counts equal actual Decisions, and `applyAllowed === (conflictCount === 0)`. Malformed shape is `CANONICAL_ADMISSION_PLAN_INVALID`; count or coverage mismatch is `CANONICAL_ADMISSION_COVERAGE_MISMATCH`.

## Authorization binding closure

Candidate correctness and authorization correctness are independent proofs:

```text
Validated Import Plan
        ↓
Candidate provenance/content binding

Explicit authorizedCandidateIds
        ↓
Apply-time authorization binding

Canonical Admission Plan
        ↓
Apply re-validates both bindings

Canonical Graph
```

The Admission Plan schema remains exactly eight top-level keys; it gains no `authorization` or `authorizedCandidateIds` field. Copying selection into a potentially tampered Admission Plan would not prove authorization. The standalone validator remains structural-only.

Two tamper examples are normative. If the original authorization is `[]` but a tampered Admission Plan changes Candidate A from `deferred` to `insert` with an otherwise correct proposal, Apply returns `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH` with zero mutation. If the original authorization is `[A]` but a tampered plan changes A from `insert` to `deferred`, Apply returns the same error with zero mutation. Authorization list order does not affect Build or Apply output: `[A, C, B]` and `[B, A, C]` are the same selection set, while Decisions and proposals remain in Import Plan order.

The error vocabulary has 16 non-retryable codes. `CANONICAL_ADMISSION_SOURCE_MISMATCH` is reserved for sourcePlan, target, Candidate-derived title/summary/payload/provenance/scope, and deterministic policy-output mismatches. `CANONICAL_ADMISSION_AUTHORIZATION_MISMATCH` is reserved for the authorization partition. `CANONICAL_GRAPH_RESULT_INVALID` remains defensive-only.

## Upstream GitHub core invariant

Phase 4E accepts only validated Phase 4D Import Plans. Therefore every GitHub v1 Admission Case inherits the Source Snapshot / Import Plan core singleton invariant:

- exactly one repository Candidate;
- exactly one default branch Candidate;
- any additional commit, issue, pull request, release, or tag Candidate is additive;
- authorization may select only the Candidate under test, but unselected core Candidates remain present as deferred Decisions.

“Test one Candidate” does not mean “construct a one-Candidate Import Plan.”
