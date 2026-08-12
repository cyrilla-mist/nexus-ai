import graphExample from "../../examples/nexus-atlas-self-context-v0.2.json" with { type: "json" };
import admissionExample from "../../examples/nexus-atlas-canonical-admission-v0.1.json" with { type: "json" };
import { buildContextImportPlanV01 } from "../../experience/source-v01/context-import-planner.mjs";
import { makePlannerInput, makeGitHubSnapshot } from "./context-import-plan-fixtures.mjs";

export const acceptedGraph = () => structuredClone(graphExample);
export const acceptedAdmissionExample = () => structuredClone(admissionExample);
export const acceptedPlan = () => structuredClone(admissionExample);
export function planFor(types, options = {}) { return buildContextImportPlanV01(makePlannerInput(types, options)); }
export function authorizedIds(plan, predicate = () => true) { return plan.candidates.filter(predicate).map(candidate => candidate.candidateId); }
export function candidateOf(plan, sourceType) { return plan.candidates.find(candidate => candidate.sourceRecordIds[0].includes(`github:${sourceType}:`)); }
export function planWithCapture(types, capturedAt) { const snapshot = makeGitHubSnapshot(types); snapshot.capturedAt = capturedAt; return planFor(types, { snapshot }); }
