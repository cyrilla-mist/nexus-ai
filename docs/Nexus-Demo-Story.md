# Nexus Demo Story

## 1. Demo Purpose

The Nexus AI demo exists to show the product direction in a public, low-friction
format.

The demo should help viewers understand that Nexus is not a chatbot page. It is
an AI project intelligence space where an idea becomes a structured project
context.

The current GitHub Pages demo is static. It uses preset data and does not call
the Worker, DeepSeek, or runtime Memory.

## 2. Demo Project

Demo case:

Campus low-carbon circular project.

The demo project represents a student innovation project that explores how to
reduce single-use item waste on campus through a validated circular mechanism.

The case is intentionally simple:

- clear target environment
- recognizable sustainability problem
- visible project stage
- understandable actions
- enough context for a Star Map

## 3. Scene 1: Enter Nexus

The viewer first sees:

- Nexus AI
- AI Project Intelligence Space
- Connect ideas. Create possibilities.

Purpose:

Show that the user is entering a project space, not opening a chat window.

## 4. Scene 2: Project Overview

The project overview introduces:

- project name
- current stage
- project goal
- short project summary

Purpose:

Give the viewer immediate orientation before showing deeper context.

## 5. Scene 3: Journey

The journey shows the project lifecycle:

```text
Idea -> Explore -> Design -> Validate -> Execute
```

Purpose:

Make project growth visible. The viewer should understand where the project is
now and what kind of progress comes next.

## 6. Scene 4: Context Map

The Context Map shows how project elements relate:

- Project
- Problem
- Decision
- Milestone
- Task
- Progress

Purpose:

Explain why the project is moving in a particular direction.

Context Map is about understanding relationships.

## 7. Scene 5: Project Universe

The Project Universe turns the context graph into a spatial view:

- Project Core at the center
- Problem and Decision around the understanding layer
- Milestone and Task around the execution layer
- Progress as the growth layer

Purpose:

Let the viewer explore the project as a small universe of connected context.

Current limitation:

The Star Map is still being refined for readability. Labels, guidance, and
spatial onboarding need additional polish before it feels fully natural to a
first-time user.

## 8. Scene 6: Action Navigator

The Action Navigator shows:

- current goal
- next action
- why the action matters
- completion criteria

Purpose:

Make clear that Nexus is not only for analysis. It should help a project move
forward.

## 9. Scene 7: What the Demo Proves

The demo proves the product direction:

- ideas can become structured project context
- project state can be shown as a workspace
- project relationships can be explored visually
- next actions can be connected to project understanding

It does not prove cloud persistence, multi-user collaboration, or production
deployment readiness.

## 10. Demo Boundary

The GitHub Pages demo is a static showcase.

It does not:

- call DeepSeek
- call the Cloudflare Worker
- persist Memory
- create user accounts
- sync projects across devices
- connect DataHub
- connect MCP

The real local prototype can run the AI chain with the Worker:

```text
User
-> Cloudflare Worker
-> Nexus Core
-> Memory Retrieval
-> Project Atlas
-> Model Router
-> DeepSeek / Mock / Fallback
-> Reflection
-> Memory Policy
-> Execution Layer
-> Context Experience
-> Project Space
```

## 11. Suggested Presentation Script

Short version:

Nexus AI is an AI project intelligence space. In this demo, a campus
sustainability idea becomes a project workspace. The viewer can see the project
overview, growth journey, context relationships, project universe, and next
action. The public demo is static, while the local Worker prototype supports the
real AI analysis chain.
