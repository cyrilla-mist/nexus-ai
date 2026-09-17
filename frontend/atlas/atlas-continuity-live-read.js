import { validateContinuityProductSurfaceBrowserV01 } from "../../experience/product-surface-v01/continuity-product-surface-browser-validator.mjs";

export const CONTINUITY_LIVE_READ_ENVELOPE_VERSION_V01 = "nexus-atlas.continuity-product-surface-live-read.v0.1";
export const DEFAULT_CONTINUITY_LIVE_READ_URL = "http://127.0.0.1:8792/api/continuity/product-surface";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LIVE_SOURCE_KEY = "continuitySource";
const LIVE_SOURCE_VALUE = "live";
const LIVE_BRIDGE_KEY = "continuityBridge";
const LIVE_PORT = "8792";
const LIVE_PATH = "/api/continuity/product-surface";
const ENVELOPE_KEYS = ["version", "source", "readOnly", "mutationEnabled", "fetchedAt", "surface"];

export class ContinuityLiveReadError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContinuityLiveReadError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value)
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const fail = (code, message, details = {}) => {
  throw new ContinuityLiveReadError(code, message, details);
};

function strictIso(value, field) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > 64
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || Number.isNaN(Date.parse(value))
  ) fail("INVALID_CONTINUITY_LIVE_READ_ENVELOPE", `${field} must be a strict offset ISO timestamp.`);
  return value;
}

function searchParams(locationLike) {
  return new URLSearchParams(locationLike?.search || "");
}

export function continuityLiveReadRequested(locationLike = globalThis.location) {
  const value = searchParams(locationLike).get(LIVE_SOURCE_KEY);
  if (value === null || value === "" || value === "static") return false;
  if (value === LIVE_SOURCE_VALUE) return true;
  fail("UNKNOWN_CONTINUITY_SOURCE", `Unsupported continuitySource: ${value}`);
}

export function validateContinuityLiveReadUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    fail("INVALID_CONTINUITY_LIVE_READ_URL", "The Continuity live-read URL is invalid.");
  }

  if (url.protocol !== "http:") fail("CONTINUITY_LIVE_READ_PROTOCOL_NOT_ALLOWED", "Continuity live read must use loopback HTTP.");
  if (url.username || url.password) fail("CONTINUITY_LIVE_READ_CREDENTIALS_NOT_ALLOWED", "Credentials are not allowed in the Continuity live-read URL.");
  if (!LOOPBACK_HOSTS.has(url.hostname)) fail("CONTINUITY_LIVE_READ_HOST_NOT_ALLOWED", "Continuity live read is limited to localhost or 127.0.0.1.");
  if (url.port !== LIVE_PORT) fail("CONTINUITY_LIVE_READ_PORT_NOT_ALLOWED", `Continuity live read must use port ${LIVE_PORT}.`);
  if (url.pathname !== LIVE_PATH) fail("CONTINUITY_LIVE_READ_PATH_NOT_ALLOWED", "Continuity live-read path is not allow-listed.");
  if (url.search || url.hash) fail("CONTINUITY_LIVE_READ_SUFFIX_NOT_ALLOWED", "Continuity live-read URL cannot contain a query string or fragment.");
  return url.toString();
}

export function resolveContinuityLiveReadUrl(locationLike = globalThis.location) {
  if (!continuityLiveReadRequested(locationLike)) return null;
  const requested = searchParams(locationLike).get(LIVE_BRIDGE_KEY) || DEFAULT_CONTINUITY_LIVE_READ_URL;
  return validateContinuityLiveReadUrl(requested);
}

function validateEnvelope(value) {
  if (!exact(value, ENVELOPE_KEYS)) fail("INVALID_CONTINUITY_LIVE_READ_ENVELOPE", "Continuity live-read envelope field set is invalid.");
  if (value.version !== CONTINUITY_LIVE_READ_ENVELOPE_VERSION_V01) fail("INVALID_CONTINUITY_LIVE_READ_ENVELOPE", "Continuity live-read envelope version is invalid.");
  if (value.source !== "continuity-product-surface-bridge") fail("INVALID_CONTINUITY_LIVE_READ_ENVELOPE", "Continuity live-read source identity is invalid.");
  if (value.readOnly !== true || value.mutationEnabled !== false) fail("CONTINUITY_LIVE_READ_AUTHORITY_EXCEEDED", "Continuity live-read bridge exceeded the accepted read-only authority boundary.");
  strictIso(value.fetchedAt, "fetchedAt");
  return value;
}

export async function loadContinuityLiveSurfaceIfRequested({
  locationLike = globalThis.location,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const url = resolveContinuityLiveReadUrl(locationLike);
  if (url === null) return null;
  if (typeof fetchImpl !== "function") fail("CONTINUITY_LIVE_READ_FETCH_UNAVAILABLE", "A fetch implementation is required for Continuity live read.");

  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    fail("CONTINUITY_LIVE_READ_UNAVAILABLE", "Continuity live-read bridge is unavailable.", { cause: error?.message || null });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail("INVALID_CONTINUITY_LIVE_READ_ENVELOPE", "Continuity live-read bridge did not return JSON.");
  }

  if (!response.ok) {
    fail("CONTINUITY_LIVE_READ_HTTP_FAILURE", `Continuity live-read bridge returned HTTP ${response.status}.`);
  }

  const envelope = validateEnvelope(payload);
  let surface;
  try {
    surface = await validateContinuityProductSurfaceBrowserV01(envelope.surface, { cryptoImpl });
  } catch (error) {
    fail("INVALID_CONTINUITY_LIVE_SURFACE", "Continuity live-read Product Surface failed browser validation.", { causeCode: error?.code || null });
  }

  if (surface.projectRef !== "project:nexus-atlas") {
    fail("CONTINUITY_LIVE_READ_SCOPE_MISMATCH", "Continuity live-read Product Surface is outside the accepted Nexus Atlas project scope.");
  }
  if (Date.parse(envelope.fetchedAt) < Date.parse(surface.generatedAt)) {
    fail("CONTINUITY_LIVE_READ_STALE_ENVELOPE", "Continuity live-read fetchedAt predates the projected Product Surface.");
  }

  return deepFreeze({
    surface,
    sourceInfo: {
      mode: "live",
      label: "VALIDATED LOOPBACK LIVE READ",
      fetchedAt: envelope.fetchedAt,
      readOnly: true,
      mutationEnabled: false,
    },
  });
}
