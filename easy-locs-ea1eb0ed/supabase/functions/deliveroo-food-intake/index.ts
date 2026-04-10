import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const started = Date.now();
  let rowsRead = 0, rowsAffected = 0, skipped = 0;

  try {
    const body = await req.json().catch(() => ({}));
    const merchants: any[] = body.merchants || [];

    if (!merchants.length) {
      return new Response(JSON.stringify({ success: true, message: "No merchants to ingest" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const raw of merchants) {
      rowsRead++;
      const city = (raw.city || "").toLowerCase().trim();
      const source = (raw.source || "deliveroo").toLowerCase().trim();

      if (city !== "dubai" && city !== "dubaï" && city !== "dxb") { skipped++; continue; }
      if (source !== "deliveroo") { skipped++; continue; }
      if (!raw.name?.trim()) { skipped++; continue; }

      const sourceEntityId = raw.source_entity_id || raw.id || `dlv_${Date.now()}`;

      // Check existing
      const { data: existing } = await supabase
        .from("seed_merchants")
        .select("id")
        .eq("source_type", "deliveroo")
        .eq("source_entity_id", sourceEntityId)
        .maybeSingle();

      const record: Record<string, any> = {
        name: raw.name.trim(),
        source_type: "deliveroo",
        source_entity_id: sourceEntityId,
        source_url: raw.source_url || null,
        source_payload: raw,
        source_last_scraped_at: new Date().toISOString(),
        city: "dubai",
        country: "AE",
        vertical: "food",
        is_food: true,
        category: raw.category || "restaurant",
        subcategory: raw.subcategory || "casual_dining",
        area: raw.area || "dubai",
        address: raw.address || null,
        latitude: raw.latitude ?? null,
        longitude: raw.longitude ?? null,
        phone: raw.phone || null,
        logo_image: raw.logo || null,
        cover_image: raw.cover_image || null,
        gallery_images: raw.gallery_images || null,
        raw_menu_json: raw.menu || null,
        rating: raw.rating ?? 0,
        review_count: raw.review_count ?? 0,
        delivery_time_min: raw.delivery_time_min ?? 0,
        delivery_time_max: raw.delivery_time_max ?? 0,
        minimum_order_amount: raw.minimum_order_amount ?? null,
        halal: raw.halal ?? null,
        cuisine_tags: raw.cuisine_tags || null,
        pipeline_stage: "intake",
        pipeline_status: "processing",
        pipeline_last_run_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("seed_merchants").update(record).eq("id", existing.id);
      } else {
        record.tier = "standard";
        record.price_level = 2;
        record.is_active = true;
        record.is_open = true;
        record.is_featured = false;
        await supabase.from("seed_merchants").insert(record);
      }

      // Save menu snapshot
      if (raw.menu) {
        await supabase.from("merchant_menu_snapshots").insert({
          merchant_id: existing?.id || undefined,
          source: "deliveroo",
          snapshot_json: raw.menu,
        }).then(() => {});
      }

      rowsAffected++;
    }

    // Log run
    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine",
      trigger_source: "edge-function",
      status: "ok",
      started_at: new Date(started).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      rows_read: rowsRead,
      db_rows_affected: rowsAffected,
      side_effect_count: 0,
      effect_summary: `Intake: ${rowsAffected} upserted, ${skipped} skipped`,
    });

    return new Response(JSON.stringify({
      success: true,
      rows_read: rowsRead,
      rows_affected: rowsAffected,
      skipped,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine",
      trigger_source: "edge-function",
      status: "error",
      started_at: new Date(started).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      effect_summary: `Error: ${(err as Error).message}`,
    }).then(() => {});

    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
