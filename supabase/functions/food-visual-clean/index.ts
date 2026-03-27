import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLACEHOLDER_PATTERNS = ["via.placeholder", "placehold.co", "dummyimage", "images.unsplash.com", "unsplash.com", "placeholder.com", "picsum.photos"];

function isPlaceholder(url: string | null): boolean {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some(p => url.toLowerCase().includes(p));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, rowsAffected = 0;

  try {
    const { data: merchants } = await supabase
      .from("seed_merchants")
      .select("id, logo_image, cover_image")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .eq("pipeline_stage", "menu_built")
      .limit(500);

    if (!merchants?.length) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to clean" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect duplicate covers
    const coverMap = new Map<string, string[]>();
    for (const m of merchants) {
      if (m.cover_image && !isPlaceholder(m.cover_image)) {
        const key = m.cover_image.toLowerCase().trim();
        const ids = coverMap.get(key) || [];
        ids.push(m.id);
        coverMap.set(key, ids);
      }
    }
    const duplicateIds = new Set<string>();
    for (const ids of coverMap.values()) {
      if (ids.length > 1) ids.forEach(id => duplicateIds.add(id));
    }

    for (const m of merchants) {
      rowsRead++;
      const logoOk = !isPlaceholder(m.logo_image);
      const coverOk = !isPlaceholder(m.cover_image);
      const isDuplicate = duplicateIds.has(m.id);

      // Write audit row
      await supabase.from("merchant_visual_audit").insert({
        merchant_id: m.id,
        logo_ok: logoOk,
        cover_ok: coverOk,
        duplicate_cover: isDuplicate,
        placeholder_logo: !logoOk,
        placeholder_cover: !coverOk,
        notes: [
          !logoOk ? "placeholder_logo" : null,
          !coverOk ? "placeholder_cover" : null,
          isDuplicate ? "duplicate_cover" : null,
        ].filter(Boolean),
      });

      // Clear placeholder images
      const updates: Record<string, any> = {
        visual_cleaned_at: new Date().toISOString(),
        pipeline_stage: "visual_clean",
        pipeline_last_run_at: new Date().toISOString(),
      };
      if (!logoOk) updates.logo_image = null;
      if (!coverOk) updates.cover_image = null;

      await supabase.from("seed_merchants").update(updates).eq("id", m.id);
      rowsAffected++;
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-visual-clean-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: rowsRead, db_rows_affected: rowsAffected,
      effect_summary: `Cleaned ${rowsAffected} visuals, ${duplicateIds.size} duplicate covers`,
    });

    return new Response(JSON.stringify({ success: true, cleaned: rowsAffected, duplicates: duplicateIds.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-visual-clean-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
