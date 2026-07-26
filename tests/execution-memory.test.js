import assert from "node:assert/strict";
import test from "node:test";

import { runNexusCore } from "../core/nexus-core.js";
import { reflectOnExecutionProgress } from "../execution/progress-reflection.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { evaluateMemoryCandidate } from "../memory/memory-policy.js";
import { MemoryStore } from "../memory/memory-store.js";
import { createProgressMemoryCandidates } from "../memory/progress-candidate.js";

const CREATED_AT = "2026-07-26T16:00:00.000Z";
const UPDATED_AT = "2026-07-26T16:05:00.000Z";

function createManager() {
  let clockIndex = 0;
  const timestamps = [
    CREATED_AT,
    UPDATED_AT,
    UPDATED_AT,
    UPDATED_AT,
    UPDATED_AT,
    UPDATED_AT
  ];

  return new MemoryManager({
    store: new MemoryStore(),
    clock: () => timestamps[clockIndex++] ?? UPDATED_AT
  });
}

function createProjectMemory(manager) {
  return manager.create({
    id: "project-campus",
    type: "project",
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });
}

function confirmedProgress(overrides = {}) {
  return {
    confirmed: true,
    stage: "Explore",
    milestone: {
      id: "milestone-user-research",
      title: "完成用户需求验证",
      status: "completed"
    },
    tasks: [
      {
        id: "task-interviews",
        title: "完成 20 份用户访谈",
        criteria: "已记录 20 份访谈结果并归纳真实问题。",
        status: "completed"
      },
      {
        id: "task-next",
        title: "整理下一阶段方案",
        criteria: "形成可评审的方案摘要。",
        status: "todo"
      }
    ],
    ...overrides
  };
}

test("confirmed stage transition generates a Progress Candidate", () => {
  const reflection = reflectOnExecutionProgress(
    confirmedProgress({
      milestone: null,
      tasks: []
    })
  );
  const candidates = createProgressMemoryCandidates({
    projectId: "project-campus",
    progressReflection: reflection,
    currentProjectMemory: {
      id: "project-campus",
      type: "project",
      data: { stage: "Idea" }
    },
    turn: 2,
    clock: () => CREATED_AT
  });

  assert.equal(reflection.passed, true);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].category, "progress");
  assert.equal(candidates[0].content.kind, "stage_change");
  assert.equal(candidates[0].content.from, "Idea");
  assert.equal(candidates[0].content.to, "Explore");
});

test("completed Milestone enters Project Memory", () => {
  const manager = createManager();
  const memory = createProjectMemory(manager);
  const reflection = reflectOnExecutionProgress(
    confirmedProgress({
      stage: "Idea",
      tasks: []
    })
  );
  const candidate = createProgressMemoryCandidates({
    projectId: memory.id,
    progressReflection: reflection,
    currentProjectMemory: memory,
    turn: 2,
    clock: () => CREATED_AT
  })[0];
  const result = manager.updateMemoryFromCandidate(candidate);
  const stored = manager.retrieve(memory.id);

  assert.equal(result.updated, true);
  assert.deepEqual(stored.data.milestones, ["完成用户需求验证"]);
  assert.ok(
    stored.data.progress.includes("完成里程碑：完成用户需求验证")
  );
});

test("unfinished Task does not produce a Progress Candidate", () => {
  const manager = createManager();
  const memory = createProjectMemory(manager);
  const before = manager.retrieve(memory.id);
  const reflection = reflectOnExecutionProgress(
    confirmedProgress({
      stage: "Idea",
      milestone: null,
      tasks: [
        {
          id: "task-next",
          title: "整理下一阶段方案",
          criteria: "形成可评审的方案摘要。",
          status: "todo"
        }
      ]
    })
  );
  const candidates = createProgressMemoryCandidates({
    projectId: memory.id,
    progressReflection: reflection,
    currentProjectMemory: memory,
    turn: 2
  });

  assert.deepEqual(candidates, []);
  assert.deepEqual(manager.retrieve(memory.id), before);
});

test("Memory Policy rejects low-confidence or guessed progress", () => {
  const base = {
    candidateId: "project-campus:progress:stage",
    recordId: "project-campus",
    type: "project",
    category: "progress",
    content: {
      kind: "stage_change",
      from: "Idea",
      to: "Explore",
      summary: "项目进入 Explore 阶段"
    },
    confidence: "high",
    source: "execution_confirmed"
  };

  assert.equal(evaluateMemoryCandidate(base).allowed, true);
  assert.equal(
    evaluateMemoryCandidate({
      ...base,
      confidence: "low"
    }).reason,
    "insufficient_confidence"
  );
  assert.equal(
    evaluateMemoryCandidate({
      ...base,
      source: "model_guess"
    }).reason,
    "progress_requires_execution_confirmation"
  );
});

test("Execution progress survives Memory Update and Retrieve Again", async () => {
  const manager = createManager();
  const memory = createProjectMemory(manager);
  const first = await runNexusCore(
    {
      message: "继续完善校园环保项目",
      context: {
        projectId: memory.id,
        turn: 2,
        progressContext: confirmedProgress()
      }
    },
    {
      memoryManager: manager
    }
  );
  const retrieved = manager.retrieveContext({
    projectId: memory.id,
    atlasId: "project-atlas"
  });
  const stored = retrieved.projectMemory[0];

  assert.equal(first.ok, true);
  assert.equal(first.progressReflection.passed, true);
  assert.equal(first.progressMemoryUpdate.applied, 3);
  assert.equal(stored.data.stage, "Explore");
  assert.deepEqual(stored.data.milestones, ["完成用户需求验证"]);
  assert.ok(stored.data.progress.includes("项目进入 Explore 阶段"));
  assert.ok(
    stored.data.progress.includes("完成关键任务：完成 20 份用户访谈")
  );
  assert.ok(
    !stored.data.progress.some((item) => item.includes("整理下一阶段方案"))
  );

  const second = await runNexusCore(
    {
      message: "继续完善校园环保项目",
      context: {
        projectId: memory.id,
        turn: 3
      }
    },
    {
      memoryManager: manager
    }
  );

  assert.equal(second.response.executionPlan.stage, "Explore");
  assert.equal(manager.retrieve(memory.id).data.stage, "Explore");
});
