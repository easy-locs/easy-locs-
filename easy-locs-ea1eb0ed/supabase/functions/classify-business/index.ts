/**
 * classify-business — Edge Function for LLM-powered business taxonomy classification.
 * Receives business metadata, calls GPT-4o-mini, returns canonical vertical + subcategory.
 * All OpenAI API key usage is isolated to this server-side Edge Function.
 * Requires the Supabase service-role key — NOT the public anon key.
 * This endpoint invokes paid OpenAI calls and must only be reachable by trusted
 * server-side pipeline code, never from browsers or unauthenticated callers.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { openaiChat } from "../_shared/openai-client.ts";

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

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

  if (!Deno.env.get("OPENAI_API_KEY")) {
    const fallback: ClassifyResponse = {
      vertical: "services",
      subcategory: null,
      confidence: 10,
      reason: "OPENAI_API_KEY not configured",
      source: "fallback",
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

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
    const res = await openaiChat({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(text);
    const vertical = VALID_VERTICALS.has(parsed.vertical) ? parsed.vertical : "services";
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));

    const response: ClassifyResponse = {
      vertical,
      subcategory: typeof parsed.subcategory === "string" ? parsed.subcategory : null,
      confidence,
      reason: typeof parsed.reason === "string" ? parsed.reason : "LLM classification",
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
