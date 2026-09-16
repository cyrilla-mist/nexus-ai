# Nexus Atlas — Phase 7 Entry Audit Acceptance Matrix

**Status:** Binding 7A audit acceptance matrix  
**Baseline:** Phase 6 Complete / Accepted  
**Scope:** write-back generalization entry only

---

## A. Existing write-back semantics

1. Outcome store remains append-only by Outcome identity.
2. Outcome idempotency replay returns the prior accepted artifact rather than duplicating it.
3. Outcome idempotency-key/content conflict fails closed.
4. Trusted Checkpoint store remains versioned from 1 with contiguous versions.
5. Checkpoint write requires expected-version compare-and-swap.
6. Checkpoint replay is idempotent for identical content.
7. Checkpoint idempotency-key/content conflict fails closed.
8. Both stores enforce explicit project allowlists.
9. Both stores validate accepted artifact schemas before persistence.
10. Durable writes retain exact read-after-write verification.

## B. Closure semantics frozen

11. Failed Outcome cannot advance trusted state.
12. Indeterminate Outcome cannot advance trusted state.
13. Verified Outcome still requires `nextCheckpointAllowed=true`.
14. Checkpoint advancement remains exactly version + 1.
15. Outcome is written before checkpoint advancement.
16. Outcome persistence alone does not imply closure success.
17. Closure receipt requires exact Outcome read-back.
18. Closure receipt requires exact next-checkpoint read-back.
19. No closure receipt is emitted after partial write failure.
20. Retry may replay a previously written Outcome without duplicating it.

## C. Generalization boundaries

21. Phase 7 must not move or rename frozen Phase 6 runtime files in 7A.
22. Phase 7 must not modify Phase 4 Source Adapter semantics in 7A.
23. Phase 7 must not modify Phase 5 Product Surface semantics in 7A.
24. Phase 7 must not claim GitHub verification is already provider-neutral.
25. Phase 7 must not choose a new database/provider in 7A.
26. Phase 7 must not add credential or secret handling in 7A.
27. Phase 7 must not add Canonical Context write-back in 7A.
28. Phase 7 must not add browser/UI files in 7A.
29. Provider metadata must never become fresh evidence or Human Authority.
30. Provider-specific paths/connection identifiers must stay out of public write-back artifacts.

## D. 7B entry contract

31. Next slice defines a deterministic Writeback Target descriptor.
32. Target identity excludes credentials and machine-local paths.
33. Next slice defines an explicit Writeback Policy validator.
34. Policy binds project scope to one configured target.
35. Policy declares allowed artifact kinds.
36. Capability gate requires project-scope enforcement.
37. Capability gate requires idempotent Outcome append.
38. Capability gate requires checkpoint compare-and-swap.
39. Capability gate requires exact read-after-write.
40. Missing mandatory capability fails closed rather than downgrading guarantees.
41. Accepted Phase 6 stores may be wrapped as a reference target without semantic changes.
42. Target/policy outputs are deterministic and deeply immutable.
43. Target/policy inputs are not mutated.
44. All Phase 6B–6F, Phase 5 and Phase 4 regressions remain green.

---

## Acceptance decision

7A is accepted only when the audit document and this matrix are present, changed scope is limited to 7A documentation/workflow files, and the frozen Phase 6B–6F plus Phase 5 / Phase 4 regression suites remain green.

Passing 7A authorizes **7B — Write-back Target + Policy Gate** only.