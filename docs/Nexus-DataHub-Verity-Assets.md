# Nexus DataHub Verity Asset Bridge

## Purpose

This integration keeps the permanent Nexus boundary explicit:

```text
Nexus Context Fabric
  project history · decisions · agent memories · actions

DataHub
  governed Verity assets · ownership · lineage · quality/freshness metadata

Source Adapter
  overlays DataHub asset state onto the Verity Re-entry scenario
```

DataHub is not used as the canonical store for the user's complete personal Context Graph.

## Governed assets

The runtime creates six stable Dataset assets in the `PROD` environment:

1. `verity_evaluation_rubric`
2. `verity_test_materials`
3. `verity_benchmark_v1`
4. `verity_scoring_calibration`
5. `verity_evaluation_results_v047`
6. `verity_release_readiness_evidence`

The calibration asset has the logical type `calibration-process`. It is represented as a Dataset Context Asset in this hackathon runtime so the integration can use the already verified open-source `DatasetProperties` and dataset lineage path without adding an unstable Data Job SDK dependency.

## Asset lineage

```text
Evaluation Rubric ───────┐
                         ├─→ Benchmark v1
Test Materials ──────────┘        ↓
                         Scoring Calibration
                                  ↓
                         Results v0.4.7
                                  ↓
                         Release Readiness Evidence
```

The MCP reader rejects the live context if the Benchmark no longer has both the Rubric and Test Materials as direct upstream assets.

## 1. Dry-run ingestion

Dry-run is the default and does not write metadata:

```bash
python datahub/scripts/ingest_verity_assets.py --dry-run
```

The output lists all planned URNs, the relationship count, and confirms that no ownership write is included.

## 2. Apply asset ingestion

Start DataHub first, then run:

```bash
python datahub/scripts/ingest_verity_assets.py \
  --server http://localhost:8080 \
  --apply
```

For an authenticated DataHub instance, provide `DATAHUB_TOKEN` through the environment. The script never prints it.

The Benchmark owner is intentionally left unassigned. This creates the real Missing Ownership condition used by Nexus Continuity.

## 3. Start the read-only MCP bridge

```bash
node datahub/verity/verity-asset-bridge.mjs
```

Default endpoint:

```text
http://127.0.0.1:8790/api/continuity/reentry
```

Health endpoint:

```text
http://127.0.0.1:8790/health
```

The bridge:

- binds only to a loopback host;
- accepts only allow-listed browser origins;
- exposes only GET and OPTIONS;
- uses the existing read-only DataHub MCP client;
- reads six exact allow-listed asset URNs;
- verifies Benchmark lineage;
- overlays DataHub ownership state onto the Nexus-owned Verity scenario;
- never treats an unavailable source as a missing owner;
- does not expose an arbitrary MCP proxy.

## 4. Open the live Re-entry workspace

```text
http://localhost:8000/reentry.html?source=datahub&bridge=http%3A%2F%2F127.0.0.1%3A8790%2Fapi%2Fcontinuity%2Freentry#evidence
```

When the Benchmark has no DataHub owner, the live scenario reports:

```text
Missing Ownership: 1
```

When DataHub later returns a verified owner, the adapter changes the live result to:

```text
Missing Ownership: 0
Risk status: resolved
Ownership repair task: completed
```

The UI does not close the signal based only on a mutation response. It requires a fresh MCP read that returns the intended owner.

## Current write boundary

This branch remains read-only. A later branch will add a separate, explicitly enabled mutation client for the official DataHub MCP `add_owners` tool. It will require:

1. a fixed Benchmark target URN;
2. an allow-listed CorpUser or CorpGroup owner URN;
3. explicit human confirmation;
4. a post-write read through the read-only bridge;
5. a verified ContextRepairEvent before the signal closes.
