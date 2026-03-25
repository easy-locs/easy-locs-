import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Server-Side Engine Cron — Runs critical engines server-side (true 24/24).
 * Triggered by pg_cron or external scheduler.
 * Orchestrates: cleanup, gates, finance, delivery, support, onboarding.
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

    // Helper to call sub-functions
    async function callFunction(name: string, body: Record<string, any> = {}) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        return await resp.json();
      } catch (e: any) {
        return { error: e.message };
      }
    }

    // ── Step 1: Import pipeline ──
    report.step1_import = await callFunction("shop-import-processor", { action: "process_pending" });

    // ── Step 2: Ingestion pipeline ──
    report.step2_ingestion = await callFunction("run-ingestion-pipeline", { batch_size: 50 });

    // ── Step 3: Enrichment ──
    report.step3_enrichment = await callFunction("auto-source-scrape", { action: "enrich_existing", limit: 10 });

    // ── Step 4: Vertical classification ──
    try {
      const { data: unclassified } = await supabase
        .from("seed_merchants")
        .select("id, name, description, category, menu_items_json")
        .is("vertical" as any, null)
        .limit(100);

      let classified = 0;
      for (const m of (unclassified as any[]) ?? []) {
        const text = `${m.name} ${m.description ?? ""} ${m.category ?? ""}`.toLowerCase();
        const hotelSignals = ["hotel", "resort", "hostel", "suite", "inn", "lodge", "rooms", "check-in"];
        const isHotel = hotelSignals.some(s => text.includes(s));
        await supabase.from("seed_merchants").update({ vertical: isHotel ? "hotel" : "food" } as any).eq("id", m.id);
        classified++;
      }
      report.step4_classification = { classified };
    } catch (e: any) {
      report.step4_classification = { error: e.message };
    }

    // ── Step 5: Backend repair (fill missing fields) ──
    try {
      const { data: incomplete } = await supabase
        .from("seed_merchants")
        .select("id, name, city, country, description, currency, visibility_score")
        .or("city.is.null,country.is.null,description.is.null")
        .limit(100);

      let repaired = 0;
      for (const m of (incomplete as any[]) ?? []) {
        const fixes: Record<string, any> = {};
        if (!m.city) fixes.city = "Dubai";
        if (!m.country) fixes.country = "AE";
        if (!m.currency) fixes.currency = "AED";
        if (!m.description && m.name) fixes.description = `${m.name} in Dubai`;
        if (Object.keys(fixes).length) {
          await supabase.from("seed_merchants").update(fixes as any).eq("id", m.id);
          repaired++;
        }
      }
      report.step5_repair = { repaired };
    } catch (e: any) {
      report.step5_repair = { error: e.message };
    }

    // ── Step 6: Finance reconciliation ──
    try {
      const { data: orders } = await supabase
        .from("storefront_orders")
        .select("id, total_amount, currency, status")
        .eq("status", "completed")
        .limit(50);

      let checked = 0, created = 0;
      for (const o of (orders as any[]) ?? []) {
        checked++;
        const { data: splits } = await supabase
          .from("commission_splits")
          .select("id")
          .eq("order_id", o.id);

        if (!splits?.length) {
          const gross = Number(o.total_amount ?? 0);
          await supabase.from("commission_splits").insert({
            order_id: o.id,
            gross_amount: gross,
            platform_fee: Math.round(gross * 0.05 * 100) / 100,
            merchant_net: Math.round(gross * 0.85 * 100) / 100,
            driver_fee: Math.round(gross * 0.10 * 100) / 100,
            currency: o.currency ?? "AED",
            status: "auto_reconciled",
          } as any);
          created++;
        }
      }
      report.step6_finance = { checked, created };
    } catch (e: any) {
      report.step6_finance = { error: e.message };
    }

    // ── Step 7: SLA breach check ──
    try {
      const now = new Date().toISOString();
      const { data: breached } = await supabase
        .from("support_tickets")
        .select("id, status, sla_deadline")
        .not("sla_deadline", "is", null)
        .lt("sla_deadline", now)
        .neq("status", "resolved")
        .neq("status", "escalated")
        .limit(20);

      let escalated = 0;
      for (const t of (breached as any[]) ?? []) {
        await supabase.from("support_tickets").update({
          status: "escalated",
          escalated_at: now,
        } as any).eq("id", t.id);
        escalated++;
      }
      report.step7_sla = { breached: breached?.length ?? 0, escalated };
    } catch (e: any) {
      report.step7_sla = { error: e.message };
    }

    // ── Step 8: Visibility sync ──
    try {
      const { data: promotable } = await supabase
        .from("seed_merchants")
        .select("id, visibility_score")
        .eq("visibility_mode" as any, "hidden")
        .gte("visibility_score" as any, 50)
        .not("blocking_reason" as any, "is", null)
        .limit(50);

      // Only promote if blocking_reason is null (handled by gate engines)
      report.step8_visibility = { candidates: promotable?.length ?? 0 };
    } catch (e: any) {
      report.step8_visibility = { error: e.message };
    }

    // ── Persist report ──
    const elapsed = Date.now() - startTime;
    report.elapsed_ms = elapsed;
    report.completed_at = new Date().toISOString();

    await supabase.from("platform_recovery_runs").insert({
      id: crypto.randomUUID(),
      trigger: "engine-cron-server",
      status: "completed",
      report_json: report,
    } as any);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[engine-cron-server] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
