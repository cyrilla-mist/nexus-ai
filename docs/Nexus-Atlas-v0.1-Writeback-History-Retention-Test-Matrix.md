# Nexus Atlas v0.1 — Write-back History + Retention Test Matrix

**Status:** Binding Phase 7D acceptance matrix

The dedicated suite must cover the following behavior. IDs are stable acceptance references; implementation test names may include additional detail.

## A. Retention policy

| ID | Requirement |
| --- | --- |
| 7D-A01 | identical normalized retention inputs produce the same policy identity |
| 7D-A02 | policy output is deeply immutable |
| 7D-A03 | v0.1 retention mode is `retain-all` only |
| 7D-A04 | verified Outcomes are retained |
| 7D-A05 | failed Outcomes are retained |
| 7D-A06 | indeterminate Outcomes are retained |
| 7D-A07 | all Trusted Checkpoint versions are retained |
| 7D-A08 | destructive deletion cannot be enabled |
| 7D-A09 | projectRefs are unique, canonical and allowlisted |
| 7D-A10 | max history page size is positive and capped at 100 |

## B. Logical history page

| ID | Requirement |
| --- | --- |
| 7D-B01 | Outcome history is newest-first by `recordedAt`, then `outcomeId` |
| 7D-B02 | Checkpoint history is newest-version-first |
| 7D-B03 | Outcome pages preserve failed and indeterminate records rather than filtering them |
| 7D-B04 | history is bounded by requested limit |
| 7D-B05 | limit cannot exceed retention-policy bound |
| 7D-B06 | project scope mismatch fails before accepted page construction |
| 7D-B07 | unsupported artifact kind fails closed |
| 7D-B08 | duplicate Outcome identities are rejected |
| 7D-B09 | duplicate Checkpoint identities are rejected |
| 7D-B10 | non-deterministic Outcome order is rejected |
| 7D-B11 | non-descending Checkpoint version order is rejected |
| 7D-B12 | continuation requires a valid next cursor |
| 7D-B13 | final page returns `nextCursor=null` and `truncated=false` |
| 7D-B14 | page identity deterministically binds normalized page content |
| 7D-B15 | history page is deeply immutable |

## C. Phase 6 history adapter

| ID | Requirement |
| --- | --- |
| 7D-C01 | adapter requires existing Outcome and Checkpoint stores with `exportState()` |
| 7D-C02 | adapter surface contains only `listOutcomes` and `listCheckpoints` |
| 7D-C03 | Outcome pagination resumes strictly after the accepted cursor identity |
| 7D-C04 | Checkpoint pagination resumes strictly after the accepted cursor identity |
| 7D-C05 | unknown cursor fails closed |
| 7D-C06 | cross-project read fails closed |
| 7D-C07 | source store state is not mutated by history reads |

## D. Cloudflare D1 history reader

| ID | Requirement |
| --- | --- |
| 7D-D01 | reader requires a D1 binding exposing `withSession()` |
| 7D-D02 | every history read opens `withSession("first-primary")` |
| 7D-D03 | first Outcome page uses newest-first SQL and reads only `limit + 1` |
| 7D-D04 | Outcome continuation resolves cursor anchor before paging |
| 7D-D05 | first Checkpoint page uses version-descending SQL and reads only `limit + 1` |
| 7D-D06 | Checkpoint continuation resolves cursor anchor before paging |
| 7D-D07 | missing Outcome cursor fails `HISTORY_CURSOR_INVALID` |
| 7D-D08 | missing Checkpoint cursor fails `HISTORY_CURSOR_INVALID` |
| 7D-D09 | malformed D1 row fails closed |
| 7D-D10 | invalid JSON payload fails closed |
| 7D-D11 | Outcome payload must pass frozen Outcome validator |
| 7D-D12 | Checkpoint payload must pass frozen Trusted Checkpoint validator |
| 7D-D13 | stored Outcome identity/project/timestamp/digest must bind decoded payload |
| 7D-D14 | stored Checkpoint identity/project/version/timestamp/digest must bind decoded payload |
| 7D-D15 | D1 reader output matches logical Outcome pagination semantics |
| 7D-D16 | D1 reader output matches logical Checkpoint pagination semantics |
| 7D-D17 | D1 history reader exposes no write/delete method |

## E. Safety / frozen-boundary regressions

| ID | Requirement |
| --- | --- |
| 7D-E01 | history read cannot advance Trusted Checkpoint state |
| 7D-E02 | history read cannot create or verify Outcome Records |
| 7D-E03 | history output exposes no provider credential or D1 connection metadata |
| 7D-E04 | Phase 7C durable D1 write-back acceptance remains green |
| 7D-E05 | Phase 7B target/policy acceptance remains green |
| 7D-E06 | Phase 6B checkpoint persistence regression remains green |
| 7D-E07 | Phase 6C evidence/assessment regression remains green |
| 7D-E08 | Phase 6D Human Authority/re-entry regression remains green |
| 7D-E09 | Phase 6E Outcome verification regression remains green |
| 7D-E10 | Phase 6F continuity closure regression remains green |
| 7D-E11 | Phase 5 frozen acceptance remains green |
| 7D-E12 | Phase 4 frozen acceptance remains green |
| 7D-E13 | no browser/UI or production D1 provisioning files are modified |

## Acceptance rule

Phase 7D is accepted only when the dedicated history/retention suite passes together with the full regression chain above. A green dedicated suite alone is insufficient if an upstream frozen boundary regresses.
