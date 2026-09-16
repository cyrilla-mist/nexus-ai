# Nexus Atlas v0.1 — Write-back Management Surface Contract

**Status:** Binding Phase 7G contract  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization

## 1. Purpose

Phase 7G turns accepted write-back metadata, history and verification outputs into a deterministic **read-only management projection** and proves project isolation across more than one configured project.

It does not add a browser route, write button, delete action, production D1 binding, or real external action against another project.

## 2. Inputs

The builder accepts only already-validated upstream artifacts:

- Phase 7B `WritebackTarget`;
- Phase 7B `WritebackPolicy`;
- Phase 7D `WritebackRetentionPolicy`;
- one Phase 7D Outcome history page;
- one Phase 7D Trusted Checkpoint history page;
- optional Phase 7F Cross-source Verification artifacts;
- explicit `projectRef` and `generatedAt`.

Binding rules:

1. policy target must equal supplied target;
2. requested project must appear in both write-back and retention policy allowlists;
3. target/policy must support both accepted artifact kinds;
4. Outcome history must be `outcome-record` for the requested project;
5. Checkpoint history must be `trusted-checkpoint` for the requested project;
6. both history pages must bind the supplied retention policy;
7. every supplied cross-source verification must bind the requested project;
8. duplicate verification identities fail closed.

## 3. Surface contract

Schema:

```text
nexus-atlas.writeback-management-surface.v0.1
```

The projection exposes bounded summaries only:

```text
project
logical target + capabilities
write-back safety policy
retention policy
Outcome history summary
Checkpoint history summary
cross-source verification counts/profiles
```

Outcome summary fields are limited to:

```text
outcomeRef
verificationState
recordedAt
actionRef
```

Checkpoint summary fields are limited to:

```text
checkpointRef
version
createdAt
nextActionRef
```

The surface does not reproduce full Outcome evidence payloads, checkpoint direction/objective text, raw provider responses, credentials, D1 identifiers, local paths, or hidden execution traces.

## 4. Fixed capabilities

Every v0.1 management surface has:

```text
readOnly = true
writeAllowed = false
deleteAllowed = false
productionProvisioningAllowed = false
canonicalContextWriteAllowed = false
```

This is a product projection, not a new authority boundary.

## 5. Multi-project proof

Phase 7G acceptance uses two isolated project scopes:

```text
project:nexus-atlas
project:phase7g-reference
```

The second project is a synthetic in-repository acceptance fixture only. It is not another real user project and no external repository/service is read or mutated for this proof.

The proof must establish:

- both projects may coexist in one accepted multi-project allowlist;
- Outcome histories remain isolated;
- Checkpoint histories remain isolated;
- one project's history cannot construct the other's management surface;
- one project's Cross-source Verification cannot appear in the other's summary;
- excluding a project from either policy fails closed;
- target/policy and retention/history identity mismatches fail closed.

## 6. Verification summary

Accepted Phase 7F verification artifacts are summarized only as:

```text
total
verified / failed / indeterminate counts
provider/profile counts
```

The management projection does not reinterpret their verification state and does not convert a Phase 7F verification into a durable Outcome.

## 7. Determinism and privacy

Surface identity deterministically binds normalized projected content. Outputs are deeply immutable and builders do not mutate upstream artifacts.

Logical provider kind and declared capabilities may be shown. Connection metadata may not.

## 8. Explicit non-goals

Phase 7G does not implement:

- browser UI;
- write/delete/retention controls;
- production D1 provisioning;
- credential handling;
- generalized durable Outcome creation from Phase 7F verification;
- checkpoint advancement from Phase 7F verification;
- Canonical Context mutation;
- real external actions against a second project;
- autonomous execution.

## 9. Acceptance

Phase 7G is accepted only if the dedicated management/multi-project suite passes together with Phase 7F/7E/7D/7C/7B, Phase 6B–6F, Phase 5 and Phase 4 regressions.

After acceptance, Phase 7 may proceed to **7H — Final Acceptance**.
