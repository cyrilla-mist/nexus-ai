# Nexus Star Map Design

> Status: Design only. This document defines the spatial experience, layout rules, interaction model, motion language, and technical boundary of Nexus Star Map. It does not implement a renderer, UI, animation, graph algorithm, or persistence mechanism.

## 1. Purpose

The current Context Map makes project relationships visible through typed nodes, semantic edges, and a readable detail surface. It answers what is connected and how those items relate.

Star Map adds spatial orientation and exploration. It should help a user perceive:

- what remains at the center of the project;
- which context explains why the project exists;
- which elements describe how it is moving forward;
- what confirmed progress shows about project growth;
- which relationship path is currently relevant.

Star Map does not replace the Context Map contract. It is a renderer and interaction model for that contract.

Star Map is not:

- a generic relationship graph;
- a process diagram;
- a data-visualization dashboard;
- a project-management canvas;
- a simulation of autonomous intelligence.

Its primary outcome is orientation. A user should understand the project structure before noticing the spatial metaphor.

## 2. Product Concept

Star Map represents a **Project Universe**.

The metaphor has four functional parts:

| Star Map concept | Product meaning |
| --- | --- |
| Project Core | The project identity and current direction |
| Context point | A problem, decision, milestone, task, or progress event |
| Connection track | A named relationship from the Context Graph |
| Growth trace | Confirmed change over the project lifecycle |

The project is the stable center. Other nodes form layers around it according to their role, not according to visual novelty or model confidence.

```text
                    Problem
                       ·

        Decision ─── Project Core ─── Milestone
                       ·                    ·
                      Task              Progress
```

This diagram is conceptual. Real placement follows the spatial and relationship rules defined below.

### Metaphor constraints

- Every semantic node must come from `contextMap.nodes`.
- Every semantic connection must come from `contextMap.edges`.
- Decorative stars must never be interactive or visually confused with context nodes.
- Distance indicates spatial grouping, not certainty, priority, or causality unless a label explicitly states otherwise.
- Node size represents display hierarchy, not an AI-generated importance score.
- Missing context remains a visible gap or an empty state; the renderer must not invent a node to complete the composition.

## 3. Spatial Model

The Star Map uses four spatial layers.

### Project Core

The Project Core occupies the visual center and represents the project itself.

It provides:

- project identity;
- current status;
- a concise summary;
- a stable orientation point for all relationship paths.

There must be no more than one Project Core in a single-project Star Map. If the graph does not contain a project node, the renderer shows a safe empty or partial state instead of selecting another node as the center.

### Understanding Layer

The first orbit contains:

- Problem nodes;
- Decision nodes.

This layer answers **why the project exists and why it is taking its current direction**.

Placement rules:

- Problem nodes remain visually distinguishable from Decision nodes.
- A Problem connected by `addresses` should remain close to its Project relationship path.
- A Decision connected by `supports` should be placed where its path to the Project Core is readable.
- Confirmed decisions and proposed analysis must not share identical state treatment.
- Multiple Problem or Decision nodes use stable ordering rather than random distribution.

### Execution Layer

The second orbit contains:

- Milestone nodes;
- Task nodes.

This layer answers **how the project moves forward**.

Placement rules:

- A Milestone is the anchor for its contained Tasks.
- A Task remains spatially grouped with the Milestone linked by `contains`.
- The active Milestone receives more emphasis than future or completed Milestones.
- Task placement must not obscure the Milestone-to-Task relationship label.
- Tasks without a valid Milestone relationship appear in a clearly labelled ungrouped region rather than being assigned arbitrarily.

### Growth Layer

The outer layer contains Progress nodes and represents confirmed project growth.

Placement rules:

- Progress follows chronological order when reliable timestamps exist.
- Progress without a timestamp remains explicitly undated.
- Recent confirmed progress may receive moderate emphasis, but must not overpower the Project Core.
- `updates` relationships return visually toward the Project Core or the affected path.
- Growth is represented as history, not as a prediction of future success.

### Layer relationship

```text
Growth Layer:          Progress history
                          ○   ○

Execution Layer:     Milestone ─ Task
                          ◇      ·

Understanding Layer: Problem    Decision
                          △        ◆

Project Core:               ●
```

The orbit is a grouping device. It does not require literal circular geometry, continuous rotation, or three-dimensional depth.

## 4. Node Visual Language

All nodes share a common anatomy:

- type marker;
- concise title;
- semantic state;
- focus state;
- optional source indicator;
- optional relationship count.

The default map shows concise information. Full content, provenance, and criteria belong in the Context Detail Surface.

### Project Node

Role: primary spatial anchor.

Visual direction:

- largest node in the map;
- fixed or near-fixed central position;
- clear project title;
- current status represented textually;
- one restrained, localized halo when active.

The Project Node must remain understandable without its halo.

Recommended first-version diameter: `72–96 px`, adjusted for label length and viewport.

### Problem Node

Role: problem entry point.

Visual direction:

- open or outlined marker;
- distinct type label;
- restrained warm or neutral tension cue;
- proposed versus confirmed state expressed through line and marker style.

A Problem Node must not look like an error alert.

Recommended first-version diameter: `42–58 px`.

### Decision Node

Role: consequential project choice.

Visual direction:

- stable, directional marker;
- source or confirmation state available in detail;
- confirmed decisions use a solid center;
- proposed choices use an outlined or dashed treatment.

Recommended first-version diameter: `44–60 px`.

### Milestone Node

Role: stage-level execution target.

Visual direction:

- medium emphasis;
- status visible without opening detail;
- active Milestone distinguished from pending and completed states;
- visually anchors its Tasks.

Recommended first-version diameter: `48–64 px`.

### Task Node

Role: actionable unit linked to a Milestone.

Visual direction:

- compact marker;
- completion status visible;
- concise title on focus or nearby label;
- completion criteria shown in detail, not compressed into the node.

Recommended first-version diameter: `30–44 px`.

### Progress Node

Role: retained growth event.

Visual direction:

- smallest semantic node class;
- placed on or near the Growth Layer;
- timestamp or undated state available in detail;
- completed history should feel stable rather than animated as live activity.

Recommended first-version diameter: `24–36 px`.

### State treatment

| State | Node treatment |
| --- | --- |
| Current | Solid center, clear label, restrained focus halo |
| Confirmed | Stable fill and source indicator |
| Proposed | Outlined or dashed marker plus text label |
| Completed | Quiet filled marker and continuous connection |
| Unresolved | Open marker and explicit unresolved label |
| Blocked | Interrupted connection and readable reason |
| Unknown | Neutral open marker and “无法判断” |

Color must not be the only state carrier.

## 5. Connection Language

A connection is a semantic relationship, not decoration.

First-version relations include:

| Relation | Visual meaning |
| --- | --- |
| `addresses` | Project direction toward a Problem |
| `supports` | Decision support for the Project |
| `contains` | Milestone ownership of a Task |
| `updates` | Progress changing the understood Project state |

### Line treatment

- Confirmed relationship: thin solid track.
- Proposed relationship: thin dashed track.
- Unresolved or blocked relationship: interrupted track with a state label.
- Focused relationship: moderately increased contrast or width.
- Unfocused secondary relationship: lower contrast, but still discoverable.

Line strength reflects interaction focus and semantic state. It must not imply confidence when no confidence field exists.

### Direction and labels

- Direction is shown with a restrained terminal marker when it matters.
- Relationship names remain available as visible labels, tooltips, or accessible descriptions.
- A focused edge must expose both endpoints, relationship name, and source when available.
- Curved tracks may reduce collisions, but must not imply an orbit or sequence that the data does not contain.
- Decorative orbit lines must remain visually distinct from semantic edges.

### Active path

The renderer may emphasize one active path, for example:

```text
Problem → Project Core → Milestone → Task
```

The path must be derived from existing edges and current display state. It must not create missing relationships.

## 6. Layout Strategy

Star Map is not a fixed left-to-right flowchart. It uses deterministic, relationship-aware spatial layers.

### First-version layout

The first version may use deterministic placement.

Required behavior:

1. Place the Project Node at the center.
2. Allocate the Understanding Layer to Problem and Decision nodes.
3. Allocate the Execution Layer to Milestone and Task groups.
4. Allocate the Growth Layer to Progress nodes.
5. Preserve direct Milestone-to-Task grouping.
6. Route semantic edges with minimal label and node collision.
7. Produce the same initial placement for the same graph input and viewport class.

Stable ordering should use:

1. relationship to the selected or active node;
2. semantic status, when available;
3. timestamp for Progress nodes;
4. stable node ID as the final tie-breaker.

Random initial placement is not allowed.

### Suggested wide-screen sectors

- Problem nodes: upper-left to upper-center sector;
- Decision nodes: lower-left to upper-left sector;
- Milestones: upper-right to center-right sector;
- Tasks: grouped around their Milestone in the right or lower-right sector;
- Progress: outer arc ordered by time.

Sectors are defaults, not business meaning. The renderer may adjust them to prevent overlap while preserving layer membership.

### Density management

The initial view should prioritize a bounded set of context:

- target: `12–20` visible semantic nodes;
- always include the Project Core;
- prioritize the active relationship path;
- progressively disclose secondary historical context;
- summarize overflow by type or time without inventing a semantic node in the Context Graph.

An overflow control is view state, not graph data.

### Responsive behavior

Desktop and large tablet:

- show the spatial map and adjacent Context Detail Surface;
- preserve Project Core orientation;
- allow focused-path exploration without covering labels.

Narrow screen:

- replace the radial map with a layered vertical path or semantic outline;
- preserve node order, relation labels, state, and detail access;
- avoid mandatory horizontal panning;
- do not shrink the desktop map until text becomes unreadable.

The mobile alternative is an equivalent Star Map experience, not a reduced screenshot of the desktop layout.

### Layout persistence

First-version coordinates are renderer output and must not be written into Context Graph, Memory, Execution, or Atlas data. Saved user layouts require a separate design.

## 7. Interaction Design

The interaction principle is **explore, not edit**.

### Node interaction

Click or tap:

- select the node;
- reveal the Context Detail Surface;
- emphasize directly connected edges and neighboring nodes;
- keep unrelated context visible at lower emphasis.

Hover, where available:

- show a concise title and state;
- never contain information unavailable to touch or keyboard users;
- avoid moving the node under the pointer.

Keyboard:

- Tab reaches the map and its controls;
- arrow keys or documented next/previous controls move through spatial neighbors;
- Enter or Space opens node detail;
- Escape clears transient focus without changing project data;
- focus order remains deterministic.

### Connection interaction

Selecting a connection reveals:

- source node;
- relation name;
- target node;
- source or state when available.

A connection cannot be created, deleted, or redirected in this version.

### Zoom and pan

Zoom supports orientation, not infinite-canvas behavior.

First-version guidelines:

- provide explicit zoom controls;
- offer “fit project” to restore the default view;
- keep the Project Core discoverable;
- constrain zoom to a readable range, initially about `0.75×–1.75×`;
- support wheel or gesture zoom only when it does not interfere with page scrolling;
- do not require zoom to access essential content.

Pan may move the viewport but must not change node coordinates in business data.

### Detail surface

The Context Detail Surface should show:

- node type and title;
- full content;
- semantic state;
- source and time when available;
- connected nodes and relationship labels;
- unresolved information.

The detail surface is optimized for reading and does not inherit moving backgrounds.

### Read-only guarantee

Selection, hover, zoom, pan, and focus are temporary view state. They must not:

- update Memory;
- complete a Task;
- change project stage;
- approve a Decision;
- create a Context Graph edge;
- trigger a new model request.

## 8. Dark Mode

Name: **静谧深空**.

Atmosphere: observing a growing project system in a quiet night sky.

### Visual direction

- Canvas: blue-black rather than pure black.
- Spatial depth: deep navy and restrained indigo fields.
- Project Core: soft celestial blue or muted violet emphasis.
- Semantic nodes: low-to-medium luminance star points with readable labels.
- Connections: thin blue-gray tracks.
- Orbit guides: lower contrast than semantic connections.
- Detail surface: stable dark reading surface.

### Halo rules

- Only the selected or active node receives a notable halo.
- Halo radius remains localized.
- Halo is supplementary and never the sole focus indicator.
- Completed historical nodes do not continuously glow.

### Decorative field

Sparse static star dust is allowed when:

- it has lower contrast than semantic nodes;
- it is not focusable;
- it does not sit behind dense text;
- it remains distinguishable from loading or progress states.

### Prohibited treatment

- neon outlines on every node;
- saturated purple-blue gradients;
- science-fiction HUD frames;
- rotating rings without meaning;
- strong particle fields;
- lens flares or light bursts;
- high-frequency parallax.

## 9. Light Mode

Name: **晨雾星图**.

Atmosphere: a project exploration map unfolded in morning mist.

### Visual direction

- Canvas: mist white with pale blue-gray or gray-violet fields.
- Project Core: calm map anchor with restrained emphasis.
- Semantic nodes: map markers or points with clear outlines.
- Connections: light blue-gray paths.
- Orbit guides: fine chart lines, lighter than semantic paths.
- Detail surface: clean, stable paper-like reading area.

### Depth

Depth should come from:

- tonal separation;
- spacing;
- path hierarchy;
- restrained surface elevation;
- node scale.

Avoid relying on heavy shadows or stacks of white cards.

### Map-line rules

- Lines must not cross dense text.
- Decorative paths remain distinguishable from semantic edges.
- Current focus remains visible in bright ambient light.
- Confirmed, proposed, and unresolved states retain the same meaning as Dark Mode.

## 10. Motion Language

Motion is slow, light, and natural. It explains focus or change; it does not perform intelligence.

### Functional motion

Allowed:

- node-focus transition;
- active-path reveal;
- detail-surface entrance;
- fit-view transition;
- restrained zoom and pan interpolation.

Recommended durations:

- focus state: `140–220 ms`;
- detail reveal: `200–320 ms`;
- fit-view or route transition: `320–520 ms`.

### Ambient motion

Optional, not required for the foundation renderer:

- one active-node breathing cycle;
- very slow orbit-track flow;
- sparse decorative star drift.

Guidelines:

- node breathing period: `5–8 s`;
- orbit flow period: `10–18 s`;
- star drift period: `24–40 s`;
- at most one dominant ambient behavior per map;
- pause or reduce ambient motion while the user reads details.

### Prohibited motion

- rapid flashing;
- multiple constantly pulsing nodes;
- particle bursts;
- rotating decorative systems;
- spring overshoot on project state;
- motion suggesting completion before confirmation;
- animation required to understand a relationship.

### Reduced motion

With reduced motion enabled:

- remove all ambient motion;
- replace spatial travel with short opacity changes or immediate updates;
- retain static focus, relationship, and progress markers;
- keep zoom controls and detail access functional.

## 11. Technical Boundary

Star Map consumes the existing read-only Context Graph:

```text
Context Graph
    ↓
Star Map View Adapter
    ↓
Star Map Renderer
    ↓
Frontend
```

Expected input:

```text
{
  nodes: [...],
  edges: [...]
}
```

The renderer may derive temporary view data such as:

- deterministic coordinates;
- visible-node subset;
- selected node or edge;
- viewport transform;
- active path;
- label placement;
- collision adjustments.

This derived data is not project state and is not written back to Context Graph.

### Renderer responsibilities

- validate safe arrays and supported node types;
- produce deterministic initial placement;
- draw semantic nodes and connections;
- expose relationship labels and accessible descriptions;
- maintain temporary focus, zoom, and pan state;
- provide a semantic list or outline equivalent;
- adapt to theme and reduced-motion preferences;
- render empty and partial graphs safely.

### Renderer prohibitions

The renderer must not:

- read Memory, Execution, or Atlas directly;
- infer a new relationship from spatial proximity;
- mutate node or edge objects;
- persist coordinates into project data;
- generate missing context;
- mark work complete;
- trigger model analysis from map navigation.

### SVG and Canvas decision boundary

The renderer technology is selected during the implementation foundation step.

Evaluation criteria:

- accessibility and semantic focus support;
- readable labels and relationship descriptions;
- performance at the bounded first-version node count;
- responsive behavior;
- theme styling;
- zoom and pan complexity;
- testability without a large dependency.

SVG is the default evaluation candidate because the initial graph is bounded and requires accessible, individually interactive elements. Canvas is justified only if measured complexity or performance cannot be handled within that constraint. The product contract must remain renderer-independent.

### Failure behavior

- Empty graph: show a clear empty project-context state.
- Missing Project Node: show a partial-state explanation and semantic outline.
- Invalid edge endpoint: omit the visual edge and report it in developer diagnostics.
- Unsupported node type: render a neutral Context Node without inventing semantics.
- Layout failure: fall back to the semantic outline.

## 12. Future Extension

Possible future extensions include:

- DataHub-backed persistent Context Graphs;
- deeper project histories and time-based navigation;
- multiple Atlas contributions with clear provenance;
- cross-project comparison;
- collaborative Project Universes;
- saved view state and user-defined presentation layouts;
- guided project walkthroughs;
- evidence nodes with explicit quality metadata;
- large-graph clustering and progressive loading.

These extensions require separate data, interaction, privacy, and accessibility specifications. They must not weaken the first-version read-only boundary.

## 13. Design Principles

1. **Space over List**
   Use space to make project structure understandable, while preserving an equivalent semantic outline.

2. **Context over Decoration**
   Every prominent visual element must communicate project context or interaction state.

3. **Calm Intelligence**
   Depth comes from clear hierarchy, continuity, and restraint rather than spectacle.

4. **Explainable AI**
   Relationships, sources, states, and uncertainty remain inspectable.

5. **Growth Visible**
   Confirmed Progress forms a readable project history without implying predicted success.

6. **Project at the Center**
   The project, not the model or latest response, remains the spatial anchor.

7. **Deterministic before Automatic**
   The first layout is stable and testable before introducing automatic graph layout.

8. **Exploration without Mutation**
   Navigation changes view state only; it does not change project state.

9. **Semantic Consistency across Themes**
   静谧深空 and 晨雾星图 share the same node hierarchy, states, and relationships.

10. **Accessible Equivalence**
    Spatial meaning is also available through text, keyboard navigation, and narrow-screen layouts.

The Star Map design is ready for implementation planning when:

- each supported node type has a defined layer and visual role;
- each supported relation has a readable connection treatment;
- the same graph produces stable initial placement;
- selection, zoom, and pan remain temporary view state;
- Dark and Light themes preserve identical semantics;
- reduced-motion and semantic-outline fallbacks are defined;
- renderer technology can be selected without changing Context Graph or core business modules.
