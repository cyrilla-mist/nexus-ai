export function reflectOnResult(result) {
  const issues = [];

  if (!result || typeof result !== "object") {
    issues.push("Atlas result is missing or invalid.");
  }

  if (!result?.nextAction && !result?.nextStep) {
    issues.push("The result does not provide a concrete next action.");
  }

  if (
    result?.status === "needs_clarification" &&
    (!Array.isArray(result?.clarificationQuestions) ||
      result.clarificationQuestions.length === 0)
  ) {
    issues.push("The result requests clarification but provides no questions.");
  }

  if (!result?.stageProgress?.current) {
    issues.push("The result does not provide an explainable project stage.");
  }

  return {
    passed: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
    principles: [
      "Do not invent evidence or user resources.",
      "Keep facts and assumptions separate.",
      "Keep the human user as the final decision-maker.",
      "Always provide a clear next action."
    ]
  };
}
