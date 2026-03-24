import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Auto-Onboarding Cron — Orchestrates the full automation pipeline:
 * 1. Process pending raw imports → seed_merchants
 * 2. Run ingestion pipeline (normalization + merge + integrity + coherence)
 * 3. Enrich low-quality entities via Firecrawl
 * 4. Refresh rankings
 * 5. Sync visibility
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();
    const report: Record<string, any> = { started_at: new Date().toISOString() };

    // ── Step 1: Process pending raw imports ──
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/shop-import-processor`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "process_pending" }),
      });
      report.step1_import = await resp.json();
    } catch (e: any) {
      report.step1_import = { error: e.message };
    }

    // ── Step 2: Run ingestion pipeline ──
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/run-ingestion-pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batch_size: 50 }),
      });
      report.step2_ingestion = await resp.json();
    } catch (e: any) {
      report.step2_ingestion = { error: e.message };
    }

    // ── Step 3: Enrich low-quality entities ──
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/auto-source-scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "enrich_existing", limit: 10 }),
      });
      report.step3_enrichment = await resp.json();
    } catch (e: any) {
      report.step3_enrichment = { error: e.message };
    }

    // ── Step 4: Update rankings for affected entities ──
    try {
      const { data: candidates } = await supabase
        .from("seed_merchants")
        .select("id")
        .is("global_rank_score", null)
        .eq("country", "AE")
        .limit(100);

      let ranked = 0;
      if (candidates?.length) {
        for (const c of candidates) {
          const score = Math.random() * 40 + 30; // Base score, real ranking comes from client
          await supabase
            .from("seed_merchants")
            .update({ global_rank_score: Math.round(score) })
            .eq("id", c.id);
          ranked++;
        }
      }
      report.step4_ranking = { ranked };
    } catch (e: any) {
      report.step4_ranking = { error: e.message };
    }

    // ── Step 5: Visibility sync ──
    try {
      // Hidden entities with good scores should be promoted
      const { data: promotable } = await supabase
        .from("seed_merchants")
        .select("id, completeness_score, coherence_status")
        .eq("visibility_mode", "hidden")
        .gte("completeness_score", 50)
        .neq("coherence_status", "blocked")
        .eq("country", "AE")
        .limit(50);

      let promoted = 0;
      if (promotable?.length) {
        for (const e of promotable) {
          await supabase
            .from("seed_merchants")
            .update({ visibility_mode: "indexed_not_public" })
            .eq("id", e.id);
          promoted++;
        }
      }
      report.step5_visibility = { promoted };
    } catch (e: any) {
      report.step5_visibility = { error: e.message };
    }

    // ── Persist run report ──
    const elapsed = Date.now() - startTime;
    report.elapsed_ms = elapsed;
    report.completed_at = new Date().toISOString();

    await supabase.from("platform_recovery_runs").insert({
      id: crypto.randomUUID(),
      trigger: "auto-onboarding-cron",
      status: "completed",
      report_json: report,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-onboarding-cron] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
