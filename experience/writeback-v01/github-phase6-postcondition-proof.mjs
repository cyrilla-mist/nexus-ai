import { validateOutcomeRecordV01 } from "../continuity-loop-v01/outcome-verifier.mjs";
import { validateReentryPackageV01 } from "../continuity-loop-v01/reentry-package.mjs";
import { validateOutcomeCategoryProposalV01 } from "./writeback-outcome-category.mjs";
import {
  buildBoundPostconditionProofV01,
  validateCrossSourcePostconditionProposalV01,
} from "./cross-source-postcondition.mjs";

export const GITHUB_PHASE6_SOURCE_AUTHORITY_V01 = "accepted-phase6-outcome-verification";

export class GitHubPhase6PostconditionProofError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GitHubPhase6PostconditionProofError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

const fail = (code, message, details = {}) => { throw new GitHubPhase6PostconditionProofError(code, message, details); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function acceptedCategory(value) {
  try { return validateOutcomeCategoryProposalV01(value); }
  catch (error) { fail("INVALID_OUTCOME_CATEGORY_PROPOSAL", "categoryProposal failed Phase 7E validation.", { causeCode: error?.code ?? null }); }
}
function acceptedPostcondition(value) {
  try { return validateCrossSourcePostconditionProposalV01(value); }
  catch (error) { fail("INVALID_CROSS_SOURCE_POSTCONDITION", "postconditionProposal failed Phase 7F validation.", { causeCode: error?.code ?? null }); }
}
function acceptedPackage(value) {
  try { return validateReentryPackageV01(value); }
  catch (error) { fail("INVALID_REENTRY_PACKAGE", "reentryPackage failed the frozen Phase 6 validator.", { causeCode: error?.code ?? null }); }
}
function acceptedOutcome(value) {
  try { return validateOutcomeRecordV01(value); }
  catch (error) { fail("INVALID_PHASE6_OUTCOME", "outcome failed the frozen Phase 6 validator.", { causeCode: error?.code ?? null }); }
}

function resultFor(state) {
  if (state === "verified") return "satisfied";
  if (state === "failed") return "not-satisfied";
  return "unknown";
}

function observedValue(outcome) {
  if (outcome.expectedPostcondition.conditionType === "github-default-branch-head-advanced") {
    return outcome.observedPostcondition.observedHead;
  }
  return outcome.observedPostcondition.expectedValueObserved === true
    ? outcome.expectedPostcondition.expectedValue
    : null;
}

export function buildGitHubPhase6PostconditionProofV01({
  categoryProposal,
  postconditionProposal,
  reentryPackage,
  outcome,
} = {}) {
  const category = acceptedCategory(categoryProposal);
  const postcondition = acceptedPostcondition(postconditionProposal);
  const pkg = acceptedPackage(reentryPackage);
  const accepted = acceptedOutcome(outcome);

  if (category.category !== "action-execution") fail("CATEGORY_SOURCE_PROFILE_MISMATCH", "Frozen Phase 6 Outcome may prove only action-execution.");
  if (postcondition.provider !== "github" || postcondition.profile !== "phase6-outcome-v0.1") fail("SOURCE_PROFILE_MISMATCH", "GitHub Phase 6 adapter requires the github/phase6-outcome-v0.1 profile.");
  if (
    postcondition.categoryProposalRef !== category.proposalId
    || postcondition.projectRef !== category.projectRef
    || postcondition.subjectRef !== category.subjectRef
    || category.subjectRef !== accepted.actionRef
    || pkg.projectRef !== category.projectRef
    || accepted.projectRef !== category.projectRef
    || accepted.reentryRef !== pkg.packageId
    || pkg.nextAction.actionRef !== accepted.actionRef
    || postcondition.scopeRef !== pkg.verificationPlan.scopeRef
  ) fail("GITHUB_PHASE6_BINDING_MISMATCH", "Category, postcondition, Re-entry Package and Outcome do not bind the same action/project/scope.");
  if (pkg.verificationPlan.provider !== "github") fail("SOURCE_PROFILE_MISMATCH", "Re-entry Package verification provider is not GitHub.");
  if (!same(postcondition.condition, accepted.expectedPostcondition)) fail("GITHUB_PHASE6_BINDING_MISMATCH", "Cross-source postcondition does not match the frozen Phase 6 Outcome expected postcondition.");

  return buildBoundPostconditionProofV01({
    postconditionProposal: postcondition,
    observedAt: accepted.recordedAt,
    result: resultFor(accepted.verificationState),
    observedValue: observedValue(accepted),
    evidenceRefs: accepted.verificationEvidenceRefs,
    sourceAuthority: GITHUB_PHASE6_SOURCE_AUTHORITY_V01,
  });
}
