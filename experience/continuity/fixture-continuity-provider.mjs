import { normalizeContinuityScenario } from "./normalize-continuity-scenario.mjs";

const DEFAULT_FIXTURE_URL =
  "./continuity/scenarios/nexus-self-reentry.json";
const VERITY_FIXTURE_URL =
  "./continuity/scenarios/verity-reentry.json";

function requestedScenario() {
  try {
    return new URLSearchParams(globalThis.location?.search || "").get("scenario");
  } catch {
    return null;
  }
}

async function readJson(fetchImpl, url) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Fixture request returned ${response.status}: ${url}`);
  }
  return response.json();
}

async function readMultipartJson(fetchImpl, urls) {
  const responses = await Promise.all(urls.map((url) => fetchImpl(url)));
  const failed = responses.find((response) => !response.ok);
  if (failed) {
    throw new Error(`Fixture part request returned ${failed.status}.`);
  }
  const parts = await Promise.all(responses.map((response) => response.text()));
  return JSON.parse(parts.join(""));
}

export function createFixtureContinuityProvider(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const scenarioKey = options.scenario || requestedScenario() || "nexus";
  const fixtureUrl =
    options.fixtureUrl ||
    (scenarioKey === "verity" ? VERITY_FIXTURE_URL : DEFAULT_FIXTURE_URL);
  const fixtureParts = options.fixtureParts || null;

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for fixture mode.");
  }

  return {
    mode: "fixture",
    scenario: scenarioKey,
    async loadScenario() {
      const rawScenario = fixtureParts
        ? await readMultipartJson(fetchImpl, fixtureParts)
        : await readJson(fetchImpl, fixtureUrl);
      const scenario = normalizeContinuityScenario(rawScenario, {
        sourceMode: `fixture:${scenarioKey}`,
      });

      return {
        scenario,
        sourceInfo: {
          mode: "fixture",
          label:
            scenarioKey === "verity"
              ? "Verity scenario fixture"
              : "Continuity fixture",
          detail:
            scenarioKey === "verity"
              ? "Public Hero Scenario · canonical JSON"
              : "Runtime mapping verified",
          live: false,
          readOnly: true,
          fetchedAt: scenario.runtime.normalizedAt,
          diagnostics: {
            scenario: scenarioKey,
            entities: scenario.entities.length,
            relationships: scenario.relationships.length,
          },
        },
      };
    },
  };
}
