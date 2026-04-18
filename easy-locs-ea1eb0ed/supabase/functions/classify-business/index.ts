import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * classify-business — Edge Function for LLM-powered business taxonomy classification.
 * Receives business metadata, calls GPT-4o-mini, returns canonical vertical + subcategory.
 * All OpenAI API key usage is isolated to this server-side Edge Function.
 * Requires the Supabase service-role key — NOT the public anon key.
 * This endpoint invokes paid OpenAI calls and must only be reachable by trusted
 * server-side pipeline code, never from browsers or unauthenticated callers.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
// LB1 #835 — classification routes through the platform-native AI agent so
// quota / sensitive routing / audit are uniformly enforced. Direct
// `openaiChat` is no longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const ALLOWED_ORIGINS = new Set([
  Deno.env.get("SITE_URL") ?? "",
  Deno.env.get("SUPABASE_URL") ?? "",
]);

const VALID_VERTICALS = new Set([
  "food", "grocery", "shops", "retail", "services", "property",
  "stay", "healthcare", "mobility", "experiences",
  "utility", "education", "finance", "beauty", "delivery", "events", "flight",
]);

interface ClassifyRequest {
  businessName: string;
  description?: string | null;
  sourceCategory?: string | null;
  location?: string | null;
}

interface ClassifyResponse {
  vertical: string;
  subcategory: string | null;
  confidence: number;
  reason: string;
  source: "llm" | "fallback";
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = (origin && ALLOWED_ORIGINS.has(origin)) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Only accepts the service-role key.
 * The public anon key is intentionally excluded: this endpoint calls paid
 * OpenAI APIs and must never be accessible from browser-side or untrusted code.
 */
function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  return Boolean(serviceKey) && token === serviceKey;
}

Deno.serve(async (req: Request) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!verifyAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: ClassifyRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!body.businessName) {
    return new Response(JSON.stringify({ error: "businessName is required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // LB Closeout #852 — provider-key gating removed. Dispatch chain
  // surfaces unavailable-provider errors as a normal failed outcome,
  // which the catch below converts into the same fallback response.


  const prompt = [
    "You are a business taxonomy classifier for a UAE super-app. Classify the following business.",
    "Allowed verticals: food, grocery, shops, services, property, stay, healthcare, mobility, experiences, utility, education, finance",
    "",
    `Business name: ${body.businessName}`,
    body.description ? `Description: ${body.description}` : null,
    body.sourceCategory ? `Source category: ${body.sourceCategory}` : null,
    body.location ? `Location: ${body.location}` : null,
    "",
    'Respond with JSON only: {"vertical":"...","subcategory":"...","confidence":0-100,"reason":"..."}',
    "subcategory must be a snake_case slug (e.g. fast_food, retail_pharmacy, car_rental, boutique_hotel).",
  ].filter(Boolean).join("\n");

  try {
    const outcome = await dispatchAiCompletion(
      {
        feature: "classify-business",
        messages: [{ role: "user", content: prompt }],
        maxTokens: 200,
        temperature: 0,
        responseFormat: "json",
      },
      { feature: "classify-business" },
    );

    if (outcome.status !== "succeeded" || !outcome.output) {
      throw new Error(
        `dispatch ${outcome.status}: ${outcome.errorCode ?? ""} ${outcome.errorMessage ?? outcome.blockedReason ?? ""}`.trim(),
      );
    }

    // Adapter exposes JSON via `output.json` when responseFormat="json";
    // fall back to parsing `output.text` for legacy adapter shapes.
    const parsed = (outcome.output.json as Record<string, unknown> | undefined) ??
      (typeof outcome.output.text === "string" ? JSON.parse(outcome.output.text) : null);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Empty AI response");
    }
    const vertical = VALID_VERTICALS.has(parsed.vertical as string)
      ? (parsed.vertical as string)
      : "services";
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));

    const response: ClassifyResponse = {
      vertical,
      subcategory: typeof parsed.subcategory === "string" ? (parsed.subcategory as string) : null,
      confidence,
      reason: typeof parsed.reason === "string" ? (parsed.reason as string) : "LLM classification",
      source: "llm",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const fallback: ClassifyResponse = {
      vertical: "services",
      subcategory: null,
      confidence: 10,
      reason: `LLM error: ${err instanceof Error ? err.message : String(err)}`,
      source: "fallback",
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
