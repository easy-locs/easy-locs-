/**
 * storefront-description — Edge Function for AI-generated storefront descriptions and SEO metadata.
 * Called internally by the onboarding pipeline. OpenAI key is server-side only.
 * Requires the Supabase service-role key — NOT the public anon key.
 * This endpoint invokes paid OpenAI calls and must only be reachable by trusted
 * server-side pipeline code, never from browsers or unauthenticated callers.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  Deno.env.get("SITE_URL") ?? "",
  Deno.env.get("SUPABASE_URL") ?? "",
]);

interface DescriptionRequest {
  name: string;
  vertical: string;
  subcategory?: string | null;
  city?: string | null;
  country?: string | null;
  district?: string | null;
  menuItemCount?: number;
  serviceCount?: number;
  productCount?: number;
}

interface DescriptionResponse {
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
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

  let body: DescriptionRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!body.name) {
    return new Response(JSON.stringify({ error: "name is required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const fallback = buildFallback(body);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ...fallback, source: "fallback" } as DescriptionResponse), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const location = [body.district, body.city, body.country].filter(Boolean).join(", ");
  const catalogHint = body.menuItemCount
    ? `Menu: ${body.menuItemCount} items.`
    : body.serviceCount
    ? `Services: ${body.serviceCount} offered.`
    : body.productCount
    ? `Products: ${body.productCount} listed.`
    : "";

  const prompt = [
    "Generate a JSON object for a UAE storefront directory listing. Be concise and factual.",
    "",
    `Business: ${body.name}`,
    `Category: ${body.vertical}${body.subcategory ? ` / ${body.subcategory.replace(/_/g, " ")}` : ""}`,
    location ? `Location: ${location}` : null,
    catalogHint || null,
    "",
    "Return JSON with keys: description (2-3 sentences), seoTitle (max 60 chars), seoDescription (max 160 chars), seoKeywords (array of 5-8 strings).",
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response");

    const parsed = JSON.parse(text);
    if (!parsed.description || !parsed.seoTitle) throw new Error("Incomplete LLM response");

    const response: DescriptionResponse = {
      description: String(parsed.description),
      seoTitle: String(parsed.seoTitle).slice(0, 60),
      seoDescription: String(parsed.seoDescription || "").slice(0, 160),
      seoKeywords: Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords.map(String) : [],
      source: "llm",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ...fallback, source: "fallback" } as DescriptionResponse), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

function buildFallback(input: DescriptionRequest): Omit<DescriptionResponse, "source"> {
  const location = [input.district, input.city, input.country].filter(Boolean).join(", ");
  const type = ({
    food: "restaurant", grocery: "grocery store", shops: "retail shop",
    services: "service provider", healthcare: "healthcare facility",
    stay: "hotel", hotel: "hotel", mobility: "transportation service",
    property: "property", experiences: "experience & activity",
  } as Record<string, string>)[input.vertical] ?? "business";
  const sub = input.subcategory ? input.subcategory.replace(/_/g, " ") : "";
  const subLabel = sub ? ` specializing in ${sub}` : "";
  const locationLabel = location ? ` located in ${location}` : "";
  const description = `${input.name} is a ${type}${subLabel}${locationLabel}. Visit us for quality products and excellent service.`;
  const seoTitle = location ? `${input.name} — ${sub || type} in ${location}`.slice(0, 60) : `${input.name} — ${sub || type}`.slice(0, 60);
  const seoDescription = `${input.name} offers ${sub || type} services${location ? ` in ${location}` : ""}. Find contact details, hours, and more.`.slice(0, 160);
  const seoKeywords = [input.name, sub || type, input.vertical, input.city, input.country, "near me"].filter((k): k is string => Boolean(k));
  return { description, seoTitle, seoDescription, seoKeywords };
}
