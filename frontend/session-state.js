export function createEmptySessionState() {
  return {
    initialMessage: "",
    currentAnalysis: null,
    clarificationAnswers: [],
    pendingAnswers: [],
    turn: 0,
    lastResult: null
  };
}

function normalizeAnswers(answers = []) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((item) => ({
      question: String(item?.question ?? "").trim(),
      answer: String(item?.answer ?? "").trim()
    }))
    .filter((item) => item.question && item.answer);
}

export function mergeClarificationAnswers(
  confirmedAnswers = [],
  pendingAnswers = []
) {
  const merged = [];
  const seen = new Set();

  for (const item of normalizeAnswers([
    ...confirmedAnswers,
    ...pendingAnswers
  ])) {
    const key = `${item.question}\u0000${item.answer}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export function stagePendingAnswers(sessionState, pendingAnswers) {
  return {
    ...sessionState,
    pendingAnswers: normalizeAnswers(pendingAnswers)
  };
}

export function buildClarificationContext(sessionState, turn) {
  return {
    clarificationAnswers: mergeClarificationAnswers(
      sessionState.clarificationAnswers,
      sessionState.pendingAnswers
    ),
    previousAnalysis: sessionState.currentAnalysis,
    turn
  };
}

export function commitAnalysisResult(sessionState, data, fallbackTurn = 1) {
  return {
    ...sessionState,
    clarificationAnswers: mergeClarificationAnswers(
      sessionState.clarificationAnswers,
      sessionState.pendingAnswers
    ),
    pendingAnswers: [],
    currentAnalysis: data.response,
    turn: data.response?.turn ?? fallbackTurn,
    lastResult: data
  };
}
