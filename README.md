# Nexus AI

**Connect ideas. Create possibilities.**

Nexus AI is an AI collaboration platform powered by specialized Atlas Agents.

## Current Flow

```text
Frontend
  → Cloudflare Worker
  → Nexus Core
  → Router
  → Project Atlas
  → Model Router
  → DeepSeek Client (when configured)
  → Project Atlas result normalization
  → Reflection
  → Memory
```

Project Atlas transforms an early idea into a structured project analysis. The
current implementation keeps the human user as the final decision-maker and
does not invent evidence or user resources.

## Model Modes

- **Mock Mode**: `DEEPSEEK_API_KEY` is not configured. Project Atlas returns the
  local deterministic skeleton result.
- **DeepSeek Mode**: the key is configured and DeepSeek returns valid structured
  JSON.
- **Fallback Mode**: the key is configured, but the request times out, the API
  returns an error, or the model output fails validation. Project Atlas safely
  falls back to the local result.

The DeepSeek key is only read from the Cloudflare Worker environment. It is
never sent to the frontend or stored in source code.

## Repository Structure

```text
nexus-ai/
├── atlas/project-atlas/
├── core/
├── frontend/
├── memory/
├── model/
│   ├── deepseek-client.js
│   └── model-router.js
├── tests/
├── worker/
├── .dev.vars.example
├── package.json
└── wrangler.toml
```

## Local Development

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

### Mock Mode

Do not create `.dev.vars`, or leave `DEEPSEEK_API_KEY` unconfigured:

```bash
npm run dev
```

### DeepSeek Mode

Copy the example file:

```bash
cp .dev.vars.example .dev.vars
```

On Windows PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Edit `.dev.vars` locally:

```dotenv
DEEPSEEK_API_KEY=...
```

Then start the Worker:

```bash
npm run dev
```

The API is available at:

```text
http://localhost:8787/api/nexus
```

Serve the frontend in a second terminal:

```bash
python -m http.server 4173 --directory frontend
```

Open `http://localhost:4173`.

## Production Secret

Set the production secret interactively. Do not put the value in
`wrangler.toml` or a shell command:

```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

## Tests

```bash
npm test
```

The test suite covers:

- Mock Mode without an API key
- successful structured model output
- invalid model JSON
- missing required fields
- request timeout
- DeepSeek HTTP error

Health check:

```text
GET http://localhost:8787/health
```

Project analysis:

```http
POST /api/nexus
Content-Type: application/json

{"message":"我想做一个帮助大学生提高学习效率的 AI 项目"}
```

For a routed project request, verify:

- `nexus.selectedAtlas` is `project-atlas`
- `response.model.mode` is `mock`, `deepseek`, or `fallback`
- `response.projectBlueprint` is present
- `response.risks` is an array
- `response.nextAction` is present

## Scope

This build intentionally does not include a database, login system, RAG, MCP,
or a frontend framework.
