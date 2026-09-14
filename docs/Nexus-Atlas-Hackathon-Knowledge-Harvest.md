# Nexus Atlas — Hackathon Knowledge Harvest

**Status:** post-Phase-5 product knowledge extraction  
**Baseline:** `main` after Phase 5 acceptance and Portfolio Extraction  
**Purpose:** decide what Nexus should keep, adapt, or deliberately ignore from prior competition projects before Phase 6 definition.

---

## 1. Why this document exists

Nexus Atlas has accumulated ideas through several competition builds. That is useful, but it creates a product risk: every successful pattern can look like a feature that should be imported.

That would be a mistake.

This harvest is not a merger plan for STATEWAKE, Sideglance, the DataHub hackathon build, or any other experiment. It is a decision record for extracting reusable product knowledge while protecting the narrower long-term Nexus thesis.

The governing question is:

> **Which prior ideas make Nexus better at preserving and resuming trusted human–AI work, and which ideas would merely make Nexus broader?**

The answer is organized into three classes:

- **KEEP** — the principle already fits Nexus and should survive essentially intact;
- **ADAPT** — the idea is valuable, but must be translated into Nexus semantics rather than copied literally;
- **IGNORE** — do not import this into the Nexus core unless future evidence creates a new requirement.

This document is intentionally stricter than a retrospective. It is a product boundary document.

---

## 2. Source projects

### STATEWAKE

Core thesis:

> **Validate before Recover.**

STATEWAKE treats interrupted work as a state-validity problem. It distinguishes observed evidence, inferred findings, and committed Trusted State; uses VALID / INVALID / AMBIGUOUS outcomes; requires human authorization for protected direction changes; and commits a new Resume State only through a bounded writer.

Strongest transferable lesson:

> A system should not resume from remembered state until it has checked whether that state is still safe to continue from.

### Sideglance

Core thesis:

> **Context sufficiency should be tested before interpretation.**

Sideglance uses a Context Gate, one minimum clarification question when necessary, structured evidence references, deterministic evidence resolution, grounding validation, and explicit confidence / usage boundaries around probabilistic interpretation.

Strongest transferable lesson:

> A model should not compensate for missing context by sounding confident.

### Nexus Atlas — DataHub hackathon build

Core thesis:

> **Restore context, trace decisions, continue the work.**

The competition build explored external governed metadata, DataHub ownership / lineage, read/write isolation, explicit confirmation, and read-after-write verification. It also exposed a product weakness: the architecture could become more complete than the proof that a real user continuity loop was measurably better.

Strongest transferable lesson:

> Architecture quality is not a substitute for one observable end-to-end outcome.

### Supporting lesson from unfinished / paused experiments

Other hackathon work reinforced an additional rule:

> Do not promote infrastructure, provider integrations, or agent frameworks into the long-term product merely because a competition required them.

Competition constraints are useful stress tests. They are not automatically product requirements.

---

## 3. KEEP — principles that should survive intact

### K1. Validate before continuation

**Origin:** STATEWAKE  
**Decision:** KEEP

Nexus should never equate "we have an old state" with "the old state is still valid."

For future Re-entry / Continuity work, a previous trusted state should be compared against fresh evidence before it is used as the continuation baseline.

This aligns directly with Nexus questions:

- What changed?
- Which evidence is stale?
- Which decisions still hold?
- What is no longer safe to assume?

**Product consequence:** Phase 6 should begin with a real verification loop, not a richer historical summary.

---

### K2. Separate observation, inference, authorization, and committed truth

**Origins:** STATEWAKE + Sideglance + Phase 5 Nexus  
**Decision:** KEEP

These must remain different semantic states:

```text
Observed evidence
  ≠ inferred finding
  ≠ user authorization
  ≠ committed trusted/canonical state
```

This is already consistent with Phase 5 Source Intake Review and Identity boundaries.

**Product consequence:** no future UI, agent, or connector may collapse these states for convenience.

---

### K3. Ask the minimum necessary human question

**Origins:** STATEWAKE Decision Gate + Sideglance Minimum Clarification  
**Decision:** KEEP

Human input is most valuable when the system has already narrowed the ambiguity.

The preferred pattern is not:

> "What do you want to do?"

It is:

> "One consequential ambiguity remains. Which of these bounded interpretations / directions is authorized?"

**Product consequence:** Re-entry should ask at most the smallest question required to cross a protected ambiguity boundary.

---

### K4. Evidence references should be inspectable, not decorative

**Origins:** Sideglance EvidenceRef + Nexus provenance  
**Decision:** KEEP

When a model or service makes a claim, the supporting evidence should resolve deterministically to an accepted record whenever possible.

A user should be able to inspect:

- where the evidence came from;
- when it was observed;
- what authority it has;
- whether it is stale;
- whether the system inferred anything beyond the source.

**Product consequence:** Phase 6 verification results should point to concrete evidence records, not free-form model citations.

---

### K5. Consequential writes need explicit authority and verification

**Origins:** STATEWAKE Trusted State writer + DataHub governed mutation path  
**Decision:** KEEP

A successful API response or agent message is not sufficient evidence that a consequential state change actually occurred.

The long-term pattern should remain:

```text
propose
  → authorize
  → apply through one bounded writer
  → re-read / verify
  → record outcome
```

**Product consequence:** Outcome Write-back should have one explicit authority boundary and a post-write verification contract.

---

### K6. Probabilistic interpretation should sit inside deterministic guards

**Origin:** Sideglance  
**Decision:** KEEP

Models are useful for interpretation, summarization, ambiguity detection, and explanation. They should not be the sole authority for structural invariants.

Deterministic code should continue to own:

- schema validity;
- accepted identities;
- provenance linkage;
- authorization state;
- mutation eligibility;
- idempotency / version constraints;
- contract validation.

**Product consequence:** Phase 6 may use a model to interpret changes, but deterministic gates must control what can alter trusted state.

---

### K7. Read-after-write is part of success

**Origin:** DataHub hackathon build  
**Decision:** KEEP

A write should not be considered complete merely because the write operation returned success.

For trusted-state or outcome write-back:

> **Success means the intended state is observable after the write.**

**Product consequence:** future continuity closure should verify the new state from the authoritative store before recording the loop as complete.

---

### K8. Product truthfulness is an engineering requirement

**Origins:** all three projects  
**Decision:** KEEP

Fixture mode, unavailable provider transport, local-only mutation, unsupported persistence, and future capabilities must remain visibly distinct.

This rule is already embedded in Phase 5 acceptance and should remain permanent.

---

## 4. ADAPT — useful ideas that must be translated into Nexus semantics

### A1. Trusted Working State → Trusted Checkpoint

**Origin:** STATEWAKE  
**Decision:** ADAPT

Do not import STATEWAKE's exact state model as a second canonical system.

Instead, Nexus should define a **Trusted Checkpoint** as a bounded continuity artifact derived from accepted Nexus context.

A checkpoint should answer only what the next re-entry requires, for example:

- trusted direction / active objective;
- accepted next action;
- evidence cursor or verification boundary;
- unresolved protected ambiguities;
- references to governing Decisions / Memories / Actions;
- version / creation metadata.

It must not duplicate the entire Canonical Context Graph.

---

### A2. VALID / INVALID / AMBIGUOUS → Continuity validity

**Origin:** STATEWAKE  
**Decision:** ADAPT

The tri-state model is strong, but Nexus should apply it to **continuation validity**, not to the whole project.

Possible future semantics:

- **VALID** — the accepted continuation point still holds;
- **INVALID** — specific assumptions / next actions no longer hold and a bounded replacement can be established;
- **AMBIGUOUS** — fresh evidence conflicts with protected intent or authority and requires one human decision.

Do not use these labels as generic health scores.

---

### A3. Context Gate → Sufficiency / consequence gate

**Origin:** Sideglance  
**Decision:** ADAPT

Nexus does not need a generic "is there enough context?" classifier before every operation.

It does need a narrower gate:

> **Is the available accepted context sufficient to make this consequential continuity decision without inventing intent or authority?**

This is a stronger fit than a universal context-sufficiency feature.

---

### A4. EvidenceRef → Canonical provenance reference

**Origin:** Sideglance  
**Decision:** ADAPT

Do not create a new parallel EvidenceRef subsystem if existing Nexus provenance / record identities can serve the same function.

The reusable idea is deterministic resolution from an interpreted claim back to accepted evidence identity.

**Rule:** reuse Canonical / Product Surface identities before introducing another identifier layer.

---

### A5. Resume State → Re-entry Package / Continuation Plan

**Origin:** STATEWAKE  
**Decision:** ADAPT

Nexus should not copy STATEWAKE's Resume State object literally.

The equivalent may be a small projected artifact containing:

- current trusted state;
- what changed;
- invalidated assumptions;
- unresolved ambiguity;
- bounded next action;
- evidence references;
- explicit authorization if required.

It should remain a projection / continuation artifact, not a competing source of canonical truth.

---

### A6. External governed metadata → one source verification adapter

**Origin:** DataHub hackathon build  
**Decision:** ADAPT

The lesson is not "Nexus needs DataHub." The lesson is that continuity sometimes depends on facts outside Nexus.

Phase 6 should therefore validate one real external evidence source, but the product contract must remain provider-neutral.

DataHub, GitHub, Drive, Notion, or another system may be implementation choices. None should define the Nexus core model.

---

### A7. Decision Gate → Human Authority Gate

**Origin:** STATEWAKE  
**Decision:** ADAPT

The Decision Gate is valuable as a pattern, but Nexus already has broader authority concepts.

Future Nexus should use a generic **Human Authority Gate** for consequential ambiguity or mutation rather than importing a STATEWAKE-specific component name and state machine.

---

### A8. Context learning → future evaluation data, not a new Territory

**Origin:** Sideglance future Radar concept  
**Decision:** ADAPT

Sideglance's idea of accumulating context-learning signals is relevant only if it helps Nexus evaluate continuity quality over time.

Do not create a new "context learning" product area. If used, these signals should become evaluation / history records supporting better verification.

---

## 5. IGNORE — ideas that should not enter Nexus core now

### I1. Do not merge the hackathon products into one super-app

**Decision:** IGNORE

Nexus does not need:

- STATEWAKE as a separate embedded app;
- Sideglance Decode inside the Atlas;
- a DataHub-specific workspace as a permanent primary surface.

Their reusable value is architectural knowledge, not feature count.

---

### I2. Do not import competition-required providers as product commitments

**Decision:** IGNORE

Google ADK, Gemini, Vertex AI, Cloud Run, DataHub, Cloudflare Workers, or any other competition stack may remain useful implementations.

They are not Nexus product requirements unless the user problem independently justifies them.

---

### I3. Do not build generalized connectors before proving the loop

**Decision:** IGNORE

A connector catalog can easily become infrastructure work with little evidence that continuity is improved.

Before multi-source expansion, prove one complete loop using one real source.

---

### I4. Do not build a generalized autonomous project manager

**Decision:** IGNORE

Nexus should not expand from continuity infrastructure into "AI that manages everything."

The product thesis is stronger when it governs trusted continuation rather than replacing project management, task management, chat, or agent orchestration wholesale.

---

### I5. Do not make interpretation itself the product

**Decision:** IGNORE

Sideglance succeeds by interpreting ambiguous Internet interactions. Nexus should not inherit that broad interpretation mission.

Model interpretation is a supporting capability for continuity, not Nexus's primary value proposition.

---

### I6. Do not treat map / graph richness as proof of value

**Decision:** IGNORE

The DataHub build reinforced that a compelling architecture and interface can still lack a strong observable outcome.

Additional graph views, routes, territories, and connector visualizations are lower priority than proving one real continuity loop.

---

### I7. Do not optimize Phase 6 for hackathon judging

**Decision:** IGNORE

No requirement should enter Phase 6 merely because it would make a better competition demo.

The governing success metric should be whether Nexus improves a real return-to-work event.

---

## 6. Cross-project synthesis

The three strongest projects converge on one architecture pattern:

```text
Fresh evidence
  → validate sufficiency / validity
  → deterministic structural checks
  → bounded model interpretation
  → inspectable evidence references
  → human authority only when consequential ambiguity remains
  → one bounded writer
  → fresh verification
  → outcome / trusted-state record
```

This is the most important knowledge extracted from the hackathon period.

It suggests that the next Nexus milestone should not be another surface. It should be the first complete continuity transaction.

---

## 7. What Phase 6 should inherit

The harvest authorizes the following concepts for Phase 6 **definition**, not implementation:

1. **Trusted Checkpoint** — a bounded continuation artifact, not a second Graph.
2. **Fresh Verification** — compare prior trusted state against current accepted evidence.
3. **Continuity Validity** — VALID / INVALID / AMBIGUOUS applied only to the continuation point.
4. **Minimum Human Authority Question** — ask only when a consequential protected ambiguity remains.
5. **Deterministic Evidence Resolution** — every important interpreted change should resolve to accepted evidence identity.
6. **Bounded Outcome Write-back** — one writer, explicit authority, version/idempotency protection.
7. **Read-after-write Verification** — do not close the loop until the intended trusted state is observable.
8. **Evaluation Evidence** — record whether the re-entry actually reduced rework / uncertainty rather than only whether the software ran.

These are candidate Phase 6 primitives. Their exact schema, authority, storage and UI contracts remain undefined until the Phase 6 definition audit.

---

## 8. What Phase 6 must not inherit

The harvest explicitly rejects the following as Phase 6 starting scope:

- multi-project expansion;
- generalized connector framework expansion;
- new Territory product surfaces;
- autonomous action execution;
- generic project-management features;
- Sideglance-style social/cultural interpretation;
- DataHub as a mandatory backend;
- Google ADK / Vertex as mandatory runtime;
- new graph visualization work;
- a broad memory system rewrite;
- a second trusted-state database parallel to the Canonical Context Graph.

If one of these later becomes necessary, it requires new evidence and a separate product decision.

---

## 9. The key correction after the DataHub hackathon

The largest lesson is not a missing feature. It is a sequencing correction.

Earlier Nexus development often followed this direction:

```text
architecture
  → generalized contracts
  → multiple surfaces
  → provider integration
  → eventual real loop
```

The next cycle should reverse that priority:

```text
one real return-to-work event
  → fresh evidence
  → validity decision
  → bounded next action
  → verified write-back
  → measured outcome
  → only then generalize
```

This does not invalidate the architecture already built. It gives that architecture a more disciplined next proof target.

---

## 10. Phase 6 product hypothesis

The knowledge harvest reduces the next product question to:

> **Can Nexus take one previously trusted project state, compare it against fresh reality, identify whether continuation is still valid, ask at most one necessary human authority question, produce a bounded continuation plan, verify the resulting state, and measurably reduce the work required to resume?**

If Nexus cannot prove this loop, expanding Territories, connectors, agents, or multi-project support is premature.

If Nexus can prove it, the existing Context and Product Surface architecture has a concrete reason to generalize.

---

## 11. Candidate success evidence for the next cycle

Phase 6 definition should consider measurable evidence such as:

- time from return to first trusted next action;
- number of stale assumptions caught before execution;
- number of unnecessary human clarification questions;
- whether every consequential change has inspectable supporting evidence;
- whether a protected ambiguity is surfaced rather than guessed;
- whether the post-action state can be verified from an authoritative source;
- whether the next re-entry starts from the verified outcome instead of replaying old state;
- whether the user needs less manual reconstruction than without Nexus.

These are product-evaluation candidates, not yet frozen metrics.

---

## 12. Final KEEP / ADAPT / IGNORE table

| Source lesson | Decision | Nexus interpretation |
| --- | --- | --- |
| Validate before Recover | KEEP | Verify previous trusted continuation before resuming |
| Observation ≠ inference ≠ authorization ≠ truth | KEEP | Permanent authority boundary |
| Minimum clarification | KEEP | Ask only the smallest consequential human question |
| Deterministic EvidenceRef | KEEP / ADAPT | Resolve interpreted claims to existing Nexus evidence identities |
| Trusted Working State | ADAPT | Bounded Trusted Checkpoint, not a second Graph |
| VALID / INVALID / AMBIGUOUS | ADAPT | Continuity-point validity only |
| Decision Gate | ADAPT | Generic Human Authority Gate |
| Resume State | ADAPT | Re-entry Package / Continuation Plan projection |
| DataHub ownership/lineage | ADAPT | External verification pattern; provider-neutral core |
| Read-after-write | KEEP | Required for trusted outcome closure |
| Model + deterministic guards | KEEP | Probabilistic interpretation inside structural contracts |
| Full connector catalog | IGNORE | One real source first |
| Hackathon-specific provider stacks | IGNORE | Implementation choices, not core requirements |
| Super-app merger of all projects | IGNORE | Extract principles, not product surfaces |
| More map / graph visualization | IGNORE | No expansion before real-loop proof |
| Generic autonomous PM agent | IGNORE | Outside continuity thesis |

---

## 13. Governing rule after the harvest

> **Keep the epistemic discipline. Adapt the state-machine ideas. Ignore the competition scaffolding.**

And for product sequencing:

> **Prove one real continuity loop before Nexus earns the right to become broader.**

This document should be treated as the bridge between Phase 5 closure and Phase 6 definition. It does not itself start Phase 6 or authorize runtime changes.
