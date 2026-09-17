# Nexus Atlas Competition Archive

> **Historical submission-preparation material.**
>
> This directory preserves the reviewer-facing and production-facing material created for the 2026 DataHub hackathon. The competition has been submitted and this directory is no longer an active checklist or roadmap.

The frozen competition build is preserved separately at:

[`cyrilla-mist/nexus-atlas-datahub-2026`](https://github.com/cyrilla-mist/nexus-atlas-datahub-2026)

Long-term Nexus Atlas development continues in the current repository.

## Archived Materials

- [`Nexus-Atlas-Judge-QA.md`](Nexus-Atlas-Judge-QA.md) — reviewer-question preparation.
- [`Nexus-Atlas-Visual-Submission-Plan.md`](Nexus-Atlas-Visual-Submission-Plan.md) — cover, screenshot, thumbnail, capture, privacy, and truthfulness planning.
- [`Nexus-Atlas-Video-Production-Pack.md`](Nexus-Atlas-Video-Production-Pack.md) — recording sequence, editing notes, YouTube copy, and evidence checklist.
- [`Nexus-Atlas-AI-Voiceover.txt`](Nexus-Atlas-AI-Voiceover.txt) — English narration draft.
- [`nexus-atlas-demo-en.srt`](nexus-atlas-demo-en.srt) — English subtitle timeline.
- [`Nexus-Atlas-Codex-Local-Validation-Prompt.md`](Nexus-Atlas-Codex-Local-Validation-Prompt.md) — the local validation / DataHub / MCP workflow used during submission preparation.

## Related Technical References

Some competition work also produced reusable architecture and integration knowledge. Those documents remain elsewhere in `docs/` because their concepts extend beyond the competition:

- [`../Nexus-Atlas-Architecture-Review-v1.0.md`](../Nexus-Atlas-Architecture-Review-v1.0.md)
- [`../Nexus-DataHub-Verity-Assets.md`](../Nexus-DataHub-Verity-Assets.md)
- [`../architecture/README.md`](../architecture/README.md)
- [`../../examples/README.md`](../../examples/README.md)

## Historical Evidence Classes

The submission material distinguished three evidence classes. These definitions remain useful when reading the archived documents:

### Deterministic fixture

A repeatable Nexus-owned scenario used to demonstrate continuity logic. It does not prove that an external provider was available or mutated.

### Planned contract

A proposed structure such as Context Package or Outcome Write-back. A planned contract is not automatically implemented runtime behavior.

### Verified runtime

Captured evidence from a target environment showing the real external source, allowed mutation, fresh re-read, and resulting state.

## Reading the Old Checklists

Unchecked boxes or “still requiring” sections in files in this directory describe the state **during submission preparation**. They should not be copied into the current Nexus backlog without first checking the present code, tests, and current product direction.

For current project orientation, start at [`../README.md`](../README.md) and the repository root [`README.md`](../../README.md).
