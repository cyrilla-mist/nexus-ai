# Nexus Project Universe Redesign

Status: Design only. This document defines the product, spatial, visual, interaction, and implementation boundaries for Nexus Project Universe. It does not implement layout, SVG, CSS, JavaScript, animation, or state changes.

## 1. Concept Definition

Project Universe is the spatial experience of one project's current context.

It is not:

- a generic relationship graph;
- a data visualization chart;
- a process diagram;
- a task board arranged in circles;
- a decorative astronomy scene.

It is a bounded, read-only space where a user can explore project context, growth path, and action relationships.

Core model:

```text
Project = Universe Core
Context = Orbit
Growth = Journey
```

The project remains the stable center. Context nodes orbit around it according to their role. Growth is represented through confirmed progress, not through decorative motion or raw node count.

## 2. Spatial Philosophy

Project Universe uses space before text.

The default view should communicate orientation, relationship, and priority before asking the user to read details. The canvas is for exploration; the detail panel is for reading.

Principles:

- space first;
- progressive disclosure;
- strong center;
- exploration instead of long reading;
- stable orientation.

The default state should not show every label, source, timestamp, task criterion, or relationship label. Showing everything at once turns the Universe back into a dense report. Instead, the user should see the project core, semantic orbit regions, priority nodes, and quiet relationship paths. Details appear through focus and selection.

Position must not create false meaning. Only typed Context Graph edges represent relationships. Orbit placement means a context item belongs to a role, not that every item in the orbit is directly connected.

## 3. Universe Layout

The first implementation should use a deterministic, center-oriented layout.

```text
                    Growth Orbit

                 Execution Orbit

              Understanding Orbit

                   Project Core
```

This expresses hierarchy, not literal screen coordinates. The implementation may use arcs, rings, or asymmetric orbit fields as long as semantic regions remain clear.

### Project Core

The Project Core sits at the center.

Requirements:

- largest visual weight;
- stable center position;
- strongest readable contrast;
- project name and current stage only;
- soft, restrained halo;
- visible in default, hover, selected, and related-context states.

The Project Core is not a normal node. It is the anchor of the project space.

### Orbit System

Orbits are semantic regions. They are not decoration.

### Understanding Orbit

Contains:

- Problem;
- Decision.

Meaning:

- why the project exists;
- what needs to be understood;
- which decisions support the current direction.

This is the nearest orbit to the Project Core because it explains the project direction.

### Execution Orbit

Contains:

- Milestone;
- Task.

Meaning:

- how the project advances;
- what stage goal is active;
- which actions contribute to that goal.

Milestones should carry more visual weight than tasks.

### Growth Orbit

Contains:

- Progress.

Meaning:

- what changed;
- what was confirmed;
- how the project has grown.

Growth items should feel like recorded events, not generated intentions.

## 4. Node Visual System

The first version supports six node types:

- `project`
- `problem`
- `decision`
- `milestone`
- `task`
- `progress`

Each node must define:

- size;
- visual weight;
- state;
- default display content;
- detail-panel content;
- accessible label.

| Type | Relative size | Visual weight | Default content | Detail content |
| --- | --- | --- | --- | --- |
| `project` | Largest | Highest | Project name, current stage | Summary, goal, stage |
| `problem` | Medium | Medium | Short problem label | Source and full description |
| `decision` | Medium-large | Medium-high | Short decision label | Reason, source, confidence |
| `milestone` | Medium-large | Medium-high | Milestone title and status | Goal and related tasks |
| `task` | Compact | Medium-low | Short task title when relevant | Why, criteria, status |
| `progress` | Compact | Medium-low | Short event label | Time, source, impact |

Node hierarchy must use more than color. Size, shape, outline, fill, label policy, and state marker should all contribute to meaning.

Default canvas labels should stay concise. Full content belongs in the detail panel.

## 5. Connection System

Connections express typed relationships from the Context Graph.

Supported relationships:

- `addresses`
- `supports`
- `contains`
- `updates`

Default state:

- relationships are visible but quiet;
- labels are hidden or minimized;
- connection opacity stays below node opacity;
- lines do not compete with the Project Core.

Focus state:

- related connections become clearer;
- unrelated connections recede;
- relationship labels become readable in the focused path or detail panel;
- direction remains understandable.

Avoid:

- strong glowing lines;
- particle effects;
- labels on every edge by default;
- thick arrows;
- decorative lines without a Context Graph edge.

## 6. Focus Interaction

The interaction model is read-only exploration.

### Default

Shows the whole bounded Universe:

- Project Core;
- orbit regions;
- priority nodes;
- quiet connections.

### Hover

Gives a temporary preview:

- light emphasis;
- concise title;
- related path preview;
- no layout movement.

Hover must not be required on touch devices.

### Selected

Creates the active focus:

- selected node becomes visually primary;
- related nodes and edges strengthen;
- unrelated context becomes quiet;
- detail panel opens or updates;
- Project Core remains visible.

Selection changes presentation state only. It never edits project data.

### Related Context

Related context means directly connected nodes from explicit edges. Indirect paths are not automatically expanded in the first version.

## 7. Detail Panel

The Detail Panel is the reading surface for selected context.

It should show, when available:

- node type;
- name or title;
- status;
- summary or full content;
- source;
- confidence or confirmation state;
- timestamp;
- related relationships;
- related node names.

Principles:

- information goes in the detail panel;
- orientation stays on the canvas;
- the panel is read-only;
- unknown values display `无法判断`;
- hidden model reasoning is never exposed.

Desktop behavior:

- appears beside the Universe canvas;
- keeps a bounded reading width;
- does not move the Project Core.

Mobile behavior:

- appears as a bottom sheet, inline expansion, or focused reading view;
- provides an obvious return action;
- restores focus predictably.

## 8. Visual Atmosphere

Project Universe inherits Nexus Visual Identity.

### Dark Mode: 静谧深空

Desired qualities:

- blue-black depth;
- distance between orbit regions;
- sparse star dust;
- low-intensity light;
- calm focus states.

Use restrained blue, violet, and muted teal accents. The Project Core may have the only persistent halo.

Prohibited:

- neon purple-blue gradients;
- science-fiction HUD frames;
- strong glow on every node;
- particle explosions;
- rotating rings;
- animated energy lines.

### Light Mode: 晨雾星图

Desired qualities:

- mist-white canvas;
- morning blue tonal fields;
- fine map and route lines;
- paper-like reading surfaces;
- gentle distance through tone and spacing.

The Project Core should feel like a stable map anchor rather than a glowing object.

Prohibited:

- pure white dashboard background;
- identical white cards;
- heavy gray borders;
- saturated template gradients;
- map lines crossing text.

Both themes must preserve the same semantic hierarchy, focus states, and accessibility behavior.

## 9. Layout Algorithm Boundary

The current phase uses deterministic layout.

Allowed:

- fixed Project Core position;
- fixed orbit radii or semantic regions;
- stable ordering within each orbit;
- bounded collision adjustments;
- layout derived only from Context Graph type, state, and stable identity.

Not allowed in this phase:

- force-directed simulation;
- physics layout;
- machine-learned layout;
- automatic clustering that creates new meaning;
- saved node coordinates as project truth;
- new graph-layout dependency.

Why deterministic layout:

- stable orientation;
- reproducible tests;
- predictable keyboard order;
- lower performance risk;
- easier comparison between project states.

## 10. Mobile Universe

Mobile Universe is not a scaled-down desktop canvas.

Mobile should prioritize:

- compact Project Core summary;
- currently focused node;
- named related paths;
- semantic groups for Understanding, Execution, and Growth;
- detail access.

The mobile fallback should group content as:

```text
Project Core
Understanding
  Problem
  Decision
Execution
  Milestone
  Task
Growth
  Progress
```

Requirements:

- no essential horizontal panning;
- no unreadably small labels;
- no hover-only information;
- no canvas-only relationships;
- touch targets at least `44 x 44 px`;
- reduce atmospheric detail before reducing contrast.

## 11. Relationship with Context Map

Context Map and Project Universe consume the same read-only Context Graph but solve different needs.

| Dimension | Context Map | Project Universe |
| --- | --- | --- |
| Primary purpose | Understand explicit relationships | Explore the project as a space |
| Default form | Relationship network or list | Project Core with orbit regions |
| Information density | Higher | Lower by default |
| Labels | More visible | Progressively revealed |
| Interaction | Inspect why items connect | Navigate a project space |
| Mobile | Relationship outline | Focused node plus semantic fallback |

Context Map answers:

- What is connected?
- What does the relationship mean?
- Where did the context come from?

Project Universe answers:

- What is central now?
- Which context region am I exploring?
- What path supports the current direction?
- How has the project grown?

Project Universe must not create new relationships, reinterpret edge direction, or become a separate source of project truth.

## 12. Implementation Plan

### Phase 1: Visual Model

Goal: establish the Universe hierarchy without changing Context Graph or layout logic.

Scope:

- define Project Core anatomy;
- define orbit-region tokens;
- define six node markers;
- define default, hover, selected, related, and quiet states;
- simplify default labels;
- align Dark and Light behavior.

Acceptance:

- Project Core is immediately identifiable;
- node types and states remain accessible;
- connections remain secondary;
- no core, Memory, Execution, Atlas, Experience, Worker, API, or Context Graph changes.

### Phase 2: Layout Optimization

Goal: improve spatial balance while preserving deterministic behavior.

Scope:

- refine orbit radii;
- refine angular placement;
- group tasks under milestones through existing `contains` edges;
- preserve chronological Progress ordering when timestamps exist;
- reduce supported label collisions;
- keep positions stable for equivalent input.

Acceptance:

- supported graph sizes remain readable;
- selection never reruns layout;
- tests can assert orbit membership and deterministic coordinates;
- no automatic graph dependency is introduced.

### Phase 3: Interaction Enhancement

Goal: improve exploration without creating editing behavior.

Scope:

- refine hover preview;
- strengthen selected related paths;
- improve Detail Panel focus restoration;
- expose edge relationships in Detail;
- refine mobile focused-node and semantic-outline modes;
- support reduced motion.

Acceptance:

- mouse, keyboard, and touch users receive equivalent information;
- selection changes presentation state only;
- Detail remains read-only;
- motion is optional and never required for meaning.

Explicitly deferred:

- 3D rendering;
- physics layout;
- unlimited graph navigation;
- drag editing;
- saved coordinates;
- DataHub integration;
- collaboration;
- new node or edge contracts.

## 13. Design Principles

- Universe over Diagram
- Space over Information
- Context over Content
- Explore over Scroll
- Calm Intelligence
- Project at the Center
- Semantic Orbits
- Connections Stay Quiet
- Detail Carries Content
- Deterministic before Automatic
- Read-only Exploration
- Accessible Equivalence

Project Universe is ready for implementation when:

- the Project Core is the strongest anchor in both themes;
- Understanding, Execution, and Growth orbits have explicit semantic meaning;
- all six node types define size, hierarchy, state, and default content;
- supported connections define default and focus behavior;
- detail contains full context without crowding the canvas;
- deterministic-layout constraints are testable;
- mobile provides focused-node and semantic-list experiences;
- Context Map and Universe responsibilities remain distinct.
