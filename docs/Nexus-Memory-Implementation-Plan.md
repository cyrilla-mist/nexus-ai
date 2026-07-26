# Nexus Memory Implementation Plan

> Target: Nexus AI v0.2 Memory Foundation
> Status: Implementation plan only. This document does not implement Memory or change the current runtime architecture.

## 1. Goal

Nexus AI v0.2 Memory Foundation will establish the minimum context layer required to move Nexus from a one-time Agent to an AI work partner with task continuity.

The release will focus on:

- representing user, project, and Atlas context with explicit data contracts;
- retrieving only the context needed for the current task;
- updating context only after a valid Atlas result passes Reflection;
- preserving project continuity across the existing limited multi-turn workflow;
- keeping Memory behavior deterministic and testable in Mock, DeepSeek, and Fallback modes.

v0.2 will establish Memory foundations only. It will not introduce durable cloud storage, user accounts, semantic retrieval, or a complete long-term memory product.

### Current baseline

The repository already has a minimal `memory/memory.js` module that can create, normalize, and update a request-provided memory object. Nexus Core currently updates a project summary, stage, and next action after Project Atlas returns.

v0.2 should formalize this baseline rather than replace it. The missing foundation is a consistent data model and lifecycle around retrieval before Atlas execution, validated updates after Reflection, source tracking, and tests.

## 2. v0.2 Scope

### Included

- A versioned Memory data model.
- A minimal Memory Layer interface.
- Project Memory for project state and lifecycle changes.
- A minimal User Memory for non-sensitive preferences.
- A static Atlas Memory capability record.
- Memory retrieval before Atlas execution.
- Memory updates after Reflection.
- Safe behavior for invalid requests, Atlas errors, and failed Reflection.
- Unit and integration tests for Memory contracts and continuity.
- Compatibility with the current browser session state and Worker request flow.

### Excluded

- Database persistence.
- Cloudflare KV.
- Cloudflare D1.
- DataHub or a Context Graph.
- MCP.
- RAG, embeddings, or vector search.
- Authentication or login.
- Multi-user tenancy.
- A complete long-term memory system.
- New frontend features.
- New runtime dependencies.

### Planned delivery sequence

1. Freeze and test the Memory schema.
2. Define pure Memory Layer contracts.
3. Add project and user context retrieval to Nexus Core.
4. Add Reflection-gated Memory updates.
5. Verify continuity and failure safety across Mock, DeepSeek, and Fallback.
6. Document storage-adapter boundaries for a later release without connecting external storage.

Each step must keep the existing Worker API and Project Atlas top-level result structure compatible.

## 3. Architecture Design

```text
User
  ↓
Nexus Core
  ↓
Memory Layer
  ↓
Atlas Agent
  ↓
Reflection
  ↓
Memory Update
```

### Module responsibilities

| Module | Responsibility |
| --- | --- |
| User / frontend | Supplies the current request and session-scoped Memory snapshot. Retains temporary state in the existing browser session mechanism. |
| Nexus Core | Determines intent, requests relevant context, selects an Atlas, and coordinates the post-result update. |
| Memory Layer | Normalizes Memory, retrieves scoped context, applies validated updates, preserves provenance, and returns a new immutable snapshot. |
| Atlas Agent | Receives task context selected by Nexus Core and produces a structured result. It does not own or persist Memory. |
| Reflection | Checks result completeness and safety before any Memory update is accepted. |
| Memory Update | Converts the validated result into explicit project, user, or Atlas changes and returns the updated snapshot. |

The Memory Layer remains a plain JavaScript domain module. Storage is outside its responsibility. In v0.2, Memory continues to travel through the existing request, response, and browser-session boundary.

## 4. Memory Data Model

All Memory snapshots should include a schema version so later storage migrations can be explicit. Entries that may evolve over time should distinguish confirmed user input, system-derived state, and Atlas inference.

### User Memory

```json
{
  "userId": "",
  "preferences": {},
  "history": []
}
```

Responsibilities:

- record only non-sensitive preferences explicitly supplied or confirmed by the user;
- preserve the source and update time of each preference change;
- avoid inferring identity, demographics, health, finance, or other sensitive attributes;
- use an opaque session-scoped identifier in v0.2, not an account identity.

The minimal version does not need behavioral profiling. User history should contain only Memory-relevant changes, not a copy of the chat transcript.

### Project Memory

```json
{
  "projectId": "",
  "title": "",
  "stage": "Idea",
  "history": [],
  "decisions": [],
  "nextActions": []
}
```

Responsibilities:

- record the initial idea and current normalized project state;
- preserve stage transitions across Idea, Explore, Design, Validate, and Execute;
- record clarification answers and meaningful Blueprint changes;
- record risks, decisions, next actions, and the basis for changes;
- retain prior state when a request or model call fails;
- avoid duplicate history entries when the same turn is retried.

Each history or decision entry should carry a stable event identifier, source type, turn number, and timestamp. The schema must keep facts, assumptions, decisions, and model suggestions distinguishable.

### Atlas Memory

```json
{
  "atlasId": "",
  "version": "",
  "capabilities": [],
  "improvements": []
}
```

Responsibilities:

- describe the registered Atlas version and supported capabilities;
- provide Nexus Core with static capability context for routing;
- record versioned capability changes through maintained configuration;
- never represent consciousness, private reasoning, or autonomous self-modification.

Atlas Memory is read-only at runtime in v0.2. Capability changes enter through reviewed product releases, not model-generated updates.

### Snapshot envelope

The three domains should be carried in one versioned snapshot with:

- `schemaVersion`;
- `user`;
- `projects` or the current `project`;
- `atlases`;
- update metadata required for validation and retry deduplication.

The exact field naming must be finalized before implementation and then covered by schema-focused tests.

## 5. Memory API Design

The following interfaces are design contracts, not implementation code.

### `createMemory()`

**Input:** optional session-scoped user identifier, project seed, and schema version.
**Output:** a normalized empty Memory snapshot.
**Responsibility:** establish safe defaults without creating persistent storage or inventing user data.

### `getMemory()`

**Input:** a Memory snapshot and an explicit scope such as user, project, or Atlas.
**Output:** a normalized copy of the requested domain or a safe empty value.
**Responsibility:** provide deterministic reads and prevent callers from depending on malformed input.

### `updateMemory()`

**Input:** the previous snapshot, a validated update command, provenance metadata, and an idempotency event identifier.
**Output:** a new Memory snapshot plus a summary of applied or rejected changes.
**Responsibility:** apply immutable, deduplicated, Reflection-approved updates. Invalid updates return the previous snapshot unchanged.

### `retrieveContext()`

**Input:** a Memory snapshot, Atlas identifier, current intent, project identifier, and retrieval limits.
**Output:** a small task-context object containing only relevant confirmed facts, active assumptions, recent decisions, current stage, and pending next actions.
**Responsibility:** keep raw Memory separate from Atlas prompts and avoid sending unrelated user or project history to the model.

### Contract rules

- All interfaces return normalized plain JavaScript objects.
- Reads do not mutate the input snapshot.
- Updates require explicit provenance.
- Replayed events do not create duplicate history.
- Errors preserve the last valid snapshot.
- No interface performs network or database access in v0.2.

## 6. Integration With Project Atlas

```text
User Input
    ↓
Nexus Core
    ↓
Retrieve Memory
    ↓
Project Atlas
    ↓
Generate Result
    ↓
Reflection
    ↓
Update Memory
```

Planned flow:

1. The Worker validates the existing request boundary.
2. Nexus Core normalizes the incoming Memory snapshot.
3. Nexus Core asks the Memory Layer for Project Atlas context.
4. Project Atlas receives the current user input, clarification context, previous analysis, turn, and retrieved Memory context.
5. Project Atlas produces the existing structured result.
6. Reflection validates the result.
7. If Reflection passes, Nexus Core builds explicit Memory updates and applies them.
8. If Reflection fails or execution throws, the previous Memory snapshot is returned unchanged.

Memory does not belong directly to Project Atlas because:

- Nexus Core must control which context each Atlas can access;
- future Atlases may share user or project context without coupling to Project Atlas;
- persistence and privacy policy must remain outside model-facing task logic;
- Reflection must be able to reject an output before it becomes Memory;
- Atlas code should consume scoped context, not mutate shared state.

## 7. Storage Evolution

### v0.2

```text
session / local storage
```

The current browser session mechanism remains the transport and temporary retention boundary. The Memory Layer operates on plain objects and does not assume durable storage.

### Future

```text
Cloudflare KV
      ↓
Cloudflare D1
      ↓
DataHub Context Graph
```

The migration is phased because each storage layer solves a different problem:

- **KV** may provide simple key-based context retrieval with low operational complexity.
- **D1** may provide structured history, relationships, querying, correction, and deletion.
- **DataHub Context Graph** may connect projects, evidence, decisions, and Atlas capabilities when graph relationships are justified.

Before any migration, the project must define data ownership, retention, deletion, access control, migration, and failure-recovery rules. v0.2 should expose a storage boundary but implement no external adapter.

## 8. Testing Plan

1. **Memory creation**
   - creates every required domain with safe defaults;
   - applies the current schema version;
   - does not invent user or project facts.

2. **Memory reading**
   - normalizes missing or malformed fields;
   - returns only the requested domain;
   - does not mutate the input snapshot.

3. **Memory updating**
   - records validated project changes with provenance;
   - preserves prior history;
   - rejects malformed updates;
   - deduplicates retried event identifiers.

4. **Context injection into Atlas**
   - Nexus Core retrieves context before Project Atlas runs;
   - Project Atlas receives only the intended user, project, and capability fields;
   - sensitive or unrelated fields are excluded.

5. **Multi-turn task continuity**
   - clarification answers and prior decisions remain available on the next turn;
   - a user does not need to repeat confirmed information;
   - project stage and next actions evolve without resetting the Blueprint.

6. **Memory safety under errors**
   - invalid Worker requests do not update Memory;
   - network errors and timeouts preserve the previous snapshot;
   - invalid model output and failed Reflection do not become Memory;
   - Fallback preserves confirmed context;
   - retrying the same turn produces no duplicate history.

Tests should continue using the Node native test runner. Mock, DeepSeek-stubbed, and Fallback paths must be covered without real API calls.

## 9. Acceptance Criteria

v0.2 Memory Foundation is complete only when:

- Nexus Core can retrieve an existing project context before routing work to Project Atlas.
- Project Atlas can continue analysis using confirmed history without treating the task as a new project.
- Users do not need to repeat information already confirmed in Project Memory.
- User Memory stores only explicit, non-sensitive preferences.
- Atlas Memory exposes versioned capability information without runtime self-modification.
- Memory updates occur only after a valid result passes Reflection.
- Failed or retried requests preserve the last valid snapshot and create no duplicate events.
- Memory behavior is deterministic and covered by Node native tests.
- The Worker API remains compatible with the v0.1.1 frontend.
- Existing DeepSeek, Mock, and Fallback modes continue to work.
- No database, KV, D1, DataHub, MCP, RAG, login system, or new dependency is introduced.
- Documentation defines the deferred storage boundary and privacy requirements.
