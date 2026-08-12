# Nexus Atlas Canonical Inspector and Identity Context Contract v0.1

**Status:** Phase 5D Contract Design — In Progress  
**Baseline:** Phase 5C Complete / Accepted  
**Product boundary:** Product Surface v0.1 → Atlas Desk / Context Inspector

## 1. Purpose

Phase 5D makes the Atlas Context Inspector a canonical product-surface inspector rather than a convenience scan across rendered sections, and gives Identity Context an explicit read-only product surface.

The Inspector remains downstream of Product Surface v0.1:

```text
Accepted Self-Context Provider output
        ↓
Product Surface Projector
        ↓
Product Surface v0.1 + inspectorIndex
        ↓
Canonical Inspector / Identity Context
```

The Inspector is not a second resolver, not a source client, not a persistence path and not a semantic promotion layer.

## 2. Inspector Resolution Authority

`inspectorIndex` is the only accepted inspectability index for the Phase 5D Desk.

For an entity ID to be inspectable:

1. exactly one `inspectorIndex` descriptor must exist for the ID;
2. the descriptor `section` must map to a known Product Surface section;
3. that section must contain exactly one record with the same ID;
4. descriptor `kind` and the resolved record kind must agree;
5. the Inspector may display only fields already present in the Product Surface record.

Unknown IDs, duplicate descriptors, missing records, section mismatches or kind mismatches must resolve to an unavailable Inspector state rather than falling back to a raw graph/provider lookup.

## 3. Allowed Section Mapping

The Phase 5D Inspector accepts only these Product Surface sections:

- `project`
- `identity`
- `decisions.effective`
- `decisions.proposed`
- `decisions.historical`
- `memories.confirmed`
- `memories.inferred`
- `memories.disputed`
- `memories.historical`
- `evidence.current`
- `evidence.stale`
- `evidence.disputed`
- `risks`
- `actions`

No provider-native, Graph-internal or transport-specific path is accepted.

## 4. Canonical Inspector Display

For a valid descriptor the Inspector may display:

- ID / kind / section title;
- lifecycle;
- verification;
- freshness;
- safe provenance fields already projected by Product Surface;
- safe governance fields already projected by Product Surface;
- Action boundary fields already projected by Product Surface;
- relations only when each related target is itself present in `inspectorIndex`.

The Inspector must not fetch arbitrary source detail, reconstruct omitted content, infer missing provenance or invent relations.

## 5. Identity Context

Identity Context is the Product Surface `identity` array rendered as an explicit product section.

Phase 5D does **not** add new user facts merely to make the Identity UI look complete. It surfaces only Identity records already accepted upstream.

Identity verification remains visible:

- `confirmed` → may be labeled user-confirmed / confirmed authority;
- `inferred` → must be explicitly labeled inferred and not user-confirmed;
- any other accepted verification state remains explicit rather than normalized to confirmed.

`restricted` Identity remains excluded upstream under Product Surface v0.1 policy. Phase 5D must not reconstruct or request it.

## 6. Identity Governance

The Identity surface must preserve:

- sensitivity;
- inheritance;
- confirmation requirements;
- provenance authority;
- freshness independently from verification.

A personal sensitivity label is informational. It does not create a new permission model in Phase 5D.

## 7. Relation Navigation

Related-context navigation is permitted only when the target ID resolves through `inspectorIndex`.

A `relatedIds` value that is absent from the accepted index must not become an inspectable control and must not trigger a source fetch.

## 8. Read-only Boundary

Phase 5D introduces no:

- canonical Graph mutation;
- persistent write;
- live GitHub/DataHub source read;
- OAuth or account connection;
- Identity capture/edit form;
- automatic Identity inference;
- Decision/Memory re-resolution;
- source re-read from the Inspector.

## 9. Error Boundary

Invalid Inspector resolution is local presentation failure. It must not mutate Product Surface or upstream artifacts.

The UI should show a bounded unavailable/selection state for invalid or unknown IDs.

## 10. Phase 5D Acceptance Criteria

Phase 5D is accepted when:

- Desk Inspector resolution is driven by `inspectorIndex` rather than an unbounded all-record scan;
- every accepted descriptor resolves to exactly one Product Surface record;
- unknown/unindexed IDs cannot be inspected;
- related navigation cannot bypass the index;
- Identity Context is visible as a dedicated Desk section;
- confirmed and inferred Identity are not conflated;
- no new Identity facts are invented for presentation completeness;
- provenance/governance/state boundaries remain visible;
- Phase 5C Desk and legacy Map / Workspace / Re-entry routes remain functional;
- Phase 4 Runtime remains untouched;
- full Node tests and repository checks remain green.
