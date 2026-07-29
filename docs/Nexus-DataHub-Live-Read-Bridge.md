# Nexus DataHub Live Read Bridge

## Purpose

The browser must not connect directly to DataHub GMS. A direct connection
would expose local runtime details, require browser-held credentials on secured
instances, and bypass the repository's read-only MCP policy.

The v0.9.5 local bridge gives the Project Re-entry Brief an explicit live-read
mode while leaving the static fixture as the default.

## Architecture

```text
Browser
  -> Continuity Provider
  -> loopback Local HTTP Bridge
  -> official DataHub MCP Server (stdio)
  -> DataHub
```

The bridge calls only `search`, `get_entities`, and `get_lineage`. It converts
the Nexus Continuity namespace into the same scenario shape consumed by the
existing Re-entry View Model.

## Modes

### Fixture

```text
reentry.html
reentry.html?source=fixture
```

The page reads the repository development fixture. This remains the default so
the static page continues to work without a local DataHub runtime.

### DataHub Live Read

```text
reentry.html?source=datahub
```

The page calls the loopback bridge at
`http://127.0.0.1:8789/api/continuity/reentry`. A failed live read is reported
as an error and never silently replaced with fixture data.

## Security

- The bridge binds to a loopback host only.
- MCP mutation, user, data-quality, and document-writing tools are disabled.
- Required read tools are verified after MCP initialization.
- Exposed mutation tools cause initialization to fail.
- Tokens never enter browser code or bridge responses.
- CORS uses an explicit origin allowlist; wildcard origins are not used.
- The bridge exposes fixed health and Continuity read routes, not an arbitrary
  MCP tool passthrough or URL proxy.
- Responses are read-only and do not write to DataHub, Nexus Core, or disk.

## Start

Ubuntu or WSL:

```bash
source ~/.nvm/nvm.sh
source ~/datahub-env/bin/activate
cd /mnt/c/Users/Lenovo/Documents/nexus-ai

node datahub/mcp/continuity-live-bridge.mjs
```

In another terminal:

```bash
cd /mnt/c/Users/Lenovo/Documents/nexus-ai
python -m http.server 8000
```

Open:

```text
http://localhost:8000/reentry.html?source=datahub
```

The default bridge allows `http://localhost:8000` and
`http://127.0.0.1:8000`. Use `NEXUS_ALLOWED_ORIGINS` to provide a comma-separated
local allowlist when another development origin is required.

## Check

When `uvx`, the official MCP server, and a populated local DataHub runtime are
already available:

```bash
node datahub/mcp/continuity-live-bridge.mjs --check
```

The check initializes MCP, verifies the read-only tool surface, reads the
`nexus.continuity.project-nexus-ai` namespace, validates record counts from the
project root, and checks representative upstream lineage. It exits without
starting the HTTP server.

## Current Boundary

- local development bridge, not a hosted production API;
- read-only MCP access;
- no write-back;
- no Cloudflare deployment;
- no authentication or account system;
- no arbitrary project selection;
- the repository fixture remains available and is the default;
- the campus low-carbon dataset remains a development fixture, not the live
  Continuity read target or final Hackathon scenario.
