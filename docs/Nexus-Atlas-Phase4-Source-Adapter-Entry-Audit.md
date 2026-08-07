# Nexus Atlas Phase 4 — Source Adapter Entry Audit

## 1. Audit Metadata

- repository: `C:\Users\Lenovo\Documents\nexus-ai`
- remote: `https://github.com/cyrilla-mist/nexus-ai.git` (the only configured remote)
- branch: `feature/source-adapter-foundation`
- baseline SHA: `3a95371fcf9701a278a87a3d0bf5f4422542f881`
- audit date: `2026-08-07` (Asia/Shanghai)
- Phase 3 baseline: PASS
  - Context Graph: 30 nodes / 9 edges
  - v0.3 generalized package: 24 records
  - v0.2 package: 19 nodes
  - Decision / Memory catalog: 31 PASS
  - `npm test`: 564/564
  - Atlas: PASS
  - Verity/DataHub: 22/22
  - `npm run check`: PASS
- Runtime changes: none
- Scope: architecture audit and design recommendation only; no Source Adapter Runtime was implemented.

## 2. Executive Conclusion

Nexus can enter Phase 4B contract design. It should not enter a live GitHub implementation directly from the current code. The missing boundary is a generalized, source-native Snapshot contract plus an explicit import/governance boundary.

- GitHub as first Adapter: **CONDITIONAL**.
- Recommended architecture: **C as the end-to-end boundary, with B as the immutable Snapshot contract**.
- P0 blocker: **none** for Phase 4B contract design.
- Phase 4 remains `Planned`; the canonical next Action remains `action:review-phase4-source-adapter-entry`.

The decisive rule is:

> External Source Read → immutable Source Snapshot → deterministic Import Plan → governance / human confirmation → canonical Context Graph.

An external observation may become an evidence candidate, but it does not become a confirmed Decision, Memory, Identity, preference, rationale, or phase-completion claim merely because a source returned it.

## 3. Existing Architecture

The current architecture has two related but different paths:

```text
Canonical self-context path
  canonical fixture JSON
    → Self-Context Provider
    → Context Graph validation
    → Decision / Memory Ledger
    → v0.2 and v0.3 Context Package projections
    → product/provider surface

DataHub continuity path
  Verity scenario fixture
    + DataHub MCP read tools
    → Verity Asset Reader
    → domain-specific asset/lineage overlay
    → read-only loopback bridge
    → DataHub Continuity Provider
    → continuity normalization
    → session-local Context Package / UI

Separate mutation path
  fresh DataHub read
    → allow-listed ownership proposal
    → explicit confirmation
    → mutation client
    → read-after-write DataHub verification
    → audit event
```

The first path is the current canonical Nexus path. `experience/context-v02/self-context-provider.mjs:25-119` loads and validates the canonical fixture, builds the Ledger and both package versions, and reports `live: false`, `readOnly: true`, and `deterministic: true` at lines 72-95. The v0.3 contract states that the Graph is the sole canonical source and that a Package is a derived projection, not new canonical truth (`docs/Nexus-Atlas-v0.3-Generalized-Context-Package-Contract.md:48-64`).

The second path is a provider-specific overlay. `datahub/verity/verity-asset-reader.mjs:176-257` starts from a Verity scenario, overlays allow-listed DataHub dataset records and Benchmark lineage, and changes Verity risk/action findings from the observed owner state. `datahub/verity/verity-asset-reader.mjs:259-297` returns a read-only `datahub-mcp` snapshot with `fetchedAt`, asset counts and lineage diagnostics. This is a useful precedent, not a generalized adapter framework.

## 4. Existing Provider and Adapter-like Components

| Component | Responsibility | Input | Output | External source | Deterministic | Read-only | Source/provenance | UI/scenario bound | Direct reuse for generalized Adapter |
|---|---|---|---|---|---|---|---|---|---|
| `experience/context-v02/self-context-provider.mjs` | Load canonical Nexus self-context, validate it, build Ledger and packages | fixture path, project/scope, optional consent and generated time | frozen Graph, Ledger, v0.2/v0.3 packages, source info | no; local canonical fixture | yes when inputs/time are fixed | yes | package provenance is retained; source info is fixture metadata | self-context/project default | Provider pattern and immutability tests only; not a source adapter |
| `experience/context-v03/generalized-context-package-builder.mjs` | Project Graph + Ledger into a deterministic generalized package | validated Graph, Ledger, explicit project/scope, generatedAt | frozen v0.3 Package | no | yes | yes | canonical record source summary | no UI, but canonical package semantics | Normalization/test discipline only; it must not read a source |
| `experience/continuity/fixture-continuity-provider.mjs` | Load a selected JSON scenario and normalize it | fixture URL or scenario key | normalized session scenario and fixture source info | local/static fixture via `fetch` | only with frozen fixture and timestamps | yes | source mode and normalized time | scenario selector and Continuity surface | fixture harness and parity testing only |
| `experience/continuity/datahub-continuity-provider.mjs` | Read a DataHub continuity bridge and normalize its scenario | validated loopback URL, fetch implementation | normalized scenario plus live source info | yes, local DataHub bridge | no across live captures | contract requires read-only response | `source`, `fetchedAt`, diagnostics | DataHub Continuity/Re-entry | read-error and source-state conventions only |
| `experience/continuity/normalize-continuity-scenario.mjs` | Clone and normalize legacy Continuity entities/relationships | scenario, optional source mode/time | normalized scenario | no direct network | only when `normalizedAt` and fallback times are fixed | n/a | preserves entity source fields and runtime mode | Continuity scenario shape | not a Source Snapshot normalizer |
| `experience/continuity/context-package-builder.mjs` | Build a session-local v1 package and expose findings/actions | normalized scenario, audit events, policies | session-local package | no direct network | configurable `now`; not inherently cross-time deterministic | yes | source summary is provider/reference | Continuity product shape | no; legacy package semantics are narrower |
| `datahub/mcp/mcp-client.mjs` | Start MCP process, validate read tools, make tool calls | command/args/environment/options | MCP client and tool results | yes, DataHub MCP | no | read-only client mode rejects mutation tools | source-specific errors/tool names | no UI, but DataHub-specific | transport precedent only |
| `datahub/verity/verity-asset-reader.mjs` | Read six governed Verity assets and Benchmark lineage; overlay findings | DataHub client, Verity registry/scenario, clock | Verity/DataHub snapshot | yes | no unless client response and clock are frozen | yes | DataHub URNs, provider, fetchedAt, lineage diagnostics | strongly Verity/domain bound | no; extract boundary ideas only |
| `datahub/verity/verity-asset-bridge.mjs` | Expose the Verity reader over a loopback GET bridge and optional cache | HTTP request, MCP client, TTL | JSON read response/health | yes | no | GET path is read-only | `source`, cache diagnostics, read-only flags | Verity bridge and local ports | no; loopback is not a generalized source contract |
| `datahub/verity/ownership-mcp-client.mjs` | DataHub ownership transport | options/environment, owner URN rules | mutation-capable ownership client | yes | no | no | DataHub/owner-specific | Verity Benchmark | explicitly excluded from v1 read adapter |
| `datahub/verity/verity-ownership-repair.mjs` | Proposal, confirmation, mutation and read-after-write verification | allow-listed proposal and mutation client | verified repair result and audit event | yes | no | mutation path | target URN, operation, verification | Verity Benchmark owner | pattern for future separate Action adapter only |
| `datahub/verity/verity-ownership-bridge.mjs` | HTTP proposal/POST mutation boundary | proposal HTTP calls, owner config | proposal or mutation result | yes | no | no | explicit target and proposal registry | Verity/Benchmark route | must not be combined with read adapter |
| `datahub/verity/asset-registry.mjs` | Define six Verity Dataset URNs and lineage | constants | allow-list maps and lineage | no | yes | n/a | stable DataHub URN | Verity | no; explicit-scope idea only |

The repository therefore contains provider implementations and adapter-like behavior, but no reusable `SourceClient → SourceAdapter → SourceSnapshot` contract. The README's diagram calls the DataHub overlay a “Source Adapter” (`README.md:118-133`), while the implementation is still tied to Verity assets, the local bridge, and the Continuity scenario.

## 5. Canonical Authority Boundary

The following architecture facts are confirmed:

| Proposition | Result | Evidence and interpretation |
|---|---|---|
| A. Nexus Context Graph / Context Package is Nexus-managed canonical context | **PASS** | `docs/Nexus-Atlas-v0.3-Generalized-Context-Package-Contract.md:48-64` makes the Graph the sole canonical source and the Package a derived projection. `self-context-provider.mjs:41-67` follows that path. |
| B. External systems must not be the single canonical store for a complete personal Graph | **PASS** | `docs/Nexus-Atlas-Architecture-Review-v1.0.md:662-684` and `README.md:120-133` explicitly keep DataHub as an external source, not the personal Graph store. |
| C. An external system has authority only over verifiable state within its own boundary | **PASS** | `docs/Nexus-Atlas-v0.2-Context-Model.md:134-142` and the Architecture Review source-state rules separate external authority from human authority. |
| D. A Source Adapter must not auto-convert external data into preference, identity, confirmed Decision, or confirmed rationale | **PASS** | The Context Model says human confirmation is highest for personal decisions, external authority is source-local, and AI inference remains inferred (`Context-Model.md:134-142`). The Architecture Review requires human authority for key decisions (`Architecture-Review-v1.0.md:50-52`, `496-498`). |
| E. First-version Source Adapter should be read-only | **PASS** | Existing read bridges expose `readOnly` and reject mutation tools (`datahub/mcp/mcp-client.mjs:63-90`; `verity-asset-reader.mjs:279-293`). This is also the lowest-risk entry boundary. |
| F. External mutation must be separated from the Source read path | **PASS** | DataHub has a separate read bridge and ownership bridge; the repair path requires proposal, confirmation, mutation and read-after-write verification (`verity-ownership-repair.mjs:90-165`; `verity-ownership-bridge.mjs:151-185`). |
| G. DataHub is a domain-specific read overlay/provider precedent, not a generalized Source Adapter framework | **PASS** | The reader depends on `VERITY_ASSETS`, `VERITY_BENCHMARK_ASSET`, Verity scenario shape and Benchmark lineage (`verity-asset-reader.mjs:1-12`, `176-257`). No generic Snapshot or Adapter interface exists. |
| H. Self-Context Provider should not become GitHub-specific | **PASS** | Its responsibility is Graph validation, Ledger generation and package projection (`self-context-provider.mjs:41-119`); v0.3 explicitly says the Provider does not call the network (`Generalized-Context-Package-Contract.md:60-64`). |

## 6. Source Adapter Definition

A Source Adapter is a read boundary that converts explicitly scoped external source state into a normalized, provenance-preserving, immutable Source Snapshot. It does not define personal truth, does not infer authority beyond the source's own state, and does not silently mutate the canonical Context Graph.

The distinction is intentional:

- **Provider** organizes Nexus-owned Graph/Ledger/package output for a product or continuity surface.
- **Source Client** speaks the external protocol and returns source responses.
- **Source Adapter** validates scope, applies source-specific extraction and normalization, preserves source-native authority and timestamps, and returns a Snapshot.
- **Import Planner / Normalizer** maps a Snapshot into candidate Nexus records under explicit policy.
- **Governance** decides what may become canonical, with human confirmation where personal authority is involved.

## 7. Architecture Options

### Option A — Adapter directly generates ContextNode

```text
GitHub → Adapter → ContextNode[] → Graph
```

Advantages: small apparent implementation; immediate reuse by existing Graph validators; fewer intermediate objects.

Costs and risks: the adapter must know canonical kinds, lifecycle, epistemic state, scope, governance and package eligibility at once. GitHub semantics become coupled to the canonical model; an issue or commit can be accidentally promoted to a Decision, Memory or project fact. Provider logic and source protocol logic become difficult to test independently. Authority errors become schema-valid objects, which is more dangerous than a rejected Snapshot. Every future Drive, Notion or Calendar adapter would repeat canonical mapping policy.

Conclusion: not recommended. Simplicity at the function boundary creates the highest authority and schema-coupling risk.

### Option B — Adapter returns normalized source snapshot

```text
GitHub → Source Adapter → Source Snapshot → Context Normalizer
       → Candidate Context Records → Graph / Package
```

Advantages: source-native records remain distinct from canonical records; provenance, source timestamps, bounded-read diagnostics and unavailable states are retained. Snapshot normalization can be deterministic from a frozen response. The same import policy can consume GitHub, Drive, Notion or Calendar snapshots without putting network calls in Providers.

Costs and risks: without an explicit import plan/governance step, a later caller may still write candidates directly. The contract needs careful state semantics for missing, stale and unavailable data. A Snapshot is not itself a canonical Graph, so another boundary must be enforced.

Conclusion: the required contract foundation, but incomplete as the complete Graph-ingestion architecture unless the next boundary is explicit.

### Option C — Immutable Snapshot plus import plan

```text
GitHub → Source Adapter → immutable Source Snapshot
       → Context Import Planner → Candidate Records
       → Governance / Human Confirmation → Canonical Graph
```

Advantages: makes External Source Read and Canonical Context Mutation separate. The plan can distinguish safe observations from inferred claims and human-authority records; it can be inspected, tested and rejected without changing the Graph. It supports idempotent stable identities, explicit allowlists, bounded reads, deterministic normalization and audit diagnostics. A future mutation adapter can remain a separate capability.

Costs and risks: more objects and a larger contract; policy/version compatibility must be specified; plan execution needs acceptance tests and an explicit confirmation model. It is not sufficient to call a plan “safe” without recording its source references and authority class.

Conclusion: recommended as the end-to-end architecture, with B frozen first as the Phase 4B Snapshot contract.

## 8. Recommended Architecture

Use a B/C hybrid with a hard boundary:

```text
Source Client
  → Source Adapter (scope, read-only, source validation)
  → immutable Source Snapshot (source-native records)
  → Context Import Planner / Normalizer (deterministic, policy-versioned)
  → Candidate Context Records (never silently canonical)
  → Governance / human confirmation where required
  → Canonical Context Graph
  → Decision / Memory Ledger
  → Generalized Context Package
  → Provider / Product Surface
```

This best matches the Context Fabric because it preserves one canonical Nexus model while allowing many external sources. GitHub and DataHub cannot define the canonical schema: their records stay in `source`-native Snapshot records, and mapping is owned by a provider-neutral policy layer. A source may assert that a commit exists or that a PR is merged; only Nexus governance can assert what that means for a personal decision, rationale or long-term memory.

The design supports Google Drive, Notion, Calendar and additional repository providers by giving each adapter a source-specific client and normalizer, while sharing Snapshot validation, identity rules, diagnostics, import policy, candidate classification and governance. Human authority is preserved by requiring confirmation for Identity, preference, key Decision, rationale, long-term Goal, conflict resolution and consequential action. Inferred context is represented as `inferred` candidate material with evidence references; it is never silently upgraded to `confirmed`.

Live reads do not need to be deterministic across time. Given the same response and the same `capturedAt`, Snapshot normalization and Import Planning must be deterministic. The canonical Package remains deterministic over its canonical Graph/Ledger inputs.

## 9. GitHub First-Adapter Assessment

**CONDITIONAL**.

GitHub is a good first candidate for contract validation, but not yet a confirmed first Adapter. It is naturally related to the Nexus repository, exposes clear repository/branch/commit/issue/PR/release states, offers strong source references and supports bounded public read fixtures. It also lets Nexus test stale/freshness and source-unavailable behavior without importing an entire personal data universe.

The condition is that GitHub remains a source of repository facts, not a source of user truth. The first implementation must wait for the Phase 4B Snapshot contract, explicit repository selection, privacy policy, frozen fixtures and acceptance cases. No repository scan, account inference, OAuth flow or write capability is justified by this audit.

GitHub can help verify a bounded part of the current project state, such as a repository's default branch HEAD or the existence and state of a referenced PR. It cannot, alone, verify that a Nexus Phase is complete, why a decision was made, whether a user intends to continue, or whether a project rationale remains valid.

## 10. GitHub Authority Matrix

| GitHub record/field | Authority classification | Boundary |
|---|---|---|
| Repository metadata | AUTHORITATIVE | GitHub is authoritative for the returned repository's own metadata within the selected reference and capture time. |
| Default branch | AUTHORITATIVE | Authoritative for the configured/default branch value returned by GitHub; not proof of the user's preferred workflow. |
| Branch HEAD | AUTHORITATIVE | Authoritative for the observed branch ref and SHA at capture time; mutable later. |
| Commit existence | AUTHORITATIVE | GitHub can prove that the selected repository returned the commit. |
| Commit SHA | AUTHORITATIVE | Stable source identity/content reference; not a claim about intent. |
| Commit timestamp | AUTHORITATIVE | Authoritative as GitHub's exposed source timestamp; preserve whether authored/committed/pushed time. |
| Commit author metadata | OBSERVATIONAL | Useful for repository attribution, but identity and personal ownership require separate authority; email is privacy-sensitive and excluded from v1 normalized output. |
| Tags | AUTHORITATIVE | Authoritative for observed tag/ref state; tag meaning is not automatically a product milestone. |
| Releases | AUTHORITATIVE | Authoritative for release object state and publication metadata; release significance remains contextual. |
| Issues | AUTHORITATIVE | Authoritative for GitHub issue records within the bounded scope. |
| Issue state | AUTHORITATIVE | Authoritative for `open`/`closed` as returned; closed does not prove the underlying problem is solved in Nexus. |
| Pull Requests | AUTHORITATIVE | Authoritative for PR records within the bounded repository scope. |
| PR state | AUTHORITATIVE | Authoritative for GitHub PR state at capture time. |
| Merged state | AUTHORITATIVE | Authoritative for GitHub's merged state; does not prove deployment, adoption or project completion. |
| PR title | OBSERVATIONAL | Source text useful as evidence/candidate context; not a canonical goal or decision. |
| PR body | OBSERVATIONAL | Potential evidence, but mutable, authored by external actors and not a confirmed rationale. |
| Issue body | OBSERVATIONAL | Potential source evidence; not automatically a user requirement, preference or identity fact. |
| Comments | OUT_OF_SCOPE_V1 | High privacy/noise/authority cost; defer until explicit policy and bounded capture exist. |
| README | OBSERVATIONAL | Repository documentation can support evidence; it is mutable prose and cannot alone prove current phase or completion. Separate v1 decision below. |
| Workflow status | AUTHORITATIVE | Authoritative for GitHub workflow/check state returned at capture time; not proof of release readiness or phase completion. |
| Repository topics | OBSERVATIONAL | GitHub-managed labels, not canonical Nexus taxonomy or user identity. |
| Stars / forks | OBSERVATIONAL | Social/aggregate signals, not personal project truth or product validity. |
| Contributor data | OBSERVATIONAL | Useful repository activity signal; not identity, authority, ownership or consent. |

Fixed boundary: GitHub can prove repository state, commit existence, branch/tag/release state, and issue/PR system state. GitHub cannot independently prove real user intent, why a Decision was made, long-term preference, Identity, project rationale, or “Phase 4 is complete”. Those require Nexus canonical evidence and/or human confirmation.

## 11. GitHub v1 Read Scope

The minimum read-only scope should be:

1. selected repository metadata;
2. selected repository default branch and branch HEAD;
3. bounded recent commits;
4. bounded open and recently closed Issues;
5. bounded open and recently merged PR references;
6. bounded latest Releases and/or Tags.

The adapter must enforce a finite maximum for every collection. The caller may request a lower bound, but may not raise the adapter's hard maximum. Pagination must stop at the bound and report truncation diagnostics.

README is **not required for the first Snapshot contract**. If included in a later GitHub v1 implementation, it must be an explicitly selected, size-bounded repository document with a content hash and source reference, classified as observational evidence candidate. It must not be read implicitly merely because the repository was selected.

Out of scope for v1: all account repositories, automatic repository discovery, all branches/history, unbounded commits, all comments, Discussions, Actions logs, secrets, organization membership, private profile enrichment, stars/watch history, arbitrary repository contents and full file trees.

## 12. Repository Selection Contract

One call reads exactly one explicitly supplied `repositoryRef`, for example `cyrilla-mist/nexus-ai`.

The adapter must reject:

- empty or omitted repository references;
- `latest repo` or similar indirect selectors;
- “my main project” or account-based guesses;
- automatic scans of all repositories;
- selection based on recent activity.

The reference must be normalized and validated as an owner/repository pair. Multi-repository aggregation belongs to a higher-level orchestration layer and is not part of the first adapter call.

## 13. Candidate Source Snapshot Contract

The suggested Phase 4B contract is conceptual, not implemented:

```js
{
  snapshotVersion: "1",
  adapter: "github",
  provider: "github",
  capturedAt: "2026-08-07T00:00:00.000Z",
  scope: {
    repositoryRef: "cyrilla-mist/nexus-ai",
    limits: { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 }
  },
  source: {
    provider: "github",
    reference: "cyrilla-mist/nexus-ai",
    retrievalMode: "read-only-api",
    sourceState: "available"
  },
  authority: "github-repository-state",
  records: [
    {
      sourceRecordId: "github:commit:cyrilla-mist/nexus-ai:...",
      sourceType: "commit",
      externalId: "...",
      observedState: "present",
      observedAt: "2026-08-06T00:00:00.000Z",
      reference: "https://github.com/cyrilla-mist/nexus-ai/commit/...",
      authority: "github-commit-state",
      payload: {}
    }
  ],
  diagnostics: {
    truncated: false,
    unavailable: false,
    errors: []
  }
}
```

The final contract must decide whether `sourceState`, `authority`, limits and diagnostics are required, but must preserve these distinctions:

- `capturedAt` is Nexus capture time, not source event time;
- `records` are source-native normalized records, never direct canonical `ContextNode`s;
- credentials never appear in Snapshot, provenance, logs or packages;
- an unavailable source returns explicit diagnostics, not an empty success Snapshot;
- payload must be bounded and privacy-redacted by policy.

## 14. Stable External Identity

Stable identity must use source identity plus explicit repository scope, not display text or array order:

```text
github:repo:<owner>/<repo>
github:commit:<owner>/<repo>:<sha>
github:issue:<owner>/<repo>:<number>
github:pr:<owner>/<repo>:<number>
github:release:<owner>/<repo>:<release-id>
github:tag:<owner>/<repo>:<tag-name-or-ref-id>
```

The exact tag form must be frozen in Phase 4B because tag names can be mutable or deleted. URL is a reference, not the only identity. Title is never identity. A mutable branch name plus timestamp and an array index are never identity. Commit SHA is the source's strongest identity for a commit; issue/PR numbers are stable within a repository but must always include the repository identity.

## 15. Freshness and Time Semantics

The adapter records raw source event timestamps without deciding their business importance:

- repository/ref capture: `capturedAt` and any source-provided update time;
- commit: authored and committed times where available;
- PR/Issue: created, updated, closed/merged times where available;
- release: created/published/updated times where available;
- tag: source ref/object time only when GitHub provides a meaningful value.

`capturedAt` answers “when did Nexus observe this?”; source event time answers “when did GitHub report this event?” They must not be substituted.

The Adapter records raw timestamps. A Context normalization/policy layer decides `current`, `stale` or `unknown` using a declared policy, applicable project/version scope and possibly a comparison time. The GitHub Adapter must not decide that a PR is no longer important merely because it is old.

## 16. Missing / Deleted / Unavailable Semantics

| Situation | Meaning | Required handling |
|---|---|---|
| 404 | Selected resource is not returned as found for this request | `SOURCE_NOT_FOUND` when the selected repository itself is not found; record-level absence is not blanket deletion proof. |
| 403 | Forbidden or insufficient authorization | `SOURCE_FORBIDDEN` or `SOURCE_AUTH_REQUIRED`; never convert to empty data. |
| Rate limit | Source temporarily refuses/limits retrieval | `SOURCE_RATE_LIMITED`; retry only under bounded policy. |
| Network unavailable/timeout | Nexus cannot establish source state | `SOURCE_UNAVAILABLE`; preserve last observation only as cached/unavailable, never current. |
| Repository renamed | Old reference no longer resolves | report not-found/identity mismatch; do not silently rebind to a guessed repository. |
| Repository archived | GitHub reports archived state | preserve `archived` as observed repository state; it is not deletion. |
| Record deleted | Source may explicitly report deletion or no longer return it | distinguish explicit deletion from bounded absence; do not delete canonical context automatically. |
| Record not returned by bounded query | Query did not include it or pagination stopped | `not_observed_in_scope` / truncation diagnostic, not missing/deleted. |
| Branch removed | Ref is absent at capture time | source ref absence only; do not infer commit deletion or remove canonical records. |

`unavailable` ≠ `missing` ≠ `revoked` ≠ `stale`. No source read may silently delete canonical Context. A later policy or human review may propose archival or revocation, but that is a separate governance action.

## 17. Pagination and Bounds

The first adapter must use bounded reads for commits, Issues, PRs, Releases and Tags. Phase 4B must freeze:

- which collections are paginated;
- whether the caller can request a limit below a contract maximum;
- the adapter-enforced hard maximum;
- whether one page or multiple bounded pages are used;
- diagnostic fields for `truncated`, `pagesRead`, `itemsRead`, and continuation availability.

The audit deliberately does not choose product values for N. The invariant is finite, enforceable, visible bounds; no infinite pagination. A truncated response is valid source observation with a limitation, not a complete repository snapshot.

## 18. Authentication Boundary

Authentication is design-only in Phase 4A:

1. unauthenticated public GitHub is the simplest fixture/test path but has limited visibility and rate limits;
2. a Personal Access Token is operationally simple but has broad user-token/privacy and rotation risks;
3. a GitHub App offers narrower installation/repository permissions and is the long-term server-side recommendation;
4. OAuth user authorization is appropriate only if a future product explicitly needs user-mediated account access, with substantial consent and identity implications.

The long-term recommendation is an explicitly scoped GitHub App or equivalent installation-level credential, not an ambient account token. Phase 4B must guarantee that credentials never enter the Context Graph, provenance reference, logs, Source Snapshot or Context Package, and that the Adapter interface never returns a Token. No credential handling code is authorized in Phase 4A.

## 19. Privacy Boundary

- Repository selection is an explicit allowlist supplied by the caller; no account-wide discovery.
- Private repositories require explicit authorization and an explicit repository reference; no implicit private content access.
- User identity metadata is minimized to what is needed for source attribution; GitHub usernames are observational, not Nexus identity.
- Commit author emails are excluded from the first normalized Snapshot by default.
- Issue/PR bodies are optional, bounded and observational; they are not automatically user intent or rationale.
- Comments are `OUT_OF_SCOPE_V1`.
- Local clone paths are never source references or payload.
- Secrets, tokens, API keys and credential-bearing URLs are redacted before Snapshot, logs or provenance.
- Arbitrary repository contents are out of scope; README requires an explicit, separately frozen policy.

## 20. Read / Write Separation

Source Adapter v1 is **READ ONLY**. It contains no create issue, close issue, merge PR, commit, push, tag, release, comment or repository-metadata edit capability.

Any future write-back must be a separate capability:

```text
Action → proposal → human confirmation → mutation adapter
       → read-after-write verification → Context event
```

The existing DataHub ownership flow demonstrates this separation (`verity-ownership-repair.mjs:90-165`). It must be treated as a precedent for governance, not copied into a generalized GitHub implementation. A read adapter must never acquire a hidden write path.

## 21. Canonical Graph Mutation Boundary

The Source Adapter must not directly write the canonical Graph. The recommended flow is:

```text
Source Adapter
  → Source Snapshot
  → Context Import Planner
  → Candidate Context Records
  → governance policy and human confirmation
  → canonical Graph event/write
```

Safe observations may become evidence candidates. For example, “commit SHA exists on the selected branch at capture time” can support an Evidence candidate. The statement “this commit means Phase 4 is complete” is an inference and requires a Nexus policy plus human/canonical evidence; it cannot become a confirmed Decision or Memory automatically.

The v0.3 Builder already supplies the right negative boundary: it validates and projects inputs, does not call the network, does not write files, and does not mutate the Graph (`Generalized-Context-Package-Contract.md:48-64`). Phase 4 must preserve this separation.

## 22. Candidate Context Mapping

Candidate mappings are suggestions, not canonical writes:

| Source record | Candidate Nexus kind | Candidate status and limits |
|---|---|---|
| Repository | `source` / external reference, possibly project evidence | records repository state and scope; does not establish identity or project ownership |
| Commit | `event` or `evidence` candidate | proves observed commit/ref state; does not explain intent or completion |
| Release | `event` or `evidence` candidate | records release state; does not prove deployment or milestone acceptance |
| Issue | `event` or `action` candidate | records issue system state; does not become a user Goal or requirement automatically |
| Pull Request | `event` or `evidence` candidate | records PR state/merge observation; does not become a confirmed Decision |
| README | `evidence` candidate | only if explicitly scoped, bounded and hashed; mutable prose remains observational |
| Workflow status | `evidence` candidate | records check result; does not prove phase completion or product readiness |

Do not create canonical kinds named `github_commit`, `github_issue` or `github_pr`. Existing canonical kinds remain `identity`, `project`, `goal`, `milestone`, `event`, `decision`, `evidence`, `memory`, `risk`, `action` and `source` (`Context-Model.md:24-26`).

## 23. Determinism Boundary

| Layer | Determinism requirement |
|---|---|
| Live Source Read | Not identical across time; must expose `capturedAt`, source state and diagnostics. |
| Snapshot normalization | Given identical source response and `capturedAt`, byte/semantic output must be deterministic. |
| Import Planning | Given the same Snapshot and policy version, output must be deterministic and non-mutating. |
| Candidate classification | Same candidates, policy and authority rules produce the same classifications. |
| Canonical Context Package | Existing v0.3 deterministic rules continue to apply. |

Frozen GitHub fixtures must cover present, changed, empty-bounded, truncated, forbidden/not-found and unavailable cases. Tests must not require live GitHub for success.

## 24. Error Taxonomy

The following candidate codes are design-only:

| Code | Class | Retry? | Empty Snapshot allowed? |
|---|---|---|---|
| `INVALID_REPOSITORY_REF` | structural | no | no |
| `INVALID_ADAPTER_OPTIONS` | structural | no | no |
| `SOURCE_AUTH_REQUIRED` | authorization/configuration | after explicit auth/config change only | no |
| `SOURCE_FORBIDDEN` | authorization | generally no automatic retry | no |
| `SOURCE_NOT_FOUND` | source selection/state | no automatic retry | no |
| `SOURCE_RATE_LIMITED` | transient source | bounded retry/backoff | no |
| `SOURCE_UNAVAILABLE` | transient transport | bounded retry | no; may return explicit unavailable result |
| `SOURCE_RESPONSE_INVALID` | structural/source contract | no until response/adapter issue is fixed | no |
| `SOURCE_SCOPE_MISMATCH` | structural/governance | no | no |
| `SOURCE_RECORD_ID_INVALID` | structural | no | no |
| `SOURCE_PAGINATION_LIMIT` | bounded-scope diagnostic | not an error if explicitly truncated; otherwise no | not as complete success |
| `SOURCE_SNAPSHOT_INVALID` | structural | no | no |

No transient or authorization error may be interpreted as an empty repository, deletion, stale state or revoked canonical record.

## 25. Cache and Offline Semantics

The Adapter should not silently own a cache as part of the first contract. If caching is later added, the cache layer must preserve:

- `cached: true`;
- original `capturedAt`;
- cache age and freshness policy;
- `sourceUnavailable: true` when the live read failed;
- the difference between cached observation and current live state.

Live read failure must never return an old Snapshot labeled as current. An offline fallback is allowed only as an explicit, stale/cached result that callers can distinguish. The current DataHub bridge defaults live caching off and annotates cache hits (`verity-asset-bridge.mjs:67-97`); this is a useful rule, but the GitHub contract should remain provider-neutral.

## 26. DataHub Precedent: Reuse vs Do Not Reuse

Reuse as architecture precedent:

- read/write separation;
- explicit allowlists and exact mutation targets;
- source unavailable ≠ missing state;
- source-specific authority;
- read-after-write verification for future writes;
- external state as an overlay on Nexus context;
- explicit `readOnly`, `mutationEnabled`, source and diagnostic fields.

Do not reuse as a generalized base class or contract:

- the Verity-specific asset registry;
- exact DataHub URN assumptions;
- loopback HTTP requirement and fixed ports;
- Continuity Scenario shape;
- Benchmark ownership logic;
- DataHub MCP payload parsing and tool names;
- ownership proposal semantics.

Final conclusion: DataHub is an architecture precedent, not a Source Adapter base class.

## 27. Provider vs Adapter Boundary

Recommended layers:

```text
Source Client
  ↓
Source Adapter
  ↓
Source Snapshot
  ↓
Context Import Planner / Normalizer
  ↓
Canonical Context Graph
  ↓
Decision / Memory Ledger
  ↓
Generalized Context Package
  ↓
Provider / Product Surface
```

`Provider` organizes already approved Nexus Context output. `Adapter` reads and normalizes an external source. GitHub network calls must not be placed in `experience/context-v02/self-context-provider.mjs`; that module's current contract is deterministic self-context assembly and must remain source-neutral.

## 28. Risks

### P0

None found for the Phase 4B contract-design entry. A P0 would be a violation of canonical authority, an implicit write path, or inability to preserve source/unavailable state; the current architecture explicitly guards those boundaries.

### P1

- Direct Adapter-to-ContextNode coupling could silently promote source observations into personal truth.
- Missing Snapshot contract could cause each source to invent incompatible provenance, identity and freshness semantics.
- Unbounded repository reads could create privacy, cost and determinism failures.
- Automatic repository selection could read the wrong private or personal project.
- Reusing the DataHub Verity reader as a base class would encode domain-specific assumptions.

### P2

- README/body payload policy and redaction details are not yet frozen.
- Tag identity and source event-time field selection need a contract decision.
- Cache diagnostics and offline UX need shared terminology.
- Error code ownership between Client, Adapter and Planner needs implementation-level definition.
- Existing Continuity normalization uses fallback `new Date()` when timestamps are absent (`normalize-continuity-scenario.mjs:37-82`); it must not be copied into deterministic Snapshot normalization without explicit capture time.

### P3

- Documentation can improve its terminology for “Source Adapter” versus “Provider”.
- README status and roadmap presentation can be reconciled in a later documentation pass.
- Additional source-specific examples can follow after the contract is frozen.

## 29. Technical Debt Found

| Priority | Finding | Evidence | Impact | No change made in Phase 4A |
|---|---|---|---|---|
| P1 | v0.2 Context Model header still says `Status: Proposed` and `Implementation: Not started` | `docs/Nexus-Atlas-v0.2-Context-Model.md:1-4` | Conflicts with implemented v0.2/v0.3 runtime and could confuse contract readers | yes |
| P1 | Context Model section 13 still describes the older v0.2 Package shape | `Context-Model.md:124-132`; v0.3 contract is separate | Readers may not know which Package contract is current | yes |
| P2 | Roadmap Phase 4 is correctly `Planned`, but the canonical Action and surrounding hardening notes are easy to conflate with runtime start | `Roadmap.md:176-191`; Phase 3 verification prints `action:review-phase4-source-adapter-entry` | Requires explicit phase-boundary wording in future docs | yes; Roadmap and Action intentionally unchanged |
| P2 | README contains both implemented-stack language and “still requiring final local verification” language | `README.md:9-11`, `440-470` | Hackathon/runtime status can be read as more complete than the acceptance boundary | yes |
| P1 | “Source Adapter” is used for the DataHub overlay even though the implementation is provider/domain/scenario bound; Provider and Adapter terminology is not consistently separated | `README.md:118-133`; `verity-asset-reader.mjs:176-257` | Future contributors may place source calls in Providers | yes |
| P2 | DataHub live Provider/Reader is tightly bound to Verity scenario entities, six assets, Benchmark lineage and loopback bridge | `datahub/verity/asset-registry.mjs:1-93`; `verity-asset-reader.mjs:176-297`; `datahub-continuity-provider.mjs:9-56` | It cannot be generalized without an intermediate Snapshot contract | yes |
| P2 | Existing `package.json` has Phase 3, Atlas and Verity/DataHub checks, but no Source Snapshot/Adapter/Import Planner gates | `package.json` scripts | Phase 4B must add narrowly scoped gates later | yes |

## 30. Recommended Phase 4 Delivery Plan

1. **Phase 4A — Entry Architecture Audit (this document):** freeze boundaries, authority, scope, risks and first-adapter assessment. Status remains audit complete; Phase 4 remains Planned.
2. **Phase 4B — Source Snapshot Contract:** define schema, source-state/error taxonomy, identity, timestamps, privacy, bounds, diagnostics, fixture rules and validation without a live adapter.
3. **Phase 4C — GitHub Read-only Adapter:** implement one explicit-repository adapter against injected client responses; no OAuth, no write, no account scan, no Graph mutation.
4. **Phase 4D — Import Planner:** map source-native records to deterministic candidate records and explicit authority/inference classes; still require governance before canonical writes.
5. **Phase 4E — Canonical Integration:** add a narrow, read-only Self-Context or selected-project integration only after the planner and acceptance contract prove no silent writes.
6. **Phase 4F — Acceptance and policy hardening:** frozen fixtures, unavailable/auth/rate-limit cases, privacy checks, regression gates, package-lock exclusion and explicit review of any canonical write proposal.

This split keeps source transport, source normalization, candidate planning and canonical mutation independently testable.

## 31. Proposed Phase 4B Inputs

Phase 4B must freeze at least:

- Snapshot version and required top-level fields;
- one-repository `repositoryRef` grammar and explicit-selection rule;
- supported source record types and bounded collection limits;
- stable external ID grammar for repository, commit, Issue, PR, Release and Tag;
- distinction between `capturedAt` and source event timestamps;
- `available`, `unavailable`, `forbidden`, `not_found`, `truncated`, `not_observed_in_scope` and explicit-deletion semantics;
- structural/transient/authorization error codes and retry policy;
- credential redaction and private-repository consent rules;
- default exclusion of author emails and comments;
- README inclusion decision and size/hash policy;
- deterministic normalization and Import Planning invariants;
- Snapshot immutability and no-network Planner contract;
- candidate mapping and authority classes;
- cache/offline metadata rules;
- fixture format and required regression cases;
- package scripts and gates that do not alter Phase 3 acceptance boundaries.

Phase 4B must not implement a GitHub API client, OAuth, token handling, live runtime, Graph write or UI.

## 32. Non-Goals

This audit did not and must not include:

- no OAuth implementation;
- no GitHub token handling;
- no live GitHub runtime;
- no Graph mutation;
- no UI;
- no external write;
- no Phase 4B implementation;
- no GitHub REST API call as product Runtime;
- no Provider, Builder, Phase 2 or Phase 3 Runtime change;
- no DataHub, Continuity or canonical fixture change;
- no Roadmap or canonical Action change;
- no PR, merge or main update.

## 33. Final Audit State

Only this audit document is intended to be added. The audit does not mark GitHub as a confirmed first Adapter, does not mark Phase 4 as In Progress or Complete, and does not begin Phase 4B. `package-lock.json` remains an untracked local file and is excluded from the audit change.

## Phase 4B Follow-up

- Phase 4B contract frozen.
- B/C architecture retained: immutable Snapshot first, explicit Import Planner boundary next.
- Generic Snapshot and GitHub Profile are separated.
- Unavailable is an Error, not a successful Snapshot.
- Normal truncation is a diagnostic, not `SOURCE_PAGINATION_LIMIT`.
- README, Issue/PR bodies and comments remain out of v0.1.
- Roadmap now records Phase 4 as In progress at the contract/documentation boundary; Phase 4C Runtime remains Planned.
- No Runtime started.
- Phase 4B acceptance hardening completed.
- Contract/Test Matrix status: Accepted.
- Successful GitHub Snapshots always include repository and default branch.
- Repository identity is case-normalized.
- PR, Release and timestamp normalization is frozen.
- Successful bounded truncation keeps `diagnostics.complete=true`.
- Phase 4C remains not started.

## Phase 4C Follow-up

- Accepted Source Snapshot Contract implemented with a validator runtime.
- GitHub read-only Adapter uses an injected read-only client only.
- 36 catalog cases are automated.
- No live authenticated transport, Import Planner or canonical write was added.
- Phase 4D is next.
- Phase 4C acceptance hardening is complete: offset-aware timestamps, explicit truncation semantics, normalized repository projection, and real catalog execution are covered by the runtime suite.
- Phase 4C final acceptance completed; no Phase 4D work started.

## Phase 4D Contract Follow-up

- Context Import Plan Contract defined.
- GitHub v1 source observations map only to Evidence Candidates.
- Semantic promotion is explicitly prohibited.
- Canonical write remains prohibited.
- Phase 4D Planner Runtime not started.
- Phase 4E remains the Canonical Integration boundary.

Phase 4D Contract acceptance hardening completed. The GitHub core singleton invariant remains preserved through Planner Cases, and Phase 4D Runtime is complete.

## Phase 4D Runtime Follow-up

- Context Import Planner Runtime implemented.
- Plan Validator implemented.
- 32 accepted cases automated.
- Evidence-only mapping preserved.
- no source re-read.
- no Canonical Graph write.
- Phase 4E remains next.
Phase 4D final acceptance hardening completed: the independent Plan Validator now enforces GitHub descriptor coherence, source type / mapping rule / authority coherence, deterministic candidate ordering, and the mechanical semantic boundary; the complete 32-case behavioral proof is accepted. No Phase 4E work was started.
Phase 4D boundary closure confirms: Planner-owned error boundary; positive GitHub numeric identity; encoded release/tag reference compatibility; sourceRecordId/provenance reference coherence.

## Phase 4E Contract Follow-up

- Canonical Admission contract defined;
- explicit authorization separated from Candidate generation;
- canonical observation identity is deterministic;
- existing Graph reconciliation is explicit;
- no latest-wins overwrite;
- Graph application remains future and pure;
- no Phase 4F work.
