import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Reprocess Pipeline — Re-enqueues ALL existing seed_merchants
 * through the pipeline with current quality rules.
 * Resets pipeline_stage and forces reprocessing.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { city, vertical, batchSize = 100, resetScores = true } = body;

    // Find entities to reprocess
    let query = db.from("seed_merchants").select("id").eq("is_active", true);
    if (city) query = query.ilike("city", city);
    if (vertical) query = query.eq("vertical", vertical);
    query = query.limit(batchSize);

    const { data: entities } = await query;
    if (!entities?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No entities to reprocess", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = entities.map((e: any) => e.id);

    // Reset pipeline stage and scores
    const resetData: Record<string, any> = {
      pipeline_stage: "source_raw",
      visibility_mode: "hidden",
    };
    if (resetScores) {
      resetData.overall_quality_score = 0;
      resetData.visibility_score = 0;
    }

    // Batch reset
    for (const id of ids) {
      await db.from("seed_merchants").update(resetData).eq("id", id);
    }

    // Remove existing pending/processing queue entries for these entities
    await db.from("entity_pipeline_queue")
      .delete()
      .in("entity_id", ids)
      .in("status", ["pending", "processing"]);

    // Enqueue all for reprocessing
    const rows = ids.map((id: string) => ({
      entity_id: id,
      entity_type: "seed_merchant",
      current_stage: "source",
      next_stage: "classify",
      priority: 7,
      status: "pending",
    }));
    await db.from("entity_pipeline_queue").insert(rows);

    console.log(`[reprocess] Enqueued ${ids.length} entities for reprocessing`);

    return new Response(
      JSON.stringify({
        success: true,
        count: ids.length,
        city: city ?? "all",
        vertical: vertical ?? "all",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[reprocess]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
