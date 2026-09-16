# Nexus Atlas v0.1 — Write-back Target + Policy Test Matrix

**Status:** Binding Phase 7B matrix

## A. Target contract

1. deterministic target identity
2. canonical artifact kind order
3. deeply immutable output
4. input not mutated
5. path-shaped providerKind rejected
6. credential/URL-shaped providerKind rejected
7. tampered targetId rejected
8. insufficient capability descriptor remains structurally valid for fail-closed gate testing

## B. Policy contract

9. deterministic policy identity
10. canonical project order
11. canonical artifact order
12. deeply immutable output
13. input not mutated
14. verified-Outcome requirement cannot be disabled
15. exact read-after-write requirement cannot be disabled
16. tampered policyId rejected
17. empty project scope rejected
18. duplicate project scope rejected

## C. Capability gate

19. matching target/policy binds deterministically
20. binding validates and is deeply immutable
21. target/policy identity mismatch fails closed
22. policy artifact unsupported by target fails closed
23. missing project-scope enforcement fails closed
24. missing idempotent Outcome append fails closed
25. missing checkpoint CAS fails closed
26. missing exact read-after-write fails closed
27. Outcome policy requires appendOutcome + readOutcome
28. Checkpoint policy requires writeCheckpoint + readLatest
29. Outcome-only policy need not receive checkpoint store object
30. Checkpoint-only policy need not receive Outcome store object

## D. Phase 6 reference adapters

31. in-memory reference target uses logical provider kind
32. in-memory stores enforce configured project allowlist
33. file reference target uses durable logical provider kind
34. file target descriptor exposes no local path
35. file target identity is independent of local path choice
36. one shared file path for both semantic stores is rejected
37. reference target supports Outcome + Trusted Checkpoint artifacts
38. reference target declares every frozen storage capability

## E. Safety / regression

39. no Phase 6 runtime file is modified for 7B convenience
40. no Phase 4 source runtime is modified
41. no Phase 5 product-surface runtime is modified
42. no browser/UI files are modified
43. no credentials/secrets are added
44. target/policy/binding artifacts do not become source evidence or Human Authority
45. Phase 6B checkpoint tests green
46. Phase 6C fresh evidence/assessment tests green
47. Phase 6D authority/re-entry tests green
48. Phase 6E outcome tests green
49. Phase 6F closure tests green
50. Phase 5 frozen regression green
51. Phase 4 frozen regression green
