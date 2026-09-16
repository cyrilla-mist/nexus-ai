# Nexus Atlas v0.1 — Write-back Management Surface Test Matrix

**Status:** Binding Phase 7G acceptance matrix  
**Parent:** Phase 7 — Outcome / Trusted-State Write-back Generalization

## A. Management surface contract

1. accepted target validates through the frozen Phase 7B target validator;
2. accepted write-back policy validates through the frozen Phase 7B policy validator;
3. accepted retention policy validates through the frozen Phase 7D retention validator;
4. Outcome history page must be `outcome-record` for the requested project;
5. Checkpoint history page must be `trusted-checkpoint` for the requested project;
6. both history pages must bind the supplied retention policy;
7. management surface identity deterministically binds normalized projected content;
8. repeated equivalent inputs produce the same surface identity;
9. output is deeply immutable;
10. builder does not mutate upstream inputs.

## B. Read-only capability boundary

11. `readOnly=true`;
12. `writeAllowed=false`;
13. `deleteAllowed=false`;
14. `productionProvisioningAllowed=false`;
15. `canonicalContextWriteAllowed=false`;
16. target summary exposes logical provider kind/capabilities only;
17. target summary does not expose credentials, local paths, D1 identifiers or transport payloads;
18. management surface exposes no write/delete action descriptors;
19. management surface does not grant checkpoint advancement authority;
20. management surface does not reinterpret Cross-source Verification as a durable Outcome.

## C. Bounded history projection

21. Outcome summary exposes only outcome ref, verification state, recorded time and action ref;
22. Outcome summary omits observed postcondition payloads and raw evidence;
23. Checkpoint summary exposes only checkpoint ref, version, created time and next-action ref;
24. Checkpoint summary omits trusted direction, objective and full provenance payloads;
25. history page truncation/continuation metadata is preserved;
26. retain-all policy remains visible;
27. all three Outcome verification states remain retained;
28. checkpoint history retention remains enabled;
29. deletion remains prohibited;
30. history projection never broadens the source history page scope.

## D. Cross-source verification summary

31. accepted Phase 7F artifacts are validated before projection;
32. verification state counts preserve `verified`, `failed`, `indeterminate` exactly;
33. provider/profile counts are deterministic;
34. duplicate verification identities fail closed;
35. verification from another project fails closed;
36. Cross-source Verification evidence payloads are not copied into the surface;
37. Human Authority is not inferred from source verification;
38. Canonical Admission authority is not inferred from source verification.

## E. Multi-project isolation proof

39. `project:nexus-atlas` and `project:phase7g-reference` may coexist in one explicit allowlist;
40. second project is synthetic acceptance data only;
41. Outcome histories remain isolated by project;
42. Checkpoint histories remain isolated by project;
43. project A history cannot construct project B surface;
44. project B history cannot construct project A surface;
45. project A verification cannot appear in project B summary;
46. project B verification cannot appear in project A summary;
47. project omitted from write-back policy fails closed;
48. project omitted from retention policy fails closed;
49. policy targeting another Writeback Target fails closed;
50. history bound to another retention policy fails closed.

## F. Regression and scope

51. Phase 7F Cross-source Verification regression remains green;
52. Phase 7E Outcome Category regression remains green;
53. Phase 7D History / Retention regression remains green;
54. Phase 7C D1 durable adapter regression remains green;
55. Phase 7B target/policy regression remains green;
56. Phase 6B checkpoint persistence regression remains green;
57. Phase 6C fresh evidence / assessment regression remains green;
58. Phase 6D Human Authority / Re-entry regression remains green;
59. Phase 6E Outcome Verification regression remains green;
60. Phase 6F Continuity Closure regression remains green;
61. Phase 5 frozen acceptance remains green;
62. Phase 4 frozen acceptance remains green;
63. changed scope is limited to the Phase 7G runtime, tests, contract, matrix and workflow;
64. no browser/UI files are modified;
65. no Cloudflare production resource is provisioned;
66. no real second project or external system is mutated.

## Acceptance decision

Phase 7G is accepted only when the dedicated suite, bounded-scope guard and all listed regressions pass on the exact PR head. Passing Phase 7G authorizes **7H — Final Acceptance** only.