# Nexus Atlas Final Video Production Pack

## Purpose

This document is the operational guide for the public demo video.

Target format:

```text
real product recording
+ simple English voice-over
+ English subtitles
+ minimal chapter cards
```

Target duration: **2:40–2:55**. The final export must remain under three minutes.

---

## 1. Required files

- `Nexus-Atlas-AI-Voiceover.txt` — narration source for AI voice or personal recording
- `nexus-atlas-demo-en.srt` — editable English subtitle timeline
- final screen recordings from the verified local runtime
- Nexus Atlas 16:9 hero image
- Nexus Atlas YouTube thumbnail

Recommended working filenames:

```text
01-opening.mp4
02-atlas-desk.mp4
03-atlas-map.mp4
04-reentry-brief.mp4
05-agent-conflict.mp4
06-confirmation-sheet.mp4
07-datahub-repair.mp4
08-ending.mp4
nexus-atlas-voiceover.wav
nexus-atlas-demo-en.srt
```

---

## 2. Voice choice

### Preferred production choice

Use a neutral AI-generated English voice with:

- calm and clear delivery;
- medium-low energy;
- no dramatic advertising tone;
- 105–115 words per minute;
- short pauses between scenes;
- correct pronunciation of Nexus Atlas, Verity, DataHub, Benchmark, and Calibration.

The voice must not imitate or clone a real person.

### Personal-voice alternative

The same script is intentionally simple enough for personal narration. Record each scene separately rather than reading the entire script in one take.

English subtitles remain mandatory in either version.

---

## 3. Scene-by-scene recording plan

### Scene 1 — Problem

**Time:** 0:00–0:16

**Visual:** Nexus Atlas opening image, followed by a quick neutral view of project files or project history.

**Do not show:** private local paths, usernames, browser bookmarks, tokens, or unrelated projects.

**Voice:** the first three sentences from the voice-over file.

### Scene 2 — Product introduction

**Time:** 0:16–0:34

**Visual:** open the Nexus Atlas shell. Hold the product title and tagline long enough to read.

Suggested chapter card:

```text
01 · Restore Context
```

### Scene 3 — Atlas Desk

**Time:** 0:34–0:55

**Visual actions:**

1. open Atlas Desk;
2. pause on Verity;
3. show the 21-day interruption or Needs Re-entry state;
4. show the priority signals and next action;
5. move the cursor slowly toward the re-entry route.

**Evidence label:** `FIXTURE DEMO` is acceptable before live DataHub validation.

### Scene 4 — Atlas Map

**Time:** 0:55–1:16

**Visual actions:**

1. open Atlas Map;
2. show the primary route;
3. move from Rubric to Benchmark v1;
4. continue through Calibration, Results, and Release Evidence;
5. briefly show supporting context without expanding the full graph.

Suggested chapter card:

```text
02 · Trace the Route
```

The route should read as a task path, not as a decorative universe of nodes.

### Scene 5 — Re-entry Brief

**Time:** 1:16–1:39

**Visual actions:**

1. open the Re-entry Brief;
2. show four meaningful changes;
3. show four valid decisions;
4. show two stale evidence records;
5. show one agent conflict;
6. show one missing owner.

Pause on the distinction between trusted context and context that requires verification or repair.

### Scene 6 — Agent Conflict

**Time:** 1:39–1:59

**Visual actions:**

1. open the conflict record;
2. show the feature-expansion recommendation;
3. show the evaluation-quality recommendation;
4. show the existing Benchmark-first decision;
5. confirm the continuing route;
6. retain the deferred recommendation in the trace.

This scene may use deterministic fixture data.

### Scene 7 — Confirmation Sheet and DataHub repair

**Time:** 1:59–2:28

Suggested chapter card:

```text
03 · Repair Broken Context
```

**Visual actions:**

1. show `Missing Ownership: 1` from a live DataHub-backed read;
2. open the Atlas Confirmation Sheet;
3. show the exact asset, current owner state, proposed owner, operation, and verification method;
4. select `Approve & Repair` or the final confirmed button label;
5. show a brief pending state;
6. show the read-after-write verification result;
7. show `Missing Ownership: 0` only after the intended owner is present;
8. show the resulting `ContextRepairEvent`.

**Required evidence label:** `VERIFIED RUNTIME`.

This sequence must not be represented by a design mockup or fixture in the final evidence video.

### Scene 8 — Continue the work

**Time:** 2:28–2:50

Suggested chapter card:

```text
04 · Continue the Work
```

**Visual actions:**

1. return to the trusted route;
2. show the next actions: build the test set, re-run older samples, and adjust v1.0 scoring rules;
3. end on the Nexus Atlas title and tagline.

Ending card:

```text
NEXUS ATLAS
Restore context. Trace decisions. Continue the work.
Built with DataHub and MCP
```

Hold the final card for at least two seconds.

---

## 4. Subtitle workflow

1. Import `nexus-atlas-demo-en.srt` into the editor.
2. Match scene cuts to the subtitle timing.
3. Adjust timing only after the final voice audio is generated.
4. Keep subtitles to one or two lines.
5. Correct the following proper nouns manually:
   - Nexus Atlas
   - Verity
   - DataHub
   - Benchmark v1
   - Atlas Desk
   - Atlas Map
6. Keep subtitles inside the lower safe area and away from browser status bars.

Recommended subtitle presentation:

- white or warm-white text;
- dark translucent background or subtle shadow;
- centered near the bottom;
- no animated karaoke highlighting;
- no more than roughly 10–12 words per line.

---

## 5. Editing rules

- No background music is required.
- Avoid complex transitions.
- Use simple cuts or short fades.
- Do not accelerate the mouse pointer excessively.
- Remove loading delays and accidental clicks.
- Do not enlarge browser zoom so far that the interface becomes unrealistic.
- Keep the visual style consistent with Archive Cartography.
- Do not mix the abandoned dark-neon AI dashboard style into the final submission.

Recommended export:

```text
MP4
1920 × 1080
30 fps
H.264
clear stereo or mono voice audio
```

---

## 6. YouTube submission text

### Video title

```text
Nexus Atlas — Context Continuity Agent with DataHub | Demo
```

Alternative shorter title:

```text
Nexus Atlas — Restore Context and Continue the Work
```

### Description

```text
Nexus Atlas is a personal intelligence infrastructure for long-term context continuity.

This demo follows Verity after a 21-day project interruption. Nexus restores meaningful changes and valid decisions, identifies stale evidence and agent conflict, and uses governed DataHub ownership and lineage metadata to repair a missing asset owner through explicit human confirmation and read-after-write verification.

Demo flow:
00:00 The context continuity problem
00:16 Introducing Nexus Atlas
00:34 Atlas Desk
00:55 Atlas Map
01:16 Re-entry Brief
01:39 Agent Conflict
01:59 Governed DataHub Repair
02:28 Continue the Work

Built with DataHub OSS, DataHub MCP Server, Node.js, JavaScript, HTML, CSS, and Python.

Source code: [ADD PUBLIC REPOSITORY URL]
Project page: [ADD DEVPOST URL]

Nexus Atlas
Restore context. Trace decisions. Continue the work.
```

### Suggested tags

```text
DataHub, MCP, AI Agent, Context Engineering, Metadata Governance, Knowledge Graph, Hackathon, Nexus Atlas
```

---

## 7. Runtime evidence checklist

Before recording the final repair scene, confirm all items below:

- [ ] the six Verity assets exist in the local DataHub instance;
- [ ] Benchmark v1 has the required upstream lineage;
- [ ] Benchmark v1 initially has no owner;
- [ ] the read-only bridge returns Missing Ownership `1`;
- [ ] the confirmation sheet shows the exact target and proposed owner;
- [ ] the browser cannot freely change the target URN;
- [ ] the mutation bridge accepts only the allow-listed `add_owners` operation;
- [ ] DataHub returns the intended owner during a fresh read;
- [ ] the interface changes to Missing Ownership `0` only after verification;
- [ ] a successful `ContextRepairEvent` is recorded only after verification;
- [ ] no token, private owner identifier, local username, or private path is visible.

---

## 8. Final export checklist

- [ ] duration is under three minutes;
- [ ] English narration is understandable;
- [ ] English subtitles match the final audio;
- [ ] the recording shows the project functioning;
- [ ] runtime claims are supported by visible evidence;
- [ ] design mockups and fixtures are not presented as live proof;
- [ ] no API keys, tokens, local paths, or private data are visible;
- [ ] no confidential BNPL team material appears;
- [ ] no unauthorized music or third-party visual material is included;
- [ ] the final video is publicly visible through the submitted link;
- [ ] README and Devpost use the same project wording and status.

---

## Current status

The narration, subtitle track, visual plan, and recording sequence are prepared.

The final video must wait for:

1. local test completion;
2. real DataHub ingestion;
3. live MCP verification;
4. verified ownership repair;
5. sanitized real screen recording.
