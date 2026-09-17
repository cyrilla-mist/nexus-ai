# Nexus Atlas Branch Cleanup Audit — 2026-09-17

This audit exists because the repository accumulated a large number of implementation, agent, repair, and phase branches during rapid development.

The goal is to separate branches that are already fully represented by `main` from branches that still contain unique work.

## Rule

A branch is a **safe cleanup candidate** only when comparison against current `main` reports:

```text
ahead_by = 0
```

That means the branch contains no commits that are unique relative to `main`.

A branch with `ahead_by > 0` must be preserved until its useful work has been reviewed, migrated, or intentionally discarded.

## Preserve — Unique Work Confirmed

### `agent/deepseek-project-atlas`

**Comparison:** diverged

```text
ahead_by: 14
behind_by: 509
```

This branch contains unique Project Atlas / model-routing work and must not be deleted during routine cleanup.

Unique or changed assets include:

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

## Verified Safe Cleanup Candidates

The following branches were directly compared with `main` during this audit and had **0 unique commits**.

| Branch | Result |
| --- | --- |
| `feature/phase8f-continuity-visual-acceptance` | identical to `main` at audit time |
| `feature/phase7h-final-acceptance` | `ahead_by=0`; behind `main` |
| `agent/nexus-atlas-shell` | `ahead_by=0`; behind `main` |
| `agent/verity-datahub-assets` | `ahead_by=0`; behind `main` |
| `repair/nexus-atlas-integration-v1` | `ahead_by=0`; behind `main` |
| `feature/phase6f-continuity-closure-backup` | `ahead_by=0`; behind `main` |
| `feature/phase6f-continuity-closure-work` | `ahead_by=0`; behind `main` |
| `feature/phase7g-writeback-management-proof-copy` | `ahead_by=0`; behind `main` |
| `docs/nexus-portfolio-extraction` | `ahead_by=0`; behind `main` |
| `feature/personal-context-foundation` | `ahead_by=0`; behind `main` |
| `feature/source-adapter-foundation` | `ahead_by=0`; behind `main` |

These branches can be removed after a final GitHub UI sanity check if desired. Their branch names do not need to be preserved for product history because the relevant commits are already reachable from `main`.

## Remaining Branches

The repository still contains many unverified branches, including additional:

- `agent/*`
- `docs/*`
- `feature/phase4*`
- `feature/phase5*`
- `feature/phase6*`
- `feature/phase7*`
- `feature/phase8*`
- generalized context / decision branches

Do **not** bulk-delete all of them based only on naming. Continue using `main...branch` comparison and classify each branch by `ahead_by` before deletion.

## Recommended Cleanup Order

1. Delete verified `ahead_by=0` backup / copy / work branches first.
2. Delete verified historical phase branches that are fully contained in `main`.
3. Review agent branches individually for unique experimental code.
4. Review docs branches individually for unique design or architecture records.
5. Preserve any branch with `ahead_by > 0` until its assets have an intentional destination.
6. Re-run the audit after branch cleanup so this file reflects the remaining branch set.

## Repository Maintenance Principle

Nexus Atlas should not use long-lived branches as an undocumented archive.

Future experimental work that is worth preserving should end in one of three states:

```text
merged into main
or
captured as explicit docs / examples
or
marked in an audit as a preserved migration asset
```

Branches that are fully absorbed by `main` should be deleted after the work is complete instead of accumulating indefinitely.
