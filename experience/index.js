import { createActionView } from "./action-view.js";
import { createContextMap } from "./context-map.js";
import { createJourneyView } from "./journey-view.js";
import { createProjectContext } from "./project-context.js";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createContextExperience({
  atlasOutput = {},
  memoryContext = {},
  executionState
} = {}) {
  const atlas = isPlainObject(atlasOutput) ? atlasOutput : {};
  const execution = isPlainObject(executionState)
    ? executionState
    : isPlainObject(atlas.executionPlan)
      ? atlas.executionPlan
      : {};

  return Object.freeze({
    projectOverview: createProjectContext({
      atlasOutput: atlas,
      memoryContext,
      executionState: execution
    }),
    projectJourney: createJourneyView(execution),
    actionNavigator: createActionView(execution),
    contextMap: createContextMap({
      atlasOutput: atlas,
      memoryContext,
      executionState: execution
    })
  });
}

export {
  createActionView,
  createContextMap,
  createJourneyView,
  createProjectContext
};
