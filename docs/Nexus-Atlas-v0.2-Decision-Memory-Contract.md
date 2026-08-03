# Nexus Atlas v0.2 — Decision and Memory Resolution Contract

**Status:** Accepted  
**Implementation:** Not started  
**Phase:** 2A Contract Design Complete

## 1. Purpose

This Contract defines how Nexus Atlas determines which decisions are currently effective, builds chains of decisions that replace one another, detects conflicts that cannot be safely resolved automatically, determines which Memory records may be inherited, and produces an explainable deterministic Decision / Memory Ledger.

The Contract does not modify the canonical graph, automatically confirm a user decision, or write to an external system. The Ledger is a derived projection, not new canonical truth.

## 2. Terminology

### Decision Subject

A Decision Subject is a stable semantic key used to determine whether two decisions address the same problem:

```js
{ scopeKey, subjectKey }
```

For example, `scopeKey` may be `project:nexus-atlas`, while `subjectKey` may be `development.repository`, `v0.2.priority`, or `context.state-model`. A title or question alone is not a subject key: wording may change while `subjectKey` remains stable. Different project or user scopes are not the same decision group. Both keys must be non-empty stable strings.

### Effective Decision

A Decision record that satisfies every effective-decision rule and is not superseded or involved in an unresolved conflict for its subject and scope.

### Supersession

An explicit, active `supersedes` relationship in which a successor Decision replaces a predecessor for the same subject and a compatible scope.

### Conflict

A deterministic record that preserves incompatible or structurally ambiguous facts when no unique safe result exists. Conflicts are not silently discarded or arbitrated by AI.

### Memory Inheritance

The governed projection of an eligible Memory record into current context. Inheritance is not a copy into canonical truth and is limited by verification, freshness, lifecycle, governance, sensitivity, scope, and conflict rules.

## 3. Required Decision Fields

A Decision extends the existing Decision payload with:

```js
{
  subjectKey,
  scopeKey,
  question,
  choice,
  rationale,
  evidenceRefs,
  alternatives,
  constraints,
  decidedAt,
  decidedBy,
  decisionStatus,
  supersededBy
}
```

`subjectKey` and `scopeKey` are stable. `evidenceRefs` point to evidence nodes. `decidedBy` uses a stable subject identifier and must not contain sensitive display names. Authority is carried by `provenance.authority`; a `priorityScore` must not replace authority or governance.

## 4. Decision Candidate Rules

A candidate must be a `decision` node whose lifecycle is not `archived` or `revoked`, whose `decisionStatus` is not `revoked`, whose sensitivity is not `restricted`, whose `scopeKey` matches the target scope, and whose subject and scope keys are valid. Required provenance, including authority, must be present. A candidate is not necessarily effective.

## 5. Effective Decision Rules

All of the following are required:

1. `kind` is `decision`.
2. Lifecycle state is `active`.
3. `epistemic.verification` is `confirmed`.
4. `epistemic.freshness` is `current`.
5. `payload.decisionStatus` is `confirmed`.
6. Governance inheritance is `always` or `project_only` as applicable to the target.
7. Sensitivity is not `restricted`.
8. Scope matches the target scope.
9. There is no valid superseding Decision.
10. The Decision is not in an unresolved conflict.

Inferred Decisions are never effective. Proposed status does not cover confirmed status. A stale confirmed Decision is not current. Disputed, revoked, and superseded Decisions are not effective. A newer timestamp alone is insufficient.

## 6. Authority Rules

There is no single score or absolute ordering of all authorities.

1. Human confirmation has highest authority for preferences, goals, and direction.
2. External systems have authority only over their own verifiable state.
3. An external source may confirm a repository SHA or event time, but cannot automatically change product direction.
4. AI inference is always `inferred`.
5. Presence in a proposed document does not upgrade a decision to a confirmed human decision.
6. Recency alone cannot override a confirmed decision.
7. Replacing a confirmed decision requires an explicit `supersedes` edge, the same `subjectKey`, the same or compatible scope, a confirmed successor, sufficient authority, and human confirmation for user direction or preferences.

## 7. Supersession Chain Rules

An eligible supersession is an active `type === "supersedes"` edge from one Decision to another Decision. Its direction is fixed: when Decision A is replaced by Decision B, the canonical edge is `{ "from": "decision:A", "to": "decision:B", "type": "supersedes" }`. `from` is the predecessor (the old record), `to` is the successor (the replacing record), and traversal advances from `from` to `to`. This project defines `supersedes` as a supersession transition, not as the natural-language reading “from supersedes to”. The existing Self-Context graph uses the same old-record-to-new-record direction; Phase 2B must not choose another direction.

For `A → B → C`, `C` is the terminal candidate. `A.payload.supersededBy` must equal `B.id`, `B.payload.supersededBy` must equal `C.id`, and the terminal Decision's `supersededBy` must be `null`. The endpoints must have the same subject key and the same or compatible scope; self-loops and cycles are invalid. Each replaced Decision may have at most one active direct successor. A successor may replace multiple historical branches only when that is explicit. Traversal and ordering are deterministic.

For `A → B → C`, `C` is the terminal Decision. If a Decision has multiple active successors, the result is a `branching_supersession` conflict: no latest branch is selected, all branches remain in the Ledger, and there is no unique effective terminal unless an additional confirmed resolution Decision explicitly resolves them.

If a terminal Decision is revoked, the old Decision is not automatically restored. The chain status is `no_effective_decision`; a new confirmed Decision or explicit reinstatement is required.

## 8. Invalid Supersession

The following are Validation Errors; the Resolver must not generate a Ledger: duplicate IDs (`DUPLICATE_ID`), dangling references (`DANGLING_REFERENCE`), wrong node kinds (`WRONG_REFERENCE_KIND`), self-loops (`SUPERSESSION_SELF_LOOP`), supersession cycles (`SUPERSESSION_CYCLE`), an active edge whose `payload.supersededBy` index disagrees (`DECISION_EDGE_MISMATCH`), missing `subjectKey` (`DECISION_SUBJECT_MISMATCH`), missing `scopeKey` (`DECISION_SCOPE_MISMATCH`), supersession endpoints with different subject keys (`DECISION_SUBJECT_MISMATCH`), and incompatible supersession scopes (`DECISION_SCOPE_MISMATCH`).

The canonical ContextEdge is authoritative for the relationship; `payload.supersededBy` is a redundant index. Mismatches are not silently resolved. Multiple active successors are not a Validation Error: they are the legal `branching_supersession` Resolution Conflict described above.

An edge with `lifecycle.state === "revoked"` is a legal historical record and does not participate in active traversal; a superseded edge likewise does not participate in current traversal. If `payload.supersededBy` still claims an active successor but the only corresponding edge is revoked, the result is `DECISION_EDGE_MISMATCH`.

## 9. Conflict Classification

The minimum conflict types are:

`branching_supersession`, `contradictory_confirmed_decisions`, `authority_conflict`, `scope_conflict`, `temporal_applicability_conflict`, `reference_integrity_conflict`, `decision_edge_mismatch`, `memory_statement_conflict`.

Every conflict has this shape:

```js
{
  conflictId,
  type,
  subjectKey,
  scopeKey,
  recordIds,
  explanation,
  autoResolvable,
  requiredResolution
}
```

`autoResolvable` is false by default. Only structural deduplication and sorting may be automatic. User content is never silently rewritten; record IDs and provenance are preserved. `conflictId` is deterministic and never a random UUID.

## 10. Memory Record Contract

A Memory payload contains:

```js
{
  subjectKey,
  scopeKey,
  statement,
  basis,
  relatedEntityRefs,
  conflictsWith,
  supersededBy,
  memoryStatus
}
```

`memoryStatus` is a domain field with values `recorded`, `inherited`, `superseded`, `disputed`, or `revoked`; it is distinct from lifecycle, verification, and freshness.

## 11. Memory Inheritance

- Confirmed eligible records go into `inheritedMemories`: active, confirmed, current, `memoryStatus` recorded or inherited, matching scope, inheritance `always` or `project_only`, non-restricted, without unresolved conflict, and not actively superseded.
- Inferred records go into `inferredMemories`. Their confidence and inferred label are retained; they are not inherited and cannot override a confirmed record or be the sole basis for a confirmed Decision.
- Disputed records go into `disputedMemories`. They are not inherited; conflict references and provenance are preserved.
- Historical records go into `historicalMemories` when freshness is stale or expired, lifecycle is superseded or archived, or `memoryStatus` is superseded. They remain historical and are not the current default.
- Restricted records, `never`, explicit-only records without consent, revoked records, scope mismatches, and records with missing or noncompliant provenance go into `omittedRecords`. Omission must not leak a restricted title, summary, statement, or payload.

## 12. Memory Conflict

`memory_statement_conflict` applies when two records have the same subject and scope, are both active, confirmed, and current, cannot both hold, and have no explicit supersession. Phase 2A performs no free-text NLP. Phase 2B may use only an explicit `contradicts` edge, `conflictsWith` references, or the same subject with structured mutually exclusive values. No model may make the free decision.

## 13. Ledger Shape

```js
{
  ledgerVersion,
  generatedAt,
  projectId,
  effectiveDecisions,
  decisionChains,
  proposedDecisions,
  unresolvedConflicts,
  inheritedMemories,
  inferredMemories,
  disputedMemories,
  historicalMemories,
  omittedRecords,
  diagnostics,
  sourceSummary
}
```

`effectiveDecisions` contains only Decision records that are effective. `decisionChains` preserves Decision roots, ordered records, terminals, and chain status. `proposedDecisions` contains only Decision records whose `payload.decisionStatus` is `proposed` or whose verification is `inferred`, retaining the inferred label for review. `inheritedMemories` contains only Memory records; `inferredMemories` only inferred Memory records; `disputedMemories` only disputed Memory records; and `historicalMemories` only stale, expired, archived, or superseded Memory records. Decision history exists only in `decisionChains`; old Decisions never enter `historicalMemories`. No Ledger section may contain a record of the other kind. `omittedRecords` records deterministic omission rules without restricted content. `sourceSummary` is a deduplicated, non-secret provenance summary.

Each chain has:

```js
{ subjectKey, scopeKey, rootDecisionIds, orderedDecisionIds, terminalDecisionIds, chainStatus }
```

`chainStatus` is one of `resolved`, `branching`, `incomplete`, or `no_effective_decision`. `resolved` means a unique valid current terminal exists. `branching` means multiple active successors prevent a unique terminal. `incomplete` means the chain is structurally readable but lacks necessary confirmation or authority and is not a Validation Error. `no_effective_decision` means the chain exists but has no terminal satisfying effective rules, such as a stale, revoked, disputed, or proposed terminal after legal supersession, or no eligible Decision. A cycle is a Validation Error and never produces a successful `cyclic` chain. `no_effective_decision` is not automatically an unresolved conflict. `diagnostics` includes at least `decisionCount`, `memoryCount`, `effectiveDecisionCount`, `conflictCount`, `inheritedMemoryCount`, and `omittedCount`.

For the same graph and `generatedAt`, output must be deeply equal. There is no implicit current time or random UUID. Sorting is stable, input is not mutated, and the result is deeply frozen. AI may explain a result but may not decide inheritance.

## 14. Deterministic Sorting

Decisions sort by `subjectKey`, `decidedAt`, then `id`; conflicts by `type`, `subjectKey`, then `conflictId`; memories by `subjectKey`, `lifecycle.updatedAt`, then `id`; omissions by `rule`, then `id`.

## 15. Relationship with ContextPackage

The intended flow is:

```text
Canonical Graph → Decision / Memory Resolver → Ledger → Context Package Projector
```

The Ledger does not replace ContextPackage; it is a governance input. A future package may obtain effective decisions, inherited memories, disputed memories, and historical memories from the Ledger. Phase 2A does not modify the current Projector.

## 16. Error vs Conflict

Validation Errors are structural: duplicate IDs, dangling references, wrong kinds, invalid enums, self-loops, cycles, malformed required fields, missing subject or scope keys, incompatible supersession endpoints, and active edge/payload mismatches. Fixed codes include `DUPLICATE_ID`, `DANGLING_REFERENCE`, `WRONG_REFERENCE_KIND`, `SUPERSESSION_SELF_LOOP`, `SUPERSESSION_CYCLE`, `DECISION_EDGE_MISMATCH`, `DECISION_SUBJECT_MISMATCH`, and `DECISION_SCOPE_MISMATCH`. The Resolver does not generate a Ledger for these errors.

Resolution Conflicts are legal graph states with no unique safe result: multiple active successors produce `branching_supersession`; insufficient authority or inferred replacement produces `authority_conflict`; mutually exclusive confirmed current Decisions produce `contradictory_confirmed_decisions`; mutually exclusive confirmed current Memories with explicit conflict relations produce `memory_statement_conflict`; and uncertain applicability produces `temporal_applicability_conflict`. Reference, wrong-kind, self-loop, and cycle failures are Validation Errors. Stale terminals, revoked terminals, proposed successors, and a subject with no eligible Decision only produce `no_effective_decision` and do not automatically enter `unresolvedConflicts`.

## 17. Security and Privacy

The future implementation must not use environment secrets, network access, or file writes. It must not emit secrets or local absolute paths. Restricted content is excluded. `explicit_only` requires caller consent. A single behavior cannot become a permanent preference; free chat is not confirmed; and no external mutation is allowed.

## 18. Non-Goals

Phase 2A does not auto-edit the graph, auto-confirm a decision, arbitrate with AI, perform free-text NLP conflict resolution, write a database, build UI, create a GitHub adapter, sync Notion or Drive, implement multi-user permissions, take autonomous action, write outcomes back, or import all chat.

## 19. Phase 2B Boundary

Phase 2B may implement a canonical graph extractor, supersession analysis, a deterministic Resolver and Ledger, validation extensions, and synthetic tests. It still must not add UI, live network access, mutation, or automatic replacement of human-confirmed decisions.
