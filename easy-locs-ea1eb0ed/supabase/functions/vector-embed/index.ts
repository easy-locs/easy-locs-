import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { generateEmbedding, generateBatchEmbeddings } from "../_shared/embedding-client.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { action, entityType, entityId, text, limit = 10, threshold = 0.7 } = body;

    if (action === "embed_single") {
      if (!text) {
        return new Response(JSON.stringify({ error: "text is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await generateEmbedding(text);

      if (entityType && entityId) {
        const { error } = await db.from("entity_embeddings").upsert({
          entity_type: entityType,
          entity_id: entityId,
          embedding: `[${result.embedding.join(",")}]`,
          text_content: text.slice(0, 2000),
          model: result.model,
          updated_at: new Date().toISOString(),
        }, { onConflict: "entity_type,entity_id" });

        if (error) console.warn("[vector-embed] upsert error:", error.message);
      }

      return new Response(JSON.stringify({
        success: true,
        dimensions: result.embedding.length,
        tokensUsed: result.tokensUsed,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "embed_batch") {
      const { items } = body as { items?: Array<{ id: string; type: string; text: string }> };
      if (!items?.length) {
        return new Response(JSON.stringify({ error: "items array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const texts = items.map((i) => i.text);
      const result = await generateBatchEmbeddings(texts);

      const upserts = items.map((item, idx) => ({
        entity_type: item.type,
        entity_id: item.id,
        embedding: `[${result.embeddings[idx].join(",")}]`,
        text_content: item.text.slice(0, 2000),
        model: result.model,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await db.from("entity_embeddings").upsert(upserts, {
        onConflict: "entity_type,entity_id",
      });

      if (error) console.warn("[vector-embed] batch upsert error:", error.message);

      return new Response(JSON.stringify({
        success: true,
        embedded: items.length,
        totalTokens: result.totalTokens,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search_similar") {
      if (!text) {
        return new Response(JSON.stringify({ error: "text is required for search" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const queryEmbedding = await generateEmbedding(text);

      const { data, error } = await db.rpc("match_embeddings", {
        query_embedding: `[${queryEmbedding.embedding.join(",")}]`,
        match_threshold: threshold,
        match_count: limit,
        filter_entity_type: entityType ?? null,
      });

      if (error) {
        console.warn("[vector-embed] search error:", error.message);
        return new Response(JSON.stringify({ results: [], error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        results: data ?? [],
        queryTokens: queryEmbedding.tokensUsed,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_stale") {
      const { data: staleRecords } = await db
        .from("entity_embeddings")
        .select("entity_type, entity_id")
        .lt("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      return new Response(JSON.stringify({
        staleCount: staleRecords?.length ?? 0,
        message: "Stale records identified for re-embedding",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[vector-embed]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
