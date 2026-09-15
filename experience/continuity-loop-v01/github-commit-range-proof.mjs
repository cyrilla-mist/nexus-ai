import { createHash } from "node:crypto";

import {
  isStrictOffsetIsoV01,
  normalizeRepositoryRefV01,
} from "../source-v01/source-snapshot-validator.mjs";

export const GITHUB_COMMIT_RANGE_PROOF_VERSION_V01 = "nexus-atlas.github-commit-range-proof.v0.1";
export const GITHUB_COMMIT_RANGE_MAX_V01 = 20;

const RELATIONS = new Set(["identical", "ahead", "behind", "diverged"]);
const PROOF_KEYS = [
  "proofVersion",
  "proofId",
  "provider",
  "repositoryRef",
  "baseSha",
  "headSha",
  "capturedAt",
  "relation",
  "aheadBy",
  "behindBy",
  "commits",
  "complete",
  "diagnostics",
];
const DIAGNOSTIC_KEYS = ["requestedLimit", "itemsRead", "continuationAvailable"];
const PROVIDER_KEYS = ["relation", "aheadBy", "behindBy", "commits", "continuationAvailable"];
const PROVIDER_COMMIT_KEYS = ["sha", "authoredAt", "committedAt", "messageHeadline"];
const RECORD_KEYS = ["sourceRecordId", "sourceType", "externalId", "observedState", "observedAt", "reference", "authority", "payload"];
const SHA = /^[0-9a-f]{40}$/;

export class GitHubCommitRangeProofError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GitHubCommitRangeProofError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => Array.isArray(value) ? value.map(clone) : object(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const fail = (code, message, details = {}) => { throw new GitHubCommitRangeProofError(code, message, details); };
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const validSha = value => typeof value === "string" && SHA.test(value);
const validCount = value => Number.isSafeInteger(value) && value >= 0;
const validLimit = value => Number.isSafeInteger(value) && value > 0 && value <= GITHUB_COMMIT_RANGE_MAX_V01;

function normalizedRepositoryRef(value, code) {
  let normalized;
  try {
    normalized = normalizeRepositoryRefV01(value);
  } catch {
    fail(code, "repositoryRef is invalid.");
  }
  if (normalized !== value) fail(code, "repositoryRef must already be normalized.");
  return normalized;
}

function validateRequestedInput({ repositoryRef, baseSha, headSha, capturedAt, limit } = {}) {
  const ref = normalizedRepositoryRef(repositoryRef, "INVALID_COMMIT_RANGE_INPUT");
  if (!validSha(baseSha)) fail("INVALID_COMMIT_RANGE_INPUT", "baseSha must be an exact lowercase 40-character SHA.");
  if (!validSha(headSha)) fail("INVALID_COMMIT_RANGE_INPUT", "headSha must be an exact lowercase 40-character SHA.");
  if (!isStrictOffsetIsoV01(capturedAt)) fail("INVALID_COMMIT_RANGE_INPUT", "capturedAt must be a strict offset ISO timestamp.");
  if (!validLimit(limit)) fail("INVALID_COMMIT_RANGE_INPUT", `limit must be an integer from 1 to ${GITHUB_COMMIT_RANGE_MAX_V01}.`);
  return { repositoryRef: ref, baseSha, headSha, capturedAt, limit };
}

function validateProviderCommit(raw, repositoryRef) {
  if (!exact(raw, PROVIDER_COMMIT_KEYS)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commit field set is invalid.");
  if (!validSha(raw.sha)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commit SHA is invalid.");
  if (raw.authoredAt !== null && !isStrictOffsetIsoV01(raw.authoredAt)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commit authoredAt is invalid.");
  if (!isStrictOffsetIsoV01(raw.committedAt)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commit committedAt is invalid.");
  if (typeof raw.messageHeadline !== "string" || raw.messageHeadline.length === 0 || /[\r\n]/.test(raw.messageHeadline)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commit headline is invalid.");
  const payload = {
    sha: raw.sha,
    authoredAt: raw.authoredAt,
    committedAt: raw.committedAt,
    messageHeadline: raw.messageHeadline,
  };
  return {
    sourceRecordId: `github:commit:${repositoryRef}:${raw.sha}`,
    sourceType: "commit",
    externalId: raw.sha,
    observedState: "present",
    observedAt: raw.committedAt,
    reference: `https://github.com/${repositoryRef}/commit/${raw.sha}`,
    authority: "github-commit-state",
    payload,
  };
}

function validateRelationSemantics({ relation, aheadBy, behindBy, commits, continuationAvailable, baseSha, headSha, limit }, code) {
  if (!RELATIONS.has(relation)) fail(code, "commit relation is invalid.");
  if (!validCount(aheadBy) || !validCount(behindBy)) fail(code, "aheadBy and behindBy must be non-negative integers.");
  if (!Array.isArray(commits)) fail(code, "commits must be an array.");
  if (typeof continuationAvailable !== "boolean") fail(code, "continuationAvailable must be boolean.");

  if (relation === "identical") {
    if (baseSha !== headSha || aheadBy !== 0 || behindBy !== 0 || commits.length !== 0 || continuationAvailable) fail(code, "identical relation is inconsistent.");
    return true;
  }
  if (baseSha === headSha) fail(code, "non-identical relation cannot use identical base/head SHAs.");
  if (relation === "ahead" && !(aheadBy > 0 && behindBy === 0)) fail(code, "ahead relation is inconsistent.");
  if (relation === "behind" && !(aheadBy === 0 && behindBy > 0)) fail(code, "behind relation is inconsistent.");
  if (relation === "diverged" && !(aheadBy > 0 && behindBy > 0)) fail(code, "diverged relation is inconsistent.");

  if (relation === "behind") {
    if (commits.length !== 0 || continuationAvailable) fail(code, "behind relation cannot expose head-side commits or continuation.");
    return true;
  }

  const expectedItems = Math.min(aheadBy, limit);
  if (commits.length !== expectedItems) fail(code, "head-side commit count does not match the bounded relation.");
  const complete = aheadBy <= limit;
  if (complete && continuationAvailable) fail(code, "complete head-side relation cannot expose continuation.");
  if (!complete && !continuationAvailable) fail(code, "truncated head-side relation must expose continuation.");
  if (complete && commits.at(-1)?.payload?.sha !== headSha) fail(code, "complete head-side range must terminate at headSha.");
  return complete;
}

function proofPayload(proof) {
  return {
    proofVersion: proof.proofVersion,
    provider: proof.provider,
    repositoryRef: proof.repositoryRef,
    baseSha: proof.baseSha,
    headSha: proof.headSha,
    capturedAt: proof.capturedAt,
    relation: proof.relation,
    aheadBy: proof.aheadBy,
    behindBy: proof.behindBy,
    commits: proof.commits,
    complete: proof.complete,
    diagnostics: proof.diagnostics,
  };
}

export function validateGitHubCommitRangeProofV01(proof) {
  if (!exact(proof, PROOF_KEYS)) fail("INVALID_COMMIT_RANGE_PROOF", "proof field set is invalid.");
  if (proof.proofVersion !== GITHUB_COMMIT_RANGE_PROOF_VERSION_V01 || proof.provider !== "github") fail("INVALID_COMMIT_RANGE_PROOF", "proof version/provider is invalid.");
  normalizedRepositoryRef(proof.repositoryRef, "INVALID_COMMIT_RANGE_PROOF");
  if (!validSha(proof.baseSha) || !validSha(proof.headSha)) fail("INVALID_COMMIT_RANGE_PROOF", "proof base/head SHA is invalid.");
  if (!isStrictOffsetIsoV01(proof.capturedAt)) fail("INVALID_COMMIT_RANGE_PROOF", "proof capturedAt is invalid.");
  if (!Array.isArray(proof.commits)) fail("INVALID_COMMIT_RANGE_PROOF", "proof commits must be an array.");
  if (!exact(proof.diagnostics, DIAGNOSTIC_KEYS) || !validLimit(proof.diagnostics.requestedLimit) || !validCount(proof.diagnostics.itemsRead) || typeof proof.diagnostics.continuationAvailable !== "boolean") fail("INVALID_COMMIT_RANGE_PROOF", "proof diagnostics are invalid.");
  if (proof.diagnostics.itemsRead !== proof.commits.length) fail("INVALID_COMMIT_RANGE_PROOF", "proof diagnostics mismatch.");

  const seen = new Set();
  for (const record of proof.commits) {
    if (!exact(record, RECORD_KEYS) || record.sourceType !== "commit" || record.authority !== "github-commit-state" || record.observedState !== "present") fail("INVALID_COMMIT_RANGE_PROOF", "proof commit record is invalid.");
    if (!exact(record.payload, PROVIDER_COMMIT_KEYS) || !validSha(record.payload.sha) || record.externalId !== record.payload.sha || record.sourceRecordId !== `github:commit:${proof.repositoryRef}:${record.payload.sha}` || record.reference !== `https://github.com/${proof.repositoryRef}/commit/${record.payload.sha}` || record.observedAt !== record.payload.committedAt) fail("INVALID_COMMIT_RANGE_PROOF", "proof commit identity is invalid.");
    if (record.payload.authoredAt !== null && !isStrictOffsetIsoV01(record.payload.authoredAt)) fail("INVALID_COMMIT_RANGE_PROOF", "proof commit authoredAt is invalid.");
    if (!isStrictOffsetIsoV01(record.payload.committedAt) || typeof record.payload.messageHeadline !== "string" || record.payload.messageHeadline.length === 0 || /[\r\n]/.test(record.payload.messageHeadline)) fail("INVALID_COMMIT_RANGE_PROOF", "proof commit payload is invalid.");
    if (seen.has(record.payload.sha)) fail("INVALID_COMMIT_RANGE_PROOF", "duplicate commit SHA in proof.");
    seen.add(record.payload.sha);
  }

  const derivedComplete = validateRelationSemantics({
    relation: proof.relation,
    aheadBy: proof.aheadBy,
    behindBy: proof.behindBy,
    commits: proof.commits,
    continuationAvailable: proof.diagnostics.continuationAvailable,
    baseSha: proof.baseSha,
    headSha: proof.headSha,
    limit: proof.diagnostics.requestedLimit,
  }, "INVALID_COMMIT_RANGE_PROOF");
  if (proof.complete !== derivedComplete) fail("INVALID_COMMIT_RANGE_PROOF", "proof completeness does not match bounded relation semantics.");
  const expectedProofId = `github-range:${digest(proofPayload(proof)).slice(0, 24)}`;
  if (proof.proofId !== expectedProofId) fail("INVALID_COMMIT_RANGE_PROOF", "proofId does not bind the normalized proof payload.");
  return deepFreeze(clone(proof));
}

export function createGitHubCommitRangeReader({ client } = {}) {
  if (!client || typeof client !== "object" || typeof client.compareCommits !== "function") fail("INVALID_COMMIT_RANGE_OPTIONS", "client.compareCommits read boundary is required.");

  const readCommitRange = async input => {
    const request = validateRequestedInput(input);
    let raw;
    try {
      raw = await client.compareCommits({
        repositoryRef: request.repositoryRef,
        baseSha: request.baseSha,
        headSha: request.headSha,
        limit: request.limit,
      });
    } catch (error) {
      if (error instanceof GitHubCommitRangeProofError) throw error;
      fail("COMMIT_RANGE_SOURCE_UNAVAILABLE", "compareCommits source read failed.", { repositoryRef: request.repositoryRef });
    }
    if (!exact(raw, PROVIDER_KEYS)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider compare response field set is invalid.");
    if (!Array.isArray(raw.commits)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider commits must be an array.");

    const commits = raw.commits.map(item => validateProviderCommit(item, request.repositoryRef));
    const seen = new Set();
    for (const record of commits) {
      if (seen.has(record.payload.sha)) fail("INVALID_COMMIT_RANGE_RESPONSE", "provider returned duplicate commit SHAs.");
      seen.add(record.payload.sha);
    }
    const complete = validateRelationSemantics({
      relation: raw.relation,
      aheadBy: raw.aheadBy,
      behindBy: raw.behindBy,
      commits,
      continuationAvailable: raw.continuationAvailable,
      baseSha: request.baseSha,
      headSha: request.headSha,
      limit: request.limit,
    }, "INVALID_COMMIT_RANGE_RESPONSE");

    const payload = {
      proofVersion: GITHUB_COMMIT_RANGE_PROOF_VERSION_V01,
      provider: "github",
      repositoryRef: request.repositoryRef,
      baseSha: request.baseSha,
      headSha: request.headSha,
      capturedAt: request.capturedAt,
      relation: raw.relation,
      aheadBy: raw.aheadBy,
      behindBy: raw.behindBy,
      commits,
      complete,
      diagnostics: {
        requestedLimit: request.limit,
        itemsRead: commits.length,
        continuationAvailable: raw.continuationAvailable,
      },
    };
    return validateGitHubCommitRangeProofV01({
      ...payload,
      proofId: `github-range:${digest(payload).slice(0, 24)}`,
    });
  };

  return Object.freeze({ provider: "github", readCommitRange });
}
