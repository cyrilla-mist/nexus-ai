# Nexus DataHub Continuity Graph

## Purpose

The Nexus Continuity Domain records evidence, claims, decisions, tasks, risks,
agent memories, outcomes, and their relationships. Mapping this bounded domain
to DataHub makes the continuity scenario searchable and traceable through
metadata and lineage while keeping Nexus Core and the product runtime
disconnected from DataHub.

## Mapping

The current proof of concept uses DataHub Dataset entities as generic graph
nodes:

- the top-level project becomes one synthetic project Dataset;
- each Continuity entity becomes one Dataset;
- DatasetProperties stores the display name, summary, status, source, confidence,
  stable fixture metadata, and relationship JSON;
- a Continuity relationship `A → B` records `A` as an upstream of `B`;
- all upstreams for one downstream are emitted in one UpstreamLineage aspect.

Project URNs follow:

```text
urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.continuity.<project-id>.project,DEV)
```

Entity URNs follow:

```text
urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.continuity.<project-id>.<entity-type>.<entity-id>,DEV)
```

Identifiers are normalized deterministically and collisions are rejected.

## Semantic Boundary

Dataset-as-generic-node is a hackathon-compatible proof-of-concept
representation. It is not the permanent Nexus ontology.

DataHub lineage expresses graph connectivity. It does not preserve the full
meaning of `supports`, `contradicts`, `supersedes`, `blocks`, and the other
Continuity relationship types. Nexus therefore stores sorted incoming and
outgoing relationship JSON in Dataset custom properties. A future version may
migrate to more specific DataHub entity models.

Global Tags are not emitted in this foundation. The repository accepts a broad
DataHub SDK range, and a stable cross-version TagKey, TagProperties, and
GlobalTags write contract has not been verified. Entity type, status, and
scenario remain explicit custom properties rather than being presented as
successfully written tags.

## Scenario

The current scenario is `nexus-self-reentry`. It uses real Nexus project
decisions as a development sample so Nexus can later answer what changed, what
remains trustworthy, and what should happen next.

It is fixture data, not production data. The campus low-carbon scenario remains
a separate development fixture and is not the final public or Hackathon Demo.
The final Hackathon scenario has not been selected.

## DataHub Capabilities Used

This foundation uses only:

- search-compatible Dataset entities;
- DatasetProperties;
- deterministic custom properties;
- DataHub lineage.

It does not claim DataHub ownership, assertions, data quality, write-back, MCP
runtime bridge, or mutation support.

## Commands

Dry run, which validates and writes nothing:

```bash
python datahub/scripts/ingest_continuity_scenario.py --dry-run
```

Explicit apply against a user-managed DataHub runtime:

```bash
python datahub/scripts/ingest_continuity_scenario.py \
  --server http://localhost:8080 \
  --apply
```

Read-only verification after a manual apply:

```bash
python datahub/scripts/verify_continuity_scenario.py \
  --server http://localhost:8080
```

The apply and verify commands do not start Docker, install DataHub, or modify
global configuration.

## Current Boundary

- Nexus Core MCP Bridge has not started.
- Project Re-entry Brief UI has not started.
- write-back has not been implemented.
- the Star Map is an archived visual experiment and is not part of the new
  primary flow.
- no DataHub runtime apply is performed by repository tests.
