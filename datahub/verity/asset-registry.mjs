export const VERITY_DATAHUB_PLATFORM = "nexus";
export const VERITY_DATAHUB_ENV = "PROD";

function datasetUrn(name) {
  return `urn:li:dataset:(urn:li:dataPlatform:${VERITY_DATAHUB_PLATFORM},${name},${VERITY_DATAHUB_ENV})`;
}

export const VERITY_ASSETS = Object.freeze([
  Object.freeze({
    entityId: "external-asset-rubric",
    name: "verity_evaluation_rubric",
    title: "Verity Evaluation Rubric",
    logicalType: "governance-rubric",
    urn: datasetUrn("verity_evaluation_rubric"),
    version: "1.0-draft",
    qualityStatus: "draft-validated",
    freshness: "current",
    critical: false,
  }),
  Object.freeze({
    entityId: "external-asset-test-materials",
    name: "verity_test_materials",
    title: "Verity Test Materials",
    logicalType: "evaluation-inputs",
    urn: datasetUrn("verity_test_materials"),
    version: "1.0-draft",
    qualityStatus: "curated",
    freshness: "current",
    critical: false,
  }),
  Object.freeze({
    entityId: "external-asset-benchmark",
    name: "verity_benchmark_v1",
    title: "Verity Benchmark v1",
    logicalType: "benchmark",
    urn: datasetUrn("verity_benchmark_v1"),
    version: "1.0-draft",
    qualityStatus: "unverified",
    freshness: "current",
    critical: true,
  }),
  Object.freeze({
    entityId: "external-asset-calibration-job",
    name: "verity_scoring_calibration",
    title: "Verity Scoring Calibration",
    logicalType: "calibration-process",
    urn: datasetUrn("verity_scoring_calibration"),
    version: "0.4.7",
    qualityStatus: "operational",
    freshness: "current",
    critical: false,
  }),
  Object.freeze({
    entityId: "external-asset-results-v047",
    name: "verity_evaluation_results_v047",
    title: "Evaluation Results v0.4.7",
    logicalType: "evaluation-results",
    urn: datasetUrn("verity_evaluation_results_v047"),
    version: "0.4.7",
    qualityStatus: "partially-validated",
    freshness: "current",
    critical: false,
  }),
  Object.freeze({
    entityId: "external-asset-release-evidence",
    name: "verity_release_readiness_evidence",
    title: "Verity Release Readiness Evidence",
    logicalType: "release-evidence",
    urn: datasetUrn("verity_release_readiness_evidence"),
    version: "1.0-draft",
    qualityStatus: "blocked-by-benchmark",
    freshness: "incomplete",
    critical: false,
  }),
]);

export const VERITY_ASSET_BY_ID = new Map(
  VERITY_ASSETS.map((asset) => [asset.entityId, asset]),
);

export const VERITY_ASSET_BY_URN = new Map(
  VERITY_ASSETS.map((asset) => [asset.urn, asset]),
);

export const VERITY_LINEAGE = Object.freeze([
  Object.freeze({ from: "external-asset-rubric", to: "external-asset-benchmark" }),
  Object.freeze({ from: "external-asset-test-materials", to: "external-asset-benchmark" }),
  Object.freeze({ from: "external-asset-benchmark", to: "external-asset-calibration-job" }),
  Object.freeze({ from: "external-asset-calibration-job", to: "external-asset-results-v047" }),
  Object.freeze({ from: "external-asset-results-v047", to: "external-asset-release-evidence" }),
]);

export const VERITY_BENCHMARK_ASSET = VERITY_ASSET_BY_ID.get(
  "external-asset-benchmark",
);
