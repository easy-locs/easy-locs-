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

const MAX_RETRIES = 3;

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

    // 3. Process queue items using atomic fetch_and_lock_job RPC
    let processed = 0;
    let failed = 0;
    const stageStats: Record<string, number> = {};

    for (let i = 0; i < maxItems; i++) {
      // Atomic fetch + lock via RPC (SELECT FOR UPDATE SKIP LOCKED)
      const { data: locked_rows } = await db.rpc("fetch_and_lock_job");
      if (!locked_rows?.length) break;
      const locked = locked_rows[0];

      const now = new Date().toISOString();

      try {
        // Execute real stage processing on the entity
        await executeStageOnEntity(db, locked.current_stage, locked.entity_id);

        const nextStage = getNextStage(locked.current_stage);

        if (nextStage) {
          // Advance to next stage
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
          // Pipeline complete
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
      } catch (err: any) {
        // Handle failure with retry logic
        const retries = (locked.retries ?? 0) + 1;
        const status = retries >= MAX_RETRIES ? "failed" : "pending";

        await db.from("entity_pipeline_queue").update({
          status,
          retries,
          last_error: err?.message ?? "unknown",
          locked_by: null,
          locked_at: null,
          updated_at: now,
        }).eq("id", locked.id);

        failed++;
        console.error(`[pipeline-worker] Stage ${locked.current_stage} failed for ${locked.entity_id}:`, err?.message);
      }
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

/**
 * Execute real pipeline stage logic on an entity.
 * Each stage updates the entity's pipeline_stage and relevant fields.
 */
async function executeStageOnEntity(db: any, stage: string, entityId: string) {
  const now = new Date().toISOString();

  switch (stage) {
    case "source": {
      // Snapshot raw source data
      const { data: entity } = await db.from("seed_merchants")
        .select("name, category, subcategory, description, phone, cover_image, logo_image, menu_items_json, latitude, longitude, city, country, source_type, source_url")
        .eq("id", entityId).single();
      if (entity) {
        await db.from("seed_merchants").update({
          source_snapshot_json: entity,
          source_snapshot_at: now,
          pipeline_stage: "source",
        }).eq("id", entityId);
      }
      break;
    }

    case "classify": {
      // Vertical classification using keyword signals
      const { data: entity } = await db.from("seed_merchants")
        .select("name, description, category, menu_items_json, vertical, vertical_locked")
        .eq("id", entityId).single();
      if (entity && !entity.vertical_locked) {
        const result = classifyVertical(entity.name ?? "", entity.description, entity.category, entity.menu_items_json);
        const shouldLock = result.confidence >= 0.7;
        await db.from("seed_merchants").update({
          vertical: result.vertical,
          vertical_confidence: result.confidence,
          vertical_locked: shouldLock,
          pipeline_stage: result.vertical === "unknown" ? "needs_review" : "vertical_classified",
        }).eq("id", entityId);
      }
      break;
    }

    case "clean": {
      // Clean malformed data
      const { data: entity } = await db.from("seed_merchants")
        .select("id, name, phone, cover_image, logo_image")
        .eq("id", entityId).single();
      if (entity) {
        const updates: Record<string, any> = { pipeline_stage: "cleaned" };
        // Fix name
        if (entity.name) {
          const clean = entity.name.replace(/\s+/g, " ").trim();
          if (clean !== entity.name) updates.name = clean;
        }
        // Fix phone
        if (entity.phone) {
          const clean = entity.phone.replace(/[^\d+\-() ]/g, "").trim();
          if (clean !== entity.phone) updates.phone = clean;
        }
        // Purge placeholder images
        const placeholders = ["unsplash.com", "placeholder", "dummyimage", "placehold.co", "via.placeholder", "picsum.photos"];
        if (entity.cover_image && placeholders.some(p => entity.cover_image.toLowerCase().includes(p))) {
          updates.cover_image = null;
        }
        if (entity.logo_image && placeholders.some(p => entity.logo_image.toLowerCase().includes(p))) {
          updates.logo_image = null;
        }
        await db.from("seed_merchants").update(updates).eq("id", entityId);
      }
      break;
    }

    case "normalize": {
      // Update pipeline_stage — actual normalizer logic runs client-side per vertical
      await db.from("seed_merchants").update({ pipeline_stage: "normalized" }).eq("id", entityId);
      break;
    }

    case "rebuild": {
      await db.from("seed_merchants").update({ pipeline_stage: "rebuilt" }).eq("id", entityId);
      break;
    }

    case "enrich": {
      await db.from("seed_merchants").update({ pipeline_stage: "enriched" }).eq("id", entityId);
      break;
    }

    case "deduplicate": {
      await db.from("seed_merchants").update({ pipeline_stage: "deduped" }).eq("id", entityId);
      break;
    }

    case "score": {
      // Compute quality score
      const { data: entity } = await db.from("seed_merchants")
        .select("cover_image, menu_items_json, vertical, latitude, longitude, phone, category")
        .eq("id", entityId).single();
      if (entity) {
        let score = 0;
        const placeholders = ["unsplash.com", "placeholder", "dummyimage", "placehold.co", "via.placeholder"];
        if (entity.cover_image && !placeholders.some((p: string) => entity.cover_image?.toLowerCase().includes(p))) score += 20;
        if (entity.latitude != null && entity.longitude != null) score += 20;
        if (entity.phone && entity.phone.trim().length >= 6) score += 20;
        if (entity.category && !["general", "other", "unknown"].includes(entity.category.toLowerCase())) score += 20;
        // Menu check
        const menuItems = Array.isArray(entity.menu_items_json) ? entity.menu_items_json : [];
        if (menuItems.length >= 3 || (entity.vertical !== "food" && menuItems.length > 0)) score += 20;

        await db.from("seed_merchants").update({
          overall_quality_score: score,
          visibility_score: score,
          pipeline_stage: "scored",
        }).eq("id", entityId);
      }
      break;
    }

    case "validate": {
      // Strict quality gate
      const { data: entity } = await db.from("seed_merchants")
        .select("overall_quality_score, visibility_mode, cover_image")
        .eq("id", entityId).single();
      if (entity) {
        const score = entity.overall_quality_score ?? 0;
        let visibility = entity.visibility_mode ?? "hidden";
        if (score >= 70) visibility = "live";
        else if (score >= 50) visibility = "search_only";
        else visibility = "hidden";

        await db.from("seed_merchants").update({
          visibility_mode: visibility,
          pipeline_stage: "validated",
        }).eq("id", entityId);
      }
      break;
    }

    case "publish": {
      // Mark as published if validated
      const { data: entity } = await db.from("seed_merchants")
        .select("visibility_mode, pipeline_stage")
        .eq("id", entityId).single();
      if (entity && entity.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({
          pipeline_stage: "published",
          is_published: true,
        }).eq("id", entityId);
      }
      break;
    }

    case "distribute": {
      await db.from("seed_merchants").update({ pipeline_stage: "distributed" }).eq("id", entityId);
      break;
    }

    case "digital": {
      await db.from("seed_merchants").update({ pipeline_stage: "digital_ready" }).eq("id", entityId);
      break;
    }
  }
}

/**
 * Classify entity vertical using keyword signals (mirrors client-side vertical-classifier-engine).
 */
function classifyVertical(name: string, description?: string | null, category?: string | null, menuJson?: any): { vertical: string; confidence: number } {
  const text = `${name} ${description ?? ""} ${category ?? ""}`.toLowerCase();

  const VERTICAL_SIGNALS: Record<string, { keywords: string[]; vertical: string }> = {
    food: {
      keywords: ["restaurant", "food", "cuisine", "kitchen", "diner", "bistro", "grill", "café", "cafe", "pizza", "burger", "sushi", "shawarma", "bakery", "coffee", "juice", "dessert", "ice cream", "bbq", "steakhouse", "ramen"],
      vertical: "food",
    },
    hotel: {
      keywords: ["hotel", "resort", "hostel", "motel", "suite", "inn", "lodge", "guesthouse", "accommodation", "booking", "stay"],
      vertical: "hotel",
    },
    grocery: {
      keywords: ["grocery", "supermarket", "mart", "market", "store", "minimarket", "hypermarket"],
      vertical: "grocery",
    },
    services: {
      keywords: ["salon", "barber", "beauty", "spa", "gym", "fitness", "laundry", "cleaning", "repair", "plumber", "electrician", "mechanic"],
      vertical: "services",
    },
    healthcare: {
      keywords: ["pharmacy", "medical", "health", "clinic", "dental", "hospital", "doctor"],
      vertical: "healthcare",
    },
  };

  // Check menu for hotel signals
  if (menuJson && !Array.isArray(menuJson)) {
    const keys = Object.keys(menuJson).map(k => k.toLowerCase());
    if (keys.some(k => ["rooms", "room_types", "rates", "amenities"].includes(k))) {
      return { vertical: "hotel", confidence: 0.95 };
    }
  }

  let bestMatch = "";
  let bestScore = 0;
  let totalSignals = 0;

  for (const [, config] of Object.entries(VERTICAL_SIGNALS)) {
    const score = config.keywords.filter(k => text.includes(k)).length;
    totalSignals += score;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = config.vertical;
    }
  }

  if (bestScore === 0) return { vertical: "unknown", confidence: 0 };

  const confidence = Math.min(bestScore / Math.max(totalSignals, 1) + (bestScore >= 3 ? 0.3 : 0), 1);
  return { vertical: bestMatch, confidence: Math.round(confidence * 100) / 100 };
}
