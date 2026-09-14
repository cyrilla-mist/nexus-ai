# Nexus Atlas v0.1 — Real Continuity Loop Test Matrix

**Status:** Binding Phase 6 design matrix  
**Implementation:** Not started  
**Cases:** 40 blocking cases

This matrix defines the minimum behavior Phase 6 implementation must later prove. It is not an executable test suite yet.

---

## A. Trusted Checkpoint — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| A01 | Initial Alignment proposes a checkpoint from accepted current Nexus state and user confirms it | durable checkpoint is written, versioned, then read back exactly enough to prove the trusted continuation boundary |
| A02 | Proposed checkpoint contains an inferred direction that the user did not confirm | checkpoint creation is rejected or remains untrusted; inference cannot become explicit confirmation |
| A03 | Checkpoint references unknown / invalid governing IDs | validation fails closed; no trusted checkpoint is committed |
| A04 | Same successful checkpoint write is replayed with the same idempotency identity | no duplicate trusted checkpoint is created |
| A05 | A writer attempts to commit against a stale checkpoint version | compare-and-swap / version protection rejects the stale write without overwriting newer trusted state |

---

## B. Fresh Evidence / Source Boundary — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| B01 | GitHub source is available and returns bounded records after the checkpoint cursor | Fresh Evidence Batch is accepted with deterministic identities, source scope and cursor boundaries |
| B02 | GitHub source is unavailable | run becomes `blocked/source-unavailable`; continuity validity is not invented and no authority question is asked |
| B03 | A required project fact is genuinely absent | run becomes `blocked/required-evidence-missing` when that fact is required to assess continuation; absence is not treated as transport failure |
| B04 | Source response is malformed / violates accepted schema | run becomes `blocked/evidence-invalid`; malformed input cannot enter model interpretation |
| B05 | Internal Nexus checkpoint/output/evaluation artifacts are returned by a broad source query but lie outside the accepted source scope | they are excluded and cannot influence the Fresh Evidence Batch |

---

## C. Continuity Validity — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| C01 | Fresh changes exist but do not invalidate protected direction or accepted next action | assessment is `VALID`; changes are surfaced without creating a false conflict |
| C02 | Accepted next action is no longer valid, but the governing direction still holds and evidence determines one bounded replacement | assessment is `INVALID`; only the invalidated action is replaced and preserved state remains explicit |
| C03 | Fresh accepted evidence conflicts with protected project direction and existing authority cannot choose safely | assessment is `AMBIGUOUS`; exactly one protected ambiguity is identified |
| C04 | No meaningful project change occurred | assessment may remain `VALID`; Nexus must not invent changes, actions or checkpoints simply to appear useful |
| C05 | Source transport succeeded but accepted evidence is insufficient to support any safe assessment | run is blocked for evidence insufficiency / missing requirement rather than mislabeled `AMBIGUOUS` |

---

## D. Human Authority Gate — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| D01 | `VALID` assessment requires no protected choice | zero authority questions are asked |
| D02 | `INVALID` assessment has one bounded replacement already supported by accepted authority | zero ambiguity questions are asked; the system does not unnecessarily offload evidence-determined work to the user |
| D03 | `AMBIGUOUS` assessment contains one consequential protected choice | one bounded question is asked with options tied to the actual ambiguity |
| D04 | Model output attempts to choose the protected option before user response | deterministic authority validation rejects the choice and keeps the run unresolved |
| D05 | A previous user choice resembles the current ambiguity | previous choice is not reused as consent; current protected choice still requires explicit authority |

---

## E. Re-entry Package / Continuation Plan — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| E01 | `VALID` run produces a continuation package | package clearly separates `whatChanged` from `whatStillHolds` and preserves the accepted next action when still valid |
| E02 | `INVALID` run has a bounded replacement | package contains exactly one bounded next action and identifies which prior action / assumption became invalid |
| E03 | `AMBIGUOUS` run before authority decision | no trusted final next action is emitted; package remains awaiting authority |
| E04 | Run is blocked by checkpoint/evidence failure | no trusted Re-entry Package / bounded action is produced |
| E05 | Proposed action has no predeclared observable postcondition | package validation fails; an action that cannot later be verified is not eligible for the Phase 6 loop |

---

## F. Real Action / Outcome Verification — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| F01 | User/external tool performs the bounded action and fresh authoritative evidence proves the expected postcondition | Outcome is `verified` with deterministic verification evidence refs |
| F02 | External action reports success but fresh evidence proves the expected postcondition did not occur | Outcome is `failed`; reported success cannot override source reality |
| F03 | Action may have occurred but verification source is unavailable | Outcome is `indeterminate`; no success checkpoint is created |
| F04 | User states that the action succeeded but an authoritative observable postcondition exists and has not been re-read | Outcome cannot be `verified` solely from user assertion |
| F05 | A failed or indeterminate attempt is retried later and new evidence establishes the result | transition is auditable and does not erase the earlier failed/indeterminate state |

---

## G. Next Checkpoint / Replay / Contamination — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| G01 | Verified action changes trusted continuation state | a new trusted checkpoint can be written with governing refs, version protection and read-after-write verification |
| G02 | Outcome is `failed` or `indeterminate` | proposed successful next checkpoint is not created; previous trusted checkpoint remains authoritative by default |
| G03 | Same verified run is replayed | no duplicate Outcome or checkpoint is created and no source record is reclassified as a new change merely due to replay |
| G04 | Prior runtime evidence bundle is supplied where fresh source retrieval is required | bundle cannot substitute for live/current accepted evidence and must be visibly classified as replay/fixture material |
| G05 | Checkpoint/outcome store changes during a run | those internal control-plane changes do not silently contaminate the GitHub project evidence set unless explicitly allowed by source scope |

---

## H. Product Evidence / Compatibility / Exit — 5 cases

| ID | Scenario | Required result |
| --- | --- | --- |
| H01 | One consequential assessment contains multiple findings | every consequential finding resolves to accepted evidence identity; evidence coverage is 100% |
| H02 | One bounded run encounters protected ambiguity | human authority question count is <= 1; a second unrelated question requires a separate bounded run rather than scope expansion |
| H03 | Phase 6 runtime / UI is added | existing Phase 4 and Phase 5 accepted regression suites remain green and Phase 6 does not redefine frozen upstream semantics |
| H04 | Real Nexus continuity run completes | sanitized replayable evidence exists from checkpoint through fresh verification and write read-back; live vs fixture/replay modes are explicit |
| H05 | Phase 6 closure is proposed | acceptance requires `falseContinuityClaims = 0`, `unverifiedSuccessClaims = 0`, `silentProtectedAuthorityGuesses = 0`, verified trusted write read-back, and a later re-entry beginning from the resulting trusted state |

---

# Cross-matrix acceptance rules

All 40 cases are blocking for Phase 6 final acceptance, although some may be proven by deterministic fixtures/adversarial tests and others by the real Nexus run.

The implementation must not satisfy a case by weakening its product meaning. In particular:

- `AMBIGUOUS` cannot become a catch-all error state;
- a successful write response cannot stand in for fresh verification;
- test fixtures cannot be presented as live runtime evidence;
- browser state cannot stand in for human authorization or durable trusted state;
- model confidence cannot stand in for accepted evidence / authority;
- more UI, connectors or projects cannot compensate for an incomplete real loop.

The future executable Phase 6 acceptance suite should preserve these 40 case identities or provide an explicit mapping if implementation splits a case into smaller assertions.