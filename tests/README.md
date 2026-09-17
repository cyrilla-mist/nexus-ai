# Nexus Atlas Test Suite

The root `tests/` directory spans several generations of Nexus Atlas development. The file names preserve implementation history, but all files discovered by Node's test runner are part of the current regression suite unless explicitly retired.

Run the full suite with:

```bash
npm test
```

The repository CI also runs additional contract, ingestion, and diff-hygiene checks after the Node test suite.

## Test Groups

### Current Atlas product surface

Files prefixed with `atlas-`, `product-surface-`, `source-intake-`, and related names cover the canonical Nexus Atlas browser experience, source intake, inspectors, and product projections.

### Continuity and re-entry

Files prefixed with `continuity-`, `trusted-checkpoint-`, `fresh-evidence-`, `human-authority-`, `outcome-verification-`, and `writeback-` protect the continuity loop and its read/write authority boundaries.

Some tests intentionally preserve versioned contracts such as the fixture-backed `reentry.html` workspace. A historical-looking label is not sufficient reason to remove or rewrite one of these contracts.

### Context and decision memory

Files covering `context-*`, `decision-memory-*`, `self-context-*`, and generalized context packages test the underlying continuity/context model and deterministic projections.

### Verity / DataHub integration

`verity-*`, ownership, DataHub continuity, and ingestion-related tests protect the governed Verity scenario and external-source boundaries.

### Legacy compatibility surfaces

Files such as:

- `star-map.test.js`
- `project-space-workspace.test.js`
- `frontend-project-space.test.js`
- `visual-identity.test.js`

still cover code that remains reachable through explicit legacy/compatibility routes. They are not orphan tests merely because the current flagship identity is Nexus Atlas.

### Phase acceptance records

Tests with names such as `phase3-*`, `phase5-*`, or `phase7-*` originated as phase acceptance gates. Keep them while they continue to assert durable behavior or safety boundaries. Their phase number should not be interpreted as the current product roadmap.

## Maintenance Rule

Before deleting a test because its name looks historical:

1. identify the production/source files it exercises;
2. confirm the behavior is no longer reachable or required;
3. check whether a newer test genuinely supersedes the same contract;
4. run the full CI after removal.

Prefer renaming or documenting a still-valid compatibility test over deleting useful regression coverage for cosmetic reasons.
