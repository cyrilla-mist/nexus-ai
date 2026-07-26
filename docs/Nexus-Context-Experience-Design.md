# Nexus Context Experience Design

> Status: Design only. This document defines the v0.4 experience architecture and does not implement UI or change existing business logic.

## 1. Purpose

Nexus already has separate capabilities for project analysis, contextual memory, and execution planning. These capabilities operate correctly in the backend, but the user mainly experiences their output as a response to the latest request.

The Context Experience makes the accumulated project understanding visible. Its goal is to help the user recognize:

- what Nexus currently understands about the project;
- which information is confirmed, assumed, or still unknown;
- what Nexus has retained and where it came from;
- how the project has progressed across stages;
- which action is most relevant now and how completion will be judged.

The intended experience is:

> Nexus understands my project, not only my latest question.

This layer does not add new reasoning, memory, or execution behavior. It presents existing context in a coherent and explainable project space.

## 2. Current Experience

The current user-facing flow is approximately:

```text
User Input
    ↓
Project Atlas
    ↓
Structured Text Output
```

The output can contain a Project Blueprint, risks, clarification questions, an execution plan, and a next action. Memory Retrieval and Memory Update provide continuity behind the scenes.

Current experience gaps:

- related information is distributed across separate output sections;
- project growth is difficult to compare across turns;
- retained Memory is not clearly visible or attributable;
- the relationship between decisions, milestones, and tasks is implicit;
- users cannot easily distinguish confirmed context from model proposals;
- the current stage is visible, but the reason for the stage and the path forward are not presented as one journey.

The result is useful analysis without a unified representation of the project as an evolving system.

## 3. Product Concept

### Nexus Project Space

Nexus Project Space is a digital space organized around the growth of one project.

It is not:

- a chat-history page;
- a generic dashboard;
- a visual replacement for Project Atlas;
- a project-management system;
- an editable database interface.

It is a **project context map** that connects the project's current understanding, retained memory, execution state, and next action.

The Project Space should answer five questions:

1. What is this project?
2. What is currently known and unknown?
3. Which decisions and evidence shaped the project?
4. How far has the project progressed?
5. What should the user decide or do next?

The primary object is the project, not the conversation. Individual messages are relevant only when they create a confirmed fact, decision, evidence item, or progress event.

## 4. Information Architecture

The initial Project Space contains five coordinated regions:

```text
Project Overview
      ↓
Context Map
   ↙       ↘
Memory View  Project Journey
      ↘     ↙
Action Navigator
```

These regions are different projections of the same project context. Selecting an item in one region may focus its related items elsewhere, but does not modify core data.

### Project Overview

Purpose:

- establish immediate orientation;
- summarize the current project identity;
- show the latest confirmed state without requiring the user to inspect all context.

Minimum content:

- project name;
- project goal;
- current stage;
- core direction or current solution hypothesis;
- latest confirmed update time;
- unresolved-context indicator.

Presentation rules:

- confirmed information must be visually distinct from assumptions;
- unknown values should display “无法判断” rather than disappear;
- the current stage should link to its rationale in Project Journey;
- the overview must remain concise and should not duplicate the full Blueprint.

Primary sources:

- Project Atlas `ideaProfile`;
- Project Atlas `projectBlueprint`;
- Project Memory;
- Execution Project State.

### Context Map

The Context Map is the central visual model of Project Space.

It presents traceable relationships such as:

```text
Project
    ↓
Problem
    ↓
Decision
    ↓
Evidence
    ↓
Milestone
    ↓
Task
    ↓
Progress
```

The sequence describes a common reasoning path, not a requirement that every project has every node. Nodes appear only when supported by existing context.

Node types:

| Node | Meaning | Primary source |
| --- | --- | --- |
| Project | Project identity and goal | Project Atlas / Project Memory |
| Problem | Confirmed or proposed problem statement | Project Blueprint |
| Decision | User-confirmed project choice | Project Memory |
| Evidence | Traceable support for a fact or decision | Memory source metadata / future evidence data |
| Milestone | Meaningful stage outcome | Execution Layer |
| Task | Verifiable work supporting a milestone | Execution Layer |
| Progress | Confirmed stage, milestone, or task completion | Progress Memory |

Connection types:

- `defines`: Project → Problem;
- `supports`: Evidence → Decision;
- `changes`: Decision → Project or Milestone;
- `advances`: Milestone → Project Stage;
- `contains`: Milestone → Task;
- `confirms`: Progress → Task or Milestone.

Context Map rules:

- a connection must represent a known relationship, not visual decoration;
- missing evidence must be shown as an explicit gap when it materially affects a decision;
- assumptions must use a distinct state and must not look confirmed;
- the initial view should prioritize the active path rather than render every historical item;
- the map must have an accessible list or outline representation;
- graph layout is a presentation concern and must not become a new business-data model in v0.4.

### Memory View

Memory View explains what Nexus currently retains about the project.

Each visible Memory item should include:

- content;
- memory category;
- source;
- recorded or updated time;
- confidence or validation state;
- related project stage;
- relationship to a decision, milestone, or task when available.

Suggested states:

- `user_confirmed`;
- `execution_confirmed`;
- `system_verified`;
- `assumption`;
- `rejected` or `not retained`, when explaining why an item did not enter Memory is useful.

Memory View principles:

- Memory must be inspectable rather than hidden;
- model-generated suggestions must not appear as retained facts;
- duplicate updates should be represented as one durable item with traceable history;
- sensitive or irrelevant information must not be displayed because it must not be retained;
- future correction and deletion controls may be added only when the underlying Memory API supports them.

The first Experience Layer remains read-only. It does not edit, delete, approve, or create Memory directly.

### Project Journey

Project Journey displays project growth across the existing lifecycle:

```text
Idea
  ↓
Explore
  ↓
Design
  ↓
Validate
  ↓
Execute
```

For each stage, the experience may show:

- stage goal;
- stage status;
- entry reason and time;
- important decisions;
- completed milestones;
- unresolved risks or missing evidence;
- the condition for progressing to the next stage.

Stage states:

- `completed`;
- `current`;
- `next`;
- `not_started`;
- `revisited`, when later evidence requires returning to an earlier stage.

Journey rules:

- stage changes must come from confirmed Project Memory;
- a generated plan cannot visually advance the project;
- returning to an earlier stage is a valid project event, not an error;
- the active stage must show why Nexus considers it current;
- historical stage changes should be chronological and traceable.

### Action Navigator

Action Navigator presents the single most relevant current action or decision.

Minimum content:

- current objective;
- recommended action;
- why it matters now;
- completion criteria;
- linked milestone;
- blocking information or dependency;
- whether the action is a proposal or a confirmed task.

Action Navigator should distinguish:

- **clarify:** the project lacks information required for a reliable plan;
- **decide:** the user must select or confirm a direction;
- **execute:** a verifiable task is ready;
- **review:** a result or milestone needs evaluation.

The Action Navigator does not execute work or mark completion automatically. It explains the next step and keeps the final decision with the user.

## 5. Relationship With Existing Architecture

The Context Experience consumes read-only projections from existing modules:

```text
Project Atlas Output ─┐
                     │
Memory Layer ────────┼──→ Context Projection ──→ Project Space
                     │
Execution Layer ─────┘
```

Responsibilities:

| Module | Experience responsibility |
| --- | --- |
| Project Atlas | Supplies the latest project understanding, Blueprint, risks, and recommendations. |
| Memory Layer | Supplies retained facts, decisions, stage changes, and confirmed progress with provenance. |
| Execution Layer | Supplies Project State, milestones, tasks, status, rationale, and criteria. |
| Context Projection | Normalizes existing data into view models without changing domain state. |
| Experience Layer | Renders the Project Space and explains relationships to the user. |

Boundary rules:

- Experience Layer is read-only with respect to core project data;
- it does not call Memory Store directly;
- it does not evaluate project stages;
- it does not generate milestones or tasks;
- it does not decide which Memory candidates are accepted;
- it does not transform assumptions into facts;
- user actions that may change core state must continue through Nexus Core and the relevant validation path.

This separation allows the experience to evolve without coupling visual components to Memory storage or Atlas model output.

## 6. Visual Language

The visual system should communicate calm, depth, continuity, and traceable relationships. It should support dense project information without resembling an operational monitoring dashboard.

Theme variables should represent semantic roles such as:

- background;
- surface;
- primary and secondary text;
- border;
- context track;
- node states;
- current focus;
- confirmed, assumed, and unresolved status;
- soft glow and depth.

The two modes share information hierarchy, node semantics, spacing, and interaction behavior.

### Dark Mode: 静谧深空

Keywords:

- blue-black background;
- deep indigo surfaces;
- restrained violet accents;
- sparse star-dust texture;
- soft, localized glow;
- quiet orbital or connection tracks.

Guidelines:

- use luminance contrast to establish hierarchy;
- reserve glow for current focus and active-stage nodes;
- keep content surfaces readable and low-noise;
- use thin, low-contrast connections that become clearer on focus;
- avoid pure black as the only depth mechanism.

Avoid:

- neon cyberpunk styling;
- saturated rainbow gradients;
- brain icons as a metaphor for intelligence;
- particle explosions;
- constant motion;
- decorative graph lines without semantic meaning.

### Light Mode: 晨雾星图

Keywords:

- mist white;
- light gray-violet;
- pale blue;
- map lines;
- star-chart tracks;
- early-morning paper texture.

Guidelines:

- use soft atmospheric color fields behind stable reading surfaces;
- retain strong text contrast;
- use fine lines and spacing instead of nested cards;
- represent active context with a subtle halo rather than a bright highlight;
- let the map feel spatial without reducing information clarity.

Avoid:

- excessive rounded cards;
- uniform pill-shaped controls;
- high-saturation gradients;
- ornamental lines that compete with content;
- low-contrast gray text on translucent surfaces.

### Shared semantic states

Both modes must provide consistent visual distinctions for:

- confirmed context;
- user decision;
- assumption;
- unresolved question;
- active milestone;
- completed progress;
- blocked action;
- selected or focused node.

Color must not be the only state indicator. Labels, icons, line styles, or text descriptions must provide equivalent meaning.

## 7. Interaction Principles

### Context node

- Selecting a node reveals its full content, source, status, and relationships.
- Focused connections become easier to trace.
- Keyboard navigation follows a predictable outline order.
- A non-graph outline provides equivalent access on narrow screens and for assistive technology.

### Memory

- Every retained item exposes its source and validation state.
- User-confirmed and model-proposed information are visibly different.
- The user can understand why an item appears, even before correction controls exist.

### Milestone and progress

- A milestone exposes its goal, tasks, status, and completion criteria.
- Completed progress links back to the confirmation or retained Memory event.
- Proposed tasks cannot look completed or accepted.

### Action

- The next action explains its purpose and completion criteria.
- The interface states whether user confirmation is required.
- The experience never implies that Nexus performed an external action.

### General principles

- progressive disclosure over information overload;
- context relationships over chronological message order;
- explanation before automation;
- stable layout for recurring project information;
- responsive alternatives instead of shrinking a complex graph;
- reduced-motion support;
- visible focus states and sufficient contrast;
- AI provides understanding; the user retains decision authority.

## 8. Data Flow

The read path is:

```text
Memory Retrieval ──┐
                   │
Execution State ───┼──→ Context Projection ──→ Context Experience
                   │
Atlas Output ──────┘
                                      ↓
                                 User Review
```

### Context Projection

Before rendering, a projection layer should produce stable, presentation-oriented structures such as:

- project summary;
- context nodes;
- typed relationships;
- memory items with provenance;
- stage journey events;
- current action.

The projection may:

- normalize field names;
- remove duplicate presentation items;
- connect records using existing identifiers;
- select the active context path;
- provide fallback labels such as “无法判断”.

The projection must not:

- infer new facts;
- advance a project stage;
- accept Memory candidates;
- mark tasks or milestones complete;
- write to Memory;
- mutate Atlas or Execution output.

When context is incomplete, the experience should render the known structure and explicitly show relevant gaps instead of fabricating missing nodes.

## 9. Future Extension

Possible future extensions include:

- **Memory Map:** user controls for reviewing, correcting, or deleting retained context;
- **DataHub Context Graph:** persisted entities and traceable relationships across evidence, decisions, and outcomes;
- **Multi-Atlas context:** scoped views of how different Atlas capabilities contribute to one project;
- **Collaboration:** shared project context with ownership, permissions, and change attribution;
- **context comparison:** explainable differences between earlier and current project states.

These extensions are outside v0.4 design implementation. They require separate decisions about persistence, identity, permissions, privacy, and conflict resolution.

## 10. Design Principles

- **Context over Chat:** organize the experience around the project, not the message stream.
- **Explainable Memory:** show what is retained, where it came from, and how it is classified.
- **Human Decision First:** recommendations and plans remain proposals until the user confirms them.
- **Project Growth Visible:** stages, decisions, milestones, and progress form a traceable journey.
- **Calm Intelligence:** use restrained visual depth and clear information hierarchy instead of spectacle.
- **Read-only Experience Boundary:** presentation does not bypass Nexus Core, Reflection, or Memory Policy.
- **Facts Separate From Assumptions:** uncertainty remains visible.
- **Relationships Must Be Meaningful:** every displayed connection represents a real context relationship.
- **Accessible by Default:** graph views require equivalent semantic navigation and readable responsive layouts.
- **Storage Independent:** the experience must not depend on a specific future persistence technology.
