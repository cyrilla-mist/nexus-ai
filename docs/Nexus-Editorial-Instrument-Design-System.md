# Nexus Editorial Instrument Design System

## Direction

**Editorial Atlas × Signal Instrument** combines editorial clarity with operational state.

- Editorial Atlas supplies hierarchy, annotation, source context, numbering, and readable structure.
- Signal Instrument supplies status, readings, warnings, ownership, and one clear next action.

The interface should feel like a maintained project record with live operational signals, not a generic dashboard or decorative AI surface.

## 1. Foundation Principles

- Use warm paper or archival material rather than pure white.
- Use warm ink rather than pure black.
- Do not depend on purple-blue gradients or large halos.
- Use few rounded corners and few shadows.
- Establish hierarchy through typography, rules, spacing, numbering, and annotations.
- Show source, status, confidence, and ownership as editorial evidence.
- Show risks, readings, and actions as instrument signals.
- Do not force a Light/Dark theme pair in the current phase.

## 2. Color Semantics

Color values are candidates, not permanent brand constants. Semantic roles must remain stable even if exact values change.

| Role | Candidate | Use |
| --- | --- | --- |
| Paper | `#EDE7DB` | primary canvas |
| Paper Light | `#F3EEE5` | reading surface |
| Ink Title | `#25241F` | titles |
| Ink Primary | `#292824` | primary information |
| Ink Body | `#494640` | body copy |
| Ink Muted | `#777168` | metadata |
| Ink Panel | `#302F2A` | inverse instrument surface |
| Paper Text | `#EEE9DE` | text on dark instrument surfaces |
| Rule | `#C6BDAF` | dividers and editorial structure |
| Oxide Red | `#A34632` | revalidation and risk resolution |
| Amber | `#B8792F` | human decision and ownership |
| Mineral Green | `#647866` | confirmation and accepted write-back |
| Muted Cobalt | `#486A84` | evidence and lineage |

Color must not be the only state carrier. Every signal also needs text, position, or shape.

## 3. Typography and Editorial Structure

- Use strong title/body/metadata contrast.
- Prefer numbered sections, margin notes, provenance labels, and rule lines.
- Keep body copy readable and avoid all-uppercase paragraphs.
- Use monospace only for identifiers, timestamps, schema fields, and technical evidence.
- Keep evidence citations adjacent to the claim they support.
- Use compact status readings instead of oversized badges.

## 4. Action Hierarchy

Each state exposes one Primary Action. Competing primary buttons are not allowed.

Other actions use:

- **Secondary:** relevant alternative;
- **Tertiary:** navigation or low-priority utility;
- **Destructive / Archive:** explicit removal or retirement.

### Action semantics

| Signal | Meaning |
| --- | --- |
| Oxide Red | revalidate evidence or resolve risk |
| Muted Cobalt | inspect evidence, source, or lineage |
| Amber | request a human decision or assign an owner |
| Mineral Green | confirm, accept, complete, or write back |
| Graphite | ordinary navigation and supporting action |

## 5. Confirmed Product Pages

### Project Re-entry Brief

Summarizes meaningful changes, still-valid decisions, stale records, conflicts, blockers, and one recommended next action.

### Evidence & Conflict View

Shows source-to-evidence-to-claim relationships, contradiction, confidence, and supersession without hiding uncertainty.

### Memory Ledger

Shows inherited agent and project memory with status, provenance, confirmation, expiration, and replacement history.

### Decision & Action Ledger

Connects decisions to tasks, owners, risks, completion criteria, and outcomes.

These pages are different views of one Continuity loop, not separate products.

## 6. Page Composition

- Use a stable editorial header containing project identity and current continuity state.
- Use a narrow reading measure for explanations.
- Place operational readings in a compact instrument rail.
- Use rules and spacing before containers.
- Reveal detail progressively instead of stacking nested cards.
- Keep the current primary action close to the evidence that justifies it.

## 7. Star Map Status

**Star Map is an archived visual experiment.**

- Historical code remains in the repository.
- It is no longer the primary Nexus experience.
- It must not enter the new primary navigation.
- It is not part of the Hackathon main flow.
- Further Star Map development is paused.

The experiment remains useful as design history, but the Continuity experience now prioritizes recoverability, evidence integrity, governance, and action.
