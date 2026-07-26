# Nexus Product Entry Experience Design

> Status: Design only. This document defines the product entry experience for Nexus v0.6. It does not implement frontend behavior, change Context Graph or Star Map rendering, introduce persistence, or alter core business modules.

## 1. Purpose

Nexus already provides the foundations of an AI project workspace:

- Nexus Core and Project Atlas understand and structure a project;
- Memory retrieves context and retains qualified changes;
- Execution represents project state, milestones, tasks, and progress;
- Experience produces read-only project views;
- Context Map and Star Map present relationships and project growth.

The current interface exposes these capabilities after the user reaches the analysis workspace. It does not yet provide a clear transition from first arrival to an active Project Space.

The entry experience must help the user understand from the beginning that Nexus is not a chatbot. It is a project growth space in which the user can:

1. create a project from an initial idea;
2. continue a recoverable project journey;
3. move from entry intent into Project Space without learning the internal architecture.

The entry must reduce ambiguity without adding a new product layer or duplicating Project Space.

## 2. Product Entry Concept

The product entry concept is **Nexus Space Entry**.

```text
Enter Nexus Space
        ↓
Create Project
        or
Continue Journey
```

The user enters through a project decision, not through an empty chat transcript.

### Create Project

Create Project begins a new project context. It asks for the minimum useful idea statement and sends it through the existing Nexus Core flow.

### Continue Journey

Continue Journey restores a recoverable session and returns the user to the latest known Project Space state.

### Entry promise

The entry should communicate three facts:

- Nexus works around a project, not a conversation;
- the initial idea can be incomplete;
- the user remains responsible for decisions while Nexus organizes context and next actions.

### Current-version constraint

Nexus v0.6 does not have an account system or persistent project database. Therefore:

- Continue Journey is available only when valid local session context exists;
- the entry does not show a remote project library;
- the interface must not imply cross-device or long-term cloud recovery;
- unavailable recovery is explained clearly instead of presenting a nonfunctional control.

## 3. First User Journey

```text
Landing
   ↓
Understand Nexus
   ↓
Create Project
   ↓
Describe an Idea
   ↓
Project Atlas Analysis
   ↓
Project Space Created
   ↓
Explore Context and Star Map
```

### Step 1: Landing

Purpose:

- establish orientation;
- present one primary path;
- avoid exposing analysis output before a project exists.

Required understanding:

- this is a space for developing projects;
- the user can begin with an incomplete idea;
- the first action is to create a project.

### Step 2: Understand Nexus

Purpose:

- explain the workflow in one concise statement;
- distinguish Nexus from a general chat interface.

Recommended explanation structure:

```text
Describe an idea → understand the project → map context → identify the next action
```

Do not explain Memory Policy, model routing, or internal Atlas terminology at entry level.

### Step 3: Create Project

Purpose:

- make project creation explicit;
- establish a new session boundary;
- avoid treating a text submission as an anonymous chat message.

The action label should describe the result, for example “创建项目空间”, rather than a generic “发送”.

### Step 4: Describe an Idea

Purpose:

- collect the minimum input required by Project Atlas;
- accept uncertainty without forcing a long setup form.

The field should invite:

- the problem or opportunity;
- the intended user when known;
- the desired outcome;
- current constraints when relevant.

Only the idea statement is required for the first version. Missing details are handled through existing clarification questions.

### Step 5: Project Atlas Analysis

Purpose:

- show that Nexus is constructing a project context;
- prevent duplicate submissions;
- provide understandable loading, timeout, and fallback feedback.

The loading state should describe the activity as project analysis, not “AI thinking”.

### Step 6: Project Space Created

Purpose:

- confirm a successful transition;
- establish Project Overview, Journey, Action Navigator, and Context Map as parts of one project space;
- preserve the original idea and normalized analysis in the existing session state.

### Step 7: Explore Context and Star Map

Purpose:

- let the user inspect relationships;
- show current stage and next action;
- make clarification and project refinement available after orientation.

The Star Map is not required to understand the initial result. Project Overview and Action Navigator remain readable fallbacks.

## 4. Returning User Journey

```text
Enter Nexus
   ↓
Recoverable Session Detected
   ↓
Continue Project
   ↓
Restore Context
   ↓
View Journey and Current Action
   ↓
Continue Refinement
```

### Session detection

The entry checks whether the current browser tab contains a valid recoverable session state.

A recoverable state must include at least:

- the initial project message;
- the latest normalized analysis;
- the current turn;
- the most recent display result.

Pending clarification answers may also be restored so a failed request can be retried without data loss.

### Continue Project

Purpose:

- return the user to an existing Project Space;
- preserve the latest confirmed result;
- avoid repeating initial project creation.

The action should display a concise project identifier such as the known project title or idea summary. If no title is available, use a neutral label rather than inventing a name.

### Restore Context

The restore operation may read existing frontend session state and request context through the established Nexus Core path when necessary. It must not:

- manufacture missing Memory;
- increase the turn counter without a successful analysis;
- submit pending answers automatically;
- overwrite the latest confirmed result.

### View Journey

After restoration, the user should first see:

- project identity;
- current stage;
- latest next action;
- recoverable pending work, if any.

The interface should not force the user back to the top-level welcome content after restoration.

### Continuity boundary

Memory supports contextual continuity inside the Nexus architecture, while entry recovery is constrained by available storage. Until persistent storage and accounts exist, the product must describe continuation as a local session capability.

## 5. Entry Interface Structure

The entry experience contains four coordinated regions. Not every region is visible in every state.

### Hero / Welcome

Purpose:

- establish Nexus as a project space;
- present the active entry choice;
- provide concise orientation.

Minimum content:

- Nexus identity;
- one sentence describing project transformation;
- the current entry action;
- theme control when already part of the application shell.

Avoid:

- large claims about AI capability;
- model names or technical status as primary content;
- chatbot-style greeting bubbles;
- decorative statistics;
- multiple competing calls to action.

### Create Project

Purpose:

- collect the initial idea;
- create a clear project boundary;
- begin the existing analysis flow.

Minimum controls:

- one idea input;
- one primary create action;
- a clear/reset action when needed;
- validation and request state feedback.

The existing clarification workflow remains in Project Space and is not duplicated in the entry form.

### Continue Project

Purpose:

- expose recoverable local progress;
- let the user choose whether to resume or begin again.

Visible only when valid session state exists.

Minimum information:

- known project title or summary;
- current stage;
- last confirmed turn or update state;
- a clear “继续项目” action.

Starting a new project while recoverable state exists requires an explicit confirmation because it clears the current tab session.

### Explore Space

Purpose:

- transition from entry orientation to the active Project Space;
- avoid rendering two competing workspaces.

Explore Space is a navigation state, not a separate source of project data. It may scroll, reveal, or switch to the existing Project Space after analysis or restoration.

### Entry states

| State | Primary content | Primary action |
| --- | --- | --- |
| No session | Welcome and Create Project | 创建项目空间 |
| Recoverable session | Continue summary plus secondary create option | 继续项目 |
| Analyzing | Progress and status feedback | Disabled current action |
| Analysis failed | Preserved input and understandable error | 重试 |
| Project ready | Project Space orientation | 探索项目空间 |
| Restored | Latest Project Space state | 继续完善项目 |

## 6. Relationship with Project Space

Entry and Project Space belong to one product flow:

```text
Entry
  ↓
Project Space
  ↓
Context Map
  ↓
Star Map
```

The entry owns orientation and route selection. Project Space owns the active project experience.

### Transition rules

- A successful first analysis creates and reveals Project Space.
- A successful restore returns directly to the latest confirmed Project Space.
- A failed first analysis keeps the user in the entry state with the original input.
- A failed later request keeps the existing Project Space visible and preserves pending answers.
- Clearing the project returns the interface to the no-session entry state.

### Shared information

Entry may display a concise projection of:

- project title;
- summary;
- current stage;
- last confirmed turn.

It must not duplicate:

- full Project Overview;
- Context Map;
- Star Map;
- clarification form;
- raw analysis output.

### Navigation continuity

The transition should preserve:

- current theme;
- keyboard focus;
- status announcements;
- session state;
- user-entered text after recoverable errors.

## 7. Visual Language

The entry inherits the Nexus Visual System. It does not introduce a separate landing-page brand.

### Dark Mode: 静谧深空

Direction:

- blue-black spatial canvas;
- restrained indigo or celestial-blue focus;
- low-intensity routes or anchor points;
- stable reading surfaces;
- localized emphasis around the active entry path.

The space should feel quiet and open, not empty or theatrical.

### Light Mode: 晨雾星图

Direction:

- mist-white canvas;
- pale blue and gray-violet spatial fields;
- fine map-like routes;
- paper-like reading clarity;
- calm project anchors.

The entry must not become a generic white marketing page.

### Shared visual hierarchy

1. Nexus identity and orientation;
2. active entry choice;
3. project idea or recoverable project summary;
4. secondary explanation;
5. technical status only when required.

### Avoid

- chatbot avatars or message bubbles;
- neon gradients;
- full-screen particle effects;
- science-fiction interface frames;
- model logos as product identity;
- oversized decorative typography;
- motion required to understand the entry choices.

## 8. Interaction Principles

The entry has three user intentions: create, continue, and explore.

### Create

- require only the minimum idea input;
- use a result-oriented action label;
- disable duplicate submission while analyzing;
- preserve the input on failure;
- clear previous session state only after explicit user intent.

### Continue

- show only when recovery is valid;
- restore the latest confirmed state before pending work;
- never resubmit automatically;
- explain when continuation is local to the current browser session.

### Explore

- reveal Project Space after a successful analysis or restore;
- place focus at the Project Space heading or current action;
- keep spatial views optional for basic comprehension;
- preserve read-only exploration behavior in Context Map and Star Map.

### General principles

- one primary action per state;
- plain-language Chinese feedback;
- no hidden destructive state reset;
- keyboard-accessible controls;
- visible focus;
- status announcements for asynchronous transitions;
- reduced motion support;
- mobile layouts that stack decisions rather than compressing them.

## 9. Technical Boundary

The Entry Experience is a frontend orientation and navigation layer.

```text
Entry UI
   ↓
Existing Worker Request Boundary
   ↓
Nexus Core
   ↓
Project Space
```

### Responsibilities

Entry may:

- detect valid frontend session state;
- present Create or Continue choices;
- collect the initial idea;
- invoke the existing request flow;
- reveal or navigate to Project Space;
- preserve presentation-only entry state.

Entry must not:

- perform AI reasoning;
- call Project Atlas directly;
- read or write Memory directly;
- modify Execution state;
- create Context Graph nodes;
- alter Star Map layout data;
- invent a project title or stage;
- introduce persistence beyond the approved session mechanism.

### Data ownership

| Data | Owner | Entry access |
| --- | --- | --- |
| Initial message | Existing session state | Read and submit through existing flow |
| Current analysis | Nexus result/session state | Read concise recovery projection |
| Clarification answers | Existing multi-turn session | Preserve, do not auto-submit |
| Memory Context | Memory Layer | No direct access |
| Execution state | Execution Layer | No direct access |
| Project Space views | Experience Layer | Navigate to rendered output |
| Theme | Frontend presentation state | Preserve and apply |

### Failure behavior

- Invalid local session: ignore recovery and show Create Project safely.
- Network failure during creation: keep input and show retry feedback.
- Worker `400`: explain what information needs correction.
- Worker `500`: preserve input and provide retry.
- Timeout: preserve state and explain that analysis did not complete.
- Fallback Mode: continue into Project Space with a visible, understandable model-status message.

## 10. Future Extension

Possible future extensions include:

- user accounts;
- persistent cross-device projects;
- multi-project navigation;
- team spaces and permissions;
- invitations and collaboration;
- Agent Marketplace entry points;
- templates for specific project types;
- recent-project search and filtering.

These capabilities are not part of the current entry design. Accounts, project libraries, and collaboration require separate identity, privacy, storage, and access-control specifications.

The first implementation should preserve an entry contract that can later replace local recovery with persistent project retrieval without changing Project Space responsibilities.

## 11. Design Principles

1. **Space over Chat**  
   Entry begins with a project choice, not an empty conversation.

2. **Context First**  
   Explain the project journey before exposing tools or model details.

3. **Calm Intelligence**  
   Use clear hierarchy and restrained feedback rather than AI spectacle.

4. **Easy Beginning**  
   Accept an incomplete idea and defer missing detail to the existing clarification flow.

5. **Continuous Journey**  
   Restore the latest confirmed state when valid context exists and describe recovery boundaries honestly.

6. **One Active Path**  
   Present one primary action for the user's current entry state.

7. **Human Decision First**  
   Creating, clearing, retrying, and continuing remain explicit user choices.

8. **Architecture Respect**  
   Entry navigates existing capabilities without taking ownership of reasoning, Memory, Execution, or Experience data.

The Product Entry Experience is ready for implementation planning when:

- first-time and returning journeys have distinct, testable states;
- Continue Project is hidden or disabled safely without valid session context;
- creation uses the existing Worker and Nexus Core request path;
- failed requests preserve user input and confirmed project state;
- entry transitions into the existing Project Space without duplicating it;
- Dark and Light modes preserve the same information hierarchy;
- mobile and keyboard behavior remain complete;
- no entry behavior requires accounts, persistent storage, or changes to core business modules.
