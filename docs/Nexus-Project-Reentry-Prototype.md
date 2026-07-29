# Nexus Project Re-entry Brief Prototype

## Purpose

The v0.9.4 prototype validates the first primary Continuity experience: a
project re-entry brief that helps a user understand what changed, what still
holds, where context is broken, and what should happen next.

It is an independent browser page. It does not replace the existing homepage
or modify Nexus Core, Project Atlas, Memory, Execution, or the archived Star
Map experiment.

## Data Source

By default, the page fetches:

```text
continuity/scenarios/nexus-self-reentry.json
```

The scenario is a repository development fixture. It is not production data,
live DataHub data, or the final Hackathon scenario. The default interface
labels its source as `Continuity fixture` and `Runtime mapping verified`.

An explicit `source=datahub` query uses the local read-only bridge described
below. In both modes, the browser never calls DataHub GMS or MCP directly.

## Experience

The brief contains:

1. a project identity and current continuity state;
2. four interactive signals for stale context, agent conflict, missing
   ownership, and valid decisions;
3. `What Changed`, derived from meaningful event records;
4. `What Still Holds`, derived from confirmed decisions;
5. `Broken Context`, derived from stale, disputed, superseded, blocked,
   contradicting, or ownerless records;
6. recommended actions linked to task entities where available;
7. a selected-signal inspector with evidence chain, affected decision, and one
   primary action.

The primary actions provide prototype feedback only. They do not write back to
the fixture, DataHub, MCP, Nexus Core, or any remote system.

## Design Direction

The page applies the approved **Editorial Atlas × Signal Instrument** direction:

- warm paper and warm ink instead of pure white and black;
- editorial numbering, rules, provenance, and readable hierarchy;
- compact operational readings rather than generic dashboard cards;
- one clear action for the selected signal;
- semantic oxide, amber, mineral green, and muted cobalt;
- a subtle SVG paper texture using `feTurbulence`.

The supplied visual references informed hierarchy, paper tone, and inspector
composition. The implementation does not reproduce unsupported account,
ledger, collaboration, or write-back capabilities shown in those references.

## v0.9.4.1 Refinement

The v0.9.4.1 pass keeps the same report architecture and data boundary while
improving:

- Hero height and first-screen information balance;
- Inspector width and Evidence Chain readability;
- semantic affected-decision resolution with stable, order-independent matching;
- the rail project index hierarchy;
- muted text contrast and report spacing;
- responsive behavior across desktop, tablet, and mobile widths.

The refinement remains fixture-backed. It does not connect to live DataHub,
call MCP, enable write-back, replace the homepage, or restore Star Map to the
primary experience.

## v0.9.5 DataHub Live Read

The default page remains fixture-backed. An explicit query parameter adds a
local read-only mode:

```text
reentry.html?source=datahub
```

In that mode, the browser calls a loopback HTTP bridge. The bridge starts the
official DataHub MCP server over stdio, verifies that only the required read
tools are available, reads the `nexus.continuity.project-nexus-ai` namespace,
and validates representative lineage before returning a normalized scenario.
The browser never connects to DataHub GMS or starts a local process.

Live-read failure is explicit. The interface gives local startup steps and a
user-controlled link back to fixture mode; it never silently mixes or replaces
failed live data with the fixture. Primary actions remain prototype-only and do
not write back. See `docs/Nexus-DataHub-Live-Read-Bridge.md`.

## Preview

From the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/reentry.html
```

Opening the file directly with `file://` is unsupported because the browser
must fetch the JSON fixture over HTTP.

## Boundaries

The v0.9.4 prototype does not:

- connect Nexus Core to DataHub or MCP;
- enable DataHub mutation or write-back;
- alter the Continuity schema or fixture;
- select the final Hackathon scenario;
- implement persistent storage, accounts, collaboration, or multi-user state;
- add Evidence & Conflict, Memory Ledger, or Decision & Action pages;
- restore Star Map to primary navigation.
