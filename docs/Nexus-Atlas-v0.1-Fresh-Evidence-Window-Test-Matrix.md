# Nexus Atlas v0.1 — Fresh Evidence Window Test Matrix

**Status:** Blocking Phase 6C matrix  
**Scope:** bounded GitHub commit-range proof + Fresh Evidence Window only

## A. Commit Range Proof — contract and input

1. normalized repository ref accepted;
2. malformed repository ref rejected;
3. base SHA must be exact lowercase 40-char SHA;
4. head SHA must be exact lowercase 40-char SHA;
5. capturedAt must be strict offset ISO;
6. limit must be a positive bounded integer no greater than 20;
7. reader requires injected read-only compare client;
8. provider response field set is exact;
9. duplicate commit SHAs rejected;
10. unsafe / multiline commit headline rejected.

## B. Commit Range Proof — relation semantics

11. identical requires ahead=0 and behind=0;
12. identical requires zero commits and no continuation;
13. ahead requires ahead>0 and behind=0;
14. behind requires ahead=0 and behind>0;
15. behind exposes no head-side commits;
16. diverged requires ahead>0 and behind>0;
17. complete ahead proof contains exactly aheadBy commits;
18. complete diverged proof contains exactly aheadBy head-side commits;
19. complete head-side range terminates at requested head SHA;
20. incomplete bounded range declares continuationAvailable=true;
21. ancestry order returned by compare client is preserved even when commit timestamps are non-monotonic;
22. identical normalized provider results produce identical proof identity.

## C. Fresh Evidence Window — scope and cursor binding

23. accepted Trusted Checkpoint validator is reused;
24. accepted GitHub Source Snapshot validator is reused;
25. policy projectRef must bind checkpoint projectRef;
26. policy repository must bind checkpoint cursor scope;
27. policy repository must bind Snapshot scope;
28. cursor provider must be github;
29. cursor type must be default-branch-head;
30. Snapshot capture must be newer than cursor capture;
31. cross-repository input blocks as evidence-scope-violation.

## D. Fresh Evidence Window — completeness

32. identical Snapshot head produces complete window without range proof;
33. identical window contains zero commit-change records;
34. changed head without proof blocks as required-evidence-missing;
35. proof base mismatch blocks as evidence-invalid;
36. proof head mismatch blocks as evidence-invalid;
37. incomplete proof blocks as evidence-window-incomplete;
38. complete ahead proof produces complete window;
39. complete behind proof produces complete window with lineage=behind;
40. complete diverged proof produces complete window with lineage=diverged;
41. blocked window exposes assessmentAllowed=false;
42. complete window exposes assessmentAllowed=true.

## E. Evidence projection and safety

43. repository evidence preserves source identity and authority;
44. branch evidence preserves source identity and current head;
45. commit evidence preserves proof identity, authority and ancestry order;
46. records do not contain token/credential/body/comments/reviews/authorEmail;
47. source-local authority is not promoted to human/canonical authority;
48. window builder performs no source transport;
49. window builder performs no Canonical Admission or Graph mutation;
50. window builder performs no persistent writes;
51. window inputs remain unchanged;
52. proof inputs remain unchanged;
53. accepted proof output is deeply immutable;
54. accepted window output is deeply immutable;
55. identical accepted inputs produce identical window identity and ordering.

## F. Regression boundary

56. Phase 6B dedicated acceptance remains green;
57. Phase 5 Acceptance remains green;
58. Phase 4 Acceptance remains green;
59. frozen Phase 4 GitHub adapter / Source Snapshot validator are unchanged;
60. no browser/UI files are modified by this slice.
