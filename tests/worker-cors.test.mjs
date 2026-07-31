import assert from "node:assert/strict";
import test from "node:test";

import worker, { resolveCorsPolicy } from "../worker/index.js";

test("allows the public GitHub Pages origin without using a wildcard", async () => {
  const request = new Request("https://worker.example/health", {
    headers: { Origin: "https://cyrilla-mist.github.io" },
  });
  const response = await worker.fetch(request, {});

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://cyrilla-mist.github.io",
  );
  assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Vary"), "Origin");
});

test("rejects browser requests from an unapproved origin", async () => {
  const request = new Request("https://worker.example/health", {
    headers: { Origin: "https://untrusted.example" },
  });
  const response = await worker.fetch(request, {});
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(payload.error.code, "ORIGIN_NOT_ALLOWED");
});

test("allows server-to-server requests without an Origin header", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example/health"),
    {},
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("supports an explicit environment origin allow-list", () => {
  const request = new Request("https://worker.example/health", {
    headers: { Origin: "https://preview.example" },
  });
  const policy = resolveCorsPolicy(request, {
    NEXUS_ALLOWED_ORIGINS:
      "https://preview.example,http://localhost:8010",
  });

  assert.equal(policy.originAllowed, true);
  assert.equal(
    policy.headers["Access-Control-Allow-Origin"],
    "https://preview.example",
  );
  assert.equal(policy.allowedOrigins.has("http://localhost:8010"), true);
});
