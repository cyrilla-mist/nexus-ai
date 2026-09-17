# Nexus Atlas Documentation

This directory contains the long-term product, architecture, implementation, integration, evaluation, maintenance, and historical competition documentation for Nexus Atlas.

> **Repository status:** [`cyrilla-mist/nexus-ai`](https://github.com/cyrilla-mist/nexus-ai) is the canonical long-term Nexus Atlas repository. Documents in this directory span multiple development phases, so a file's age and purpose matter when interpreting it.

## Start Here

For the current product and repository state, read these first:

1. [`../README.md`](../README.md) — current repository and product overview.
2. [`Nexus-Atlas-Architecture-Review-v1.0.md`](Nexus-Atlas-Architecture-Review-v1.0.md) — canonical architecture and product baseline.
3. [`architecture/README.md`](architecture/README.md) — architecture-document precedence and interpretation rules.
4. [`Nexus-Atlas-Phase6-Real-Continuity-Loop-Definition.md`](Nexus-Atlas-Phase6-Real-Continuity-Loop-Definition.md) — later continuity-loop definition for real project re-entry.
5. [`Nexus-DataHub-Verity-Assets.md`](Nexus-DataHub-Verity-Assets.md) — DataHub / Verity governed-asset integration contract.
6. [`BRANCH_CLEANUP_AUDIT_2026-09-17.md`](BRANCH_CLEANUP_AUDIT_2026-09-17.md) — complete classification of all non-`main` branches for repository cleanup.

The source code, tests, and current root README are the authority for what the repository actually implements today. A historical design document or GitHub release does not by itself prove that a capability remains implemented or current.

## Release History Note

The repository currently has one GitHub release:

```text
v0.1.1 — Nexus AI / Project Atlas Experience
```

That July 2026 release is a **historical product milestone** from before the current Nexus Atlas architecture and identity stabilized. It should be preserved as provenance, not interpreted as the current Nexus Atlas product version or current roadmap.

No newer GitHub release is required merely for repository cosmetics. If Nexus Atlas adopts a new release line later, it should start from an intentional product/versioning decision and describe the canonical Nexus Atlas architecture rather than continuing the old Nexus AI / Project Atlas release narrative by accident.

## Documentation Classes

### Product and Architecture Baselines

These documents define durable product concepts and system boundaries:

- `Nexus-Atlas-Architecture-Review-v1.0.md`
- `architecture/`
- `Nexus-Atlas-Phase6-Real-Continuity-Loop-Definition.md`

Important long-term concepts include the Context Fabric, projections, Atlas Desk, route-first Atlas Map, human authority for consequential changes, evidence/provenance boundaries, and governed external-source adapters.

### Repository Maintenance

`BRANCH_CLEANUP_AUDIT_2026-09-17.md` records the branch state after the September 2026 repository cleanup.

At audit time:

```text
main
+ 43 verified safe cleanup candidates
+ 2 preserved branches with unique commits
= 46 total branches
```

Use that document before deleting historical branches. The two preserved branches contain unique Project Atlas work and should not be bulk-deleted with absorbed phase branches.

### Implementation and Phase Audits

Files named `Phase*`, `Entry-Audit`, `Acceptance`, `Implementation-Audit`, or with explicit dates are **point-in-time engineering records**.

They are useful for understanding why a decision was made, what was verified at that phase, and what remained incomplete at that time. They should not automatically be treated as the current backlog or current implementation status.

Examples include:

- `Nexus-Atlas-Implementation-Audit-2026-07-31.md`
- `Nexus-Atlas-Phase4-Source-Adapter-Entry-Audit.md`
- `Nexus-Atlas-Phase5-Product-Surface-Entry-Audit.md`
- `Nexus-Atlas-Phase5E-Source-Intake-Review-Entry-Audit.md`
- `Nexus-Atlas-Phase5F-Re-entry-Audit.md`
- `Nexus-Atlas-Phase6-Entry-Audit.md`
- later Phase 6 acceptance and adversarial-evaluation records

### Integration Documentation

Integration documents describe provider boundaries, governed assets, external-source behavior, verification contracts, and implementation notes.

The DataHub / Verity material is retained because it also informed the long-term source-adapter and governance model, even though the DataHub hackathon submission itself is now historical.

### Competition Archive

[`competition/`](competition/) contains DataHub hackathon submission-preparation material such as reviewer Q&A, video plans, narration, subtitles, and local-validation instructions.

These files are **historical submission artifacts**, not the current Nexus roadmap or current TODO list.

The frozen submitted competition build is preserved separately at:

[`cyrilla-mist/nexus-atlas-datahub-2026`](https://github.com/cyrilla-mist/nexus-atlas-datahub-2026)

### Legacy Nexus AI / Project Atlas Material

Some older documents predate the permanent Nexus Atlas architecture and may use names or concepts such as Nexus AI, Project Atlas, Star Map, or earlier product-surface assumptions.

Keep them as design history. When they conflict with the current Nexus Atlas baseline, prefer the current repository README and Architecture Review v1.0.

## Reading Rules

When documents disagree, use this order:

```text
Current source code and tests
  → current repository README
  → Nexus Atlas Architecture Review v1.0
  → later accepted phase definitions / integration contracts
  → dated implementation audits
  → competition material
  → legacy Nexus AI / Project Atlas documents
```

A newer document is not automatically authoritative if it was written only for a competition submission or a temporary implementation phase.

## Maintenance Rule

Future documentation should state its role near the top when possible:

- **Current baseline** — intended to guide future implementation.
- **Integration contract** — defines a specific source/provider boundary.
- **Repository maintenance** — records cleanup, branch, or structural state.
- **Phase record** — a point-in-time implementation or acceptance snapshot.
- **Historical / competition** — retained for provenance, not current planning.

This keeps the documentation useful without deleting the development history that explains how Nexus Atlas evolved.
