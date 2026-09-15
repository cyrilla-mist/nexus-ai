# Nexus Atlas v0.1 — Continuity Assessment Contract

**Status:** Phase 6C contract — assessment slice  
**Upstream:** Trusted Checkpoint v0.1 + Fresh Evidence Window v0.1  
**First project:** `project:nexus-atlas`  
**Authority rule:** derived assessment is not canonical truth and cannot silently replace protected human intent

---

## 1. Purpose

This slice turns one accepted Trusted Checkpoint plus one **complete** Fresh Evidence Window into a bounded Continuity Assessment:

```text
Trusted Checkpoint
        +
complete Fresh Evidence Window
        +
model-/rule-assisted Assessment Proposal
        ↓
deterministic evidence + authority gate
        ↓
Continuity Assessment
VALID | INVALID | AMBIGUOUS
```

The assessment answers only:

> Does the previously trusted continuation point still support safe continuation against fresh accepted evidence?

It is **not** a project-health score, generic confidence score, replacement Canonical Context, or permission to mutate the project.

---

## 2. Boundary

### In scope

- bind the assessment to one accepted checkpoint and one complete fresh-evidence window;
- accept a bounded semantic proposal from a model/rule/human-assisted interpreter;
- deterministically verify proposal shape, evidence identity and protected-authority semantics;
- emit `VALID`, `INVALID` or `AMBIGUOUS` only when those semantics are satisfied;
- derive one immutable, deterministic assessment artifact;
- indicate whether a Human Authority Gate is required before Re-entry Package construction.

### Out of scope

- asking the human question itself — Phase 6D;
- choosing a replacement bounded action — Phase 6D;
- autonomous GitHub/project mutation;
- outcome/postcondition verification — Phase 6E;
- checkpoint/outcome write-back — Phase 6F;
- browser/UI work;
- Canonical Graph admission or mutation;
- model confidence as authority.

---

## 3. Accepted upstream inputs

The runtime consumes:

1. a `Trusted Checkpoint v0.1` accepted by the frozen Phase 6B validator;
2. a `Fresh Evidence Window v0.1` accepted by the Phase 6C window validator;
3. one `Assessment Proposal v0.1` that contains semantic findings but **does not become trusted merely because a model produced it**.

The window must satisfy:

```text
status = complete
capabilities.assessmentAllowed = true
checkpointRef = checkpoint.checkpointId
projectRef = checkpoint.projectRef
cursorFrom = checkpoint.evidenceCursor
```

A blocked, stale, malformed, scope-mismatched or unrelated window cannot be assessed.

---

## 4. Evidence identity rule

Every consequential assessment finding must cite one or more `sourceRecordId` values that exist in the accepted Fresh Evidence Window.

Allowed assessment evidence is therefore exactly:

```text
freshEvidenceWindow.records[*].sourceRecordId
```

The deterministic gate must reject:

- arbitrary URLs;
- prior assessment IDs;
- prior run-output IDs;
- checkpoint/outcome storage IDs masquerading as fresh source evidence;
- source record IDs not present in this exact window;
- empty evidence linkage on a consequential finding.

This rule prevents prior run output from being fed back as if it were current project truth.

---

## 5. Protected continuation references

For the first Phase 6 loop, the assessment may reason about exactly three checkpoint continuation surfaces:

```text
checkpoint:<checkpointId>#trusted-direction
checkpoint:<checkpointId>#active-objective
checkpoint:<checkpointId>#accepted-next-action
```

The first two are **protected intent surfaces**. Fresh GitHub evidence may reveal a conflict, but it cannot choose a new direction/objective on the user's behalf.

The accepted next action is previously authorized continuation state. Fresh evidence may invalidate that action without necessarily invalidating the broader protected direction/objective.

No other synthetic checkpoint field reference is accepted in v0.1.

---

## 6. Assessment Proposal v0.1

The semantic interpreter supplies this exact conceptual shape:

```js
{
  proposalVersion,
  checkpointRef,
  evidenceWindowRef,
  validity, // VALID | INVALID | AMBIGUOUS
  preservedClaims: [
    {
      claimRef,
      claimType, // trusted-direction | active-objective | accepted-next-action
      summary,
      evidenceRefs
    }
  ],
  invalidatedClaims: [
    {
      claimRef,
      claimType,
      summary,
      evidenceRefs
    }
  ],
  invalidatedNextActions: [
    {
      actionRef,
      summary,
      evidenceRefs
    }
  ],
  unresolvedProtectedAmbiguity: null | {
    ambiguityRef,
    ambiguityKind, // protected-intent-conflict | consequential-choice
    protectedRef,
    summary,
    evidenceRefs
  },
  explanation
}
```

Proposal values are untrusted until the deterministic builder accepts them.

### Bounded text

`summary` and `explanation` are presentation text only. They cannot create evidence or authority. Runtime acceptance should keep them non-empty and bounded so a proposal cannot smuggle arbitrary large source bodies through an assessment artifact.

---

## 7. Finding semantics

### Preserved claim

A preserved claim says that fresh evidence does not invalidate the cited checkpoint continuation surface for this bounded re-entry attempt.

It must:

- resolve to one of the three accepted checkpoint field references;
- have the matching `claimType`;
- cite at least one accepted fresh evidence record;
- not also appear in `invalidatedClaims`.

### Invalidated claim

An invalidated claim says fresh evidence makes the cited checkpoint continuation surface unsafe to continue as previously stated.

If the invalidated claim is `trusted-direction` or `active-objective`, the assessment cannot silently replace it. The result must be `AMBIGUOUS` and must expose one protected ambiguity.

### Invalidated next action

For v0.1, an invalidated next action may reference only:

```text
checkpoint.acceptedNextAction.actionRef
```

It must cite accepted fresh evidence.

A stale prior next action is the canonical first `INVALID` case: broader direction/objective may remain preserved while the old next action no longer holds.

---

## 8. Tri-state contract

### `VALID`

`VALID` means the trusted continuation point still holds for the bounded attempt.

Required deterministic conditions:

- no invalidated claims;
- no invalidated next action;
- no unresolved protected ambiguity;
- preserved findings include all three v0.1 continuation surfaces;
- every preserved finding has accepted fresh evidence linkage.

`VALID` does not mean the project is healthy, complete, low-risk or successful.

### `INVALID`

`INVALID` means the previous continuation point contains an operationally stale continuation assumption/action, but a bounded replacement can be established later without inventing protected intent.

For the first v0.1 slice:

- no protected `trusted-direction` / `active-objective` claim may be invalidated;
- no unresolved protected ambiguity may remain;
- the current `checkpoint.acceptedNextAction.actionRef` must be present exactly once in `invalidatedNextActions`;
- `trusted-direction` and `active-objective` must be preserved with accepted fresh evidence linkage;
- the accepted-next-action surface must be invalidated, not simultaneously preserved.

The assessment itself does not choose the replacement action. That belongs to Phase 6D.

### `AMBIGUOUS`

`AMBIGUOUS` means one consequential protected choice remains and Human Authority is required.

Required deterministic conditions:

- `unresolvedProtectedAmbiguity` is present;
- its `protectedRef` resolves to one accepted checkpoint continuation surface;
- it cites accepted fresh evidence;
- the same proposal may preserve or invalidate non-conflicting surfaces, but cannot claim a protected conflict is already resolved;
- at most one protected ambiguity exists in the bounded attempt.

Two ambiguity kinds are accepted in v0.1:

- `protected-intent-conflict` — fresh evidence conflicts with human-protected direction/objective;
- `consequential-choice` — accepted evidence leaves more than one materially different continuation choice and prior authority does not decide between them.

The assessment stores the ambiguity; Phase 6D owns the minimum human question.

---

## 9. Continuity Assessment v0.1

Accepted output is conceptually:

```js
{
  assessmentVersion,
  assessmentId,
  projectRef,
  checkpointRef,
  evidenceWindowRef,
  observedAt,
  validity,
  preservedClaims,
  invalidatedClaims,
  invalidatedNextActions,
  unresolvedProtectedAmbiguity,
  evidenceRefs,
  explanation,
  authority,
  capabilities: {
    humanAuthorityRequired,
    reentryPackageAllowed
  }
}
```

Required authority:

```text
derived-continuity-assessment
```

The output `evidenceRefs` are derived as the deterministic de-duplicated union of all finding/ambiguity evidence references. The proposal cannot provide a competing top-level evidence list.

### Capabilities

```text
VALID      → humanAuthorityRequired=false, reentryPackageAllowed=true
INVALID    → humanAuthorityRequired=false, reentryPackageAllowed=true
AMBIGUOUS  → humanAuthorityRequired=true,  reentryPackageAllowed=false
```

Phase 6D may later produce an authority decision that unlocks a Re-entry Package for an accepted ambiguity. This v0.1 assessment does not pre-authorize that transition.

---

## 10. Determinism and immutability

For identical accepted inputs:

- `assessmentId` must be identical;
- finding order must be preserved rather than reinterpreted by timestamp;
- top-level `evidenceRefs` must be deterministically derived;
- output must be deeply immutable;
- caller inputs must remain unchanged.

The artifact ID must bind the normalized assessment payload through a deterministic digest.

---

## 11. Fail-closed behavior

The runtime must fail closed when:

- Trusted Checkpoint validation fails;
- Fresh Evidence Window validation fails;
- window is blocked or assessment is not allowed;
- checkpoint/project/window binding is inconsistent;
- proposal has extra/missing fields;
- proposal references unknown evidence;
- proposal cites no evidence for a consequential finding;
- a checkpoint field reference or action reference is not the accepted current value;
- the same claim is both preserved and invalidated;
- validity-specific conditions are inconsistent;
- a model attempts to resolve protected intent without the authority gate;
- an `AMBIGUOUS` proposal contains zero or multiple ambiguities.

No fallback to a guessed validity is allowed.

---

## 12. Privacy / contamination boundary

Continuity Assessment v0.1 may contain only:

- bounded summaries/explanation supplied by the semantic interpreter;
- checkpoint surface/action identities already accepted by Phase 6B;
- evidence record identities from the current accepted Fresh Evidence Window;
- derived state/capability metadata.

It must not copy:

- credentials/tokens;
- author email/private profile data;
- arbitrary commit bodies/comments/reviews;
- local machine paths;
- prior private chat output;
- unrelated source payloads.

Fresh Evidence Window remains the only source-evidence identity universe for this assessment.

---

## 13. Acceptance boundary

This Continuity Assessment slice is accepted only when tests prove:

1. complete-window/checkpoint binding;
2. exact fresh-evidence identity linkage;
3. deterministic `VALID` semantics;
4. stale-next-action `INVALID` semantics without protected-intent mutation;
5. protected conflict / consequential-choice `AMBIGUOUS` semantics;
6. one-ambiguity maximum;
7. rejection of unknown/prior-run evidence IDs;
8. rejection of protected authority guessing;
9. rejection of mixed preserved/invalidated claim state;
10. deterministic ID + deep immutability + caller-input preservation;
11. Phase 6B / Fresh Evidence Window regressions remain green;
12. Phase 4 / Phase 5 frozen acceptance gates remain green.

After this slice is accepted, the next authorized Phase 6 work is **6D — Human Authority Gate + Re-entry Package**. It must not be implemented inside the Continuity Assessment module.