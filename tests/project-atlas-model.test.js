import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProjectAtlasTask,
  runProjectAtlas
} from "../atlas/project-atlas/index.js";
import { evaluateProjectStage } from "../atlas/project-atlas/stage.js";
import { runNexusCore } from "../core/nexus-core.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { MemoryStore } from "../memory/memory-store.js";
import { MEMORY_TYPES } from "../memory/schema.js";
import worker from "../worker/index.js";

const idea = "我想做一个帮助大学生提高学习效率的 AI 项目";

const validAnalysis = {
  ideaProfile: {
    summary: idea,
    goal: "提高学习效率",
    targetUsers: "大学生",
    knownFacts: ["用户希望开发一个 AI 项目"],
    assumptions: ["具体学习场景尚未验证"]
  },
  projectBlueprint: {
    problem: "大学生的学习任务容易分散",
    proposedSolution: "AI 学习任务管理工具",
    valueProposition: "帮助用户聚焦下一项学习任务",
    validationPlan: ["访谈 5 名目标用户"],
    milestones: ["完成需求访谈", "制作网页版 MVP"]
  },
  risks: [
    {
      risk: "需求未经验证",
      basis: "用户未提供调研数据",
      mitigation: "先进行用户访谈"
    }
  ],
  clarificationQuestions: ["最需要改善的学习环节是什么？"],
  nextAction: "访谈 5 名目标用户并记录真实痛点。"
};

function deepSeekResponse(content, status = 200) {
  return new Response(
    JSON.stringify({
      model: "deepseek-v4-flash",
      choices: [{ message: { content } }]
    }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}

async function runWithModel(
  fetchImpl,
  payload = { message: idea },
  timeoutMs = 100,
  runtime = {}
) {
  return runNexusCore(payload, {
    ...runtime,
    model: {
      apiKey: "test-key",
      fetchImpl,
      timeoutMs
    }
  });
}

test("first project analysis completes in Mock Mode", async () => {
  const result = await runNexusCore({
    message: idea,
    context: { turn: 1 }
  });

  assert.equal(result.ok, true);
  assert.equal(result.nexus.selectedAtlas, "project-atlas");
  assert.equal(result.response.model.mode, "mock");
  assert.equal(result.response.turn, 1);
  assert.equal(result.response.currentStage, "Idea");
  assert.ok(result.response.projectBlueprint);
  assert.ok(result.response.clarificationQuestions.length > 0);
});

test("clarification answers enter the Project Atlas model context", () => {
  const previousAnalysis = validAnalysis;
  const task = buildProjectAtlasTask({
    message: idea,
    context: {
      clarificationAnswers: [
        {
          question: "你最想帮助的具体用户是谁？",
          answer: "备考研究生入学考试的大学生"
        }
      ],
      previousAnalysis,
      turn: 2
    }
  });
  const modelPayload = JSON.parse(task.messages[1].content);

  assert.equal(modelPayload.sessionContext.turn, 2);
  assert.equal(
    modelPayload.sessionContext.clarificationAnswers[0].answer,
    "备考研究生入学考试的大学生"
  );
});

test("previous analysis is available to the next model turn", () => {
  const task = buildProjectAtlasTask({
    message: idea,
    context: {
      previousAnalysis: validAnalysis,
      turn: 2
    }
  });
  const modelPayload = JSON.parse(task.messages[1].content);

  assert.deepEqual(
    modelPayload.sessionContext.previousAnalysis.projectBlueprint,
    validAnalysis.projectBlueprint
  );
});

test("Nexus Core passes retrieved Project Memory to Project Atlas", async () => {
  const memoryManager = new MemoryManager({
    store: new MemoryStore()
  });
  const projectMemory = memoryManager.create({
    id: "project-campus",
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "Campus sustainability project",
      stage: "Explore"
    }
  });

  let requestBody;
  const result = await runWithModel(
    async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return deepSeekResponse(JSON.stringify(validAnalysis));
    },
    {
      message: "Continue my campus sustainability project",
      context: {
        projectId: projectMemory.id,
        turn: 2
      }
    },
    100,
    { memoryManager }
  );
  const memoryContext = JSON.parse(
    requestBody.messages[1].content
  ).sessionContext.memoryContext;

  assert.equal(result.ok, true);
  assert.equal(
    memoryContext.projectMemory[0].data.title,
    "Campus sustainability project"
  );
  assert.equal(memoryContext.projectMemory[0].data.stage, "Explore");
  assert.deepEqual(memoryContext.userMemory, []);
  assert.deepEqual(memoryContext.atlasMemory, []);
  assert.deepEqual(
    memoryManager.retrieve(projectMemory.id),
    projectMemory
  );
  assert.equal(memoryManager.list().length, 1);
});

test("Project Atlas receives empty Memory Context when none is configured", () => {
  const task = buildProjectAtlasTask({
    message: idea,
    context: {}
  });
  const memoryContext = JSON.parse(
    task.messages[1].content
  ).sessionContext.memoryContext;

  assert.deepEqual(memoryContext, {
    userMemory: [],
    projectMemory: [],
    atlasMemory: []
  });
});

test("Mock Mode preserves answered questions and updates the profile", async () => {
  const question = "你最想帮助的具体用户是谁？";
  const result = await runNexusCore({
    message: idea,
    context: {
      clarificationAnswers: [
        {
          question,
          answer: "经常拖延作业的本科生"
        }
      ],
      previousAnalysis: validAnalysis,
      turn: 2
    }
  });

  assert.equal(result.response.ideaProfile.targetUsers, "经常拖延作业的本科生");
  assert.ok(
    result.response.ideaProfile.knownFacts.some((fact) =>
      fact.includes("经常拖延作业的本科生")
    )
  );
  assert.ok(!result.response.clarificationQuestions.includes(question));
});

test("DeepSeek returns a valid multi-turn result", async () => {
  let requestBody;
  const updatedAnalysis = {
    ...validAnalysis,
    clarificationQuestions: [],
    nextAction: "制作 3 个关键页面的可点击原型。"
  };
  const result = await runWithModel(
    async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return deepSeekResponse(JSON.stringify(updatedAnalysis));
    },
    {
      message: idea,
      context: {
        clarificationAnswers: [
          {
            question: "最需要改善的学习环节是什么？",
            answer: "把大作业拆成每天可完成的小任务"
          }
        ],
        previousAnalysis: validAnalysis,
        turn: 2
      }
    }
  );
  const modelContext = JSON.parse(requestBody.messages[1].content).sessionContext;

  assert.equal(result.response.model.mode, "deepseek");
  assert.equal(result.response.turn, 2);
  assert.equal(result.response.nextAction, updatedAnalysis.nextAction);
  assert.equal(modelContext.turn, 2);
  assert.equal(modelContext.clarificationAnswers.length, 1);
  assert.ok(modelContext.previousAnalysis);
});

test("invalid DeepSeek output safely falls back with existing context", async () => {
  const answer = "备考研究生入学考试的大学生";
  const result = await runWithModel(
    async () => deepSeekResponse("not valid JSON"),
    {
      message: idea,
      context: {
        clarificationAnswers: [
          {
            question: "你最想帮助的具体用户是谁？",
            answer
          }
        ],
        previousAnalysis: validAnalysis,
        turn: 2
      }
    }
  );

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(
    result.response.model.fallbackReason.code,
    "INVALID_MODEL_JSON"
  );
  assert.equal(result.response.ideaProfile.targetUsers, answer);
  assert.ok(
    result.response.ideaProfile.knownFacts.some((fact) => fact.includes(answer))
  );
});

test("fallback from an API error preserves the previous blueprint", async () => {
  const result = await runWithModel(
    async () => new Response("provider unavailable", { status: 503 }),
    {
      message: idea,
      context: {
        clarificationAnswers: [
          {
            question: "你目前已经具备哪些资源，例如团队、技术、数据或用户渠道？",
            answer: "一名开发者和 5 名可访谈同学"
          }
        ],
        previousAnalysis: validAnalysis,
        turn: 2
      }
    }
  );

  assert.equal(result.response.model.mode, "fallback");
  assert.deepEqual(
    result.response.projectBlueprint.milestones,
    validAnalysis.projectBlueprint.milestones
  );
  assert.ok(
    result.response.ideaProfile.knownFacts.some((fact) =>
      fact.includes("5 名可访谈同学")
    )
  );
});

test("model timeout returns Fallback Mode", async () => {
  const neverCompletes = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    });

  const result = await runWithModel(neverCompletes, { message: idea }, 5);

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(result.response.model.fallbackReason.code, "MODEL_TIMEOUT");
});

test("empty clarification answers are rejected with a normalized 400", async () => {
  const request = new Request("https://nexus.test/api/nexus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: idea,
      context: {
        turn: 2,
        previousAnalysis: validAnalysis,
        clarificationAnswers: [
          {
            question: "你最想帮助的具体用户是谁？",
            answer: ""
          }
        ]
      }
    })
  });
  const response = await worker.fetch(request, {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "EMPTY_CLARIFICATION_ANSWER");
});

test("worker rejects malformed JSON with a normalized error", async () => {
  const response = await worker.fetch(
    new Request("https://nexus.test/api/nexus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_JSON");
});

test("worker rejects an invalid turn", async () => {
  const response = await worker.fetch(
    new Request("https://nexus.test/api/nexus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: idea,
        context: { turn: 99 }
      })
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_TURN");
});

test("stage evaluation uses explainable project signals", () => {
  assert.equal(evaluateProjectStage({}).current, "Idea");
  assert.equal(
    evaluateProjectStage({
      ideaProfile: { targetUsers: "大学生" },
      projectBlueprint: { problem: "学习任务分散" }
    }).current,
    "Explore"
  );
  assert.equal(evaluateProjectStage(validAnalysis).current, "Validate");
  assert.equal(
    evaluateProjectStage({
      ...validAnalysis,
      nextAction: "开发并部署第一版网页 MVP"
    }).current,
    "Execute"
  );
});

test("limited turns stop requesting more Mock Mode answers", async () => {
  const result = await runProjectAtlas({
    message: idea,
    context: {
      previousAnalysis: validAnalysis,
      turn: 3
    }
  });

  assert.equal(result.turn, 3);
  assert.equal(result.clarificationQuestions.length, 0);
  assert.equal(result.status, "analysis_ready");
});
