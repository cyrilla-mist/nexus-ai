export function reflectOnResult(result) {
  const issues = [];

  if (!result || typeof result !== "object") {
    issues.push("Atlas result is missing or invalid.");
  }

  if (!result?.nextStep) {
    issues.push("The result does not provide a concrete next step.");
  }

  if (!Array.isArray(result?.questions) || result.questions.length === 0) {
    issues.push("The result does not actively request missing information.");
  }

  return {
    passed: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
    principles: [
      "Do not invent evidence or user resources.",
      "Keep the human user as the final decision-maker.",
      "Always provide a clear next action."
    ]
  };
}
