import { runNexusCore } from "../core/nexus-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function badRequest(code, message) {
  return jsonResponse(
    {
      ok: false,
      error: { code, message }
    },
    400
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateNexusPayload(payload) {
  if (!isPlainObject(payload)) {
    return {
      code: "INVALID_PAYLOAD",
      message: "请求内容格式不正确，请刷新页面后重试。"
    };
  }

  if (!String(payload.message ?? "").trim()) {
    return {
      code: "EMPTY_MESSAGE",
      message: "请先填写项目想法。"
    };
  }

  if (payload.context !== undefined && !isPlainObject(payload.context)) {
    return {
      code: "INVALID_CONTEXT",
      message: "项目上下文格式不正确，请清空后重新开始。"
    };
  }

  const context = payload.context ?? {};
  const turn = Number(context.turn);

  if (
    context.turn !== undefined &&
    (!Number.isInteger(turn) || turn < 1 || turn > 3)
  ) {
    return {
      code: "INVALID_TURN",
      message: "当前项目轮次无效，请清空后重新开始。"
    };
  }

  if (
    context.previousAnalysis !== undefined &&
    context.previousAnalysis !== null &&
    !isPlainObject(context.previousAnalysis)
  ) {
    return {
      code: "INVALID_PREVIOUS_ANALYSIS",
      message: "上一轮项目分析格式不正确，请清空后重新开始。"
    };
  }

  if (context.clarificationAnswers !== undefined) {
    if (!Array.isArray(context.clarificationAnswers)) {
      return {
        code: "INVALID_CLARIFICATION_ANSWERS",
        message: "澄清回答格式不正确，请重新填写。"
      };
    }

    const hasEmptyAnswer = context.clarificationAnswers.some(
      (item) =>
        !isPlainObject(item) ||
        !String(item.question ?? "").trim() ||
        !String(item.answer ?? "").trim()
    );

    if (hasEmptyAnswer) {
      return {
        code: "EMPTY_CLARIFICATION_ANSWER",
        message: "请回答全部澄清问题后再继续完善项目。"
      };
    }
  }

  return null;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "nexus-ai-core",
        version: "0.1.1",
        mode: env.DEEPSEEK_API_KEY ? "deepseek" : "mock"
      });
    }

    if (request.method === "POST" && url.pathname === "/api/nexus") {
      let payload;

      try {
        payload = await request.json();
      } catch {
        return badRequest("INVALID_JSON", "请求内容不是有效 JSON。");
      }

      const validationError = validateNexusPayload(payload);

      if (validationError) {
        return badRequest(validationError.code, validationError.message);
      }

      try {
        const result = await runNexusCore(payload, {
          model: {
            apiKey: env.DEEPSEEK_API_KEY
          }
        });
        return jsonResponse(result, result.ok ? 200 : 400);
      } catch {
        return jsonResponse(
          {
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Nexus 暂时无法完成分析，请稍后重试。"
            }
          },
          500
        );
      }
    }

    return jsonResponse(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "可用接口为 GET /health 和 POST /api/nexus。"
        }
      },
      404
    );
  }
};
