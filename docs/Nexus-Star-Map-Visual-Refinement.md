# Nexus Star Map Visual Refinement

> Status: Design only. This document defines visual refinement requirements for the existing Star Map Renderer. It does not modify frontend code, renderer behavior, Context Graph, configuration, or dependencies.

## 1. Purpose

The Star Map Renderer Foundation already converts a read-only Context Graph into a deterministic spatial view with nodes, semantic connections, selectable details, theme support, and a narrow-screen fallback.

The next stage is not to add more graph features. It is to improve hierarchy, focus, atmosphere, and readability so that the current relationship visualization becomes a coherent **Nexus Project Universe Experience**.

The refinement must make three things immediately understandable:

1. which project is at the center;
2. why the surrounding context belongs to that project;
3. how understanding, execution, and confirmed growth differ from one another.

The visual layer must preserve the existing data and interaction boundaries. Refinement changes presentation, not project meaning.

## 2. Visual Philosophy

The Star Map should feel like a quiet, deep, and explorable intelligent space. It must not resemble a technology demonstration, science-fiction control panel, or decorative galaxy.

Core qualities:

- **Calm Intelligence:** hierarchy and continuity communicate intelligence without spectacle;
- **Context Space:** position and grouping help the user understand project structure;
- **Meaningful Connection:** every prominent path corresponds to a named relationship;
- **Visible Growth:** confirmed progress can be distinguished from plans and assumptions.

The experience should remain useful when glow, atmosphere, and motion are removed. Visual effects may reinforce meaning, but they must never create meaning.

Refinement priorities, in order:

1. semantic clarity;
2. project-centered hierarchy;
3. readable exploration states;
4. theme consistency;
5. restrained atmosphere;
6. optional motion.

## 3. Project Core Refinement

The Project node is the visual and semantic center of the map. It is not one node among equals.

### Visual priority

The Project Core should have:

- the largest node footprint;
- the strongest title hierarchy;
- a stable central position;
- a localized, soft halo;
- a clear project-stage or status marker;
- more surrounding breathing room than other nodes.

Recommended relative scale:

| Element | Relative visual weight |
| --- | --- |
| Project Core | `1.00` |
| Milestone or active Decision | `0.68–0.76` |
| Problem or Progress | `0.56–0.66` |
| Task | `0.48–0.58` |

These ratios describe hierarchy rather than fixed pixels. Responsive implementations may adjust absolute sizes while preserving the order.

### Content hierarchy

The Project Core should expose:

1. project label or type;
2. project name;
3. current stage or status;
4. a concise summary when space permits.

Long descriptions belong in the Detail Panel. The center should remain recognizable at the full-map scale.

### Halo behavior

The halo should:

- remain lower contrast than the node label;
- be visible only around the Project Core or current selection;
- avoid sharp rings or saturated glow;
- remain supplementary to size, border, and text hierarchy;
- disappear safely in high-contrast or reduced-effect modes.

The Project Core must still read as central without its halo.

## 4. Orbit System

Orbits express Context hierarchy. They are not decorative circles and do not imply physical simulation.

### Orbit 1: Understanding Orbit

Contains:

- Problem;
- Decision.

Meaning: **why the project exists and why it is taking its current direction.**

Treatment:

- closest to the Project Core;
- clear semantic paths to the project;
- moderate node prominence;
- strong label readability because these nodes explain project intent.

### Orbit 2: Execution Orbit

Contains:

- Milestone;
- Task.

Meaning: **how the project is being advanced.**

Treatment:

- wider radius than the Understanding Orbit;
- Milestones visually anchor related Tasks;
- completed, active, and pending states remain distinguishable;
- containment paths are quieter than project-level relationships.

### Orbit 3: Growth Orbit

Contains:

- Progress.

Meaning: **how the project has changed through confirmed activity.**

Treatment:

- outermost spatial layer;
- lower default prominence than current work;
- completed or dated events remain inspectable;
- progress paths point back to the entity they update.

### Orbit rules

- Orbit guides must remain quieter than semantic edges.
- A guide without nodes should not appear as an active layer.
- Orbit position represents Context category, not confidence or chronological precision.
- Distance from the center must not imply importance unless explicitly defined.
- Node placement should remain deterministic between equivalent renders.
- Dense orbits should preserve labels and selection targets before visual symmetry.
- A semantic outline must retain the same Understanding, Execution, and Growth grouping.

## 5. Node Visual System

All six node types share a common interaction model but have distinct semantic weight.

| Type | Relative size | Visual weight | Identifier | Primary state expression |
| --- | --- | --- | --- | --- |
| `project` | Largest | Highest | Core mark or project glyph | stage and active status |
| `problem` | Medium | Medium-high | question or issue mark | unresolved / defined |
| `decision` | Medium | Medium-high | branch or choice mark | proposed / confirmed |
| `milestone` | Medium-large | High within Execution | target or waypoint mark | pending / in progress / completed |
| `task` | Compact | Medium-low | action step mark | todo / in progress / completed |
| `progress` | Compact-medium | Historical emphasis | trace or record mark | confirmed event and time |

Icons or marks are optional. When used, they must be simple, consistent, and secondary to text. Emoji, robot imagery, brain icons, and decorative celestial symbols should not carry essential meaning.

### Shared anatomy

Each rendered node should support:

- a type label or accessible type name;
- a concise title;
- an optional status marker;
- a visible focus target;
- a stable identifier for detail lookup;
- sufficient contrast in both themes.

### State treatment

State must use more than color:

| State | Treatment direction |
| --- | --- |
| Default | stable outline, normal label weight |
| Active / current | stronger center, modest halo, explicit text |
| Proposed | outlined or lightly dashed treatment plus label |
| Confirmed | stable filled marker plus label |
| In progress | partial or directional marker plus text |
| Completed | quiet filled marker, continuous relationship path |
| Unknown | open marker and explicit “无法判断” or unavailable label |
| Blocked | interrupted marker or path with readable reason |

Nodes must not appear completed merely because they occupy a later orbit.

## 6. Connection Refinement

Connections communicate semantic relationships. They must remain more meaningful than orbit guides and less visually dominant than nodes.

Supported relationships:

| Relation | Meaning | Suggested emphasis |
| --- | --- | --- |
| `addresses` | Project responds to a Problem | medium, directional |
| `supports` | Decision contributes to the Project | medium-high when focused |
| `contains` | Milestone groups a Task | quiet, structural |
| `updates` | Progress changes or records Project state | quiet by default, clear on focus |

### Line hierarchy

- Orbit guide: thinnest and lowest contrast.
- Structural edge: thin, stable, low-to-medium contrast.
- Focused edge: modestly stronger width or opacity.
- Uncertain edge, if supported by data: dashed with an explicit label.
- Invalid or missing relationship: omitted rather than visually inferred.

### Relationship labels

Relationship text should appear:

- in a hover or focus hint on desktop;
- in the Detail Panel for selected nodes;
- directly in the semantic fallback list;
- through accessible descriptions for keyboard and assistive technology users.

Labels should use human-readable language where possible while preserving the source relation name in developer diagnostics.

### Prohibited treatment

- particle trails;
- strong glow on every edge;
- continuously animated paths without state meaning;
- thick cables or high-contrast webs;
- decorative links inferred from proximity;
- effects that obscure edge direction or endpoint.

## 7. Focus State

Focus state provides exploration without editing data.

### Default

- All valid nodes and semantic edges remain visible.
- The Project Core has the highest baseline priority.
- Orbit guides establish hierarchy quietly.
- Secondary labels may use reduced emphasis but remain discoverable.

### Hover

- Increase node contrast slightly.
- Reveal a concise title or relationship hint when needed.
- Emphasize directly connected edges without hiding unrelated context.
- Do not move the node or change layout.
- Do not rely on hover for required information.

### Selected

- Give the selected node a clear outline, marker, or localized halo.
- Open or update the Detail Panel.
- Keep the Project Core visible as the spatial anchor.
- Preserve selection through minor viewport changes.
- Provide a clear way to return to the default state.

### Related Context

When a node is selected:

- directly connected nodes receive secondary emphasis;
- connecting semantic edges become clearer;
- unrelated nodes may reduce opacity modestly but must not disappear;
- relationship names become available in the Detail Panel;
- keyboard focus order remains predictable.

Maximum dimming should preserve orientation and readable node identity. The map must not collapse into an isolated subgraph unless the user explicitly requests filtering in a future version.

## 8. Detail Panel

The Detail Panel is the primary reading surface for a selected node. It remains read-only.

### Required content

- node type;
- full name or title;
- status when present;
- source when present;
- connected relationships;
- related node names;
- time for Progress nodes when available.

Optional content may include summary, reason, criteria, or project stage when present in the Context Graph.

### Layout principles

- Use a stable reading surface separate from the spatial canvas.
- Keep the panel visible without covering the Project Core on common desktop widths.
- Use a drawer, sheet, or inline region on narrow screens.
- Keep metadata visually secondary but fully readable.
- Represent missing values explicitly instead of inventing content.
- Preserve the user's selected node while the panel is open.

### Relationship presentation

Each relationship entry should include:

- direction;
- semantic relation;
- connected node type;
- connected node title.

The panel must not offer controls that edit Memory, Execution, Atlas output, or Context Graph.

## 9. Dark Mode Refinement

Name: **静谧深空**.

The Dark Mode should feel like observing a structured project system in quiet deep space.

### Background

- blue-black rather than pure black;
- subtle depth through low-contrast navy fields;
- sparse star dust separated clearly from semantic nodes;
- no texture behind dense labels or the Detail Panel.

### Elements

- orbit guides use subdued indigo-blue;
- semantic connections use restrained blue-gray;
- the Project Core uses soft celestial blue or muted violet;
- node surfaces remain dark enough for readable light text;
- selected states use localized, low-intensity halos.

### Contrast order

1. selected node or current Project Core;
2. readable node labels;
3. semantic edges;
4. orbit guides;
5. decorative star dust.

Decorative content must never approach semantic-node contrast.

### Avoid

- neon borders;
- saturated blue-purple gradients;
- large luminous clouds;
- high-frequency particles;
- science-fiction frames;
- continuous glow on completed or inactive nodes.

## 10. Light Mode Refinement

Name: **晨雾星图**.

The Light Mode should feel like a project map unfolded in morning mist, not a generic white dashboard.

### Background

- mist white rather than pure white;
- pale blue-gray and gray-violet spatial fields;
- fine chart or map lines outside text-heavy regions;
- subtle paper-like depth without visible noise.

### Elements

- nodes resemble restrained map anchors or plotted points;
- orbit guides use pale chart lines;
- semantic paths remain darker than guides;
- the Project Core uses calm blue or muted violet emphasis;
- the Detail Panel uses a stable, clean reading surface.

### Depth strategy

Use, in order:

1. spacing;
2. scale;
3. tonal separation;
4. border hierarchy;
5. minimal shadow only when necessary.

### Avoid

- pure-white administration-page styling;
- stacks of identical cards;
- heavy shadows;
- uniformly rounded components;
- saturated gradients;
- map lines crossing labels or reading content.

Dark and Light modes must preserve identical semantic hierarchy, focus behavior, node categories, and relationship meaning.

## 11. Motion Principles

Motion is optional and subordinate to readability.

### Allowed motion

- a subtle breathing cycle for the active Project Core;
- a slow, low-contrast orbit-flow cue;
- short focus and selection transitions;
- restrained state-change transitions;
- smooth but bounded Detail Panel entry.

Recommended behavior:

| Motion | Direction | Suggested duration |
| --- | --- | --- |
| Hover / focus | short opacity or outline transition | `120–220 ms` |
| Detail Panel | gentle reveal | `200–320 ms` |
| Selection path | restrained edge emphasis | `180–300 ms` |
| Project breathing | minimal amplitude | `5–8 s` period |
| Orbit flow | optional and very slow | `10–18 s` period |

Only one ambient motion pattern should be dominant in a view.

### Prohibited motion

- rapid flashing;
- particle bursts;
- multiple continuously pulsing nodes;
- rotating decorative rings;
- large parallax movement;
- motion that implies task completion;
- animation required to identify state or relationships.

### Reduced motion

When `prefers-reduced-motion` is enabled:

- remove ambient breathing and orbit flow;
- use immediate or short opacity-based focus changes;
- preserve all focus, status, and relationship indicators statically;
- keep selection and Detail Panel behavior fully functional;
- never reduce access to information.

## 12. Responsive Strategy

### Desktop

Desktop provides the complete Star Map experience:

- centered Project Core;
- three readable orbit layers;
- visible semantic connections;
- direct node selection;
- adjacent or side Detail Panel;
- sufficient label spacing without mandatory zoom.

The initial view should fit the meaningful graph within the available map region for the supported first-version graph size.

### Tablet and intermediate widths

- reduce decorative space before reducing label readability;
- allow the Detail Panel to move below or overlay a nonessential edge area;
- retain the Project Core and orbit grouping;
- prefer fewer simultaneous labels over unreadable labels;
- maintain keyboard and touch target size.

### Mobile

Mobile uses a deliberate semantic fallback:

- group nodes under Project, Understanding, Execution, and Growth;
- present relationships as named text paths;
- open node details in an inline region or bottom sheet;
- preserve type, title, status, source, and relationships;
- keep the Project Core summary first;
- avoid horizontal panning for essential content.

Do not force the desktop graph into a scaled miniature. Spatial equivalence is less important than semantic equivalence on narrow screens.

### Empty and partial states

- Empty Context Graph: explain that no project context is available yet.
- Missing Project node: present the available semantic outline and a partial-state message.
- Unsupported node type: show a neutral Context item.
- Invalid connection: omit it visually and preserve safe diagnostics outside the user-facing experience.

## 13. Technical Boundary

Visual Refinement consumes the existing read-only Context Graph through the current rendering boundary:

```text
Context Graph
    ↓
Star Map Renderer
    ↓
Frontend
```

The refinement layer may define:

- presentation tokens;
- relative node hierarchy;
- orbit guide appearance;
- focus and selection styles;
- Detail Panel composition;
- responsive presentation;
- optional motion behavior.

It must not:

- change Context Graph nodes or edges;
- read Memory, Execution, or Atlas directly;
- infer relationships from position;
- persist coordinates as project state;
- change stage, task, milestone, or decision status;
- trigger model analysis;
- write any project data.

Temporary hover, selection, viewport, and panel state remain frontend-only presentation state.

## 14. Future Enhancement

Possible future enhancements include:

- bounded automatic layout for larger graphs;
- saved user view state;
- time-based project growth playback;
- DataHub-backed Context Graphs;
- multiple Atlas contributions with provenance;
- collaborative Project Universes;
- accessible graph filters and guided paths.

These capabilities are outside the current refinement scope. Each requires separate data, interaction, performance, privacy, and accessibility design.

## 15. Design Principles

1. **Space over List**  
   Use spatial hierarchy where it improves understanding, with a complete semantic fallback.

2. **Context over Decoration**  
   Every prominent visual element must represent project context or interaction state.

3. **Calm Intelligence**  
   Communicate depth through restraint, hierarchy, and continuity rather than spectacle.

4. **Meaningful Connections**  
   Every connection has a named source relationship and remains inspectable.

5. **Growth Visible**  
   Confirmed project progress is distinguishable from future plans and model proposals.

6. **Project at the Center**  
   The project remains the visual anchor even while another node is selected.

7. **Read-only Exploration**  
   Hover, selection, and navigation change view state only.

8. **Semantic Theme Consistency**  
   静谧深空 and 晨雾星图 preserve the same structure and states.

9. **Accessible Equivalence**  
   Spatial meaning remains available through text, keyboard focus, reduced motion, and mobile fallback.

10. **Refinement before Expansion**  
    Improve the clarity of the existing bounded graph before adding layout intelligence or new graph capabilities.

Visual refinement is ready for implementation planning when:

- the Project Core remains the strongest anchor in both themes;
- Understanding, Execution, and Growth orbits are visually distinct without relying on decoration;
- all six node types have consistent hierarchy and state treatment;
- all supported relationship types remain readable and inspectable;
- focus states preserve map orientation;
- the Detail Panel presents complete read-only context;
- mobile provides semantic equivalence rather than a compressed desktop graph;
- reduced-motion behavior preserves all information;
- no refinement requires changes to Context Graph or core business modules.
