# Nexus Memory Update Design

## 1. Purpose

Memory Update allows Nexus to retain context that remains useful beyond the current request.

Memory Update is not a mechanism for saving complete conversations or every model response. Its purpose is to preserve verified, durable context while preventing temporary content, unsupported assumptions, and model hallucinations from entering Memory.

The update path must therefore be selective, traceable, and controllable by the user.

## 2. Update Principle

Every Memory write must pass an explicit selection policy.

Core principles:

- Save facts, not guesses.
- Prefer information explicitly confirmed by the user.
- Save information only when it has value across future tasks or project stages.
- Keep facts, decisions, preferences, and model assumptions separate.
- Do not treat model confidence as proof.
- Reject sensitive information, secrets, hidden reasoning, and unrelated data.
- Record the source of every accepted item.
- Avoid duplicate writes and make retries idempotent.
- Give users the ability to review, correct, and delete retained information.

When the system cannot establish that an item is safe and useful to retain, it should not write it.

## 3. Current Architecture

The current retrieval-only flow is:

```text
User
  ↓
Nexus Core
  ↓
Memory Retrieval
  ↓
Project Atlas
  ↓
Reflection
```

Nexus Core can retrieve optional Memory context and pass it to Project Atlas. Project Atlas can use that context without directly accessing the Memory Store.

There is no new post-Reflection write path in this architecture. Any legacy request-scoped project-memory response data remains a compatibility behavior and is not the Memory Update mechanism described here.

## 4. Target Architecture

The future update flow is:

```text
User
  ↓
Nexus Core
  ↓
Memory Retrieval
  ↓
Project Atlas
  ↓
Reflection
  ↓
Memory Candidate
  ↓
Memory Policy
  ↓
Memory Update
```

The Candidate and Policy layers separate semantic review from persistence:

- A Memory Candidate is an untrusted proposal describing information that may be worth retaining.
- Memory Policy applies deterministic rules and produces an explicit decision.
- Memory Manager executes only approved changes.

This separation prevents Project Atlas or Reflection from writing directly to storage and keeps the persistence mechanism replaceable.

## 5. Memory Candidate Design

Reflection does not write Memory directly. It may produce a Memory Candidate after validating the Atlas result and its supporting context.

Example:

```json
{
  "candidateId": "project-123:decision:turn-2:target-user",
  "memoryType": "project",
  "recordId": "project-123",
  "category": "decision",
  "content": {
    "statement": "目标用户确定为大学生"
  },
  "confidence": "high",
  "source": "user_confirmed",
  "evidence": [
    {
      "kind": "user_answer",
      "reference": "turn-2"
    }
  ],
  "turn": 2,
  "createdAt": "2026-07-26T10:00:00.000Z"
}
```

Required candidate properties:

- `candidateId`: stable identifier used for deduplication and retry safety.
- `memoryType`: target Memory type, such as `user`, `project`, or `atlas`.
- `recordId`: target record identifier.
- `category`: semantic category such as `fact`, `decision`, `stage_change`, `preference`, or `next_action`.
- `content`: normalized information proposed for retention.
- `source`: origin of the information.
- `confidence`: review signal, never sufficient evidence by itself.
- `evidence`: references to the user input or verified system result supporting the candidate.
- `turn`: interaction turn that produced the candidate.
- `createdAt`: candidate creation time.

Suggested source values:

- `user_confirmed`: explicitly supplied or confirmed by the user.
- `system_verified`: derived from a deterministic system check.
- `atlas_inference`: inferred by Project Atlas and not confirmed.
- `fallback_generated`: produced by a fallback response.

Candidates remain transient until Memory Policy approves them.

## 6. Memory Policy Design

Memory Policy decides whether a candidate may be written. It should be deterministic, testable, and independent from model-provider behavior.

Policy outcomes:

- `allow`: the candidate may be passed to Memory Manager.
- `reject`: the candidate must not be written.
- `requires_confirmation`: the candidate may be retained only after explicit user confirmation.

Allowed content includes:

- Facts explicitly confirmed by the user.
- Explicit project decisions.
- Project-stage changes supported by clear evidence and a passed Reflection check.
- Stable, non-sensitive user preferences.
- Accepted next actions that are expected to guide a later project turn.

Rejected content includes:

- Model guesses, unsupported assumptions, or speculative conclusions.
- Unverified statistics, dates, identities, or external claims.
- Temporary conversational content with no future task value.
- Raw prompts, provider responses, hidden reasoning, or debug data.
- Secrets, credentials, or sensitive personal information.
- Candidates without an attributable source.
- Duplicate candidates that have already been applied.

An `atlas_inference` or `fallback_generated` source must not become a fact merely because its confidence is high. It should normally be rejected or marked `requires_confirmation`.

Each decision should include a stable reason code so tests and future audit tools can explain why a candidate was allowed or rejected.

## 7. Update Flow

```text
Atlas Output
  ↓
Reflection
  ↓
Candidate Generation
  ↓
Policy Check
  ↓
Memory Manager
  ↓
Memory Store
```

Responsibilities at each step:

1. Project Atlas returns the existing structured analysis.
2. Reflection checks structure, consistency, source boundaries, and unsupported claims.
3. Candidate Generation converts eligible, supported changes into normalized candidates.
4. Memory Policy evaluates source, category, evidence, sensitivity, durability, and duplication.
5. Memory Manager validates approved operations and performs `create` or `update`.
6. Memory Store persists the resulting record through the configured storage adapter.

If Reflection fails, no candidate should be applied. If Policy rejects a candidate, the existing Memory remains unchanged. If persistence fails, the previous record must remain valid and a retry must not duplicate an already applied candidate.

Fallback output passes through the same policy and receives no special trust.

## 8. Module Responsibility

### Project Atlas

Responsible for:

- Generating project analysis from user input and retrieved context.

Not responsible for:

- Selecting persistent Memory.
- Applying Memory writes.
- Managing storage.

### Reflection

Responsible for:

- Checking output quality and source boundaries.
- Identifying supported information that may have long-term value.
- Producing or authorizing normalized Memory Candidates.

Not responsible for:

- Persisting candidates.

### Memory Policy

Responsible for:

- Evaluating candidate eligibility.
- Returning `allow`, `reject`, or `requires_confirmation`.
- Providing deterministic decision reasons.

Not responsible for:

- Generating project analysis.
- Mutating stored records.

### Memory Manager

Responsible for:

- Validating approved create and update operations.
- Enforcing type and record constraints.
- Coordinating with Memory Store.

Not responsible for:

- Deciding whether model content is true.

### Nexus Core

Responsible for:

- Orchestrating retrieval, Atlas execution, Reflection, policy evaluation, and approved update operations.

Not responsible for:

- Directly mutating Memory records.

### Memory Store

Responsible for:

- Persisting and retrieving validated records.
- Preserving record integrity.

Not responsible for:

- Semantic review or policy decisions.

## 9. Example

User input:

```text
我要做校园环保项目。
```

Project Atlas proposes that the target users may be university students. That proposal alone is an `atlas_inference` and must not be stored as a fact.

After the user explicitly confirms:

```text
目标用户就是大学生。
```

Reflection may produce:

```json
{
  "candidateId": "campus-green:decision:target-user",
  "memoryType": "project",
  "recordId": "campus-green",
  "category": "decision",
  "content": {
    "statement": "目标用户为大学生"
  },
  "confidence": "high",
  "source": "user_confirmed",
  "evidence": [
    {
      "kind": "user_answer",
      "reference": "target-user-confirmation"
    }
  ]
}
```

Memory Policy allows the candidate because it is an explicit project decision, has a traceable user source, contains no sensitive information, and has future project value.

Memory Manager then adds the decision to the relevant Project Memory. A retry with the same `candidateId` must not create a duplicate decision.

## 10. Future Extension

Future work may add:

- A user-facing Memory review, correction, export, and deletion interface.
- Consent and retention controls for different Memory categories.
- Multi-Atlas access to approved shared context.
- Storage adapters for Cloudflare KV and D1.
- A DataHub Context Graph for traceable relationships between projects, decisions, evidence, and Atlas capabilities.

These extensions must preserve the Candidate and Policy boundary. Replacing the storage layer must not give Atlas agents direct write authority or weaken the evidence requirements.
