# Nexus Atlas Phase 5F — Phase 5 Acceptance Test Matrix v0.1

**Status:** Blocking acceptance matrix  
**Target:** Phase 5A–5E Product Surface closure  
**Contract:** `docs/Nexus-Atlas-v0.1-Phase5-Acceptance-Contract.md`

Every case below is blocking. Phase 5F has no partial-pass acceptance state.

## A. Baseline and frozen-boundary integrity

| ID | Case | Expected |
|---|---|---|
| 5F-A01 | `main` baseline | remains the accepted Phase 4 merge baseline before Phase 5 merge |
| 5F-A02 | Phase 5D frozen closure | accepted SHA remains reachable and unchanged |
| 5F-A03 | Phase 5E Runtime frozen closure | projector/validator Runtime remains unchanged from `87abd8cf...` |
| 5F-A04 | Phase 4B–4E runtime files | no unauthorized Phase 5F semantic modification |
| 5F-A05 | Resolver / Ledger / Context Graph Validator | no unauthorized Phase 5F semantic modification |
| 5F-A06 | accepted Product Surface semantics | no convenience re-resolution or promotion added in Phase 5F |
| 5F-A07 | accepted Source Intake Review semantics | no convenience Apply/persistence/promotion added in Phase 5F |
| 5F-A08 | Phase 5F change scope | limited to acceptance/docs/tests/scripts/package/status unless an explicit blocker is documented |

## B. Self-Context Product Surface authority and truthfulness

| ID | Case | Expected |
|---|---|---|
| 5F-B01 | effective Decisions | remain governed by accepted Resolver/Ledger output, not browser/projector recomputation |
| 5F-B02 | historical Decisions | remain historical and are not promoted to effective by presentation logic |
| 5F-B03 | confirmed Memories | remain distinct from inferred/disputed/historical Memory states |
| 5F-B04 | inferred Identity | never rendered or normalized as user-confirmed Identity |
| 5F-B05 | stale Evidence | remains distinguishable from current Evidence and is not normalized to false/current |
| 5F-B06 | disputed state | cannot silently replace accepted current/effective state |
| 5F-B07 | Product Surface upstream mutation | projector leaves Graph, Ledger, Provider result and Context Package unchanged |
| 5F-B08 | restricted/omitted data | downstream Product Surface does not reconstruct omitted or restricted content |

## C. Inspector, provenance and governance boundary

| ID | Case | Expected |
|---|---|---|
| 5F-C01 | Inspector authority | `inspectorIndex` remains sole inspectability authority for migrated Desk |
| 5F-C02 | unknown/unindexed Inspector target | fails closed with no Graph/provider/source fallback |
| 5F-C03 | related-context navigation | cannot bypass accepted Inspector index |
| 5F-C04 | provenance preservation | provider/reference/capturedAt/retrieval/authority remain bounded and truthful where accepted |
| 5F-C05 | unsafe provenance | no credentials, credential-bearing URL, query/fragment secret or local path reaches browser surface |
| 5F-C06 | governance preservation | sensitivity/inheritance/confirmation semantics survive downstream projection without reinterpretation |
| 5F-C07 | source-local authority | never displayed as human-confirmed or canonical authority |
| 5F-C08 | omitted privacy classification | `sensitivity === null` in Source Intake Review is treated as unavailable/not supplied, not safe/public |

## D. Source Intake Review and admission-preview boundary

| ID | Case | Expected |
|---|---|---|
| 5F-D01 | Candidate identity | browser/runtime preserve accepted upstream `candidateId` / `sourceRecordId` pairing exactly |
| 5F-D02 | explicit-only selection | omitted/empty selection never becomes select-all |
| 5F-D03 | local browser selection | remains ephemeral presentation/review state and does not mutate accepted snapshot |
| 5F-D04 | selection vs authorization | selected Candidate is not treated as persistent canonical authorization or Apply permission |
| 5F-D05 | admission decisions | `insert/noop/conflict/deferred` are copied from accepted admission preview and not recomputed in browser |
| 5F-D06 | no-Graph reconciliation | `not-run` mode invents no insert/noop/conflict decisions |
| 5F-D07 | Candidate semantic boundary | Candidate Evidence cannot silently become Identity/Decision/Memory/Action/Project truth |
| 5F-D08 | Apply boundary | Product Surface remains `applyAllowed: false`; browser has no Canonical Admission Apply path |

## E. Browser capability, snapshot and route boundary

| ID | Case | Expected |
|---|---|---|
| 5F-E01 | Product Surface browser snapshot | deep-equal to accepted Node projection pipeline output |
| 5F-E02 | Source Intake Review browser snapshot | deep-equal to frozen review projector output over accepted artifacts |
| 5F-E03 | browser governance execution | browser does not import/run Node-only Resolver/Ledger/Provider/admission governance logic |
| 5F-E04 | live source capability | no OAuth, arbitrary live source connection, account/repository scanning or source polling/refresh |
| 5F-E05 | persistent capability | no browser POST/persistent canonical write/Graph mutation/Edge creation/semantic promotion |
| 5F-E06 | browser storage | no `localStorage` persistence of accepted/canonical state; ephemeral local UI state remains separate |
| 5F-E07 | route split | Desk and `#source-intake` remain migrated Product Surfaces while Map/Territory/Re-entry legacy boundaries remain explicit |
| 5F-E08 | legacy route compatibility | Map, Territory Workspace and Re-entry still load without being falsely claimed as migrated Product Surface paths |

## F. Regression, closure and merge readiness

| ID | Case | Expected |
|---|---|---|
| 5F-F01 | dedicated Phase 5F verifier | all blocking executable acceptance checks PASS |
| 5F-F02 | Phase 5C dedicated regressions | Product Surface projector + Desk acceptance PASS |
| 5F-F03 | Phase 5D dedicated regression | Canonical Inspector / Identity acceptance PASS |
| 5F-F04 | Phase 5E dedicated regressions | Source Intake Review runtime + browser acceptance PASS |
| 5F-F05 | Phase 4F dedicated acceptance | PASS without reopening frozen Phase 4 runtime |
| 5F-F06 | full Node suite + repository check | all Node tests PASS and `npm run check` PASS |
| 5F-F07 | exact closure SHA clean-checkout CI | GitHub Actions SUCCESS on the exact Phase 5 accepted/frozen closure SHA |
| 5F-F08 | PR #13 merge readiness | open/mergeable, no acceptance blocker; only after acceptance may it leave Draft and merge without feature drift |

## Execution policy

The dedicated Phase 5F verifier should translate these cases into real behavioral/cross-layer checks wherever possible.

Use source/static assertions only for architecture-absence cases where behavior cannot be exercised without introducing the forbidden capability itself, for example proving that the browser contains no Apply, OAuth, live source transport or persistence wiring.

Existing Phase 5C–5E dedicated suites may be invoked as evidence, but Phase 5F must add cross-layer assertions that prove the accepted phases compose without authority or capability drift. Merely rerunning old suites is not sufficient.

## Acceptance rule

All 48 cases are blocking.

- **48/48 PASS** → Phase 5F may proceed to exact-SHA clean-checkout closure review.
- **Any failure** → Phase 5 remains In Progress; diagnose the violated boundary and resolve it explicitly before closure.
