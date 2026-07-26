import assert from "node:assert/strict";
import test from "node:test";

import { runNexusCore } from "../core/nexus-core.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { MemoryStore } from "../memory/memory-store.js";
import worker from "../worker/index.js";

const INITIAL_MESSAGE = "我想做校园环保项目";
const CREATED_AT = "2026-07-26T12:00:00.000Z";
const UPDATED_AT = "2026-07-26T12:05:00.000Z";

function createExperienceManager() {
  return new MemoryManager({
    store: new MemoryStore(),
    idGenerator: () => "project-campus",
    clock: (() => {
      const timestamps = [
        CREATED_AT,
        UPDATED_AT,
        UPDATED_AT,
        UPDATED_AT
      ];
      let index = 0;

      return () => timestamps[index++] ?? UPDATED_AT;
    })()
  });
}

async function postToWorker(payload) {
  const response = await worker.fetch(
    new Request("https://nexus.test/api/nexus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  return body;
}

test("initial project analysis creates Project Memory", async () => {
  const memoryManager = createExperienceManager();
  const result = await runNexusCore(
    {
      message: INITIAL_MESSAGE,
      context: { turn: 1 }
    },
    { memoryManager }
  );
  const stored = memoryManager.retrieve(result.memoryUpdate.projectId);

  assert.equal(result.ok, true);
  assert.equal(result.reflection.passed, true);
  assert.equal(result.memoryUpdate.created, true);
  assert.equal(result.memoryUpdate.projectId, "project-campus");
  assert.equal(stored.type, "project");
  assert.equal(stored.data.title, INITIAL_MESSAGE);
  assert.equal(stored.data.stage, result.response.currentStage);
});

test("second project turn reads the Project Memory created by the first turn", async () => {
  const memoryManager = createExperienceManager();
  const first = await runNexusCore(
    {
      message: INITIAL_MESSAGE,
      context: { turn: 1 }
    },
    { memoryManager }
  );
  const contextBeforeSecondTurn = memoryManager.retrieveContext({
    projectId: first.memoryUpdate.projectId,
    atlasId: "project-atlas"
  });
  const second = await runNexusCore(
    {
      message: "继续完善这个项目",
      context: {
        projectId: first.memoryUpdate.projectId,
        turn: 2
      }
    },
    { memoryManager }
  );

  assert.equal(contextBeforeSecondTurn.projectMemory.length, 1);
  assert.equal(
    contextBeforeSecondTurn.projectMemory[0].data.title,
    INITIAL_MESSAGE
  );
  assert.equal(second.ok, true);
  assert.equal(second.memoryUpdate.created, false);
  assert.equal(second.response.ideaProfile.summary, INITIAL_MESSAGE);
});

test("low-confidence candidate cannot contaminate experience Memory", () => {
  const memoryManager = createExperienceManager();
  const memory = memoryManager.create({
    id: "project-campus",
    type: "project",
    data: {
      title: INITIAL_MESSAGE,
      stage: "Idea"
    }
  });
  const result = memoryManager.updateMemoryFromCandidate({
    candidateId: "project-campus:decision:model-guess",
    recordId: "project-campus",
    type: "project",
    category: "decision",
    content: "该项目一定会获得大量用户",
    confidence: "low",
    source: "model_guess"
  });

  assert.equal(result.updated, false);
  assert.equal(result.policy.reason, "insufficient_confidence");
  assert.deepEqual(memoryManager.retrieve(memory.id), memory);
});

test("Create, Retrieve, Analyze, Update, and Retrieve Again form one flow", async () => {
  const memoryManager = createExperienceManager();
  const first = await runNexusCore(
    {
      message: INITIAL_MESSAGE,
      context: { turn: 1 }
    },
    { memoryManager }
  );
  const projectId = first.memoryUpdate.projectId;
  const retrieved = memoryManager.retrieveContext({
    projectId,
    atlasId: "project-atlas"
  });

  assert.equal(retrieved.projectMemory.length, 1);

  const second = await runNexusCore(
    {
      message: "继续完善这个项目",
      context: {
        projectId,
        turn: 2,
        clarificationAnswers: [
          {
            question: "你最想帮助的具体用户是谁？",
            answer: "在校大学生"
          }
        ]
      }
    },
    { memoryManager }
  );
  const retrievedAgain = memoryManager.retrieveContext({
    projectId,
    atlasId: "project-atlas"
  });
  const projectMemory = retrievedAgain.projectMemory[0];

  assert.equal(second.ok, true);
  assert.equal(second.memoryUpdate.created, false);
  assert.ok(second.memoryUpdate.applied >= 1);
  assert.equal(projectMemory.data.title, INITIAL_MESSAGE);
  assert.equal(projectMemory.data.decisions.length, 1);
  assert.equal(projectMemory.data.decisions[0].answer, "在校大学生");
  assert.ok(projectMemory.data.history.length >= 2);
});

test("Worker carries the created projectId into a later Memory retrieval", async () => {
  const first = await postToWorker({
    message: "我想做校园节水项目",
    context: { turn: 1 }
  });
  const projectId = first.memoryUpdate.projectId;
  const second = await postToWorker({
    message: "继续完善这个项目",
    context: {
      projectId,
      turn: 2
    }
  });

  assert.ok(projectId);
  assert.equal(first.memoryUpdate.created, true);
  assert.equal(second.memoryUpdate.projectId, projectId);
  assert.equal(second.memoryUpdate.created, false);
  assert.equal(
    second.response.ideaProfile.summary,
    "我想做校园节水项目"
  );
});
