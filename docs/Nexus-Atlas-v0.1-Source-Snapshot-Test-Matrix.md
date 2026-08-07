# Nexus Atlas — Source Snapshot v0.1 Test Matrix

**Status:** Proposed for Phase 4B acceptance  
**Target:** Phase 4C  
**Total Cases:** 36  
**Runtime:** Not implemented

This matrix is the human-readable mirror of `examples/nexus-atlas-source-snapshot-cases-v0.1.json`. Each row states the expected outcome, records, diagnostics and behavior assertions; the Catalog is the machine-readable source for future Phase 4C execution.

| Case ID | Category | Input State | Expected Snapshot | Expected Records | Expected Diagnostics | Expected Error | Behavior Assertions | Rationale |
|---|---|---|---|---|---|---|---|---|
| SS-S01 | schema | Minimal valid available Snapshot | success; v0.1; available | repo synthetic/example | valid bounded | — | deep-equal; no-canonical-fields | Minimum top-level contract |
| SS-S02 | schema | snapshotVersion missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Version required |
| SS-S03 | schema | snapshotVersion 0.2 | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Reject wrong contract version |
| SS-S04 | schema | adapter empty or uppercase | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Lowercase adapter identifier |
| SS-S05 | schema | capturedAt not offset-aware ISO 8601 | error | none | none | INVALID_CAPTURED_AT | no-empty-error-snapshot | Unambiguous capture time |
| SS-S06 | schema | source object missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Source identity/state required |
| SS-S07 | schema | records is not an array | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Normalized collection required |
| SS-S08 | schema | diagnostics collection field missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Bounds must be explicit |
| SS-P01 | scope | One explicit repositoryRef and finite limits | success; v0.1; available | github:repo:synthetic/example | requested/applied limits | — | stable-source-identity; bounded-truncation-explicit | One repository scope |
| SS-P02 | scope | Empty repositoryRef | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | Empty scope invalid |
| SS-P03 | scope | GitHub URL repositoryRef | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | URL is not lexical scope |
| SS-P04 | scope | Extra /issues segment | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | No sub-resource scope |
| SS-P05 | scope | Indirect selector my project | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | No repository guessing |
| SS-P06 | scope | commits limit is -1 | error | none | none | INVALID_ADAPTER_OPTIONS | no-empty-error-snapshot | Negative is not unlimited |
| SS-P07 | scope | Request exceeds configuredHardMaximum | error | none | none | INVALID_ADAPTER_OPTIONS | bounded-truncation-explicit; no-empty-error-snapshot | Enforce versioned maximum |
| SS-R01 | records | Seven GitHub record types normalized | success; v0.1; available | repo, branch, commit, issue, pr, release, tag synthetic IDs | valid bounded | — | stable-source-identity; source-authority-only | Profile coverage |
| SS-R02 | records | Duplicate sourceRecordId | error | none | none | SOURCE_SNAPSHOT_INVALID | stable-source-identity; no-empty-error-snapshot | IDs unique within Snapshot |
| SS-R03 | records | Unknown sourceType github_discussion | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Closed profile type set |
| SS-R04 | records | Record ID uses another repository | error | none | none | SOURCE_SCOPE_MISMATCH | stable-source-identity; no-empty-error-snapshot | Identity stays in scope |
| SS-R05 | records | Commit response includes author email | success; v0.1; available | synthetic commit | valid bounded | — | no-sensitive-leak; no-canonical-fields | Email not projected |
| SS-R06 | records | Issue/PR responses include bodies | success; v0.1; available | synthetic issue and PR | valid bounded | — | no-sensitive-leak; no-canonical-fields | Bodies excluded v0.1 |
| SS-R07 | records | API response order changes | success; v0.1; available | repo, branch, commit synthetic IDs | valid bounded | — | order-independent; deep-equal | Contract order wins |
| SS-R08 | records | Type-specific source event times | success; v0.1; available | commit, issue, tag synthetic IDs | valid bounded | — | source-time-preserved; deep-equal | observedAt is type-specific |
| SS-R09 | records | Default branch HEAD absent | error | none | none | SOURCE_RESPONSE_INVALID | no-empty-error-snapshot | Singleton coherence required |
| SS-G01 | governance_safety | Token/header in source response | success; v0.1; available | synthetic repo | valid bounded | — | no-sensitive-leak; input-unchanged | Credentials transport-only |
| SS-G02 | governance_safety | Payload attempts ContextNode fields | success; v0.1; available | synthetic commit | valid bounded | — | no-canonical-fields; planner-boundary-preserved | Source-native records |
| SS-G03 | governance_safety | GitHub source-local authority | success; v0.1; available | synthetic commit | valid bounded | — | source-authority-only; planner-boundary-preserved | No human authority promotion |
| SS-G04 | governance_safety | Older issue absent from bounded query | success; v0.1; available | none in bounded result | bounded scope explicit | — | bounded-truncation-explicit; no-canonical-fields | Absence is not deletion |
| SS-G05 | governance_safety | Normal limit reached | success; v0.1; available | synthetic commit | truncated=true; continuation available | — | bounded-truncation-explicit; no-empty-error-snapshot | Truncation is diagnostic |
| SS-G06 | governance_safety | Network unavailable | error | none | none | SOURCE_UNAVAILABLE | no-empty-error-snapshot | Unavailable is Error |
| SS-C01 | determinism_compatibility | Same response/options/capturedAt twice | success; v0.1; available | synthetic repo | identical bounded diagnostics | — | deep-equal; stable-source-identity | Same inputs, same output |
| SS-C02 | determinism_compatibility | Successful Snapshot returned | success; v0.1; available | synthetic repo | valid bounded | — | deeply-frozen; no-canonical-fields | Immutable observation |
| SS-C03 | determinism_compatibility | Mutable response passed to normalizer | success; v0.1; available | synthetic repo | valid bounded | — | input-unchanged; deep-equal | Do not mutate input |
| SS-C04 | determinism_compatibility | Raw collections permuted | success; v0.1; available | repo, branch, commit synthetic IDs | valid bounded | — | order-independent; deep-equal | Response order irrelevant |
| SS-C05 | determinism_compatibility | capturedAt differs from committedAt | success; v0.1; available | synthetic commit | valid bounded | — | source-time-preserved; deep-equal | Separate time semantics |
| SS-C06 | determinism_compatibility | importPlan/canonicalGraph/contextPackage present | error | none | none | SOURCE_SNAPSHOT_INVALID | planner-boundary-preserved; no-canonical-fields; no-empty-error-snapshot | Snapshot is Planner input |

## Behavior Assertion Vocabulary

The closed assertion vocabulary is:

`deep-equal`, `deeply-frozen`, `input-unchanged`, `order-independent`, `source-authority-only`, `no-sensitive-leak`, `no-canonical-fields`, `stable-source-identity`, `source-time-preserved`, `bounded-truncation-explicit`, `no-empty-error-snapshot`, `planner-boundary-preserved`.

## Matrix Rules

- Every success case has at least one behavior assertion.
- Every error case names an error from the Contract vocabulary.
- Normal bounded truncation is a successful diagnostic; it is not `SOURCE_PAGINATION_LIMIT`.
- Source unavailable, authorization failure and not-found are errors, never empty successful Snapshots.
- No case authorizes a ContextNode, Graph, Package, Import Plan, OAuth, Token or external mutation.
