# Nexus Atlas — Portfolio Extraction

**Status:** Portfolio source-of-truth  
**Product baseline:** Phase 5 — Complete / Accepted / Merged  
**Accepted Phase 5 closure:** `b51712a497ea8c8407230c65a66823bea4163f86`  
**Stable `main` baseline:** `7e182c6bb684a35d29a0ae218737542684309c6e`

---

## 1. Portfolio positioning

### One-line product description

> **Nexus Atlas is a continuity control plane for long-running human–AI work.**

It is designed for work that spans many sessions, tools and agents, where files and chats may persist but trusted working state does not.

### Product promise

> **Come back without starting over — and leave the project in a better state for the next return.**

### Longer positioning

Long-running AI work loses more than conversation history. Over time it becomes unclear which decisions still hold, which evidence is stale, what was inferred versus confirmed, why a previous path was chosen, and what can safely happen next.

Nexus Atlas separates canonical context from derived governance and exposes a truthful Product Surface over that state. Its current accepted baseline focuses on restoring and inspecting context without silently promoting evidence, re-resolving decisions in the UI, or pretending that unsupported live capabilities exist.

---

## 2. The problem Nexus Atlas addresses

A project may preserve:

- source files;
- chat history;
- commits;
- documents;
- issue history;
- external metadata.

But those artifacts do not automatically preserve a **trusted working state**.

After time passes, or another AI agent enters the project, important questions reappear:

- What changed since the last trusted state?
- Which evidence is current and which is stale?
- Which decisions are still effective?
- Why was a decision made?
- Which memories are inherited, inferred, disputed or historical?
- Which identity claims were explicitly confirmed rather than inferred?
- Which external observations are merely evidence rather than accepted project truth?
- What remains unresolved?
- What is safe to do next?

Nexus Atlas treats those questions as a continuity problem rather than a chat-history problem.

---

## 3. What exists today

The portfolio should describe only capabilities that exist in the accepted `main` baseline.

### Canonical Context foundation

Nexus Atlas models project context around five canonical Context types:

1. **Identity Context** — who I am / who or what an actor is;
2. **Knowledge Context** — what is known;
3. **Memory Context** — what happened;
4. **Decision Context** — what was decided and why;
5. **Action Context** — what should happen next.

The Canonical Context Graph stores canonical truth. It deliberately does **not** store derived effective Decision results or inherited Memory results as canonical facts.

### Decision / Memory governance

Decision and Memory effectiveness is governed outside the Graph by the accepted Resolver / Ledger pipeline.

This preserves a critical separation:

> **canonical facts are stored once; derived governance is resolved by the authority responsible for it.**

### Provider-neutral Product Surface

Phase 5 adds a provider-neutral Product Surface over accepted context. The Product Surface is downstream of provider, validation and governance layers; it does not recreate those rules in the browser.

Accepted surfaces include:

- **Nexus Self-Context Desk** — a read-only current-state surface;
- **Canonical Inspector** — deterministic inspection of accepted Product Surface records;
- **Identity Context** — explicit distinction between confirmed and inferred identity state;
- **Source Intake Review** — review of accepted Candidate Evidence before any canonical admission.

### Source Intake Review

External source observations are not silently promoted into canonical context.

The accepted boundary is conceptually:

`Source observation → Candidate Evidence → explicit review → canonical admission boundary`

Within the current Product Surface:

- Candidate Evidence remains Evidence-only;
- source-local authority is not treated as user/canonical authority;
- local browser selection is ephemeral;
- selection is not authorization;
- authorization is not Apply;
- canonical Apply is unavailable from the browser surface.

### Existing Atlas shell

The accepted Product Surface coexists with legacy Map / Territory / Re-entry routes rather than pretending that those legacy views have already been migrated to the same semantic contract.

This explicit migration boundary is intentional.

---

## 4. Strongest engineering decisions

These are the most useful architecture stories for interviews, technical portfolios and project discussions.

### 4.1 Canonical truth is separate from derived governance

**Decision:** effective Decision / inherited Memory results are not written back into the Canonical Graph as if they were source truth.

**Why it matters:** derived state changes as evidence, scope and governance change. Storing it as canonical truth risks duplication, stale state and circular authority.

**Boundary:** Resolver / Ledger remain the Decision / Memory governance authority.

---

### 4.2 Projectors do not re-decide business semantics

**Decision:** Product Surface projectors mechanically project already-accepted semantics.

They do not independently decide:

- which Decision wins;
- which Memory is inherited;
- whether Identity is confirmed;
- whether Candidate Evidence should become canonical truth.

**Why it matters:** duplicating governance rules across runtime and UI would allow the same underlying state to produce conflicting truths depending on presentation layer.

---

### 4.3 Inferred Identity cannot become confirmed Identity through presentation

**Decision:** inferred identity remains visibly inferred unless a trusted upstream process explicitly confirms it.

**Why it matters:** a UI convenience must never manufacture user confirmation.

This is a concrete example of Nexus Atlas treating epistemic state as product behavior rather than decorative metadata.

---

### 4.4 Evidence admission is explicit and bounded

**Decision:** an external source record can become Candidate Evidence without becoming a Decision, Memory, Identity claim or other canonical fact.

**Why it matters:** retrieval is not truth; relevance is not authorization; selection is not mutation.

This creates a reviewable boundary between observing external reality and changing trusted project context.

---

### 4.5 Browser-local interaction is not persistent authority

**Decision:** Source Intake Review checkboxes and local review state are in-memory UI interaction only.

The browser does not imply:

- OAuth/source connection;
- source refresh;
- persistent Graph writes;
- canonical Apply;
- semantic promotion.

**Why it matters:** the product should describe what actually happened, not what a polished interface makes the user assume happened.

---

### 4.6 Accepted browser snapshots are mechanically tied to Node projection

**Decision:** committed browser-readable snapshots are acceptance-tested against the corresponding Node projector output.

**Why it matters:** the browser cannot silently diverge from accepted runtime semantics while still appearing correct visually.

---

### 4.7 Frozen boundaries are executable, not only documented

Phase 5F introduced a dedicated acceptance workflow with full Git history so accepted Phase 4 / Phase 5 runtime boundaries can be checked against frozen baselines.

The goal is to make “do not reopen this accepted layer” a machine-verifiable condition rather than a convention remembered by developers.

---

## 5. Engineering evidence

### Phase 5 acceptance

The accepted Phase 5 closure passed:

- **48 / 48 blocking Phase 5F cross-layer acceptance cases**;
- complete Full Node test suite;
- full repository check;
- Phase 4F frozen regression;
- full-history frozen-boundary verification.

Exact-SHA acceptance was performed against:

`b51712a497ea8c8407230c65a66823bea4163f86`

GitHub Actions evidence:

- Phase 5 Acceptance run `34843277130` — **SUCCESS**;
- Phase 4 Acceptance run `34843277203` — **SUCCESS**.

### What the 48 blocking cases verify

The Phase 5F matrix crosses previously separate Product Surface layers and verifies, among other things:

- Product Surface authority and truthfulness;
- Decision / Memory governance separation;
- Identity confirmation boundaries;
- provenance and privacy semantics;
- Source Intake selection vs authorization / Apply;
- Candidate Evidence non-promotion;
- accepted browser snapshot equivalence;
- unsupported browser capability boundaries;
- legacy route isolation;
- frozen Phase 4 / Phase 5 runtime compatibility.

The important portfolio claim is not simply “there are many tests.”

The stronger claim is:

> **Nexus Atlas turns architectural authority boundaries into executable acceptance conditions.**

---

## 6. What this project demonstrates

Nexus Atlas can be used as evidence of experience in:

### Product architecture

- decomposing a broad AI product into explicit authority layers;
- designing stable boundaries before expanding capability;
- separating current product truth from long-term roadmap vision.

### AI system governance

- provenance-aware context handling;
- epistemic states such as confirmed / inferred / stale / disputed / historical;
- human authorization boundaries;
- preventing semantic promotion from retrieval to trusted state.

### Software architecture

- canonical model vs derived projections;
- provider / validator / resolver / projector separation;
- deterministic browser snapshots;
- backward-compatible migration boundaries.

### Engineering discipline

- contract-first development;
- blocking acceptance matrices;
- regression gates;
- exact-SHA clean-checkout acceptance;
- frozen runtime verification;
- CI-backed phase closure.

### Product truthfulness

- not exposing fake source connections;
- not claiming persistence where none exists;
- not treating local selection as authorization;
- not hiding ambiguity by guessing.

---

## 7. What must NOT be claimed yet

Portfolio material must not overstate the current product.

Nexus Atlas **does not currently claim**:

- a production-ready autonomous agent platform;
- live generalized OAuth/account connectivity in the Phase 5 Product Surface;
- automatic live repository/account scanning from the browser;
- persistent canonical Graph mutation from Product Surface interactions;
- autonomous external action execution;
- Outcome Write-back;
- a completed Trusted Checkpoint / recovery runtime;
- a completed Multi-project Atlas;
- fully migrated Learning / Research / Creation / Evaluation product surfaces;
- proof that Nexus Atlas is already the optimal solution to human–AI continuity.

These exclusions make the portfolio stronger, not weaker: they distinguish verified capability from roadmap ambition.

---

## 8. Portfolio-ready copy

### Short project card

**Nexus Atlas — Human–AI Work Continuity Infrastructure**  
A provider-neutral continuity layer for long-running human–AI projects. Nexus Atlas separates canonical context from derived governance, preserves provenance and epistemic state, and exposes a truthful read-only Product Surface for restoring project state, inspecting decisions and identity, and reviewing external evidence before admission.

### 60-second explanation

> Nexus Atlas came from a problem I kept hitting in long-running AI work: the files, chats and commits survive, but trusted working state does not. After enough sessions, it becomes unclear which decisions still hold, which evidence is stale, what was inferred versus explicitly confirmed, and what is safe to do next. I designed Nexus Atlas around a Canonical Context Graph, with Decision and Memory governance resolved outside the Graph, then built a provider-neutral Product Surface with a Self-Context Desk, deterministic Inspector, explicit Identity semantics and Source Intake Review. A key design rule is that presentation cannot manufacture truth: inferred identity cannot become confirmed, external evidence cannot silently become canonical context, and local browser selection is not authorization. Phase 5 closed with a 48-case cross-layer acceptance suite plus full-history frozen-boundary CI. The next research step is not more UI; it is proving one real continuity loop with fresh verification and outcome write-back.

### Resume bullet — compact

- Built **Nexus Atlas**, a provider-neutral continuity layer for long-running human–AI work, combining a Canonical Context Graph, Decision/Memory governance, read-only Product Surface, deterministic Inspector and Source Intake Review.

### Resume bullet — architecture

- Designed strict authority boundaries so UI/projectors cannot silently re-resolve governance, inferred Identity cannot become confirmed, and external Candidate Evidence cannot become canonical truth without an explicit admission boundary.

### Resume bullet — engineering quality

- Implemented a **48-case cross-layer acceptance suite** and clean-checkout CI that verify frozen runtime boundaries, browser snapshot equivalence, provenance/privacy semantics and backward-compatible Product Surface behavior.

### Interview prompt: “What was technically difficult?”

A strong answer should focus on authority rather than feature count:

> The hardest problem was preventing duplicated truth. A naïve architecture would let the Graph, resolver and UI each encode some version of “the current decision” or “confirmed identity.” I instead made the Canonical Graph responsible only for canonical truth, kept Decision/Memory effectiveness in the Resolver/Ledger, and constrained projectors to mechanical projection. Then I turned those boundaries into acceptance tests so later UI work could not silently change governance semantics.

### Interview prompt: “What would you change after the hackathon?”

> I would narrow the next milestone. The original project invested early in generalized architecture. The DataHub hackathon retrospective made the missing proof clearer: a strong system needs a real, repeatable loop with an observable outcome. The next Nexus phase therefore prioritizes one real continuity loop — restore state, detect change, choose a bounded action, verify against fresh evidence, and write the outcome back — before multi-project or connector expansion.

---

## 9. Recommended visual case-study structure

A public Portfolio page should be understandable without reading repository internals.

Recommended sequence:

1. **Hero** — one-line continuity problem + product promise.
2. **The failure mode** — “artifacts persist; trusted working state does not.”
3. **System model** — Canonical Context → governance → Product Surface.
4. **Three product surfaces** — Desk, Inspector/Identity, Source Intake Review.
5. **One architecture decision** — canonical truth vs derived governance.
6. **One safety decision** — evidence/selection/authorization are different states.
7. **Engineering proof** — 48 blocking cases + clean-checkout exact-SHA acceptance.
8. **What I learned** — architecture alone is not a real-world outcome.
9. **Next experiment** — Real Continuity Loop, not feature expansion.

Avoid turning the Portfolio page into a complete architecture specification. The public case study should optimize for comprehension; the repository can hold the detailed contracts.

---

## 10. Current state and next experiment

### Stable state

`Phase 5 — Complete / Accepted / Merged`

Current accepted Product Surface is intentionally read-only and bounded.

### Next product question

> **Can Nexus Atlas measurably improve continuity in one real long-running human–AI project?**

The next product-definition cycle should therefore prioritize:

`Real Continuity Loop → Fresh Verification / Adversarial Evaluation → Outcome / Trusted-State Write-back → Multi-project → Expansion`

Governing principle:

> **Single real loop first. Generalize second. Expand last.**

This future direction is a research / product hypothesis, not a claim about the current accepted baseline.

---

## 11. Reuse rules

When producing future public material from this document:

- lead with the problem and outcome, not phase numbers;
- use phase / SHA detail only as technical evidence;
- prefer one strong architecture story over a long feature list;
- state unsupported capabilities explicitly rather than implying them;
- distinguish current verified capability from future product direction;
- do not present the DataHub competition result as the primary identity of Nexus Atlas;
- describe the hackathon as an origin / stress test, while presenting Nexus Atlas as the longer-term project it became.

This document is the portfolio source-of-truth until a later accepted product baseline supersedes Phase 5.
