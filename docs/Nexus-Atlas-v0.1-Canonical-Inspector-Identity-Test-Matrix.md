# Nexus Atlas Phase 5D — Canonical Inspector and Identity Context Test Matrix

**Status:** Blocking acceptance matrix  
**Target:** Phase 5D / Product Surface v0.1 Desk

## A. Inspector index authority

| ID | Case | Expected |
|---|---|---|
| 5D-A01 | accepted project descriptor | resolves exactly one Project record |
| 5D-A02 | accepted Identity descriptor | resolves exactly one Identity record |
| 5D-A03 | accepted Decision descriptor | resolves exactly one Decision record |
| 5D-A04 | accepted Memory descriptor | resolves exactly one Memory record |
| 5D-A05 | accepted Evidence descriptor | resolves exactly one Evidence record |
| 5D-A06 | accepted Risk descriptor | resolves exactly one Risk record |
| 5D-A07 | accepted Action descriptor | resolves exactly one Action record |
| 5D-A08 | unknown ID | unavailable; no fallback scan/source read |
| 5D-A09 | descriptor section mismatch | unavailable |
| 5D-A10 | descriptor kind mismatch | unavailable |

## B. Relation boundary

| ID | Case | Expected |
|---|---|---|
| 5D-B01 | related target exists in inspectorIndex | navigation control allowed |
| 5D-B02 | related target missing from inspectorIndex | not rendered as inspectable control |
| 5D-B03 | relation navigation | resolves through the same canonical Inspector path |
| 5D-B04 | relation click | performs no source fetch or mutation |

## C. Identity Context

| ID | Case | Expected |
|---|---|---|
| 5D-C01 | accepted confirmed Identity | displayed as confirmed |
| 5D-C02 | inferred Identity, when present | displayed as inferred / not user-confirmed |
| 5D-C03 | Identity freshness | shown independently from verification |
| 5D-C04 | Identity provenance | safe projected provenance shown |
| 5D-C05 | Identity governance | sensitivity/inheritance/confirmation preserved |
| 5D-C06 | no additional accepted Identity facts | UI does not fabricate placeholder identity records |
| 5D-C07 | restricted Identity | cannot be reconstructed from downstream records |

## D. Read-only / privacy boundary

| ID | Case | Expected |
|---|---|---|
| 5D-D01 | Inspector open | no live provider fetch |
| 5D-D02 | Inspector navigation | no POST/persistent write |
| 5D-D03 | unknown ID | no raw Graph/provider fallback |
| 5D-D04 | provenance display | no token/credential/private local path |
| 5D-D05 | Identity display | no edit/capture/promote action |

## E. Compatibility and regression

| ID | Case | Expected |
|---|---|---|
| 5D-E01 | Phase 5C Desk route | remains Product Surface driven |
| 5D-E02 | Map route | legacy route preserved |
| 5D-E03 | Workspace route | legacy route preserved |
| 5D-E04 | Re-entry route | legacy route preserved |
| 5D-E05 | Phase 4F dedicated acceptance | PASS |
| 5D-E06 | Full Node test suite | PASS |
| 5D-E07 | Full repository check | PASS |

All cases are blocking for Phase 5D acceptance.
