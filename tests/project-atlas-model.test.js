import assert from "node:assert/strict";
import test from "node:test";

import { runNexusCore } from "../core/nexus-core.js";

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
    problem: "无法判断",
    proposedSolution: "AI 学习辅助工具",
    valueProposition: "无法判断",
    validationPlan: ["访谈目标用户"],
    milestones: ["完成需求访谈"]
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

async function runWithModel(fetchImpl, timeoutMs = 100) {
  return runNexusCore(
    { message: idea },
    {
      model: {
        apiKey: "test-key",
        fetchImpl,
        timeoutMs
      }
    }
  );
}

test("uses mock mode when DEEPSEEK_API_KEY is not configured", async () => {
  const result = await runNexusCore({ message: idea });

  assert.equal(result.ok, true);
  assert.equal(result.nexus.selectedAtlas, "project-atlas");
  assert.equal(result.response.model.mode, "mock");
  assert.equal(result.response.status, "needs_clarification");
});

test("uses structured DeepSeek output after a successful response", async () => {
  let requestBody;
  let authorization;
  const result = await runWithModel(async (_url, options) => {
    requestBody = JSON.parse(options.body);
    authorization = options.headers.Authorization;
    return deepSeekResponse(JSON.stringify(validAnalysis));
  });

  assert.equal(result.response.model.mode, "deepseek");
  assert.deepEqual(result.response.projectBlueprint, validAnalysis.projectBlueprint);
  assert.deepEqual(result.response.risks, validAnalysis.risks);
  assert.equal(result.response.nextAction, validAnalysis.nextAction);
  assert.equal(result.reflection.passed, true);
  assert.equal(authorization, "Bearer test-key");
  assert.deepEqual(requestBody.response_format, { type: "json_object" });
  assert.equal(requestBody.stream, false);
});

test("falls back when the model returns invalid JSON", async () => {
  const result = await runWithModel(async () =>
    deepSeekResponse("not valid JSON")
  );

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(
    result.response.model.fallbackReason.code,
    "INVALID_MODEL_JSON"
  );
  assert.equal(result.response.status, "needs_clarification");
});

test("falls back when required model fields are missing", async () => {
  const result = await runWithModel(async () =>
    deepSeekResponse(JSON.stringify({ ideaProfile: {} }))
  );

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(
    result.response.model.fallbackReason.code,
    "INVALID_MODEL_OUTPUT"
  );
});

test("falls back when the model request times out", async () => {
  const neverCompletes = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    });

  const result = await runWithModel(neverCompletes, 5);

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(result.response.model.fallbackReason.code, "MODEL_TIMEOUT");
});

test("falls back when DeepSeek returns an HTTP error", async () => {
  const result = await runWithModel(async () =>
    new Response("provider unavailable", { status: 503 })
  );

  assert.equal(result.response.model.mode, "fallback");
  assert.equal(
    result.response.model.fallbackReason.code,
    "MODEL_HTTP_ERROR"
  );
});
