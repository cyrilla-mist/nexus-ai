export const CAPABILITY_ENGINES = Object.freeze([
  Object.freeze({
    engineId: "project-development-engine",
    legacyAtlasId: "project-atlas",
    legacyName: "Project Atlas",
    territoryIds: Object.freeze(["innovation"]),
    productRole: "Project Development Engine",
    status: "active",
    capabilities: Object.freeze([
      "idea_understanding",
      "problem_definition",
      "project_planning",
      "risk_review",
      "execution_guidance",
    ]),
  }),
  Object.freeze({
    engineId: "evidence-engine",
    legacyAtlasId: "evidence-atlas",
    legacyName: "Evidence Atlas",
    territoryIds: Object.freeze(["research", "evaluation"]),
    productRole: "Evidence Engine",
    status: "planned",
    capabilities: Object.freeze([
      "claim_evidence_mapping",
      "source_traceability",
      "evidence_gap_detection",
    ]),
  }),
]);

const ENGINE_BY_LEGACY_ATLAS = new Map(
  CAPABILITY_ENGINES.map((engine) => [engine.legacyAtlasId, engine]),
);

export function getCapabilityEngineByLegacyAtlas(atlasId) {
  return ENGINE_BY_LEGACY_ATLAS.get(String(atlasId || "").trim()) || null;
}

export function listCapabilityEngines() {
  return CAPABILITY_ENGINES.map((engine) => ({
    ...engine,
    territoryIds: [...engine.territoryIds],
    capabilities: [...engine.capabilities],
  }));
}

export function describeLegacyAtlas(atlasId) {
  const engine = getCapabilityEngineByLegacyAtlas(atlasId);
  if (!engine) return null;
  return {
    id: engine.legacyAtlasId,
    name: engine.legacyName,
    status: engine.status,
    engineId: engine.engineId,
    productRole: engine.productRole,
    territoryIds: [...engine.territoryIds],
    capabilities: [...engine.capabilities],
    architectureBoundary:
      "Capability engine inside Nexus Atlas; not a separate top-level product Atlas.",
  };
}
