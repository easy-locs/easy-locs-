import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkUserRateLimit, rateLimitResponse, resolveUserTier } from "../_shared/server-rate-limiter.ts";
import { createEdgeLogger } from "../_shared/structured-logger.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
// LB Closeout #852 — every chat completion goes through the platform
// agent registry so quota / sensitive routing / audit are guaranteed. Direct
// Direct fetches against the OpenAI HTTP API are no longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import type { AiMessage } from "../_shared/execution/adapters/ai/types.ts";

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

function toAiMessages(raw: Array<{ role: string; content: string }>): AiMessage[] {
  return raw.map((m) => ({
    role: (m.role === "system" || m.role === "user" || m.role === "assistant" || m.role === "tool")
      ? m.role
      : "user",
    content: String(m.content ?? ""),
  }));
}

async function dispatchedCompletion(opts: {
  feature: string;
  model: string;
  messages: AiMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: "text" | "json";
}): Promise<
  | { ok: true; text: string; promptTokens: number; completionTokens: number; totalTokens: number }
  | { ok: false; status: number; error: string }
> {
  const outcome = await dispatchAiCompletion(
    {
      feature: opts.feature,
      messages: opts.messages,
      model: opts.model,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      responseFormat: opts.responseFormat,
      purpose: "general",
    },
    { feature: opts.feature },
  );

  if (outcome.status === "succeeded" && outcome.output) {
    const it = outcome.output.interaction;
    return {
      ok: true,
      text: outcome.output.text ?? "",
      promptTokens: it.promptTokens,
      completionTokens: it.completionTokens,
      totalTokens: it.promptTokens + it.completionTokens,
    };
  }

  logger.error("dispatch_failed", {
    status: outcome.status,
    code: outcome.errorCode,
    message: outcome.errorMessage ?? outcome.blockedReason,
  });
  if (outcome.errorCode === "AI_QUOTA_EXCEEDED") {
    return { ok: false, status: 429, error: "Rate limits exceeded, please try again later." };
  }
  return { ok: false, status: 502, error: "AI request failed" };
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
      return handleStorefrontDescription(body, tier, cors);
    }

    if (action === "generate-tags") {
      return handleGenerateTags(body, cors);
    }

    if (action === "suggest-price") {
      return handleSuggestPrice(body, cors);
    }

    const selectedModel = model && ALLOWED_MODELS.has(model) ? model : "gpt-4o-mini";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const tierMaxTokens = MAX_TOKENS_BY_TIER[tier] ?? MAX_TOKENS_BY_TIER.free;
    const effectiveMaxTokens = Math.min(max_tokens ?? tierMaxTokens, tierMaxTokens);

    const result = await dispatchedCompletion({
      feature: "ai-proxy.chat",
      model: selectedModel,
      messages: toAiMessages(messages),
      maxTokens: effectiveMaxTokens,
      temperature: temperature ?? 0.7,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    logger.info("ai_proxy_completed", {
      userId,
      model: selectedModel,
      tier,
      tokensUsed: result.totalTokens,
    });

    return new Response(JSON.stringify({
      response: result.text,
      model: selectedModel,
      usage: {
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
      },
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
  tier: string,
  cors: Record<string, string>,
): Promise<Response> {
  const { name, category, products, location } = body as {
    name?: string;
    category?: string;
    products?: string[];
    location?: string;
  };

  const prompt = `Generate a compelling storefront description for a business called "${name || "Unknown"}" in the "${category || "general"}" category${location ? ` located in ${location}` : ""}${products?.length ? `. They offer: ${products.join(", ")}` : ""}. Write 2-3 paragraphs that are professional, engaging, and SEO-friendly.`;

  const result = await dispatchedCompletion({
    feature: "ai-proxy.describe-storefront",
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a marketing copywriter specializing in storefront descriptions." },
      { role: "user", content: prompt },
    ],
    maxTokens: MAX_TOKENS_BY_TIER[tier] ?? 1000,
    temperature: 0.8,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    description: result.text,
    usage: {
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      total_tokens: result.totalTokens,
    },
  }), { headers: { ...cors, "Content-Type": "application/json" } });
}

async function handleGenerateTags(
  body: Record<string, unknown>,
  cors: Record<string, string>,
): Promise<Response> {
  const { title, description, category } = body as {
    title?: string;
    description?: string;
    category?: string;
  };

  const result = await dispatchedCompletion({
    feature: "ai-proxy.generate-tags",
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Generate relevant tags for a product/listing. Return only a JSON array of strings." },
      { role: "user", content: `Title: ${title || "N/A"}\nDescription: ${description || "N/A"}\nCategory: ${category || "N/A"}` },
    ],
    maxTokens: 200,
    temperature: 0.5,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const content = result.text || "[]";
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
  cors: Record<string, string>,
): Promise<Response> {
  const { title, category, description, location } = body as {
    title?: string;
    category?: string;
    description?: string;
    location?: string;
  };

  const result = await dispatchedCompletion({
    feature: "ai-proxy.suggest-price",
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a pricing consultant. Suggest a reasonable price range in AED. Return JSON: {\"min\": number, \"max\": number, \"suggested\": number, \"currency\": \"AED\", \"reasoning\": \"brief explanation\"}." },
      { role: "user", content: `Product: ${title || "N/A"}\nCategory: ${category || "N/A"}\nDescription: ${description || "N/A"}\nLocation: ${location || "UAE"}` },
    ],
    maxTokens: 300,
    temperature: 0.5,
    responseFormat: "json",
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const content = result.text || "{}";
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
