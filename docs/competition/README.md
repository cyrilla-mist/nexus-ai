# Nexus Atlas Competition Pack

This directory organizes the reviewer-facing and submission-facing materials for the DataHub hackathon.

## Current documents

- [`Nexus-Atlas-Judge-QA.md`](Nexus-Atlas-Judge-QA.md) — concise and extended answers for likely reviewer questions.
- [`Nexus-Atlas-Visual-Submission-Plan.md`](Nexus-Atlas-Visual-Submission-Plan.md) — cover, screenshots, thumbnail, capture, privacy, and truthfulness requirements.

## Source documents elsewhere in the repository

- [`../Nexus-Atlas-Architecture-Review-v1.0.md`](../Nexus-Atlas-Architecture-Review-v1.0.md) — canonical product and architecture baseline.
- [`../Nexus-Atlas-Implementation-Audit-2026-07-31.md`](../Nexus-Atlas-Implementation-Audit-2026-07-31.md) — implementation readiness and merge blockers.
- [`../Nexus-DataHub-Verity-Assets.md`](../Nexus-DataHub-Verity-Assets.md) — governed DataHub asset and bridge contract.
- [`../../examples/README.md`](../../examples/README.md) — deterministic sample and planned-contract evidence boundary.

## Submission materials to finalize

The following content is prepared in draft form outside the runtime code and should be finalized only after local verification:

- Devpost project description;
- simplified English voice-over and subtitle script;
- three-minute recording sequence;
- YouTube or Vimeo title and description;
- public demo URL;
- verified runtime screenshots;
- Missing Ownership `1 → 0` evidence;
- final repository and testing links.

## Evidence classes

### Deterministic fixture

A repeatable Nexus-owned scenario used to demonstrate Continuity logic. It does not prove that DataHub was available or mutated.

### Planned contract

A proposed structure such as Context Package or Outcome Write-back. It must not be described as implemented runtime behavior.

### Verified runtime

Captured evidence from the target environment showing the real DataHub source, allowed mutation, fresh re-read, and resulting state.

Only verified runtime evidence may support an end-to-end claim.

## Final submission checklist

- [ ] Repository branches validated locally.
- [ ] Tests and checks pass.
- [ ] DataHub assets ingested.
- [ ] MCP ownership and lineage reads verified.
- [ ] `add_owners` mutation verified.
- [ ] Missing Ownership `1 → 0` captured.
- [ ] Context Package handoff completed or truthfully scoped.
- [ ] Outcome Write-back completed or truthfully scoped.
- [ ] Public demo deployed.
- [ ] Screenshots privacy-reviewed.
- [ ] Video under three minutes with English subtitles.
- [ ] Devpost text updated to match verified functionality.
- [ ] Apache License 2.0 visible on the final public branch.
