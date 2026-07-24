const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_MODEL = "deepseek-v4-flash";
export const DEFAULT_MODEL_TIMEOUT_MS = 20_000;

export class ModelClientError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ModelClientError";
    this.code = code;
    this.details = details;
  }
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

export async function callDeepSeek({
  apiKey,
  messages,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_MODEL_TIMEOUT_MS
}) {
  if (!apiKey) {
    throw new ModelClientError(
      "MISSING_API_KEY",
      "DeepSeek API key is not configured."
    );
  }

  if (typeof fetchImpl !== "function") {
    throw new ModelClientError(
      "INVALID_FETCH",
      "No fetch implementation is available."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        response_format: { type: "json_object" },
        stream: false,
        max_tokens: 2_500,
        thinking: { type: "disabled" }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ModelClientError(
        "MODEL_HTTP_ERROR",
        `DeepSeek API returned HTTP ${response.status}.`,
        { status: response.status }
      );
    }

    let responseBody;

    try {
      responseBody = await response.json();
    } catch {
      throw new ModelClientError(
        "INVALID_PROVIDER_RESPONSE",
        "DeepSeek API returned an invalid response body."
      );
    }

    const content = responseBody?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new ModelClientError(
        "EMPTY_MODEL_OUTPUT",
        "DeepSeek API returned no model content."
      );
    }

    return {
      content,
      model: responseBody?.model ?? DEEPSEEK_MODEL
    };
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      throw new ModelClientError(
        "MODEL_TIMEOUT",
        `DeepSeek API timed out after ${timeoutMs}ms.`
      );
    }

    if (error instanceof ModelClientError) {
      throw error;
    }

    throw new ModelClientError(
      "MODEL_NETWORK_ERROR",
      "DeepSeek API request failed."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
