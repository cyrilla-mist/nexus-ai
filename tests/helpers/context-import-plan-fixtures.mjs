import sourceExample from "../../examples/nexus-atlas-source-snapshot-v0.1.json" with { type: "json" };
import planExample from "../../examples/nexus-atlas-context-import-plan-v0.1.json" with { type: "json" };

export const ALL_RECORD_TYPES = Object.freeze(["repository", "branch", "commit", "issue", "pull_request", "release", "tag"]);
export const CORE_RECORD_TYPES = Object.freeze(["repository", "branch"]);
export const acceptedSnapshot = () => structuredClone(sourceExample.snapshot);
export const acceptedPlan = () => structuredClone(planExample.plan);

export function makeGitHubSnapshot(types = ALL_RECORD_TYPES, sentinels = {}) {
  const snapshot = acceptedSnapshot();
  const wanted = new Set(["repository", "branch", ...types]);
  snapshot.records = snapshot.records.filter(record => wanted.has(record.sourceType));
  if (!ALL_RECORD_TYPES.every(type => types.includes(type))) {
    let commitSeen = false;
    snapshot.records = snapshot.records.filter(record => record.sourceType !== "commit" || !commitSeen++);
  }
  if (sentinels.commit) {
    const record = snapshot.records.find(item => item.sourceType === "commit");
    if (record) record.payload.messageHeadline = sentinels.commit;
  }
  if (sentinels.issue) {
    const record = snapshot.records.find(item => item.sourceType === "issue");
    if (record) record.payload.title = sentinels.issue;
  }
  if (sentinels.pull_request) {
    const record = snapshot.records.find(item => item.sourceType === "pull_request");
    if (record) record.payload.title = sentinels.pull_request;
  }
  if (sentinels.release) {
    const record = snapshot.records.find(item => item.sourceType === "release");
    if (record) record.payload.name = sentinels.release;
  }
  const counts = { commits: 0, issues: 0, pullRequests: 0, releases: 0, tags: 0 };
  for (const record of snapshot.records) {
    if (record.sourceType === "commit") counts.commits++;
    if (record.sourceType === "issue") counts.issues++;
    if (record.sourceType === "pull_request") counts.pullRequests++;
    if (record.sourceType === "release") counts.releases++;
    if (record.sourceType === "tag") counts.tags++;
  }
  snapshot.scope.requestedLimits = counts;
  for (const [key, count] of Object.entries(counts)) snapshot.diagnostics.collections[key] = { requestedLimit: count, appliedLimit: count, itemsRead: count, pagesRead: count ? 1 : 0, truncated: false, continuationAvailable: false };
  return snapshot;
}
export function makePlannerInput(types = ALL_RECORD_TYPES, options = {}) {
  return {
    snapshot: options.snapshot ? structuredClone(options.snapshot) : makeGitHubSnapshot(types, options.sentinels),
    policyVersion: options.policyVersion ?? "github-context-import-policy-v1",
    projectId: options.projectId ?? "project:nexus-atlas",
    scopeKey: options.scopeKey ?? "project:nexus-atlas"
  };
}
export const sourceRecordId = type => makeGitHubSnapshot([type]).records.find(record => record.sourceType === type).sourceRecordId;
