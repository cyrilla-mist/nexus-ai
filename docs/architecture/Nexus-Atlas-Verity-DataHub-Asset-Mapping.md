# DataHub Asset Mapping — Verity Re-entry v0.1

## 1. Boundary

**DataHub manages governed data-asset context. Nexus manages personal and project continuity.**

DataHub provides asset identity, ownership, lineage, domain, schema/documentation, freshness, and quality signals. Nexus combines those signals with project history, decisions, agent memories, and actions.

```text
DataHub MCP
  → Source Adapter
  → ExternalAssetRef
  → Context Builder
  → Continuity Engine
  → Atlas / Territory Workspace
```

The DataHub URNs below are stable design identifiers for the scenario. They can be adjusted to the exact runtime platform name without changing Nexus domain meaning.

## 2. Asset Graph

```text
Verity Evaluation Rubric
        │ governs
        ▼
Verity Benchmark v1 ◄──── Verity Test Materials
        │ used by
        ▼
Verity Scoring Calibration Job
        │ produces
        ▼
Evaluation Results v0.4.7
        │ supports
        ▼
Verity Release Readiness Evidence
```

## 3. Asset Registry

| Nexus ID | DataHub entity | Proposed URN | Owner | Quality/Freshness | Purpose in continuity |
|---|---|---|---|---|---|
| `external-asset-rubric` | Dataset | `urn:li:dataset:(urn:li:dataPlatform:nexus,verity_evaluation_rubric,PROD)` | Product | Draft validated / current | Defines what the benchmark must measure |
| `external-asset-test-materials` | Dataset | `urn:li:dataset:(urn:li:dataPlatform:nexus,verity_test_materials,PROD)` | Product | Curated / current | Provides representative inputs |
| `external-asset-benchmark` | Dataset | `urn:li:dataset:(urn:li:dataPlatform:nexus,verity_benchmark_v1,PROD)` | **Missing at re-entry** | Unverified / current | Triggers the Missing Ownership signal |
| `external-asset-calibration-job` | DataJob | `urn:li:dataJob:(urn:li:dataFlow:(nexus,verity_evaluation,PROD),scoring_calibration)` | Engineering | Operational / current | Connects benchmark to generated results |
| `external-asset-results-v047` | Dataset | `urn:li:dataset:(urn:li:dataPlatform:nexus,verity_evaluation_results_v047,PROD)` | Engineering | Partially validated / current | Current evidence after guardrail release |
| `external-asset-release-evidence` | Dataset | `urn:li:dataset:(urn:li:dataPlatform:nexus,verity_release_readiness_evidence,PROD)` | Product | Blocked / incomplete | Shows downstream impact of incomplete benchmark |

## 4. Metadata Required from MCP Reads

Each normalized external asset should expose:

```json
{
  "source": "datahub",
  "urn": "…",
  "entityType": "dataset | dataJob",
  "name": "…",
  "description": "…",
  "owners": [],
  "domain": "…",
  "tags": [],
  "version": "…",
  "freshness": "current | stale | unknown",
  "qualityStatus": "…",
  "upstream": [],
  "downstream": [],
  "lastUpdatedAt": "…",
  "retrievedAt": "…"
}
```

Nexus must preserve the original URN and retrieval timestamp for provenance.

## 5. Read Operations

The competition slice needs these read capabilities:

1. Resolve Benchmark v1 by URN or search.
2. Read owners and identify an empty owner list.
3. Read upstream rubric and test-material assets.
4. Read downstream calibration job and release-evidence asset.
5. Read asset descriptions, domain, tags, and current version.
6. Return the exact source URNs to the Inspector.

A read failure must never be silently treated as “no owner” or “no lineage.” It must produce `source_unavailable` or `context_unknown`.

## 6. Governed Write Operation

### Demo mutation

```text
User selects “Assign to me”
  → Nexus shows target asset and proposed owner
  → User confirms
  → DataHub ownership mutation
  → Nexus re-reads asset
  → Missing Ownership signal closes
  → Nexus records ContextRepairEvent
```

### Mutation policy

- Default connector mode remains read-only.
- Mutations are enabled only for explicitly allow-listed operations.
- The user must see the target asset, old value, new value, and source.
- A successful API response is insufficient; Nexus must re-read and verify the changed metadata.
- Failed writes keep the original signal open.
- No agent may mutate lineage, schema, or quality status autonomously in v0.1.

## 7. Nexus-to-DataHub Mapping

| Nexus concept | DataHub representation | Notes |
|---|---|---|
| `external_asset` | Dataset / DataJob | Stored as `ExternalAssetRef`, not copied into Nexus as canonical data |
| Owner | Ownership aspect | Human-confirmed updates only |
| Relation `governs` | Documentation/relationship metadata or Nexus overlay | Use Nexus overlay if no native relation is appropriate |
| Relation `feeds`, `used_by`, `produces` | Lineage | Canonical when available from DataHub |
| Freshness | Freshness/last-updated metadata | Used by evidence-integrity rules |
| Quality status | Data quality/status metadata | Never inferred as PASS when absent |
| Domain | DataHub Domain | Used to locate Verity Evaluation assets |
| Provenance | URN + retrieved timestamp | Required in Inspector and audit events |

## 8. Long-term Design Rule

DataHub is one Source Connector among GitHub, Notion, Drive, local records, and future services. No Territory page may call DataHub directly. Every source must pass through the provider-neutral Source Adapter and Context Builder.
