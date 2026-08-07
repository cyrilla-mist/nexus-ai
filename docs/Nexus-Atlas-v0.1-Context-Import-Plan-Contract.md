# Nexus Atlas — Context Import Plan v0.1 Contract

**Status:** Proposed for Phase 4D acceptance  
**Target:** Phase 4D Planner Runtime  
**Implementation:** Not started  
**Phase:** Phase 4D Context Import Planner Contract Design  
**Canonical Mutation:** None  
**External Read:** None

## 1. Boundary

A Context Import Plan is an immutable, deterministic proposal that maps a validated Source Snapshot into provenance-preserving candidate context records. It is not a Canonical Graph mutation, does not itself admit records into Nexus Context, and cannot convert source-local observations into human-authority facts.

Phase 4D freezes:

Source Snapshot → Context Import Plan → Candidate Context Records

The Planner is a pure local transformation. It does not access GitHub, a Source Client, a Provider, the current time, a Graph, or user confirmation, and it never modifies its input Snapshot. Governance and Canonical Graph integration remain Phase 4E.

## 2. Planner input

The input object is exactly:

    {
      snapshot,
      policyVersion,
      projectId,
      scopeKey
    }

All fields are explicit and no defaults are permitted. snapshot must be a validated Source Snapshot v0.1. For GitHub v1, snapshot.adapter must equal github. policyVersion must equal github-context-import-policy-v1; projectId and scopeKey must be non-empty strings and are independent values. The Planner does not prove that the target Project exists and does not require projectId === scopeKey.

## 3. Plan top-level contract

The Plan top level is exactly:

    {
      planVersion,
      policyVersion,
      generatedAt,
      sourceSnapshot,
      target,
      candidates,
      exclusions,
      diagnostics
    }

planVersion is 0.1; policyVersion is github-context-import-policy-v1; generatedAt is exactly snapshot.capturedAt. The Planner must not call Date.now(), new Date(), use randomness, read process.env, perform network I/O, or write files.

The Plan must not contain graph, nodes, edges, contextPackage, decisionLedger, memoryLedger, mutations, writes, apply, commit, userConfirmation, rawSnapshot, rawSourceResponse, or token.

### 3.1 sourceSnapshot descriptor

The descriptor is exactly:

    {
      snapshotVersion,
      adapter,
      capturedAt,
      repositoryRef,
      recordIds
    }

Values come from the input Snapshot. repositoryRef is snapshot.scope.repositoryRef. recordIds is the ordered list of snapshot.records[*].sourceRecordId and preserves accepted Snapshot order. The Plan does not copy record payloads, raw responses, credentials, or tokens.

### 3.2 target

The target is exactly:

    {
      projectId,
      scopeKey
    }

It identifies a future admission scope only. It does not contain userId, territoryId, canonicalId, or repositoryRef and does not assert that a Graph Project exists.

## 4. Candidate Context Record v0.1

Every Candidate is exactly:

    {
      candidateId,
      targetKind,
      sourceRecordIds,
      mappingRule,
      title,
      summary,
      proposedPayload,
      provenance,
      admission
    }

A Candidate is not a ContextNode. Candidate top-level fields must not include id, kind, scope, lifecycle, epistemic, governance, verification, confidence, freshness, or canonicalId. GitHub v1 targetKind is closed to evidence; it never emits identity, project, goal, milestone, event, decision, memory, risk, action, or source.

### 4.1 Identity and cardinality

One Source Record produces at most one Candidate. Under GitHub v1, every accepted Source Record produces exactly one Candidate. The identity is candidate:evidence:<sourceRecordId>. It is deterministic and stable, contains no timestamp, array index, title, or generatedAt, and is not a Canonical node ID.

sourceRecordIds is an array of exactly one item: the corresponding Source Record ID. Aggregation is not defined in v0.1.

### 4.2 Closed mapping rules

The seven mapping rules are:

- github-repository-state-to-evidence
- github-branch-state-to-evidence
- github-commit-state-to-evidence
- github-issue-state-to-evidence
- github-pull-request-state-to-evidence
- github-release-state-to-evidence
- github-tag-state-to-evidence

sourceType selects exactly one rule; free-form rules are invalid.

### 4.3 Proposed payload

Every GitHub v1 Candidate has exactly:

    {
      claim,
      sourceRef,
      observedAt,
      appliesToVersion,
      verificationMethod,
      result
    }

sourceRef is the Source Record sourceRecordId. observedAt is the Source Record observedAt, including null; it is never replaced by snapshot.capturedAt. appliesToVersion is always null because a GitHub observation cannot decide Project.currentVersion. verificationMethod is github-source-snapshot-v0.1; result is the Source Record observedState.

Claims are mechanical observations only:

| Source type | Claim |
|---|---|
| repository | GitHub repository <repositoryRef> is <observedState>. |
| branch | GitHub default branch <branchName> points to commit <headSha>. |
| commit | GitHub commit <sha> is present. |
| issue | GitHub issue #<number> is <observedState>. |
| pull_request | GitHub pull request #<number> is <observedState>. |
| release | GitHub release <tagName> is <observedState>. |
| tag with targetSha | GitHub tag <name> points to commit <targetSha>. |
| tag without targetSha | GitHub tag <name> is present. |

Commit messageHeadline, Issue title/body, PR title/body, and Release name never enter claim, title, or summary. Candidate titles are mechanical: GitHub repository observation; GitHub default branch observation; GitHub commit observation; GitHub issue #<number> observation; GitHub pull request #<number> observation; GitHub release observation; GitHub tag observation. summary is exactly proposedPayload.claim.

### 4.4 Provenance

The provenance shape is exactly:

    {
      provider,
      reference,
      capturedAt,
      retrievalMode,
      authority
    }

provider, capturedAt, and retrievalMode come from Snapshot.source. reference is SourceRecord.reference, falling back to Snapshot.source.reference only when the record reference is null. authority is SourceRecord.authority. Planner output never replaces source authority with human-confirmation, user-intent, project-rationale, or AI inference.

### 4.5 Admission

The admission shape is exactly:

    {
      stage,
      canonicalWriteAllowed,
      confirmationRequirement
    }

GitHub v1 fixes stage to candidate, canonicalWriteAllowed to false, and confirmationRequirement to source-authority-sufficient. That value means only that no confirmation is needed to establish what GitHub returned; it never authorizes a Graph write. human-confirmation-required is reserved for a future human-authority policy.

## 5. Authority and semantic safety

GitHub is authoritative only for source-local state returned within the selected repository and capture time. It may propose Evidence Candidates, but it cannot automatically produce or confirm Identity, Decision, Memory, Goal, Action, Risk, Project state, or Milestone completion.

Fixed prohibitions:

| Observation | Never infer |
|---|---|
| Open Issue | Nexus Action |
| Merged PR | Phase complete or Milestone complete |
| Published Release | Project currentVersion |
| Present Tag | User-approved Release |
| Present Commit | Decision rationale |
| Archived Repository | User abandoned project |

Candidate identity is not Canonical identity. Candidate provenance is not Canonical verification, confidence, or freshness. Phase 4D assigns no epistemic fields, canonical IDs, deduplication, supersession, or Graph edges.

## 6. Exclusions and coverage

The Plan always includes exclusions, normally [] for the accepted GitHub v1 seven-type profile. If a future policy cannot map a record, it must emit exactly:

    {
      sourceRecordId,
      reason,
      rule
    }

Allowed rule values are unsupported-source-type, policy-excluded, authority-insufficient, and unsafe-semantic-promotion. Records must never be silently dropped.

The exact partition invariant is:

candidate sourceRecordIds UNION exclusion sourceRecordIds
=== snapshot.records sourceRecordIds

Each input Source Record occurs exactly once in the union, never in both sides and never in neither side. Candidate ordering follows Snapshot order. Exclusion ordering is deterministic by sourceRecordId, then rule.

## 7. Diagnostics

The diagnostics shape is exactly:

    {
      coverageComplete,
      sourceRecordCount,
      candidateCount,
      exclusionCount,
      byTargetKind,
      byConfirmationRequirement
    }

For normal GitHub v1: coverageComplete is true; sourceRecordCount equals snapshot.records.length; candidateCount equals candidates.length; exclusionCount equals exclusions.length; byTargetKind is { evidence: count }; and byConfirmationRequirement is { "source-authority-sufficient": count }. All sums agree. These diagnostics describe mapping/admission coverage and do not copy Source Snapshot pagination diagnostics.

## 8. Error vocabulary

The future ContextImportPlanError boundary has exactly these 12 codes and does not reuse SourceAdapterError:

- INVALID_IMPORT_PLAN_INPUT
- INVALID_POLICY_VERSION
- INVALID_PROJECT_ID
- INVALID_SCOPE_KEY
- INVALID_SOURCE_SNAPSHOT
- SOURCE_SNAPSHOT_UNSUPPORTED
- SOURCE_RECORD_UNMAPPED
- CANDIDATE_ID_INVALID
- CANDIDATE_DUPLICATE
- IMPORT_PLAN_COVERAGE_MISMATCH
- IMPORT_PLAN_SOURCE_MISMATCH
- IMPORT_PLAN_INVALID

Input: INVALID_IMPORT_PLAN_INPUT, INVALID_POLICY_VERSION, INVALID_PROJECT_ID, INVALID_SCOPE_KEY, INVALID_SOURCE_SNAPSHOT, SOURCE_SNAPSHOT_UNSUPPORTED. Mapping: SOURCE_RECORD_UNMAPPED, CANDIDATE_ID_INVALID, CANDIDATE_DUPLICATE, IMPORT_PLAN_SOURCE_MISMATCH. Structural: IMPORT_PLAN_COVERAGE_MISMATCH, IMPORT_PLAN_INVALID. All are non-retryable because the future Planner is a deterministic local transformation with no network, authentication, or rate-limit boundary.

## 9. Determinism and phase boundary

The future Runtime must produce deep-equal Plans for identical Snapshot, policy, project, and scope; preserve input identity and values; return a deeply frozen output; and preserve Snapshot order. It must not read current time, randomness, environment variables, or external sources.

Phase 4D is Snapshot → Candidate Plan. Phase 4E handles governance, canonical Evidence proposal/admission, Graph target checks, duplicate reconciliation, canonical identity, supersession, and Graph updates. Phase 4D does not validate Project existence, duplicate canonical Evidence, Context Packages, Ledgers, Graph edges, or writes.

## 10. Compatibility and status

The Canonical Context Model recognizes identity, project, goal, milestone, event, decision, evidence, memory, risk, action, and source. GitHub v1 proposes only evidence. Candidate records deliberately do not copy ContextNode and do not define a future Evidence node ID. The Context Model remains unchanged.

This document freezes the Phase 4D contract only. Planner Runtime is not implemented, Canonical Graph mutation is not implemented, no ContextNode is created, and no live GitHub read is performed.

