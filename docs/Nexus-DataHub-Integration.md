# Nexus AI × DataHub Integration

## 1. Goal

Nexus AI converts project context into a searchable, traceable, agent-readable Context Graph. The current foundation maps a bounded development fixture into DataHub and validates the mapping without connecting Nexus Core, the Worker, or Project Atlas to DataHub at runtime.

> The campus low-carbon project is a development fixture used only to verify DataHub ingestion, metadata properties, search, and lineage. It is not the final Nexus AI hackathon scenario.

## 2. Why DataHub

DataHub is evaluated as a future context infrastructure layer for registering project context as metadata assets, representing semantic relationships, preserving source/status metadata, and exposing structured context to a future read-only MCP bridge.

No final Devpost scenario, cloud persistence, account system, or production integration is claimed here.

## 3. Current Architecture Boundary

```mermaid
flowchart TD
  Fixture[Development fixture]
  Mapping[Nexus to DataHub mapping]
  DataHub[Local DataHub Core]
  Verify[Read-only verification]
  Future[Future MCP runtime bridge]

  Fixture --> Mapping
  Mapping --> DataHub
  DataHub --> Verify
  DataHub -. not connected .-> Future
```

Nexus Core and Project Atlas remain outside the DataHub runtime in this version.

## 4. Entity Mapping

The prototype uses DataHub Dataset entities for Nexus Context Nodes. They are metadata assets, not database tables.

| Nexus concept | DataHub prototype entity | Purpose |
| --- | --- | --- |
| Nexus Project | Dataset | project context root |
| Problem | Dataset | problem context |
| Decision | Dataset | decision context |
| Milestone | Dataset | execution milestone |
| Task | Dataset | action context |
| Progress | Dataset | confirmed progress |

Project URN:

```text
urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)
```

## 5. Relationship Mapping

Nexus source maps to DataHub upstream and Nexus target maps to DataHub downstream. The prototype represents `addresses`, `supports`, `contains`, and `updates` through lineage. This preserves relationship direction and does not claim pipeline execution.

## 6. Runtime Evidence

Validated on 2026-07-29:

- DataHub Core quickstart image: `v1.5.0.6`
- DataHub CLI: `1.5.0.6+docker`
- GMS health check: successful
- fixture entities: 7
- fixture relationships: 5
- idempotent verification result: `PASS`

The verification was read-only and performed once after confirming the fixture had already been ingested. Detailed evidence is in `datahub/runtime/README.md`.

## 7. MCP Runtime Boundary

The official current self-hosted implementation is the Python package `mcp-server-datahub`, launched over stdio with:

```text
uvx mcp-server-datahub@latest
```

Configuration uses `DATAHUB_GMS_URL`, optional `DATAHUB_GMS_TOKEN`, and explicit mutation/document-writing disable flags. The verified local quickstart has authentication disabled, so the example omits a token.

The npm package `@acryldata/mcp-server-datahub` returned `E404` from `https://registry.npmjs.org/` on 2026-07-29. Official PyPI metadata reported `mcp-server-datahub` version `0.6.0`, but `uvx` was not installed in the validation environment. Per the task boundary, no substitute package or installer was used.

Therefore **MCP read-only smoke test not completed**. The server was not started, and `tools/list`, `search`, `get_entities`, and `get_lineage` were not executed through MCP. Mutation was configured off in the example and harness, but runtime tool exposure could not be confirmed.

## 8. Intended Read-only MCP Flow

When the official runtime is available, the harness will initialize stdio, require the three read tools, reject known mutation-tool exposure, search for the fixture, retrieve the project entity, and retrieve one-hop lineage. No mutation call is part of the smoke test.

## 9. Future Write-back Boundary

Future write-back may include confirmed decisions, tasks, progress, source, and confidence only after Nexus Memory Policy approval. The current foundation does not implement automatic write-back.

## 10. Security

- tokens remain in environment variables;
- tokens and local absolute paths are never committed or printed;
- ingestion defaults to dry-run;
- writes require explicit `--apply`;
- MCP configuration disables mutation;
- the fixture contains no private account or secret data.

## 11. Next Step

A later, separate task may run the read-only MCP smoke test after the official `uvx` runtime is available. Nexus Core integration, final scenario design, and any write-back bridge remain out of scope until that evidence passes.
