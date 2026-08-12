# Nexus Atlas Product Surface v0.1 — Source Mapping and Phase 5C Handoff

**Status:** Phase 5B Mapping Review — Complete / Accepted  
**Contract:** `docs/Nexus-Atlas-v0.1-Product-Surface-Contract.md`

## 1. Accepted Upstream Boundary

The existing Self-Context Provider already returns the complete accepted source bundle required by Product Surface v0.1:

```js
{
  graph,
  decisionMemoryLedger,
  contextPackage,
  generalizedContextPackage,
  sourceInfo
}
```

Phase 5C should consume this provider result through a new Product Surface projector/adapter. It must not make Atlas Desk read canonical JSON, Ledger internals, or repository documents directly.

## 2. Mapping Table

| Product Surface section | Preferred accepted upstream source |
| --- | --- |
| `scope` | generalized Context Package `scope` + explicit Phase 5 view selection |
| `project` | generalized Context Package `project`, cross-checked only against the same accepted provider Graph when needed for state/governance |
| `identity` | generalized Context Package identity classifications + selected Graph records for governance fields |
| `decisions.effective` | generalized Context Package `decisions.effective` |
| `decisions.proposed` | generalized Context Package `decisions.proposed` |
| `decisions.historical` | Decision/Memory Ledger chain classification + accepted Graph records |
| `memories.*` | generalized Context Package `memories` classifications |
| `evidence.*` | generalized Context Package `evidence` classifications |
| `risks` | generalized Context Package risk/open-risk section where available; otherwise selected accepted Graph risk records under package scope |
| `actions` | generalized Context Package next-action/action section where available; otherwise selected accepted Graph action records under package scope |
| `sourceSummary` | generalized Context Package `sourceSummary` plus safe `sourceInfo` mode metadata |
| `inspectorIndex` | deterministic index over records already projected into Product Surface v0.1 |
| `sourceIntakeReview` | future Phase 5E adapter over accepted Source Snapshot / Import Plan / Admission preview only |

The projector may combine accepted outputs from the same Self-Context Provider transaction. It must not independently re-resolve Decision/Memory governance or perform provider/source re-reads.

## 3. Field Normalization

Canonical/Package source fields use `source`; Product Surface uses the normalized field name `provenance`.

Mapping:

```text
source.provider       -> provenance.provider
source.reference      -> provenance.reference
source.capturedAt     -> provenance.capturedAt
source.retrievalMode  -> provenance.retrievalMode
source.authority      -> provenance.authority
```

Canonical state mapping:

```text
lifecycle.state                 -> state.lifecycle
epistemic.verification          -> state.verification
epistemic.freshness             -> state.freshness
```

When generalized package records already flatten these dimensions as `lifecycle`, `verification`, and `freshness`, the projector normalizes them into the same Product Surface `state` object without changing their values.

## 4. Identity Mapping

Generalized Context Package currently represents Identity as classifications such as `confirmed` and `inferred`, while Product Surface v0.1 exposes one `identity` array of Surface Records.

The projector may flatten classifications only if each record retains its original verification value. Flattening is presentation normalization, not semantic promotion.

No Identity record may be created from Evidence, Source Snapshot or GitHub Candidate Evidence.

## 5. Decision Historical Mapping

Generalized Context Package exposes effective/proposed Decisions and decision chains, while the provider also returns the accepted Decision/Memory Ledger and Graph.

`decisions.historical` may therefore be populated only by records already classified as non-effective through accepted chain/ledger semantics. The Product Surface projector must not infer historical status from timestamp recency.

## 6. Known Staleness in the Frozen Default Self-Context Fixture

The existing default fixture:

`examples/nexus-atlas-self-context-v0.2.json`

currently records the Project payload as:

```text
currentPhase = "Phase 3 complete; Phase 4 planned"
```

while the repository has now completed Phase 4 and entered Phase 5.

The same Project record is marked `epistemic.freshness = "current"` in that historical fixture. Therefore it is not safe for the new Phase 5 Desk to present this value as the current project state.

This is a **data-version staleness issue**, not a Product Surface formatting issue.

## 7. Frozen-fixture Preservation Decision

Phase 5C must **not mutate the historical default v0.2 self-context fixture merely to make the new UI look current**.

Reason:

- earlier Phase 1–4 tests and accepted examples use that fixture as historical regression evidence;
- silently rewriting it would blur the evidence boundary between an accepted past fixture and current project state;
- Phase 5 should not reopen frozen foundation evidence for presentation convenience.

## 8. Phase-5-specific Self-Context Fixture

Preferred Phase 5C migration:

1. create a new accepted Phase-5-specific canonical self-context fixture/version;
2. preserve the existing Context Graph contract and Decision/Memory semantics;
3. update project state and add only evidence/decisions/memories/actions that are supported by accepted repository/human evidence;
4. validate it with the existing Context Graph and Decision/Memory validators;
5. load it through the already-supported Self-Context Provider `fixturePath` option;
6. build the generalized Context Package and Product Surface from that provider transaction;
7. leave the historical default v0.2 fixture unchanged for regression tests.

This is a new data snapshot/version, not a new canonical schema.

## 9. Phase 5C Project-state Minimum

The Phase-5-specific fixture must at minimum truthfully represent:

- project: `Nexus Atlas`;
- long-term repository: `cyrilla-mist/nexus-ai`;
- Phase 4 complete/frozen;
- Phase 5 Product Surface in progress;
- Archive Cartography as the binding product visual direction;
- Nexus Self-Context Desk as the first Phase 5 product slice;
- no live GitHub OAuth/transport claim;
- no persistent canonical write claim;
- next accepted implementation step under Phase 5C;
- provenance for every newly introduced record.

Exact wording must come from accepted repository documents/commits or explicit human decisions, not from UI inference.

## 10. Desk Migration Boundary

Phase 5C initially migrates only the `desk` route to Product Surface v0.1.

During that stage:

- `atlas.html` shell remains unchanged unless a small accessibility/data-hook change is required;
- Verity Re-entry remains available;
- Map/Workspace may remain on the existing competition projection temporarily;
- context path/labels on the migrated Desk must use Nexus Self-Context rather than hard-coded Verity;
- no fake multi-project selector is introduced.

## 11. Phase 5B Closure

Phase 5B mapping is accepted because:

- every Product Surface section has an accepted upstream source;
- no section requires provider-specific transport;
- Decision/Memory governance is reused rather than reimplemented;
- provenance/state normalization is mechanical;
- the stale historical self-context fixture is explicitly prevented from masquerading as current data;
- Phase 5C has a migration path that preserves earlier frozen evidence while enabling a current Nexus Self-Context Desk.
