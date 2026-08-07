# Nexus Atlas — Context Import Plan v0.1 Test Matrix

**Status:** Proposed for Phase 4D acceptance  
**Target:** Phase 4D Planner Runtime  
**Total Cases:** 32  
**Runtime:** Not implemented

This matrix expands every catalog case with expected Plan, Candidate, Exclusion, error, behavior, and rationale semantics. It is aligned one-to-one with the 32 IDs in the Case Catalog.

| Case ID | Category | Input State | Expected Plan | Expected Candidates | Expected Exclusions | Expected Error | Behavior Assertions | Rationale |
|---|---|---|---|---|---|---|---|---|
| IP-S01 | schema | minimal valid repository + default branch Snapshot | success; Plan 0.1; 2 evidence candidates | none | none | deep-equal; coverage-complete; no-canonical-write | smallest accepted GitHub input maps both core records |
| IP-S02 | schema | planVersion omitted | none | none | IMPORT_PLAN_INVALID | none | top-level schema is closed |
| IP-S03 | schema | planVersion 0.2 | none | none | IMPORT_PLAN_INVALID | none | only 0.1 is accepted |
| IP-S04 | schema | generatedAt differs from Snapshot capturedAt | none | none | IMPORT_PLAN_SOURCE_MISMATCH | none | generatedAt must equal capture time |
| IP-S05 | schema | sourceSnapshot descriptor has invalid recordIds | none | none | IMPORT_PLAN_INVALID | none | descriptor is structural |
| IP-S06 | schema | candidates is not an array | none | none | IMPORT_PLAN_INVALID | none | candidate collection is required |
| IP-S07 | schema | diagnostic counts disagree with candidates | none | none | IMPORT_PLAN_INVALID | none | diagnostics are structural |
| IP-P01 | input/scope | accepted eight-record GitHub Snapshot + valid policy/project/scope | success; Plan 0.1; 8 evidence candidates | none | none | deep-equal; deeply-frozen; input-unchanged; coverage-complete; one-to-one-source-mapping; source-authority-preserved; no-semantic-promotion; no-canonical-write; source-time-preserved; free-text-not-promoted; stable-candidate-identity; diagnostics-consistent | all seven source types are accepted |
| IP-P02 | input/scope | policyVersion v2 | none | none | INVALID_POLICY_VERSION | none | policy is explicit |
| IP-P03 | input/scope | empty projectId | none | none | INVALID_PROJECT_ID | none | target identity cannot default |
| IP-P04 | input/scope | empty scopeKey | none | none | INVALID_SCOPE_KEY | none | target scope cannot default |
| IP-P05 | input/scope | invalid or unvalidated Snapshot | none | none | INVALID_SOURCE_SNAPSHOT | none | Planner accepts validated Snapshot only |
| IP-P06 | input/scope | valid generic Snapshot with unsupported adapter | none | none | SOURCE_SNAPSHOT_UNSUPPORTED | none | fails locally; no network |
| IP-M01 | mapping | all seven GitHub source types | success; 7 evidence candidates; one per record | none | none | one-to-one-source-mapping; coverage-complete; stable-candidate-identity | closed sourceType-to-rule mapping |
| IP-M02 | mapping | same Source Record planned twice with same inputs | success; stable single candidate | none | none | deep-equal; stable-candidate-identity; input-unchanged | identity excludes time/title/index |
| IP-M03 | mapping | repository available | success; repository evidence candidate | none | none | source-authority-preserved; source-time-preserved; no-semantic-promotion | preserves source state/time |
| IP-M04 | mapping | branch with headSha and observedAt null | success; branch evidence candidate | none | none | source-time-preserved; source-authority-preserved; no-semantic-promotion | null source time stays null |
| IP-M05 | mapping | commit includes messageHeadline | success; commit evidence candidate | none | none | free-text-not-promoted; source-authority-preserved; stable-candidate-identity | message text excluded |
| IP-M06 | mapping | Issue title plus open state | success; Issue evidence candidate | none | none | free-text-not-promoted; no-semantic-promotion; no-canonical-write | Issue never becomes Action |
| IP-M07 | mapping | merged pull request | success; PR evidence candidate | none | none | no-semantic-promotion; source-authority-preserved; no-canonical-write | merged is source-local |
| IP-M08 | mapping | published release v0.1.0 | success; release evidence candidate | none | none | no-semantic-promotion; source-time-preserved; source-authority-preserved | does not set currentVersion |
| IP-M09 | mapping | tag with targetSha | success; tag evidence candidate | none | none | source-authority-preserved; no-semantic-promotion; stable-candidate-identity | preserves target without promotion |
| IP-G01 | governance/safety | accepted eight-record Snapshot | success; 8 evidence candidates; canonicalWriteAllowed false | none | none | no-canonical-write; no-semantic-promotion; coverage-complete | all candidates remain proposals |
| IP-G02 | governance/safety | accepted eight-record Snapshot | success; targetKind evidence for all | none | none | no-semantic-promotion; source-authority-preserved | GitHub v1 only proposes evidence |
| IP-G03 | governance/safety | open Issue with Action-like title | success; one evidence candidate | none | none | no-semantic-promotion; free-text-not-promoted; no-canonical-write | no Action/Goal/Decision |
| IP-G04 | governance/safety | merged PR with completion-like title | success; one evidence candidate | none | none | no-semantic-promotion; no-canonical-write | no Phase/Milestone completion |
| IP-G05 | governance/safety | commit, Issue, PR, Release source free text | success; evidence candidates with mechanical claims | none | none | free-text-not-promoted; no-semantic-promotion | free text is not semantic truth |
| IP-G06 | governance/safety | complete provenance fields | success; provenance on each candidate | none | none | source-authority-preserved; source-time-preserved; no-canonical-write | no human authority invented |
| IP-C01 | determinism/coverage | run identical input twice | success; identical 8-candidate Plan | none | none | deep-equal; stable-candidate-identity; diagnostics-consistent | pure transformation |
| IP-C02 | determinism/coverage | inspect input after planning; mutate output attempt | success; unchanged input; frozen output | none | none | input-unchanged; deeply-frozen; no-canonical-write | immutability boundary |
| IP-C03 | determinism/coverage | Snapshot in accepted global order | success; candidates in same 8-record order | none | none | one-to-one-source-mapping; stable-candidate-identity; coverage-complete | ordering follows Snapshot |
| IP-C04 | determinism/coverage | 8 records partitioned with consistent diagnostics | success; 8 candidates; 0 exclusions; coverage true | none | none | coverage-complete; one-to-one-source-mapping; diagnostics-consistent | exact partition and sums |

