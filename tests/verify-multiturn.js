import assert from "node:assert/strict";

import worker from "../worker/index.js";

async function post(payload) {
  const response = await worker.fetch(
    new Request("https://local.test/api/nexus", {
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

const initialMessage =
  "我想做一个帮助大学生管理学习任务的 AI 项目，先完成网页版 MVP。";
const firstTurn = await post({
  message: initialMessage,
  context: {
    clarificationAnswers: [],
    previousAnalysis: null,
    turn: 1
  }
});
const firstQuestion = firstTurn.response.clarificationQuestions[0];
const secondTurn = await post({
  message: initialMessage,
  context: {
    clarificationAnswers: [
      {
        question: firstQuestion,
        answer: "用于课程项目，并找同学进行体验测试。"
      }
    ],
    previousAnalysis: firstTurn.response,
    turn: 2
  }
});

assert.equal(firstTurn.response.turn, 1);
assert.equal(secondTurn.response.turn, 2);
assert.ok(
  secondTurn.response.ideaProfile.knownFacts.some((fact) =>
    fact.includes("用于课程项目")
  )
);
assert.ok(!secondTurn.response.clarificationQuestions.includes(firstQuestion));

console.log(
  JSON.stringify(
    {
      ok: true,
      firstTurn: {
        mode: firstTurn.response.model.mode,
        stage: firstTurn.response.currentStage,
        questions: firstTurn.response.clarificationQuestions.length
      },
      secondTurn: {
        mode: secondTurn.response.model.mode,
        stage: secondTurn.response.currentStage,
        questions: secondTurn.response.clarificationQuestions.length,
        preservedAnswer: true
      }
    },
    null,
    2
  )
);
