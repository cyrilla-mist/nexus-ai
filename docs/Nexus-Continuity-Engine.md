# Nexus Continuity Engine

## Core Proposition

Nexus helps complex projects remain understandable, trustworthy, and actionable across time, people, tools, and AI agents.

Continuity is one governed loop, not four separate products:

```text
Recover
  → Validate
  → Govern
  → Decide
  → Act
  → Record
  → Inherit
```

Nexus is not a conventional project-management tool or a chat summarizer. It does not preserve every message or model output. It recovers relevant context, checks whether that context remains valid, and carries forward only information that is useful and trustworthy enough for future work.

## 1. Context Recovery

Context Recovery answers:

- what changed since the last working session;
- which decisions, evidence, risks, and tasks are still relevant;
- where information came from;
- which unresolved items prevent safe continuation.

Recovery is provider-neutral. DataHub can supply metadata, entity relationships, search, and lineage, but it is only one Context Provider. Future providers may include GitHub, Notion, Drive, and local files.

## 2. Evidence Integrity

Evidence Integrity distinguishes verified evidence from claims, assumptions, stale records, and conflicts.

It is responsible for:

- preserving source and provenance;
- exposing support and contradiction relationships;
- identifying superseded or expired context;
- preventing development fixtures from becoming product claims;
- keeping uncertainty visible instead of converting it into fact.

Validation does not mean every record is true. It means the system can explain its current status and the evidence behind that status.

## 3. Agent Memory Governance

Agent Memory Governance decides which agent-generated context may be inherited.

It must:

- separate user-confirmed direction from model suggestions;
- retain useful long-term direction;
- mark rejected or outdated recommendations;
- expose conflicts between agents or between different runs;
- avoid treating memory as an append-only transcript.

An agent memory can be confirmed, disputed, superseded, stale, or archived. Agents do not gain authority merely because a statement was generated earlier.

## 4. Decision & Action Ledger

The Decision & Action Ledger connects validated context to accountable work.

It records:

- decisions and the evidence that influenced them;
- tasks produced by those decisions;
- ownership and completion criteria;
- risks that block execution;
- outcomes that close or change the project state.

The ledger is not a generic task list. Actions must remain traceable to project context and a human decision.

## One Continuity Loop

The four capabilities form one sequence:

1. **Recover** relevant project context from available providers.
2. **Validate** evidence, claims, status, provenance, and conflicts.
3. **Govern** what agents and future sessions may inherit.
4. **Decide** with explicit human authority.
5. **Act** through owned tasks and completion criteria.
6. **Record** outcomes, changes, and supersession.
7. **Inherit** only the context that remains valid for the next session.

Removing any stage weakens the loop. Recovery without validation repeats outdated context. Memory without governance preserves model errors. Decisions without actions do not advance the project. Actions without records cannot be inherited safely.

## Provider Boundary

```text
GitHub ─┐
Notion ─┤
Drive ──┼→ Context Providers → Continuity Domain → Nexus Experiences
Files ──┤
DataHub ┘
```

Providers retrieve or index context. They do not define Nexus product policy. The Continuity Domain owns entity meaning, relationship meaning, validation rules, and continuity findings.

## Current Foundation Boundary

The v0.9.2 foundation defines the domain schema, a development scenario, deterministic validation, and tests.

It does not:

- connect Nexus Core to MCP;
- ingest the continuity scenario into DataHub;
- implement Project Re-entry Brief;
- select the final Hackathon scenario;
- introduce persistence, accounts, or multi-user behavior.
