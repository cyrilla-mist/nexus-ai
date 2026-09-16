# Nexus Atlas v0.1 — Cloudflare D1 Write-back Test Matrix

**Status:** Binding Phase 7C matrix

## A. Provider / schema boundary

1. schema initialization is explicit
2. schema defines separate Outcome / Outcome receipt tables
3. schema defines separate Checkpoint / Checkpoint receipt tables
4. D1 target providerKind is `cloudflare-d1`
5. D1 target durability is `durable`
6. D1 target advertises Outcome + Trusted Checkpoint artifact kinds
7. D1 target advertises all mandatory Phase 7B capabilities
8. public target contains no D1 database identity
9. public target contains no binding identity
10. D1 target passes Phase 7B policy/capability gate
11. every runtime session begins with `first-primary`

## B. Outcome persistence

12. accepted failed Outcome may be durably appended
13. exact Outcome read-back equals accepted normalized artifact
14. same idempotency key + same Outcome returns replay
15. same idempotency key + different Outcome fails `IDEMPOTENCY_CONFLICT`
16. same Outcome identity under another idempotency key is rejected
17. project allowlist blocks out-of-scope Outcome read
18. invalid Outcome is rejected before persistence
19. failed D1 batch does not leave a partial Outcome row/receipt pair
20. Outcome read validates stored JSON against frozen validator
21. Outcome read validates stored digest binding

## C. Trusted Checkpoint persistence

22. initial checkpoint writes only at expectedVersion 0
23. exact latest read-back equals accepted normalized checkpoint
24. identical checkpoint/idempotency replay succeeds
25. stale expectedVersion fails `CHECKPOINT_VERSION_CONFLICT`
26. checkpoint version must advance exactly one
27. checkpoint idempotency conflict fails closed
28. duplicate checkpoint identity without matching receipt is rejected by accepted version/identity rules
29. valid v2 checkpoint becomes latest
30. project allowlist blocks out-of-scope checkpoint read
31. invalid checkpoint is rejected before persistence
32. failed D1 batch leaves latest trusted checkpoint unchanged
33. checkpoint read validates stored JSON against frozen validator
34. checkpoint read validates stored digest/version binding

## D. Consistency / safety

35. Outcome row and receipt are written in one D1 batch
36. Checkpoint row and receipt are written in one D1 batch
37. exact read-after-write occurs after accepted batch
38. race recovery may return only a proven identical replay
39. race recovery may not silently overwrite a newer checkpoint
40. Outcome and Checkpoint remain separate semantic stores
41. v0.1 exposes no delete lifecycle operation
42. v0.1 exposes no update/mutation lifecycle operation
43. adapter does not write Canonical Context
44. adapter does not produce source evidence or Human Authority
45. no `wrangler.toml` production D1 binding is added in 7C
46. no secrets/credentials are added
47. no browser/UI files are modified

## E. Regression

48. Phase 7B target/policy acceptance remains green
49. Phase 6B checkpoint persistence remains green
50. Phase 6C fresh evidence/assessment remains green
51. Phase 6D Human Authority/Re-entry remains green
52. Phase 6E Outcome Verification remains green
53. Phase 6F Continuity Closure remains green
54. Phase 5 frozen regression remains green
55. Phase 4 frozen regression remains green
