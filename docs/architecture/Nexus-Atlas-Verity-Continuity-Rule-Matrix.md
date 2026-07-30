# Continuity Rule Matrix — Verity Re-entry v0.1

## 1. Decision Model

```text
Deterministic rules establish observable state
  → model explains semantic meaning within those constraints
  → human confirms consequential changes
```

The language model may not fabricate missing metadata, mark an asset repaired, supersede a confirmed decision, or close a conflict without a verified event.

## 2. Status Precedence

When multiple states apply, use:

```text
source_unavailable
> conflicting
> blocked
> stale
> unverified
> confirmed
> archived
```

`source_unavailable` means the system cannot establish state. It must not be converted to `stale` or `missing`.

## 3. Rule Matrix

| ID | Finding | Deterministic condition | Model role | Human confirmation | Result / action |
|---|---|---|---|---|---|
| `MC-01` | Meaningful change | Event time is after `project.lastActiveAt`, `metadata.meaningfulChange=true`, and event relates to an active goal, decision, asset, or task | Explain why the event changes the re-entry point | No | Add to Meaningful Changes |
| `MC-02` | Milestone shift | A confirmed decision or event changes milestone, priority, or release criteria after last activity | Summarize previous state versus current state | No | Highlight as major route change |
| `VD-01` | Valid decision | Entity type is `decision`; status is `confirmed`; no active relationship or field supersedes it | Explain evidence, scope, and consequences | No | Add to Valid Decisions |
| `VD-02` | Decision scope warning | Confirmed decision applies to a narrower version, Territory, or milestone than the current request | State the boundary; do not generalize it | Optional | Show “valid within scope” |
| `SE-01` | Stale version evidence | Evidence version is lower than the current dependent implementation version and behavior changed between versions | Explain what can no longer be proven | No | Add Stale Evidence; recommend re-run |
| `SE-02` | Superseded route/document | A confirmed decision explicitly supersedes a source, claim, memory, or roadmap | Explain replacement and preserve history | No | Mark old item stale/superseded |
| `SE-03` | Upstream changed | An evidence asset was produced before a material upstream schema/rubric/version change | Explain impacted downstream claims | No | Mark dependent evidence stale pending verification |
| `AC-01` | Agent conflict | Two active/disputed agent memories share the same recommendation area and a `contradicts` relation, or semantic classifier returns conflict above threshold | Classify as direct conflict, stage difference, or compatible alternatives; cite relevant decisions | Yes to resolve | Keep open until a human confirms resolution |
| `AC-02` | Conflict already governed | A confirmed decision supports one memory and supersedes or rejects the other | Explain why one route remains current | Yes to close history conflict | Record DecisionConfirmationEvent |
| `MO-01` | Missing ownership | Critical external asset is successfully read and has zero owners | Explain downstream risk using lineage | Yes to assign | Create Repair action |
| `MO-02` | Unknown ownership | Connector read fails or owner field is unavailable | Explain inability to verify | No mutation | Produce Source Unavailable, not Missing Ownership |
| `BL-01` | Blocked action | Open task has a `blocks` relation from an active risk or unmet dependency | Explain blocking chain | No | Group under Repair or Verify |
| `RA-01` | Continue | Confirmed decisions and current evidence support an existing route with no open blocking conflict | Compress into a stable instruction | No | Add to Continue |
| `RA-02` | Verify | Current route is plausible but evidence is stale, unverified, or version-mismatched | Convert into a concrete verification task | No | Add to Verify |
| `RA-03` | Repair | Broken context has a direct reversible fix such as owner assignment, conflict confirmation, or source update | Draft exact repair and consequences | Yes | Add to Repair |
| `RA-04` | Act | A confirmed goal/decision produces an open, owned, unblocked high-priority task | Rank and explain first executable step | No | Add to Act |
| `WR-01` | Governed write allowed | Operation is allow-listed, target and old/new values are visible, and user explicitly confirms | Generate confirmation copy only | **Required** | Execute mutation and re-read |
| `WR-02` | Repair verified | Post-write re-read returns intended value and matching target URN | Summarize repaired context | No | Close signal and write Nexus audit event |
| `WR-03` | Repair failed | Mutation fails or post-write state does not match intended value | Explain failure without claiming completion | No | Keep signal open; preserve original state |

## 4. Verity Expected Rule Results

| Finding | Triggered by | Count |
|---|---|---:|
| Meaningful Changes | `event-file-understanding-integrated`, `event-grade-guardrail-released`, `event-benchmark-promoted`, `event-roadmap-shifted` | 4 |
| Valid Decisions | Positioning, report contract, grade guardrail, Benchmark-first | 4 |
| Stale Evidence | v0.4.6 results; feature-expansion roadmap | 2 |
| Agent Conflict | Feature Expansion Agent vs Evaluation Reliability Agent | 1 |
| Missing Ownership | Verity Benchmark v1 | 1 |

## 5. Explanation Contract

Every finding returned to the UI must contain:

```json
{
  "findingId": "…",
  "signal": "meaningful_change | valid_decision | stale_evidence | agent_conflict | missing_ownership",
  "title": "…",
  "whyItMatters": "…",
  "sourceEntityIds": ["…"],
  "sourceReferences": ["…"],
  "confidence": 0.0,
  "ruleIds": ["…"],
  "suggestedActionId": "…",
  "requiresConfirmation": false
}
```

A model-written explanation without `sourceEntityIds` and `ruleIds` is not eligible for the trusted Re-entry Brief.

## 6. Test Cases

1. **Owner read succeeds and owners are empty** → `MO-01`.
2. **DataHub is unavailable** → `MO-02`, never `MO-01`.
3. **v0.4.6 evidence supports current v0.4.7 behavior** → `SE-01`.
4. **Old roadmap has `supersededBy=decision-benchmark-first`** → `SE-02`.
5. **Agent memories disagree but no common recommendation area** → no conflict.
6. **Conflict is confirmed in UI** → write Nexus event; do not delete either memory.
7. **Ownership write returns success but re-read remains empty** → `WR-03`.
8. **Ownership write and re-read succeed** → close Missing Ownership and unblock owner task.
