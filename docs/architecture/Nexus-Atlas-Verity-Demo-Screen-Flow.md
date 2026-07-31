# Demo Screen Flow — Nexus Atlas / Verity Re-entry v0.1

## 1. Full Product Route

The competition path must run inside the permanent Nexus product structure:

```text
Atlas Desk
  → Atlas Map
  → Innovation Territory
  → Verity Workspace
  → Re-entry Brief
  → Decision / Conflict / Asset Inspector
  → Action Tray
  → Continue in Workspace
```

The Demo may traverse only one path, but the navigation and page hierarchy must remain the long-term hierarchy.

## 2. Global Shell

Present on every page:

- Nexus Atlas wordmark and current Territory.
- Atlas Index / Map / Workspace navigation.
- Source health indicator.
- Command/search entry.
- Current project breadcrumb.
- Context Inspector toggle.
- No competition-specific branding in the shell.

## 3. Screen-by-Screen Flow

### Screen 1 — Atlas Desk

**Purpose:** Show the user's current world, not a tool menu.

**Primary content**
- Territory index: Innovation, Learning, Research, Creation, Evaluation.
- “Needs Re-entry” section.
- Verity entry: paused 21 days, milestone `v1.0 benchmark validation`.
- Continuity summary: 7 changes/attention items.
- Recent route strip and last confirmed action.

**Demo interaction**
- Select `衡准 · Verity`.

**Long-term role**
- Home surface for all projects and Territories.
- Eventually supports multiple projects, personal priorities, and cross-Territory signals.

---

### Screen 2 — Atlas Map / Project Focus

**Purpose:** Orient the user before opening the detailed brief.

**Visible map**
- Verity project landmark.
- Connected context: Evaluation Rubric, Benchmark v1, v0.4.7 Results, Benchmark-first Decision, v1.0 Goal.
- Real relationship labels: `governs`, `used by`, `produces`, `supports`, `advances`.
- Broken route marker on Benchmark ownership.
- Stale hatch on v0.4.6 evidence.

**Demo interaction**
- Enter `Innovation Territory`.

**Long-term role**
- Cross-project and cross-Territory exploration.
- Never a decorative node cloud; every line corresponds to a stored relationship.

---

### Screen 3 — Innovation Territory / Verity Workspace

**Purpose:** Restore operational orientation.

**Header**
- Project name, version, current milestone, last active date.
- Sources: Nexus records, GitHub, DataHub.
- Current project state: `Re-entry required`.

**Workspace bands**
1. Route: Purpose → Current milestone → Next validated milestone.
2. Context health: confirmed / stale / conflicting / missing.
3. Current work surface.
4. Action Tray.

**Demo interaction**
- Open `Restore Context`.

**Long-term role**
- Reusable Territory template. Learning, Research, Creation, and Evaluation use the same shell with different projections and capabilities.

---

### Screen 4 — Re-entry Brief

**Purpose:** Answer three questions immediately.

```text
What changed?
What can I still trust?
What should happen next?
```

**Summary counts**
- 4 Meaningful Changes
- 4 Valid Decisions
- 2 Stale Evidence
- 1 Agent Conflict
- 1 Missing Ownership

**Layout**
- Left: project route and selected section.
- Center: findings with evidence snippets.
- Right: Inspector with source, timestamp, rule, lineage, confidence.
- Bottom: Continue / Verify / Repair / Act tray.

**Demo interaction**
- Open the `Benchmark-first before v1.0` decision.

---

### Screen 5 — Decision Trace

**Purpose:** Demonstrate durable reasoning rather than summary generation.

**Content**
- Decision.
- Decision date and confirmer.
- Problem being decided.
- Evidence supporting it.
- Superseded route.
- Scope and current validity.
- Downstream actions and assets.

**Key statement**
- “Valid because it is confirmed, supported by current evidence, and not superseded.”

**Demo interaction**
- Return and open Agent Conflict.

**Long-term role**
- Standard detail page usable from every Territory.

---

### Screen 6 — Agent Conflict Resolution

**Purpose:** Show that Atlas governs agent memory.

**Content**
- Agent A: expand feature breadth.
- Agent B: freeze feature growth and validate Benchmark v1.
- Shared recommendation area: roadmap.
- Relevant confirmed decision.
- Nexus interpretation: direct conflict; Agent B matches current decision; Agent A is deferred, not erased.

**Actions**
- `Keep Benchmark-first priority`
- `Leave unresolved`
- `Review evidence`

**Demo interaction**
- Confirm `Keep Benchmark-first priority`.
- Write a Nexus DecisionConfirmationEvent.
- Preserve both memories and mark conflict resolved by the decision.

---

### Screen 7 — DataHub Asset Inspector / Context Repair

**Purpose:** Show DataHub as an operational context source.

**Content**
- Asset: Verity Benchmark v1.
- URN, Domain, version, quality status.
- Upstream: Evaluation Rubric, Test Materials.
- Downstream: Calibration Context, Release Readiness Evidence.
- Owner: Unassigned.
- Rule: `MO-01`.
- Impact: calibration and release readiness remain blocked.

**Action**
- `Assign to me`.

**Confirmation sheet**
- Target URN.
- Existing owners: none.
- Proposed owner.
- Operation: ownership update.
- Audit behavior.

**Verified result**
- Write → re-read → owner displayed.
- Missing Ownership signal closes.
- ContextRepairEvent recorded.

---

### Screen 8 — Re-entry Plan / Continue in Workspace

**Purpose:** End with resumed work.

**Action groups**
- **Continue:** Preserve Verity positioning and structured report.
- **Verify:** Re-run v0.4.6 samples through v0.4.7.
- **Repair:** Ownership resolved; roadmap conflict confirmed.
- **Act:** Build Benchmark v1 validation set.

**Primary action**
- `Continue in Workspace`.

**Destination**
- Benchmark v1 task board or working document, already carrying the restored Context Package.

## 4. Three-Minute Recording Cut

| Time | Screen | Message |
|---|---|---|
| 0:00–0:20 | Atlas Desk | Complex work loses context across time and agents |
| 0:20–0:38 | Atlas Map | Nexus connects project, data assets, decisions, and actions |
| 0:38–1:05 | Verity Workspace + Brief | Restore four change categories and current state |
| 1:05–1:35 | Decision Trace | Recover not only what was chosen, but why it remains valid |
| 1:35–2:05 | Agent Conflict | Govern conflicting agent memories with confirmed context |
| 2:05–2:38 | DataHub Repair | Read lineage/ownership, confirm a real ownership repair |
| 2:38–2:58 | Re-entry Plan | Return to an executable next action |

## 5. Archive Cartography Visual Contract

### Use
- Modern atlas indexing.
- Fine route lines and relationship labels.
- Margin annotations.
- Version/date stamps.
- Restrained paper or topographic texture.
- Clear evidence hierarchy.
- Inspector resembles an analytical field instrument.

### Avoid
- Space imagery, stars, glowing nodes, purple-blue neon.
- Antique parchment cosplay.
- Full-screen graph chaos.
- Generic dashboard card grids.
- Decorative relationships not backed by data.
- Competition logos or copy inside the permanent shell.

### Structural layout

```text
┌──────────────── Global Atlas Index ────────────────┐
│ Project Route │ Continuity Surface │ Inspector     │
│               │                    │ provenance    │
│               │                    │ rules/lineage │
├──────────────── Action Tray ───────────────────────┤
│ Continue        Verify        Repair        Act    │
└────────────────────────────────────────────────────┘
```

## 6. Responsive Behavior

- Desktop: three-column working surface.
- Tablet: Inspector becomes a right drawer.
- Mobile: Route → Findings → Action Tray; Inspector opens as a full-height sheet.
- The Demo should be recorded on desktop, but all core actions must remain usable on mobile.

## 7. Acceptance Criteria

1. Atlas Desk, Atlas Map, Territory Workspace, and Inspector exist as permanent product layers.
2. The Verity path uses those layers rather than a standalone competition page.
3. Every visible finding opens a source-backed Inspector.
4. No repair is shown complete until post-write verification succeeds.
5. The last Demo interaction enters a real Workspace state with the Context Package attached.
