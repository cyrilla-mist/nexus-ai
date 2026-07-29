# Nexus Continuity Domain

This directory defines a provider-neutral foundation for recovering, validating, governing, and acting on project context.

## Contents

| Path | Purpose |
| --- | --- |
| `schema/continuity-schema.json` | JSON Schema Draft 2020-12 domain contract |
| `scenarios/nexus-self-reentry.json` | Development fixture based on Nexus re-entering its own project history |
| `validate-continuity-scenario.mjs` | Deterministic structure and business-rule validator |
| `tests/continuity-scenario.test.mjs` | Node-native validation and failure-path tests |

## Run

Validate the default scenario:

```bash
node continuity/validate-continuity-scenario.mjs
```

Run the Continuity tests:

```bash
node --test continuity/tests/*.test.mjs
```

## Boundary

- The fixture supports product and competition-scenario validation.
- It is development data, not production data.
- It contains no account, credential, private path, or personal information.
- DataHub mapping will be implemented in a later version.
- DataHub Runtime and MCP are not called by the validator or tests.
- Nexus Core integration and UI implementation will be separate tasks.
