import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkUserRateLimit, checkServerRateLimit, rateLimitResponse, resolveUserTier } from "../_shared/server-rate-limiter.ts";
import { createEdgeLogger } from "../_shared/structured-logger.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logger = createEdgeLogger("ai-proxy");

const ALLOWED_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5-turbo",
]);

const MAX_TOKENS_BY_TIER: Record<string, number> = {
  free: 1000,
  premium: 4000,
  enterprise: 8000,
};

async function getUserTier(userId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return "free";
    const sb = createClient(supabaseUrl, serviceKey);
    const { data } = await sb.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();
    return data?.subscription_tier ?? "free";
  } catch {
    return "free";
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const secretCheck = rejectQuerySecrets(req, cors);
  if (secretCheck.rejected) return secretCheck.response!;

  const authResult = await requireAuthenticatedUser(req);
  if (!authResult.authorized) return authResult.response!;
  const userId = authResult.userId!;

  const tier = userId !== "service_role" ? resolveUserTier(await getUserTier(userId)) : "enterprise";
  const rlResult = await checkUserRateLimit(userId, "ai-proxy", { tier });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  try {
    const body = await req.json();
    const { model, messages, max_tokens, temperature, action } = body as {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      max_tokens?: number;
      temperature?: number;
      action?: string;
    };

    if (action === "describe-storefront") {
      return handleStorefrontDescription(body, userId, tier, cors);
    }

    if (action === "generate-tags") {
      return handleGenerateTags(body, userId, tier, cors);
    }

    if (action === "suggest-price") {
      return handleSuggestPrice(body, userId, tier, cors);
    }

    const selectedModel = model && ALLOWED_MODELS.has(model) ? model : "gpt-4o-mini";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const tierMaxTokens = MAX_TOKENS_BY_TIER[tier] ?? MAX_TOKENS_BY_TIER.free;
    const effectiveMaxTokens = Math.min(max_tokens ?? tierMaxTokens, tierMaxTokens);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: temperature ?? 0.7,
      }),
    });

    if (!openaiResp.ok) {
      const errBody = await openaiResp.text();
      logger.error("openai_error", { status: openaiResp.status, body: errBody });
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const result = await openaiResp.json();

    logger.info("ai_proxy_completed", {
      userId,
      model: selectedModel,
      tier,
      tokensUsed: result.usage?.total_tokens,
    });

    return new Response(JSON.stringify({
      response: result.choices?.[0]?.message?.content,
      model: selectedModel,
      usage: result.usage,
    }), {
      headers: { ...cors, "Content-Type": "application/json", "X-AI-Provider": "openai" },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("ai_proxy_error", { error });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function handleStorefrontDescription(
  body: Record<string, unknown>,
  userId: string,
  tier: string,
  cors: Record<string, string>,
): Promise<Response> {
  const { name, category, products, location } = body as {
    name?: string;
    category?: string;
    products?: string[];
    location?: string;
  };

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const prompt = `Generate a compelling storefront description for a business called "${name || "Unknown"}" in the "${category || "general"}" category${location ? ` located in ${location}` : ""}${products?.length ? `. They offer: ${products.join(", ")}` : ""}. Write 2-3 paragraphs that are professional, engaging, and SEO-friendly.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a marketing copywriter specializing in storefront descriptions." },
        { role: "user", content: prompt },
      ],
      max_tokens: MAX_TOKENS_BY_TIER[tier] ?? 1000,
      temperature: 0.8,
    }),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "AI generation failed" }), {
      status: 502, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const result = await resp.json();
  return new Response(JSON.stringify({
    description: result.choices?.[0]?.message?.content,
    usage: result.usage,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
}

async function handleGenerateTags(
  body: Record<string, unknown>,
  _userId: string,
  tier: string,
  cors: Record<string, string>,
): Promise<Response> {
  const { title, description, category } = body as {
    title?: string;
    description?: string;
    category?: string;
  };

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate relevant tags for a product/listing. Return only a JSON array of strings." },
        { role: "user", content: `Title: ${title || "N/A"}\nDescription: ${description || "N/A"}\nCategory: ${category || "N/A"}` },
      ],
      max_tokens: 200,
      temperature: 0.5,
    }),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Tag generation failed" }), {
      status: 502, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content || "[]";
  let tags: string[];
  try {
    tags = JSON.parse(content);
  } catch {
    tags = content.split(",").map((t: string) => t.trim().replace(/["\[\]]/g, "")).filter(Boolean);
  }

  return new Response(JSON.stringify({ tags }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function handleSuggestPrice(
  body: Record<string, unknown>,
  _userId: string,
  _tier: string,
  cors: Record<string, string>,
): Promise<Response> {
  const { title, category, description, location } = body as {
    title?: string;
    category?: string;
    description?: string;
    location?: string;
  };

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a pricing consultant. Suggest a reasonable price range in AED. Return JSON: {\"min\": number, \"max\": number, \"suggested\": number, \"currency\": \"AED\", \"reasoning\": \"brief explanation\"}." },
        { role: "user", content: `Product: ${title || "N/A"}\nCategory: ${category || "N/A"}\nDescription: ${description || "N/A"}\nLocation: ${location || "UAE"}` },
      ],
      max_tokens: 300,
      temperature: 0.5,
    }),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Price suggestion failed" }), {
      status: 502, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content || "{}";
  let pricing;
  try {
    pricing = JSON.parse(content);
  } catch {
    pricing = { suggested: 0, reasoning: content };
  }

  return new Response(JSON.stringify({ pricing }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
