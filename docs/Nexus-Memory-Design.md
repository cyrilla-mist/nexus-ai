# Nexus Memory Design

> Status: Design only. This document defines the long-term direction of Nexus Memory and does not represent a storage implementation.

## 1. Purpose

Nexus Memory enables Nexus to move beyond one-time responses and progressively understand the user, the project, and the evolution of its own capabilities.

Memory is not a simple chat history. It is the **Context Layer** of Nexus Brain: a structured, traceable source of context that helps Nexus Core select relevant information before an Atlas works and preserve useful outcomes afterward.

Its purpose is to:

- maintain continuity between project interactions;
- distinguish durable facts from temporary assumptions;
- preserve project decisions and their evolution;
- provide the minimum relevant context to each Atlas;
- support future capability growth without turning raw conversations into permanent memory.

## 2. Memory Architecture

```text
Nexus Memory
├── User Memory
├── Project Memory
└── Atlas Memory
```

The three memory domains have separate responsibilities:

- **User Memory** describes stable preferences, goals, and working patterns.
- **Project Memory** describes the lifecycle and evolving state of a specific project.
- **Atlas Memory** describes system versions and the capabilities available to Nexus Core.

Memory retrieval should be scoped to the active task. An Atlas should receive only the context required to complete its work.

## 3. User Memory

User Memory may record stable, explicitly observed information such as:

- user preferences;
- long-term goals;
- preferred ways of working;
- recurring interaction patterns.

Examples:

- The user prefers innovation and entrepreneurship projects.
- The user wants analysis from a reviewer or judge perspective.

User Memory must not record sensitive personal information. A preference should be stored only when it is relevant, sufficiently stable, and supported by the user's own input. Inferences must remain distinguishable from confirmed facts.

## 4. Project Memory

Project Memory records the evolution of a project across the Nexus project lifecycle:

```text
Idea
  ↓
Explore
  ↓
Design
  ↓
Validate
  ↓
Execute
```

It may contain:

- the original project idea;
- clarification answers provided by the user;
- changes to the Project Blueprint;
- changes in identified risks;
- current and completed next actions;
- historical decisions and their rationale.

Example structure:

```json
{
  "project": "",
  "stage": "",
  "history": [],
  "decisions": []
}
```

Project Memory should preserve meaningful changes rather than copying every message. Each update should identify its source, time, project stage, and whether the content is a fact, assumption, or decision.

## 5. Atlas Memory

Atlas Memory records the growth of Atlas capabilities. It is not AI self-awareness; it is a system-maintained record of versions, supported tasks, constraints, and capability evolution.

Example:

```text
Project Atlas
├── v0.1
│   └── Project analysis capability
└── v0.1.1
    └── Multi-turn context capability
```

Nexus Core can use Atlas Memory to understand which Atlas is available, what it can do, and which limitations must still be respected.

## 6. Memory Lifecycle

### Create

Project Memory begins when a user first submits a project idea. User Memory and Atlas Memory are created only when durable, relevant information is available.

### Read

Nexus Core determines which memory domains and records are needed for the current task. Retrieval should be minimal and purpose-specific.

### Update

After Project Atlas completes its task and Reflection validates the result, confirmed project changes, decisions, and next actions may be written back to Memory.

### Retain

Project history is retained as a sequence of meaningful state changes. Temporary prompts, failed model output, duplicate answers, and unrelated data should not become durable memory.

## 7. Future Storage Evolution

The storage path should evolve gradually:

```text
Current
Session / Local Storage
        ↓
Cloudflare KV
        ↓
Cloudflare D1
        ↓
DataHub Context Graph
```

- **Current:** browser session state supports temporary continuity without server-side persistence.
- **Cloudflare KV:** may support lightweight, low-complexity context retrieval.
- **Cloudflare D1:** may support structured project history, decisions, and relationships.
- **DataHub Context Graph:** may eventually connect users, projects, decisions, evidence, and Atlas capabilities as an explicit context graph.

These stages are future options, not current implementation commitments. Storage should be introduced only when its privacy model, ownership rules, and deletion behavior are defined.

## 8. Relationship with Atlas Framework

Memory is the context layer of Nexus Brain. It supports the Atlas Framework without replacing Nexus Core, Atlas reasoning, or Reflection.

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

Nexus Core decides what context is relevant. The selected Atlas performs the task. Reflection checks the output before any durable memory update. This boundary prevents unvalidated model output from automatically becoming trusted context.

## 9. Security and Privacy Principles

- Users control their information and should be able to understand what is retained.
- Memory stores only information relevant to an explicit product purpose.
- Sensitive personal information is not stored.
- Every memory item should have a clear source.
- Facts, assumptions, model inferences, and user decisions remain distinguishable.
- Failed, invalid, or unreviewed model output must not become durable memory.
- Future persistent storage must define access, retention, correction, and deletion rules before implementation.
