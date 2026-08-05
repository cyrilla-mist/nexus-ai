# Nexus Atlas — Generalized Context Package v0.3 Contract

**Status:** Accepted
**Target:** Phase 3B
**Implementation:** Not started
**Phase:** Phase 3A Contract Design Complete
**Compatibility:** Context Package v0.2 preserved

## 1. Purpose

This contract defines a generalized, deterministic Context Package projection for one explicitly selected project. It governs effective decisions, decision supersession chains, unresolved conflicts, safely inherited memories, evidence, generic records, omissions, and an auditable source summary.

The contract does not modify the canonical graph, automatically confirm a user decision, or write to an external system. A package is a derived projection, not new canonical truth.

## 2. Architecture responsibilities

### Canonical Context Graph

The Graph is the sole canonical source for records and relationships: `ContextNode`, `ContextEdge`, lifecycle, epistemic state, provenance, governance, canonical payload, and relations such as `supersedes`, `supports`, and `contradicts`. It does not store effective decisions, inherited memories, package sections, `sourceSummary`, or derived conflict resolution.

### Decision / Memory Ledger

The Ledger is the sole Decision and Memory governance authority. It provides effective and proposed decisions, chains, unresolved conflicts, inherited/inferred/disputed/historical memories, and omissions. A Builder must not reimplement authority resolution, supersession traversal, conflict detection, memory inheritance, revoked-terminal recovery, or effective selection.

### Generalized Package Builder

The future Builder validates Graph/Ledger identity and scope, reads canonical content from the Graph, uses Ledger classifications and IDs, safely projects records, classifies non-Decision/Memory sections, normalizes omissions, computes `sourceSummary`, sorts deterministically, and deep-freezes a new result. It must not mutate either input, re-resolve governance, auto-confirm records, call the network, read current time, read environment state, or write files.

### Provider

The Provider only loads data, calls validators, obtains or builds the Ledger, invokes the v0.2/v0.3 Builder, and caches or assembles read-only results. Resolver rules do not belong in the Provider.

## 3. Version and input contract

The v0.3 `packageVersion` is exactly `"0.3"`. The semantic top-level structure changes, Decision/Memory receive formal sections, project selection is explicit, `sourceSummary` changes from nodes to canonical records, and omissions are normalized. The existing `buildContextPackageV02()` remains independent; Phase 3B adds two independent pure functions without deleting, renaming, or silently changing the old API:

Future API:

```js
export function buildGeneralizedContextPackage({ graph, ledger, projectId, scopeKey, generatedAt })

export function adaptGeneralizedContextPackageToV02(packageV03)
```

All five fields are required. There are no defaults for `project:nexus-atlas`, current time, `graph.metadata.generatedAt`, the first project, or the first Ledger scope. `projectId` and `scopeKey` are non-empty strings; `generatedAt` is valid ISO 8601; Graph passes the existing validator; `ledgerVersion === "0.2"`; `ledger.projectId === projectId`; and `ledger.generatedAt === generatedAt`.

The current Ledger has no top-level `scopeKey`, so every chain, effective/proposed Decision, Memory in all four sections, and unresolved conflict must have the input `scopeKey`. Empty sections are valid. Phase 3A does not change Ledger schema.

`buildGeneralizedContextPackage` receives Graph and Ledger inputs and builds the v0.3 Package. `adaptGeneralizedContextPackageToV02` receives only an already completed v0.3 Package: it does not access Graph or Ledger, re-resolve governance, migrate the Provider, or modify its input, and its output is deeply frozen. Phase 3C owns Provider migration; the old `buildContextPackageV02` never delegates automatically to either new function.

## 4. Single-project selection

One v0.3 Package represents one explicitly selected project. The selected node must exist, have `kind: "project"`, active lifecycle, confirmed verification, current freshness, and non-restricted governance. Failures are `PROJECT_NOT_FOUND`, `PROJECT_KIND_MISMATCH`, or `PROJECT_NOT_ELIGIBLE`.

A multi-project Graph is supported only through explicit `projectId`. The Builder never chooses the first or newest project and never aggregates projects. Records belonging to other projects do not enter the Package, omissions, or `sourceSummary`; they are out of selected scope, not governance omissions.

## 5. Top-level schema

```json
{
  "packageVersion": "0.3",
  "packageId": "context-package:<projectSlug>:<timeSlug>",
  "generatedAt": "",
  "scope": { "projectId": "", "scopeKey": "" },
  "project": {},
  "identity": { "confirmed": [], "inferred": [] },
  "goals": { "active": [] },
  "decisions": { "effective": [], "proposed": [], "chains": [] },
  "memories": { "inherited": [], "inferred": [], "disputed": [], "historical": [] },
  "evidence": { "current": [], "inferred": [], "disputed": [], "historical": [] },
  "records": { "disputed": [], "historical": [] },
  "risks": { "open": [] },
  "actions": { "next": [] },
  "conflicts": { "unresolved": [] },
  "omissions": [],
  "sourceSummary": { "basis": "canonical-records", "totalIncludedRecords": 0, "providers": {}, "byKind": {} }
}
```

No `rawGraph`, `rawLedger`, resolver internals, secrets, or environment state may be added. Conflicts live only in `conflicts.unresolved`, never in `decisions.conflicts` or `memories.conflicts`.

## 6. Projection contracts

`project` is `{ id, kind, title, summary, currentPhase, currentVersion, currentMilestoneId, repositoryRefs, source }`, populated from the selected canonical node, not hardcoded. Base-safe sections—`identity.confirmed`, `identity.inferred`, `goals.active`, `risks.open`, `records.disputed`, and `records.historical`—use `{ id, kind, title, summary, lifecycle, verification, confidence, freshness, source }`. `source` is derived only from Graph provenance as `{ provider, authority, reference, capturedAt, retrievalMode }`; absent optional fields are `null`, and restricted records, secrets, and local absolute paths never project.

Decision projections are `{ id, kind, title, summary, subjectKey, scopeKey, question, choice, rationale, evidenceRefs, decisionStatus, verification, freshness, decidedAt, decidedBy, source }`. Content comes from Graph; Ledger supplies classification and IDs. Effective and proposed IDs must exactly match Ledger sections. Historical Decisions are not proposed, and inferred verification remains inferred.

Chains preserve the safe Ledger shape `{ subjectKey, scopeKey, rootDecisionIds, orderedDecisionIds, terminalDecisionIds, chainStatus }`. References must be existing, non-restricted Decision IDs; `chainStatus` is one of `resolved`, `branching`, `incomplete`, `no_effective_decision`. Historical Decision payloads appear only through chain IDs.

Memory projections are `{ id, kind, title, summary, subjectKey, scopeKey, statement, basis, memoryStatus, verification, confidence, freshness, relatedEntityRefs, conflictsWith, source }`. Sections map exactly to `inheritedMemories`, `inferredMemories`, `disputedMemories`, and `historicalMemories`. Decisions never enter Memory sections.

Evidence projections are `{ id, kind, title, summary, claim, sourceRef, observedAt, appliesToVersion, verificationMethod, result, verification, confidence, freshness, source }`. Current, inferred, disputed, and historical classification follows lifecycle, epistemic, freshness, selected scope, governance, and non-revoked rules. Evidence is not classified by the Decision/Memory Ledger.

Actions use `{ id, kind, title, summary, description, owner, priority, actionStatus, completionCriteria, relatedDecisionRefs, externalEffect, requiresConfirmation, lifecycle, verification, confidence, freshness, source }`. `goals.active`, `risks.open`, and next actions use their canonical kind and governance. Completed actions are excluded; next action status is one of `in_progress`, `ready`, `blocked`, or `proposed`. Non-Decision/Memory/Evidence disputed and historical records go only to `records.disputed` or `records.historical`.

Eligibility is explicit: identity sections require active lifecycle, current freshness, matching confirmed/inferred verification, and allowed governance; goals require active/current, non-disputed verification, and allowed governance; risks require active lifecycle, current freshness, non-disputed verification, and allowed governance; actions require active/current, non-disputed verification, an allowed action status, and allowed governance. Stale or disputed risks/actions therefore fall to generic historical/disputed records rather than overlapping `risks.open` or `actions.next`.

Unresolved conflicts are copied from Ledger without explanation rewriting: `{ conflictId, type, subjectKey, scopeKey, recordIds, explanation, autoResolvable, requiredResolution }`. `recordIds` are sorted, valid, selected-project, non-restricted IDs; conflict ordering is by type, subjectKey, conflictId. The Builder does not resolve conflicts.

## 7. Omissions and consent

Record omissions use `{ id, kind, rule, reason }`; explicit declaration omissions use `{ item, rule: "explicit-declaration", reason }`. Ledger `omittedRecords` are copied rather than recalculated for Decision/Memory. For every non-Decision/Memory record, at most one structured omission is emitted using this first-match priority: `restricted`, `inheritance-never`, `explicit-only-no-consent`, `revoked`, `provenance-insufficient`. A higher-priority match suppresses lower-priority reasons. Explicit declaration omissions remain independent. Omission de-duplication is first-wins by `id + rule` or `item + rule`, preserving normalized order. Restricted omissions must not leak title, summary, statement, choice, payload, or `provenance.reference`. Out-of-scope is never an omission.

The Phase 3 Builder does not accept `consentedRecordIds`. Phase 3B initially excludes non-Decision/Memory `explicit_only` records and emits `explicit-only-no-consent`; it does not introduce a second consent API. Any future consent context requires a separate contract.

## 8. Source summary and determinism

`sourceSummary` is `{ basis: "canonical-records", totalIncludedRecords, providers, byKind }`. The included canonical ID set is the union of the project, projected sections, Decision chain references, and conflict references, de-duplicated by node ID. Omissions, out-of-scope records, and restricted records are excluded. Provider and kind totals must each equal `totalIncludedRecords`; keys are lexically sorted. v0.3 never uses `totalIncludedNodes`.

Provenance is a whitelist. `provider` and `authority` must be non-empty strings; missing values cause `provenance-insufficient` for non-Decision/Memory records. Missing `capturedAt`, `retrievalMode`, or `reference` project as `null`. Windows drive paths (`C:\...`), UNC paths (`\\server\...`), POSIX absolute paths (`/home/...`, `/Users/...`), and `file://` references are replaced with `null`; this alone does not create an omission. No free-text token or secret guessing is performed.

Full-record sections are mutually exclusive by canonical ID: identity, goals, effective/proposed decisions, all Memory and Evidence sections, generic records, risks, and actions. Chains and conflict `recordIds` are references and may overlap full projections. A full record in two exclusive sections raises `PACKAGE_SECTION_DUPLICATE`.

Ledger references are scope-checked. Every effective/proposed Decision, Memory, chain reference, and conflict reference must exist in Graph, have the required kind, match `node.scope.projectId === projectId`, match Decision/Memory `payload.scopeKey === scopeKey`, and be non-restricted. Ledger Decision/Memory omissions must likewise identify an existing, selected-scope Decision or Memory; restricted omitted records are valid because they produce only safe omissions. An omission from another project raises `PACKAGE_REFERENCE_SCOPE_MISMATCH` and never enters the selected package.

`packageId` is deterministic: replace each run of characters outside `A-Z a-z 0-9 . _ -` in `projectId` with `-`, trim `-`, replace `:` and `+` in `generatedAt` with `-`, then use `context-package:${projectSlug}:${timeSlug}`. For `project:nexus-atlas` and `2026-08-05T09:00:00+08:00`, the ID is `context-package:project-nexus-atlas:2026-08-05T09-00-00-08-00`.

The Builder uses no `Date.now`, current-time construction, randomness, environment, network, or file writes. Input order of Graph nodes/edges and Ledger arrays cannot change output. Sort projections by ID; Decisions by `decidedAt` then ID; chains by `subjectKey` then `scopeKey`; Memories by `subjectKey`, `lifecycle.updatedAt`, then ID; Evidence by `observedAt` then ID; and conflicts by type, subjectKey, conflictId. Omission order is normalized first-wins order. The new output is deeply frozen and inputs remain unchanged.

## 9. Error vocabulary

Phase 3B may use: `INVALID_GRAPH`, `INVALID_LEDGER`, `INVALID_PROJECT_ID`, `INVALID_SCOPE_KEY`, `INVALID_GENERATED_AT`, `INVALID_PACKAGE_VERSION`, `PROJECT_NOT_FOUND`, `PROJECT_KIND_MISMATCH`, `PROJECT_NOT_ELIGIBLE`, `LEDGER_VERSION_MISMATCH`, `LEDGER_PROJECT_MISMATCH`, `LEDGER_GENERATED_AT_MISMATCH`, `LEDGER_SCOPE_MISMATCH`, `PACKAGE_REFERENCE_MISSING`, `PACKAGE_REFERENCE_KIND_MISMATCH`, `PACKAGE_REFERENCE_SCOPE_MISMATCH`, `PACKAGE_REFERENCE_RESTRICTED`, `PACKAGE_SECTION_DUPLICATE`, and `PACKAGE_SOURCE_SUMMARY_MISMATCH`. `buildGeneralizedContextPackage` does not accept `packageVersion` and always emits `"0.3"`; the pure adapter throws `INVALID_PACKAGE_VERSION` for a non-object input or `packageVersion !== "0.3"`. Phase 3A defines codes only; it does not implement an Error class.

## 10. Legacy compatibility

The existing v0.2 output contains exactly `packageVersion`, `packageId`, `generatedAt`, `project`, `identitySnapshot`, `activeGoals`, `confirmedDecisions`, `currentEvidence`, `disputedContext`, `staleContext`, `openRisks`, `nextActions`, `omittedContext`, and `sourceSummary`. The pure `adaptGeneralizedContextPackageToV02(packageV03)` returns all of those fields. It copies `generatedAt`, maps `project`, `identity.confirmed + identity.inferred`, `goals.active`, `decisions.effective`, `evidence.current`, `memories.disputed + evidence.disputed + records.disputed`, `memories.historical + evidence.historical + records.historical`, `risks.open`, and `actions.next`.

The legacy package ID removes the leading `project:` from `packageV03.scope.projectId`, applies the v0.3 safe slug rule, and combines it with the same time slug: `context-package:nexus-atlas:2026-08-05T09-00-00-08-00`. Record omissions become `{ id, reason, rule }`; explicit declarations become `{ item, reason }`, with the fixed `explicit-declaration` rule removed. Historical Decision chain IDs, inferred Memories, proposed Decisions, and unresolved conflicts are excluded.

The adapter recomputes—not copies—legacy source summary from unique records actually present in the mapped v0.2 sections, including the project and excluding omissions, inferred Memories, historical Decisions, proposed Decisions, and conflict-only references. It returns `{ totalIncludedNodes, providers }`, with provider totals equal to `totalIncludedNodes`. The current Self-Context example therefore maps to `totalIncludedNodes: 19` and providers `architecture-baseline: 1`, `context-model: 1`, `governance-design: 5`, `human-decision: 4`, `human-instruction: 1`, `repository: 6`, `roadmap: 1`.

The adapter does not access Graph or Ledger, re-run governance, migrate the Provider, or mutate its input; its result is deeply frozen. `buildContextPackageV02()` remains independent and never automatically delegates to the v0.3 Builder. Phase 3C owns simultaneous Provider output; adapter assessment remains bounded by that phase.

## 11. Phase boundary

This is a Phase 3A design artifact. It does not implement a Builder, Resolver, Ledger runtime, Provider migration, UI integration, Runtime change, external source, or mutation. Phase 3 as a whole remains incomplete until later phases are accepted.
