import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClarificationContext,
  commitAnalysisResult,
  createEmptySessionState,
  stagePendingAnswers
} from "../frontend/session-state.js";

test("failed second turn keeps pending answers and retry commits them once", () => {
  const previousResult = {
    ok: true,
    response: {
      turn: 1,
      ideaProfile: { summary: "上一轮项目画像" },
      clarificationQuestions: ["目标用户是谁？", "准备如何验证？"]
    }
  };
  const confirmedAnswer = {
    question: "项目主要目标是什么？",
    answer: "先完成网页版 MVP。"
  };
  const retryBatch = [
    { question: "目标用户是谁？", answer: "需要管理课程任务的大学生。" },
    { question: "准备如何验证？", answer: "邀请 10 名同学体验。" }
  ];
  const initialState = {
    ...createEmptySessionState(),
    initialMessage: "做一个大学生学习任务管理工具。",
    currentAnalysis: previousResult.response,
    clarificationAnswers: [confirmedAnswer],
    turn: 1,
    lastResult: previousResult
  };

  const failedState = stagePendingAnswers(initialState, retryBatch);
  const firstAttempt = buildClarificationContext(failedState, 2);

  assert.equal(failedState.clarificationAnswers.length, 1);
  assert.deepEqual(failedState.pendingAnswers, retryBatch);
  assert.equal(failedState.lastResult, previousResult);
  assert.equal(firstAttempt.clarificationAnswers.length, 3);

  const retryState = stagePendingAnswers(failedState, retryBatch);
  const retryAttempt = buildClarificationContext(retryState, 2);

  assert.deepEqual(retryAttempt, firstAttempt);

  const successfulResult = {
    ok: true,
    response: {
      turn: 2,
      ideaProfile: { summary: "已结合澄清回答更新" },
      clarificationQuestions: []
    }
  };
  const committedState = commitAnalysisResult(
    retryState,
    successfulResult,
    2
  );

  assert.equal(committedState.clarificationAnswers.length, 3);
  assert.equal(committedState.pendingAnswers.length, 0);
  assert.equal(
    committedState.clarificationAnswers.filter(
      (item) => item.question === "目标用户是谁？"
    ).length,
    1
  );
  assert.equal(committedState.turn, 2);
  assert.equal(committedState.lastResult, successfulResult);
});
