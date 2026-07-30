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
npm run datahub:verity:bridge
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

## 4. Configure and start the ownership bridge

Configure the intended DataHub CorpUser or CorpGroup owner through the environment:

```bash
# PowerShell
$env:NEXUS_VERITY_OWNER_URN="urn:li:corpuser:your-datahub-user"

# macOS / Linux
export NEXUS_VERITY_OWNER_URN="urn:li:corpuser:your-datahub-user"
```

Then start the isolated mutation bridge:

```bash
npm run datahub:verity:ownership-bridge
```

Default proposal and mutation endpoint:

```text
http://127.0.0.1:8791/api/context/repair/benchmark-owner
```

The bridge does not expose an arbitrary mutation proxy. It allows only:

```text
Tool: add_owners
Target: Verity Benchmark v1
Owner: NEXUS_VERITY_OWNER_URN
```

A GET request returns the exact proposal without changing DataHub. A POST request is accepted only when the browser sends explicit confirmation and the operation, entity ID, and target URN all match the allow-list.

## 5. Open the governed live Re-entry workspace

```text
http://localhost:8000/reentry.html?source=datahub&bridge=http%3A%2F%2F127.0.0.1%3A8790%2Fapi%2Fcontinuity%2Freentry&mutationBridge=http%3A%2F%2F127.0.0.1%3A8791%2Fapi%2Fcontext%2Frepair%2Fbenchmark-owner#evidence
```

When the Benchmark has no DataHub owner, the live scenario reports:

```text
Missing Ownership: 1
```

The repair interaction follows this sequence:

```text
GET proposal
  → show target, current owners, proposed owner, verification method
  → explicit browser confirmation
  → POST allow-listed add_owners request
  → read-only DataHub MCP re-read
  → verify intended owner appears
  → close Missing Ownership
  → record ContextRepairEvent
```

When DataHub returns the intended owner on the verified re-read, the adapter changes the live result to:

```text
Missing Ownership: 0
Risk status: resolved
Ownership repair task: completed
```

If the mutation call succeeds but the re-read does not contain the intended owner, Nexus returns a failed repair, keeps the signal open, and records no successful ContextRepairEvent.

## Security boundary

- Both bridges bind to loopback only.
- Browser origins are allow-listed.
- The read process starts with mutation tools disabled.
- The mutation process starts separately and calls only `add_owners`.
- Target URN and owner URN cannot be supplied freely by browser input.
- No credentials are returned to the browser.
- No lineage, schema, quality, tags, descriptions, or domains can be mutated through this bridge.
- A successful write response is not treated as proof of repair.
