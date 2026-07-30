# Verity Re-entry Scenario Source

This directory contains the exact compact JSON source for the public Verity Hero Scenario.

The source is split into ordered parts because the complete fixture is generated and validated during development rather than edited manually as one large file.

## Build

From the repository root:

```bash
npm run build:verity-scenario
```

The command concatenates the four parts in numeric order, parses the result, validates the scenario contract, and writes:

```text
continuity/scenarios/verity-reentry.json
```

## Expected scenario output

- Schema version: `0.9.2`
- Project: `project-verity`
- 36 entities
- 33 relationships
- 4 meaningful changes
- 4 valid decisions
- 2 stale records
- 1 agent conflict
- 1 missing owner

Do not edit the generated fixture without updating these source parts and the rule matrix together.
