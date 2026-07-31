# Nexus Atlas Integration Repair Status

Updated: 2026-08-01

## Static integration status

The repair branch has completed and statically verified the following contracts:

- project `updatedAt` remains the real content update timestamp;
- `lastActiveAt` and `runtime.reentryFromAt` independently drive Re-entry elapsed time;
- Re-entry governance uses stable action and entity identifiers rather than visible English titles;
- Atlas runs as one normal JavaScript module without Blob URL source assembly;
- Atlas and Re-entry use the shared Continuity Provider contract;
- Atlas preserves Fixture or validated DataHub source configuration when entering Re-entry;
- the legacy Atlas loader and source fragments have been removed;
- Verity now uses one valid canonical JSON scenario;
- the legacy multipart scenario files have been removed;
- Calibration Context is consistently modeled as a governed Dataset in Fixture, registry, ingestion, Atlas, and documentation;
- browser-configurable bridges are restricted to exact loopback contracts;
- Worker CORS uses an explicit origin allow-list;
- DataHub ownership proposals use fresh owner state, one-time proposal IDs, expiry, replay protection, exact target validation, and read-after-write verification;
- live DataHub read caching defaults to zero milliseconds;
- Context Package generation is provider-neutral and explicitly session-local;
- legacy Project Atlas and Evidence Atlas are mapped as Territory capability engines;
- one-time repair migrations and temporary write-enabled workflows have been removed after successful application.

## Automated validation

The retained GitHub Actions `static-validation` job currently passes:

- full Node test suite;
- repository syntax and source checks;
- multi-turn verification;
- bridge and CORS security contracts;
- Context Package contract;
- Territory capability mapping;
- Verity Continuity contract;
- Verity DataHub static contracts;
- Python ingestion compilation and dry-run;
- clean diff validation.

Automated CI does not constitute a real local DataHub Runtime verification.

## Remaining blockers

The Draft PR must not be marked Ready or merged until the target computer verifies:

1. real DataHub asset ingestion;
2. actual MCP response shapes for search, entity reads, lineage, and ownership;
3. the governed `add_owners` flow and fresh read-after-write result;
4. Atlas and Re-entry browser state consistency after ownership changes;
5. Confirmation Sheet focus management, Escape, Cancel, retry, repeated confirmation, and mobile bottom-sheet behavior;
6. desktop and mobile visual checks;
7. a tested public or documented local demo path;
8. sanitized runtime evidence.

## Product decisions still open

- durable Outcome Write-back remains unimplemented;
- the repository license requires an owner decision between the prior MIT license and the proposed Apache-2.0 license;
- the tested DataHub MCP package version must be pinned after local verification rather than using `@latest`.

## Safety boundary

- `main` remains unchanged;
- the original stacked PR branches remain unchanged;
- no real DataHub metadata mutation was executed during static repair;
- no local Runtime PASS is claimed.
