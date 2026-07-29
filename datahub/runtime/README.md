# DataHub Runtime Evidence

Validation date: 2026-07-29

> The campus low-carbon project is a development fixture used only to verify DataHub ingestion, metadata properties, search, and lineage. It is not the final Nexus AI hackathon scenario.

## DataHub Core

| Check | Evidence |
| --- | --- |
| Runtime | Docker through WSL |
| DataHub GMS image | `acryldata/datahub-gms:v1.5.0.6` |
| DataHub frontend image | `acryldata/datahub-frontend-react:v1.5.0.6` |
| GMS health | successful at `http://localhost:8080/health` |
| DataHub CLI | `1.5.0.6+docker` |
| Verification Python | `3.11.15` in the existing actions container |

The fixture had already been ingested. One read-only, idempotent verification was executed against the running GMS service and returned `PASS`, confirming the expected seven entities and five relationships. Ingestion was not repeated and no fixture metadata was changed.

## MCP Package Evidence

| Item | Result |
| --- | --- |
| Node | `v26.2.0` |
| npm | `11.13.0` |
| npx | `11.13.0` |
| npm registry | `https://registry.npmjs.org/` |
| npm package lookup | `E404` |
| npm help launch | `E404` |
| official PyPI package | `mcp-server-datahub` `0.6.0` |
| official stdio command | `uvx mcp-server-datahub@latest` |
| `uvx` in validation environment | unavailable |

The npm errors contained no credentials and are summarized without local log paths.

## MCP Read-only Smoke Status

**MCP read-only smoke test not completed.**

Following the stop condition, no substitute package, installer, or global MCP client configuration was used. The official Python implementation could not be started because `uvx` was unavailable.

- MCP server started: no
- `tools/list`: not executed
- `search`: not executed
- `get_entities`: not executed
- `get_lineage`: not executed
- mutation call: none
- mutation configuration: explicitly disabled
- mutation tool exposure at runtime: unconfirmed

The repository contains a read-only smoke harness for a later environment with the official runtime. It prints `PASS` only after real tool results contain the expected fixture evidence.
