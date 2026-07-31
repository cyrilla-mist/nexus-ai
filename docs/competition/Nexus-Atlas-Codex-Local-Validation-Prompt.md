# Nexus Atlas — Codex Local Validation and Repair Prompt

Copy the complete instruction below into Codex while the local repository is available.

---

## Codex task

You are validating and repairing the Nexus Atlas hackathon implementation on the project owner's Windows computer.

### Repository

```text
C:\Users\Lenovo\Documents\nexus-ai
```

### Remote repository

```text
cyrilla-mist/nexus-ai
```

### Source branch

```text
agent/nexus-atlas-architecture-review-v1
```

This branch is the top of a stacked Draft PR chain and contains the current architecture and submission baseline.

Create and work on a new branch:

```text
agent/nexus-atlas-runtime-validation
```

Do not commit directly to `main`. Do not merge any pull request. Do not rewrite branch history.

---

# 1. Non-negotiable constraints

1. Preserve the frozen product hierarchy:

   ```text
   Atlas Desk
     → Atlas Map
     → Territory Workspace
     → Record / Decision / Agent / Action
     → Outcome and Context Write-back
   ```

2. Preserve these boundaries:

   ```text
   Nexus
   project history · decisions · memories · goals · actions

   DataHub
   governed assets · ownership · lineage · metadata state
   ```

3. Do not turn DataHub into the canonical store for the complete personal Context Graph.
4. Do not replace the provider-neutral Continuity architecture with Verity-specific UI branches.
5. Do not expose an arbitrary MCP proxy.
6. Do not broaden the mutation bridge beyond the allow-listed `add_owners` operation for the exact Verity Benchmark asset.
7. Do not remove explicit human confirmation.
8. Do not treat a successful mutation response as proof. A fresh DataHub read must verify the intended owner.
9. Do not treat an unavailable source as missing ownership.
10. Never print, commit, screenshot, or return API keys, DataHub tokens, MCP credentials, private identifiers, `.dev.vars`, or environment-variable values.
11. Do not fabricate runtime evidence, screenshots, test results, DataHub responses, or the `Missing Ownership 1 → 0` transition.
12. Make the smallest architecture-compatible repair. Avoid unrelated refactors and visual redesigns.

Read these files before modifying code:

```text
README.md
docs/Nexus-Atlas-Architecture-Review-v1.0.md
docs/Nexus-Atlas-Implementation-Audit-2026-07-31.md
docs/Nexus-DataHub-Verity-Assets.md
docs/architecture/README.md
docs/competition/README.md
examples/README.md
```

---

# 2. Phase A — Repository safety and branch setup

Run from PowerShell:

```powershell
Set-Location "C:\Users\Lenovo\Documents\nexus-ai"
git status --short --branch
git remote -v
git fetch --all --prune
```

If there are uncommitted user changes, do not overwrite, discard, reset, or stash them automatically. Stop and report the exact changed paths.

Otherwise:

```powershell
git checkout agent/nexus-atlas-architecture-review-v1
git pull --ff-only origin agent/nexus-atlas-architecture-review-v1
git checkout -b agent/nexus-atlas-runtime-validation
```

Confirm:

```powershell
git status --short --branch
git log --oneline --decorate -8
git merge-base --is-ancestor origin/agent/nexus-atlas-architecture-review-v1 HEAD
```

Record the starting commit SHA in the final report.

---

# 3. Phase B — Static checks and automated tests

Confirm tool versions:

```powershell
node --version
npm --version
python --version
git --version
```

Install dependencies without changing dependency versions unless required to fix a demonstrated problem:

```powershell
npm install
```

Run each command separately and preserve its exit code and relevant output:

```powershell
npm test
npm run check
npm run verify:multiturn
npm run verify:atlas
npm run verify:verity-continuity
npm run verify:verity-datahub
npm run verify:verity-ingestion
npm run datahub:verity:dry-run
npx wrangler deploy --dry-run
```

Also validate repository examples as JSON:

```powershell
Get-Content examples\verity-reentry-summary.json -Raw | ConvertFrom-Json | Out-Null
Get-Content examples\context-repair-event.json -Raw | ConvertFrom-Json | Out-Null
Get-Content examples\context-package.json -Raw | ConvertFrom-Json | Out-Null
```

For every failure:

1. identify the exact command and first meaningful error;
2. identify whether it is code, configuration, dependency, environment, or documentation;
3. apply the smallest justified fix;
4. add or update a focused regression test when applicable;
5. rerun the failed command;
6. rerun all related checks;
7. do not claim success until the command exits successfully.

Do not weaken tests merely to make them pass.

---

# 4. Phase C — Fixture demo browser validation

Start a local static server from the repository root:

```powershell
python -m http.server 8000
```

Open and inspect:

```text
http://localhost:8000/atlas.html
http://localhost:8000/reentry.html?scenario=verity#brief
```

Validate at desktop and narrow/mobile widths:

- Atlas Desk loads without console errors.
- Atlas Map shows the intended task route rather than decorative random links.
- Verity is presented as a Hero Scenario, not the entire Nexus identity.
- Re-entry counts are deterministic and internally consistent.
- The UI distinguishes Continue, Verify, Repair, and Act.
- Agent Conflict preserves both recommendations and records the human choice.
- Confirmation Sheet displays target, current state, proposed state, authority, and verification method.
- Fixture mode does not imply that a real DataHub mutation occurred.
- Keyboard focus is visible.
- Escape/cancel closes a confirmation without mutation.
- Retry does not duplicate actions or audit events.
- No personal file paths, secrets, tokens, or unrelated project data appear in the browser or console.

Capture console errors and screenshots only after checking that they contain no private information.

---

# 5. Phase D — Local DataHub and MCP prerequisites

Inspect the computer for an existing local DataHub OSS installation and DataHub MCP configuration.

Do not invent credentials. Do not commit local configuration. Do not install or reset a DataHub instance destructively without explicit user approval.

Confirm whether these are available:

- DataHub frontend/API, normally on `http://localhost:8080`;
- DataHub MCP Server and its required configuration;
- Python dependencies required by `datahub/scripts/ingest_verity_assets.py`;
- a valid DataHub user or group URN to use as the proposed owner.

If a prerequisite is unavailable, stop this phase and report exactly what is missing and the smallest user action required. Continue with all validation that does not require the missing component.

Never report the owner URN or token value in public evidence. A sanitized placeholder is sufficient in documentation.

---

# 6. Phase E — Ingest the governed Verity assets

First inspect the dry run:

```powershell
npm run datahub:verity:dry-run
```

Confirm the plan contains exactly these six stable governed assets:

```text
verity_evaluation_rubric
verity_test_materials
verity_benchmark_v1
verity_scoring_calibration
verity_evaluation_results_v047
verity_release_readiness_evidence
```

Confirm that Benchmark v1 is planned with no owner and has both the Evaluation Rubric and Test Materials as direct upstream assets.

When DataHub is confirmed available, apply ingestion using the repository-supported command:

```powershell
python datahub/scripts/ingest_verity_assets.py --server http://localhost:8080 --apply
```

For authenticated DataHub, use `DATAHUB_TOKEN` only through the environment. Do not echo it.

After ingestion, verify in DataHub or through supported reads:

- all six URNs exist;
- the expected names and descriptions are present;
- the lineage chain is correct;
- Benchmark v1 has no owner before repair;
- no unrelated metadata was altered.

If rerunning ingestion is intended to be idempotent, verify that a second run does not create duplicate assets or relationships.

---

# 7. Phase F — Start the read and mutation bridges

Use separate PowerShell terminals.

## Read-only bridge

```powershell
npm run datahub:verity:bridge
```

Expected endpoints:

```text
http://127.0.0.1:8790/health
http://127.0.0.1:8790/api/continuity/reentry
```

Validate:

- process binds to loopback only;
- health endpoint succeeds;
- only intended methods are accepted;
- six exact allow-listed asset URNs are read;
- Benchmark lineage is verified;
- unavailable DataHub returns a source-unavailable state, not Missing Ownership;
- no arbitrary MCP tools are exposed to the browser.

## Isolated mutation bridge

Set the intended owner through the environment without printing it:

```powershell
$env:NEXUS_VERITY_OWNER_URN="urn:li:corpuser:REPLACE_WITH_REAL_LOCAL_USER"
```

Then start:

```powershell
npm run datahub:verity:ownership-bridge
```

Expected endpoint:

```text
http://127.0.0.1:8791/api/context/repair/benchmark-owner
```

Validate:

- GET returns only the exact proposal and does not mutate;
- POST rejects requests without explicit confirmation;
- POST rejects a different operation;
- POST rejects a different target asset;
- POST rejects browser-supplied arbitrary owner values;
- the bridge calls only `add_owners`;
- no credentials are returned to the browser;
- lineage, schema, quality, tags, descriptions, and domains cannot be changed through this endpoint.

---

# 8. Phase G — Verify the real Ownership `1 → 0` flow

Open the governed workspace:

```text
http://localhost:8000/reentry.html?source=datahub&bridge=http%3A%2F%2F127.0.0.1%3A8790%2Fapi%2Fcontinuity%2Freentry&mutationBridge=http%3A%2F%2F127.0.0.1%3A8791%2Fapi%2Fcontext%2Frepair%2Fbenchmark-owner#evidence
```

Before mutation, verify from a fresh DataHub-backed read:

```text
Missing Ownership: 1
Benchmark owner: none
Source state: available
Benchmark lineage: valid
```

Open the Confirmation Sheet and verify it displays:

- exact Benchmark URN;
- `add_owners` operation;
- current owner state;
- proposed owner type and sanitized identity;
- post-write verification method;
- explicit confirmation control;
- cancel control.

Test cancel first. Confirm no DataHub mutation occurs and the signal stays open.

Then perform the confirmed repair once.

The only acceptable success sequence is:

```text
GET proposal
→ explicit human confirmation
→ POST allow-listed add_owners
→ fresh read-only DataHub MCP read
→ intended owner observed
→ Missing Ownership changes from 1 to 0
→ repair task changes to completed
→ ContextRepairEvent recorded once
```

A mutation response without a matching fresh read is a failed verification. In that case:

- keep Missing Ownership open;
- do not record a successful ContextRepairEvent;
- show a clear recoverable error;
- preserve retry safety.

After success, refresh the page and verify the resolved state remains consistent with the live DataHub source.

Also verify that retrying or double-clicking does not create duplicate owner entries or duplicate successful events.

---

# 9. Phase H — Context Package and Outcome Write-back

Inspect the frozen architecture and the sample contract in:

```text
examples/context-package.json
```

Implement the smallest formal Context Package handoff from Re-entry into the continuing Verity workspace, provided it can be done without inventing a new product hierarchy.

The handoff should include at minimum:

- project identity;
- current milestone;
- inherited valid decisions;
- unresolved verification or repair items;
- selected route;
- recommended next actions;
- source and provenance summary;
- generated-at timestamp or deterministic equivalent;
- authority and state fields.

Requirements:

- the receiving workspace must consume the package rather than reconstructing the same context independently;
- the package must not contain secrets or complete raw DataHub responses;
- fixture and live providers must normalize into the same package shape;
- add focused tests for the contract and handoff.

For Outcome Write-back, first inspect the architecture and existing execution/memory foundations.

Implement only a narrow, truthful outcome contract if the repository already provides a safe destination. The minimum acceptable outcome contains:

- action performed;
- result state;
- verification status;
- affected Context references;
- provenance;
- timestamp;
- whether it is durable or session-local.

Do not describe session-local state as durable. If durable storage is not available, keep the implementation explicitly session-local and update README/Devpost wording accordingly instead of pretending persistence exists.

---

# 10. Phase I — Runtime evidence

Create a local evidence directory that contains only sanitized material:

```text
artifacts/runtime-validation/2026-07-31/
```

Recommended files:

```text
00-environment.md
01-test-results.md
02-fixture-browser-checklist.md
03-datahub-ingestion-summary.md
04-live-read-before.json
05-mutation-proposal.json
06-mutation-result-sanitized.json
07-live-read-after.json
08-browser-interaction-checklist.md
09-final-status.md
screenshots/
```

Rules:

- redact tokens, credentials, owner identities, local usernames, and private paths;
- preserve exact asset identifiers only when they are already public synthetic URNs;
- label fixture evidence and verified runtime evidence separately;
- do not commit screenshots or logs until they have been manually privacy-reviewed;
- JSON evidence must be valid JSON;
- record exact commands and exit codes;
- record failures as well as successes.

Only after a real fresh read confirms the intended owner may evidence state:

```text
VERIFIED RUNTIME
Missing Ownership: 1 → 0
```

---

# 11. Phase J — Final regression run

After fixes, rerun:

```powershell
npm test
npm run check
npm run verify:multiturn
npm run verify:atlas
npm run verify:verity-continuity
npm run verify:verity-datahub
npm run verify:verity-ingestion
npm run datahub:verity:dry-run
npx wrangler deploy --dry-run
```

Repeat the fixture browser check and the live DataHub flow where available.

Check:

```powershell
git status --short
git diff --check
git diff --stat origin/agent/nexus-atlas-architecture-review-v1...HEAD
```

Review all changed files for secrets and unrelated modifications.

---

# 12. Commit and push policy

Use small, descriptive commits. Suggested grouping:

```text
fix: resolve local validation failures
fix: harden DataHub bridge runtime compatibility
feat: wire verified Context Package handoff
test: cover governed repair and handoff contracts
docs: record sanitized runtime validation status
```

Do not amend or squash existing stacked commits.

Push only the new branch:

```powershell
git push -u origin agent/nexus-atlas-runtime-validation
```

If GitHub CLI authentication is available, create a Draft PR with:

```text
base: agent/nexus-atlas-architecture-review-v1
head: agent/nexus-atlas-runtime-validation
```

Suggested title:

```text
fix: validate Nexus Atlas runtime and DataHub repair flow
```

Do not merge the PR and do not retarget it to `main`.

---

# 13. Required final report

Return a structured report with these headings:

## Branch and environment

- starting SHA;
- final SHA;
- branch name;
- Node, npm, Python, Git versions;
- DataHub and MCP availability.

## Automated checks

For every command:

- command;
- pass/fail;
- exit code;
- meaningful error or result.

## Fixture validation

- pages tested;
- browser sizes;
- console errors;
- keyboard/cancel/retry findings.

## DataHub validation

- six assets ingested: yes/no;
- expected lineage verified: yes/no;
- initial missing owner verified: yes/no;
- `add_owners` executed: yes/no;
- fresh re-read verified intended owner: yes/no;
- Missing Ownership `1 → 0`: verified/not verified;
- duplicate protection: pass/fail;
- source-unavailable behavior: pass/fail.

## Context continuation

- Context Package handoff: implemented/partial/not implemented;
- Outcome Write-back: durable/session-local/not implemented;
- exact truthful limitations.

## Files changed

List every modified or added file and explain why.

## Commits and PR

- commit list;
- pushed branch;
- Draft PR URL, if created.

## Remaining blockers

List only concrete unresolved issues. Do not state that the system is end-to-end complete unless every required live verification actually passed.

---

# Success definition

The task is complete only when the final report truthfully distinguishes one of these states:

### State A — Fully verified runtime

- tests pass;
- six DataHub assets exist;
- lineage is correct;
- live MCP read succeeds;
- confirmed `add_owners` succeeds;
- fresh re-read observes the intended owner;
- Missing Ownership changes from `1` to `0`;
- one verified ContextRepairEvent is recorded;
- Context Package handoff works;
- limitations are accurately documented.

### State B — Partially verified

Some local or DataHub prerequisite is missing or a runtime incompatibility remains. All available checks have been completed, evidence is preserved, no result is fabricated, and the exact next action is documented.

Both states are acceptable reports. Fabricated State A is not acceptable.
