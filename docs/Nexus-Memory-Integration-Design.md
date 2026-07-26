# Nexus Memory Integration Design

> Target: Nexus AI v0.2 Memory Integration
> Status: Design only. This document defines integration boundaries and does not change the current runtime.

## 1. Purpose

The Memory Layer now exists as an independent schema, in-memory store, and manager. It is not yet part of Nexus Core orchestration.

The next stage will allow Nexus Core to retrieve relevant context before an Atlas runs and request validated updates after Reflection. This integration is required to preserve useful project continuity without coupling storage behavior to Project Atlas.

Memory is not a chat transcript. It is the **Context Layer** of Nexus: a scoped, structured source of confirmed task context.

The integration must:

- retrieve only context required by the current task;
- keep Memory ownership outside Atlas implementations;
- prevent unvalidated model output from becoming Memory;
- preserve the existing DeepSeek, Mock, Fallback, and multi-turn behavior;
- keep storage replaceable.

## 2. Current Architecture

The current primary task flow is:

```text
User
  ↓
Nexus Core
  ↓
Project Atlas
  ↓
Reflection
```

The v0.2 Step 1 Memory Layer consists of:

- `memory/schema.js`;
- `memory/memory-store.js`;
- `memory/memory-manager.js`.

These modules are independent and are not called by Nexus Core or Project Atlas.

The repository also retains the v0.1.1 `memory/memory.js` helper. Nexus Core currently uses that helper to normalize a request-provided object and return a small project summary after Atlas execution. This is legacy request-scoped state, not integration with the new `MemoryManager`.

Step 2 should introduce the new integration without silently mixing the two models. Compatibility and migration behavior must be explicit and tested.

## 3. Target Architecture

```text
User
  ↓
Nexus Core
  ↓
Memory Retrieval
  ↓
Atlas Agent
  ↓
Reflection
  ↓
Memory Update
```

### Responsibilities in the flow

| Module | Responsibility |
| --- | --- |
| User / client | Supplies the current task, project reference, and session-scoped identifiers. |
| Nexus Core | Detects intent, selects an Atlas, decides the Memory retrieval scope, and orchestrates the sequence. |
| Memory Retrieval | Uses `MemoryManager` to obtain only the user, project, and Atlas context required for the selected task. |
| Atlas Agent | Consumes a read-only Context object and returns a structured result. |
| Reflection | Validates the result and determines whether proposed Memory changes are eligible to be saved. |
| Memory Update | Uses `MemoryManager` to apply approved changes while preserving the prior valid record on failure. |

Nexus Core coordinates calls but does not mutate Memory records directly. All reads and writes pass through the Memory Manager contract.

## 4. Memory Retrieval Design

Nexus Core should build a retrieval plan after intent detection and Atlas selection.

The decision inputs are:

- current intent;
- selected Atlas;
- whether a project identifier is present;
- whether a session-scoped user identifier is present;
- whether this is a new or continuing task.

### Retrieval scopes

#### User Memory

Retrieve only when stable, non-sensitive preferences can affect task execution, such as preferred language or analysis style. Absence of User Memory must not block the task.

#### Project Memory

Retrieve when the task refers to an existing project. Relevant context may include:

- current title and stage;
- confirmed history;
- prior decisions;
- pending next actions.

Project Memory should be the primary continuity source for Project Atlas.

#### Atlas Memory

Retrieve capability metadata when Nexus Core needs version or capability context for routing. Atlas Memory is read-only at runtime.

### Example retrieval decisions

| Situation | Retrieval |
| --- | --- |
| First request for a new project | Optional User Memory, a new empty Project Memory, and selected Atlas capability metadata. |
| Continue an existing project | Project Memory, optional User Memory, and selected Atlas capability metadata. |
| Request unrelated to an existing project | Optional User Memory and Atlas capability metadata; do not load unrelated Project Memory. |
| Missing or invalid project identifier | Continue with safe empty context or request clarification; do not guess a project. |

### Context assembly rules

- Return a read-only task Context, not raw Store access.
- Include confirmed facts before assumptions.
- Include only recent or active decisions needed for the current task.
- Exclude sensitive fields and unrelated projects.
- Preserve source labels so Atlas output can distinguish user facts, system state, and prior model suggestions.
- Retrieval failure must not corrupt Memory. Nexus Core may continue with empty context when the task remains safe.

## 5. Memory Update Design

Memory updates occur at explicit checkpoints. They are not automatic copies of prompts or model responses.

### After validated user input

The system may:

- create a new Project Memory record;
- record the user's initial project statement as user-sourced information;
- record explicit clarification answers;
- update non-sensitive preferences only when the user has clearly supplied or confirmed them.

User input must pass the existing request validation boundary before it is eligible for Memory.

### After Atlas analysis

Atlas may propose changes such as:

- Blueprint changes;
- project stage changes;
- new or resolved risks;
- candidate decisions;
- next actions.

These proposals remain temporary until Reflection completes. Project Atlas never calls the Store or Manager directly.

### After Reflection

Reflection determines whether the structured result is complete and safe enough to produce a Memory update command.

An approved command may record:

- normalized project changes;
- the source and turn of the change;
- accepted next actions;
- validation issues that remain relevant to the project.

If Reflection fails, execution throws, or the result is invalid:

- do not write Atlas output;
- preserve the previous Memory record;
- preserve valid user-sourced input separately when appropriate;
- return an understandable error or fallback result.

Fallback output may be stored only when it is normalized, clearly labeled by source, and passes the same Reflection gate. Assumptions must never be stored as confirmed facts.

### Update safety

- Use stable event identifiers to prevent duplicate updates on retry.
- Apply immutable updates through `MemoryManager`.
- Preserve `createdAt` and advance `updatedAt` only after a successful write.
- Do not overwrite project history with a single latest result.
- Do not store raw prompts, hidden reasoning, API responses, or secrets.

## 6. Module Responsibilities

### Nexus Core

Responsible for:

- deciding whether Memory retrieval is required;
- building the retrieval scope;
- selecting and calling the Atlas;
- coordinating Reflection and approved update requests;
- returning safe context when Memory is unavailable.

Not responsible for:

- directly editing Memory records;
- implementing storage;
- deciding that all Atlas output should be retained.

### Memory Manager

Responsible for:

- creating validated Memory records;
- retrieving records by explicit identifiers and types;
- updating approved fields;
- listing or removing records through defined contracts;
- preserving validation, type, copy, and error boundaries.

Not responsible for:

- intent detection;
- Atlas routing;
- model prompting;
- deciding the semantic truth of Atlas output.

### Project Atlas

Responsible for:

- consuming the Context provided by Nexus Core;
- distinguishing known facts from assumptions;
- producing the existing structured project analysis.

Not responsible for:

- selecting Memory records;
- managing storage;
- writing Memory;
- defining retention policy.

### Reflection

Responsible for:

- checking Atlas output structure and required fields;
- identifying unsupported or unsafe claims;
- determining whether a proposed update is eligible;
- returning issues that should block or limit a write.

Reflection does not perform the write. It returns a decision that Nexus Core uses when calling Memory Manager.

### Memory Store

Responsible for:

- storing and returning validated records;
- isolating stored values from caller mutation;
- supporting create, get, update, list, and remove.

The current Store is process-local and ephemeral. It must not be treated as durable Cloudflare Worker storage.

## 7. Memory Lifecycle

```text
Create
  ↓
Retrieve
  ↓
Use
  ↓
Reflect
  ↓
Update
  ↓
Persist
```

### Create

Create an empty or user-seeded record after identifiers and input are validated. Do not invent missing project or user data.

### Retrieve

Nexus Core requests the smallest relevant Memory scope for the selected task and Atlas.

### Use

The Atlas receives a read-only Context projection. It does not receive Store access or unrestricted history.

### Reflect

Reflection evaluates the Atlas result and any proposed changes. Failed validation blocks model-derived writes.

### Update

Memory Manager applies an approved, typed update. Retried event identifiers must not create duplicates.

### Persist

In v0.2, persistence means committing the record to the current in-memory Store for its available lifetime. Durable external persistence is outside this stage.

## 8. Data Flow Example

User input:

> 我想做校园环保项目

Flow:

1. Nexus Core validates the input and detects a project-creation intent.
2. No existing project identifier is available, so Core requests optional User Memory and creates an empty Project Memory record.
3. Memory Retrieval returns relevant user preferences, the empty project context, and Project Atlas capability metadata.
4. Nexus Core passes the user input and read-only Context to Project Atlas.
5. Project Atlas produces a structured project profile, Blueprint, risks, clarification questions, and next action.
6. Reflection checks structure, unsupported claims, assumptions, and next-action completeness.
7. If Reflection passes, Nexus Core asks Memory Manager to record:
   - the user-sourced initial idea;
   - the current project stage;
   - validated next actions;
   - an event source and turn identifier.
8. If Reflection fails, the new Project Memory keeps only valid user-sourced information; Atlas proposals are not written.
9. A later request uses the project identifier to retrieve this Project Memory and continue rather than starting again.

## 9. Future Extension

### Storage evolution

```text
Current Memory Store
        ↓
Cloudflare KV
        ↓
Cloudflare D1
        ↓
DataHub Context Graph
```

The Memory Manager contract should remain stable while Store implementations change. External storage requires separate decisions for authentication, ownership, retention, deletion, migration, and failure recovery.

### Multi-Atlas collaboration

Future Nexus Core versions may retrieve one project context and provide scoped projections to multiple Atlases.

The rules remain:

- each Atlas receives only relevant context;
- Atlas-specific suggestions remain source-labeled;
- one Atlas cannot directly change another Atlas's Memory;
- Reflection gates shared updates;
- Nexus Core owns orchestration.

No multi-Atlas coordination is part of the first integration step.

## 10. Design Principles

- Memory serves the task; it is not an unlimited record.
- Users retain control over what is stored, corrected, or removed.
- Atlas Agents do not directly control Memory.
- Record confirmed facts separately from assumptions and model suggestions.
- Reflection gates model-derived updates.
- Retrieval is scoped, minimal, and source-aware.
- Failures preserve the last valid Memory state.
- Retries must not create duplicate history.
- Storage implementations remain replaceable.
- The integration must preserve existing Worker, DeepSeek, Mock, Fallback, and multi-turn behavior.
