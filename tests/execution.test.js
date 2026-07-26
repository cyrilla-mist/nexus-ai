import assert from "node:assert/strict";
import test from "node:test";

import { runProjectAtlas } from "../atlas/project-atlas/index.js";
import { createExecutionPlan } from "../execution/index.js";
import {
  addTaskToMilestone,
  createMilestone,
  updateMilestoneStatus
} from "../execution/milestone.js";
import {
  createProjectState,
  getProjectState,
  updateProjectState
} from "../execution/project-state.js";
import {
  createTask,
  updateTaskStatus
} from "../execution/task.js";

const CREATED_AT = "2026-07-26T14:00:00.000Z";
const UPDATED_AT = "2026-07-26T14:05:00.000Z";

function sampleTask(overrides = {}) {
  return createTask({
    id: "task-1",
    title: "访谈目标用户",
    description: "与目标用户讨论当前问题和已有替代方案。",
    rationale: "项目需要真实需求证据后才能进入方案设计。",
    criteria: "完成访谈并记录问题、证据和待验证假设。",
    ...overrides
  });
}

test("Project State can be created, queried, and updated", () => {
  const state = createProjectState({
    stage: "Idea",
    goal: "明确项目问题和目标用户。",
    timestamp: CREATED_AT
  });
  const updated = updateProjectState(
    state,
    {
      stage: "Explore",
      goal: "验证目标用户的真实需求。"
    },
    UPDATED_AT
  );
  const queried = getProjectState(updated);

  queried.goal = "changed outside";

  assert.equal(state.stage, "Idea");
  assert.equal(updated.stage, "Explore");
  assert.equal(updated.status, "active");
  assert.equal(updated.createdAt, CREATED_AT);
  assert.equal(updated.updatedAt, UPDATED_AT);
  assert.equal(
    getProjectState(updated).goal,
    "验证目标用户的真实需求。"
  );
});

test("Milestone can be created and receive a verifiable Task", () => {
  const milestone = createMilestone({
    id: "milestone-1",
    title: "完成问题验证",
    goal: "确认目标用户是否存在真实问题。"
  });
  const updated = addTaskToMilestone(milestone, sampleTask());

  assert.equal(milestone.status, "pending");
  assert.equal(milestone.tasks.length, 0);
  assert.equal(updated.tasks.length, 1);
  assert.equal(updated.tasks[0].rationale.includes("真实需求证据"), true);
  assert.ok(updated.tasks[0].criteria);
});

test("Task requires purpose and completion criteria", () => {
  const task = sampleTask();

  assert.equal(task.status, "todo");
  assert.ok(task.rationale);
  assert.ok(task.criteria);
  assert.throws(
    () =>
      createTask({
        id: "invalid-task",
        title: "只有标题",
        description: "缺少为什么做和完成标准。"
      }),
    /rationale/
  );
});

test("Milestone and Task statuses move through the supported sequence", () => {
  const pending = createMilestone({
    id: "milestone-1",
    title: "完成问题验证",
    goal: "确认目标用户是否存在真实问题。"
  });
  const inProgress = updateMilestoneStatus(pending, "in_progress");
  const completed = updateMilestoneStatus(inProgress, "completed");
  const todo = sampleTask();
  const taskInProgress = updateTaskStatus(todo, "in_progress");
  const taskCompleted = updateTaskStatus(taskInProgress, "completed");

  assert.equal(pending.status, "pending");
  assert.equal(inProgress.status, "in_progress");
  assert.equal(completed.status, "completed");
  assert.equal(todo.status, "todo");
  assert.equal(taskInProgress.status, "in_progress");
  assert.equal(taskCompleted.status, "completed");
  assert.throws(
    () => updateMilestoneStatus(pending, "completed"),
    /Invalid Milestone status transition/
  );
  assert.throws(
    () => updateTaskStatus(todo, "completed"),
    /Invalid Task status transition/
  );
});

test("Execution Plan reflects the current stage and next action", () => {
  const plan = createExecutionPlan({
    stage: "Explore",
    analysis: {
      projectBlueprint: {
        milestones: ["完成 5 名目标用户访谈"]
      },
      nextAction: "准备访谈提纲并邀请第一名受访者。"
    },
    turn: 2,
    timestamp: CREATED_AT
  });

  assert.equal(plan.stage, "Explore");
  assert.equal(plan.status, "active");
  assert.equal(plan.milestone.title, "完成 5 名目标用户访谈");
  assert.equal(plan.milestone.status, "pending");
  assert.equal(plan.tasks.length, 1);
  assert.equal(plan.tasks[0].status, "todo");
  assert.equal(
    plan.tasks[0].title,
    "准备访谈提纲并邀请第一名受访者。"
  );
});

test("Project Atlas output includes Execution Plan without removing existing fields", async () => {
  const result = await runProjectAtlas({
    message: "我想做一个校园环保项目",
    context: { turn: 1 }
  });

  assert.ok(result.ideaProfile);
  assert.ok(result.projectBlueprint);
  assert.ok(Array.isArray(result.risks));
  assert.ok(Array.isArray(result.clarificationQuestions));
  assert.equal(result.executionPlan.stage, result.currentStage);
  assert.equal(result.executionPlan.milestone.status, "pending");
  assert.equal(result.executionPlan.tasks[0].status, "todo");
  assert.ok(result.executionPlan.tasks[0].rationale);
  assert.ok(result.executionPlan.tasks[0].criteria);
});
