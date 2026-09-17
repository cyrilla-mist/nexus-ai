# Nexus Atlas v0.1 — Continuity Inspector / History Contract

**Status:** Binding Phase 8D contract  
**Parent:** Phase 8 — Continuity Product Surface

## 1. Purpose

Phase 8D adds bounded read-only detail inspection to the accepted `#continuity` Product Surface without expanding the Phase 8A browser schema or Phase 6/7 authority model.

## 2. Source boundary

The Inspector reads only the same accepted Phase 8B static browser snapshot used by the Continuity Desk:

```text
examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json
```

It may not fetch raw Trusted Checkpoint, Outcome, Fresh Evidence Window, provider responses, D1 rows, DataHub entities, GitHub APIs, or legacy Re-entry state.

## 3. Inspectable targets

The initial bounded targets are:

- Resume State;
- latest Outcome;
- Trusted Checkpoint summary;
- Cross-source Verification summary;
- Write-back Safety summary;
- each bounded Outcome history summary record;
- each bounded Trusted Checkpoint history summary record.

Unknown targets fail closed to an unavailable detail message. There is no raw-source fallback.

## 4. Detail field boundary

Inspector detail must remain a subset of the accepted Phase 8A browser projection.

It may display the fields already present in:

```text
resumeState
latestOutcome
trustedCheckpoint
verification
writebackSafety
history.*.records[*]
```

It must not reconstruct omitted fields or import upstream validators/providers into the browser.

## 5. Interaction boundary

Inspect controls may only change ephemeral DOM selection / panel-open state.

They must not use:

- LocalStorage / SessionStorage;
- POST / PUT / PATCH / DELETE;
- D1 writes;
- checkpoint writes;
- Human Authority submission;
- external execution;
- Canonical Context mutation.

Closing the Inspector discards local detail state.

## 6. Route loading

`atlas-entry.js` loads the Inspector module only when `#continuity` owns the route.

The module must not run on Desk, Source Intake, Map, Territory or legacy Re-entry routes.

## 7. Acceptance

Phase 8D is accepted only if tests prove same-snapshot-only transport, bounded detail fields, no persistence/mutation path, unknown-target failure closure, accessible inspect controls, history summary-only behavior, and Phase 8C/8B/8A plus frozen Phase 5/4 regressions remain green.
