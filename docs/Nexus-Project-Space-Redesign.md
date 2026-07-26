# Nexus Project Space Redesign

> Status: Design only. This document defines the Nexus v0.7 Project Space workspace model. It does not implement frontend changes, modify Experience data, or change Memory, Execution, Atlas, Context Graph, or Star Map behavior.

## 1. Design Goal

Project Space is not a project showcase page. It is the primary workspace in which a user understands, explores, and advances one project.

The current product already exposes the required views:

- Project Overview;
- Project Journey;
- Context Map;
- Project Universe / Star Map;
- Action Navigator.

The problem is composition. Presenting every view in one vertical document makes each capability look like a report section. Users must scroll to reconstruct relationships between the current stage, the active context, and the next action.

The redesign changes the organizing model from **Project Showcase** to **Project Workspace**.

The core rule is:

> Space over Page.

The workspace should let the user answer three questions without scrolling through the entire product:

1. Where is this project now?
2. What context explains its current direction?
3. What needs attention next?

The redesign is a presentation and navigation change. It does not introduce new project-management behavior, persistence, reasoning, or data ownership.

### Success conditions

The workspace is successful when:

- one active project remains the stable spatial anchor;
- one primary view is visible at a time;
- the user can switch views without losing project orientation;
- details appear on demand instead of expanding the main canvas;
- the current stage and next action remain reachable from every view;
- desktop use does not require continuous page scrolling;
- mobile use provides equivalent navigation rather than a compressed desktop canvas.

## 2. Overall Layout

### Workspace shell

The desktop product uses an application workspace structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Nexus Header · Project identity · Stage · Theme / Status    │
├──────────────┬───────────────────────────────┬───────────────┤
│              │                               │               │
│ Sidebar      │ Main Space                    │ Detail Panel  │
│              │                               │ (conditional) │
│ Overview     │ Active workspace view         │               │
│ Journey      │                               │ Selected node │
│ Context      │                               │ Source        │
│ Universe     │                               │ Relations     │
│ Action       │                               │ Status        │
│              │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│ Optional contextual status line; not a persistent footer    │
└──────────────────────────────────────────────────────────────┘
```

### Recommended regions

| Region | Desktop behavior | Purpose |
| --- | --- | --- |
| Header | 56–64 px high, visually light | Project identity, current stage, theme, and global workspace state |
| Sidebar | 208–232 px wide | Stable navigation across five project views |
| Main Space | Flexible width, minimum useful canvas 640 px | Displays one active view |
| Detail Panel | 320–380 px, conditional | Shows selected context without replacing the active view |
| Status line | Optional and contextual | Loading, fallback, local-session, or read-only state |

The Main Space should occupy the remaining viewport height below the header. Individual views may scroll internally when their content exceeds the available height, but the application shell remains stable.

### Why a spatial layout

- The project identity remains visible while views change.
- Navigation becomes selection rather than page traversal.
- Context details can appear beside the map that produced them.
- Journey and Action remain separate working modes instead of report subsections.
- Star Map receives a bounded canvas and no longer competes with long text above or below it.
- The layout supports progressive disclosure without hiding the existence of other capabilities.

### Layout constraints

- Do not reproduce the current long page inside Main Space.
- Do not render five dashboard cards at once.
- Do not use the sidebar as a project database or settings menu.
- Do not require a Detail Panel when nothing is selected.
- Do not let the header consume significant vertical space.
- Keep project content inside one workspace shell; the entry experience remains outside it.

## 3. Navigation System

The sidebar defines five sibling views:

1. Overview
2. Journey
3. Context
4. Universe
5. Action

These are different projections of the same Experience output. They are not separate project states.

### Navigation item model

Each item contains:

- a short label;
- an optional restrained symbol;
- an active state;
- an optional small status indicator when action is required;
- an accessible name.

The sidebar should not show counts by default. Counts are useful only when they communicate attention, such as unresolved context or blocked actions.

### Tab switching logic

- Exactly one view is active.
- Switching tabs changes presentation state only.
- Project data is not re-requested solely because the user changed tabs.
- The current tab may be preserved in frontend session state.
- Opening a selected Context or Universe node may open the Detail Panel while keeping the same active tab.
- Closing the Detail Panel restores the full Main Space width without changing the active tab.
- A link from one view may focus a related item in another view, but the transition must be explicit.

Example:

```text
Journey: current stage has unresolved problem
        ↓ user selects “view context”
Context tab opens with that Problem node focused
```

### Default view

- New project: Overview.
- Restored project: last active workspace view when available; otherwise Overview.
- Project with a blocking clarification or decision: Overview remains default, with a visible route to Action.
- Deep links and persistent view URLs are future concerns, not v0.7 requirements.

### Keyboard behavior

- Sidebar follows the ARIA tab pattern.
- Arrow keys move between tab labels.
- Enter or Space activates a view.
- Focus moves to the active view heading after activation when the change was keyboard initiated.
- Escape closes the Detail Panel and returns focus to the originating node.

## 4. Project Overview Space

Overview provides immediate orientation. It is not a condensed version of every other view.

### Default content

- project name;
- current stage;
- one-sentence project summary;
- core goal;
- latest meaningful progress;
- one unresolved signal when it materially affects the next step.

### Content hierarchy

```text
Project name + stage
        ↓
One-sentence summary
        ↓
Core goal
        ↓
Latest progress / unresolved signal
        ↓
Route to current action
```

### Information rules

- Project name and current stage receive the highest visual priority.
- Summary is limited to one or two short lines.
- Goal should be one concise statement, not the complete Blueprint.
- Known, assumed, and unresolved information remain visibly distinct.
- Risks, full Memory history, raw JSON, and long Blueprint fields do not appear by default.
- “无法判断” remains visible when a required value is unknown.

### Interaction

Overview may provide contextual links to:

- the current Journey stage;
- a key Context node;
- the active Action;
- the Project Core in Universe.

These links navigate to existing views. They do not duplicate those views inside Overview.

## 5. Journey Space

Journey presents project movement as a traceable path rather than a status list.

### Stage model

```text
Idea → Explore → Design → Validate → Execute
```

Each stage may be:

- completed;
- current;
- next;
- not started;
- revisited.

### Desktop expression

Use a horizontal or gently curved project track inside a bounded viewport. Each stage is a node on the track.

Default stage node content:

- stage name;
- state marker;
- short stage objective.

Selected stage detail:

- why the project entered this stage;
- meaningful decisions;
- completed milestones;
- unresolved evidence or risk;
- condition for advancing.

### Behavior

- Current stage is focused initially.
- Completed and future stages remain visible at lower visual weight.
- Selecting a stage updates the Detail Panel or an inline stage inspector.
- Revisited stages show a return path and reason; they are not displayed as an error.
- A generated execution plan cannot visually mark a stage completed.
- Stage state must come from existing Experience / confirmed progress data.

### Density rule

The trajectory is primary. Historical details are secondary and appear only after stage selection.

## 6. Context Space

Context Space explains why the project has its current shape.

It consumes the existing Context Graph and remains read-only.

### Default view

Do not render every node label and every relationship at equal strength.

Show first:

- Project node;
- active Problem;
- current or latest Decision;
- active Milestone;
- one relevant Task;
- latest confirmed Progress;
- semantic connections among those items.

Other supported nodes remain discoverable through filtering, an outline, or “show related context”.

### Node behavior

Default node:

- type marker;
- short title;
- minimal state indication when relevant.

Selected node opens the Detail Panel with:

- type;
- complete content;
- source;
- status or confidence;
- incoming and outgoing relationships;
- related stage, milestone, or action when available.

### Relationship behavior

- Connections retain semantic labels such as `addresses`, `supports`, `contains`, and `updates`.
- Unrelated connections become quieter when a node is selected.
- Selection must not rearrange the whole map unexpectedly.
- Missing evidence may appear as a bounded unresolved state only when supported by Experience data.
- Visual proximity must not imply a relationship absent from Context Graph.

### Alternative representation

Context Space requires a semantic outline or relationship list for:

- narrow screens;
- keyboard navigation;
- assistive technology;
- users who prefer direct reading over spatial exploration.

## 7. Universe Space (Star Map)

Universe is the spatial expression of the project, not a second Context Map.

Its purpose is to establish a stable Project Core and show how understanding, execution, and growth organize around it.

### Default state

Show:

- Project Core at the center;
- Understanding Orbit;
- Execution Orbit;
- Growth Orbit;
- only priority nodes on each orbit;
- low-contrast semantic connections.

Hide by default:

- long node titles;
- paragraph content;
- detailed status text;
- full source strings;
- all historical nodes;
- relationship descriptions unrelated to current focus.

The default canvas should be understandable before any interaction.

### Spatial hierarchy

| Layer | Node types | Meaning |
| --- | --- | --- |
| Project Core | Project | Stable project identity |
| Understanding Orbit | Problem, Decision | Why the project exists and what direction was chosen |
| Execution Orbit | Milestone, Task | How the project is moving forward |
| Growth Orbit | Progress | Confirmed change over time |

Orbit position communicates grouping only. It must not imply confidence, priority, or chronology unless an explicit label says so.

### Focus interaction

Selecting a node:

1. keeps Project Core visible;
2. emphasizes the selected node;
3. gently emphasizes directly related nodes and edges;
4. quiets unrelated context without removing it;
5. opens the Detail Panel;
6. preserves the existing layout.

The Detail Panel contains:

- node type;
- full title and content;
- source;
- state;
- associated project stage;
- incoming and outgoing semantic relationships;
- link to the corresponding Context or Action view when available.

### Project Universe visual objective

Universe should feel like observing one coherent project system.

It should not feel like:

- a flowchart;
- an editable graph tool;
- a system-monitoring network;
- a collection of glowing buttons;
- a decorative background.

### Control boundary

First implementation controls may include:

- reset focus;
- semantic outline toggle;
- bounded zoom when required for accessibility.

Do not add drag editing, freeform node creation, physics simulation, or automatic graph intelligence.

## 8. Action Space

Action Space is the workspace's point of forward movement.

It should answer:

1. What is the current objective?
2. What should happen next?
3. Why is this the right action now?
4. How will completion be judged?
5. What blocks progress?

### Default content

- action type: clarify, decide, execute, or review;
- current objective;
- one primary next action;
- rationale;
- completion criteria;
- related milestone;
- dependency or blocker when known;
- proposal / confirmed-task state.

### Interaction hierarchy

- One primary action receives emphasis.
- Supporting context remains concise.
- Related Context, Journey, or Universe nodes are linked rather than duplicated.
- The interface does not claim an action was performed.
- Completion controls are outside this read-only redesign unless a validated execution command already exists.

### Empty and blocked states

- No reliable action: state what information is missing.
- Clarification required: link to the existing clarification workflow.
- Blocked action: show the blocker and the evidence or decision needed.
- Completed action: show the next confirmed objective rather than keeping a completed task as primary.

## 9. Header Design

The header provides stable orientation without becoming a landing-page hero.

### Content

- Nexus identity;
- concise project name;
- current stage;
- local / fallback / analysis status when relevant;
- theme control;
- route back to Entry or project selection when that capability exists.

### Behavior

- Recommended height: 56–64 px.
- Use a translucent or solid quiet surface with a restrained divider.
- Header may remain sticky within the application shell.
- It must not cover Main Space or consume a large first viewport.
- Technical model information remains secondary and appears only when needed for transparency.
- The project name should truncate safely at narrow widths.

### Avoid

- full-width marketing hero content;
- oversized product slogans;
- persistent promotional copy;
- crowded utility controls;
- decorative animation behind navigation.

## 10. Responsive Design

Responsive behavior changes navigation and information disclosure. It does not merely shrink the desktop workspace.

### Desktop: 1024 px and above

- Header + Sidebar + Main Space.
- Conditional right Detail Panel.
- Full Universe canvas.
- Stable workspace height.

### Compact desktop / tablet: 768–1023 px

- Sidebar collapses to a narrow labelled rail or controlled drawer.
- Detail Panel becomes an overlay sheet or replaces part of Main Space temporarily.
- Main view retains one active panel.
- Universe keeps deterministic structure with fewer default labels.

### Mobile: below 768 px

Use a bottom navigation bar with five short labels:

- 概览;
- 旅程;
- 关系;
- 星图;
- 行动.

Mobile behavior:

- Header shows project identity and one utility control row.
- Main Space occupies the area between header and bottom navigation.
- Detail Panel becomes a bottom sheet or full-screen detail view.
- Context defaults to semantic relationship lists.
- Universe defaults to the semantic orbit outline; a spatial canvas is optional when the viewport safely supports it.
- Journey becomes a vertical trace.
- Action keeps the primary objective and completion criteria together.
- Bottom navigation respects safe-area insets and visible keyboard states.

### Responsive equivalence

Mobile must preserve:

- all five views;
- node details and source;
- relationship meaning;
- current stage;
- current action;
- keyboard and assistive-technology access where applicable.

## 11. Visual Language

The redesign inherits the existing themes:

- **静谧深空** for Dark Mode;
- **晨雾星图** for Light Mode.

### Shared direction

Quality comes from:

- deliberate empty space;
- stable hierarchy;
- fine semantic lines;
- restrained depth;
- a small number of meaningful focus states;
- consistent project orientation.

### Surface hierarchy

Use no more than three primary surface levels:

1. workspace canvas;
2. active view surface;
3. transient detail surface.

Avoid card nesting. Sections inside an active view should prefer spacing, dividers, labels, and typographic hierarchy.

### State expression

Both themes must distinguish:

- active navigation;
- selected node;
- related context;
- confirmed progress;
- assumption;
- unresolved information;
- blocked action.

Color is not sufficient alone. State labels, line styles, shape, or text must provide equivalent meaning.

### Avoid

- neon AI gradients;
- science-fiction HUD frames;
- uniform pill controls;
- excessive rounded cards;
- dense dashboard grids;
- decorative connections;
- constant background motion.

## 12. Information Density Principles

Project Space uses progressive disclosure.

### Always visible

- project identity;
- current stage;
- active navigation item;
- active view title;
- primary content for that view;
- route to the current action;
- local, loading, failure, or fallback status when relevant.

### Visible in the active view

| View | Default information |
| --- | --- |
| Overview | Name, stage, summary, goal, latest progress |
| Journey | Five-stage trajectory and current stage |
| Context | Active semantic path and priority nodes |
| Universe | Project Core, three orbits, priority nodes |
| Action | Objective, next action, rationale, criteria |

### Visible after selection

- full node content;
- source and confidence;
- complete relationship list;
- stage rationale;
- milestone details;
- task criteria;
- historical progress;
- unresolved evidence details.

### Hidden from primary workspace

- raw JSON;
- complete model responses;
- duplicate Blueprint content;
- technical stack traces;
- all historical records at once;
- internal identifiers unless needed for debugging;
- model routing details except when explaining fallback status.

Debug information may remain available in a separate collapsed developer area outside the primary workspace hierarchy.

### Density test

A view fails the density test when:

- the user must read several paragraphs before identifying its primary object;
- every item has equal visual weight;
- the Detail Panel repeats the entire active view;
- switching views is slower than scrolling the old page;
- mobile requires horizontal scrolling to understand core information.

## 13. Technical Boundary

Project Space consumes Experience Layer projections only.

```text
Project Atlas Output ─┐
Memory Context ───────┼─→ Experience Layer ─→ Project Space Workspace
Execution State ─────┘
```

### Presentation state owned by Project Space

Project Space may own:

- active tab;
- selected node;
- open / closed Detail Panel;
- semantic outline visibility;
- bounded viewport state;
- theme;
- responsive navigation state.

This state is frontend-only and must not be interpreted as project truth.

### Project Space must not

- call Memory Store directly;
- create or update Memory;
- evaluate project stage;
- create milestones or tasks;
- change Context Graph nodes or edges;
- infer relationships from visual position;
- modify Atlas output;
- mark work completed;
- introduce persistence beyond approved frontend presentation state.

### Data contract

The redesign should preserve existing Experience top-level projections:

- `projectOverview`;
- `projectJourney`;
- `actionNavigator`;
- `contextMap`.

Star Map continues to consume `contextMap`. The redesign should adapt presentation around these structures before requesting a data-model change.

### Failure isolation

- Empty Context Map does not prevent Overview, Journey, or Action from rendering.
- Star Map rendering failure falls back to the semantic outline.
- Missing action data shows an explicit unknown state.
- A failed later request preserves the last confirmed workspace and pending answers.
- Fallback Mode remains visible without replacing the workspace with an error page.

## 14. Future Evolution

Possible future extensions:

- multi-project navigation;
- account-backed persistent workspaces;
- cross-device continuation;
- team membership and permissions;
- shared context review;
- project activity history;
- user-controlled Memory correction;
- DataHub Context Graph;
- multi-Atlas contribution views.

These capabilities are outside v0.7 redesign.

The workspace shell should leave room for future project switching and collaboration controls, but it must not display inactive placeholders or imply those capabilities currently exist.

## 15. Design Principles

1. **Space over Page**
   Keep one stable project workspace instead of a sequence of stacked report sections.

2. **Context over Content**
   Prioritize relationships, source, stage, and relevance over raw output volume.

3. **Explore over Scroll**
   Use explicit views and focus transitions rather than continuous page traversal.

4. **Calm Intelligence**
   Communicate capability through clarity, restraint, and continuity.

5. **Visible Growth**
   Keep stage and confirmed progress traceable across views.

6. **Progressive Disclosure**
   Show essential orientation first and reveal detail through selection.

7. **One Project Anchor**
   Project identity remains stable while the user changes views.

8. **Human Decision First**
   Exploration does not silently change project state.

9. **Semantic Equivalence**
   Mobile, keyboard, and assistive representations preserve the meaning of spatial views.

10. **Architecture Respect**
    Project Space presents Experience output without taking ownership of reasoning, Memory, or Execution.

### Implementation readiness checklist

The redesign is ready for implementation planning when:

- the workspace shell has defined Header, navigation, Main Space, and conditional Detail Panel regions;
- all five views have explicit default and selected states;
- tab switching changes presentation state only;
- Overview remains concise and Action remains reachable;
- Context and Universe have distinct purposes;
- the Universe default state remains legible without long labels;
- desktop avoids page-level scrolling for normal operation;
- mobile provides five-view navigation and semantic fallbacks;
- empty, loading, failure, and fallback states preserve workspace orientation;
- the design requires no changes to Memory, Execution, Atlas, or Context Graph.
