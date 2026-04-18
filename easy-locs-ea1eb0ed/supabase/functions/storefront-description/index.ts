import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * storefront-description — Edge Function for AI-generated storefront descriptions and SEO metadata.
 * Called internally by the onboarding pipeline. OpenAI key is server-side only.
 * Auth: accepts service-role key (unlimited) OR authenticated user JWT (rate-limited 20/hour/user).
 * Raw anon key is rejected — only authenticated sessions or trusted server-side callers allowed.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
// LB1 #835 — storefront descriptions go through the platform-native AI agent
// so quota / sensitive routing / audit are uniformly enforced.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
    "Access-Control-Max-Age": "86400",
  };
}

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/**
 * Accepts the service-role key (no rate limit) OR a valid authenticated user
 * JWT (rate-limited per user). The raw anon key is rejected — only
 * authenticated sessions or trusted server-side callers are allowed.
 */
async function verifyAuth(req: Request): Promise<{ authorized: boolean; rateLimitKey?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false };

  const token = authHeader.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceKey && token === serviceKey) return { authorized: true };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (anonKey && token === anonKey) return { authorized: false };

  if (!supabaseUrl || !anonKey) return { authorized: false };

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { authorized: false };

    const rateLimitKey = `user:${user.id}`;
    if (!checkRateLimit(rateLimitKey)) return { authorized: false };

    return { authorized: true, rateLimitKey };
  } catch {
    return { authorized: false };
  }
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

  const auth = await verifyAuth(req);
  if (!auth.authorized) {
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

  // LB Closeout #852 — provider-key gating removed. The dispatch chain
  // resolves provider availability via the registered AI router metadata
  // and falls through to the catch-block fallback when no provider is wired.

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
    const outcome = await dispatchAiCompletion(
      {
        feature: "storefront-description",
        messages: [{ role: "user", content: prompt }],
        maxTokens: 300,
        temperature: 0.3,
        responseFormat: "json",
      },
      { feature: "storefront-description" },
    );

    if (outcome.status !== "succeeded" || !outcome.output) {
      throw new Error(
        `dispatch ${outcome.status}: ${outcome.errorCode ?? ""} ${outcome.errorMessage ?? outcome.blockedReason ?? ""}`.trim(),
      );
    }
    const parsed = (outcome.output.json as Record<string, unknown> | undefined) ??
      (typeof outcome.output.text === "string" ? JSON.parse(outcome.output.text) : null);
    if (!parsed || typeof parsed !== "object") throw new Error("Empty AI response");
    const p = parsed as Record<string, unknown>;
    if (!p.description || !p.seoTitle) throw new Error("Incomplete LLM response");

    const response: DescriptionResponse = {
      description: String(p.description),
      seoTitle: String(p.seoTitle).slice(0, 60),
      seoDescription: String(p.seoDescription || "").slice(0, 160),
      seoKeywords: Array.isArray(p.seoKeywords) ? (p.seoKeywords as unknown[]).map(String) : [],
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
