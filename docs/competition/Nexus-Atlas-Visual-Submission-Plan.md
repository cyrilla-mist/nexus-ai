# Nexus Atlas Visual Submission Plan

This document defines the cover, screenshots, README images, and video thumbnail needed for the hackathon submission. It does not require final runtime capture yet.

## 1. Visual goal

The visual package must communicate three ideas immediately:

1. Nexus restores interrupted project context.
2. Nexus shows a clear route from evidence to decision and action.
3. DataHub provides governed ownership and lineage context.

The submission should feel like a contemporary working atlas: structured, calm, traceable, and credible.

Avoid:

- purple-blue neon;
- space or star-map imagery;
- decorative graph nodes;
- generic AI robot imagery;
- large amounts of tiny interface text;
- fake terminal output;
- screenshots that reveal local paths, tokens, usernames, or private tabs.

## 2. Core message hierarchy

Use the same hierarchy across the Devpost cover, README hero, video thumbnail, and opening video frame.

```text
Nexus Atlas
Restore context. Trace decisions. Continue the work.
Personal intelligence infrastructure for long-term context continuity.
```

The first two lines should remain readable at thumbnail size. The third line is optional on small images.

## 3. Devpost cover

### Working canvas

Create a 16:9 master image at `1600 × 900` or larger. Keep important text away from the outer edges so the image remains usable if the platform crops it.

### Composition

```text
Top-left
Nexus Atlas
Restore context. Trace decisions. Continue the work.

Center / right
A simplified real Context Route:
Rubric → Benchmark → Calibration → Results → Release Evidence

Lower-left
Verity Re-entry · DataHub ownership and lineage

Lower-right
Small status marks:
4 changes · 4 valid decisions · 2 stale · 1 conflict · 1 missing owner
```

### Required visual language

- light paper or dark archival-workbench surface;
- restrained grid or coordinate marks;
- one clearly highlighted active route;
- real relationship arrows;
- small labels such as `CONFIRMED`, `STALE`, and `REQUIRES REVIEW`;
- no fake product UI if the screenshot is not yet available.

### Cover copy

Primary:

```text
Nexus Atlas
Restore context. Trace decisions. Continue the work.
```

Optional technical line:

```text
Context continuity with governed DataHub ownership and lineage.
```

## 4. README hero image

The README hero can reuse the Devpost cover, but should prioritize product explanation over competition branding.

Recommended content:

```text
Atlas Desk → Atlas Map → Re-entry Workspace
             ↓
     DataHub ownership and lineage
             ↓
Human confirmation → verified repair → next action
```

Do not place Devpost logos, prize language, or unsupported claims in the permanent README hero.

## 5. Required screenshot set

Capture the following images only after the target branch is running. Use a clean browser window, hide bookmarks, close unrelated tabs, and use synthetic identifiers.

### Screenshot 1 — Atlas Desk

**Purpose:** establish that Nexus starts from work requiring context, not a blank chat.

Must show:

- Verity project name;
- `Needs Re-entry` state;
- twenty-one-day interruption;
- current milestone;
- meaningful-change and broken-context summary;
- Territory context.

Suggested caption:

> Atlas Desk identifies the project route that needs context before work continues.

### Screenshot 2 — Atlas Map

**Purpose:** explain the route-first map model.

Must show:

- Evaluation Rubric;
- Test Materials;
- Benchmark v1;
- Scoring Calibration;
- Evaluation Results;
- Release Readiness Evidence;
- visible, real stored relations;
- selected Benchmark asset or route.

Suggested caption:

> Atlas Map shows the context route required for the current decision rather than the complete graph.

### Screenshot 3 — Re-entry Brief

**Purpose:** display the core deterministic result.

Must show clearly:

```text
4 Meaningful Changes
4 Valid Decisions
2 Stale Evidence Records
1 Agent Conflict
1 Missing Owner
```

Suggested caption:

> Nexus separates context that can be inherited from context that must be verified or repaired.

### Screenshot 4 — Agent Conflict

**Purpose:** show that Agent disagreement is preserved and governed.

Must show:

- Feature Expansion recommendation;
- Evaluation Reliability recommendation;
- Benchmark-first confirmed decision;
- human confirmation control;
- audit or decision state after confirmation.

Suggested caption:

> Conflicting recommendations remain traceable; the user confirms which route continues.

### Screenshot 5 — DataHub Context Inspector

**Purpose:** prove the DataHub integration has project meaning.

Must show:

- DataHub as source;
- exact Benchmark asset reference or sanitized URN;
- current owners;
- expected upstream lineage;
- Missing Ownership rule;
- impact on the route.

Suggested caption:

> DataHub ownership and lineage become actionable project context inside Nexus.

### Screenshot 6 — Atlas Confirmation Sheet

**Purpose:** show the human-governed write boundary.

Must show:

- operation: `add_owners`;
- exact target;
- current owners;
- proposed owner;
- verification contract;
- Cancel and Confirm controls.

Suggested caption:

> Consequential metadata changes require an exact proposal and explicit human approval.

### Screenshot 7 — Verified repair

**Purpose:** prove the end-to-end governed action.

Capture only after a real successful local run.

Must show:

```text
Missing Ownership: 0
WRITE VERIFIED
ContextRepairEvent
```

The screenshot should also make it clear that a fresh DataHub read returned the intended owner.

Suggested caption:

> Nexus closes the signal only after DataHub returns the intended owner on a verified re-read.

### Screenshot 8 — Continue the Work

**Purpose:** show that re-entry leads to action rather than stopping at a summary.

Must show:

- Build Benchmark v1 validation set;
- re-run older samples;
- calibrate v1.0 scoring thresholds;
- Context Package or continuing-workspace entry when implemented.

Suggested caption:

> Restored context becomes a trusted next-action route.

## 6. Screenshot priority

If Devpost space is limited, use these five first:

1. Atlas Desk
2. Atlas Map
3. Re-entry Brief
4. Confirmation Sheet
5. Verified repair

Agent Conflict and Continue the Work can remain in the video or README.

## 7. Before-and-after comparison image

Create one combined image after real runtime verification.

### Left side

```text
BEFORE
Benchmark v1
Owners: none
Missing Ownership: 1
Route: blocked
```

### Right side

```text
AFTER VERIFIED RE-READ
Owner: assigned
Missing Ownership: 0
Route: ready
WRITE VERIFIED
```

Place a narrow confirmation step between them:

```text
Human confirmation → add_owners → DataHub re-read
```

This is likely the strongest single technical image after the cover.

## 8. Video thumbnail

Use a simplified variant of the cover.

Recommended copy:

```text
Nexus Atlas
Restore a Project in 3 Minutes
```

Secondary line:

```text
DataHub ownership repair with human confirmation
```

Keep the thumbnail readable on a phone. Use no more than two short text blocks and one route graphic.

## 9. Video opening and ending cards

### Opening card

Display for approximately two seconds:

```text
Nexus Atlas
Restore context. Trace decisions. Continue the work.
```

### Ending card

Display for approximately two seconds:

```text
Nexus Atlas
Context → Decision → Action → Memory

GitHub · Demo · Devpost
```

Add real links only in the video description or after final URLs are available. Do not place long URLs on screen.

## 10. Chapter cards

Use four simple section cards:

```text
01 · Restore Context
02 · Trace the Route
03 · Repair Broken Context
04 · Continue the Work
```

Each card should display for about one second. Avoid animated logos or elaborate transitions.

## 11. Image status labels

Every visual should be classified internally before publication.

### `DESIGN MOCKUP`

Used for conceptual diagrams or planned layouts. It must not resemble captured runtime evidence without a label.

### `FIXTURE DEMO`

Used for deterministic local scenario screens that do not perform a real DataHub mutation.

### `VERIFIED RUNTIME`

Used only after the real source, mutation, and re-read have been captured.

The public submission may omit these labels when the image context is obvious, but the project files and selection checklist must retain the distinction.

## 12. Capture settings

Recommended workflow:

- browser zoom around 100%;
- capture at 1920 × 1080 when possible;
- use a clean browser profile or full-screen window;
- disable personal notifications;
- use synthetic DataHub owner identifiers;
- hide the operating-system taskbar when it adds no value;
- keep mouse pointer away from important text;
- capture one desktop image and one mobile image for responsive proof;
- preserve original PNG files before compression.

## 13. Privacy checklist

Before publishing each image, inspect for:

- Windows username or local file paths;
- GitHub notification or private repository names;
- DataHub tokens or MCP credentials;
- terminal command history containing secrets;
- real email addresses;
- personal browser bookmarks;
- unrelated open tabs;
- BNPL team research or team-owned data;
- private Notion, Gmail, Drive, or Calendar content;
- real DataHub user identity when a synthetic identifier can be used.

## 14. File naming

Use predictable names:

```text
submission-assets/
├── cover-nexus-atlas.png
├── thumbnail-demo-video.png
├── screenshot-01-atlas-desk.png
├── screenshot-02-atlas-map.png
├── screenshot-03-reentry-brief.png
├── screenshot-04-agent-conflict.png
├── screenshot-05-datahub-inspector.png
├── screenshot-06-confirmation-sheet.png
├── screenshot-07-verified-repair.png
├── screenshot-08-continue-work.png
└── comparison-ownership-before-after.png
```

Do not commit files containing personal information. Final compressed submission assets can be added after privacy review.

## 15. Production order

```text
1. Finalize cover layout
2. Run and verify the target branch
3. Capture clean screenshots
4. Build the before/after image
5. Record video segments
6. Add voice-over and English subtitles
7. Create the video thumbnail
8. Add selected images to README and Devpost
9. Perform privacy and truthfulness review
```

## 16. Final visual acceptance criteria

The visual package is ready only when:

- Nexus is recognizable without reading a long paragraph;
- the route-first model is visible;
- DataHub's role is understandable;
- human confirmation is clearly shown;
- verified runtime images are separated from samples;
- no screenshot exposes private information;
- no image suggests unfinished Territories are active;
- no decorative relationship is presented as real Context data;
- the cover, README, video, and Devpost use the same product language.
