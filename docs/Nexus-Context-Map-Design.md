# Nexus Context Map Design

Status: Design only. This document defines the first-version Context Map contract and does not introduce an implementation, persistence layer, or graph database.

## 1. Purpose

The current Project Space presents three useful views:

- Project Overview explains what the project is.
- Project Journey shows its current lifecycle stage.
- Action Navigator shows what should happen next.

These views do not yet explain how the project's problems, decisions, milestones, tasks, and progress relate to one another. Users can see individual conclusions, but not the reasoning path that connects them.

Context Map provides that missing relationship view. Its purpose is to answer:

- What is the project trying to solve?
- Which decisions shaped the current direction?
- Which milestone is active?
- Why does a task matter?
- What progress changed the project state?

Context Map is not a chat transcript, a generic flowchart, a task-management graph, or a general-purpose knowledge graph. It is a bounded, read-only projection of Nexus's current understanding of one project.

## 2. Product Concept

Context Map is a **Project Understanding Network**.

- A node represents a meaningful unit of project context.
- An edge represents a typed semantic relationship between two nodes.
- The project node anchors the map.
- The active path highlights the context most relevant to the project's current stage and next action.

The map should help users explore why the project developed in its current direction. Visual proximity alone must not imply a relationship; every visible connection must have an explicit semantic type.

The first-version projection has a stable top-level shape:

```json
{
  "projectId": "",
  "nodes": [],
  "edges": [],
  "focus": {
    "nodeId": "",
    "path": []
  },
  "generatedAt": ""
}
```

This structure is a display contract. It is not a new business-data model and must not become the source of truth for Memory, Execution, or Project Atlas.

## 3. Node Model

All nodes share a minimal common contract:

```json
{
  "id": "",
  "type": "",
  "title": "",
  "summary": "",
  "status": "",
  "source": {
    "kind": "",
    "reference": "",
    "label": ""
  },
  "confidence": "",
  "createdAt": "",
  "updatedAt": ""
}
```

Common-field rules:

- `id` must be stable within a project and must not depend on screen position.
- `type` must use one of the supported first-version node types.
- `source` identifies where the context came from; it must not expose hidden model reasoning.
- `confidence` describes the reliability of the source, not visual importance.
- Missing values remain explicit and must not be invented to complete a node.
- Duplicate source records representing the same context should resolve to one display node.

### Project Node

Represents the project as the central map anchor.

Required project fields:

- `id`
- `title`
- `summary`
- `status`

There is exactly one project node in a first-version map.

### Problem Node

Represents a problem the project intends to address.

Required problem fields:

- `description`
- `source`

Its status should distinguish confirmed problems from proposed or unresolved problems. Project Atlas analysis alone must not turn an assumption into a confirmed problem.

### Decision Node

Represents a consequential project decision, such as selecting a target user or choosing a validation direction.

Required decision fields:

- `decision`
- `reason`
- `source`

A confirmed decision should come from user confirmation or accepted project memory. Model-generated suggestions remain proposed context.

### Milestone Node

Represents a stage-level outcome rather than a general activity.

Required milestone fields:

- `title`
- `status`

The node may also include its goal when available. Supported status values should remain aligned with the Execution Layer.

### Task Node

Represents an action that contributes to a milestone.

Required task fields:

- `title`
- `criteria`
- `status`

The detail view should also explain why the task matters when that rationale is available. A task is not promoted to completed progress until its completion is confirmed.

### Progress Node

Represents a retained project-growth event.

Required progress fields:

- `event`
- `time`

Progress must come from confirmed Execution progress or accepted Project Memory. Temporary activity and model guesses do not create progress nodes.

### First-Version Type Boundary

The first version supports:

- Project
- Problem
- Decision
- Milestone
- Task
- Progress

Evidence remains represented through node or edge provenance in the first version. It may become a dedicated node type later, but it must not be introduced implicitly before its contract and source rules are defined.

## 4. Relationship Model

An edge represents a directional, typed semantic relationship:

```json
{
  "id": "",
  "type": "",
  "from": "",
  "to": "",
  "label": "",
  "status": "",
  "source": {
    "kind": "",
    "reference": ""
  }
}
```

First-version relationships include:

| From | Relationship | To | Meaning |
| --- | --- | --- | --- |
| Project | `addresses` | Problem | The project is intended to address the problem. |
| Decision | `supports` | Project | The decision supports the current project direction. |
| Decision | `responds_to` | Problem | The decision is a response to a defined problem. |
| Milestone | `advances` | Project | The milestone advances the project toward its goal. |
| Milestone | `contains` | Task | The task belongs to the milestone. |
| Progress | `updates` | Project | The progress event changes the understood project state. |
| Progress | `confirms` | Milestone or Task | The event confirms completion or meaningful advancement. |

Relationship rules:

- Every edge must reference two existing node IDs.
- Edge direction and label must communicate the same meaning.
- Generic, unlabeled connections are not allowed.
- Layout proximity must never create an inferred edge.
- Duplicate relationships with the same source, type, origin, and target should be collapsed.
- Proposed relationships must remain visually and semantically distinct from confirmed relationships.
- Reverse edges should not be duplicated unless they carry a different meaning.

## 5. Data Source

Context Map reads normalized context from four existing sources:

### Project Atlas

Provides the latest project analysis, including the project summary, identified problems, blueprint, and proposed direction.

Atlas output is treated as analysis. It does not become confirmed Memory solely because it appears in a model response.

### Memory

Provides retained decisions, confirmed project facts, and accepted progress with provenance. Memory is the preferred source for stable historical context.

### Execution

Provides the current stage, milestones, tasks, and confirmed progress states. Generated plans remain proposed until accepted or confirmed through the existing workflow.

### Experience Layer

Provides normalized Project Context, Journey, and Action views. It is the integration boundary used to build a display projection from the underlying sources.

When sources differ, the first-version precedence is:

1. User-confirmed information retained in Project Memory.
2. Confirmed Execution state and progress.
3. Current Project Atlas analysis and proposals.

The Context Map must not read raw chat history, hidden model reasoning, secrets, or unrelated user data. It must not create, update, or delete Memory or Execution records.

## 6. Architecture Boundary

The target read path is:

```text
Nexus Core
    ↓
Project Atlas + Memory Retrieval + Execution
    ↓
Context Experience Adapter
    ↓
Context Map Projection
    ↓
Frontend Renderer
```

Context Map belongs to the Experience Layer.

The Context Map projection is responsible for:

- selecting supported context;
- normalizing nodes and relationships;
- preserving source and confidence information;
- resolving duplicate display entities;
- identifying the active path;
- producing safe empty and partial states.

The frontend renderer is responsible for:

- positioning nodes;
- drawing semantic connections;
- applying the visual theme;
- presenting node and edge details;
- providing an accessible non-graph representation.

Context Map must not:

- call Memory Store directly;
- change the current project stage;
- complete milestones or tasks;
- approve Memory Candidates;
- alter Atlas output;
- persist screen coordinates as project truth.

The projection should remain deterministic for equivalent normalized inputs. Layout choices may change without changing project meaning.

## 7. Visual Expression

The visual expression follows the Nexus Visual System and prioritizes legibility over decoration.

### Map Hierarchy

- The Project Node is the primary anchor.
- The active Problem, Decision, Milestone, and Task form the primary path.
- Historical Progress and secondary context appear with lower visual emphasis.
- Source, confidence, and status remain available without crowding the default map.

The initial view should remain bounded. A practical first-version target is 12–20 visible nodes, with additional context available through focused exploration instead of rendering an unrestricted graph.

### Dark Mode: 静谧深空

- Use a blue-black background and restrained indigo surfaces.
- Render nodes as quiet points or compact regions.
- Use thin, low-contrast tracks for relationships.
- Use a soft halo only for the current focus.
- Avoid neon borders, saturated gradients, and particle effects.

### Light Mode: 晨雾星图

- Use mist white, pale gray-purple, and soft blue surfaces.
- Render relationships as light map lines.
- Preserve a paper-like sense of space and clear typography.
- Avoid a generic pure-white dashboard appearance.

### Semantic State

Confirmed, proposed, completed, active, and unresolved states must differ through more than color. Labels, line styles, node markers, or icons should provide redundant cues.

On narrow screens, the map should become a vertical semantic path or outline. It must not shrink a desktop graph until labels become unreadable.

## 8. Interaction Principles

The first-version interaction model is **explore, not edit**.

### Node Interaction

- Click or focus a node to view its details.
- Show its content, status, source, confidence, and related nodes.
- Keep selection local to the Experience Layer; selection does not update project state.

### Connection Interaction

- A connection exposes its relationship label and source.
- Users should be able to understand the relationship without relying on line direction alone.

### Memory and Progress

- Memory-backed context displays its source and confirmation state.
- Progress nodes expose when the event occurred and which project element it changed or confirmed.

### Navigation and Accessibility

- Keyboard users can move through nodes and their relationships in a stable order.
- Focus states remain visible in both themes.
- A semantic outline or list provides the same information as the visual map.
- Pan and zoom are optional for the first version; they must not be required to access content.
- Empty, partial, loading, and unavailable states use clear user-facing messages.

Dragging a node, changing its position, or selecting it must never be interpreted as a business-state update.

## 9. Future Extension

Possible later extensions include:

- a dedicated Evidence Node with explicit evidence quality and source contracts;
- a DataHub-backed Context Graph;
- context produced by multiple Atlas agents;
- collaborative project spaces with controlled authorship;
- user-managed Memory visibility and deletion;
- saved view preferences and larger-map navigation.

These extensions do not change the first-version boundary: Context Map remains a read-only Experience projection until separate designs explicitly authorize editing or persistence behavior.

## 10. Design Principles

1. **Context over Chat**  
   Present durable project understanding instead of reproducing conversation order.

2. **Relationship over List**  
   Show why project elements are connected, not merely that they exist.

3. **Explainable AI**  
   Preserve source, confidence, and confirmed-versus-proposed status.

4. **Human Decision First**  
   Model proposals do not become decisions or progress without confirmation.

5. **Growth Visible**  
   Make meaningful stage, milestone, task, and progress changes understandable over time.

6. **Source before Layout**  
   Semantic meaning comes from trusted source data, never from visual placement.

7. **Bounded Complexity**  
   Prioritize the active project path and disclose secondary context progressively.

8. **Read-Only Projection**  
   Context Map displays system understanding without becoming a second state-management layer.

9. **Accessible Equivalence**  
   Every visual relationship must have a readable, navigable non-graph representation.

The first-version design is acceptable when every displayed node and edge has a stable identity, explicit type, traceable source, and understandable relationship; unsupported or missing context remains absent rather than fabricated; and the projection can be rendered without modifying its input data.
