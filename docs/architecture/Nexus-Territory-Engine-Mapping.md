# Nexus Territory and Capability Engine Mapping

## Product boundary

Nexus Atlas is the top-level product experience. Territories are user-facing working domains over a shared Context Fabric. Legacy Atlas agent names remain implementation capabilities and do not create separate top-level products.

## Current mapping

| Legacy implementation | Permanent role | Territory placement | Status |
|---|---|---|---|
| Project Atlas | Project Development Engine | Innovation | Active |
| Evidence Atlas | Evidence Engine | Research and Evaluation | Planned |

## Compatibility rule

Existing code may continue to use stable internal identifiers such as `project-atlas` while migration is in progress. User-facing architecture and new contracts should expose:

```text
Nexus Atlas
  → Territory
  → Capability Engine
  → Agent / Tool
  → Governed Action
```

The internal identifier must be accompanied by `engineId`, `productRole`, and `territoryIds` when capability metadata is returned.

## Project Development Engine

Internal compatibility ID: `project-atlas`

Permanent role:

- understand an early idea;
- define the problem;
- structure a project;
- review risks;
- guide execution.

It operates inside the Innovation Territory and may later be reused by other Territories through explicit capability requests.

## Evidence Engine

Internal compatibility ID: `evidence-atlas`

Permanent role:

- map claims to evidence;
- trace sources and provenance;
- detect evidence gaps;
- support evaluation reliability.

It belongs primarily to Research and Evaluation. It is not presented as a second product-level Atlas.

## Migration rule

Do not rename every existing file or identifier in one high-risk migration. Migrate in this order:

1. add the capability registry;
2. enrich router metadata;
3. update user-facing copy and architecture documents;
4. migrate imports and internal IDs only when tests cover the affected path;
5. preserve compatibility aliases until the old ID is no longer referenced.

## Current limitation

This mapping formalizes the architecture boundary. It does not claim that all five Territories or all capability engines are fully operational.