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
        version: "0.1.0-skeleton",
        mode: env.DEEPSEEK_API_KEY ? "deepseek" : "mock"
      });
    }

    if (request.method === "POST" && url.pathname === "/api/nexus") {
      let payload;

      try {
        payload = await request.json();
      } catch {
        return badRequest(
          "INVALID_JSON",
          "Request body must be valid JSON."
        );
      }

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return badRequest(
          "INVALID_PAYLOAD",
          "Request body must be a JSON object."
        );
      }

      try {
        const result = await runNexusCore(payload, {
          model: {
            apiKey: env.DEEPSEEK_API_KEY
          }
        });
        return jsonResponse(result, result.ok ? 200 : 400);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : "Unknown error"
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
          message: "Use GET /health or POST /api/nexus."
        }
      },
      404
    );
  }
};
