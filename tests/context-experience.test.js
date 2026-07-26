import assert from "node:assert/strict";
import test from "node:test";

import { runNexusCore } from "../core/nexus-core.js";
import {
  createActionView,
  createContextExperience,
  createJourneyView,
  createProjectContext
} from "../experience/index.js";

function sampleInputs() {
  return {
    atlasOutput: {
      currentStage: "Idea",
      ideaProfile: {
        summary: "帮助大学生减少校园一次性用品使用。",
        goal: "形成可以验证的校园环保方案。"
      },
      projectBlueprint: {
        problem: "校园一次性用品使用情况和真实原因尚未验证。"
      }
    },
    memoryContext: {
      projectMemory: [
        {
          id: "project-campus",
          type: "project",
          data: {
            title: "校园环保项目",
            stage: "Explore",
            history: [],
            decisions: [],
            nextActions: [],
            milestones: [],
            progress: ["项目进入 Explore 阶段"]
          }
        }
      ]
    },
    executionState: {
      stage: "Explore",
      status: "active",
      goal: "验证目标用户是否存在真实且值得解决的问题。",
      milestone: {
        id: "milestone-research",
        title: "完成用户需求验证",
        goal: "获得可追溯的校园使用情况证据。",
        status: "in_progress",
        tasks: []
      },
      tasks: [
        {
          id: "task-interviews",
          title: "完成 20 份用户访谈",
          description: "访谈目标用户并记录一次性用品使用原因。",
          rationale: "方案设计前需要确认问题是否真实存在。",
          criteria: "完成并整理 20 份可追溯访谈记录。",
          status: "in_progress"
        }
      ]
    }
  };
}

test("Project Context combines Atlas, Memory, and Execution data", () => {
  const input = sampleInputs();
  const context = createProjectContext(input);

  assert.deepEqual(context, {
    title: "校园环保项目",
    description: "校园一次性用品使用情况和真实原因尚未验证。",
    stage: "Explore",
    goal: "验证目标用户是否存在真实且值得解决的问题。",
    summary: "帮助大学生减少校园一次性用品使用。"
  });
});

test("Journey View represents the current project stage", () => {
  const journey = createJourneyView({ stage: "Validate" });

  assert.deepEqual(
    journey.stages.map(({ name, status }) => ({ name, status })),
    [
      { name: "Idea", status: "completed" },
      { name: "Explore", status: "completed" },
      { name: "Design", status: "completed" },
      { name: "Validate", status: "current" },
      { name: "Execute", status: "next" }
    ]
  );
});

test("Action View preserves rationale and completion criteria", () => {
  const { executionState } = sampleInputs();
  const action = createActionView(executionState);

  assert.equal(action.goal, "获得可追溯的校园使用情况证据。");
  assert.equal(action.actions.length, 1);
  assert.equal(
    action.actions[0].why,
    "方案设计前需要确认问题是否真实存在。"
  );
  assert.equal(
    action.actions[0].criteria,
    "完成并整理 20 份可追溯访谈记录。"
  );
  assert.equal(
    action.criteria,
    "完成并整理 20 份可追溯访谈记录。"
  );
});

test("Context Experience is read-only and does not mutate source data", () => {
  const input = sampleInputs();
  const before = structuredClone(input);
  const experience = createContextExperience(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(experience), true);
  assert.equal(Object.isFrozen(experience.projectOverview), true);
  assert.equal(Object.isFrozen(experience.projectJourney.stages), true);
  assert.equal(Object.isFrozen(experience.actionNavigator.actions), true);
});

test("Context Experience provides stable fallbacks without context", () => {
  const experience = createContextExperience();

  assert.deepEqual(experience.projectOverview, {
    title: "未命名项目",
    description: "无法判断",
    stage: "Idea",
    goal: "无法判断",
    summary: "无法判断"
  });
  assert.equal(experience.projectJourney.stages[0].status, "current");
  assert.equal(experience.actionNavigator.goal, "无法判断");
  assert.deepEqual(experience.actionNavigator.actions, []);
  assert.equal(experience.actionNavigator.criteria, "无法判断");
});

test("Nexus Core exposes the read-only Context Experience projection", async () => {
  const result = await runNexusCore({
    message: "我想做一个校园环保项目",
    context: { turn: 1 }
  });

  assert.equal(result.ok, true);
  assert.ok(result.experience);
  assert.equal(
    result.experience.projectOverview.stage,
    result.response.executionPlan.stage
  );
  assert.equal(result.experience.projectJourney.stages.length, 5);
  assert.ok(result.experience.actionNavigator.actions.length > 0);
});
