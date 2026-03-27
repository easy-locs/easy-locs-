import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, enqueued = 0;

  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    // Find stale merchants
    const { data: stale } = await supabase
      .from("seed_merchants")
      .select("id, name, source_last_scraped_at, overall_quality_score, needs_rescrape")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .or(`source_last_scraped_at.lt.${threeDaysAgo},source_last_scraped_at.is.null,needs_rescrape.eq.true`)
      .limit(100);

    if (!stale?.length) {
      return new Response(JSON.stringify({ success: true, message: "All fresh" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of stale) {
      rowsRead++;
      const priority = (m.overall_quality_score ?? 0) < 50 ? 50 : 100;

      await supabase.from("source_ingestion_queue").insert({
        source: "deliveroo",
        city: "dubai",
        vertical: "food",
        payload: { merchant_id: m.id, name: m.name, action: "rescrape" },
        status: "pending",
        priority,
      });

      await supabase.from("seed_merchants").update({
        needs_rescrape: false,
      }).eq("id", m.id);

      enqueued++;
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-rescrape-monitor-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: rowsRead, db_rows_affected: enqueued,
      effect_summary: `Enqueued ${enqueued} for rescrape`,
    });

    return new Response(JSON.stringify({ success: true, enqueued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-rescrape-monitor-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
