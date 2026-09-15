# Nexus Atlas v0.1 — Human Authority Gate + Re-entry Package Contract

**Status:** Binding Phase 6D contract  
**Parent:** Phase 6 — Real Continuity Loop  
**Upstream:** Trusted Checkpoint v0.1 + Fresh Evidence Window v0.1 + Continuity Assessment v0.1  
**Scope:** one minimum Human Authority transaction when required, then one bounded Re-entry Package. External execution and outcome verification remain downstream.

---

## 1. Goal

Phase 6D turns one accepted Continuity Assessment into exactly one safe continuation surface.

```text
VALID assessment
  → reuse accepted checkpoint next action
  → Re-entry Package

INVALID assessment
  → one bounded evidence-grounded replacement proposal
  → Re-entry Package

AMBIGUOUS assessment
  → one bounded Human Authority question
  → one explicit human answer
  → Human Authority Decision
  → Re-entry Package
```

Phase 6D does **not** execute the action and does **not** claim that the action succeeded.

---

## 2. Authority rules

The authority boundary is strict:

```text
source evidence
  ≠ assessment proposal
  ≠ Continuity Assessment
  ≠ Human Authority Decision
  ≠ verified outcome
```

Rules:

1. `VALID` may reuse only the checkpoint's already accepted next action.
2. `INVALID` may use one bounded replacement only when protected direction/objective were preserved by the accepted assessment.
3. `AMBIGUOUS` may not choose an option until an explicit current human response exists.
4. prior user choices are not reusable as consent for a new ambiguity;
5. model confidence, repository metadata, commit authorship or previous chat output are never Human Authority;
6. at most one consequential human question is allowed in one bounded re-entry attempt;
7. a Re-entry Package is a continuation instruction, not a success claim.

---

## 3. Accepted upstream bindings

Every Phase 6D builder must reuse accepted validators and bind:

- `checkpoint` → accepted Trusted Checkpoint;
- `freshEvidenceWindow` → accepted **complete** Fresh Evidence Window;
- `assessment` → accepted Continuity Assessment;
- `assessment.projectRef === checkpoint.projectRef`;
- `assessment.checkpointRef === checkpoint.checkpointId`;
- `assessment.evidenceWindowRef === freshEvidenceWindow.windowId`;
- `freshEvidenceWindow.checkpointRef === checkpoint.checkpointId`;
- `freshEvidenceWindow.cursorFrom === checkpoint.evidenceCursor`.

No artifact from another project, checkpoint, window or assessment may cross this boundary.

---

## 4. Human Authority Question

A Human Authority Question exists only for an accepted `AMBIGUOUS` assessment with:

```text
capabilities.humanAuthorityRequired = true
```

The unresolved ambiguity from the assessment is authoritative only as a **need for authority**, not as a selected answer.

### 4.1 Question proposal

A semantic interpreter may propose one bounded question:

```js
{
  proposalVersion: "nexus-atlas.human-authority-question-proposal.v0.1",
  assessmentRef,
  ambiguityRef,
  question,
  options: [
    {
      optionRef,
      label,
      authorityValue,
      nextAction: {
        actionRef,
        summary,
        basisRefs,
        evidenceRefs
      }
    }
  ],
  explanation
}
```

The proposal is untrusted until deterministic validation succeeds.

### 4.2 Question rules

- exactly one question artifact is produced;
- question text is non-empty, bounded and neutral;
- accepted option count is 2–4;
- option references are unique and deterministic input identities;
- every option contains one bounded next-action candidate;
- every option cites current Fresh Evidence Window evidence identities;
- option `basisRefs` may use only checkpoint `governingRefs` or checkpoint accepted-next-action `basisRefs`;
- the question may not contain a default/recommended/selected option;
- the question must bind exactly the assessment's one unresolved ambiguity;
- no question is permitted for `VALID` or `INVALID`.

### 4.3 Question artifact

```js
{
  questionVersion: "nexus-atlas.human-authority-question.v0.1",
  questionId,
  projectRef,
  checkpointRef,
  assessmentRef,
  ambiguityRef,
  protectedRef,
  question,
  options,
  evidenceRefs,
  explanation,
  authority: "human-authority-required",
  capabilities: {
    answerRequired: true,
    reentryPackageAllowed: false
  }
}
```

Question identity is deterministic over accepted normalized content.

---

## 5. Human Authority Response and Decision

A current human answer is a separate input:

```js
{
  responseVersion: "nexus-atlas.human-authority-response.v0.1",
  questionRef,
  assessmentRef,
  selectedOptionRef,
  actorRef,
  answeredAt
}
```

Rules:

- the response must target the exact current question and assessment;
- selected option must exist in that question;
- actor reference is explicit and non-empty;
- `answeredAt` is a strict offset ISO timestamp;
- the response contains no model-generated authority claim;
- replaying an answer against a different question is rejected.

The deterministic gate emits:

```js
{
  decisionVersion: "nexus-atlas.human-authority-decision.v0.1",
  decisionId,
  projectRef,
  checkpointRef,
  assessmentRef,
  questionRef,
  ambiguityRef,
  protectedRef,
  selectedOptionRef,
  authorityValue,
  nextAction,
  evidenceRefs,
  actorRef,
  answeredAt,
  authority: "human"
}
```

The selected option is copied exactly from the accepted question. The decision builder does not reinterpret it.

---

## 6. INVALID replacement proposal

`INVALID` requires no human question, but it also must not reuse the stale accepted next action.

The first runtime accepts exactly one replacement proposal:

```js
{
  proposalVersion: "nexus-atlas.replacement-action-proposal.v0.1",
  assessmentRef,
  actionRef,
  summary,
  basisRefs,
  evidenceRefs,
  explanation
}
```

Rules:

1. accepted assessment validity is `INVALID`;
2. assessment preserves `trusted-direction` and `active-objective`;
3. action reference differs from `checkpoint.acceptedNextAction.actionRef`;
4. `basisRefs` are non-empty, unique and drawn only from the union of checkpoint `governingRefs` and old accepted-next-action `basisRefs`;
5. evidence references are non-empty, unique and contained in both the accepted Fresh Evidence Window and the assessment evidence universe;
6. only one replacement proposal is accepted in one bounded attempt;
7. the proposal cannot claim Human Authority and cannot mutate protected direction/objective.

If one bounded replacement cannot be supplied under these constraints, Phase 6D fails closed. It does not guess.

---

## 7. Re-entry Package

The Re-entry Package is the only Phase 6D continuation output.

```js
{
  packageVersion: "nexus-atlas.reentry-package.v0.1",
  packageId,
  projectRef,
  checkpointRef,
  assessmentRef,
  evidenceWindowRef,
  preparedAt,
  validity,
  nextAction: {
    actionRef,
    summary,
    basisRefs,
    evidenceRefs
  },
  humanAuthorityDecisionRef,
  verificationPlan: {
    provider: "github",
    scopeRef,
    cursorType: "default-branch-head",
    baselineValue,
    requirement: "fresh-authoritative-reread"
  },
  evidenceRefs,
  authority: "derived-reentry-package",
  capabilities: {
    externalExecutionRequired: true,
    freshVerificationRequired: true,
    autonomousExecutionAllowed: false,
    checkpointWriteAllowed: false,
    outcomeWriteAllowed: false
  }
}
```

### 7.1 VALID package

For `VALID`:

- no Human Authority question/decision is accepted;
- no replacement proposal is accepted;
- next action is copied from `checkpoint.acceptedNextAction`;
- evidence references come from the assessment's preserved `accepted-next-action` finding;
- `humanAuthorityDecisionRef = null`.

### 7.2 INVALID package

For `INVALID`:

- no Human Authority question/decision is accepted;
- exactly one accepted replacement proposal is required;
- package next action is copied from that proposal;
- old invalidated action cannot reappear as package next action;
- `humanAuthorityDecisionRef = null`.

### 7.3 AMBIGUOUS package

For `AMBIGUOUS`:

- accepted Human Authority Question + Decision are required;
- no standalone INVALID replacement proposal is accepted;
- package next action is copied from the selected Human Authority option;
- `humanAuthorityDecisionRef` equals the accepted decision ID;
- no package may be built from an unanswered question.

---

## 8. Verification plan

Phase 6D never interprets execution success.

For the initial GitHub runtime, the package freezes the observation baseline from the accepted Fresh Evidence Window:

```text
provider      = github
scopeRef      = freshEvidenceWindow.source.repositoryRef
cursorType    = default-branch-head
baselineValue = freshEvidenceWindow.cursorTo.value
requirement   = fresh-authoritative-reread
```

A later Phase 6E verifier must perform a fresh source read after external execution and compare observed reality against this baseline and the declared action/postcondition boundary.

The package must not write `success`, `completed`, `verified` or equivalent outcome state.

---

## 9. Evidence and contamination boundary

Phase 6D may reference only current accepted evidence identities already present in the Fresh Evidence Window and assessment.

It must not ingest or copy:

- credentials or tokens;
- author email/private profile data;
- arbitrary commit bodies/comments/reviews;
- old assessment/outcome/checkpoint IDs as if they were fresh evidence;
- prior private chat output;
- local file paths;
- unrelated source payloads.

Human Authority artifacts are authority records, not fresh source evidence. Their IDs must never be inserted into `evidenceRefs`.

---

## 10. Determinism and immutability

For identical accepted inputs:

- question identity is identical;
- decision identity is identical;
- package identity is identical;
- option/action/evidence ordering is preserved deterministically;
- outputs are deeply immutable;
- caller inputs are not mutated.

All IDs bind normalized accepted artifact content through deterministic digests.

---

## 11. Fail-closed rules

Phase 6D fails closed when:

- any upstream artifact fails its accepted validator;
- artifact project/checkpoint/window/assessment bindings mismatch;
- a question is supplied for `VALID` or `INVALID`;
- `AMBIGUOUS` lacks one accepted question and explicit current human response;
- question options are missing, duplicated, out of bounds or unsupported;
- a selected option does not exist;
- response targets another question/assessment;
- prior response is replayed against a new ambiguity;
- `INVALID` replacement reuses the stale action;
- replacement basis invents authority;
- action/question evidence falls outside current accepted evidence;
- package attempts autonomous execution;
- package attempts checkpoint/outcome persistence;
- any artifact claims execution success before fresh verification.

No fallback action is guessed.

---

## 12. First acceptance boundary

Phase 6D is accepted only when executable tests prove at minimum:

- accepted Trusted Checkpoint, Fresh Evidence Window and Continuity Assessment validators are reused;
- exact upstream binding is enforced;
- `VALID` produces no question and reuses only the accepted checkpoint action;
- `INVALID` produces no question and requires one different, evidence-grounded bounded replacement;
- `AMBIGUOUS` produces exactly one bounded neutral question with 2–4 options;
- no option is preselected/recommended;
- Human Authority response must target the current question and one actual option;
- prior answers cannot authorize a new question;
- accepted decision copies selected option without reinterpretation;
- package construction is blocked before Human Authority on `AMBIGUOUS`;
- package contains exactly one next action;
- verification baseline binds the current accepted Fresh Evidence Window head;
- no success/outcome claim is present;
- deterministic IDs, deep immutability and input preservation hold;
- Phase 6C Fresh Evidence + Assessment, Phase 6B, Phase 5 and Phase 4 regressions remain green.

After Phase 6D acceptance, the next authorized work is **Phase 6E — external action observation + fresh verification + Outcome Record**. Phase 6D must not implement it.
