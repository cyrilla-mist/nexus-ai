import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateContinuityProductSurfaceBrowserV01,
} from "../experience/product-surface-v01/continuity-product-surface-browser-validator.mjs";
import {
  CONTINUITY_LIVE_READ_ENVELOPE_VERSION_V01,
  DEFAULT_CONTINUITY_LIVE_READ_URL,
  continuityLiveReadRequested,
  loadContinuityLiveSurfaceIfRequested,
  resolveContinuityLiveReadUrl,
  validateContinuityLiveReadUrl,
} from "../frontend/atlas/atlas-continuity-live-read.js";

const root = new URL("../", import.meta.url);
const snapshot = JSON.parse(await readFile(new URL("examples/nexus-atlas-continuity-product-surface-phase8-v0.1.json", root), "utf8"));
const clone = value => structuredClone(value);

function location(search = "") {
  return { search };
}

function envelope(surface = snapshot, overrides = {}) {
  return {
    version: CONTINUITY_LIVE_READ_ENVELOPE_VERSION_V01,
    source: "continuity-product-surface-bridge",
    readOnly: true,
    mutationEnabled: false,
    fetchedAt: "2026-09-17T12:13:00Z",
    surface,
    ...overrides,
  };
}

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() { return payload; },
  };
}

test("8E-A01 accepted Phase 8B snapshot passes the browser-safe Phase 8A validator", async () => {
  const value = await validateContinuityProductSurfaceBrowserV01(snapshot);
  assert.deepEqual(value, snapshot);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.resumeState), true);
});

test("8E-A02 browser validator rejects unexpected raw fields at root", async () => {
  const value = clone(snapshot);
  value.rawCheckpoint = { secret: true };
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-A03 browser validator rejects unexpected raw fields in bounded history", async () => {
  const value = clone(snapshot);
  value.history.outcomes.records[0].verificationEvidenceRefs = ["raw:evidence"];
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-A04 browser validator rejects weakened mutation capabilities", async () => {
  const value = clone(snapshot);
  value.capabilities.writeAllowed = true;
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-A05 browser validator rejects tampered projected content through surfaceId binding", async () => {
  const value = clone(snapshot);
  value.resumeState.nextActionSummary = "Tampered next action";
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-A06 browser validator rejects inconsistent AMBIGUOUS authority flags", async () => {
  const value = clone(snapshot);
  value.continuity.validity = "AMBIGUOUS";
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-A07 browser validator rejects inconsistent verification totals", async () => {
  const value = clone(snapshot);
  value.verification.total = 1;
  await assert.rejects(
    validateContinuityProductSurfaceBrowserV01(value),
    error => error.code === "INVALID_CONTINUITY_BROWSER_SURFACE",
  );
});

test("8E-B01 live read is not requested by default or explicit static mode", () => {
  assert.equal(continuityLiveReadRequested(location("")), false);
  assert.equal(continuityLiveReadRequested(location("?continuitySource=static")), false);
});

test("8E-B02 unsupported continuity source fails instead of falling back", () => {
  assert.throws(
    () => continuityLiveReadRequested(location("?continuitySource=datahub")),
    error => error.code === "UNKNOWN_CONTINUITY_SOURCE",
  );
});

test("8E-B03 default live URL is fixed loopback product-surface endpoint", () => {
  assert.equal(
    resolveContinuityLiveReadUrl(location("?continuitySource=live")),
    DEFAULT_CONTINUITY_LIVE_READ_URL,
  );
});

test("8E-B04 localhost spelling is accepted on the fixed live endpoint", () => {
  assert.equal(
    validateContinuityLiveReadUrl("http://localhost:8792/api/continuity/product-surface"),
    "http://localhost:8792/api/continuity/product-surface",
  );
});

test("8E-B05 non-loopback host is rejected", () => {
  assert.throws(
    () => validateContinuityLiveReadUrl("http://example.com:8792/api/continuity/product-surface"),
    error => error.code === "CONTINUITY_LIVE_READ_HOST_NOT_ALLOWED",
  );
});

test("8E-B06 HTTPS, wrong port, wrong path, suffix and embedded credentials are rejected", () => {
  const cases = [
    ["https://127.0.0.1:8792/api/continuity/product-surface", "CONTINUITY_LIVE_READ_PROTOCOL_NOT_ALLOWED"],
    ["http://127.0.0.1:8790/api/continuity/product-surface", "CONTINUITY_LIVE_READ_PORT_NOT_ALLOWED"],
    ["http://127.0.0.1:8792/api/continuity/reentry", "CONTINUITY_LIVE_READ_PATH_NOT_ALLOWED"],
    ["http://127.0.0.1:8792/api/continuity/product-surface?raw=1", "CONTINUITY_LIVE_READ_SUFFIX_NOT_ALLOWED"],
    ["http://user:pass@127.0.0.1:8792/api/continuity/product-surface", "CONTINUITY_LIVE_READ_CREDENTIALS_NOT_ALLOWED"],
  ];
  for (const [url, code] of cases) {
    assert.throws(() => validateContinuityLiveReadUrl(url), error => error.code === code);
  }
});

test("8E-C01 static mode performs no live fetch", async () => {
  let calls = 0;
  const result = await loadContinuityLiveSurfaceIfRequested({
    locationLike: location(""),
    fetchImpl: async () => { calls += 1; throw new Error("should not fetch"); },
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("8E-C02 live read uses one GET with credentials omitted and redirects rejected", async () => {
  const calls = [];
  const result = await loadContinuityLiveSurfaceIfRequested({
    locationLike: location("?continuitySource=live"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(envelope());
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, DEFAULT_CONTINUITY_LIVE_READ_URL);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(result.surface.surfaceId, snapshot.surfaceId);
  assert.deepEqual(result.sourceInfo, {
    mode: "live",
    label: "VALIDATED LOOPBACK LIVE READ",
    fetchedAt: "2026-09-17T12:13:00Z",
    readOnly: true,
    mutationEnabled: false,
  });
});

test("8E-C03 live bridge envelope cannot claim mutation authority", async () => {
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => response(envelope(snapshot, { mutationEnabled: true })),
    }),
    error => error.code === "CONTINUITY_LIVE_READ_AUTHORITY_EXCEEDED",
  );
});

test("8E-C04 live bridge envelope cannot smuggle additional top-level fields", async () => {
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => response({ ...envelope(), rawRows: [] }),
    }),
    error => error.code === "INVALID_CONTINUITY_LIVE_READ_ENVELOPE",
  );
});

test("8E-C05 live read rejects a different project even if transport envelope is otherwise accepted", async () => {
  const value = clone(snapshot);
  value.projectRef = "project:other";
  // Keep the old surfaceId on purpose: browser validation must fail before scope can be trusted.
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => response(envelope(value)),
    }),
    error => error.code === "INVALID_CONTINUITY_LIVE_SURFACE",
  );
});

test("8E-C06 live read rejects stale envelope timestamps", async () => {
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => response(envelope(snapshot, { fetchedAt: "2026-09-17T12:11:00Z" })),
    }),
    error => error.code === "CONTINUITY_LIVE_READ_STALE_ENVELOPE",
  );
});

test("8E-C07 HTTP failure does not return a static surface", async () => {
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => response(envelope(), { ok: false, status: 503 }),
    }),
    error => error.code === "CONTINUITY_LIVE_READ_HTTP_FAILURE",
  );
});

test("8E-C08 network failure does not return a static surface", async () => {
  await assert.rejects(
    loadContinuityLiveSurfaceIfRequested({
      locationLike: location("?continuitySource=live"),
      fetchImpl: async () => { throw new Error("offline"); },
    }),
    error => error.code === "CONTINUITY_LIVE_READ_UNAVAILABLE",
  );
});
