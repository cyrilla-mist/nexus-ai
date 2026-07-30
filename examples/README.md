# Nexus Atlas Examples

This directory gives reviewers small, readable examples of the Nexus Atlas contracts without requiring them to inspect the complete scenario graph.

## Evidence status

The files in this directory are deliberately separated from runtime evidence.

| File | Status | Meaning |
|---|---|---|
| `verity-reentry-summary.json` | deterministic fixture sample | Summarizes the validated Verity scenario and expected finding counts. |
| `context-repair-event.json` | expected contract | Shows the event structure that may be emitted only after a verified DataHub read-after-write. |
| `context-package.json` | planned contract | Shows the intended handoff from Re-entry into a continuing Verity workspace. |

Every JSON file contains fields such as `exampleType`, `runtimeVerified`, or `implementationStatus` so that a sample cannot be mistaken for captured production or local-runtime evidence.

## What these files prove

They document:

- the deterministic Verity re-entry scenario;
- the shape of a governed ownership-repair audit event;
- the intended Context Package structure;
- the rules and authority boundaries attached to those outputs.

They do **not** prove:

- that a local DataHub instance was available;
- that MCP returned the live six-asset graph;
- that `add_owners` completed successfully;
- that Missing Ownership changed from `1` to `0`;
- that the Context Package is already wired into a durable workspace;
- that Outcome Write-back is implemented.

## Adding verified runtime evidence

After the local integration passes, add sanitized evidence under a separate directory, for example:

```text
examples/runtime-evidence/
├── datahub-assets-after-ingestion.json
├── ownership-before.json
├── ownership-after.json
├── context-repair-event.verified.json
└── README.md
```

Verified evidence must:

1. be produced by a real local run;
2. remove tokens, personal identifiers, local paths, and private host details;
3. include the command or interaction that produced it;
4. identify the relevant commit;
5. distinguish fixture output from DataHub output;
6. retain failure information rather than editing the result into a successful state.

Do not replace a sample file with a fabricated successful result.
