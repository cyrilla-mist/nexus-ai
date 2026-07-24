import {
  callDeepSeek,
  DEEPSEEK_MODEL,
  ModelClientError
} from "./deepseek-client.js";

const REQUIRED_FIELDS = [
  "ideaProfile",
  "projectBlueprint",
  "risks",
  "clarificationQuestions",
  "nextAction"
];

function invalidOutput(message, details = {}) {
  return new ModelClientError("INVALID_MODEL_OUTPUT", message, details);
}

export function parseProjectAnalysis(content) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ModelClientError(
      "INVALID_MODEL_JSON",
      "DeepSeek output was not valid JSON."
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw invalidOutput("DeepSeek output must be a JSON object.");
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !Object.hasOwn(parsed, field)
  );

  if (missingFields.length > 0) {
    throw invalidOutput("DeepSeek output is missing required fields.", {
      missingFields
    });
  }

  if (
    !parsed.ideaProfile ||
    typeof parsed.ideaProfile !== "object" ||
    Array.isArray(parsed.ideaProfile)
  ) {
    throw invalidOutput("ideaProfile must be an object.");
  }

  if (
    !parsed.projectBlueprint ||
    typeof parsed.projectBlueprint !== "object" ||
    Array.isArray(parsed.projectBlueprint)
  ) {
    throw invalidOutput("projectBlueprint must be an object.");
  }

  if (!Array.isArray(parsed.risks)) {
    throw invalidOutput("risks must be an array.");
  }

  if (!Array.isArray(parsed.clarificationQuestions)) {
    throw invalidOutput("clarificationQuestions must be an array.");
  }

  if (typeof parsed.nextAction !== "string" || !parsed.nextAction.trim()) {
    throw invalidOutput("nextAction must be a non-empty string.");
  }

  return parsed;
}

export async function generateProjectAnalysis({
  apiKey,
  task,
  fetchImpl,
  timeoutMs
}) {
  if (!apiKey) {
    return {
      mode: "mock",
      provider: "local",
      model: null,
      data: null,
      error: null
    };
  }

  try {
    const result = await callDeepSeek({
      apiKey,
      messages: task.messages,
      fetchImpl,
      timeoutMs
    });

    return {
      mode: "deepseek",
      provider: "deepseek",
      model: result.model,
      data: parseProjectAnalysis(result.content),
      error: null
    };
  } catch (error) {
    const modelError =
      error instanceof ModelClientError
        ? error
        : new ModelClientError(
            "MODEL_UNKNOWN_ERROR",
            "The model request failed unexpectedly."
          );

    return {
      mode: "fallback",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      data: null,
      error: {
        code: modelError.code,
        message: modelError.message
      }
    };
  }
}
