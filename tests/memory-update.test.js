import assert from "node:assert/strict";
import test from "node:test";

import { runNexusCore } from "../core/nexus-core.js";
import { createProjectMemoryCandidates } from "../memory/memory-candidate.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { evaluateMemoryCandidate } from "../memory/memory-policy.js";
import { MemoryStore } from "../memory/memory-store.js";
import { MEMORY_TYPES } from "../memory/schema.js";

const CREATED_AT = "2026-07-26T10:00:00.000Z";
const UPDATED_AT = "2026-07-26T10:05:00.000Z";

function createManager() {
  const timestamps = [CREATED_AT, UPDATED_AT, UPDATED_AT, UPDATED_AT];
  let timestampIndex = 0;

  return new MemoryManager({
    store: new MemoryStore(),
    clock: () => timestamps[timestampIndex++] ?? UPDATED_AT
  });
}

function createCandidate(overrides = {}) {
  return {
    candidateId: "project-1:decision:turn-2:answer-1",
    recordId: "project-1",
    type: "project",
    category: "decision",
    content: {
      question: "目标用户是谁？",
      answer: "大学生"
    },
    confidence: "high",
    source: "user_confirmed",
    evidence: [
      {
        kind: "clarification_answer",
        reference: "turn-2"
      }
    ],
    turn: 2,
    createdAt: CREATED_AT,
    ...overrides
  };
}

test("generates Project Memory candidates from reflected project context", () => {
  const candidates = createProjectMemoryCandidates({
    projectId: "project-1",
    atlasResult: {
      currentStage: "Explore",
      model: { mode: "deepseek" }
    },
    reflection: { passed: true },
    context: {
      turn: 2,
      clarificationAnswers: [
        {
          question: "目标用户是谁？",
          answer: "大学生"
        }
      ],
      memoryContext: {
        projectMemory: [
          {
            id: "project-1",
            type: "project",
            data: { stage: "Idea" }
          }
        ]
      }
    },
    clock: () => CREATED_AT
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].category, "decision");
  assert.equal(candidates[0].source, "user_confirmed");
  assert.equal(candidates[0].content.answer, "大学生");
  assert.equal(candidates[1].category, "stage_change");
  assert.equal(candidates[1].content.to, "Explore");
});

test("policy allows a high-confidence user-confirmed decision", () => {
  assert.deepEqual(evaluateMemoryCandidate(createCandidate()), {
    allowed: true,
    reason: "user_confirmed_decision"
  });
});

test("policy rejects a model guess and low-confidence information", () => {
  assert.equal(
    evaluateMemoryCandidate(
      createCandidate({
        source: "model_guess"
      })
    ).allowed,
    false
  );
  assert.equal(
    evaluateMemoryCandidate(
      createCandidate({
        confidence: "low"
      })
    ).reason,
    "insufficient_confidence"
  );
});

test("approved candidate updates Project Memory exactly once", () => {
  const manager = createManager();
  manager.create({
    id: "project-1",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });

  const first = manager.updateMemoryFromCandidate(createCandidate());
  const retry = manager.updateMemoryFromCandidate(createCandidate());
  const stored = manager.retrieve("project-1");

  assert.equal(first.updated, true);
  assert.equal(retry.updated, false);
  assert.equal(retry.policy.reason, "candidate_already_applied");
  assert.equal(stored.data.decisions.length, 1);
  assert.equal(stored.data.history.length, 1);
  assert.equal(stored.data.decisions[0].answer, "大学生");
});

test("string decision content follows the documented candidate contract", () => {
  const manager = createManager();
  manager.create({
    id: "project-1",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });

  const result = manager.updateMemoryFromCandidate(
    createCandidate({
      content: "目标用户确定为大学生"
    })
  );

  assert.equal(result.updated, true);
  assert.equal(
    manager.retrieve("project-1").data.decisions[0].answer,
    "目标用户确定为大学生"
  );
});

test("rejected candidate leaves Project Memory unchanged", () => {
  const manager = createManager();
  const before = manager.create({
    id: "project-1",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });
  const result = manager.updateMemoryFromCandidate(
    createCandidate({
      source: "model_guess"
    })
  );

  assert.equal(result.updated, false);
  assert.deepEqual(manager.retrieve("project-1"), before);
});

test("Nexus Core updates Project Memory after Reflection", async () => {
  const manager = createManager();
  manager.create({
    id: "project-1",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });

  const result = await runNexusCore(
    {
      message: "继续完善校园环保项目",
      context: {
        projectId: "project-1",
        turn: 2,
        clarificationAnswers: [
          {
            question: "你最想帮助的具体用户是谁？",
            answer: "大学生"
          }
        ]
      }
    },
    {
      memoryManager: manager
    }
  );
  const stored = manager.retrieve("project-1");

  assert.equal(result.ok, true);
  assert.ok(result.memoryUpdate.applied >= 1);
  assert.equal(stored.data.decisions.length, 1);
  assert.equal(stored.data.decisions[0].answer, "大学生");
});

test("fallback stage candidate is rejected without losing user decisions", async () => {
  const manager = createManager();
  manager.create({
    id: "project-1",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "校园环保项目",
      stage: "Idea"
    }
  });

  const result = await runNexusCore(
    {
      message: "继续完善校园环保项目",
      context: {
        projectId: "project-1",
        turn: 2,
        clarificationAnswers: [
          {
            question: "你最想帮助的具体用户是谁？",
            answer: "大学生"
          }
        ]
      }
    },
    {
      memoryManager: manager,
      model: {
        apiKey: "test-key",
        fetchImpl: async () =>
          new Response("provider unavailable", { status: 503 })
      }
    }
  );
  const stored = manager.retrieve("project-1");

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(stored.data.decisions.length, 1);
  assert.equal(stored.data.stage, "Idea");
  assert.equal(result.memoryUpdate.applied, 1);
  assert.ok(
    !result.memoryUpdate.results.some(
      (item) => item.category === "stage_change" && item.updated
    )
  );
});
