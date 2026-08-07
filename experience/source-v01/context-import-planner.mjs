import {
  CONTEXT_IMPORT_PLAN_ERROR_CODES_V01,
  CONTEXT_IMPORT_PLAN_VERSION_V01,
  ContextImportPlanError,
  GITHUB_CONTEXT_IMPORT_POLICY_V1,
  validateContextImportPlanV01
} from "./context-import-plan-validator.mjs";
import { SourceAdapterError, validateGitHubSourceSnapshotV01, validateSourceSnapshotV01 } from "./source-snapshot-validator.mjs";

export const GITHUB_CONTEXT_IMPORT_MAPPING_RULES_V1 = Object.freeze({
  repository: "github-repository-state-to-evidence",
  branch: "github-branch-state-to-evidence",
  commit: "github-commit-state-to-evidence",
  issue: "github-issue-state-to-evidence",
  pull_request: "github-pull-request-state-to-evidence",
  release: "github-release-state-to-evidence",
  tag: "github-tag-state-to-evidence"
});
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const safeDetails = details => Object.fromEntries(["candidateId", "sourceRecordId", "field"].filter(key => typeof details?.[key] === "string").map(key => [key, details[key]]));
const fail = (code, message, details = {}) => { throw new ContextImportPlanError(code, message, safeDetails(details)); };
const wrapSnapshotError = error => { if (error instanceof SourceAdapterError) fail("INVALID_SOURCE_SNAPSHOT", "Source Snapshot validation failed"); throw error; };

function validateInput(input) {
  if (!exactKeys(input, ["snapshot", "policyVersion", "projectId", "scopeKey"])) fail("INVALID_IMPORT_PLAN_INPUT", "Planner input shape invalid");
  if (input.policyVersion !== GITHUB_CONTEXT_IMPORT_POLICY_V1) fail("INVALID_POLICY_VERSION", "policyVersion invalid");
  if (typeof input.projectId !== "string" || input.projectId.length === 0 || input.projectId !== input.projectId.trim()) fail("INVALID_PROJECT_ID", "projectId invalid");
  if (typeof input.scopeKey !== "string" || input.scopeKey.length === 0 || input.scopeKey !== input.scopeKey.trim()) fail("INVALID_SCOPE_KEY", "scopeKey invalid");
}
function titleFor(record) {
  if (record.sourceType === "repository") return "GitHub repository observation";
  if (record.sourceType === "branch") return "GitHub default branch observation";
  if (record.sourceType === "commit") return "GitHub commit observation";
  if (record.sourceType === "issue") return "GitHub issue #" + record.payload.number + " observation";
  if (record.sourceType === "pull_request") return "GitHub pull request #" + record.payload.number + " observation";
  if (record.sourceType === "release") return "GitHub release observation";
  if (record.sourceType === "tag") return "GitHub tag observation";
  fail("SOURCE_RECORD_UNMAPPED", "Source Record has no mapping rule", { sourceRecordId: record.sourceRecordId });
}
export function buildClaim(record, repositoryRef) {
  if (record.sourceType === "repository") return "GitHub repository " + repositoryRef + " is " + record.observedState + ".";
  if (record.sourceType === "branch") return "GitHub default branch " + record.payload.name + " points to commit " + record.payload.headSha + ".";
  if (record.sourceType === "commit") return "GitHub commit " + record.payload.sha + " is present.";
  if (record.sourceType === "issue") return "GitHub issue #" + record.payload.number + " is " + record.observedState + ".";
  if (record.sourceType === "pull_request") return "GitHub pull request #" + record.payload.number + " is " + record.observedState + ".";
  if (record.sourceType === "release") return "GitHub release " + record.payload.tagName + " is " + record.observedState + ".";
  if (record.sourceType === "tag") return record.payload.targetSha === null ? "GitHub tag " + record.payload.name + " is present." : "GitHub tag " + record.payload.name + " points to commit " + record.payload.targetSha + ".";
  fail("SOURCE_RECORD_UNMAPPED", "Source Record has no claim mapping", { sourceRecordId: record.sourceRecordId });
}
function buildCandidate(record, snapshot) {
  const mappingRule = GITHUB_CONTEXT_IMPORT_MAPPING_RULES_V1[record.sourceType];
  if (!mappingRule) fail("SOURCE_RECORD_UNMAPPED", "Source Record has no mapping rule", { sourceRecordId: record.sourceRecordId });
  const claim = buildClaim(record, snapshot.scope.repositoryRef);
  return {
    candidateId: "candidate:evidence:" + record.sourceRecordId,
    targetKind: "evidence",
    sourceRecordIds: [record.sourceRecordId],
    mappingRule,
    title: titleFor(record),
    summary: claim,
    proposedPayload: {
      claim,
      sourceRef: record.sourceRecordId,
      observedAt: record.observedAt,
      appliesToVersion: null,
      verificationMethod: "github-source-snapshot-v0.1",
      result: record.observedState
    },
    provenance: {
      provider: snapshot.source.provider,
      reference: record.reference,
      capturedAt: snapshot.capturedAt,
      retrievalMode: snapshot.source.retrievalMode,
      authority: record.authority
    },
    admission: {
      stage: "candidate",
      canonicalWriteAllowed: false,
      confirmationRequirement: "source-authority-sufficient"
    }
  };
}
export function buildContextImportPlanV01(input) {
  validateInput(input);
  let generic;
  try { generic = validateSourceSnapshotV01(input.snapshot); } catch (error) { wrapSnapshotError(error); }
  if (generic.adapter !== "github" || generic.source.provider !== "github") fail("SOURCE_SNAPSHOT_UNSUPPORTED", "Source Snapshot profile unsupported");
  let snapshot;
  try { snapshot = validateGitHubSourceSnapshotV01(generic); } catch (error) { wrapSnapshotError(error); }
  const candidates = snapshot.records.map(record => buildCandidate(record, snapshot));
  const plan = {
    planVersion: CONTEXT_IMPORT_PLAN_VERSION_V01,
    policyVersion: GITHUB_CONTEXT_IMPORT_POLICY_V1,
    generatedAt: snapshot.capturedAt,
    sourceSnapshot: {
      snapshotVersion: snapshot.snapshotVersion,
      adapter: snapshot.adapter,
      capturedAt: snapshot.capturedAt,
      repositoryRef: snapshot.scope.repositoryRef,
      recordIds: snapshot.records.map(record => record.sourceRecordId)
    },
    target: { projectId: input.projectId, scopeKey: input.scopeKey },
    candidates,
    exclusions: [],
    diagnostics: {
      coverageComplete: true,
      sourceRecordCount: snapshot.records.length,
      candidateCount: candidates.length,
      exclusionCount: 0,
      byTargetKind: { evidence: candidates.length },
      byConfirmationRequirement: { "source-authority-sufficient": candidates.length }
    }
  };
  return validateContextImportPlanV01(plan);
}
export const __contextImportPlannerTestInternals = Object.freeze({ clone, exactKeys });

