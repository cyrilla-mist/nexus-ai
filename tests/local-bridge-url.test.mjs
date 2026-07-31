import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultLocalBridgeUrl,
  validateLocalBridgeUrl,
} from "../experience/continuity/local-bridge-url.mjs";

test("accepts only the allow-listed read bridge endpoints", () => {
  assert.equal(
    validateLocalBridgeUrl(
      "http://127.0.0.1:8790/api/continuity/reentry",
      "read",
    ),
    "http://127.0.0.1:8790/api/continuity/reentry",
  );
  assert.equal(
    validateLocalBridgeUrl(
      "http://localhost:8790/api/continuity/reentry",
      "read",
    ),
    "http://localhost:8790/api/continuity/reentry",
  );
});

test("accepts only the allow-listed mutation bridge endpoints", () => {
  assert.equal(
    validateLocalBridgeUrl(
      "http://127.0.0.1:8791/api/context/repair/benchmark-owner",
      "mutation",
    ),
    "http://127.0.0.1:8791/api/context/repair/benchmark-owner",
  );
  assert.equal(
    defaultLocalBridgeUrl("mutation", "localhost"),
    "http://localhost:8791/api/context/repair/benchmark-owner",
  );
});

test("rejects remote hosts, unexpected ports, paths, and protocols", () => {
  const invalid = [
    ["https://example.com/api/continuity/reentry", "read"],
    ["http://127.0.0.1:9999/api/continuity/reentry", "read"],
    ["http://localhost:8791/other-route", "mutation"],
    ["javascript:alert(1)", "read"],
    ["http://user:secret@localhost:8790/api/continuity/reentry", "read"],
    ["http://localhost:8790/api/continuity/reentry?source=other", "read"],
    ["http://localhost:8791/api/context/repair/benchmark-owner#confirm", "mutation"],
  ];

  for (const [value, kind] of invalid) {
    assert.throws(
      () => validateLocalBridgeUrl(value, kind),
      (error) => error?.name === "LocalBridgeUrlError",
      `${value} should be rejected`,
    );
  }
});

test("rejects unknown bridge kinds", () => {
  assert.throws(
    () => validateLocalBridgeUrl("http://localhost:8790/api/continuity/reentry", "other"),
    (error) => error?.code === "UNKNOWN_LOCAL_BRIDGE_KIND",
  );
});
