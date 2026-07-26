# Nexus Visual System Design

> Status: Design only. This document defines the long-term Nexus visual language. It does not implement UI, CSS, HTML, JavaScript, animation, or theme switching.

## 1. Visual Philosophy

Nexus is a project cognition space, not a chatbot interface and not a generic AI technology website.

Its visual system is based on four concepts:

- **Connection:** show how project information relates;
- **Context:** preserve meaning, source, and state around each item;
- **Growth:** make project change and progress visible;
- **Navigation:** help the user understand where the project is and what comes next.

The spatial, star-chart, and network metaphors support these concepts:

- an idea is represented as a point with potential;
- related context forms a visible structure around that point;
- decisions create direction;
- evidence strengthens or challenges a connection;
- milestones and tasks form a navigable route;
- confirmed progress changes the visible project journey.

The metaphor is functional. It must not become decorative space imagery.

### Semantic use of the metaphor

| Visual concept | Product meaning |
| --- | --- |
| Point or node | A project, fact, decision, milestone, task, or progress item |
| Connection | A traceable relationship between context items |
| Orbit or route | The project lifecycle or an active progression path |
| Halo | Current focus, active state, or selected context |
| Density | Amount of relevant context, not system intelligence |
| Distance | Information grouping, not confidence unless explicitly labelled |

Rules:

- Every visible node must correspond to real display data.
- Every connection must communicate a named relationship.
- Decorative stars must remain visually separate from context nodes.
- Visual prominence must reflect user relevance, not model confidence alone.
- Unknown information remains visible as a gap or unresolved state.
- A generated proposal must not look like a confirmed fact or completed action.

The primary visual outcome is orientation: the user should understand the project before noticing the visual effect.

## 2. Brand Atmosphere

The Nexus atmosphere is:

- quiet;
- deep;
- clear;
- rational;
- gentle.

### Quiet

The interface does not compete for attention. Motion is limited, surfaces are stable, and emphasis is reserved for current context and the next meaningful action.

### Deep

Depth comes from spatial relationships, layered surfaces, and controlled contrast. It does not come from heavy shadows, glowing borders, or simulated three-dimensional objects.

### Clear

Information hierarchy remains legible in both themes. Context type, source, confidence, and status must not rely on atmosphere alone.

### Rational

Connections are explainable. State changes are labelled. Visual structure follows project structure rather than arbitrary composition.

### Gentle

The visual system should feel supportive rather than commanding. Recommendations remain proposals, errors remain understandable, and unresolved context is shown without alarmist styling.

### Avoid

- visual spectacle as the main product value;
- neon blue and purple as universal accents;
- cyberpunk interfaces;
- excessive glassmorphism;
- dense control panels;
- science-fiction HUD decoration;
- brain, robot, circuit, or magic-wand clichés;
- large animated gradients;
- high-frequency particles;
- language that implies autonomous intelligence or certainty.

## 3. Dark Mode System

Name: **静谧深空**

Atmosphere:

> Observing a quiet star chart at night.

The theme should feel spacious and focused, but remain suitable for reading long project context.

### Color direction

| Role | Direction | Baseline reference |
| --- | --- | --- |
| Canvas | blue-black, not pure black | `#090E1B` |
| Canvas secondary | deep navy | `#0E1526` |
| Primary surface | dark indigo-blue | `#141D32` |
| Elevated surface | restrained blue-gray | `#1A2540` |
| Primary text | cool off-white | `#EDF1FA` |
| Secondary text | muted blue-gray | `#A7B2C8` |
| Quiet text | low-emphasis slate | `#7F8BA4` |
| Border | low-contrast blue-gray | `#2B3854` |
| Context track | subdued indigo | `#344464` |
| Focus blue | soft celestial blue | `#82A9ED` |
| Focus violet | restrained violet | `#9588D5` |
| Confirmed | muted blue-green | `#69A996` |
| Warning | low-saturation amber | `#C3A36B` |
| Blocked | muted red-clay | `#C48282` |

These values are starting references, not final CSS tokens. Contrast must be checked in implementation before use.

### Surface hierarchy

1. **Canvas:** the full project space;
2. **Context field:** a subtle region grouping related information;
3. **Reading surface:** stable text area for details;
4. **Focused node:** selected or active context;
5. **Transient layer:** tooltip, popover, or error notice.

Use luminance and spacing before shadows. If a shadow is required, it should be broad, soft, and low-opacity.

### Effects

Allowed:

- sparse, low-contrast star dust;
- localized soft halos around active nodes;
- thin relationship tracks;
- restrained atmospheric gradients;
- subtle surface translucency when text contrast remains stable.

Not allowed:

- high-saturation purple-blue gradients;
- neon borders;
- glowing every interactive element;
- animated particle explosions;
- lens flares;
- rapid parallax;
- continuous visual noise behind text.

### Dark-mode acceptance checks

- The content remains readable with atmospheric effects removed.
- Primary text and essential controls meet accessible contrast.
- Active context is identifiable without glow.
- Confirmed, assumed, unresolved, and blocked states remain distinguishable without color alone.
- Long-form Memory content does not appear on transparent, moving, or textured backgrounds.

## 4. Light Mode System

Name: **晨雾星图**

Atmosphere:

> A star chart unfolded in early morning mist.

The theme should feel spatial and calm without resembling a blank administration dashboard.

### Color direction

| Role | Direction | Baseline reference |
| --- | --- | --- |
| Canvas | mist white | `#F4F5F9` |
| Canvas secondary | cool gray-violet | `#ECEFF6` |
| Primary surface | warm translucent white | `#FAFAFC` |
| Elevated surface | pale blue-white | `#F1F4FA` |
| Primary text | deep blue-charcoal | `#182136` |
| Secondary text | slate blue-gray | `#5F6D86` |
| Quiet text | muted gray-blue | `#7B879D` |
| Border | pale blue-gray | `#D6DCE9` |
| Context track | soft map-line blue | `#C5CEE0` |
| Focus blue | calm medium blue | `#6687C9` |
| Focus violet | muted gray-violet | `#8477BC` |
| Confirmed | muted green-blue | `#4E8978` |
| Warning | soft ochre | `#A47F45` |
| Blocked | muted brick | `#A96568` |

### Atmospheric construction

The canvas may use:

- broad pale-blue or pale-violet fields at low opacity;
- fine map or star-chart lines;
- small static anchor points;
- slight tonal variation between context regions;
- a restrained paper-like softness.

The reading surfaces must remain clean. Texture belongs to the canvas, not behind dense text.

### Avoid

- pure-white dashboard appearance;
- stacks of identical white cards;
- heavy gray dividers;
- high-saturation gradients;
- uniform pill-shaped components;
- translucent text surfaces with weak contrast;
- decorative map lines crossing content;
- excessive corner rounding.

### Light-mode acceptance checks

- The interface retains depth without relying on heavy shadows.
- The canvas feels distinct from reading surfaces.
- Fine tracks do not reduce text clarity.
- Current focus remains visible in bright environments.
- Semantic states match Dark Mode meaning even when their colors differ.

## 5. Layout System

The layout is a **Context Space**, not a vertical stack of equally weighted cards.

### Spatial layers

```text
Project Anchor
      ↓
Active Context Path
   ↙                 ↘
Memory Detail     Project Journey
   ↘                 ↙
Action Navigator
```

The Project Anchor establishes orientation. The active context path shows the most relevant relationship. Detail regions provide explanation without competing with the central project structure.

### Layout priorities

1. Project identity and current stage;
2. active problem, decision, or milestone;
3. next meaningful action;
4. supporting Memory and provenance;
5. historical or secondary context.

The layout should progressively disclose detail. It should not render the complete history at equal visual weight.

### Node

A Node represents one context entity:

- Project;
- Problem;
- Memory;
- Decision;
- Evidence;
- Milestone;
- Task;
- Progress.

Node anatomy:

- type label;
- concise title or content;
- semantic state;
- optional source indicator;
- optional relationship count;
- focus or selection affordance.

Node size reflects content role and hierarchy, not importance invented by the model.

Recommended hierarchy:

- Project node: largest anchor;
- active milestone or decision: medium emphasis;
- Memory, task, evidence, and progress nodes: compact;
- unresolved gaps: visible but low-emphasis.

### Connection

A Connection represents a real relationship.

Examples:

```text
Project ──defines──→ Problem
Evidence ──supports──→ Decision
Decision ──changes──→ Milestone
Milestone ──contains──→ Task
Progress ──confirms──→ Task
```

Connection language:

- solid line: confirmed relationship;
- dashed line: proposed or assumed relationship;
- interrupted line: blocked or unresolved relationship;
- emphasized line: currently focused path;
- arrow or terminal marker: direction when direction matters.

Connections should have labels in detail views or accessible descriptions. Line style must not be the only meaning carrier.

### Orbit

An Orbit represents a progression path, most commonly:

```text
Idea → Explore → Design → Validate → Execute
```

Orbit rules:

- completed stages use quiet, continuous tracks;
- the current stage uses a soft halo and clear label;
- the next stage is visible but not presented as achieved;
- future stages remain low-emphasis;
- revisited stages show chronology rather than overwriting history;
- project stage must come from confirmed context.

Orbit is a navigational metaphor. It does not require a literal circle.

### Grid and spacing

Recommended spacing scale:

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```

Use:

- `4–8` for internal label and metadata relationships;
- `12–16` for compact node content;
- `24–32` between related regions;
- `48–64` for major spatial separation.

Recommended corner hierarchy:

- project-space container: large, restrained radius;
- reading surface: medium radius;
- node: small-to-medium radius based on type;
- status marker: compact radius;
- connection and orbit: no container radius.

Avoid applying the same radius to every component.

### Responsive behavior

Desktop:

- preserve a spatial project anchor;
- allow the active context path and Journey to coexist;
- keep Action Navigator easy to locate;
- show detail in a side or adjacent reading region.

Narrow screen:

- convert the context map into a semantic vertical path or outline;
- preserve node order and relationship labels;
- place Action Navigator after current context;
- keep Journey as a vertical track;
- do not shrink a desktop graph until labels become unreadable;
- do not require horizontal panning for essential information.

## 6. Component Language

### Project Node

Purpose:

- anchor the space;
- show project name, goal, current stage, and core direction.

States:

- **Active:** current project with clear stage and soft focus halo;
- **Completed:** project or phase outcome confirmed, using stable low-motion styling;
- **Exploring:** important information remains unresolved, using a labelled dashed context edge.

Rules:

- do not represent `Exploring` as failure;
- current stage must be textual;
- the Project Node should not repeat the full Project Overview;
- status changes require data from Context Experience, not visual inference.

### Memory Node

Purpose:

- make retained context visible and explainable.

Minimum visible information:

- content summary;
- source;
- recorded or updated time;
- confidence or validation state.

Expanded information may include:

- category;
- related stage;
- linked decision, milestone, or task;
- change history.

Visual distinctions:

- user-confirmed Memory;
- execution-confirmed progress;
- system-verified context;
- assumption;
- unresolved or rejected candidate.

Memory Nodes must not use a brain icon. Their identity comes from provenance and relationships.

### Journey Timeline

Purpose:

- show visible project growth;
- explain the current stage and next target.

Required states:

- completed;
- current;
- next;
- not started;
- revisited.

Each stage should expose:

- stage name;
- stage goal;
- entry or completion evidence when available;
- important milestone;
- unresolved condition for moving forward.

The timeline may be orbital on wide screens and vertical on narrow screens. Its semantic order remains constant.

### Action Navigator

Purpose:

- make the next relevant direction obvious without becoming a Todo panel.

Minimum content:

- current objective;
- proposed action;
- why it matters;
- completion criteria;
- linked milestone;
- status: clarify, decide, execute, or review.

Visual rules:

- use one primary direction at a time;
- subordinate actions remain secondary;
- completion criteria must be readable without opening another panel;
- proposals must not resemble accepted or completed tasks;
- the primary control should represent user choice, not automatic execution.

### Context Detail Surface

Purpose:

- provide readable information after a node is focused.

It may show:

- full content;
- source and timestamp;
- confidence or state;
- connected nodes;
- stage relationship;
- unresolved information.

This surface is a reading region, not another visual node. It should prioritize text clarity over atmosphere.

### Status markers

Status markers combine:

- concise text;
- shape or icon;
- color;
- optional line style.

Examples:

| State | Suggested marker |
| --- | --- |
| Confirmed | filled small point plus label |
| Proposed | outlined point plus label |
| Assumption | dashed outline plus label |
| Current | halo plus solid center |
| Completed | connected check marker plus label |
| Blocked | interrupted track plus reason |
| Unknown | open point plus “无法判断” |

## 7. Typography

Typography should be clear, technical enough for structured information, and warm enough for sustained project work.

### Typeface direction

Initial implementation should prefer a high-quality system sans-serif stack and avoid adding a font dependency.

Desired qualities:

- open counters;
- clear Chinese and Latin pairing;
- strong legibility at small metadata sizes;
- neutral numerals;
- restrained personality.

Avoid:

- game-interface typefaces;
- condensed display fonts for body content;
- monospaced text as the primary brand language;
- excessive uppercase;
- futuristic letter spacing;
- decorative headings that compete with context.

### Type hierarchy

| Role | Intended use | Weight |
| --- | --- | --- |
| Display | Project name or primary space title | 600–700 |
| Section title | Overview, Journey, Memory, Action | 600 |
| Node title | Context item identity | 550–650 |
| Body | Explanation and project content | 400–500 |
| Metadata | Source, time, confidence, relationship | 400–500 |
| Label | Node type and semantic state | 550–650 |

Recommended size relationships:

- display: `32–48`;
- section title: `20–28`;
- node title: `15–18`;
- body: `15–17`;
- metadata and label: `12–14`.

Exact values depend on viewport and language. Chinese body text should generally use a line height between `1.6` and `1.8`.

### Text behavior

- Prefer sentence case.
- Use short labels and full explanatory sentences.
- Do not truncate source, confidence, or completion criteria when they affect a decision.
- Long Memory content should wrap in a stable reading surface.
- Use monospace only for IDs, raw data, or developer information.
- Unknown values display “无法判断”.

## 8. Motion Language

Motion is slow, light, and natural.

It should explain:

- focus;
- connection;
- stage change;
- progressive disclosure;
- movement from context to action.

It should not demonstrate that the interface is “alive”.

### Motion categories

#### Functional transition

Used for:

- opening node details;
- changing focus;
- revealing a connected path;
- expanding Memory provenance;
- moving between Project Journey stages.

Direction:

- short;
- predictable;
- directly related to user action.

Baseline duration:

- small state change: `120–200 ms`;
- panel or context reveal: `200–360 ms`;
- spatial route transition: `320–520 ms`.

#### Ambient motion

Optional examples:

- slow node breathing;
- quiet orbit flow;
- sparse star-point drift.

Rules:

- ambient motion is never required to understand state;
- use at most one dominant ambient behavior in a view;
- amplitude and opacity change remain minimal;
- pause or reduce motion when the user is reading dense content;
- avoid motion immediately behind text.

Suggested periods:

- node breathing: `5–8 s`;
- orbit flow: `10–18 s`;
- star drift: `24–40 s`.

#### State confirmation

Used when:

- a confirmed stage changes;
- a milestone becomes complete;
- a context path becomes active.

The motion should be a single restrained transition, not a celebration effect.

### Easing

Preferred:

- gentle ease-out for reveals;
- symmetric ease-in-out for ambient motion;
- no spring overshoot for core project state;
- no sharp linear flashing.

### Avoid

- rapid blinking;
- constant pulsing on multiple nodes;
- particle bursts;
- large parallax;
- rotating decorative rings;
- motion tied to model processing without a clear status label;
- animations that imply a task has completed before confirmation.

### Reduced motion

When reduced motion is requested:

- remove ambient motion;
- replace spatial travel with opacity or immediate state changes;
- preserve focus, selection, and progress using static markers;
- keep loading and status information understandable without animation.

## 9. Relationship With Experience Layer

The Visual System renders the stable read-only output of Context Experience:

```text
Project Atlas ─┐
               │
Memory ────────┼──→ Context Experience ──→ Visual System
               │
Execution ─────┘
```

Mapping:

| Experience output | Visual responsibility |
| --- | --- |
| `projectOverview` | Project Anchor and overview hierarchy |
| `projectJourney` | Orbit or Journey Timeline |
| `actionNavigator` | Action Navigator |
| future context nodes | Context Map nodes |
| future relationships | Named connections |
| future Memory projection | Memory Nodes and provenance detail |

The Visual System may:

- choose layout;
- control emphasis;
- reveal detail progressively;
- represent semantic states;
- adapt spatial views to smaller screens;
- switch theme tokens.

The Visual System must not:

- infer new project context;
- change a stage;
- approve a decision;
- mark work complete;
- write Memory;
- generate tasks;
- hide uncertainty that affects a decision;
- turn decorative proximity into a business relationship.

Visual state must come from Experience data. If data is absent, the interface shows an unknown or unavailable state rather than inventing one.

## 10. Future Expansion

### Context Map

Future Context Experience may provide typed nodes and relationships. The Visual System should support increasing graph depth without assuming a particular graph library.

Requirements:

- semantic list fallback;
- focus on one context path;
- filtering by node type and state;
- readable relationship labels;
- stable keyboard navigation.

### DataHub Graph

DataHub may later supply persistent graph relationships among projects, evidence, decisions, milestones, tasks, and results.

The visual language should remain compatible, but must not depend on DataHub-specific identifiers or storage behavior.

### Multi Atlas

Future Atlas capabilities may contribute different types of context.

The visual system should distinguish contribution type and source without assigning each Atlas a loud brand color. Project context remains the primary structure.

### Collaborative Space

Future collaboration may add:

- contributor attribution;
- review state;
- shared decisions;
- conflicting proposals;
- permission-aware context.

Collaboration requires a separate interaction and accessibility specification. Presence indicators must not overwhelm the Project Space.

### Visual evolution

Future implementation may introduce:

- theme switching;
- saved context-map layouts;
- project-space zoom levels;
- guided project walkthroughs;
- context comparison;
- exportable project maps.

Each extension must preserve semantic clarity, calm atmosphere, and user control.

## Design Principles

1. **Context over decoration**
   Visual elements must explain project context before creating atmosphere.

2. **Connection over complexity**
   Show the smallest meaningful relationship structure rather than the largest possible graph.

3. **Calm intelligence**
   Communicate depth through clarity, restraint, and continuity instead of spectacle.

4. **Human-centered AI**
   Nexus presents understanding and direction; the user retains authority over decisions and progress.

5. **Visible growth**
   Project stages, milestones, decisions, and confirmed progress should form an understandable journey.

6. **Semantic consistency across themes**
   静谧深空 and 晨雾星图 share the same hierarchy, states, and interaction meaning.

7. **Evidence before emphasis**
   Visual prominence must not imply certainty unsupported by source or confirmation.

8. **Accessible space**
   Every spatial relationship needs readable text, keyboard access, sufficient contrast, and a narrow-screen alternative.

9. **Motion supports meaning**
   Animation clarifies focus and change; it does not perform intelligence.

10. **Project remains the center**
    The experience is organized around the evolving project, not the model, the prompt, or the latest response.
