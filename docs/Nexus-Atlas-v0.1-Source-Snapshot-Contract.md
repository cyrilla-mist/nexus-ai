# Nexus Atlas — Source Snapshot v0.1 Contract

**Status:** Accepted
**Target:** Phase 4D
**Implementation:** Phase 4C read-only Adapter core complete
**Phase:** Phase 4C GitHub Read-only Source Adapter Complete
**Runtime:** Injected-client read-only Adapter implemented
**Canonical Mutation:** None

## 1. Purpose and Boundary

This document freezes the provider-neutral Source Snapshot v0.1 contract and the GitHub Source Profile v1. Phase 4C implements the validator and injected-client read-only Adapter core without a concrete transport or live source call.

Implementation Note:

- Source Snapshot v0.1 Validator implemented.
- GitHub read-only Adapter implemented.
- 36-case Catalog automated.
- injected Source Client boundary only.
- no concrete HTTP client, OAuth or Token handling;
- no account scan, Graph mutation, Import Planner or Provider integration;
- no external write.
- Phase 4C acceptance hardening complete.
- offset-aware timestamps and truncation semantics aligned with this contract.
- 36-case Catalog executes real Runtime paths.
- repository identity projection is normalized at the source boundary.
- Phase 4C final acceptance confirms repository scope error semantics, Generic authority validation, and complete behavioral execution of the 36-case Catalog.

A Source Snapshot is an immutable, explicitly scoped observation of external source state. It preserves source-native identity, authority, source event time, capture time, bounded-read diagnostics and privacy-safe payloads without silently producing or mutating canonical Nexus Context.

A Source Snapshot is not a Context Graph, Context Package, Import Plan, live Provider output wrapper or canonical truth.

The accepted architecture remains:

```text
External Source Read
  → Source Snapshot
  → Context Import Plan
  → Governance / Human Confirmation
  → Canonical Context Graph
```

`Provider != Adapter`; a read Adapter is separate from a mutation Adapter. The v0.3 Package remains a derived projection of the canonical Graph/Ledger and is not changed by this contract (`docs/Nexus-Atlas-v0.3-Generalized-Context-Package-Contract.md:48-64`).

## 2. Layer Responsibilities

### Source Client

The Source Client owns the external protocol, authentication transport, HTTP/API mechanics and raw source response. It does not own Nexus Context kinds, user intent, freshness policy or canonical writes. Credentials stay inside the transport boundary and never cross into the Snapshot.

### Source Adapter

The Source Adapter owns explicit scope validation, source response validation, source-native normalization, source-local authority, stable external identity, privacy projection and bounded-read diagnostics. It does not mutate canonical Context, confirm Decisions or Memories, promote Identity, execute an Import Plan or infer user intent.

### Source Snapshot

The Snapshot is the immutable normalized observation returned by a successful bounded read. Its records remain source-native and must not contain canonical Graph fields.

### Context Import Planner

Phase 4D owns `Snapshot → candidate Nexus records`. The Planner does not perform live source reads. Phase 4B intentionally does not freeze a complete Import Plan schema; it freezes that the Snapshot is the Planner's only source-observation input.

### Governance / Canonical Write

Governance and canonical writes are independent of the Adapter. Human confirmation is required wherever a source observation would become personal Identity, preference, key Decision, rationale, long-term Goal, conflict resolution or consequential external action.

## 3. Generic Source Snapshot v0.1

### 3.1 Exact top-level shape

The successful Snapshot top level is exactly:

```js
{
  snapshotVersion,
  adapter,
  capturedAt,
  scope,
  source,
  records,
  diagnostics
}
```

No top-level `provider` is present. The following are forbidden: `contextNodes`, `decisions`, `memories`, `identity`, `contextPackage`, `rawCredentials`, `token`, `rawResponse`, `importPlan`, `canonicalGraph`, `runtimeState` and `sourceSummary`.

### 3.2 Top-level fields

| Field | Contract |
|---|---|
| `snapshotVersion` | Exactly `"0.1"`. |
| `adapter` | String matching `^[a-z][a-z0-9-]{0,63}$`, length 1–64. The Phase 4B example is `"github"`; `github-enterprise` is structurally valid. |
| `capturedAt` | Caller-supplied, complete offset-aware ISO 8601 timestamp. The Adapter must not generate it. |
| `scope` | Explicit finite source scope: `type`, `repositoryRef`, `requestedLimits`. |
| `source` | Source identity and source-level observation state. |
| `records` | Source-native normalized records in deterministic global order. |
| `diagnostics` | Bounded-read completion and per-collection pagination facts. |

The successful object describes only a successful bounded observation. It is not an empty success object used to hide a source failure.

## 4. Explicit Source Scope

The v0.1 `scope` shape is:

```js
{
  type: "repository",
  repositoryRef: "owner/repository",
  requestedLimits: {
    commits: 0,
    issues: 0,
    pullRequests: 0,
    releases: 0,
    tags: 0
  }
}
```

All requested limits are non-negative integers. `null`, `Infinity`, `-1` and numeric strings are invalid. `requestedLimits` records what the caller requested; `diagnostics.collections.<type>.appliedLimit` records what the Adapter actually applied. They are not required to be equal in the Generic contract.

Phase 4B does not make a product-level hard maximum a permanent Nexus fact. Phase 4C must define and enforce a versioned Adapter hard maximum. A request above that configured maximum is `INVALID_ADAPTER_OPTIONS`, not an unbounded read.

### 4.1 GitHub repositoryRef limits and canonicalization

The Nexus v0.1 lexical safety limits are explicit: total `repositoryRef` length is 1–256 characters; the owner and repository segments are each 1–128 characters. The allowed characters are ASCII `A-Z`, `a-z`, `0-9`, `.`, `_` and `-`, plus exactly one `/` separator.

Caller input may use ASCII casing. The Adapter trims, validates lexically, lowercases the owner and repository segments, and then stores the normalized value in `scope.repositoryRef`. Stable IDs always use this normalized value. For example, `Cyrilla-Mist/Nexus-AI` becomes `cyrilla-mist/nexus-ai`.

The normalized `scope.repositoryRef` is the canonical repository identity. For GitHub v1, `source.reference` must equal it exactly and is not a URL. Individual record `reference` fields may be safe GitHub URLs. A returned GitHub full name is checked case-insensitively against the normalized scope; a different repository is `SOURCE_SCOPE_MISMATCH`, never a silent rebind.

## 5. Source Object and Provider Duplication Rule

The `source` object is exactly:

```js
{
  provider,
  reference,
  retrievalMode,
  authority,
  state
}
```

For the GitHub Profile example:

```js
{
  provider: "github",
  reference: "cyrilla-mist/nexus-ai",
  retrievalMode: "read-only-api",
  authority: "github-repository-state",
  state: "available"
}
```

The independent top-level `provider` field from the Phase 4A conceptual example is removed. `adapter` identifies the implementation/specification, while `source.provider` identifies the external source. They may differ: `adapter: "github-enterprise"` and `source.provider: "github"` is valid.

`source.state` is source-level availability, distinct from each record's `observedState`. A successful Snapshot requires `source.state === "available"`.

For the ordinary GitHub.com Profile v1, a successful `source` must be exactly `{ provider: "github", reference: <normalized scope.repositoryRef>, retrievalMode: "read-only-api", authority: "github-repository-state", state: "available" }`. The generic `github-enterprise` adapter/provider distinction remains structurally possible, but is not the Phase 4C ordinary GitHub.com target.

## 6. Repository Reference Lexical Contract

`scope.repositoryRef` is one explicit repository selector. It is lexical validation, not proof that a GitHub repository exists.

It must be a trimmed non-empty string with exactly one `/`, non-empty owner and repository segments, no `://`, query, fragment, backslash, `..`, leading/trailing `/` or extra path segment, a reasonable contract maximum length, and only ASCII letters, digits, hyphen, underscore and dot in each segment.

```text
valid:   cyrilla-mist/nexus-ai
invalid: https://github.com/cyrilla-mist/nexus-ai
invalid: github.com/cyrilla-mist/nexus-ai
invalid: cyrilla-mist/nexus-ai/issues
invalid: latest repo
invalid: my project
invalid: owner/
invalid: /repo
invalid: owner\repo
```

Existence, authorization and repository state are established only by the Source Client/Adapter response. The Adapter must not discover repositories, infer a main project or aggregate multiple repositories in one v0.1 call.

The adapter ID rule is also exact: it must be a string of length 1–64 matching `^[a-z][a-z0-9-]{0,63}$`. `github`, `github-enterprise` and `github2` are valid; `GitHub`, `-github`, `github_`, `github.adapter` and the empty string are invalid with `SOURCE_SNAPSHOT_INVALID`.

## 7. Source Record v0.1

Every record has exactly the base shape below, with a per-type allow-listed `payload`:

```js
{
  sourceRecordId,
  sourceType,
  externalId,
  observedState,
  observedAt,
  reference,
  authority,
  payload
}
```

The base record must not contain `ContextNode` fields such as `kind`, `lifecycle`, `verification`, `freshness`, `governance`, `userId`, `territoryId`, `decisionStatus`, `memoryStatus` or a canonical ID. It must not contain credentials or raw response bodies.

| Field | Contract |
|---|---|
| `sourceRecordId` | Stable normalized identity, unique within the Snapshot and scoped to the source. |
| `sourceType` | One GitHub Profile type from section 8. |
| `externalId` | Source-native identifier string. |
| `observedState` | Closed per-type source observation enum, not a global `unknown`. |
| `observedAt` | Standardized source event time or `null`. |
| `reference` | Safe external source reference or `null`; never credential-bearing. |
| `authority` | Source-local authority class only. |
| `payload` | Strict per-type allowlist; no convenience expansion. |

## 8. GitHub Source Profile v1

The Generic Snapshot top level is source-neutral. The GitHub Profile supplies one repository scope and these seven target record types only: `repository`, `branch` (default branch only), `commit`, `issue`, `pull_request`, `release`, and `tag`.

The v1 read scope is repository metadata, default branch HEAD, bounded recent commits, bounded Issues, bounded PR references, and bounded Releases/Tags. It does not include comments, Discussions, workflow runs/logs, contributors, stars, forks, arbitrary content, file trees or README body.

Every successful GitHub Profile v1 Snapshot contains exactly one `repository` record and exactly one `branch` record for the default branch, even when every requested collection limit is zero. These are core singletons, not bounded collections. `repository.payload.defaultBranch` must equal `branch.payload.name`; the branch ID is `github:branch:<normalizedRepositoryRef>:<defaultBranch>` and `branch.payload.headSha` must be a full SHA. Missing or duplicate repository/default-branch records, mismatched names, or invalid branch HEADs are Adapter normalization failures (`SOURCE_RESPONSE_INVALID`). A malformed already-built Snapshot is a structural `SOURCE_SNAPSHOT_INVALID`.

README is `OUT_OF_SCOPE_V0.1`. Issue bodies and PR bodies are also excluded from v0.1. Labels are excluded because v0.1 does not define a label contract.

### 8.1 Repository

```js
payload: {
  name,
  fullName,
  defaultBranch,
  archived,
  visibility,
  updatedAt
}
observedState: "available" | "archived"
authority: "github-repository-state"
```

No owner email, description enrichment, topics, stars or fork counts.

### 8.2 Default branch

```js
payload: { name, headSha }
observedState: "present"
observedAt: null
authority: "github-ref-state"
```

The default branch is a core singleton, not a paginated collection. If repository metadata returns a default branch but its HEAD cannot be obtained coherently, the successful Snapshot fails with `SOURCE_RESPONSE_INVALID`.

### 8.3 Commit

```js
payload: { sha, authoredAt, committedAt, messageHeadline }
observedState: "present"
authority: "github-commit-state"
```

`messageHeadline` is only the first commit-message line. The full commit body and author email are excluded.

### 8.4 Issue

```js
payload: { number, title, state, createdAt, updatedAt, closedAt }
observedState: "open" | "closed"
authority: "github-issue-state"
```

No body or comments.

### 8.5 Pull request

```js
payload: {
  number, title, state, draft, merged,
  createdAt, updatedAt, closedAt, mergedAt,
  headSha, baseRef
}
observedState: "open" | "closed" | "merged"
authority: "github-pull-request-state"
```

No body, comments or review text. Raw normalization is strict: `merged: true` requires `state: "closed"` and a valid `mergedAt`, producing `observedState: "merged"`. `merged: false` with `state: "open"` produces `observedState: "open"`; `merged: false` with `state: "closed"` produces `observedState: "closed"`. A non-boolean `merged`, non-`open`/`closed` state, merged/open combination, or merged/null-`mergedAt` combination is `SOURCE_RESPONSE_INVALID`.

### 8.6 Release

```js
payload: {
  immutableId, tagName, name, draft, prerelease,
  createdAt, publishedAt
}
observedState: "draft" | "published" | "prerelease"
authority: "github-release-state"
```

`draft` and `prerelease` are required booleans. `createdAt` is required and valid; `publishedAt` is null or valid. Observed-state precedence is fixed: `draft === true` → `draft`; otherwise `prerelease === true` → `prerelease`; otherwise `published`.

### 8.7 Tag

```js
payload: { name, targetSha }
observedState: "present"
authority: "github-ref-state"
```

`targetSha` is retained when returned. A tag name can move or disappear; its source ID is not immutable content identity.

### 8.8 Timestamp requirements

All non-null timestamps are offset-aware ISO 8601 values. `repository.updatedAt`, `issue.createdAt`, `issue.updatedAt`, `pull_request.createdAt`, `pull_request.updatedAt` and `release.createdAt` are required. `issue.closedAt`, `pull_request.closedAt`, `pull_request.mergedAt` and `release.publishedAt` may be null or valid timestamps; `mergedAt` is required when `merged === true`. `branch.observedAt` and `tag.observedAt` are null.

Commit `committedAt` is required and valid; `authoredAt` is null or valid; `commit.observedAt` is exactly `payload.committedAt`. GitHub Profile commit SHA values are exactly 40 hexadecimal characters. Commit sorting is therefore `committedAt` descending, then SHA ascending, without null ambiguity.

## 9. Stable External Identity

```text
Repository:     github:repo:<repositoryRef>
Default branch: github:branch:<repositoryRef>:<branch-name>
Commit:         github:commit:<repositoryRef>:<full-sha>
Issue:          github:issue:<repositoryRef>:<number>
Pull Request:   github:pr:<repositoryRef>:<number>
Release:        github:release:<repositoryRef>:<immutable-source-id>
Tag:            github:tag:<repositoryRef>:<tag-name>
```

URL is a reference, not the only identity. Titles, array indexes and timestamps are never identity. Full commit SHA is the strongest commit identity. Issue/PR number is stable only within repository scope. Tag identity represents the named ref, not immutable content.

## 10. Authority Classes

| Source type | Authority |
|---|---|
| `repository` | `github-repository-state` |
| `branch` | `github-ref-state` |
| `commit` | `github-commit-state` |
| `issue` | `github-issue-state` |
| `pull_request` | `github-pull-request-state` |
| `release` | `github-release-state` |
| `tag` | `github-ref-state` |

These values never mean `human-confirmation`, `user-intent`, `project-rationale`, `identity`, `preference` or `decision-authority`.

## 11. Source State, Observed State and Diagnostics

### 11.1 Successful source state

`source.state` must be `"available"` in every successful v0.1 Snapshot. Authentication required, forbidden, repository not found, rate limited, network unavailable, invalid response and scope mismatch are Adapter Errors, not successful Snapshots and not empty Snapshots.

Record `observedState` is independent and per-type. Structural mapping failures are `SOURCE_RESPONSE_INVALID`; they must not be hidden by an invented `unknown` state.

### 11.2 Diagnostics shape

```js
diagnostics: {
  complete,
  collections: {
    commits: { requestedLimit, appliedLimit, itemsRead, pagesRead, truncated, continuationAvailable },
    issues: { requestedLimit, appliedLimit, itemsRead, pagesRead, truncated, continuationAvailable },
    pullRequests: { requestedLimit, appliedLimit, itemsRead, pagesRead, truncated, continuationAvailable },
    releases: { requestedLimit, appliedLimit, itemsRead, pagesRead, truncated, continuationAvailable },
    tags: { requestedLimit, appliedLimit, itemsRead, pagesRead, truncated, continuationAvailable }
  }
}
```

`complete === true` means this contract-scoped bounded read completed within every applied bound and both core singletons were read successfully. It never means all repository history was read. Every successful v0.1 Snapshot has `diagnostics.complete === true`; there is no ordinary successful `complete: false` state. Normal bounded truncation leaves `complete === true`. If `requestedLimit === 0`, that collection is not accessed and its diagnostics are `itemsRead: 0`, `pagesRead: 0`, `truncated: false`, `continuationAvailable: false`. Repository metadata and default branch are core singletons and do not appear in the pagination map.

Normal bounded truncation is successful Snapshot diagnostics. `SOURCE_PAGINATION_LIMIT` is reserved for an Adapter/Client attempting to exceed its hard maximum or a pagination response that cannot terminate safely.

For GitHub Profile v1, a successful request must satisfy `requestedLimit <= configuredHardMaximum` and `appliedLimit === requestedLimit`. Requests above the configured hard maximum fail with `INVALID_ADAPTER_OPTIONS`; the Adapter must not silently clamp. Other Source Profiles may define different requested/applied relationships.

Each collection diagnostic satisfies `0 <= itemsRead <= appliedLimit`, with non-negative requested/applied limits. If `truncated === true`, `continuationAvailable === true`; if `continuationAvailable === false`, `truncated` must be false. `itemsRead` counts final normalized records, not raw API items. `requestedLimit === 0` forces all five collection counters to zero and prevents access to that collection.

## 12. Deterministic Record Ordering

Global order: `repository`, `branch`, `commit`, `issue`, `pull_request`, `release`, `tag`.

Within a type: repository and branch by `sourceRecordId` ascending; commit by `committedAt` descending then SHA; issue and pull request by `updatedAt` descending then number descending; release by `publishedAt` descending with null last then `immutableId`; tag by lexical `name`. API response order is never output order.

## 13. Time Semantics

`capturedAt` is caller-supplied Nexus observation time and is never substituted for source event time. `observedAt` is standardized as follows:

| Type | `observedAt` |
|---|---|
| repository | `payload.updatedAt` |
| branch | `null` |
| commit | exactly `committedAt` |
| issue | `updatedAt` |
| pull request | `updatedAt` |
| release | `publishedAt ?? createdAt` |
| tag | `null` |

Payload retains allowed source timestamps. Freshness (`current`, `stale`, `unknown`) remains a later Context policy decision, not a GitHub Adapter decision.

## 14. Privacy and Private Repository Boundary

Snapshot v0.1 prohibits credentials, authorization headers, cookies, API tokens, local paths, commit author email, Issue/PR bodies, comments, review text, workflow logs, arbitrary file bodies and private profile enrichment. A GitHub username is retained only where required for the repository reference or safe source reference; it never creates a Nexus Identity Record.

Private repositories require an explicitly selected `repositoryRef` and explicit authorization in the Source Client. The Snapshot may contain `repository.payload.visibility: "private"`, but never authorization mechanism, token metadata or credential identity. The Adapter must not discover private repositories, expand scope or enumerate accounts.

## 15. Missing and Deleted Semantics

Absence of a historical record from a bounded capture means only `not observed in this bounded capture`. It does not create a deleted record, and Snapshot v0.1 does not infer deletion. An explicitly observed `repository.archived` state may be represented as `archived`.

If core repository metadata returns `defaultBranch` but the corresponding branch HEAD cannot be obtained, the result is `SOURCE_RESPONSE_INVALID`, because a successful repository Snapshot must be coherent.

## 16. Error Taxonomy and Error Object

The frozen vocabulary is:

```text
INVALID_REPOSITORY_REF
INVALID_ADAPTER_OPTIONS
INVALID_CAPTURED_AT
SOURCE_AUTH_REQUIRED
SOURCE_FORBIDDEN
SOURCE_NOT_FOUND
SOURCE_RATE_LIMITED
SOURCE_UNAVAILABLE
SOURCE_RESPONSE_INVALID
SOURCE_SCOPE_MISMATCH
SOURCE_RECORD_ID_INVALID
SOURCE_PAGINATION_LIMIT
SOURCE_SNAPSHOT_INVALID
```

Structural errors are `INVALID_REPOSITORY_REF`, `INVALID_ADAPTER_OPTIONS`, `INVALID_CAPTURED_AT`, `SOURCE_RESPONSE_INVALID`, `SOURCE_SCOPE_MISMATCH`, `SOURCE_RECORD_ID_INVALID`, `SOURCE_PAGINATION_LIMIT` and `SOURCE_SNAPSHOT_INVALID`. Authorization errors are `SOURCE_AUTH_REQUIRED` and `SOURCE_FORBIDDEN`; source state is `SOURCE_NOT_FOUND`; transient errors are `SOURCE_RATE_LIMITED` and `SOURCE_UNAVAILABLE`.

Phase 4C Runtime errors use:

```js
{
  name: "SourceAdapterError",
  code,
  message,
  retryable,
  details
}
```

`details` must not contain raw response bodies, credentials, authorization data, tokens, local paths, Issue/PR bodies, comments or secrets. Rate-limit and unavailable may retry with bounded backoff; auth-required may retry only after explicit auth/config change; other errors must not be blindly retried. No error becomes an empty Snapshot.

## 17. Import Planner Boundary

The Phase 4C Adapter must not create ContextNodes, modify the Graph, infer Decisions or Memories, or modify the Context Package. The future Phase 4D Planner input is:

```js
{
  snapshot,
  policyVersion,
  projectId,
  scopeKey
}
```

Planner output and candidate schema are deferred to Phase 4D. The Snapshot is its only source observation input, and the Planner must not re-access GitHub.

## 18. Determinism and Immutability

The Phase 4C Snapshot validator and GitHub Adapter implement these determinism and immutability requirements. Given the same normalized source response, options and explicit `capturedAt`, they produce deep-equal output. Reordering raw collections must not change output. The result is deeply frozen and the input remains unchanged.

The Phase 4C Runtime does not call `Date.now()`, `new Date()` for implicit capture time, `Math.random()`, `process.env`, network fallback or file writes. Frozen fixtures are sufficient for all contract tests; live GitHub is not a test prerequisite.

## 19. Generic Contract vs GitHub Profile

The Generic Snapshot contract freezes top-level shape, Source Record base, scope and time semantics, source state, errors, diagnostics, immutability, privacy and the Planner boundary. The GitHub Profile freezes repository scope, seven record types, payload allowlists, identities, authority classes, observed states, ordering and read scope.

Google Drive, Notion, Calendar and additional repository providers should add Source Profiles without changing the Generic Snapshot top level.

GitHub Source Client inputs keep `issues` and `pullRequests` as separate logical collections. If a lower-level endpoint returns a mixed payload, the Source Client separates it before Adapter normalization. An Issue produces only `sourceType: "issue"`; a PR produces only `sourceType: "pull_request"`; one PR never produces both.

## 20. Non-Goals and Phase Boundary

Phase 4C is complete and accepted.

Implemented in Phase 4C:

- Source Snapshot v0.1 Validator Runtime;
- GitHub Source Profile normalization;
- injected-client read-only GitHub Adapter core;
- deterministic immutable Snapshot output;
- 36-case behavioral contract automation;
- privacy, source-authority, error and scope boundaries.

The following remain unimplemented:

- concrete HTTP GitHub Client;
- live authenticated GitHub integration;
- OAuth and Token handling;
- account/repository discovery;
- Import Planner;
- Canonical Graph mutation;
- Provider and Context Package integration;
- external write;
- UI and Worker integration.

GitHub is the first implemented Source Adapter profile/core. It is not yet a live authenticated source integration and is not a canonical source of personal truth.

Phase boundary:

- Phase 4A Complete;
- Phase 4B Complete;
- Phase 4C Complete / Accepted;
- Phase 4D Planned;
- Phase 4E Planned;
- Phase 4F Planned;
- Phase 4 overall remains In progress.

The next phase is Phase 4D — Context Import Planner.

## Phase 4D Follow-up

- The Context Import Plan v0.1 contract now defines the deferred Planner output.
- The Phase 4D Context Import Plan Contract is accepted.
- The Source Snapshot remains the sole source-observation input.
- The Planner performs no source re-read.
- The Planner produces Candidate-only Evidence proposals.
- Planner Runtime remains not implemented.
- No Canonical Graph write is permitted.
