# Nexus Atlas Architecture Review v1.0

**Status:** Frozen product and architecture baseline  
**Date:** 2026-07-31  
**Scope:** Long-term Nexus Atlas product, Context architecture, experience system, Agent model, governance, and competition boundaries  
**Authority:** This document supersedes earlier Nexus Atlas design notes wherever they conflict. Earlier documents remain useful implementation history.

---

## 1. Executive decision

Nexus Atlas is a **Personal Intelligence Infrastructure**.

Its core purpose is:

> Maintain continuity across a person's knowledge, memory, decisions, and actions, so that both the person and authorized AI collaborators can understand prior context and continue meaningful work.

Nexus is not primarily a content generator. It is a system for preserving, interpreting, governing, and activating long-term Context.

The permanent operating loop is:

```text
Capture
  → Connect
  → Interpret
  → Decide
  → Act
  → Reflect
  → Remember
```

Re-entry is the recovery mechanism used when this loop is interrupted. It is the first complete vertical slice, not the full product boundary.

---

## 2. First principles

### 2.1 Continuity

A person should not lose important working context because time passed, a project paused, a tool changed, or a different Agent became involved.

### 2.2 Traceability

Important Context must preserve its source, time, state, scope, relationships, and authority. A conclusion without provenance is not trusted Context.

### 2.3 Actionability

Nexus must help the user continue, verify, repair, decide, or act. It must not stop at storage, retrieval, or summarization.

### 2.4 Human authority

AI may interpret evidence, propose decisions, detect conflicts, and suggest actions. It may not silently redefine the user, override confirmed decisions, close important conflicts, or perform consequential external mutations without appropriate authority.

### 2.5 One Context Fabric

Projects, Territories, Workspaces, and Agents must use a shared Context Fabric. No competition feature, Capability, or Territory may create an isolated long-term memory system.

---

## 3. Product boundaries

Nexus is not:

- a general-purpose chatbot;
- a file manager;
- a conventional knowledge base;
- a task manager;
- a gallery of AI tools;
- a full visual dump of every graph node;
- a DataHub-only application;
- a Verity or competition-specific assistant.

Files, messages, repositories, external data catalogs, and Agent outputs are Sources. Their value in Nexus comes from how they support projects, decisions, goals, actions, and future continuity.

Existing products such as Inkraft, PrismAI, and Verity enter Nexus as Context-aware Capabilities or Projects. They must not return as disconnected homepage cards.

---

## 4. Permanent system layers

```text
Source Layer
  → Context Fabric
  → Context Projections
  → Intelligence Services
  → Agents and Capabilities
  → Experience Layer
```

### 4.1 Source Layer

Examples:

- direct user input;
- local files;
- GitHub;
- Notion;
- Google Drive;
- DataHub;
- Agent outputs;
- external research sources.

Every Source Connector must expose provenance and source state. A failed read must produce `source_unavailable`, not a fabricated conclusion that information is absent or stale.

### 4.2 Context Fabric

The provider-neutral core primitives are:

```text
Person
Project
Record
Event
Decision
Goal
Action
AgentRun
ExternalAssetRef
Relationship
```

Domain-specific concepts such as Benchmark, Rubric, Draft, Exercise, Finding, or Prototype are represented through typed Records, external asset types, metadata, and relationships unless a future architecture review establishes a reusable core primitive.

All core objects should support, where applicable:

```text
identity
state
time
provenance
ownership
authority
confidence
scope
relationships
```

### 4.3 Context Projections

The five Contexts are dynamic projections over the same Fabric, not separate databases:

1. **Identity Context** — who the user is, long-term direction, values, abilities, preferences, and boundaries.
2. **Knowledge Context** — what is known, from which sources, with what validity and applicability.
3. **Memory Context** — what happened, when it happened, and how prior events and outcomes affect the present.
4. **Decision Context** — what was chosen, why, from which options and evidence, within what scope, and whether it remains valid.
5. **Action Context** — what should happen next, why, by whom, with which dependencies and completion criteria.

A single entity may appear in several projections. The projection changes what is foregrounded; it does not duplicate the canonical object.

### 4.4 Intelligence Services

Permanent services include:

- Context Builder;
- Continuity Engine;
- Decision Trace;
- Conflict Resolution;
- Action Engine;
- Context Policy;
- governed mutation and audit;
- Outcome Write-back.

### 4.5 Agents and Capabilities

Agents coordinate cognitive work using a bounded Context Package. Capabilities perform specialized operations.

Examples:

- Innovation Navigator — Agent;
- Research Agent — Agent;
- Learning Coach — Agent;
- Evaluation Agent — Agent;
- Inkraft rewriting — Capability;
- PrismAI multi-perspective review — Capability;
- Verity material inspection — Capability;
- DataHub ownership update — governed external operation.

### 4.6 Experience Layer

The permanent product hierarchy is:

```text
Atlas Desk
  → Atlas Map
  → Territory Workspace
  → Record / Decision / Agent / Action detail
  → Outcome and Context Write-back
```

---

## 5. Context contracts

### 5.1 Identity Context

Identity Context stores long-term information that materially affects prioritization, advice, and action. It is not a collection of incidental profile details.

Core Identity changes require explicit user confirmation or a proposal based on repeated evidence followed by confirmation. Agents may not directly modify core Identity.

### 5.2 Knowledge Context

Knowledge is not a file list. It is a network of claims, records, methods, sources, and external assets that can support or challenge current work.

The system distinguishes:

```text
available
relevant
trusted
current
```

Information may be available but irrelevant, relevant but unverified, or previously trusted but stale.

### 5.3 Memory Context

Memory preserves events, Agent Runs, action outcomes, project timelines, confirmations, failures, and changes that can affect future work. Raw process noise may be archived and excluded from default projections.

Memory answers what happened. Knowledge answers what is understood.

### 5.4 Decision Context

Important Decisions should preserve:

```text
question
context
options
choice
rationale
evidence
trade-offs
scope
authority
time
state
consequences
```

Decision Trace must support both directions:

```text
Evidence → Decision → Action → Outcome
Outcome / Action → Decision → Evidence
```

### 5.5 Action Context

An important Action should be related to a Goal, Decision, Evidence, Risk, or dependency. It should define ownership and completion criteria when meaningful.

The shared action classes are:

```text
Continue
Verify
Repair
Act
Defer
Archive
```

An Action is not complete until an Outcome is recorded and relevant Context is updated.

---

## 6. Territory contracts

A Territory is a working view over the shared Context Graph. It is not a separate product or database.

Every Territory configures:

- prioritized Context projections;
- relevant relationship types;
- default Workspace types;
- available Agents and Capabilities;
- action classes and review rules.

### 6.1 Innovation

**Question:** How does an idea become a validated and executable project?

Priorities: Decision, Action, Knowledge, Memory.  
Typical Workspaces: idea framing, project re-entry, evidence, prototype planning, experiment review, roadmap.  
Typical outputs: direction, hypotheses, validation routes, risks, Decisions, milestones, Actions.

### 6.2 Learning

**Question:** How does repeated study become durable, demonstrated capability?

Priorities: Identity, Memory, Action, Knowledge.  
Typical Workspaces: learning re-entry, skill map, study session, practice, feedback, retention review.  
Typical outputs: learning route, mistakes, progress evidence, review Actions, transferable skills.

### 6.3 Research

**Question:** How does a question become a credible, bounded understanding?

Priorities: Knowledge, Decision, Memory, Action.  
Typical Workspaces: question framing, source review, evidence mapping, synthesis, method and limitation review.  
Typical outputs: source map, claims, evidence, findings, limitations, research Decisions and Actions.

### 6.4 Creation

**Question:** How do intention, knowledge, and style become a coherent artifact?

Priorities: Identity, Knowledge, Decision, Action.  
Typical Workspaces: brief, drafting, revision, design assembly, publication preparation.  
Typical outputs: drafts, revisions, creative Decisions, final assets, publication Actions.

### 6.5 Evaluation

**Question:** How is quality judged against explicit standards, and how does judgment produce improvement?

Priorities: Decision, Knowledge, Action, Memory.  
Typical Workspaces: criteria setup, review, evidence inspection, conflict review, improvement planning, revalidation.  
Typical outputs: findings, risks, scores where appropriate, reviewer questions, improvement and verification Actions.

A Project may appear in several Territories without duplication. Verity is primarily an Innovation Project and can also provide an Evaluation Capability.

---

## 7. Experience architecture

### 7.1 Atlas Desk

Atlas Desk is the default entry. It is a working index, not a statistics dashboard.

It should answer:

```text
What matters now?
What changed?
What needs re-entry?
Which Context can be inherited?
Where is Context broken?
What should happen next?
```

The permanent Desk areas are:

- Current Route;
- Needs Re-entry;
- Meaningful Changes;
- Territory Overview;
- Priority Actions;
- Context and Source Health.

The default experience should remain selective: one current route, a small number of re-entry projects, meaningful changes, and priority Actions. It must not flatten all projects or tools into cards.

### 7.2 Atlas Map

The Context Graph is the stored relationship system. Atlas Map is a selected, task-relevant view of that graph.

> Atlas Map displays important Context Routes, not every node.

Permanent Map modes:

- Personal Overview;
- Project Focus;
- Decision Trace;
- Re-entry Route;
- Cross-Territory Route.

Default Map views should normally contain approximately 5–12 Landmarks and use progressive disclosure.

Permanent Route lenses include:

```text
Goal
Decision
Evidence
Change
Risk
Action
Territory
```

Every visible line must correspond to a stored Relationship. Decorative graph connections are prohibited.

### 7.3 Context Inspector

Inspector is the shared evidence and governance surface for every important object.

It exposes:

- identity and type;
- state;
- summary;
- provenance;
- time and version;
- relationships;
- rule or interpretation basis;
- authority and ownership;
- available actions.

Important Agent conclusions must be inspectable through sources and rules. Natural-language confidence alone is insufficient.

### 7.4 Workspace System

A Workspace is a goal-oriented environment that combines Context, tools, Agents, work surfaces, governance, and Outcomes.

Shared structure:

```text
Workspace Header
Context Rail
Main Work Surface
Context Inspector
Action Tray
Outcome Recorder
Write-back Review
```

Permanent Workspace families:

- Re-entry;
- Active Project;
- Learning;
- Research;
- Creation;
- Evaluation;
- Planning and Action.

### 7.5 Context Package

A Workspace or Agent must receive a selected Context Package rather than the entire Atlas or a prompt alone.

Baseline contract:

```json
{
  "workspace": {
    "type": "reentry | project | learning | research | creation | evaluation | planning",
    "territory": "innovation",
    "goal": "..."
  },
  "identityContext": [],
  "knowledgeContext": [],
  "memoryContext": [],
  "decisionContext": [],
  "actionContext": [],
  "sourceState": [],
  "policies": [],
  "requestedCapabilities": []
}
```

The contract may evolve, but provider-specific records must be normalized before entering it.

---

## 8. Agent and Capability architecture

An Agent is an intelligent collaborator operating under a Context, permission, and output contract. It is not an autonomous long-term memory silo.

Each Agent or Capability declares:

```text
purpose
required Context
allowed Context
allowed tools
output types
source requirements
confidence requirements
mutation permission
human confirmation rules
write-back contract
```

Default prohibited operations include:

- changing core Identity;
- overriding confirmed Decisions;
- deleting historical Memory;
- marking unverified evidence as fact;
- closing a Conflict without authority;
- mutating external systems outside an allow-listed governed operation.

### 8.1 Agent Conflict

Conflicting Agent recommendations remain separate records. Resolution preserves:

- both recommendations;
- their Context Packages;
- Agent identities and time;
- conflict scope;
- relevant evidence and Decisions;
- the human resolution;
- which recommendation is inherited, deferred, or rejected.

Rejected or deferred memory is not erased.

### 8.2 Write-back classes

**Automatically recordable:** Agent Run, temporary output, process Event, source reference.  
**Rule-validated:** Evidence, Finding, Action state, Outcome, version Event.  
**Human-confirmed:** Identity changes, key Decisions, Conflict resolution, long-term Goals, external mutations, important archival actions.

---

## 9. State and governance language

### 9.1 Context states

```text
confirmed
unverified
stale
conflicting
blocked
superseded
archived
source_unavailable
```

`source_unavailable` means Nexus cannot establish the external state. It must never be silently transformed into missing, stale, or invalid.

### 9.2 Decision states

```text
proposed
confirmed
contested
superseded
expired
reversed
```

### 9.3 Action states

```text
open
ready
blocked
in_progress
waiting
completed
deferred
cancelled
archived
```

### 9.4 Source states

```text
available
unavailable
delayed
partial
unauthorized
invalid
```

Context, Decision, Action, and Source states are separate dimensions and must not be collapsed into one status field.

### 9.5 Consequential mutation

The governed mutation flow is:

```text
Read current state
  → Produce explicit proposal
  → Show target, old value, new value, source, and verification contract
  → Human confirmation
  → Execute allow-listed operation
  → Re-read source
  → Verify intended result
  → Record Audit Event
  → Update Context projection
```

A mutation response alone is never proof of a successful repair.

---

## 10. Archive Cartography design system

Archive Cartography is the information language of Nexus, not a decorative theme.

### 10.1 Semantic vocabulary

| Visual concept | System meaning |
|---|---|
| Atlas | complete personal Context space |
| Territory | working projection |
| Desk | current routes and attention |
| Map | selected Context Route |
| Landmark | important Project, Goal, Decision, Evidence, Asset, Event, Risk, Action, Outcome, or Person |
| Route | stored Relationship |
| Layer | Context Projection |
| Annotation | explanation, boundary, or note with an explicit source |
| Coordinates | source, time, version, and identifier |
| Stamp | verified governance state |
| Broken Route | conflict, stale dependency, blocking condition, or unavailable source |
| Ledger | Event, Agent Run, and audit history |
| Confirmation Sheet | human authority for consequential change |

### 10.2 Permanent visual rules

- Route before decoration.
- Working atlas, not fantasy map.
- Information may be dense, but hierarchy must be clear.
- Progressive disclosure is mandatory.
- State must be visible through text and structure, not color alone.
- Dark mode remains an archival and cartographic work surface; it must not return to space, neon, or science-fiction styling.

### 10.3 Route language

Relationships such as `supports`, `informs`, `produces`, `depends_on`, `blocks`, `contradicts`, `supersedes`, `assigned_to`, `recorded_by`, `used_by`, and `governs` may use distinct line treatments. The displayed legend must remain limited to the active Lens.

### 10.4 Landmark language

Permanent Landmark types:

```text
Project
Goal
Decision
Evidence
Asset
Event
Risk
Action
Outcome
Person
```

Default nodes show title, type, and state. Selection reveals a short summary and key relations. Full provenance remains in Inspector.

### 10.5 Shared components

Permanent shared components include:

- Atlas Masthead;
- Territory Index;
- Current Route Strip;
- Re-entry Entry;
- Meaningful Change List;
- Priority Action Ledger;
- Route Canvas;
- Landmark Node;
- Route Lens and Scope controls;
- Context Inspector;
- Workspace Header and Context Rail;
- Agent Activity Panel;
- Outcome Recorder;
- Write-back Review;
- Action Tray;
- Confirmation Sheet;
- Source Health Indicator;
- Decision, Evidence, Event, Action, Outcome, and Agent Run records.

### 10.6 Responsive and accessible behavior

Desktop may use Territory Index + Work Surface + Inspector. Tablet converts Inspector to a drawer. Mobile prioritizes Current Route → Findings → selected Landmark → Inspector Sheet → Action. A complete graph canvas is not required on mobile; a structured route list is a valid equivalent.

All nodes and governance controls must be keyboard accessible. Relationships require textual alternatives. State may not rely only on color. Motion must support reduced-motion preferences.

---

## 11. DataHub boundary

DataHub is an External Context Source for governed data assets. It is not the canonical store for the complete personal Context Graph.

DataHub may manage:

- asset identity;
- ownership;
- lineage;
- domain and documentation;
- freshness and quality metadata;
- governed metadata mutations.

Nexus manages:

- personal identity and direction;
- project history;
- Decisions and their rationale;
- Agent memory and conflicts;
- Goals, Actions, and Outcomes;
- user confirmation and cross-Territory continuity.

Source Adapters normalize DataHub state into `ExternalAssetRef` and related Context. Territory pages must not call DataHub directly.

---

## 12. Competition vertical slice

The competition proves one deep path inside the permanent product:

```text
Atlas Desk
  → Atlas Map / Verity Project Focus
  → Innovation Territory
  → Verity Re-entry Workspace
  → Decision Trace and Agent Conflict
  → DataHub Asset Inspector
  → Confirmation Sheet
  → verified ownership repair
  → Re-entry Plan
  → Continue in Workspace
```

Permanent interpretation:

- Nexus Self-Re-entry — internal technical fixture;
- Verity Re-entry — public Hero Scenario;
- Innovation Re-entry — reusable product capability.

The competition may limit project count, data volume, implemented Territories, and operational depth. It may not introduce a separate Schema, database, product identity, or visual language.

Unimplemented Territories may display their permanent structure honestly as not yet activated. They must not use fake functionality or decorative data.

---

## 13. Long-term roadmap

### Phase 0 — Architecture and competition foundation

- freeze product and system language;
- Atlas shell;
- Verity vertical slice;
- DataHub Source Adapter;
- Inspector and Confirmation Sheet.

### Phase 1 — General Continuity Foundation

- provider-neutral project re-entry;
- meaningful changes;
- decision trace;
- evidence validity;
- conflict resolution;
- Action grouping;
- Outcome Write-back;
- multi-project support.

### Phase 2 — Atlas Desk v1

- Current Route;
- multi-project Needs Re-entry;
- priority Action selection;
- Territory status;
- Context and Source Health.

### Phase 3 — Learning and Research

Build reusable Knowledge and Memory foundations through Learning Re-entry, skill routes, practice evidence, research questions, source/claim/evidence maps, synthesis, and limitations.

### Phase 4 — Creation and Evaluation

Integrate Inkraft, PrismAI, and Verity through Agent/Capability contracts, revision history, findings, improvement Actions, and Context Write-back.

### Phase 5 — Identity Context

Introduce explicit Identity proposals, confirmation, policy, and change history only after the rest of the governance model is stable.

### Phase 6 — Cross-Territory Atlas

Support shared knowledge, reusable Outcomes, capability transfer, long-term Goal routes, and cross-project Decision impact.

### Phase 7 — Source and Policy Ecosystem

Expand connectors and user-managed source, mutation, provenance, and audit policies.

---

## 14. Frozen decisions

The following decisions are frozen for v1.0:

1. Nexus Atlas is a Personal Intelligence Infrastructure.
2. Context Continuity is the core product value.
3. Atlas Desk, not chat, is the default product entry.
4. Five Contexts are projections over one Context Fabric.
5. Five Territories are working views, not databases or independent products.
6. Agent long-term memory comes from Atlas.
7. Agent and Capability are separate concepts.
8. Atlas Map shows selected Context Routes, not the complete graph.
9. Every visible Route corresponds to a real Relationship.
10. Workspace execution starts with a Goal and Context Package.
11. Important work ends with Outcome and Write-back.
12. Provenance, state, time, scope, and authority are first-class.
13. Human confirmation governs Identity, key Decisions, Conflict resolution, and consequential external mutation.
14. DataHub manages governed asset Context; Nexus manages personal continuity.
15. Archive Cartography is a semantic system language.
16. Verity is a Hero Scenario and an Evaluation Capability, not the Nexus product boundary.
17. Competition implementation must remain inside the permanent Atlas structure.
18. Source failure remains unknown state, not inferred absence.

---

## 15. Change control

A proposed change to a frozen decision requires an Architecture Decision Record that states:

- the frozen decision being changed;
- evidence that the current decision is insufficient;
- alternatives considered;
- effects on Context Fabric, Territories, Workspaces, Agents, governance, and existing data;
- migration requirements;
- whether the change remains valid after the competition.

Normal implementation details may evolve without an ADR when they preserve these contracts.

Every major feature must pass:

1. Does it strengthen Context Continuity?
2. Does it use the shared Context Fabric?
3. Can it be reused beyond one scenario or Territory?
4. Does it preserve provenance and state?
5. Does it produce an Outcome or Write-back?
6. Does it still belong to Nexus after the competition?

If the answer to questions 1, 2, or 6 is no, the feature does not belong in Nexus Core.
