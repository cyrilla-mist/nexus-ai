const DEFAULT_FIXTURE_URL =
  "./continuity/scenarios/nexus-self-reentry.json";

export function createFixtureContinuityProvider(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const fixtureUrl = options.fixtureUrl || DEFAULT_FIXTURE_URL;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for fixture mode.");
  }
  return {
    mode: "fixture",
    async loadScenario() {
      const response = await fetchImpl(fixtureUrl);
      if (!response.ok) {
        throw new Error(`Fixture request returned ${response.status}.`);
      }
      return {
        scenario: await response.json(),
        sourceInfo: {
          mode: "fixture",
          label: "Continuity fixture",
          detail: "Runtime mapping verified",
          live: false,
          readOnly: true,
          fetchedAt: undefined,
          diagnostics: {},
        },
      };
    },
  };
}
