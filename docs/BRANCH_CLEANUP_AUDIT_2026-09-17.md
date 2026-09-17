# Nexus Atlas Branch Cleanup Audit — 2026-09-17

This audit classifies every non-`main` branch currently present in the Nexus Atlas repository.

The repository accumulated a large number of implementation, agent, repair, documentation, and phase branches during rapid development. The goal is to distinguish branches that are already fully represented by `main` from branches that still contain unique work.

## Safety Rule

A branch is a **verified safe cleanup candidate** only when comparison against current `main` reports:

```text
ahead_by = 0
```

That means the branch contains no commits that are unique relative to `main`.

A branch with `ahead_by > 0` must be preserved until its useful work has been reviewed, migrated, or intentionally discarded.

## Preserve — Unique Work Confirmed

### `agent/deepseek-project-atlas`

```text
ahead_by: 14
```

This branch contains unique Project Atlas / model-routing work and must not be deleted during routine cleanup.

Representative unique or changed assets include:

```text
model/deepseek-client.js
model/model-router.js
tests/project-atlas-model.test.js
atlas/project-atlas/index.js
frontend/app.js
frontend/index.html
frontend/style.css
worker/index.js
```

This is a genuine migration / historical asset, not stale branch noise.

### `agent/project-atlas-product-experience`

```text
ahead_by: 3
```

This branch also contains unique Project Atlas product-experience work and should be preserved pending intentional review or migration.

Representative changed assets include:

```text
atlas/project-atlas/index.js
atlas/project-atlas/stage.js
core/reflection.js
frontend/app.js
frontend/index.html
frontend/session-state.js
frontend/style.css
tests/frontend-session-state.test.js
tests/project-atlas-model.test.js
tests/verify-multiturn.js
worker/index.js
```

Do not delete this branch merely because the current product has moved beyond the original Project Atlas surface.

## Verified Safe Cleanup Candidates

The following **43 branches** were directly compared with `main` and contain **0 unique commits**.

### Agent branches

- `agent/atlas-confirmation-sheet`
- `agent/nexus-atlas-architecture-review-v1`
- `agent/nexus-atlas-shell`
- `agent/nexus-atlas-verity-blueprint`
- `agent/verity-continuity-integration`
- `agent/verity-datahub-assets`

### Documentation branches

- `docs/hackathon-knowledge-harvest`
- `docs/nexus-portfolio-extraction`
- `docs/phase6-entry-audit`
- `docs/phase6-real-continuity-definition`

### Foundation and early product branches

- `feature/generalized-context-package`
- `feature/generalized-decision-memory`
- `feature/personal-context-foundation`
- `feature/source-adapter-foundation`
- `feature/phase4f-acceptance`
- `feature/phase5-product-surface`

### Phase 6 branches

- `feature/phase6b-trusted-checkpoint`
- `feature/phase6c-continuity-assessment`
- `feature/phase6c-fresh-evidence-window`
- `feature/phase6d-human-authority-reentry`
- `feature/phase6e-outcome-verification`
- `feature/phase6f-continuity-closure`
- `feature/phase6f-continuity-closure-backup`
- `feature/phase6f-continuity-closure-runtime`
- `feature/phase6f-continuity-closure-work`
- `feature/phase6g-adversarial-real-run`
- `feature/phase6h-final-acceptance`

### Phase 7 branches

- `feature/phase7-writeback-generalization-entry-audit`
- `feature/phase7b-writeback-target-policy`
- `feature/phase7c-cloudflare-d1-writeback`
- `feature/phase7d-history-retention`
- `feature/phase7e-wider-outcome-category`
- `feature/phase7f-cross-source-postcondition`
- `feature/phase7g-writeback-management-proof`
- `feature/phase7g-writeback-management-proof-copy`
- `feature/phase7h-final-acceptance`

### Phase 8 branches

- `feature/phase8-continuity-product-surface`
- `feature/phase8b-continuity-browser-snapshot`
- `feature/phase8c-continuity-desk-route`
- `feature/phase8d-continuity-inspector-history`
- `feature/phase8e-continuity-live-read-boundary`
- `feature/phase8f-continuity-visual-acceptance`

### Repair branch

- `repair/nexus-atlas-integration-v1`

These branches can be removed after a final GitHub UI sanity check. Their branch names do not need to act as a permanent product archive because the relevant commits are already reachable from `main`.

## Complete Branch Inventory Result

At audit time:

```text
main
+ 43 verified safe cleanup candidates
+ 2 preserved branches with unique commits
= 46 total branches
```

Every non-`main` branch present at the time of this audit has been classified.

## Recommended Cleanup Order

1. Delete the 43 verified `ahead_by=0` branches through GitHub UI.
2. Preserve `agent/deepseek-project-atlas` and `agent/project-atlas-product-experience` until their unique assets have an intentional destination.
3. After cleanup, re-run the branch list and update this audit if new long-lived branches have appeared.
4. Consider enabling GitHub's **Automatically delete head branches** setting for ordinary merged PR branches.

## Repository Maintenance Principle

Nexus Atlas should not use long-lived branches as an undocumented archive.

Future experimental work that is worth preserving should end in one of three states:

```text
merged into main
or
captured as explicit docs / examples
or
explicitly preserved as a migration asset
```

Branches that are fully absorbed by `main` should be deleted after the work is complete instead of accumulating indefinitely.
