# Nexus Continuity Context Provider

## 1. Responsibility

The Continuity Context Provider converts a normalized Nexus Continuity snapshot
into a deterministic, read-only and evidence-grounded context contract. It is a
Node.js module and has no browser, DOM, model or transport dependency.

The provider does not connect to Nexus Core in v0.9.7. Fixture loading and the
DataHub MCP live reader remain separate loader concerns.

## 2. Why the full graph is not model context

The verified scenario contains 38 Continuity entities, one project root and 29
relationships. Sending every entity, raw custom property and transport payload
would add noise, expose implementation metadata and make prompt size
unpredictable. The provider instead selects project state, meaningful changes,
confirmed decisions, unresolved conflicts, risks, recommended actions and
stable evidence references.

## 3. Structured Context Brief

`buildContinuityContextBrief(snapshot, options)` returns:

- schema version and project identity;
- current continuity state and score;
- read-only source metadata;
- meaningful changes;
- confirmed decisions;
- unresolved conflicts;
- risks, including explicit missing ownership;
- existing recommended actions with recorded status preserved;
- deduplicated evidence references;
- budget, included, omitted and truncation diagnostics.

Missing project identity, state, invalid score, invalid relationships and
invalid budgets fail with stable `ContinuityContextProviderError` codes.

## 4. Text Context Block

`renderContinuityContextBlock(brief, options)` produces a stable plain-text
block with these sections:

1. Project
2. What changed
3. Confirmed decisions
4. Conflicts requiring attention
5. Risks
6. Recommended actions
7. Evidence references
8. Source

It is not a system prompt and contains no role instruction, HTML or automatic
decision.

## 5. Evidence grounding

Important records retain stable evidence reference IDs. References are
deduplicated and preserve relationship names that exist in the Continuity
graph. The provider does not rename unknown relationships to `supports`, copy
raw MCP JSON-RPC payloads or include unrelated namespaces.

## 6. Default budget

The default text budget is 9,000 characters. Valid custom budgets range from
2,000 to 20,000 characters.

Default item limits are:

- meaningful changes: 4;
- confirmed decisions: 6;
- conflicts: 4;
- risks: 4;
- recommended actions: 5;
- evidence references: 12.

Title, summary, rationale and source labels also have deterministic field
limits.

## 7. Deterministic sorting

Changes use event time descending and stable ID ascending as a tie-breaker.
Confirmed decisions prioritize explicit human confirmation and then current
project impact, update time and stable ID. Conflicts prioritize unresolved
human decisions. Risks prioritize blocking and missing ownership. Actions use
recorded priority, update time and stable ID.

No provider transformation uses current time, randomness, model output or
unstable object iteration.

## 8. Truncation strategy

When required, the provider removes lower-priority evidence references first,
then lower-priority changes, then lower-priority recommended actions, and only
then shortens summaries and rationales. Project state, continuity score,
confirmed decisions, human-decision conflicts and missing-ownership risks are
retained.

If the protected context cannot fit, the provider returns
`CONTEXT_BUDGET_UNSATISFIABLE` instead of returning oversized text.

## 9. Fixture and DataHub parity

The core provider consumes normalized snapshots and does not know the source
transport. `createContinuityContextFingerprint(brief)` excludes fetched time,
transport metadata and DataHub URNs while retaining project, changes,
decisions, conflicts, risks, actions and evidence relationships.

`assertContinuityContextParity(fixtureBrief, dataHubBrief)` fails with
`SEMANTIC_MISMATCH` when those semantics differ.

## 10. Read-only boundary

The provider does not mutate input snapshots, Continuity fixtures or DataHub.
It does not call mutation tools, confirm decisions, resolve conflicts, assign
owners or write back status. A DataHub read failure never falls back silently
to fixture data.

## 11. CLI

```text
node scripts/verify-continuity-context.mjs --source fixture
node scripts/verify-continuity-context.mjs --source fixture --max-chars 6000
node scripts/verify-continuity-context.mjs --source datahub
node scripts/verify-continuity-context.mjs --compare
```

Optional `--json` and `--text` flags print the structured brief or plain-text
context block. The DataHub commands require the existing read-only MCP runtime;
the CLI does not start services, install tools, ingest data or fall back.

## 12. Not implemented

v0.9.7 does not implement:

- Nexus Core integration;
- DeepSeek or other LLM calls;
- prompt assembly;
- automatic decisions or task execution;
- mutation or write-back;
- production deployment;
- multi-tenant authentication.
