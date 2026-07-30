# Nexus Atlas Implementation Audit

**Date:** 2026-07-31  
**Baseline:** `docs/Nexus-Atlas-Architecture-Review-v1.0.md`  
**Reviewed work:** Draft PR #3, Issue #4, and stacked Draft PRs #5–#8  
**Result:** Directionally aligned; retain the stack. Complete runtime verification and a small number of architecture contracts before merging.

---

## 1. Executive assessment

The current implementation does **not** need to be discarded or redesigned around a new concept.

The stack correctly preserves the most important long-term decisions:

- Nexus remains a Personal Intelligence Infrastructure;
- Atlas Desk, Map, Territory, Workspace, Inspector, Action Tray, and Confirmation Sheet are permanent product layers;
- Verity is a Hero Scenario rather than the Nexus product boundary;
- DataHub manages governed asset context rather than the complete personal graph;
- fixture and live sources pass through normalization instead of branching the UI by provider;
- conflicting Agent memory is preserved rather than overwritten;
- consequential ownership repair requires human confirmation and read-after-write verification;
- unfinished Territories are shown as defined structure rather than fake functionality.

The primary gaps are **generalization and operational maturity**, not product-direction failures.

Cross-cutting gaps:

1. a formal runtime `ContextPackage` contract is documented but not yet implemented end to end;
2. Outcome and durable Context Write-back remain partial;
3. several UI and governance components are still wired through Verity-specific IDs;
4. the Atlas Map uses a fixed Hero Scenario layout rather than a route-selection service;
5. system state enums are not yet centralized across domain, provider, and UI layers;
6. browser and live DataHub verification must be completed on the local computer before the stack is ready to merge.

---

## 2. Review scale

| Rating | Meaning |
|---|---|
| **Aligned** | Implements a frozen architecture decision and should be retained |
| **Aligned with follow-up** | Correct competition slice; needs a clearly identified generalization or runtime step |
| **Prototype boundary** | Acceptable for the Demo only when explicitly documented and prevented from becoming a permanent core assumption |
| **Must fix before merge** | Truthfulness, safety, broken contract, or integration issue that blocks readiness |
| **Post-competition** | Valid long-term work that should not delay the current vertical slice |

---

## 3. PR #3 — Nexus Atlas Verity blueprint

**Rating:** Aligned

### Retain

- Long-term product baseline and permanent information architecture.
- Verity scenario represented through the existing Continuity schema.
- Provider-neutral Context primitives.
- DataHub asset boundary and controlled mutation plan.
- Deterministic continuity rules with model and human-authority boundaries.
- Scenario generation and validation instead of manually maintained duplicate JSON.

### Architecture value

PR #3 correctly establishes:

```text
Personal Intelligence Infrastructure
  → Nexus Atlas
  → shared Context Fabric
  → Territory views
  → Verity as the first deep Innovation Re-entry slice
```

It also correctly avoids adding Benchmark, Rubric, or competition-only entities as Nexus Core primitives.

### Required documentation adjustment

`docs/Nexus-Atlas-Architecture-Review-v1.0.md` is now the highest design baseline. Earlier PR #3 architecture documents remain detailed implementation references. Where wording conflicts, the v1.0 review governs.

### Post-competition follow-up

- replace scenario-specific expected counts with derived assertions in more runtime paths;
- add schema migration guidance when `0.9.2` evolves;
- provide a registry for scenario identity and supported provider adapters.

---

## 4. Issue #4 — permanent Atlas shell and Verity vertical slice

**Rating:** Aligned as implementation umbrella

Issue #4 correctly defines the permanent route:

```text
Atlas Desk
  → Atlas Map
  → Innovation Territory
  → Verity Workspace
  → Re-entry Brief
  → Inspector
  → Action Tray
  → Continue in Workspace
```

### Recommended scope update

Issue #4 should remain the parent implementation issue, with these acceptance groups:

1. **Product shell** — Desk, Map, Territory, Workspace, Inspector, Action Tray.
2. **Continuity** — Changes, Decisions, stale evidence, conflict, ownership, next actions.
3. **Governance** — proposal, confirmation, mutation, re-read, Audit Event.
4. **Context handoff** — restored Context Package enters the continuing Workspace.
5. **Runtime proof** — local DataHub evidence and browser flow.
6. **Submission evidence** — screenshots, sample output, README explanation, and video route.

The Context handoff and runtime proof remain the main incomplete acceptance areas.

---

## 5. PR #5 — permanent Nexus Atlas shell

**Rating:** Aligned with follow-up

### Retain

- `atlas.html` as the permanent product entry.
- Atlas Masthead, Territory Index, Inspector, and Action Tray.
- Desk → Map → Territory → Re-entry navigation.
- honest representation of non-implemented Territories.
- relationship-backed Map lines.
- Archive Cartography desktop, tablet, and mobile foundation.

### Alignment with v1.0

PR #5 satisfies the frozen decisions that:

- the default product structure is Atlas, not a chat screen;
- Map routes must come from stored relationships;
- Verity runs within Innovation Territory;
- incomplete Territories may be visible but not falsely operational;
- Inspector is a shared provenance surface.

### Prototype boundaries

The current Atlas is intentionally Verity-first. The following must remain marked as vertical-slice implementation rather than permanent assumptions:

- fixed `mapLayout` coordinates;
- hard-coded Verity Landmark selection;
- static Territory summaries;
- compact action counts sourced from the Hero Scenario;
- route labels and date stamps tied to the competition fixture.

### Must fix before merge

- no visible route or component may claim live source state when the page is in fixture mode;
- Map nodes and relationships must continue to have keyboard/text alternatives;
- source failures must render unknown/unavailable state rather than an empty graph.

### Post-competition generalization

- introduce `RouteProjection` or equivalent service that selects 5–12 Landmarks from a Context Package;
- separate Map data from visual coordinates;
- add Map scope and Lens contracts;
- make Territory status data-driven;
- extract shared Record components from Verity-specific rendering.

---

## 6. PR #6 — Verity Continuity workflow

**Rating:** Aligned with follow-up

### Retain

- provider-neutral scenario normalization;
- multipart Hero Scenario loading;
- truthful elapsed Re-entry time using `lastActiveAt`;
- external ownership signal normalization into the Continuity View Model;
- conflict confirmation that preserves both Agent memories;
- refusal to report ownership repair in fixture mode;
- focused regression tests for 4 / 4 / 2 / 1 / 1 findings.

### Strong architectural decisions

The normalization layer is preferable to Verity branches throughout the UI. It supports the frozen rule:

> Sources are normalized before entering the shared Context and experience contracts.

Preserving conflicting memories while recording a human DecisionConfirmationEvent also matches the Agent Conflict contract.

### Prototype boundaries

The browser audit ledger currently uses `sessionStorage`. This is acceptable for interaction proof, but it is not durable Nexus Memory.

It must remain described as:

```text
local prototype audit receipt
```

It must not be presented as a persisted cross-session Context Graph update.

### Must fix before merge

- ensure every conflict confirmation identifies Decision, conflict record, authority, and time;
- avoid marking the underlying canonical conflict resolved unless the write-back layer confirms the event;
- ensure source-unavailable state cannot be normalized into missing ownership.

### Next architecture slice

Implement a formal Context Package handoff from Re-entry to the active Verity Workspace. At minimum it should contain:

- current Goal and milestone;
- inherited valid Decisions;
- current Knowledge/Evidence references;
- unresolved or repaired Context state;
- verified source state;
- selected Continue / Verify / Repair / Act actions;
- applicable mutation and confirmation policies.

---

## 7. PR #7 — governed Verity DataHub asset repair

**Rating:** Aligned with follow-up

### Retain

- six explicit governed Verity assets;
- Nexus/DataHub responsibility boundary;
- deterministic dry-run and explicit apply;
- exact allow-listed asset URNs;
- Benchmark upstream lineage verification;
- read-only bridge separated from mutation bridge;
- ownership client restricted to `add_owners`;
- fixed Benchmark target for the competition slice;
- explicit human confirmation;
- mandatory read-after-write verification;
- tests for missing owner, verified owner, incomplete lineage, response shapes, and failed verification.

### Strong architectural decisions

This PR correctly implements:

```text
Nexus Context Fabric
  owns personal project continuity

DataHub
  owns governed asset metadata

Source Adapter
  overlays asset state onto the current projection
```

The separate mutation process is preferable to weakening the read-only client. A successful mutation response is correctly treated as insufficient evidence.

### Prototype boundaries

- The ownership repair is intentionally fixed to one Benchmark URN.
- `NEXUS_VERITY_OWNER_URN` is a competition runtime configuration, not a general identity model.
- The calibration process is represented as a Dataset Context Asset to reuse a verified SDK path.
- Both bridges are local development services, not production deployment architecture.

These are acceptable when clearly documented.

### Must fix before merge

- run real ingestion and verify all six assets against the local DataHub instance;
- verify the actual MCP version exposes the expected `add_owners` contract;
- verify allowed origins and loopback binding in the user's environment;
- capture the real Missing Ownership `1 → 0` transition;
- confirm no token, owner identifier, local path, or sensitive runtime data is committed;
- ensure MCP failure results in `source_unavailable`, never `missing owner`.

### Post-competition generalization

- introduce a provider-neutral `GovernedMutationProposal` contract;
- move allow-listed operation policies out of Verity-specific code;
- derive target authority from Identity and connector policy rather than a single environment variable;
- support durable Audit Events;
- determine production bridge/Worker architecture separately.

---

## 8. PR #8 — Atlas governance Confirmation Sheet

**Rating:** Aligned with follow-up

### Retain

- permanent Confirmation Sheet rather than a browser-native confirmation dialog;
- exact operation, target, current value, proposed value, and verification method;
- explicit cancel and confirm actions;
- read-after-write requirement;
- native dialog semantics and responsive bottom-sheet behavior.

### Architecture value

PR #8 establishes a shared interaction pattern for:

- Decision override;
- Context inheritance;
- external metadata repair;
- archive or supersede operations;
- future governed mutations.

This is correctly treated as permanent Nexus governance UX rather than a competition decoration.

### Must fix before merge

- browser test focus trapping, Escape/cancel behavior, restoration of focus, and mobile scrolling;
- ensure the Confirm control cannot submit twice;
- display source and authority in addition to target values;
- ensure failed write or failed re-read leaves the sheet/result in unresolved state;
- include a textual loading and verification state for assistive technology.

### Post-competition generalization

- extract the sheet into a shared governance component independent of Re-entry selectors;
- define typed proposal schemas for Decision, inheritance, archive, and external mutation;
- connect receipts to the durable Audit/Event system.

---

## 9. Cross-stack architecture gaps

### 9.1 Context Package — priority before competition freeze

The product route currently restores Context visually, but it does not yet demonstrate that the continuing Workspace receives the restored Context as a structured handoff.

Add a minimal serializable contract and sample output, for example:

```json
{
  "projectId": "project-verity",
  "territory": "innovation",
  "workspaceType": "active-project",
  "goal": "Prepare Verity v1.0 through Benchmark validation",
  "inheritedDecisionIds": ["decision-benchmark-first"],
  "evidenceIds": ["external-asset-rubric", "external-asset-results-v047"],
  "resolvedContext": ["risk-benchmark-missing-owner"],
  "openContext": ["risk-stale-v046-results"],
  "actions": {
    "continue": [],
    "verify": [],
    "repair": [],
    "act": []
  },
  "sourceState": [],
  "policies": []
}
```

The exact schema may evolve, but the Demo should show that Continue in Workspace carries Context rather than merely navigating to another page.

### 9.2 Outcome Write-back — define now, persist later

The system records prototype events but needs a stable contract for:

```text
Action executed
  → Outcome recorded
  → affected Context identified
  → automatic / validated / confirmed write-back classification
  → projection updated
```

For the competition, a validated sample `ContextRepairEvent` and Context Package update are sufficient. Durable personal storage may remain post-competition.

### 9.3 Central state vocabulary

Create a shared domain module or schema for Context, Decision, Action, and Source states. Avoid UI strings becoming the canonical state model.

### 9.4 Source truthfulness

All providers and UI paths must preserve:

```text
unavailable ≠ empty ≠ missing ≠ stale
```

This is a release-blocking truthfulness rule.

### 9.5 Route selection

The fixed Project Focus Map is acceptable for the Hero Scenario. Long-term Map generation must operate from a Goal/Question and select a bounded route rather than rendering the full graph.

### 9.6 Durable authority and audit

Session-local events are sufficient for interaction development, not long-term Memory. The architecture must eventually persist authority, confirmation, and Audit Events through a provider-neutral repository.

---

## 10. Recommended merge and validation order

The PRs form a stacked series and should be integrated in order:

```text
#3 blueprint
  → #5 Atlas shell
  → #6 Continuity integration
  → #7 DataHub assets and repair
  → #8 Confirmation Sheet
  → Architecture Review and audit PR
```

Do not merge the top branch directly to `main` while the lower PRs remain independent open stacks.

Recommended procedure after local verification:

1. merge or squash PR #3;
2. retarget/rebase PR #5 onto updated `main` and verify its diff;
3. repeat for #6, #7, #8, and the architecture-review PR;
4. preserve deliberate commit boundaries where they provide useful audit history;
5. run complete tests after each retarget because stacked diffs can change.

No PR should be marked ready solely from static review. PRs #7 and #8 require a running local DataHub and browser validation.

---

## 11. Before-merge checklist

### Repository

- [ ] Build the Verity scenario and validate 36 entities / 33 relationships.
- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run focused Continuity and DataHub tests.
- [ ] Run Python compile and asset dry-run.
- [ ] Confirm no generated secrets, tokens, or personal local paths.

### Browser

- [ ] Atlas Desk → Map → Territory → Re-entry navigation.
- [ ] desktop, tablet, and mobile layouts.
- [ ] keyboard access to Map nodes and Inspector.
- [ ] Confirmation Sheet focus, cancel, failure, and success states.
- [ ] fixture mode never claims live mutation.

### DataHub

- [ ] ingest six Verity assets.
- [ ] verify required lineage.
- [ ] verify initial missing Benchmark owner.
- [ ] start read and mutation bridges.
- [ ] confirm ownership proposal.
- [ ] execute `add_owners`.
- [ ] verify owner through a fresh read.
- [ ] verify Missing Ownership changes from 1 to 0.
- [ ] capture runtime evidence.

### Context continuation

- [ ] produce a structured restored Context Package.
- [ ] pass it into the continuing Workspace.
- [ ] record a verified ContextRepairEvent.
- [ ] show the next executable Benchmark action.

---

## 12. Final decision

The current stacked implementation is approved as the correct architectural direction.

Do not restart the interface, abandon the Verity scenario, or reduce the product to a smaller competition-only page.

The next work should focus on:

1. local runtime verification;
2. Context Package handoff;
3. Outcome/repair evidence;
4. accessibility and interaction validation;
5. competition submission assets;
6. post-competition generalization only after the vertical slice is stable.
