# Nexus Atlas Architecture Documents

## Document precedence

Use the following order when architecture documents overlap:

1. [`Nexus-Atlas-Architecture-Review-v1.0.md`](../Nexus-Atlas-Architecture-Review-v1.0.md) — canonical product and system baseline.
2. [`Nexus-Atlas-Implementation-Audit-2026-07-31.md`](../Nexus-Atlas-Implementation-Audit-2026-07-31.md) — current readiness, merge blockers, and implementation boundaries.
3. Verity blueprint, DataHub mapping, rule matrix, and screen-flow documents — detailed scenario references.
4. Earlier Project Atlas documents — historical prototype context only.

The v1.0 Architecture Review has priority over earlier Star Map, Project Universe, or competition-only descriptions.

## Submission baseline

PR #10 also carries the repository-facing submission baseline:

- rewritten Nexus Atlas README;
- Apache License 2.0;
- updated package description;
- deterministic sample outputs;
- planned Context Package and ContextRepairEvent contracts;
- sample-versus-runtime-evidence rules.

These files improve reviewability but do not replace local runtime verification.

## Supporting references

The following documents remain useful when they do not conflict with the canonical baseline:

- `Nexus-Atlas-Long-Term-Product-Baseline.md`
- `Nexus-Atlas-Verity-Blueprint.md`
- `Nexus-Atlas-Verity-Continuity-Rule-Matrix.md`
- `Nexus-Atlas-Verity-DataHub-Asset-Mapping.md`
- `Nexus-Atlas-Verity-Demo-Screen-Flow.md`

## Change control

A future change requires an Architecture Decision Record when it would modify one of the following frozen decisions:

- Nexus as Personal Intelligence Infrastructure;
- the Context Fabric / Projection model;
- Territory as a view rather than a database;
- Atlas Desk as the default entry;
- route-first Atlas Map behavior;
- Agent / Capability separation;
- human authority for consequential mutation;
- read-after-write verification;
- Nexus / DataHub responsibility boundaries;
- Archive Cartography as the permanent system language.

Implementation details may evolve without an ADR when they preserve these contracts.
