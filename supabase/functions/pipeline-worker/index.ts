import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PIPELINE_STAGES = [
  "source", "classify", "clean", "normalize", "rebuild",
  "enrich", "deduplicate", "score", "validate", "publish",
  "distribute", "digital",
];

function getNextStage(current: string): string | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  return idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const maxItems = body.maxItems ?? 20;
    const workerId = `edge_${Date.now()}`;

    // 1. Recover stale items (locked > 10 min ago)
    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    await db.from("entity_pipeline_queue")
      .update({ status: "pending", locked_by: null, locked_at: null, updated_at: new Date().toISOString() })
      .eq("status", "processing")
      .lt("locked_at", cutoff);

    // 2. Auto-enqueue unprocessed entities
    const { data: unprocessed } = await db
      .from("seed_merchants")
      .select("id")
      .or("pipeline_stage.is.null,pipeline_stage.eq.source_raw")
      .eq("is_active", true)
      .limit(50);

    if (unprocessed?.length) {
      // Check which are already queued
      const ids = unprocessed.map((e: any) => e.id);
      const { data: existing } = await db
        .from("entity_pipeline_queue")
        .select("entity_id")
        .in("entity_id", ids)
        .in("status", ["pending", "processing"]);
      
      const existingIds = new Set((existing ?? []).map((e: any) => e.entity_id));
      const toEnqueue = ids.filter((id: string) => !existingIds.has(id));
      
      if (toEnqueue.length > 0) {
        const rows = toEnqueue.map((id: string) => ({
          entity_id: id,
          entity_type: "seed_merchant",
          current_stage: "source",
          next_stage: "classify",
          priority: 5,
          status: "pending",
        }));
        await db.from("entity_pipeline_queue").insert(rows);
      }
    }

    // 3. Process queue items
    let processed = 0;
    let failed = 0;
    const stageStats: Record<string, number> = {};

    for (let i = 0; i < maxItems; i++) {
      // Fetch next pending
      const { data: items } = await db
        .from("entity_pipeline_queue")
        .select("*")
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (!items?.length) break;
      const item = items[0];

      // Lock
      const { data: locked } = await db
        .from("entity_pipeline_queue")
        .update({
          status: "processing",
          locked_by: workerId,
          locked_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("*")
        .single();

      if (!locked) continue;

      // For edge function, we just advance the stage marker
      // The actual engine work is done by marking pipeline_stage on the entity
      const now = new Date().toISOString();
      const nextStage = getNextStage(locked.current_stage);

      // Update entity pipeline_stage
      await db.from("seed_merchants")
        .update({ pipeline_stage: locked.current_stage, updated_at: now })
        .eq("id", locked.entity_id);

      if (nextStage) {
        await db.from("entity_pipeline_queue").update({
          current_stage: nextStage,
          next_stage: getNextStage(nextStage),
          status: "pending",
          locked_by: null,
          locked_at: null,
          updated_at: now,
          stage_results_json: {
            ...(locked.stage_results_json ?? {}),
            [locked.current_stage]: { processed: 1, at: now },
          },
        }).eq("id", locked.id);
      } else {
        await db.from("entity_pipeline_queue").update({
          status: "done",
          locked_by: null,
          locked_at: null,
          updated_at: now,
          stage_results_json: {
            ...(locked.stage_results_json ?? {}),
            [locked.current_stage]: { processed: 1, at: now },
          },
        }).eq("id", locked.id);
      }

      stageStats[locked.current_stage] = (stageStats[locked.current_stage] ?? 0) + 1;
      processed++;
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      stages: stageStats,
      enqueuedNew: unprocessed?.length ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[pipeline-worker] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
