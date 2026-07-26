# Project Atlas Execution Layer Design

> Status: Design only. This document defines architecture boundaries and does not implement the Execution Layer.

## 1. Purpose

Project Atlas currently helps a user understand and structure a project. It can:

- interpret an early idea;
- clarify the problem and target users;
- generate a Project Blueprint;
- identify risks;
- recommend a next action.

This is sufficient for analysis, but not for sustained project progress. A single next-action recommendation does not define how a project moves through stages, how completion is evaluated, or how progress changes future planning.

The Execution Layer will extend Project Atlas with the ability to:

- define a stage-appropriate progression path;
- establish explicit stage goals;
- propose milestones;
- decompose milestones into verifiable tasks;
- interpret user-reported progress;
- propose the next plan based on the latest confirmed project state.

Its objective is to support:

```text
Idea → Explore → Design → Validate → Execute
```

In this design, execution means helping the user plan, validate, and record progress. It does not mean autonomously performing external actions, changing repositories, spending money, contacting people, or declaring work complete without evidence.

## 2. Current Capability

The current Project Atlas flow is:

```text
User Input
    ↓
Project Understanding
    ↓
Project Blueprint
    ↓
Risk Analysis
    ↓
Next Action
```

The result describes the project at the current moment and provides one recommended next action. Multi-turn context and Project Memory allow later analysis to reuse confirmed information.

Current limitations:

- the next action is not attached to a durable milestone;
- completion criteria are not defined consistently;
- task dependencies and order are not represented;
- reported progress is not compared against a plan;
- stage transitions are inferred from analysis, but are not managed as explicit project decisions;
- each new recommendation may lack a clear relationship to earlier actions.

The Execution Layer addresses these gaps without replacing the existing Blueprint, risk analysis, Reflection, or Memory mechanisms.

## 3. Target Architecture

```text
User
  ↓
Nexus Core
  ↓
Memory Context
  ↓
Project Atlas
  ↓
Execution Layer
  ↓
Milestone / Task Plan
  ↓
Reflection
  ↓
Memory Candidate
  ↓
Memory Policy
  ↓
Memory Update
```

The Execution Layer is an internal Project Atlas capability. It is not:

- a new Atlas;
- a replacement for Nexus Core orchestration;
- a storage layer;
- an autonomous task runner;
- a general-purpose Todo application.

### Responsibility boundary

| Module | Responsibility |
| --- | --- |
| Nexus Core | Retrieves context, selects Project Atlas, and coordinates Reflection and approved Memory updates. |
| Project Atlas | Understands the project, maintains the Blueprint, evaluates risks, and invokes its execution-planning capability. |
| Execution Layer | Converts the current project state into proposed milestones and verifiable tasks. |
| Reflection | Checks whether the proposed plan is consistent, supported, safe, and complete enough to present or retain. |
| Memory Policy | Decides which confirmed progress, decisions, or stage changes may be written. |
| Memory Manager | Applies approved updates without interpreting project meaning. |

The Execution Layer produces proposals. The user remains responsible for accepting goals, reporting completion, and making final project decisions.

## 4. Project Stage Model

Project Atlas retains the existing lifecycle:

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

A stage describes the project's current evidence and decision maturity. It must not be advanced merely because a model generated a more detailed plan.

### Idea

Goal:

- make the project idea understandable.

Focus:

- the problem or opportunity;
- the intended user;
- the initial direction;
- critical unknowns.

Typical completion evidence:

- a concise idea statement;
- a preliminary target user;
- a problem that can be investigated.

### Explore

Goal:

- determine whether the problem is real and worth addressing.

Focus:

- user research;
- problem evidence;
- market and environment analysis;
- alternatives and competitors;
- constraints and available resources.

Typical completion evidence:

- traceable user or domain observations;
- a refined problem statement;
- documented assumptions that remain unverified.

### Design

Goal:

- form a coherent proposed solution.

Focus:

- product or service design;
- technical approach;
- value proposition;
- operating or business model;
- feasibility and trade-offs.

Typical completion evidence:

- an updated Blueprint;
- an explainable solution scope;
- agreed priorities and milestones.

### Validate

Goal:

- test the most important assumptions and feasibility claims.

Focus:

- MVP or prototype;
- user testing;
- measurable validation criteria;
- feedback and observed results;
- risk reduction.

Typical completion evidence:

- a completed validation activity;
- results linked to defined criteria;
- a decision to continue, revise, pause, or stop.

### Execute

Goal:

- coordinate delivery of the validated project direction.

Focus:

- active tasks;
- delivery milestones;
- ownership and dependencies;
- progress review;
- iteration and retrospective.

Typical completion evidence:

- completed milestone criteria;
- delivered project outputs;
- recorded outcomes and follow-up decisions.

### Stage transition rules

- Stage changes require observable project signals, not model confidence alone.
- A proposed transition must include a rationale and supporting context.
- Reflection checks the transition proposal.
- Memory Policy controls whether the confirmed transition is retained.
- The user may reject or revise a proposed transition.
- A project may remain in a stage or return to an earlier stage when validation reveals missing evidence.

## 5. Milestone Design

A Milestone represents a meaningful, stage-level outcome. It groups tasks that collectively move the project toward a defined goal.

Minimum model:

```json
{
  "id": "milestone-1",
  "title": "Validate the core problem",
  "stage": "Explore",
  "status": "proposed",
  "goal": "Confirm that the target users experience the stated problem",
  "criteria": [
    "Research scope is defined",
    "Findings are recorded",
    "A continue or revise decision is documented"
  ],
  "tasks": []
}
```

Recommended milestone statuses:

- `proposed`: generated but not yet accepted by the user;
- `active`: accepted and currently in progress;
- `blocked`: cannot progress because a dependency or required input is missing;
- `completed`: completion criteria have been met and confirmed;
- `cancelled`: intentionally abandoned or replaced.

Milestone rules:

- Each milestone belongs to one primary project stage.
- The goal must describe an outcome, not an activity list.
- Completion criteria must be observable.
- A milestone is not completed solely because all generated tasks are marked complete; its outcome criteria must also be satisfied.
- Project Atlas should prefer a small number of active milestones to avoid producing an unusable plan.

## 6. Task Design

A Task is a concrete unit of work that contributes to a milestone.

Minimum model:

```json
{
  "id": "task-1",
  "milestoneId": "milestone-1",
  "title": "Prepare five user interview questions",
  "description": "Create questions that test the problem without leading respondents",
  "status": "proposed",
  "rationale": "The project needs direct problem evidence before solution design",
  "criteria": "Five neutral questions are reviewed and ready to use",
  "goalLink": "Validate the core problem"
}
```

Recommended task statuses:

- `proposed`;
- `ready`;
- `in_progress`;
- `blocked`;
- `completed`;
- `cancelled`.

A Task is not merely a Todo item. It should state:

- what should be done;
- why the work is necessary now;
- what observable result defines completion;
- which milestone and project goal it supports;
- any known dependency or missing input.

Task rules:

- Do not invent owners, dates, budgets, tools, or resources.
- Use “无法判断” or request clarification when required execution details are missing.
- Do not mark a task complete based only on a user intention or model assumption.
- User-reported completion may create a progress candidate, but must pass Reflection and Memory Policy before retention.
- Tasks should be small enough to evaluate but large enough to produce a meaningful result.

## 7. Action Plan Generation

The planning flow is:

```text
Project Context
      ↓
Current Stage
      ↓
Identify Stage Goal
      ↓
Identify Blocking Unknowns
      ↓
Generate Milestone
      ↓
Generate Ordered Tasks
      ↓
Define Completion Criteria
```

### Inputs

The Execution Layer may use:

- the current Project Blueprint;
- current project stage and its rationale;
- confirmed Project Memory;
- completed, active, or blocked milestones;
- confirmed decisions;
- unresolved risks;
- user constraints and available resources;
- the latest accepted or reported result.

### Generation rules

1. Determine the current stage from confirmed context.
2. Identify the smallest meaningful stage goal.
3. Prioritize unknowns or risks that block progress.
4. Reuse an existing active milestone when it still fits.
5. Generate a new milestone only when the existing one is complete, invalid, or explicitly replaced.
6. Generate ordered tasks whose criteria can be checked.
7. Explain how each task supports the milestone.
8. Ask for clarification instead of inventing execution details.
9. Present the plan as a proposal until the user accepts it.

The plan must be project-specific. A fixed template may provide structural consistency, but it must not determine the milestone goal, task content, status, or completion criteria.

### Replanning

Replanning may occur when:

- the user reports a result;
- a task becomes blocked;
- new evidence changes an assumption;
- a risk becomes material;
- milestone criteria are met;
- the user changes the project goal.

Replanning should update the existing plan rather than produce an unrelated replacement. The result must state what changed and why.

## 8. Relationship With Memory

The Execution Layer consumes a scoped Project Memory projection supplied by Nexus Core.

### Read

Relevant context includes:

- project history;
- current stage;
- confirmed decisions;
- active and completed milestones;
- task completion evidence;
- blocked tasks and unresolved risks;
- previously accepted next actions.

The Execution Layer does not receive Memory Store access.

### Proposed updates

Execution output may produce candidates for:

- an accepted milestone;
- task status changes reported by the user;
- milestone completion supported by criteria;
- a confirmed project-stage transition;
- a new project decision;
- a durable blocked-state reason.

The write path remains:

```text
Execution Output
      ↓
Reflection
      ↓
Memory Candidate
      ↓
Memory Policy
      ↓
Memory Update
```

The Execution Layer never writes Memory directly.

Memory safety rules:

- generated plans remain proposals until accepted or supported by evidence;
- model-generated task completion is never treated as fact;
- retries must not duplicate progress events;
- rejected candidates leave the last valid project state unchanged;
- raw model output and hidden reasoning are not stored;
- assumptions remain separate from confirmed project history.

## 9. Relationship With DataHub Future

DataHub may later represent execution context as a traceable graph:

```text
Project Entity
      ↓
Problem
      ↓
Evidence
      ↓
Decision
      ↓
Milestone
      ↓
Task
      ↓
Result
```

This graph could support:

- tracing a task back to the decision and evidence that justified it;
- identifying milestones affected by changed evidence;
- sharing scoped context across future Atlas capabilities;
- reviewing how project decisions evolved.

DataHub is not part of the initial Execution Layer. The first implementation should use the existing Project Memory boundary and must not depend on graph storage, a database, or external persistence.

## 10. Design Principles

- Do not build a generic Todo tool.
- Every action must serve an explicit project goal.
- Plans must come from current project context, not fixed templates.
- Milestones describe outcomes; tasks describe verifiable work.
- Status changes require user input or observable evidence.
- Project stages may advance, remain unchanged, or move backward.
- Execution output is a proposal until reviewed or accepted.
- Project Atlas does not directly control Memory.
- Reflection and Memory Policy remain mandatory write boundaries.
- Memory records project growth, not every generated suggestion.
- Do not invent dates, resources, owners, evidence, or completion.
- The user remains the final decision-maker.
- Keep the Execution Layer replaceable and independent from future storage choices.
