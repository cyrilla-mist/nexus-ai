# Nexus DataHub Context Graph Foundation

This folder contains the v0.9.1 DataHub Context Graph foundation for Nexus AI.

It is a prototype bridge between Nexus project context and DataHub metadata. It does not modify Nexus Core, Project Atlas, Memory, Execution, Worker, or frontend behavior.

> The campus low-carbon project is a development fixture used only to verify DataHub ingestion, metadata properties, search, and lineage. It is not the final Nexus AI hackathon scenario.

## Prerequisites

- Python 3.10+
- Docker Desktop or another Docker runtime, only for local DataHub
- DataHub CLI, only to start or inspect a local quickstart
- `uvx`, only for the official DataHub MCP server

This repository does not install system tools, modify global MCP client settings, or store tokens.

## Create environment

Windows PowerShell:

```powershell
python -m venv datahub/.venv
.\datahub\.venv\Scripts\Activate.ps1
python -m pip install -r datahub/requirements.txt
```

Do not commit `datahub/.venv`.

## Start DataHub

If the DataHub CLI and Docker are available:

```powershell
datahub docker quickstart
```

Typical local endpoints:

- DataHub UI: `http://localhost:9002`
- DataHub GMS: `http://localhost:8080`

## Dry Run

Dry-run is the default and does not write metadata:

```powershell
python datahub/scripts/ingest_nexus_context.py --dry-run
```

## Apply

Writing requires an explicit `--apply` flag:

```powershell
$env:DATAHUB_GMS_URL="http://localhost:8080"
python datahub/scripts/ingest_nexus_context.py --apply
```

For an authenticated instance, provide `DATAHUB_TOKEN` only through the environment. The ingestion scripts must not print it.

## Verify

After applying metadata to a running DataHub instance:

```powershell
python datahub/scripts/verify_nexus_context.py --project-id campus-low-carbon
```

Runtime evidence captured on 2026-07-29 is documented in `datahub/runtime/README.md`. The idempotent verification passed against DataHub Core `v1.5.0.6`, confirming seven entities and five relationships. Verification failure is reported explicitly; it is never converted into a false pass.

## MCP

The official self-hosted DataHub MCP server is the Python package `mcp-server-datahub`, normally launched over stdio with:

```powershell
uvx mcp-server-datahub@latest
```

The repository example is `datahub/mcp/mcp-config.example.json`. It targets local GMS at `http://localhost:8080`, where the verified quickstart has authentication disabled, so no token is included. For a secured instance, set `DATAHUB_GMS_TOKEN` outside the repository.

The example forces mutation and document-writing capabilities off. The smoke harness in `datahub/mcp/smoke-test.mjs` is limited to `tools/list`, `search`, `get_entities`, and `get_lineage`.

Successful local verification used the official Python MCP server `mcp-server-datahub` `0.6.0` with Node `v24.18.1` and npm `11.16.0`. The read-only smoke test completed `tools/list`, `search`, `get_entities`, and `get_lineage`, then printed `PASS: DataHub MCP read-only smoke test completed`. Mutation Tools, User Tools, and Data Quality Tools were disabled. No MCP client initialization or global configuration is performed by this repository.

## Prototype Boundary

Nexus Context Nodes are mapped to DataHub Dataset entities as a proof-of-concept. These Dataset entities represent project context assets, not database tables.

Current scope:

- sample Nexus Context Graph
- stable DataHub URN mapping
- DatasetProperties mapping
- lineage edge mapping
- dry-run and explicit apply ingestion
- runtime verification
- read-only MCP configuration and smoke-test harness

Not included:

- Nexus Core MCP runtime bridge
- Worker-to-DataHub connection
- final hackathon scenario design
- production DataHub deployment
- cloud persistence or user accounts
- automatic MCP client configuration
