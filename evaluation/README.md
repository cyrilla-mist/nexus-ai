# Nexus Atlas Evaluation Archive

This directory preserves point-in-time evaluation artifacts from the Phase 6 continuity work.

It is **not** the current Nexus Atlas roadmap and the phase names here do not mean the canonical product is still in Phase 6. For current product status, start with [`../README.md`](../README.md), [`../docs/README.md`](../docs/README.md), and the current CI state.

## Contents

- `phase6g/` — adversarial / real-run continuity evaluation artifacts.
- `phase6h/` — final acceptance artifacts for the Phase 6 continuity loop.

These records are useful because they show how continuity behavior was tested and accepted at specific engineering checkpoints. They are historical evidence, not a live backlog.

## Reading Order

When evaluating current behavior, use this precedence:

```text
current source code and tests
  → current CI
  → current repository README
  → current architecture / integration docs
  → historical evaluation artifacts
```

## Maintenance Rule

Keep evaluation artifacts when they document a meaningful acceptance decision, adversarial case, or reliability boundary. New temporary outputs should remain local unless they are intentionally being preserved as reproducible evidence.
