# Nexus Atlas v0.1 — Continuity Browser Snapshot Contract

**Status:** Binding Phase 8B contract  
**Parent:** Phase 8 — Continuity Product Surface

## 1. Purpose

Phase 8B freezes one deterministic static browser snapshot for the Nexus Atlas Continuity Product Surface. The snapshot exists so the browser can render accepted continuity semantics without directly reading Phase 6/7 stores, D1, DataHub, GitHub mutation APIs, credentials, or local runtime state.

## 2. Authority

The committed snapshot is not independent truth. Its authority is only that it is mechanically deep-equal to the output of the accepted Phase 8A projector for the deterministic Phase 8 browser fixture.

The fixture must remain explicit about its transport identity: `accepted-static-browser-fixture`.

It must not claim to be a live store read or production persistence state.

## 3. Required fixture semantics

The fixture is scoped to:

```text
project:nexus-atlas
repository: cyrilla-mist/nexus-ai
```

It represents the accepted Phase 8 productization direction after Phase 8A acceptance and contains only browser-safe projected fields.

The fixture must preserve:

- `VALID` continuity state;
- a verified latest Outcome representing accepted Phase 8A projection work;
- one Trusted Checkpoint summary;
- one Outcome history summary;
- empty cross-source verification summary when no accepted cross-source result is supplied to this static fixture;
- read-only write-back safety metadata;
- all Phase 8A non-writing browser capabilities.

## 4. Mechanical equivalence

The committed JSON snapshot must equal:

```text
buildAcceptedContinuityBrowserFixtureV01()
```

using structural deep equality.

Any projector, fixture, or snapshot change that breaks equality fails Phase 8B acceptance.

## 5. Data minimization

The snapshot must not contain:

- secrets, tokens or credentials;
- D1 database identifiers;
- filesystem paths;
- raw provider responses;
- full Outcome observed-postcondition payloads;
- full Trusted Checkpoint governance/provenance payloads;
- hidden reasoning or traces;
- mutation endpoints or authorization material.

## 6. Browser transport boundary

Phase 8B adds no route and no browser runtime behavior. The snapshot may later be fetched by the Phase 8C `#continuity` route as a same-repository static asset.

The browser must treat snapshot loading failure as an explicit unavailable state; it must not silently fall back to legacy Re-entry data or a different authority source.

## 7. Acceptance

Phase 8B is accepted only when:

1. fixture generation succeeds using accepted Phase 6/7/8A validators/builders;
2. committed JSON parses successfully;
3. committed JSON deep-equals freshly generated output;
4. the snapshot passes the accepted Phase 8A surface validator;
5. privacy and no-live-overclaim checks pass;
6. Phase 8A, Phase 7, Phase 6 and frozen Phase 5/4 regressions remain green.
