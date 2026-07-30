# Nexus Project Re-entry Prototype

## Purpose

The v0.9.6.1 prototype is a four-view Continuity workspace for returning to a
project without reading one long report. It helps a user recover the current
state, inspect evidence, govern memory, and separate confirmed decisions from
work that still needs a human decision or owner.

It is an independent browser page. It does not replace the existing homepage
or modify Nexus Core, Project Atlas, Memory, Execution, DataHub, or the archived
Star Map experiment.

## Data Sources

The default mode loads the repository development fixture:

```text
reentry.html?source=fixture#brief
```

The explicit local live-read mode is:

```text
reentry.html?source=datahub#brief
```

The DataHub mode calls the existing loopback read-only bridge, which uses the
official DataHub MCP server. The browser never calls DataHub GMS or MCP
directly. A live-read failure is shown explicitly and never silently replaced
with fixture data. Changing workspaces does not reload either source.

## Workspace Navigation

The URL hash selects one of four views:

- `#brief` — project identity, continuity state, signals, recent changes,
  current focus, and one next action;
- `#evidence` — broken or conflicting records, a selected evidence chain,
  linked decision, and a compact Signal Lens;
- `#memory` — an editorial ledger grouped into confirmed, disputed, and
  superseded or stale records;
- `#action` — confirmed decisions, pending human decisions, recommended
  actions, and missing ownership risk.

An absent or invalid hash resolves to `#brief`. Browser history, refresh, and
direct links preserve the selected workspace and any query parameters. The
loaded scenario, selected signal, and other local view state are retained while
switching.

The rail implements an ARIA tab interface with arrow, Home, End, Enter, and
Space keyboard behavior. On smaller screens the same tab interface becomes a
horizontal navigation row below the masthead.

## Experience Boundaries

The workspace remains **Editorial Atlas × Signal Instrument**:

- warm paper, ink, editorial numbering, rules, and restrained semantic color;
- progressive disclosure instead of stacked SaaS cards;
- a sticky Signal Lens only in the desktop Evidence view;
- compact, source-aware records without invented confidence or timestamps;
- one restrained primary action per workspace, supported by text links rather than`r`n  full-width marketing controls.

Buttons provide prototype feedback only. They do not write to the fixture,
DataHub, MCP, Nexus Core, or any remote system. Memory filtering and record
expansion are local presentation state.

The campus scenario remains development context and is shown as disputed or
superseded where the fixture records it. Nexus self-reentry remains the current
confirmed direction. The interface does not claim a final Hackathon scenario.

## Preview

From the repository root:

```bash
python -m http.server 8000
```

Then open any workspace directly, for example:

```text
http://localhost:8000/reentry.html#brief
http://localhost:8000/reentry.html#evidence
http://localhost:8000/reentry.html#memory
http://localhost:8000/reentry.html#action
```

Opening with `file://` is unsupported because fixture mode fetches JSON over
HTTP.

## Not Implemented

The v0.9.6.1 prototype does not:

- connect Nexus Core to DataHub or MCP;
- enable DataHub mutation or write-back;
- alter the Continuity schema, fixture, MCP configuration, or ingestion mapping;
- implement persistent storage, accounts, collaboration, or multi-user state;
- infer missing owners, confidence, or dates;
- restore Star Map to primary navigation.