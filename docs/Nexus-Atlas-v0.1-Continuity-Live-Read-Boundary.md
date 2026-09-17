# Nexus Atlas v0.1 — Continuity Live Read Boundary

Status: Phase 8E binding contract

## Goal

Phase 8E may let the accepted `#continuity` Product Surface consume a fresh browser-safe Continuity Product Surface through an explicitly requested local live-read transport.

It does **not** expose raw Outcome records, raw Trusted Checkpoints, D1 rows, DataHub records, GitHub API responses, mutation endpoints, Human Authority submission, or external execution to the browser.

## Default remains static

Without an explicit `continuitySource=live` query parameter, Atlas continues to load the accepted Phase 8B static browser snapshot.

Live mode is opt-in. If live mode is requested and unavailable or invalid, Atlas fails closed. It must not silently fall back to the static snapshot or legacy Re-entry.

## Live transport allow-list

The browser may issue one read request only to:

- protocol: `http:`
- host: `127.0.0.1` or `localhost`
- port: `8792`
- path: `/api/continuity/product-surface`
- query/hash/embedded credentials: forbidden
- method: `GET`
- request credentials: omitted
- redirects: rejected

An optional `continuityBridge` query parameter may select between the two allowed loopback host spellings, but cannot expand protocol, host, port, path, query, fragment, or credential authority.

## Live envelope

The live bridge response must have exactly:

```js
{
  version: "nexus-atlas.continuity-product-surface-live-read.v0.1",
  source: "continuity-product-surface-bridge",
  readOnly: true,
  mutationEnabled: false,
  fetchedAt: "<strict offset ISO timestamp>",
  surface: { /* exact Phase 8A Continuity Product Surface */ }
}
```

No additional top-level envelope fields are accepted.

## Browser validation

Before rendering, the browser must validate the complete Phase 8A Product Surface schema, including:

- exact field sets at every exposed level;
- `projectRef === "project:nexus-atlas"` in live mode;
- VALID / INVALID / AMBIGUOUS capability semantics;
- bounded Outcome and Trusted Checkpoint summaries only;
- bounded history summary field sets only;
- verification counts and source-profile totals;
- frozen write-back safety requirements;
- all browser mutation/execution capabilities fixed false;
- deterministic `surfaceId` SHA-256 binding to the received projected payload.

A bridge cannot add hidden raw fields and still pass validation.

## Authority boundary

A successful live read means only:

> the browser received a fresh, validated, read-only projection matching the accepted Product Surface contract.

It does not mean:

- the browser owns the underlying store;
- the browser may write or delete anything;
- a displayed next action is newly authorized;
- an Outcome can be created from browser observation;
- a Trusted Checkpoint can be advanced from browser interaction;
- Human Authority can be inferred or submitted;
- external work was executed.

## Failure behavior

Any unsupported source mode, disallowed URL, HTTP failure, redirect, malformed envelope, weakened safety flag, unexpected field, project-scope mismatch, invalid timestamp, or Product Surface validation failure must terminate the live read and surface an explicit unavailable state.

There is no live-to-static fallback.

## Phase boundary

Phase 8E defines and wires the client-side live-read boundary only. A real local bridge implementation and real store projection may be added only after this boundary is accepted. Local visual/runtime acceptance remains a later Phase 8 step.