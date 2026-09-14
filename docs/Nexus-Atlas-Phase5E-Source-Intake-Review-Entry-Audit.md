# Nexus Atlas Phase 5E — Source Intake Review Entry Audit

**Status:** Phase 5E contract-design handoff complete / implementation not started  
**Baseline:** Phase 5D Accepted / Frozen at `17289a65735f3a2314c94919cdde8ab21f3d5146`  
**Binding inputs:** Source Snapshot v0.1, Context Import Plan v0.1, Canonical Admission v0.1, Product Surface v0.1

## 1. Purpose

This audit establishes the narrow boundary for Phase 5E Source Intake Review before any browser implementation. Phase 5E exposes review state for an already-produced Source Snapshot and Context Import Plan. It does not create a connector, re-run a source adapter, or add a canonical persistence path.

## 2. Existing contract handoff

### 2.1 Source Snapshot v0.1

- The Snapshot is a bounded observation artifact with explicit scope, source state, diagnostics, timestamps, privacy projection and source authority.
- The accepted GitHub profile exposes seven bounded record kinds; it does not expose account-wide discovery or arbitrary repository scanning.
- The Snapshot boundary is read-only, deterministic, immutable and independent of live transport for contract acceptance.
- Phase 5E may display safe Snapshot metadata and accepted record-derived candidate summaries, but must not re-read or reconstruct source payloads.

### 2.2 Context Import Plan v0.1

- The Planner consumes the already-produced Snapshot and preserves source record identity, provenance and source time.
- Every accepted candidate is Evidence-only, has `admission.stage === "candidate"`, `admission.canonicalWriteAllowed === false`, and the fixed confirmation requirement `source-authority-sufficient`.
- Candidate coverage and deterministic ordering are already validated upstream; Phase 5E must not re-plan, reclassify or promote candidates.
- An unselected candidate remains deferred rather than rejected, revoked or treated as false.

### 2.3 Canonical Admission v0.1

- Selection is explicit: only supplied Candidate IDs are eligible for the local preview.
- Build/preview may construct a deterministic in-memory Admission Plan; Apply-time authorization rebinding remains a separate Phase 4 boundary.
- The Phase 5E surface must not call persistent storage, source transport or a canonical write API.
- Canonical Admission remains Evidence-only: it never promotes a candidate into Identity, Decision, Memory, Action, Risk, Milestone, Goal or Project truth, and it creates no Edges.

### 2.4 Product Surface v0.1

The existing optional Source Intake Review reservation is compatible with this audit: source metadata, candidate list, presentation-only selection state and an `in-memory-preview` admission result can be projected without changing the accepted Product Surface snapshot or Phase 5D Inspector semantics.

## 3. Phase 5E boundary decision

Phase 5E may surface:

- source metadata from the accepted Snapshot and Import Plan;
- bounded Candidate Evidence summaries;
- explicit selected/unselected/deferred review state;
- safe provenance and source-local authority;
- a deterministic local Admission Plan preview for explicitly selected candidates.

Phase 5E must not surface or claim:

- live GitHub OAuth, account connection or repository scanning;
- source re-read, refresh, polling or transport retry;
- persistent canonical write or remote synchronization;
- automatic selection, implicit “select all” or selection as authorization by itself;
- Edge creation or graph mutation;
- semantic promotion into Identity, Decision, Memory, Action, Risk or Project truth;
- raw private payloads, issue/PR bodies, comments, reviews, credentials, tokens or local paths.

## 4. Contract-design exit criteria

The Phase 5E contract-design pass is complete when the Source Intake Review Contract and blocking Test Matrix define the shape, selection semantics, deferred state, provenance/privacy display and local preview boundary. Browser UI implementation is intentionally deferred until those documents pass acceptance review.

