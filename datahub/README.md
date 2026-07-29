# Nexus DataHub Context Graph Foundation

This folder contains the v0.9.1 DataHub Context Graph foundation for Nexus AI.

It is a prototype bridge between Nexus project context and DataHub metadata. It does not modify Nexus Core, Project Atlas, Memory, Execution, Worker, or frontend behavior.

## Prerequisites

- Python 3.10+
- Docker Desktop, only if you want to run DataHub locally
- DataHub CLI, only if you want to start the local DataHub quickstart

This repository does not install Docker Desktop, does not modify global MCP client settings, and does not store tokens.

## Create environment

Windows PowerShell:

```powershell
python -m venv datahub/.venv
.\datahub\.venv\Scripts\Activate.ps1
python -m pip install -r datahub/requirements.txt
```

If `python` is not available on Windows, install Python separately and rerun the commands. Do not commit `datahub/.venv`.

## Start DataHub

If DataHub CLI and Docker Desktop are available:

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

If your DataHub instance requires authentication, provide the token through an environment variable:

```powershell
$env:DATAHUB_TOKEN="your-token"
python datahub/scripts/ingest_nexus_context.py --apply
```

The scripts must not print tokens.

## Verify

After applying metadata to a running DataHub instance:

```powershell
python datahub/scripts/verify_nexus_context.py --project-id campus-low-carbon
```

If DataHub is not running or the Python SDK is unavailable, verification reports a failure/skipped runtime status instead of pretending success.

## MCP

An example MCP configuration is provided in:

```text
datahub/mcp/mcp-config.example.json
```

The official MCP package can be inspected with:

```powershell
npx -y @acryldata/mcp-server-datahub --help
```

Some MCP initialization commands can modify global client configuration. This repository provides only an example config and does not automatically run client initialization.

Official initialization, if the user intentionally wants to configure their own MCP client:

```powershell
npx -y @acryldata/mcp-server-datahub init
```

## Prototype Boundary

Nexus Context Nodes are mapped to DataHub Dataset entities as a Hackathon proof-of-concept. These Dataset entities represent project context assets, not real database tables.

Current scope:

- sample Nexus Context Graph
- stable DataHub URN mapping
- DatasetProperties mapping
- lineage edge mapping
- dry-run ingestion
- explicit apply ingestion
- runtime verification script
- MCP configuration example

Not included in this version:

- Nexus Core MCP runtime bridge
- Worker to DataHub connection
- production DataHub deployment
- cloud persistence
- user accounts
- automatic MCP client configuration
