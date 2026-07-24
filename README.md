# Nexus AI

**Connect ideas. Create possibilities.**

Nexus AI v0.1.1 turns Project Atlas from a single technical JSON demo into a
small, readable project collaboration workspace.

## Current Flow

```text
Frontend session
  → Cloudflare Worker
  → Nexus Core
  → Router
  → Project Atlas
  → Model Router
  → DeepSeek Client (when configured)
  → Structured result validation
  → Explainable project-stage evaluation
  → Reflection
  → Temporary browser session
```

The frontend keeps at most three analysis turns in the current browser tab.
There is no account, database, durable chat history, or remote project storage.

## Product Experience

Project Atlas displays:

- a readable project profile
- a Project Blueprint
- risk, basis, and mitigation cards
- the current stage and next target stage
- a highlighted next action
- answerable clarification questions
- raw JSON inside a collapsed developer section

The supported stages are:

```text
Idea → Explore → Design → Validate → Execute
```

The stage is calculated locally from explicit result signals. It does not
trigger another model call.

## Model Modes

- **Mock Mode**: `DEEPSEEK_API_KEY` is not configured.
- **DeepSeek Mode**: DeepSeek returns valid structured JSON.
- **Fallback Mode**: the model request times out, returns an HTTP error, or
  produces invalid output. Project Atlas falls back safely while preserving
  the previous analysis and clarification answers.

## Local Development

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

### 1. Configure DeepSeek locally

Mock Mode works without `.dev.vars`.

For DeepSeek Mode:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Then edit `.dev.vars`:

```dotenv
DEEPSEEK_API_KEY=...
```

### 2. Start the Worker

```powershell
npm run dev
```

The local endpoint is:

```text
http://localhost:8787/api/nexus
```

### 3. Start the static frontend

Open a second terminal:

```powershell
npx.cmd --yes serve frontend -l 4173
```

Open `http://localhost:4173`.

## Multi-turn Acceptance

1. Enter an initial project idea and select **开始分析**.
2. Confirm the page shows the project profile, Blueprint, risks, stage, and
   next action.
3. Answer every displayed clarification question.
4. Select **继续完善项目**.
5. Confirm the turn number increases, the previous Blueprint is refined, the
   provided answers appear as known facts, and the answered question is not
   repeated.
6. Refresh the tab and confirm the current session is restored.
7. Select **清空** and confirm the idea, analysis, answers, and temporary
   session are removed.

The automated two-turn Mock Mode acceptance script is:

```bash
npm run verify:multiturn
```

## Frontend API Configuration

The frontend reads this element in `frontend/index.html`:

```html
<meta name="nexus-api-endpoint" content="" />
```

Resolution rules:

- blank on `localhost`: `http://localhost:8787/api/nexus`
- blank in production: same-origin `/api/nexus`
- explicit `content`: use that complete Worker endpoint

For a separate Cloudflare Pages frontend and Worker backend, set `content` to
the deployed Worker endpoint before publishing the static frontend:

```html
<meta
  name="nexus-api-endpoint"
  content="https://your-worker.your-subdomain.workers.dev/api/nexus"
/>
```

## Cloudflare Deployment Preparation

This repository does not create or modify Cloudflare projects automatically.

Set the Worker production secret interactively:

```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

Validate the Worker bundle without deployment:

```bash
npx wrangler deploy --dry-run
```

Deployment options:

- deploy `worker/` through the existing Wrangler configuration
- publish `frontend/` as static assets on Cloudflare Pages
- use a same-origin route for `/api/nexus`, or configure the complete Worker
  URL in the frontend meta element

## API Context

First turn:

```json
{
  "message": "initial idea",
  "context": {
    "clarificationAnswers": [],
    "previousAnalysis": null,
    "turn": 1
  }
}
```

Following turn:

```json
{
  "message": "the same initial idea",
  "context": {
    "clarificationAnswers": [
      {
        "question": "question from Project Atlas",
        "answer": "user answer"
      }
    ],
    "previousAnalysis": {
      "ideaProfile": {},
      "projectBlueprint": {},
      "risks": [],
      "clarificationQuestions": [],
      "nextAction": ""
    },
    "turn": 2
  }
}
```

The maximum turn is currently `3`.

## Validation

```bash
npm test
npm run check
npm run verify:multiturn
npx wrangler deploy --dry-run
```

## Current Scope

This version intentionally does not include:

- D1, KV, or other persistent storage
- registration or login
- RAG or MCP
- DataHub
- Evidence Atlas implementation
- multi-model expansion
- file uploads
- a complete chat system
- React, Vue, or another frontend framework
