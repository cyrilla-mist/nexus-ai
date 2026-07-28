# Nexus Visual Identity Redesign

> Status: Design only. This document redefines the Nexus AI visual identity. It does not implement HTML, CSS, JavaScript, animation, rendering, or product logic.

## 1. Nexus Brand Identity

Nexus AI is built around four brand concepts:

- **Connection:** reveal meaningful relationships between ideas, decisions, evidence, milestones, tasks, and progress;
- **Context:** preserve why information matters, where it came from, and how it affects the project;
- **Growth:** make project evolution visible rather than presenting each response as an isolated result;
- **Exploration:** let the user move through a project space, focus on relationships, and discover the next useful direction.

These concepts define the visual identity. Space, nodes, paths, and orbits are useful only when they express real project structure.

### Brand expression

| Brand concept | Visual expression | Product meaning |
| --- | --- | --- |
| Connection | Named path between two context objects | A traceable semantic relationship |
| Context | Node type, source, state, and related items | Information with an explainable role |
| Growth | Journey stages, progress marks, and orbit changes | Confirmed project development |
| Exploration | Focus states, workspace navigation, and progressive disclosure | User-controlled movement through the project |

### Identity rules

- The project is always the primary anchor.
- Relationships are labelled or otherwise explainable.
- Generated assumptions never receive the same visual treatment as confirmed facts.
- Atmosphere remains secondary to orientation and readability.
- Decorative space imagery must not be confused with project data.
- AI capability is communicated through organization and continuity, not visual spectacle.

### Brand signature

The recognizable Nexus composition is:

```text
Project Core
    ↓
Context Orbits
    ↓
Growth Path
    ↓
Next Direction
```

The combination of a stable Project Core, semantic orbits, restrained spatial depth, and a visible next direction should distinguish Nexus even when the logo is absent.

## 2. Product Position

Nexus is an **AI Project Intelligence Space**.

It is not positioned as:

- a general chatbot;
- a one-time content generator;
- a generic project dashboard;
- a task-management application;
- a decorative knowledge graph.

Its visual system must support a continuous product loop:

```text
Understand the project
        ↓
Connect its context
        ↓
Make growth visible
        ↓
Navigate the next action
```

### Interface consequence

The primary product surface is the Project Space, not a message thread. Conversation and model status may support the experience, but they must not dominate the page hierarchy.

The user should be able to answer four questions quickly:

1. What project am I looking at?
2. What does Nexus currently understand?
3. How did the project reach its current state?
4. What is the next meaningful direction?

## 3. Difference from Verity

Nexus and Verity must not share the same visual metaphor, hierarchy, or emotional tone merely because both are AI products.

| Dimension | Nexus | Verity |
| --- | --- | --- |
| Product role | Project intelligence space | Evaluation and judgment system |
| Core metaphor | Space, orbit, path, growth | Standard, scale, evidence, verdict |
| Primary user action | Explore and advance | Submit, compare, evaluate |
| Information structure | Connected context | Criteria and findings |
| Visual center | Project Core | Evaluation result or standard |
| Motion direction | Slow spatial focus | Controlled state confirmation |
| Emotional tone | Open, calm, exploratory | Precise, disciplined, authoritative |
| Accent behavior | Distributed across semantic paths | Concentrated on result and status |
| Shape language | Nodes, routes, open fields | Frames, measures, structured sections |

### Nexus-specific cues

Nexus should use:

- an open spatial canvas;
- a stable Project Core;
- semantic paths and orbits;
- visible project stages;
- gradual focus and progressive disclosure;
- language centered on direction, context, and growth.

Nexus should avoid Verity-like cues:

- verdict-first composition;
- scoring as the primary visual anchor;
- rigid evaluation grids;
- formal seal, badge, or certification metaphors;
- red/amber/green judgment dominance;
- authoritative language that closes exploration prematurely.

A shared design-system foundation may exist at implementation level, but the visible product grammar must remain distinct.

## 4. Color System

The color system uses semantic roles rather than isolated brand colors. Both themes must preserve the same hierarchy and state meaning.

### Shared semantic roles

| Token role | Purpose |
| --- | --- |
| `canvas` | Full Project Space background |
| `field` | Spatial grouping region |
| `surface` | Stable reading or control surface |
| `surface-raised` | Detail panel or focused region |
| `text-primary` | Project identity and essential content |
| `text-secondary` | Explanation and supporting content |
| `text-quiet` | Metadata and low-priority context |
| `line` | General border or map line |
| `orbit` | Context-level track |
| `focus` | Current selection and active navigation |
| `connection` | Semantic relationship path |
| `growth` | Confirmed progress |
| `proposed` | Unconfirmed suggestion |
| `blocked` | Explicit blocked state |

Color must never be the only carrier of status. Labels, line patterns, icons, or shapes must preserve meaning.

### Dark Mode: 静谧深空

The Dark theme resembles observing a quiet project constellation, not operating a science-fiction console.

| Role | Direction | Reference |
| --- | --- | --- |
| Canvas | blue-black with low chroma | `#080D18` |
| Field | deep navy | `#0D1423` |
| Surface | muted indigo-charcoal | `#131C2D` |
| Raised surface | restrained blue-gray | `#19243A` |
| Primary text | cool off-white | `#EDF1F8` |
| Secondary text | muted blue-gray | `#A8B3C7` |
| Quiet text | low-emphasis slate | `#78869E` |
| Line | dark map blue | `#273650` |
| Orbit | subdued indigo | `#344866` |
| Focus | quiet celestial blue | `#7E9FD9` |
| Connection | desaturated blue-violet | `#667DA8` |
| Growth | muted teal | `#629889` |
| Proposed | muted violet | `#8B80B4` |
| Blocked | restrained clay red | `#AF7479` |

Construction rules:

- Use luminance and spacing before shadow.
- Reserve the softest halo for the Project Core and current focus.
- Keep most connections below node contrast.
- Use sparse, static atmospheric points only at canvas level.
- Keep reading surfaces stable and free from moving texture.
- Avoid high-saturation purple-blue gradients, neon outlines, HUD frames, and continuous glow.

### Light Mode: 晨雾星图

The Light theme resembles a project map opened in early morning mist, not a white administration dashboard.

| Role | Direction | Reference |
| --- | --- | --- |
| Canvas | mist white with cool undertone | `#F3F5F8` |
| Field | pale gray-violet | `#EBEEF5` |
| Surface | soft paper white | `#FAFAFC` |
| Raised surface | pale blue-white | `#F0F3F9` |
| Primary text | deep blue-charcoal | `#172034` |
| Secondary text | slate blue-gray | `#5C6A82` |
| Quiet text | muted gray-blue | `#7B879B` |
| Line | pale map blue | `#D3D9E5` |
| Orbit | cool route gray | `#C1CADB` |
| Focus | calm atlas blue | `#627FB5` |
| Connection | muted indigo-gray | `#8292B0` |
| Growth | muted green-blue | `#4F8477` |
| Proposed | gray-violet | `#8378A8` |
| Blocked | muted brick | `#A6666B` |

Construction rules:

- Separate canvas, field, and reading surface through tone rather than heavy shadow.
- Use broad low-opacity mist fields and fine map lines.
- Keep paths behind content and prevent them from crossing dense text.
- Use slight paper warmth to avoid a clinical white-dashboard appearance.
- Avoid stacks of identical white cards, uniform pills, and heavy gray dividers.

### Theme equivalence

Both themes must preserve:

- identical information hierarchy;
- equivalent active, selected, related, confirmed, proposed, unknown, and blocked states;
- accessible text and control contrast;
- a semantic list fallback that remains understandable without atmospheric styling.

## 5. Typography

Typography establishes product hierarchy before color or effects.

The first implementation should continue using a high-quality system sans-serif stack. No font dependency is required for the identity redesign.

### Hero

Purpose: establish Nexus identity and the current entry into Project Space.

- Product name receives the highest typographic priority.
- Recommended desktop size: `48–64 px`.
- Recommended mobile size: `36–46 px`.
- Weight: `650–750`.
- Line height: `1.02–1.12`.
- Letter spacing remains neutral; avoid futuristic tracking.
- The Hero should contain one visual statement, not several competing headlines.

### Heading

Purpose: orient the user within the Workspace.

- Workspace title: `26–36 px`, weight `600–700`.
- Space title: `20–28 px`, weight `600–650`.
- Section heading: `16–20 px`, weight `600`.
- Use sentence case or natural Chinese headings.
- Do not turn every label into uppercase metadata.

### Body

Purpose: explain context and project direction.

- Size: `15–17 px`.
- Weight: `400–500`.
- Chinese line height: `1.65–1.8`.
- Paragraph width should remain readable, generally `52–72` Latin characters or an equivalent Chinese measure.
- Prefer short paragraphs and progressive disclosure over dense blocks.

### Metadata

Purpose: show source, status, relationship, time, confidence, and type.

- Size: `12–14 px`.
- Weight: `450–600` depending on importance.
- Use quiet color but maintain contrast.
- Monospace is reserved for IDs, raw data, or developer details.
- Metadata must not visually compete with project content.

### Typographic identity rules

- Project name remains visible across Workspace views.
- Stage and next direction should be scannable without reading body copy.
- Slogan text never exceeds the visual priority of `Nexus AI`.
- Node labels remain concise; full content belongs in Detail.
- Unknown information is written explicitly as “无法判断”.

## 6. Hero Design

The Hero must establish the product before presenting a slogan or feature list.

### Priority order

```text
1. Nexus AI
2. AI Project Intelligence Space
3. Short orientation sentence
4. Create / Continue entry action
5. Supporting slogan or proof
```

`Connect ideas, create possibilities` may remain as a supporting line, but it must not be the dominant headline.

### Recommended composition

```text
NEXUS AI
AI Project Intelligence Space

把想法、决策、行动与成长连接成一个可探索的项目空间。

[创建项目]  [继续项目]
```

The exact copy may change during implementation, but the hierarchy must remain.

### Spatial treatment

- Keep the product name near a stable project or node anchor.
- Use one restrained contextual path or orbit fragment as the brand signature.
- Preserve substantial empty space around the identity block.
- Let entry controls connect visually to the Project Space direction.
- Do not place a large generic AI illustration behind the Hero.

### Avoid

- slogan-first composition;
- large gradient text;
- feature-card grids directly under the title;
- chatbot prompts as the initial visual object;
- decorative brain, robot, circuit, or magic icons;
- animated star fields competing with the entry action.

### Hero acceptance criteria

- A first-time user identifies the product name before the slogan.
- The interface reads as a project space, not a chat landing page.
- Create and Continue actions are distinct without implying cloud persistence.
- The Hero remains recognizable in both themes and at mobile width.

## 7. Project Space Visual Language

The Project Space is the primary expression of Nexus identity.

### Workspace

The Workspace uses a stable application shell:

```text
Nexus Header
      ↓
Sidebar / Mobile Navigation + Main Space + Conditional Detail
```

Rules:

- Keep one active Space visible at a time.
- Preserve the project anchor across view changes.
- Use no more than three primary surface levels: canvas, active Space, transient Detail.
- Prefer fields, dividers, paths, and typography over nested cards.
- Page-level scrolling should not replace navigation on desktop.

### Sidebar

The Sidebar is a navigation instrument, not a dashboard menu.

- Keep Overview, Journey, Context, Universe, and Action in a stable order.
- Use compact node or route markers instead of unrelated icons.
- The active item should appear connected to the Main Space through line, tone, or position.
- Hover and focus remain quiet and accessible.
- Avoid pill-shaped treatment for every item.

### Detail

The Detail region is a reading surface for selected context.

It may show:

- type;
- title or full content;
- status;
- source and confidence;
- semantic relationships;
- stage or action relevance.

Rules:

- Detail is conditional and should not reserve empty space when closed.
- It must not repeat the entire active Space.
- It should use stable contrast without atmospheric texture behind text.
- Closing Detail returns focus to the originating node.
- Detail remains read-only unless a later product design explicitly introduces editing.

### Universe

Universe is the spatial expression of the Context Graph.

- Project Core remains central and visually dominant.
- Understanding, Execution, and Growth form distinct semantic regions.
- Default labels remain concise.
- Full source, status, and relationships appear in Detail.
- Connections remain quieter than nodes.
- Semantic outline fallback is a first-class experience, not an error state.

### Workspace acceptance criteria

- Project identity remains visible in every Space.
- The active view is clear without a large page title.
- Context and Universe serve different purposes.
- Action remains reachable in one navigation step.
- Empty and fallback states preserve spatial orientation.

## 8. Star Map Visual Redesign

The Star Map should feel like a Project Universe without becoming a decorative astronomy scene.

### Project Core

The Project Core is the visual and semantic anchor.

- It uses the largest node size and highest stable contrast.
- It receives a localized, low-intensity halo.
- It shows the project name and current stage only.
- It remains identifiable without glow.
- It must not rotate, pulse rapidly, or resemble a loading indicator.

### Orbit

Orbits express context layers:

| Orbit | Nodes | Meaning |
| --- | --- | --- |
| Understanding | Problem, Decision | Why the project exists and what direction was chosen |
| Execution | Milestone, Task | How the project advances |
| Growth | Progress | What has changed or been confirmed |

Orbit rules:

- Use different radius, tone, and label placement rather than decorative rings.
- Partial arcs are allowed when they improve composition.
- Orbit labels remain available through accessible text and semantic fallback.
- Empty orbits may appear as unresolved regions, but must not imply hidden data.
- Mobile may replace circular orbits with a vertical semantic trace.

### Node

Six node types remain supported:

- `project`;
- `problem`;
- `decision`;
- `milestone`;
- `task`;
- `progress`.

Visual differentiation should combine size, marker shape, type label, and state—not six unrelated bright colors.

| Node | Weight | Suggested marker |
| --- | --- | --- |
| Project | Highest | Stable core with central point |
| Problem | Medium | Open anchor point |
| Decision | Medium-high | Directional split or selected route marker |
| Milestone | Medium-high | Structured waypoint |
| Task | Compact | Action point with completion state |
| Progress | Compact | Trace mark connected to growth path |

### Connection

Connections express named relations such as `addresses`, `supports`, `contains`, and `updates`.

- Default lines use low contrast.
- Hover reveals the relation label and connected endpoints.
- Selection emphasizes related paths while unrelated paths recede.
- Proposed relationships use a dashed pattern and explicit label.
- Direction markers appear only when direction changes interpretation.
- Connection animation is optional and never required for meaning.

### Focus

The focus model contains four states:

1. **Default:** Project Core and priority nodes remain legible.
2. **Hover:** one node or connection receives a small contrast increase.
3. **Selected:** the current node, related nodes, and semantic paths become primary.
4. **Quiet:** unrelated context recedes but remains discoverable.

Rules:

- Selection opens the Detail region.
- Focus does not modify project data.
- Keyboard focus receives an equivalent visible state.
- Reduced-motion mode uses immediate contrast changes.
- Escaping selection returns to the full Project Universe.

### Universe acceptance criteria

- The Project Core is identifiable within one second.
- Orbit meaning is understandable without decorative labels inside the graph.
- Node selection reveals source and relationship context.
- Connections support understanding without dominating the canvas.
- The semantic fallback preserves all node and edge meaning.

## 9. Mobile Experience

Mobile is a deliberate project-space mode, not a compressed desktop graph.

### Navigation

Use a bottom navigation bar or controlled compact menu for:

- 概览;
- 旅程;
- 关系;
- 星图;
- 行动.

Requirements:

- Respect safe-area insets.
- Keep the active Space visible without relying on color alone.
- Maintain touch targets of at least `44 × 44 px`.
- Do not hide Action behind secondary menus.

### Space behavior

- Overview prioritizes name, stage, goal, and one recent change.
- Journey becomes a vertical growth trace.
- Context becomes a semantic relationship outline.
- Universe defaults to an orbit outline or bounded simplified canvas.
- Action keeps goal, reason, and completion criteria together.
- Detail becomes a bottom sheet or full-screen reading surface.

### Mobile visual identity

- Preserve the Project Core metaphor through a compact anchor marker.
- Use route continuity between navigation, stage, and current action.
- Reduce atmospheric lines before reducing text contrast.
- Avoid horizontal panning for essential information.
- Do not shrink node labels until they are unreadable.

### Mobile acceptance criteria

- All five Spaces remain available.
- Project identity and current stage remain visible.
- Node type, source, status, and relationships are accessible.
- The current action requires no horizontal scrolling.
- Theme, focus, empty, and fallback states remain equivalent to desktop.

## 10. Design Principles

1. **Space over Page**
   Build a stable project workspace instead of a long sequence of report sections.

2. **Context over Content**
   Prioritize relationship, source, stage, and relevance over raw output volume.

3. **Explore over Scroll**
   Let users move between focused Spaces rather than search through one continuous page.

4. **Calm Intelligence**
   Communicate capability through continuity, clarity, and restraint.

5. **Project before Slogan**
   Give Nexus and the active project priority over promotional language.

6. **Meaning before Atmosphere**
   Every visual path, node, orbit, and state must carry product meaning.

7. **Distinct Product Grammar**
   Keep Nexus spatial and exploratory; do not borrow Verity's evaluative visual language.

8. **Progressive Disclosure**
   Show orientation first, then reveal source, relationships, and detail through selection.

9. **Human Decision First**
   Visual exploration never confirms a decision or changes project state automatically.

10. **Accessible Equivalence**
    Themes, keyboard use, mobile layouts, reduced motion, and semantic fallbacks preserve the same information.

### Implementation readiness checklist

The redesign is ready for implementation planning when:

- Nexus identity has priority over the slogan in the Hero;
- Nexus and Verity have documented differences in metaphor, hierarchy, and tone;
- both themes define equivalent semantic roles;
- typography distinguishes Hero, Workspace, body, and metadata clearly;
- Project Space uses one stable project anchor and one active Space;
- Universe defines Project Core, semantic orbits, nodes, connections, and focus states;
- mobile preserves all five Spaces and context meaning;
- visual rules require no changes to Atlas, Memory, Execution, Experience, or Context Graph;
- implementation can be reviewed against explicit acceptance criteria rather than subjective style preference.