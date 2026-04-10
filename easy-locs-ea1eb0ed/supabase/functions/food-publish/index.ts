import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, published = 0;

  try {
    const { data: merchants } = await supabase
      .from("seed_merchants")
      .select("id, visibility_mode, is_published")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .eq("pipeline_stage", "gated")
      .limit(500);

    if (!merchants?.length) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of merchants) {
      rowsRead++;
      if (["live", "search_only", "coming_soon"].includes(m.visibility_mode)) {
        await supabase.from("seed_merchants").update({
          pipeline_stage: "published",
          published_at: new Date().toISOString(),
          pipeline_last_run_at: new Date().toISOString(),
        }).eq("id", m.id);
        published++;
      } else {
        await supabase.from("seed_merchants").update({
          pipeline_stage: "published",
          is_published: false,
          pipeline_last_run_at: new Date().toISOString(),
        }).eq("id", m.id);
      }
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-publish-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: rowsRead, db_rows_affected: published,
      effect_summary: `Published ${published}/${rowsRead} merchants`,
    });

    return new Response(JSON.stringify({ success: true, published, total: rowsRead }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-publish-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
