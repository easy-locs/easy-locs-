import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function normalizeCategory(name: string): string {
  if (!name) return "Main Menu";
  return name.replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  let rowsRead = 0, rowsAffected = 0;

  try {
    const { data: merchants } = await supabase
      .from("seed_merchants")
      .select("id, raw_menu_json, name")
      .eq("source_type", "deliveroo")
      .eq("city", "dubai")
      .eq("pipeline_stage", "normalized")
      .limit(200);

    if (!merchants?.length) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to build" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of merchants) {
      rowsRead++;
      const raw = m.raw_menu_json as any;
      if (!raw?.categories?.length) {
        await supabase.from("seed_merchants").update({
          pipeline_stage: "menu_built",
          menu_items_json: null,
          menu_categories_json: null,
          menu_normalized_at: new Date().toISOString(),
          pipeline_last_run_at: new Date().toISOString(),
        }).eq("id", m.id);
        rowsAffected++;
        continue;
      }

      const categoryMap = new Map<string, any[]>();
      let itemIdx = 0;

      for (const cat of raw.categories) {
        const catName = normalizeCategory(cat.name);
        if (!cat.items?.length) continue;
        for (const item of cat.items) {
          if (!item.name?.trim()) continue;
          const entry = {
            id: `item_${itemIdx++}_${slugify(item.name)}`,
            name: item.name.trim(),
            slug: slugify(item.name),
            description: item.description?.trim() || "",
            price: typeof item.price === "number" ? item.price : 0,
            currency: item.currency || "AED",
            image: item.image || null,
            category_name: catName,
            tags: [],
            available: item.available !== false,
          };
          const arr = categoryMap.get(catName) || [];
          arr.push(entry);
          categoryMap.set(catName, arr);
        }
      }

      const menuCategories = Array.from(categoryMap.entries())
        .filter(([, items]) => items.length > 0)
        .map(([name, items]) => ({ name, slug: slugify(name), items }))
        .sort((a, b) => b.items.length - a.items.length);

      const allItems = menuCategories.flatMap(c => c.items);

      await supabase.from("seed_merchants").update({
        menu_items_json: allItems,
        menu_categories_json: menuCategories,
        menu_normalized_at: new Date().toISOString(),
        pipeline_stage: "menu_built",
        pipeline_last_run_at: new Date().toISOString(),
      }).eq("id", m.id);

      // Save normalized snapshot
      await supabase.from("merchant_menu_snapshots").insert({
        merchant_id: m.id,
        source: "deliveroo",
        normalized_json: { categories: menuCategories, total_items: allItems.length },
      }).then(() => {});

      rowsAffected++;
    }

    await supabase.from("engine_run_logs").insert({
      engine_name: "food-menu-builder-engine", trigger_source: "edge-function", status: "ok",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, rows_read: rowsRead, db_rows_affected: rowsAffected,
      effect_summary: `Built menus for ${rowsAffected} merchants`,
    });

    return new Response(JSON.stringify({ success: true, menus_built: rowsAffected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "food-menu-builder-engine", trigger_source: "edge-function", status: "error",
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started, effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
