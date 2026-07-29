# DataHub Runtime Evidence

Validation date: 2026-07-30

> The campus low-carbon project is a development fixture used only to verify DataHub ingestion, metadata properties, search, and lineage. It is not the final Nexus AI hackathon scenario.

## DataHub Core

| Check | Evidence |
| --- | --- |
| Runtime | Docker through WSL |
| DataHub GMS image | `acryldata/datahub-gms:v1.5.0.6` |
| DataHub frontend image | `acryldata/datahub-frontend-react:v1.5.0.6` |
| GMS health | successful at `http://localhost:8080/health` |
| DataHub CLI | `1.5.0.6+docker` |
| Fixture entities | 7 verified |
| Fixture relationships | 5 verified |
| Runtime verification | `PASS` |

The fixture had already been ingested. Verification was read-only and idempotent; ingestion was not repeated and no fixture metadata was changed.

## Successful MCP Runtime Evidence

The successful local verification environment reported:

| Item | Result |
| --- | --- |
| Node | `v24.18.1` |
| npm | `11.16.0` |
| official MCP server | `mcp-server-datahub` `0.6.0` |
| transport | stdio |
| DataHub GMS | local Core Quickstart `v1.5.0.6` |
| Mutation Tools | `DISABLED` |
| User Tools | `DISABLED` |
| Data Quality Tools | `DISABLED` |

No token, credential, user name, local absolute path, or personal information is stored in this evidence.

## MCP Read-only Smoke Status

**MCP read-only smoke test: PASS.**

The official Python MCP server started successfully. The smoke harness completed the read-only chain:

1. MCP initialization and `tools/list`;
2. `search` for the development fixture;
3. `get_entities` for the project entity and expected title;
4. `get_lineage` for the fixture relationship graph.

Final terminal output:

```text
PASS: DataHub MCP read-only smoke test completed
```

Runtime controls confirmed that Mutation Tools, User Tools, and Data Quality Tools were disabled. The smoke harness made no mutation call.

## Scope Boundary

This evidence verifies the local DataHub metadata and read-only MCP access path only. The final Hackathon scenario has not been selected, and the Nexus Core MCP Bridge has not started.
