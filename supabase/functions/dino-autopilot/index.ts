import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Collect insights
    const { count: criticalCount } = await supabase
      .from("dino_issues")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("severity", "critical");

    let riskLevel = "low";
    if ((criticalCount ?? 0) > 5) riskLevel = "critical";
    else if ((criticalCount ?? 0) > 2) riskLevel = "high";

    // 2) Inactive pros
    const { data: inactivePros } = await supabase
      .from("dino_pro_performance")
      .select("pro_id")
      .lt("overall_score", 30)
      .limit(20);

    const proIds = (inactivePros ?? []).map((p: any) => p.pro_id);

    // 3) Market gaps
    const { data: gaps } = await supabase
      .from("dino_market_balance")
      .select("category, city, supply_count, demand_score")
      .lt("supply_count", 3)
      .gt("demand_score", 50)
      .limit(5);

    // 4) Execute actions
    let actionsExecuted = 0;

    // Activate inactive pros
    if (proIds.length > 0) {
      await supabase.from("dino_notifications").insert(
        proIds.slice(0, 20).map((pid: string) => ({
          actor_type: "pro",
          actor_id: pid,
          channel: "email",
          template_key: "pro_quick_activate",
          payload_json: { source: "autopilot" },
          status: "pending",
        }))
      );
      actionsExecuted += proIds.length;
    }

    // Boost gap categories
    if (gaps && gaps.length > 0) {
      await supabase.from("dino_learning_events").insert(
        gaps.map((g: any) => ({
          event_type: "boost_applied",
          source_module: "autopilot",
          context_json: { category: g.category, city: g.city },
          outcome: "pending",
        }))
      );
      actionsExecuted += gaps.length;
    }

    // 5) Record cycle
    await supabase.from("dino_learning_events").insert([{
      event_type: "autopilot_cycle",
      source_module: "autopilot",
      context_json: { riskLevel, prosActivated: proIds.length, gapsBoosted: gaps?.length ?? 0 },
      outcome: "success",
    }]);

    return new Response(JSON.stringify({
      success: true,
      riskLevel,
      actionsExecuted,
      prosActivated: proIds.length,
      gapsBoosted: gaps?.length ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
