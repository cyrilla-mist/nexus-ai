# Nexus Atlas Architecture Documents

This directory indexes architecture material for the canonical long-term Nexus Atlas repository.

## Document Precedence

When architecture documents overlap, interpret them in this order:

1. **Current source code and tests** — authority for what the repository actually implements.
2. [`../Nexus-Atlas-Architecture-Review-v1.0.md`](../Nexus-Atlas-Architecture-Review-v1.0.md) — canonical product and system architecture baseline.
3. Later accepted phase definitions and integration contracts that preserve the baseline, including the real continuity-loop and source-adapter work.
4. Dated implementation / entry / acceptance audits — point-in-time engineering records.
5. Competition documentation — historical submission material.
6. Earlier Nexus AI / Project Atlas / Star Map documents — prototype history only.

The Architecture Review v1.0 has priority over earlier Star Map, Project Universe, or competition-only descriptions.

## Frozen Long-Term Decisions

The following ideas remain part of the durable Nexus Atlas architecture unless a later explicit architecture decision replaces them:

- Nexus is personal intelligence infrastructure rather than a generic chatbot.
- A provider-neutral **Context Fabric** stores reusable project context primitives.
- Identity, Knowledge, Memory, Decision, and Action Context are projections over the same fabric rather than unrelated databases.
- Territories are product views / workspaces, not independent canonical stores.
- Atlas Desk is the long-term entry layer for project continuity.
- Atlas Map is route-first and should show meaningful stored relationships rather than decorative graph edges.
- Agents and capabilities are separate concepts.
- Evidence may inform a decision but does not silently establish human approval.
- Consequential context changes require explicit human authority where appropriate.
- External mutations require verification; a successful write response alone is not proof of the resulting state.
- External systems such as DataHub connect through adapters instead of replacing the Nexus Context Fabric.
- Archive Cartography is the system's visual / interaction language.

## Historical Implementation Records

Documents such as `Nexus-Atlas-Implementation-Audit-2026-07-31.md` and the Phase 4–6 entry / acceptance audits capture the state of implementation at a specific point in time.

They are valuable provenance, but statements such as “merge blocker”, “next step”, “not yet verified”, or “submission requirement” should be read in their original date context. They are **not automatically the current backlog**.

## DataHub Material

The DataHub / Verity documents remain useful architecture references for:

- governed external assets;
- source-adapter boundaries;
- ownership and lineage context;
- explicit confirmation before allowed mutations;
- read-after-write verification;
- the distinction between Nexus-owned project context and externally governed metadata.

The actual DataHub hackathon submission is preserved separately in [`cyrilla-mist/nexus-atlas-datahub-2026`](https://github.com/cyrilla-mist/nexus-atlas-datahub-2026).

## Competition Material

The `../competition/` directory is retained as historical submission-preparation evidence. It includes reviewer Q&A, recording plans, narration, subtitles, and validation instructions.

It does not define the current Nexus product roadmap.

## Change Control

A future change should receive explicit architecture documentation when it materially changes one of the frozen long-term decisions above.

Implementation details may evolve without a new architecture decision when they preserve those contracts.
