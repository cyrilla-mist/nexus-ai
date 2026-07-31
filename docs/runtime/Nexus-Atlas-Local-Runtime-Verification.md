# Nexus Atlas Local Runtime Verification

Updated: 2026-08-01

This runbook verifies the real local DataHub and browser integration for Draft PR #11. Static CI passing is necessary but does not replace this procedure.

## Safety boundary

- Run this only from `repair/nexus-atlas-integration-v1`.
- Keep PR #11 in Draft until every required result is recorded.
- The preflight and smoke scripts perform no DataHub metadata writes.
- The ownership mutation must occur only after the Confirmation Sheet displays the exact operation, target, current owners, proposed owner, and verification contract.
- Do not place tokens, passwords, local filesystem paths, or personal owner details in screenshots or committed logs.

## 1. Prepare the repository

PowerShell:

```powershell
git fetch origin
git switch repair/nexus-atlas-integration-v1
git pull --ff-only origin repair/nexus-atlas-integration-v1
npm install
npm test
npm run check
```

Expected result: all static and unit checks pass.

## 2. Start the existing local DataHub environment

Start the DataHub deployment already used for this project. Nexus expects the GMS service at:

```text
http://localhost:8080
```

Use `DATAHUB_GMS_URL` only when the service is intentionally available at another HTTP or HTTPS address. Do not embed credentials in that URL.

Example PowerShell override:

```powershell
$env:DATAHUB_GMS_URL = "http://localhost:8080"
```

## 3. Run Runtime preflight

```powershell
npm run verify:runtime:preflight
```

Required PASS checks:

- supported Node.js runtime;
- `python` command available;
- DataHub MCP launcher available, defaulting to `uvx`;
- valid MCP argument configuration;
- DataHub GMS TCP reachability;
- canonical Verity scenario matches the governed asset registry;
- Verity Benchmark remains intentionally ownerless before the repair test.

Ports `8790` and `8791` are informational. They may already be occupied when the bridges are running.

## 4. Ingest the governed Verity assets

Review the deterministic plan first:

```powershell
npm run datahub:verity:dry-run
```

Then explicitly apply the asset and lineage ingestion:

```powershell
python datahub/scripts/ingest_verity_assets.py --apply
```

Expected result:

```text
PASS: Verity governed assets ingested
Assets written: 6
Lineage relationships written: 5
Benchmark owner: intentionally unassigned
```

This step writes the six governed assets and five lineage relationships. It intentionally does not assign the Benchmark owner.

## 5. Start the read-only DataHub bridge

Open a new PowerShell terminal:

```powershell
git switch repair/nexus-atlas-integration-v1
npm run datahub:verity:bridge
```

Expected endpoint:

```text
http://127.0.0.1:8790/api/continuity/reentry
```

The bridge must report:

- `readOnly: true`;
- `mutationEnabled: false`;
- required tools `search`, `get_entities`, and `get_lineage`;
- no mutation-shaped tools;
- cache TTL `0` unless intentionally overridden for a separate experiment.

## 6. Verify the live read path

From another terminal:

```powershell
npm run verify:runtime:read
```

Expected result:

- read bridge health passes;
- a live `datahub-mcp` Verity snapshot is returned;
- the canonical Benchmark URN matches the registry;
- lineage verification passes.

## 7. Start the governed ownership bridge

Choose an existing DataHub CorpUser or CorpGroup URN. Do not commit it.

PowerShell example:

```powershell
$env:NEXUS_VERITY_OWNER_URN = "urn:li:corpuser:YOUR_DATAHUB_USER"
npm run datahub:verity:ownership-bridge
```

Expected endpoint:

```text
http://127.0.0.1:8791/api/context/repair/benchmark-owner
```

The bridge must expose only `add_owners`, allow only Verity Benchmark v1 as the mutation target, and issue expiring one-time proposals.

## 8. Verify the proposal without mutating DataHub

```powershell
npm run verify:runtime:proposal
```

Expected result:

- mutation bridge health passes;
- the target allow-list contains only the governed Benchmark URN;
- a fresh proposal contains `proposalId`, `expiresAt`, `add_owners`, Benchmark entity ID, Benchmark URN, and the configured proposed owner;
- the script explicitly reports that no POST request was sent.

## 9. Start the browser demo

Open another terminal:

```powershell
python -m http.server 8000
```

Open Atlas in live DataHub mode:

```text
http://localhost:8000/atlas.html?source=datahub&bridge=http%3A%2F%2F127.0.0.1%3A8790%2Fapi%2Fcontinuity%2Freentry&mutationBridge=http%3A%2F%2F127.0.0.1%3A8791%2Fapi%2Fcontext%2Frepair%2Fbenchmark-owner#desk
```

Verify:

- source health says DataHub MCP and live;
- Atlas loads the Verity project and governed assets;
- entering Re-entry preserves the DataHub source and both validated bridge URLs;
- Fixture labels never appear while the live source is active;
- stale, conflict, missing-owner, and valid signals match the live snapshot.

## 10. Execute the human-confirmed ownership repair

In Re-entry, select the missing ownership signal and choose the governed repair action.

Before confirming, verify the Confirmation Sheet shows:

- operation `add_owners`;
- target Verity Benchmark v1 URN;
- current owners;
- proposed owner;
- read-after-write verification requirement.

Test Cancel first. Confirm that:

- the sheet closes;
- focus returns to the triggering control;
- no DataHub ownership change occurs;
- a new proposal is required for another attempt.

Then request a fresh proposal and confirm once.

Required PASS evidence:

- POST uses the one-time proposal ID;
- `add_owners` succeeds;
- a fresh DataHub read returns the proposed owner;
- the missing-owner signal closes only after verification;
- the page refresh retains DataHub live mode;
- replaying the same proposal is rejected;
- a second repair attempt becomes a verified no-op rather than a duplicate write.

## 11. Browser and accessibility checks

Desktop and mobile checks:

- Atlas Desk, Map, Territory, and Re-entry routes render without layout breakage;
- the Context Inspector and action tray do not cover critical content;
- keyboard tab order is coherent;
- Confirmation Sheet traps focus while open;
- Escape and Cancel return focus correctly;
- reduced-motion behavior does not force smooth scrolling;
- the mobile Confirmation Sheet behaves as a usable bottom sheet;
- error, retry, and repeated-confirmation states remain understandable.

## 12. Runtime evidence record

Record only sanitized results:

```text
Date:
Branch and commit:
DataHub deployment/version:
MCP package version:
Read bridge health: PASS / FAIL
Live snapshot and lineage: PASS / FAIL
Proposal-only check: PASS / FAIL
Cancel behavior: PASS / FAIL
Confirmed add_owners: PASS / FAIL
Fresh read-after-write: PASS / FAIL
Replay rejection: PASS / FAIL
Verified no-op: PASS / FAIL
Atlas → Re-entry source continuity: PASS / FAIL
Desktop visual check: PASS / FAIL
Mobile visual check: PASS / FAIL
Accessibility interaction check: PASS / FAIL
Evidence sanitized: YES / NO
```

After successful Runtime verification:

1. pin the tested DataHub MCP package version instead of `@latest`;
2. update the integration repair status document with the tested environment and sanitized evidence location;
3. keep the license and durable Outcome Write-back as separate owner decisions;
4. only then consider marking PR #11 Ready for review.
