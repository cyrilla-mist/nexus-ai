# Nexus AI Architecture Overview

## 1. Vision

Nexus AI is an AI workspace for turning an initial idea into a project that can be understood, refined, advanced, and reviewed over time.

It is not designed as a general-purpose chatbot or a single-response generation tool. The system organizes project context across several bounded layers so that it can:

- understand the user's project intent;
- retrieve relevant prior context;
- produce a structured project analysis;
- represent stages, milestones, and actionable work;
- retain only qualified project changes;
- present project relationships and growth in a readable space.

The current architecture establishes these capabilities without persistent storage, multi-user collaboration, or autonomous execution.

## 2. System Overview

Nexus is organized as a set of cooperating layers:

```text
User
  ↓
Nexus Core
  ↓
Agent Layer
  ↓
Memory Layer
  ↓
Execution Layer
  ↓
Experience Layer
  ↓
Visual Layer
```

This diagram describes responsibility boundaries, not a strictly linear runtime sequence. In operation, Nexus Core coordinates retrieval before analysis and controlled memory updates after validation.

| Layer | Primary responsibility | Boundary |
| --- | --- | --- |
| Agent | Understand and analyze a project | Does not own persistence or presentation |
| Memory | Retrieve context and retain qualified changes | Does not generate project strategy |
| Execution | Represent project stage, milestones, and tasks | Does not execute work automatically |
| Experience | Convert internal results into stable read-only views | Does not mutate core state |
| Visual | Present context, relationships, and growth | Does not create business data |

The Cloudflare Worker is the external request boundary. It passes validated requests to Nexus Core and returns structured results to the plain JavaScript frontend.

## 3. Agent Layer

### Nexus Core

Nexus Core is the orchestration boundary. It is responsible for:

- coordinating a request from input to response;
- selecting the appropriate Atlas through the router;
- retrieving relevant memory context;
- passing context into the selected Atlas;
- coordinating reflection and qualified memory updates;
- assembling the read-only experience output.

Nexus Core does not perform Atlas-specific analysis and does not directly implement storage behavior.

### Project Atlas

Project Atlas is the current project-focused agent. It is responsible for:

- interpreting the user's idea and stated constraints;
- producing a structured project profile and blueprint;
- identifying risks and clarification questions;
- proposing the next action;
- producing an execution plan that can be represented by the Execution Layer.

Model access remains behind the Model Router. The current runtime can use DeepSeek when configured and preserves Mock and Fallback modes when a model is unavailable or its output is invalid.

Reflection validates the structured result before it can contribute to a memory update. Project Atlas never writes directly to Memory.

## 4. Memory Layer

The Memory Layer is Nexus's context boundary. It is not a transcript archive.

### Memory Retrieval

Memory Retrieval provides relevant historical context to Nexus Core. It can retrieve user, project, and Atlas memory categories through a stable manager interface. A request without matching memory remains valid and follows the original analysis path.

### Memory Update

Memory Update applies approved candidates to Project Memory. The current update flow records qualified project decisions, history, stage changes, completed milestones, and other durable progress without storing every model response.

### Memory Policy

Memory Policy determines whether a candidate is safe and valuable enough to retain. It favors:

- information explicitly confirmed by the user;
- high-confidence project decisions;
- confirmed project stage changes;
- completed milestones or meaningful progress.

It rejects low-confidence guesses, unverified model claims, temporary suggestions, and incomplete activity. Candidate source, confidence, and category remain available so that memory behavior is explainable.

The current store is an in-memory foundation. Persistent storage is outside the present version.

## 5. Execution Layer

The Execution Layer represents how a project can move forward. It provides structured state rather than a complete project-management system.

### Project State

Project State describes the current phase, status, and goal. Nexus uses five project stages:

```text
Idea → Explore → Design → Validate → Execute
```

- **Idea:** clarify the initial idea, problem, and intended user.
- **Explore:** investigate needs, evidence, market context, and alternatives.
- **Design:** define the solution, technical direction, and delivery approach.
- **Validate:** test assumptions through an MVP, research, or user feedback.
- **Execute:** carry out confirmed work and review outcomes.

### Milestone

A milestone represents a meaningful stage objective. It includes a goal, status, and related tasks. Milestones make progress measurable without reducing the project to a flat task list.

### Task

A task represents a concrete action. In addition to its title and status, it preserves why the action matters and the criteria for completion.

### Progress Memory

Confirmed execution progress can be reflected into a progress candidate, evaluated by Memory Policy, and then stored in Project Memory. Generated tasks, incomplete attempts, and unverified progress do not become durable memory automatically.

## 6. Experience Layer

The Experience Layer converts internal Atlas, Memory, and Execution structures into stable, read-only presentation models.

### Project Overview

Project Overview presents the project title, summary, stage, goal, and current direction.

### Project Journey

Project Journey maps the five-stage lifecycle and marks completed, current, and upcoming stages.

### Action Navigator

Action Navigator presents the current objective, recommended actions, their purpose, and completion criteria. It is a navigation aid rather than a generic to-do list.

### Context Map

Context Map converts project information into a read-only Context Graph with typed nodes and semantic edges. Its first node types are Project, Problem, Decision, Milestone, Task, and Progress. Relationships such as `addresses`, `supports`, `contains`, and `updates` explain why elements belong together.

The Experience Layer does not write to Memory, alter Execution state, or invoke Project Atlas. It only adapts approved system output for presentation.

## 7. Visual Layer

### Visual System

Nexus has two coordinated visual modes:

- **静谧深空 (Quiet Deep Space):** a dark, restrained spatial environment using blue-black surfaces, soft indigo accents, and low-intensity paths.
- **晨雾星图 (Morning Mist Star Map):** a light environment using mist white, pale blue, muted violet, and map-like lines.

Both modes prioritize legibility, calm interaction, and contextual relationships. They avoid neon effects, science-fiction interface decoration, and visual motion that competes with content.

### Star Map

The Star Map Renderer turns the Context Graph into a deterministic project space:

- the Project node forms the central core;
- Problem and Decision nodes form the understanding layer;
- Milestone and Task nodes form the execution layer;
- Progress nodes form the outer growth layer;
- semantic edges preserve the meaning of relationships.

The current renderer provides a read-only spatial foundation and a semantic fallback view. It does not use 3D, automatic graph layout, or complex animation.

Visual behavior serves Context. It never creates or changes project facts.

## 8. Complete Data Flow

The current end-to-end flow is:

```text
User Idea
  ↓
Frontend / Cloudflare Worker
  ↓
Nexus Core
  ↓
Memory Retrieval
  ↓
Router / Project Atlas
  ↓
Model Router → DeepSeek or Mock / Fallback
  ↓
Structured Project Analysis and Execution Plan
  ↓
Reflection
  ↓
Memory Candidate → Memory Policy → Project Memory Update
  ↓
Context Experience
  ↓
Context Map
  ↓
Star Map / Project Space
  ↓
User Understanding
```

In more detail:

1. The frontend sends a validated project request through the Worker.
2. Nexus Core retrieves relevant project, user, or Atlas context when identifiers are available.
3. The router selects Project Atlas for the project task.
4. Project Atlas combines the current request, multi-turn context, and retrieved memory.
5. The Model Router selects DeepSeek or a safe local mode and returns normalized structured output.
6. Reflection checks the analysis and execution progress.
7. Qualified candidates pass through Memory Policy before Project Memory changes.
8. The Experience Layer builds Project Overview, Journey, Action Navigator, and Context Map views.
9. The frontend presents these views through Project Space and the Star Map Renderer.

Each boundary remains optional-safe: missing memory, unavailable model access, or empty visual context must not prevent the rest of the system from returning a controlled result.

## 9. Architecture Principles

### Context over Chat

Nexus organizes durable project context instead of treating a conversation transcript as the product.

### Memory with Boundaries

Only qualified, attributable information enters Memory. Retrieval and update remain separate operations.

### Human Decision First

Nexus proposes interpretations and actions, but the user remains responsible for confirmation and project decisions.

### Growth Visible

Stages, milestones, decisions, tasks, and progress are represented so that project development can be understood over time.

### Calm Intelligence

The system favors clear structure, restrained presentation, and explainable behavior over visual or model-driven spectacle.

These principles are supported by replaceable module boundaries: Atlas does not own Memory, Experience does not mutate business state, and Visual components consume stable view data.

## 10. Future Evolution

The current architecture leaves defined extension points for:

- **Persistent Storage:** migrate the replaceable Memory Store from local in-memory storage toward Cloudflare KV or D1 when persistence requirements are defined.
- **DataHub Context Graph:** map approved project entities and relationships into a richer external context graph.
- **Multi Atlas:** allow Nexus Core to coordinate additional specialized Atlas agents without moving memory ownership into those agents.
- **Collaboration:** add explicit ownership, permissions, and shared project context after a user and access-control model exists.

These capabilities are not part of the current version. Their introduction must preserve the existing boundaries: controlled retrieval, policy-governed updates, read-only experience adapters, and user authority over project information.
