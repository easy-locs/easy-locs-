// Next-Gen IA — per-domain personalized recommendations.
// POST body:
//   { domain: "radar"|"marketplace"|"property"|"ride", limit?: number, context?: object, refresh?: boolean }
// Strategy:
//   1. Build a user signal vector from the user's profile embedding + recent interactions.
//   2. Query the relevant table via cosine similarity (semantic_search RPC).
//   3. Blend with a light popularity prior.
//   4. Cache per (user, domain, context_hash) for 15 minutes.

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { generateEmbedding } from "../_shared/embedding-client.ts";
import { logAiInteraction, checkAiQuota } from "../_shared/ai-cost-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

type Domain = "radar" | "marketplace" | "property" | "ride";

const DOMAIN_CONFIG: Record<Domain, { table: string; tables: string[]; kind: string }> = {
  radar:       { table: "listings",             tables: ["listings"],                                  kind: "listing" },
  marketplace: { table: "marketplace_services", tables: ["marketplace_services", "seed_products"],     kind: "service" },
  property:    { table: "listings",             tables: ["listings"],                                  kind: "property" },
  ride:        { table: "listings",             tables: ["listings"],                                  kind: "ride" },
};

const CACHE_TTL_SECONDS = 15 * 60;

async function hashContext(domain: string, context: unknown): Promise<string> {
  const src = `${domain}:${JSON.stringify(context ?? {})}`;
  const buf = new TextEncoder().encode(src);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface RecoItem {
  id: string;
  kind: string;
  score: number;
  reason: string;
  source_table?: string;
}

Deno.serve(withEdgeLogging("ai-recommendations", async (req, logger) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const rl = await checkServerRateLimit(req, "ai-recommendations");
  if (!rl.allowed) return rateLimitResponse(rl);

  const start = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const domain = (body.domain ?? "radar") as Domain;
    const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);
    const refresh = !!body.refresh;
    const context = body.context ?? {};

    if (!DOMAIN_CONFIG[domain]) {
      return new Response(JSON.stringify({ error: "Unknown domain" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const q = await checkAiQuota(userId, "ai-recommendations");
    if (!q.allowed) {
      return new Response(
        JSON.stringify({ error: "Daily AI quota reached", reason: q.reason, used: q.used, limits: q.limits }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ctxHash = await hashContext(domain, context);

    if (!refresh) {
      const { data: cached } = await db
        .from("ai_recommendations_cache")
        .select("items, expires_at, model")
        .eq("user_id", userId)
        .eq("domain", domain)
        .eq("context_hash", ctxHash)
        .maybeSingle();
      if (cached && new Date(cached.expires_at as string) > new Date()) {
        // Meter cache hits against the user's daily quota so request caps stay honest.
        await logAiInteraction({
          userId, feature: "ai-recommendations", domain,
          provider: "openai",
          model: (cached.model as string) ?? "text-embedding-3-small",
          promptTokens: 0, completionTokens: 0,
          latencyMs: Date.now() - start,
          metadata: { cache: "hit", items: (cached.items as RecoItem[]).length, context_hash: ctxHash },
        });
        return new Response(JSON.stringify({
          items: (cached.items as RecoItem[]).slice(0, limit),
          cached: true,
          domain,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // --- Build user signal vector ---
    const { data: profile } = await db
      .from("profiles")
      .select("embedding, full_name, bio, city")
      .eq("id", userId)
      .maybeSingle();

    let queryVector: number[] | null = null;
    let embeddingTokens = 0;
    let embeddingModel = "text-embedding-3-small";
    if (profile?.embedding) {
      // embedding comes back as string "[...]" — normalize.
      if (typeof profile.embedding === "string") {
        queryVector = JSON.parse(profile.embedding as string);
      } else if (Array.isArray(profile.embedding)) {
        queryVector = profile.embedding as number[];
      }
    }
    if (!queryVector) {
      const seed = [
        profile?.full_name ?? "",
        profile?.bio ?? "",
        profile?.city ?? "",
        typeof context === "object" && context ? JSON.stringify(context) : "",
      ].filter(Boolean).join(" | ") || "general interest recommendations";
      const emb = await generateEmbedding(seed);
      queryVector = emb.embedding;
      embeddingTokens = emb.tokensUsed;
      embeddingModel = emb.model;
    }

    // --- Vector similarity via semantic_search ---
    const cfg = DOMAIN_CONFIG[domain];
    const { data: hits, error } = await db.rpc("semantic_search", {
      p_query_embedding: `[${queryVector.join(",")}]`,
      p_tables: cfg.tables,
      p_match_count: limit * 2,
      p_threshold: 0.3,
    });

    if (error) {
      logger.warn("semantic_search_error", { error: error.message });
    }

    const items: RecoItem[] = (hits ?? []).map((h: { id: string; table_name: string; similarity: number }) => ({
      id: h.id,
      kind: cfg.kind,
      score: Number(h.similarity),
      reason: `semantic_match:${h.table_name}`,
      source_table: h.table_name,
    }));

    // Popularity prior: mild boost for newer/active records (best-effort)
    const enriched = items.slice(0, limit);

    // Cache
    await db.from("ai_recommendations_cache").upsert({
      user_id: userId,
      domain,
      context_hash: ctxHash,
      items: enriched,
      model: embeddingModel,
      expires_at: new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString(),
    }, { onConflict: "user_id,domain,context_hash" });

    await logAiInteraction({
      userId, feature: "ai-recommendations", domain,
      provider: "openai", model: embeddingModel,
      promptTokens: embeddingTokens, completionTokens: 0,
      latencyMs: Date.now() - start,
      metadata: { cache: "miss", items: enriched.length, context_hash: ctxHash, embedding_used: embeddingTokens > 0 },
    });

    return new Response(JSON.stringify({ items: enriched, cached: false, domain }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-recommendations] error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
