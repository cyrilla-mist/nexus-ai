# Nexus Atlas Phase 5 — Product Surface Entry Audit

**Status:** Phase 5A Complete / Accepted  
**Baseline:** `79d66207bbd5818010eae0695e9923e174f5b47a`  
**Phase 4F frozen implementation:** `bf4f26180ed6d219dce5c843b350ff6e2a2cafb8`

## 1. Purpose

Phase 5 begins the transition from a deeply tested Context foundation to a truthful product surface. This audit decides which existing product surfaces are authoritative, which are competition-specific, which old design documents are no longer binding, and which Phase 4 capabilities may safely become visible without widening authority, transport, persistence, or mutation scope.

Phase 5 does not start by redesigning the frontend. It starts by choosing the correct surface boundary.

## 2. Authoritative Product Direction

The binding long-term product model remains:

```text
Personal Intelligence Infrastructure
  -> Nexus Atlas
  -> Context Fabric + Context Projections + Intelligence Services
  -> Territory Views
  -> Workspaces, Agents, Records, Decisions, Actions
```

The permanent experience layer is:

```text
Atlas Desk
Atlas Map
Territory Index
Territory Workspace
Record / Decision / Asset detail
Agent Workspace
Action Tray
Context Inspector
Connector and Policy Center
```

The permanent visual direction is **Archive Cartography**.

Phase 5 must not regress to:

- Star Map as the primary product metaphor;
- cosmic / deep-space navigation;
- neon graph visualization;
- a generic AI dashboard;
- a gallery of disconnected tools;
- Verity-specific information architecture as the Nexus core model.

## 3. Current Product Surface Audit

### 3.1 Landing (`index.html`)

Current strengths:

- correctly names Nexus Atlas as Personal Intelligence Infrastructure;
- uses the current editorial / archival visual direction;
- frames the product around context, decisions, evidence and continuation;
- provides one clear entry to Atlas.

Current limitation:

- still identifies itself as a public fixture demo;
- does not yet project canonical self-context or multi-project state;
- functions as a static orientation surface rather than an active Desk entry.

**Decision:** retain as the public orientation shell. Do not rebuild it in Phase 5A/5B.

### 3.2 Atlas shell (`atlas.html`)

Current strengths:

- already exposes the correct permanent product spine: Desk, Map, Workspace;
- already exposes all five Territories as views over shared context;
- includes Context Inspector and Action Tray as shared system surfaces;
- visually aligns much more closely with Archive Cartography than legacy Star Map work.

Current limitation:

- the implementation behind the shell remains tied to the competition vertical slice;
- current Atlas application state defaults to Innovation / Verity;
- route labels and context paths assume Verity;
- the current map is a manually positioned Verity-specific layout;
- source loading is based on the Continuity provider and Verity scenario rather than the generalized canonical self-context package.

**Decision:** `atlas.html` is the Phase 5 product shell. Phase 5 should generalize its data projection instead of creating another shell.

### 3.3 Atlas application (`frontend/atlas/atlas-app.js`)

Current competition coupling includes:

- `scenario: "verity"` in source configuration;
- hard-coded `project-verity` identity;
- hard-coded Verity relation-map nodes;
- Innovation as the only active Territory;
- Continuity Scenario as the primary data shape.

This implementation is valuable as a proven interaction shell, but it is not the permanent product data contract.

**Decision:** treat the current Atlas app as a presentation adapter that must gradually move from Verity Continuity Scenario data to canonical/generalized Context projections.

### 3.4 Re-entry surface (`reentry.html` + Continuity frontend)

Re-entry remains an important Workspace and the strongest proven vertical slice. It should not become the entire product.

**Decision:** preserve Re-entry as a specialized Workspace. Do not use it as the top-level Phase 5 information architecture.

### 3.5 Legacy product-entry and Star Map material

`docs/Nexus-Product-Entry-Experience-Design.md`, Star Map implementation files, and older deep-space visual documents contain useful historical interaction ideas, but their Star Map / deep-space visual assumptions conflict with the current long-term product baseline.

**Decision:** they are historical/non-authoritative for Phase 5 whenever they conflict with the Long-term Product Baseline or this audit. They are not deleted in Phase 5A because existing legacy tests and history still reference them.

## 4. Phase 4 Capability Surface Audit

Phase 4 delivered a bounded pipeline:

```text
GitHub read-only Adapter
  -> Source Snapshot
  -> Context Import Plan
  -> explicit Canonical Admission review
  -> pure in-memory Context Graph result
```

This pipeline is deliberately headless. Phase 5 may expose its states, but must not reinterpret it as a live connector platform.

### 4.1 Safe to surface now

- canonical Project identity and current state;
- Identity records with verification/freshness/provenance visible;
- Decision and Memory classifications;
- Evidence provenance and freshness;
- next Actions and open Risks;
- source summary / source health as read-only context metadata;
- Candidate Evidence review state from an already-produced Import Plan;
- explicit authorization selection as a review concept;
- admission preview/result as a local in-memory projection;
- Context Inspector for provenance, lifecycle, verification, freshness and governance.

### 4.2 Not safe to claim yet

- live GitHub OAuth or token connection;
- automatic account/repository discovery;
- persistent Context Graph writes;
- automatic source polling;
- semantic promotion from GitHub data into Identity/Decision/Memory/Action truth;
- cross-device project recovery;
- a remote multi-project library;
- autonomous mutation;
- background capture of private personal context.

## 5. Candidate Product Surfaces

### Identity View

The canonical model already defines independent Identity records (`role`, `direction`, `capability`, `preference`, `constraint`) with explicit verification, freshness, provenance and governance.

**Phase 5 decision:** include a read-only Identity Context surface in the first product-surface program. Do not add editing or inference promotion yet.

### Generalized Project Selector

The generalized Context Package supports explicit project/scope selection, but the current canonical self-context fixture does not yet provide a real multi-project library.

**Phase 5 decision:** design the selector contract now, but do not expose a fake multi-project dropdown until at least two real project contexts can be selected through the same canonical boundary.

### Context Inspector

The current Atlas shell already has the correct shared Inspector location.

**Phase 5 decision:** make Inspector the first reusable bridge from Context foundation to product surface. It should render canonical state/provenance consistently for Project, Identity, Decision, Memory, Evidence, Risk and Action records.

### Source Controls

Phase 4 has no concrete HTTP/auth transport and no persistent write boundary.

**Phase 5 decision:** do not implement “Connect GitHub” controls yet. The first source surface is a **Source Intake Review** over an already-produced Snapshot/Import Plan, with clear read-only/provisional wording.

### Capture / Confirmation Flow

Canonical Admission already requires explicit `authorizedCandidateIds` and rebinds authorization at Apply.

**Phase 5 decision:** the first confirmation surface may expose reviewed Candidate selection and local admission preview. It must not imply that approval performs a persistent write unless a separate persistence contract is later accepted.

## 6. First Product Surface Slice

The first implementation slice should be **Nexus Self-Context Desk**, not another Verity screen.

It should answer:

1. What project context am I in?
2. What is current?
3. What changed or needs attention?
4. Which decisions still govern the work?
5. What evidence supports the current state?
6. What should happen next?
7. Where did each item come from and how trustworthy/current is it?

The source of truth for this slice is the existing canonical Self-Context Provider / generalized Context Package, not the Verity Continuity Scenario.

## 7. Phase 5 Delivery Plan

### Phase 5A — Product Surface Entry Audit — Complete / Accepted

- audit existing public entry and Atlas shell;
- classify Verity/competition coupling;
- establish Archive Cartography as binding visual direction;
- classify legacy Star Map material as non-authoritative where conflicting;
- define safe/unsafe Phase 4 surface boundaries;
- choose Nexus Self-Context Desk as the first product slice.

### Phase 5B — Product Surface Contract — Next

Define a provider-neutral read-only Product Surface Model for:

- Atlas Desk project summary;
- Identity snapshot;
- Decision/Memory summaries;
- Evidence/source summaries;
- open Risks;
- next Actions;
- Inspector records;
- optional source-intake review projection.

The contract must not require DOM, Verity Scenario fields, live GitHub transport or persistent writes.

### Phase 5C — Nexus Self-Context Desk

- adapt Self-Context Provider/generalized Context Package into the Product Surface Model;
- render Nexus Atlas itself in the existing Desk shell;
- remove Verity hard-coding from the Desk route only;
- keep Re-entry and competition routes working during migration.

### Phase 5D — Canonical Inspector and Identity Context

- generalize Context Inspector;
- add read-only Identity Context index/view;
- surface lifecycle, verification, freshness, provenance and governance;
- preserve sensitivity boundaries.

### Phase 5E — Source Intake Review

- render an existing Source Snapshot / Import Plan as reviewable Candidate Evidence;
- require explicit Candidate selection;
- generate only a local/in-memory admission preview;
- no OAuth, repository scanning or persistent write.

### Phase 5F — Acceptance and Product Boundary Hardening

- full regression;
- accessibility/keyboard/mobile checks;
- no Star Map regression in new Phase 5 surfaces;
- no Verity-specific canonical fields;
- no semantic promotion;
- no source credential exposure;
- no persistent mutation claim without a separate accepted contract.

## 8. Frozen Boundaries from Earlier Phases

Phase 5 must not casually reopen:

- Context Graph validation semantics;
- Decision/Memory resolver and ledger semantics;
- Context Package v0.3 governance semantics;
- Source Snapshot v0.1 contract;
- Context Import Plan v0.1 contract;
- Canonical Admission v0.1 authorization/reconciliation semantics;
- Phase 4 privacy and error taxonomy.

If a Product Surface requirement appears to need one of these contracts changed, that is a separate architecture decision, not a frontend convenience fix.

## 9. Acceptance Criteria for Phase 5A

Phase 5A is accepted when:

- one existing shell is chosen instead of creating a competing product shell;
- Verity competition coupling is explicitly identified;
- the permanent visual direction is unambiguous;
- legacy Star Map guidance cannot silently override the current baseline;
- Phase 4 headless capabilities are separated into safe-to-surface and not-yet-supported sets;
- the first product slice is chosen without claiming unfinished multi-project, transport or persistence capabilities;
- the next implementation stage is a provider-neutral Product Surface Contract rather than direct DOM rewrites.

## 10. Phase 5A Conclusion

The correct next move is not a visual redesign and not a GitHub connector UI.

The correct move is to make the existing Archive Cartography Atlas shell consume a provider-neutral Product Surface Model derived from the canonical/generalized Context foundation, beginning with Nexus Atlas self-context. This preserves the long-term product architecture while turning the Phase 0–4 foundation into an honest user-facing system.
