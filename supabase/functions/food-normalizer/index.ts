import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKED_CATS = ["general", "other", "unknown", "null", "undefined", ""];

function slugify(name: string): string {
  return name.toLowerCase().replace(/['']/g, "").replace(/&/g, "and").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function inferCategory(name: string, menuJson: any): string {
  const corpus = (name + " " + JSON.stringify(menuJson || "")).toLowerCase();
  const map: Record<string, string[]> = {
    pizza: ["pizza", "calzone"], burger: ["burger", "smash"], sushi: ["sushi", "maki"],
    indian: ["biryani", "tandoori", "curry"], chinese: ["noodle", "wok", "dim sum"],
    lebanese: ["shawarma", "hummus", "manakish"], mexican: ["taco", "burrito"],
    thai: ["pad thai", "tom yum"], healthy: ["salad", "bowl", "poke"],
    dessert: ["cake", "donut", "waffle"], cafe: ["coffee", "latte"],
    chicken: ["fried chicken", "wings"],
  };
  let best = "restaurant", bestScore = 0;
  for (const [cat, kws] of Object.entries(map)) {
    const score = kws.reduce((a, k) => a + (corpus.includes(k) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, rowsAffected = 0;

  try {
    const { data: merchants } = await supabase
      .from("seed_merchants")
      .select("id, name, category, subcategory, phone, address, raw_menu_json, slug, cuisine_tags")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .eq("pipeline_stage", "intake")
      .limit(200);

    if (!merchants?.length) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to normalize" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of merchants) {
      rowsRead++;
      const cleanName = (m.name || "").replace(/\s+/g, " ").trim();
      let category = m.category || "";
      if (BLOCKED_CATS.includes(category.toLowerCase().trim())) {
        category = inferCategory(cleanName, m.raw_menu_json);
      }

      const phone = m.phone ? m.phone.replace(/[^\d+]/g, "") : null;
      const slug = m.slug || slugify(cleanName);

      await supabase.from("seed_merchants").update({
        name: cleanName,
        category,
        slug,
        phone: phone && phone.length >= 7 ? phone : null,
        pipeline_stage: "normalized",
        pipeline_last_run_at: new Date().toISOString(),
      }).eq("id", m.id);

      rowsAffected++;
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-normalizer-engine",
      trigger_source: "edge-function",
      status: "ok",
      started_at: new Date(started).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      rows_read: rowsRead,
      db_rows_affected: rowsAffected,
      effect_summary: `Normalized ${rowsAffected} merchants`,
    });

    return new Response(JSON.stringify({ success: true, normalized: rowsAffected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-normalizer-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
