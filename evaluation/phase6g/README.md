# Phase 6G evaluation evidence

This directory contains only sanitized, replay-oriented Phase 6G inputs and documentation.

The real runtime stores used during CI live outside tracked source under the workflow workspace and are uploaded as GitHub Actions artifacts. They are not treated as fresh GitHub project evidence by Nexus.

`real-run/manifest.json` records the bounded human-confirmed starting boundary and workflow stage. It does not contain private chat content, credentials, tokens, local machine paths, or GitHub author email/profile payloads.
