import { createDataHubContinuityProvider } from "./datahub-continuity-provider.mjs";
import { createFixtureContinuityProvider } from "./fixture-continuity-provider.mjs";

const MODES = new Set(["fixture", "datahub"]);

export function normalizeContinuitySource(value) {
  const mode = value || "fixture";
  if (!MODES.has(mode)) {
    const error = new Error(`Unsupported continuity source: ${mode}`);
    error.code = "UNKNOWN_CONTINUITY_SOURCE";
    throw error;
  }
  return mode;
}

export function createContinuityProvider(options = {}) {
  const mode = normalizeContinuitySource(options.mode);
  if (mode === "datahub") return createDataHubContinuityProvider(options);
  return createFixtureContinuityProvider(options);
}
