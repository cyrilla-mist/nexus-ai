# Nexus Atlas v0.1 — Continuity Product Surface Contract

**Status:** Binding Phase 8A contract  
**Parent:** Phase 8 — Continuity Product Surface

## 1. Purpose

The Continuity Product Surface is the browser-safe read model for the accepted continuity state of one project.

It projects accepted Phase 6/7 artifacts into a bounded product representation. It does not create new truth, new authority, or a new persistence layer.

## 2. Required accepted inputs

The projector requires:

- one accepted Phase 7G `WritebackManagementSurface`;
- one accepted Phase 6 `TrustedCheckpoint` representing the latest trusted checkpoint shown by that management surface;
- zero or one accepted Phase 6 `OutcomeRecord` representing the latest Outcome shown by that management surface;
- one accepted Phase 6 `ContinuityAssessment` bound to the same project and checkpoint;
- `generatedAt` as a strict offset ISO timestamp.

All accepted validators must be reused. The projector must fail closed on malformed or cross-project inputs.

## 3. Binding rules

1. all supplied artifacts use the same `projectRef`;
2. management history must contain the supplied Trusted Checkpoint as its newest checkpoint record;
3. when a latest Outcome is supplied, management history must contain it as its newest Outcome record;
4. when management history has at least one Outcome record, latest Outcome is mandatory;
5. when management history has no Outcome records, latest Outcome must be `null`;
6. Continuity Assessment must reference the supplied checkpoint;
7. `generatedAt` may not predate the newest supplied checkpoint, Outcome or assessment timestamp that can be compared safely;
8. projected content is deterministic and deeply immutable.

## 4. Browser surface shape

Version:

```text
nexus-atlas.continuity-product-surface.v0.1
```

Top-level fields:

```text
version
surfaceId
projectRef
generatedAt
resumeState
continuity
trustedCheckpoint
latestOutcome
history
verification
writebackSafety
capabilities
```

### Resume state

The resume state is copied only from the accepted Trusted Checkpoint:

```text
trustedDirection
activeObjective
nextActionRef
nextActionSummary
```

No model-generated replacement action may appear here.

### Continuity

```text
assessmentRef
validity                 VALID | INVALID | AMBIGUOUS
humanAuthorityRequired
reentryPackageAllowed
```

The projector copies accepted assessment semantics exactly. It does not recompute validity.

### Trusted checkpoint

Browser-safe checkpoint summary:

```text
checkpointRef
version
createdAt
evidenceCursor: provider / scopeRef / cursorType / capturedAt
confirmationAuthority
```

The browser surface intentionally omits governing text arrays, raw provenance payloads and internal confirmation basis details.

### Latest Outcome

`null` when no Outcome exists. Otherwise:

```text
outcomeRef
verificationState       verified | failed | indeterminate
recordedAt
actionRef
failureReason
```

The projection does not expose raw observed postcondition payloads or execution internals.

### History

The projector reuses the bounded Phase 7G management summaries:

```text
outcomes
checkpoints
```

No full Outcome/Checkpoint artifacts are copied into browser history.

### Verification

The projector reuses Phase 7G cross-source verification counts and provider/profile summary exactly.

### Write-back safety

Browser-safe safety state includes:

```text
targetRef
providerKind
durability
requireVerifiedOutcomeForCheckpointAdvance
requireExactReadAfterWrite
retentionMode
deletionAllowed
```

No connection identifiers, database identifiers, credentials or local paths are exposed.

## 5. Fixed browser capabilities

Every accepted v0.1 surface must have:

```text
readOnly = true
writeAllowed = false
deleteAllowed = false
productionProvisioningAllowed = false
canonicalContextWriteAllowed = false
autonomousExecutionAllowed = false
humanAuthorityDecisionAllowed = false
```

`humanAuthorityDecisionAllowed=false` means the browser projection itself cannot manufacture or submit Human Authority. A later explicitly governed interaction flow may collect a current human response, but that is outside 8A.

## 6. Privacy / data minimization

The surface must not expose:

- credentials or tokens;
- raw D1 metadata / database identifiers;
- filesystem paths;
- raw provider payloads;
- full evidence bodies;
- hidden reasoning / traces;
- arbitrary provenance metadata;
- synthetic authority fields not accepted upstream.

## 7. No semantic reinterpretation

The projector must never:

- convert `failed` or `indeterminate` Outcome into success;
- infer a replacement next action;
- convert `AMBIGUOUS` into a selected option;
- promote Cross-source Verification into a durable Outcome;
- advance a checkpoint;
- mutate Canonical Context;
- perform external execution;
- write to D1 or any other store.

## 8. Acceptance

Phase 8A is accepted only when executable tests prove:

- accepted input validation;
- exact project/checkpoint/outcome bindings;
- deterministic identity and immutability;
- exact validity / Outcome-state preservation;
- bounded browser fields;
- fixed non-writing capabilities;
- cross-project / stale/tampered rejection;
- Phase 7G, Phase 7F and Phase 6 regressions remain green.
