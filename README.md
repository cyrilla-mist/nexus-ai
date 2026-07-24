# Nexus AI

**Connect ideas. Create possibilities.**

Nexus AI is an AI collaboration platform powered by specialized Atlas Agents.

## Vision

Nexus AI aims to build a new generation of AI work partners.

Instead of only answering questions, Nexus helps users understand problems, explore ideas, design solutions, and move toward execution.

## Core Concept

```text
Nexus AI
    ↓
Nexus Core
    ↓
Atlas Framework
    ↓
Specialized Atlas Agents
```

Nexus Core acts as the Agent Manager. It understands the user's goal, creates a plan, selects an Atlas, reviews the result, and updates memory. The human user keeps the final decision.

## Atlas Agents

### Project Atlas

**Idea → Execution**

An AI project navigation partner that helps transform early ideas into structured, executable projects.

Current skeleton capabilities:

- project-intent detection
- clarification questions
- preliminary workflow planning
- basic reflection checks
- initial project-memory updates

### Evidence Atlas

**Project → Evidence**

An experimental Atlas focused on understanding relationships between project claims, evidence, and supporting materials. It is currently in the design stage.

## Repository Structure

```text
nexus-ai/
├── atlas/
│   ├── project-atlas/
│   └── evidence-atlas/
├── core/
│   ├── nexus-core.js
│   ├── reflection.js
│   └── router.js
├── docs/
├── frontend/
├── memory/
├── worker/
├── package.json
└── wrangler.toml
```

## Local Development

Requirements:

- Node.js
- npm

Install dependencies and start the Cloudflare Worker:

```bash
npm install
npm run dev
```

The API will be available at:

```text
http://localhost:8787/api/nexus
```

Open `frontend/index.html` with a local static server, then submit an idea. The current version runs in skeleton mode and does not call a paid model API yet.

Health check:

```text
GET http://localhost:8787/health
```

## Development Roadmap

### v0.1 Genesis Build

- [x] Nexus Core architecture skeleton
- [x] Project Atlas skeleton
- [x] Initial memory model
- [x] Cloudflare Worker API skeleton
- [x] Frontend workspace skeleton
- [ ] DeepSeek API integration
- [ ] Structured Project Blueprint generation
- [ ] Persistent Cloudflare memory

### v0.2 Memory Layer

- Nexus Memory
- Project history
- User context

### v0.3 Knowledge Layer

- RAG
- Agent knowledge bases
- Tool integration

### v1.0 Atlas Ecosystem

- Multiple specialized agents
- Multi-agent collaboration
- Continuous evolution

## Status

🚧 **v0.1 Genesis Build — Core Skeleton Available**
