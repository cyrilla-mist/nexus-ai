# Nexus Atlas — Source Snapshot v0.1 Test Matrix

**Status:** Accepted
**Target:** Phase 4D
**Total Cases:** 36  
**Runtime:** Phase 4C automated suite accepted

This matrix is the human-readable mirror of `examples/nexus-atlas-source-snapshot-cases-v0.1.json`. Each row states the expected outcome, records, diagnostics and behavior assertions; all 36 cases are executed by `tests/source-snapshot-catalog-v01.test.mjs`.

| Case ID | Category | Input State | Expected Snapshot | Expected Records | Expected Diagnostics | Expected Error | Behavior Assertions | Rationale |
|---|---|---|---|---|---|---|---|---|
| SS-S01 | schema | Minimal valid available Snapshot with core singletons | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | valid bounded; complete=true | — | deep-equal; no-canonical-fields; stable-source-identity | Minimum success includes repository and default branch |
| SS-S02 | schema | snapshotVersion missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Version required |
| SS-S03 | schema | snapshotVersion 0.2 | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Reject wrong contract version |
| SS-S04 | schema | adapter empty or uppercase | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Lowercase adapter identifier |
| SS-S05 | schema | capturedAt not offset-aware ISO 8601 | error | none | none | INVALID_CAPTURED_AT | no-empty-error-snapshot | Unambiguous capture time |
| SS-S06 | schema | source object missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Source identity/state required |
| SS-S07 | schema | records is not an array | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Normalized collection required |
| SS-S08 | schema | diagnostics collection field missing | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Bounds must be explicit |
| SS-P01 | scope | Mixed-case explicit input normalizes to synthetic/example | success; v0.1; available; repositoryRef=synthetic/example | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | requested=applied; complete=true | — | stable-source-identity; bounded-truncation-explicit | Canonical repository identity |
| SS-P02 | scope | Empty repositoryRef | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | Empty scope invalid |
| SS-P03 | scope | GitHub URL repositoryRef | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | URL is not lexical scope |
| SS-P04 | scope | Extra /issues segment | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | No sub-resource scope |
| SS-P05 | scope | Indirect selector my project | error | none | none | INVALID_REPOSITORY_REF | no-empty-error-snapshot | No repository guessing |
| SS-P06 | scope | commits limit is -1 | error | none | none | INVALID_ADAPTER_OPTIONS | no-empty-error-snapshot | Negative is not unlimited |
| SS-P07 | scope | Request exceeds configuredHardMaximum | error | none | none | INVALID_ADAPTER_OPTIONS | no-empty-error-snapshot | Invalid options, not truncation |
| SS-R01 | records | Seven GitHub record types normalized | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, `github:issue:synthetic/example:1`, `github:pr:synthetic/example:2`, `github:release:synthetic/example:release-1`, `github:tag:synthetic/example:v0.1.0` | valid bounded | — | stable-source-identity; source-authority-only | Profile coverage and core invariant |
| SS-R02 | records | Duplicate sourceRecordId | error | none | none | SOURCE_SNAPSHOT_INVALID | stable-source-identity; no-empty-error-snapshot | IDs unique within Snapshot |
| SS-R03 | records | Unknown sourceType github_discussion | error | none | none | SOURCE_SNAPSHOT_INVALID | no-empty-error-snapshot | Closed profile type set |
| SS-R04 | records | Record ID uses another repository | error | none | none | SOURCE_SCOPE_MISMATCH | stable-source-identity; no-empty-error-snapshot | Identity stays in scope |
| SS-R05 | records | Commit response includes author email | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | no-sensitive-leak; no-canonical-fields | Email excluded; singletons retained |
| SS-R06 | records | Issue/PR responses include bodies | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:issue:synthetic/example:1`, `github:pr:synthetic/example:2` | valid bounded | — | no-sensitive-leak; no-canonical-fields | Bodies excluded; singletons retained |
| SS-R07 | records | API response order changes | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | order-independent; deep-equal | Contract order wins |
| SS-R08 | records | Type-specific source event times | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, `github:issue:synthetic/example:1`, `github:tag:synthetic/example:v0.1.0` | valid bounded | — | source-time-preserved; deep-equal | observedAt is type-specific |
| SS-R09 | records | Default branch HEAD absent | error | none | none | SOURCE_RESPONSE_INVALID | no-empty-error-snapshot | Singleton coherence required |
| SS-G01 | governance/safety | Token/header in source response | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | valid bounded | — | no-sensitive-leak; input-unchanged | Credentials transport-only |
| SS-G02 | governance/safety | Payload attempts ContextNode fields | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | no-canonical-fields; planner-boundary-preserved | Source-native records |
| SS-G03 | governance/safety | GitHub source-local authority | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | source-authority-only; planner-boundary-preserved | No human authority promotion |
| SS-G04 | governance/safety | Older issue absent from bounded query | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | bounded scope explicit | — | bounded-truncation-explicit; no-canonical-fields | Absence is not deletion |
| SS-G05 | governance/safety | Normal limit reached | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | complete=true; truncated=true; continuationAvailable=true | — | bounded-truncation-explicit | Truncation is diagnostic and complete remains true |
| SS-G06 | governance/safety | Network unavailable | error | none | none | SOURCE_UNAVAILABLE | no-empty-error-snapshot | Unavailable is Error |
| SS-C01 | determinism/compatibility | Same response/options/capturedAt twice; mixed-case input canonicalizes identically | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | identical bounded diagnostics | — | deep-equal; stable-source-identity | Same canonical identity, same output |
| SS-C02 | determinism/compatibility | Successful Snapshot returned | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | valid bounded | — | deeply-frozen; no-canonical-fields | Immutable observation |
| SS-C03 | determinism/compatibility | Mutable response passed to normalizer | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main` | valid bounded | — | input-unchanged; deep-equal | Do not mutate input |
| SS-C04 | determinism/compatibility | Raw collections permuted | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | order-independent; deep-equal | Response order irrelevant |
| SS-C05 | determinism/compatibility | capturedAt differs from committedAt | success; v0.1; available | `github:repo:synthetic/example`, `github:branch:synthetic/example:main`, `github:commit:synthetic/example:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | valid bounded | — | source-time-preserved; deep-equal | Separate time semantics |
| SS-C06 | determinism/compatibility | importPlan/canonicalGraph/contextPackage present | error | none | none | SOURCE_SNAPSHOT_INVALID | planner-boundary-preserved; no-canonical-fields; no-empty-error-snapshot | Snapshot is Planner input |

## Behavior Assertion Vocabulary

The closed assertion vocabulary is:

`deep-equal`, `deeply-frozen`, `input-unchanged`, `order-independent`, `source-authority-only`, `no-sensitive-leak`, `no-canonical-fields`, `stable-source-identity`, `source-time-preserved`, `bounded-truncation-explicit`, `no-empty-error-snapshot`, `planner-boundary-preserved`.

## Matrix Rules

- Every success case has at least one behavior assertion.
- `Expected Records` is the exact expected Snapshot record ID list; abbreviated prose is not a substitute for IDs.
- Every error case names an error from the Contract vocabulary.
- Normal bounded truncation is a successful diagnostic; it is not `SOURCE_PAGINATION_LIMIT`.
- Source unavailable, authorization failure and not-found are errors, never empty successful Snapshots.
- No case authorizes a ContextNode, Graph, Package, Import Plan, OAuth, Token or external mutation.
