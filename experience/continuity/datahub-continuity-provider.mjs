const DEFAULT_BRIDGE_URL =
  "http://127.0.0.1:8789/api/continuity/reentry";

export function createDataHubContinuityProvider(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const bridgeUrl = options.bridgeUrl || DEFAULT_BRIDGE_URL;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for DataHub mode.");
  }
  return {
    mode: "datahub",
    bridgeUrl,
    async loadScenario() {
      const response = await fetchImpl(bridgeUrl, {
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        const error = new Error(
          payload?.error?.message || "DataHub live read is unavailable.",
        );
        error.code = payload?.error?.code || "DATAHUB_LIVE_UNAVAILABLE";
        throw error;
      }
      if (payload?.source !== "datahub-mcp" || !payload?.readOnly) {
        throw new Error("The bridge returned an invalid live-read response.");
      }
      return {
        scenario: payload.scenario,
        sourceInfo: {
          mode: "datahub",
          label: "DataHub MCP",
          detail: "Live read · read-only",
          live: true,
          readOnly: true,
          fetchedAt: payload.fetchedAt,
          diagnostics: payload.diagnostics || {},
        },
      };
    },
  };
}
