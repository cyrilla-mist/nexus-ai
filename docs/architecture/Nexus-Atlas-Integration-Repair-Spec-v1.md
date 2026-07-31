# Nexus Atlas Integration Repair Specification v1

## Status

- Target branch: `repair/nexus-atlas-integration-v1`
- Base: `agent/nexus-atlas-architecture-review-v1`
- `main` must remain unchanged until static repair and local runtime validation are complete.
- Static code review does not count as runtime verification.

## Purpose

This specification closes the gap between the permanent Nexus Atlas product architecture and the current Verity Hero Scenario implementation. Existing Atlas, Continuity, DataHub, governance, and competition work should be retained. The repair branch focuses on contract correctness, source consistency, governed mutation integrity, and truthful product boundaries.

## Repair batches

### Batch A — Continuity contracts and Atlas structure

1. Preserve independent timestamp semantics:
   - `project.updatedAt`: latest project-content update;
   - `project.lastActiveAt`: latest user activity;
   - `runtime.reentryFromAt`: re-entry elapsed-time baseline.
2. Standardize the calibration node as a governed calibration-context Dataset for the competition slice.
3. Replace multipart JavaScript Blob assembly with a normal Atlas ES module.
4. Make Atlas and Re-entry load the same Continuity Provider and source mode.
5. Keep Fixture and DataHub states distinguishable and never convert source-unavailable into missing or stale context.

### Batch B — Governed DataHub repair

1. Generate ownership proposals from a fresh DataHub read.
2. Include real `existingOwners` in the Confirmation Sheet.
3. Add a one-time `proposalId`, expiry, target snapshot, and replay protection.
4. Treat an already-present proposed owner as a verified no-op.
5. Require exact operation, entity, target, proposal, and explicit human confirmation.
6. Record success only after read-after-write returns the intended owner and closes the signal.
7. Eliminate stale post-mutation state by invalidating or bypassing the read cache.
8. Return a verified snapshot to the UI after mutation so the current page updates immediately.

### Batch C — Stable governance actions

UI copy must not determine behavior. Use stable contracts:

- `confirm-decision`
- `repair-ownership`
- `create-revalidation-task`
- `confirm-inheritance`

Every action control must carry an explicit action ID and entity ID. Atlas and Re-entry must not maintain conflicting hidden selected-entity state.

### Batch D — Local bridge security

Only these browser-configurable local endpoints are allowed:

Read bridge:

- `http://127.0.0.1:8790/api/continuity/reentry`
- `http://localhost:8790/api/continuity/reentry`

Mutation bridge:

- `http://127.0.0.1:8791/api/context/repair/benchmark-owner`
- `http://localhost:8791/api/context/repair/benchmark-owner`

Reject other protocols, hosts, ports, credentials, query strings, hashes, and paths. Defaults must also pass the same validator.

### Batch E — Product continuation

1. Add a provider-neutral Context Package Builder containing:
   - current goal;
   - valid decisions;
   - trusted evidence;
   - unresolved risks;
   - completed repairs;
   - next actions;
   - policies;
   - requested capabilities;
   - source information;
   - generation timestamp.
2. Label the first implementation as `session-local` unless durable storage is genuinely wired.
3. Map legacy engines into the new product architecture:
   - Project Atlas → Innovation Territory / Project Development Engine;
   - Evidence Atlas → Research and Evaluation / Evidence Engine.
4. Mark Outcome Write-back as planned or session-local until durable persistence exists.

## Runtime validation gates

The branch must remain unmerged until the target computer verifies:

```text
npm test
npm run check
npm run verify:multiturn
npm run verify:verity-continuity
npm run verify:verity-datahub
npm run verify:verity-ingestion
```

It must then verify:

```text
DataHub ingestion
→ live read-only MCP retrieval
→ Missing Ownership = 1
→ fresh proposal
→ Confirmation Sheet
→ explicit confirmation
→ add_owners
→ read-after-write
→ Missing Ownership = 0
→ Atlas and Re-entry both show 0
```

Browser validation must cover desktop and mobile, keyboard focus, Escape, Cancel, retry, duplicate submission, source failure, and sanitized public evidence.

## Owner decisions

### Calibration entity

Approved competition-slice model:

- display name: `Verity Scoring Calibration Context`;
- DataHub entity: Dataset;
- logical type: `calibration-context`.

A true DataJob/DataFlow model may be introduced after the competition when execution metadata is available.

### License

The repair branch does not decide repository licensing. The existing MIT-to-Apache-2.0 change remains an explicit owner decision before merge.

## Merge rule

Do not merge the top stacked branch directly into `main`. Complete repair and runtime evidence first, then process the stack or a clean integration PR with reviewable boundaries.