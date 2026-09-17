# Nexus Atlas v0.1 — Continuity Desk Route Contract

**Status:** Binding Phase 8C contract  
**Parent:** Phase 8 — Continuity Product Surface

## 1. Purpose

Phase 8C makes the accepted Phase 8B Continuity Product Surface snapshot visible inside the existing Nexus Atlas shell through a dedicated Product Surface route:

```text
#continuity
```

The route is a read-only product view. It does not create, refresh, mutate, verify, persist, execute, or authorize continuity state.

## 2. Route ownership

`atlas-entry.js` must classify `continuity` as a Product Surface route and load only:

```text
frontend/atlas/atlas-continuity.js
```

for that route.

The legacy routes remain:

```text
map
territory
reentry
```

`#reentry` must continue to use the legacy Atlas application during Phase 8C. Phase 8C does not silently replace or remove it.

## 3. Browser source

The Continuity Desk may fetch only the same-repository accepted snapshot:

```text
examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json
```

The browser must not call:

- D1;
- DataHub;
- GitHub APIs;
- the legacy Re-entry provider;
- local bridge endpoints;
- arbitrary remote URLs.

A snapshot failure must render an explicit unavailable state. No silent fallback is allowed.

## 4. Information hierarchy

The initial Continuity Desk renders:

1. current Continuity validity;
2. accepted Resume State;
3. latest accepted Outcome state;
4. Trusted Checkpoint summary;
5. bounded Outcome / Checkpoint history;
6. cross-source verification counts;
7. write-back safety state;
8. current Human Authority requirement.

The page must explain that displayed next action is copied from the accepted Trusted Checkpoint and is not newly authorized by the browser.

## 5. Fixed authority boundary

The page must preserve the accepted Phase 8A capability boundary:

```text
readOnly = true
writeAllowed = false
deleteAllowed = false
productionProvisioningAllowed = false
canonicalContextWriteAllowed = false
autonomousExecutionAllowed = false
humanAuthorityDecisionAllowed = false
```

No button on Phase 8C may imply mutation or external execution.

## 6. Navigation

The Atlas primary navigation adds:

```text
Continuity / Resume
```

Navigation between Product Surface and legacy routes may cause a page-level hash replacement so the correct route owner is re-entered cleanly.

The Continuity route action tray may navigate only to existing read surfaces such as Desk and Source Review.

## 7. Inspector boundary

Phase 8C does not add a Continuity Inspector. The existing right Inspector panel is closed on this route. Bounded read-only detail interaction belongs to Phase 8D.

## 8. Responsive / visual boundary

Phase 8C adds route-scoped styles only. It must reuse the existing Atlas paper/editorial shell, typography and design tokens instead of creating a parallel app shell.

Final visual/browser acceptance is deferred to Phase 8F, where local browser/Codex inspection is allowed.

## 9. Acceptance

Phase 8C is accepted only if tests prove:

- `#continuity` is a Product Surface route;
- legacy `#reentry` remains legacy;
- only the accepted static snapshot is fetched;
- no POST, Web Storage persistence, D1, DataHub, GitHub API, local bridge or external mutation path exists in the Continuity module;
- unavailable snapshot state has no silent fallback;
- rendered semantics include Resume State, continuity, Outcome, Checkpoint, history, verification and write-back safety;
- Phase 8B/8A regressions pass;
- Phase 5 and Phase 4 frozen acceptance remains green.
