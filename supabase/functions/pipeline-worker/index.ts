import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PIPELINE_STAGES = [
  "source", "classify", "clean", "normalize", "rebuild",
  "enrich", "deduplicate", "score", "validate", "publish",
  "distribute", "digital", "sync",
];

function getNextStage(current: string): string | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  return idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
}

const MAX_RETRIES = 3;

const PLACEHOLDER_PATTERNS = [
  "unsplash.com", "placeholder", "dummyimage", "placehold.co",
  "via.placeholder", "picsum.photos", "lorempixel", "stock-photo",
];

function isPlaceholder(url?: string | null): boolean {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some(p => url.toLowerCase().includes(p));
}

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

    // 0. Cleanup dead queue layers before doing any work
    const { data: syncedRows } = await db
      .from("entity_pipeline_queue")
      .select("entity_id")
      .eq("current_stage", "sync")
      .eq("status", "done")
      .limit(1000);

    const syncedIds = Array.from(new Set((syncedRows ?? []).map((row: any) => row.entity_id).filter(Boolean)));
    if (syncedIds.length > 0) {
      await db
        .from("entity_pipeline_queue")
        .delete()
        .in("entity_id", syncedIds)
        .in("status", ["pending", "processing"]);
    }

    const { data: activeRows } = await db
      .from("entity_pipeline_queue")
      .select("id, entity_id, updated_at")
      .in("status", ["pending", "processing"])
      .order("updated_at", { ascending: false })
      .limit(5000);

    const seenEntities = new Set<string>();
    const duplicateQueueIds: string[] = [];
    for (const row of activeRows ?? []) {
      if (!row.entity_id) continue;
      if (seenEntities.has(row.entity_id)) {
        duplicateQueueIds.push(row.id);
      } else {
        seenEntities.add(row.entity_id);
      }
    }

    if (duplicateQueueIds.length > 0) {
      await db.from("entity_pipeline_queue").delete().in("id", duplicateQueueIds);
    }

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
        .select("entity_id, status, current_stage")
        .in("entity_id", ids)
        .in("status", ["pending", "processing", "done"]);

      const existingIds = new Set(
        (existing ?? [])
          .filter((e: any) => ["pending", "processing"].includes(e.status) || (e.status === "done" && e.current_stage === "sync"))
          .map((e: any) => e.entity_id),
      );
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

    // 3. Process queue items
    let processed = 0;
    let failed = 0;
    const stageStats: Record<string, number> = {};

    for (let i = 0; i < maxItems; i++) {
      const { data: locked_rows } = await db.rpc("fetch_and_lock_job");
      if (!locked_rows?.length) break;
      const locked = locked_rows[0];
      const now = new Date().toISOString();

      try {
        await executeStageOnEntity(db, locked.current_stage, locked.entity_id);
        const nextStage = getNextStage(locked.current_stage);

        if (nextStage) {
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

          await db.from("entity_pipeline_queue")
            .delete()
            .eq("entity_id", locked.entity_id)
            .in("status", ["pending", "processing"])
            .neq("id", locked.id);
        } else {
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

          await db.from("entity_pipeline_queue")
            .delete()
            .eq("entity_id", locked.entity_id)
            .in("status", ["pending", "processing"]);
        }

        stageStats[locked.current_stage] = (stageStats[locked.current_stage] ?? 0) + 1;
        processed++;
      } catch (err: any) {
        const retries = (locked.retries ?? 0) + 1;
        const status = retries >= MAX_RETRIES ? "failed" : "pending";
        await db.from("entity_pipeline_queue").update({
          status, retries,
          last_error: err?.message ?? "unknown",
          locked_by: null, locked_at: null, updated_at: now,
        }).eq("id", locked.id);
        failed++;
        console.error(`[pipeline-worker] ${locked.current_stage} failed for ${locked.entity_id}: ${err?.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true, processed, failed, stages: stageStats,
      enqueuedNew: unprocessed?.length ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[pipeline-worker] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════
//  REAL STAGE PROCESSING — No hollow stages
// ═══════════════════════════════════════════════════

async function executeStageOnEntity(db: any, stage: string, entityId: string) {
  const now = new Date().toISOString();

  switch (stage) {
    case "source": {
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
      const { data: entity } = await db.from("seed_merchants")
        .select("name, description, category, menu_items_json, vertical, vertical_locked")
        .eq("id", entityId).single();
      if (entity && !entity.vertical_locked) {
        const result = classifyVertical(entity.name ?? "", entity.description, entity.category, entity.menu_items_json);
        await db.from("seed_merchants").update({
          vertical: result.vertical,
          vertical_confidence: result.confidence,
          vertical_locked: result.confidence >= 0.7,
          pipeline_stage: result.vertical === "unknown" ? "needs_review" : "vertical_classified",
        }).eq("id", entityId);
      } else {
        await db.from("seed_merchants").update({ pipeline_stage: "vertical_classified" }).eq("id", entityId);
      }
      break;
    }

    case "clean": {
      const { data: entity } = await db.from("seed_merchants")
        .select("id, name, phone, cover_image, logo_image, description, menu_items_json")
        .eq("id", entityId).single();
      if (entity) {
        const updates: Record<string, any> = { pipeline_stage: "cleaned" };

        // Clean name
        if (entity.name) {
          let clean = entity.name.replace(/\s+/g, " ").trim();
          clean = clean.replace(/[*#@!]+/g, "").trim();
          clean = clean.replace(/^[-–—•·]+\s*/, "").trim();
          if (clean !== entity.name) updates.name = clean;
        }

        // Clean phone
        if (entity.phone) {
          const clean = entity.phone.replace(/[^\d+\-() ]/g, "").trim();
          if (clean !== entity.phone) updates.phone = clean;
        }

        // Purge placeholder images
        if (isPlaceholder(entity.cover_image)) updates.cover_image = null;
        if (isPlaceholder(entity.logo_image)) updates.logo_image = null;

        // Clean description
        if (entity.description) {
          let desc = entity.description.replace(/<[^>]*>/g, "").replace(/\s{2,}/g, " ").trim();
          if (desc.length < 5) desc = "";
          if (desc !== entity.description) updates.description = desc || null;
        }

        // Strip duplicate images inside menu
        if (entity.menu_items_json) {
          const menu = stripDuplicateMenuImages(entity.menu_items_json);
          if (menu.changed) updates.menu_items_json = menu.items;
        }

        await db.from("seed_merchants").update(updates).eq("id", entityId);
      }
      break;
    }

    case "normalize": {
      // Real normalization: standardize menu structure, fix categories
      const { data: entity } = await db.from("seed_merchants")
        .select("id, vertical, menu_items_json, category, subcategory")
        .eq("id", entityId).single();
      if (entity) {
        const updates: Record<string, any> = { pipeline_stage: "normalized" };

        // Normalize menu structure into canonical format
        if (entity.menu_items_json && entity.vertical === "food") {
          const normalized = normalizeMenuStructure(entity.menu_items_json);
          updates.menu_items_json = normalized.menu;
          updates.menu_quality_score = normalized.score;
          updates.menu_normalized_at = now;
        }

        // Normalize category naming
        if (entity.category) {
          updates.category = entity.category.toLowerCase().trim();
        }
        if (entity.subcategory) {
          updates.subcategory = entity.subcategory.toLowerCase().replace(/\s+/g, "_").trim();
        }

        await db.from("seed_merchants").update(updates).eq("id", entityId);
      }
      break;
    }

    case "rebuild": {
      // Rebuild menu: dedup items, auto-categorize, remove junk
      const { data: entity } = await db.from("seed_merchants")
        .select("id, menu_items_json, raw_menu_json, vertical")
        .eq("id", entityId).single();
      if (entity && entity.vertical === "food") {
        const source = entity.raw_menu_json || entity.menu_items_json;
        if (source) {
          const items = flattenMenuItems(source);
          const cleaned = rebuildMenuItems(items);
          const sections = groupIntoSections(cleaned);
          
          await db.from("seed_merchants").update({
            menu_items_json: { sections, totalItems: cleaned.length },
            menu_sections_json: sections,
            menu_quality_score: computeMenuScore(cleaned),
            menu_quality_flag: cleaned.length >= 3 ? "rebuilt" : "too_few_items",
            pipeline_stage: "rebuilt",
          }).eq("id", entityId);
        } else {
          await db.from("seed_merchants").update({
            pipeline_stage: "rebuilt",
            menu_quality_flag: "no_menu_data",
          }).eq("id", entityId);
        }
      } else {
        await db.from("seed_merchants").update({ pipeline_stage: "rebuilt" }).eq("id", entityId);
      }
      break;
    }

    case "enrich": {
      // Enrich: auto-generate description if missing, fix subcategory
      const { data: entity } = await db.from("seed_merchants")
        .select("id, name, description, category, subcategory, city, vertical, menu_items_json")
        .eq("id", entityId).single();
      if (entity) {
        const updates: Record<string, any> = { pipeline_stage: "enriched" };

        // Auto-generate description if missing
        if (!entity.description && entity.name) {
          const menuHint = getMenuHint(entity.menu_items_json);
          const desc = `${entity.name} — ${entity.subcategory || entity.category || entity.vertical} in ${entity.city || "Dubai"}${menuHint ? `. ${menuHint}` : ""}`;
          updates.description = desc;
        }

        // Refine subcategory from menu if still "general"
        if (entity.subcategory === "general" && entity.menu_items_json) {
          const refined = detectSubcategoryFromMenu(entity.menu_items_json);
          if (refined !== "general") updates.subcategory = refined;
        }

        await db.from("seed_merchants").update(updates).eq("id", entityId);
      }
      break;
    }

    case "deduplicate": {
      // Check for potential duplicates by name+city
      const { data: entity } = await db.from("seed_merchants")
        .select("id, name, city, phone, latitude, longitude")
        .eq("id", entityId).single();
      if (entity && entity.name) {
        const { data: potentialDups } = await db.from("seed_merchants")
          .select("id, name, phone, latitude, longitude")
          .ilike("name", entity.name)
          .eq("city", entity.city ?? "Dubai")
          .neq("id", entityId)
          .limit(5);

        if (potentialDups?.length) {
          // Mark as potential duplicate for review, don't auto-merge
          await db.from("seed_merchants").update({
            pipeline_stage: "deduped",
            dedup_status: "potential_duplicate",
            dedup_candidates: potentialDups.map((d: any) => d.id),
          }).eq("id", entityId);
        } else {
          await db.from("seed_merchants").update({
            pipeline_stage: "deduped",
            dedup_status: "unique",
          }).eq("id", entityId);
        }
      } else {
        await db.from("seed_merchants").update({ pipeline_stage: "deduped" }).eq("id", entityId);
      }
      break;
    }

    case "score": {
      const { data: entity } = await db.from("seed_merchants")
        .select("cover_image, menu_items_json, vertical, latitude, longitude, phone, category, subcategory, description, name, city, gallery_images")
        .eq("id", entityId).single();
      if (entity) {
        let score = 0;

        // Real photo (not placeholder) +20
        if (entity.cover_image && !isPlaceholder(entity.cover_image)) score += 20;

        // Geo coordinates +15
        if (entity.latitude != null && entity.longitude != null) score += 15;

        // Phone +10
        if (entity.phone && entity.phone.trim().length >= 6) score += 10;

        // Valid category +10
        if (entity.category && !["general", "other", "unknown"].includes(entity.category.toLowerCase())) score += 10;

        // Valid subcategory +5
        if (entity.subcategory && !["general", "other", "unknown"].includes(entity.subcategory.toLowerCase())) score += 5;

        // Description +10
        if (entity.description && entity.description.length > 20) score += 10;

        // Menu items +20 (scaled)
        const menuItems = flattenMenuItems(entity.menu_items_json);
        if (entity.vertical === "food") {
          if (menuItems.length >= 10) score += 20;
          else if (menuItems.length >= 5) score += 15;
          else if (menuItems.length >= 3) score += 10;
        } else {
          if (menuItems.length > 0) score += 15;
          else score += 10; // Non-food doesn't need menu
        }

        // Gallery bonus +5
        if (Array.isArray(entity.gallery_images) && entity.gallery_images.length >= 3) score += 5;

        // Name quality +5
        if (entity.name && entity.name.length >= 3 && entity.name.length <= 60) score += 5;

        const tier = score >= 80 ? "premium" : score >= 60 ? "standard" : score >= 40 ? "basic" : "low";

        await db.from("seed_merchants").update({
          overall_quality_score: score,
          visibility_score: score,
          tier,
          pipeline_stage: "scored",
        }).eq("id", entityId);
      }
      break;
    }

    case "validate": {
      const { data: entity } = await db.from("seed_merchants")
        .select("overall_quality_score, visibility_mode, cover_image, vertical, menu_items_json, name")
        .eq("id", entityId).single();
      if (entity) {
        const score = entity.overall_quality_score ?? 0;
        let visibility = "hidden";
        const gateFailures: string[] = [];

        // Check required fields
        if (!entity.name || entity.name.length < 2) gateFailures.push("missing_name");
        if (isPlaceholder(entity.cover_image)) gateFailures.push("placeholder_image");

        // Food needs menu
        if (entity.vertical === "food") {
          const items = flattenMenuItems(entity.menu_items_json);
          if (items.length < 3) gateFailures.push("insufficient_menu");
        }

        // Score-based visibility
        if (gateFailures.length === 0) {
          if (score >= 70) visibility = "live";
          else if (score >= 50) visibility = "search_only";
        }

        await db.from("seed_merchants").update({
          visibility_mode: visibility,
          pipeline_stage: "validated",
          publish_gate_status: gateFailures.length === 0 ? "passed" : "failed",
          gate_failures: gateFailures,
        }).eq("id", entityId);
      }
      break;
    }

    case "publish": {
      const { data: entity } = await db.from("seed_merchants")
        .select("visibility_mode, pipeline_stage")
        .eq("id", entityId).single();
      if (entity && entity.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({
          pipeline_stage: "published",
          is_published: true,
          published_at: now,
        }).eq("id", entityId);
      } else {
        await db.from("seed_merchants").update({
          pipeline_stage: "published",
          is_published: false,
        }).eq("id", entityId);
      }
      break;
    }

    case "distribute": {
      // Mark as distributed — ready for discovery surfaces
      await db.from("seed_merchants").update({
        pipeline_stage: "distributed",
        distributed_at: now,
      }).eq("id", entityId);
      break;
    }

    case "digital": {
      await db.from("seed_merchants").update({
        pipeline_stage: "digital_ready",
        digital_ready_at: now,
      }).eq("id", entityId);
      break;
    }

    case "sync": {
      // SYNC — Compute module readiness status for every module
      const { data: entity } = await db.from("seed_merchants")
        .select("id, name, vertical, overall_quality_score, visibility_mode, is_published, cover_image, menu_items_json, phone, latitude, longitude, category, subcategory, description, gallery_images, city")
        .eq("id", entityId).single();
      if (entity) {
        const score = entity.overall_quality_score ?? 0;
        const isLive = entity.visibility_mode === "live";
        const hasMenu = flattenMenuItems(entity.menu_items_json).length >= 3;
        const hasPhoto = entity.cover_image && !isPlaceholder(entity.cover_image);
        const hasGeo = entity.latitude != null && entity.longitude != null;
        const hasPhone = !!entity.phone && entity.phone.length >= 6;

        // Compute each module status
        const storefront_status = isLive && hasPhoto ? "ready" : score >= 50 ? "partial" : "locked";
        const menu_status = hasMenu ? "ready" : entity.vertical !== "food" ? "not_applicable" : "locked";
        const payment_status = isLive ? "partial" : "locked"; // Full requires Stripe/wallet setup
        const delivery_status = hasGeo ? (isLive ? "partial" : "locked") : "not_applicable";
        const radar_status = isLive && hasGeo ? "ready" : hasGeo ? "partial" : "locked";
        const orbit_status = isLive && hasPhone ? "ready" : hasPhone ? "partial" : "locked";
        const analytics_status = isLive ? "partial" : "locked";
        const boost_status = score >= 70 && isLive ? "ready" : score >= 50 ? "partial" : "locked";

        // Truth status (lifecycle)
        let truth_status = "draft";
        if (isLive && score >= 70) truth_status = "live";
        else if (isLive || score >= 50) truth_status = "partially_live";
        else if (score >= 40) truth_status = "ready_for_review";

        // Publish status
        let publish_status = "draft";
        if (isLive && score >= 70) publish_status = "live";
        else if (isLive) publish_status = "partially_live";
        else if (score >= 50) publish_status = "ready_for_review";
        else if (entity.visibility_mode === "hidden" && score < 30) publish_status = "blocked";

        // Count active modules
        const modules = [storefront_status, menu_status, payment_status, delivery_status, radar_status, orbit_status, analytics_status, boost_status];
        const active_modules = modules.filter(s => s === "ready").length;
        const applicable_modules = modules.filter(s => s !== "not_applicable").length;

        const module_summary_json = {
          storefront: storefront_status,
          menu: menu_status,
          payment: payment_status,
          delivery: delivery_status,
          radar: radar_status,
          orbit: orbit_status,
          analytics: analytics_status,
          boost: boost_status,
        };

        // Compute actionable hints
        const hints: string[] = [];
        if (menu_status === "locked" && entity.vertical === "food") hints.push("Add 3+ menu items to unlock boost");
        if (!hasGeo) hints.push("Add location to activate delivery & radar");
        if (!hasPhoto) hints.push("Add a cover photo to improve visibility");
        if (!hasPhone) hints.push("Add phone number to enable Orbit contact");

        await db.from("seed_merchants").update({
          storefront_status, menu_status, payment_status, delivery_status,
          radar_status, orbit_status, analytics_status, boost_status,
          truth_status, publish_status,
          active_modules, total_modules: applicable_modules,
          module_summary_json: { ...module_summary_json, hints },
          last_sync_at: now,
          pipeline_stage: "synced",
        }).eq("id", entityId);
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

function classifyVertical(name: string, description?: string | null, category?: string | null, menuJson?: any): { vertical: string; confidence: number } {
  const text = `${name} ${description ?? ""} ${category ?? ""}`.toLowerCase();

  const SIGNALS: Record<string, { keywords: string[]; vertical: string }> = {
    food: {
      keywords: ["restaurant", "food", "cuisine", "kitchen", "diner", "bistro", "grill", "café", "cafe", "pizza", "burger", "sushi", "shawarma", "bakery", "coffee", "juice", "dessert", "ice cream", "bbq", "steakhouse", "ramen", "noodle", "kebab"],
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
      keywords: ["salon", "barber", "beauty", "spa", "gym", "fitness", "laundry", "cleaning", "repair", "plumber", "electrician"],
      vertical: "services",
    },
    healthcare: {
      keywords: ["pharmacy", "medical", "health", "clinic", "dental", "hospital", "doctor"],
      vertical: "healthcare",
    },
  };

  if (menuJson && !Array.isArray(menuJson)) {
    const keys = Object.keys(menuJson).map(k => k.toLowerCase());
    if (keys.some(k => ["rooms", "room_types", "rates", "amenities"].includes(k))) {
      return { vertical: "hotel", confidence: 0.95 };
    }
  }

  let bestMatch = "";
  let bestScore = 0;
  let totalSignals = 0;

  for (const [, config] of Object.entries(SIGNALS)) {
    const score = config.keywords.filter(k => text.includes(k)).length;
    totalSignals += score;
    if (score > bestScore) { bestScore = score; bestMatch = config.vertical; }
  }

  if (bestScore === 0) return { vertical: "unknown", confidence: 0 };
  const confidence = Math.min(bestScore / Math.max(totalSignals, 1) + (bestScore >= 3 ? 0.3 : 0), 1);
  return { vertical: bestMatch, confidence: Math.round(confidence * 100) / 100 };
}

function flattenMenuItems(menuJson: any): any[] {
  if (!menuJson) return [];
  if (Array.isArray(menuJson)) return menuJson;
  if (menuJson.sections && Array.isArray(menuJson.sections)) {
    return menuJson.sections.flatMap((s: any) => s.items ?? []);
  }
  if (menuJson.items && Array.isArray(menuJson.items)) return menuJson.items;
  return [];
}

function stripDuplicateMenuImages(menuJson: any): { items: any; changed: boolean } {
  const items = flattenMenuItems(menuJson);
  if (items.length === 0) return { items: menuJson, changed: false };

  const imageCounts = new Map<string, number>();
  for (const item of items) {
    const img = item.photo_url || item.image || item.image_url;
    if (img) {
      const key = img.toLowerCase().trim();
      imageCounts.set(key, (imageCounts.get(key) || 0) + 1);
    }
  }

  let changed = false;
  const cleaned = items.map((item: any) => {
    const img = item.photo_url || item.image || item.image_url;
    if (img && (imageCounts.get(img.toLowerCase().trim()) || 0) > 1) {
      changed = true;
      const copy = { ...item };
      delete copy.photo_url;
      delete copy.image;
      delete copy.image_url;
      return copy;
    }
    return item;
  });

  if (!changed) return { items: menuJson, changed: false };

  if (menuJson.sections) {
    let idx = 0;
    const newSections = menuJson.sections.map((s: any) => ({
      ...s,
      items: (s.items ?? []).map(() => cleaned[idx++]),
    }));
    return { items: { ...menuJson, sections: newSections }, changed: true };
  }
  return { items: cleaned, changed: true };
}

const JUNK_NAMES = [
  "item", "item 1", "item 2", "menu item", "product", "test",
  "sample", "placeholder", "untitled", "n/a", "tbd", "null",
  "coming soon", "undefined", "none", "---", "total", "subtotal",
];

function rebuildMenuItems(items: any[]): any[] {
  const cleaned: any[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const name = (item.name || item.item_name || item.title || "").trim();
    if (!name || name.length < 2) continue;
    if (JUNK_NAMES.some(j => name.toLowerCase() === j)) continue;
    if (/^[\d\s.,€$£¥₹%+\-*/=]+$/.test(name)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const price = typeof item.price === "number" ? item.price : parseFloat(item.price);

    cleaned.push({
      name: name.replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: (item.description || item.item_description || "").trim() || undefined,
      price: (!isNaN(price) && price > 0 && price < 50000) ? price : undefined,
      category: (item.category || item.category_name || item.section || "").trim() || "Main",
      photo_url: (item.photo_url || item.image || item.image_url) ?? undefined,
    });
  }

  // Strip duplicate images
  const imgCount = new Map<string, number>();
  for (const item of cleaned) {
    if (item.photo_url) {
      const k = item.photo_url.toLowerCase();
      imgCount.set(k, (imgCount.get(k) || 0) + 1);
    }
  }
  for (const item of cleaned) {
    if (item.photo_url && (imgCount.get(item.photo_url.toLowerCase()) || 0) > 1) {
      item.photo_url = undefined;
    }
    // Also strip placeholders
    if (item.photo_url && isPlaceholder(item.photo_url)) {
      item.photo_url = undefined;
    }
  }

  return cleaned;
}

function groupIntoSections(items: any[]): { name: string; items: any[] }[] {
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const cat = item.category || "Main";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a === "Main" ? 1 : b === "Main" ? -1 : a.localeCompare(b))
    .map(([name, sectionItems]) => ({ name, items: sectionItems }));
}

function computeMenuScore(items: any[]): number {
  if (items.length === 0) return 0;
  let score = 0;
  if (items.length >= 10) score += 30;
  else if (items.length >= 5) score += 20;
  else if (items.length >= 3) score += 10;

  const withPrice = items.filter(i => i.price).length;
  score += Math.round((withPrice / items.length) * 30);

  const withDesc = items.filter(i => i.description).length;
  score += Math.round((withDesc / items.length) * 20);

  const withImg = items.filter(i => i.photo_url).length;
  score += Math.round((withImg / items.length) * 20);

  return Math.min(100, score);
}

function normalizeMenuStructure(menuJson: any): { menu: any; score: number } {
  const items = flattenMenuItems(menuJson);
  const cleaned = rebuildMenuItems(items);
  const sections = groupIntoSections(cleaned);
  const score = computeMenuScore(cleaned);
  return { menu: { sections, totalItems: cleaned.length }, score };
}

function getMenuHint(menuJson: any): string {
  const items = flattenMenuItems(menuJson);
  if (items.length === 0) return "";
  const names = items.slice(0, 5).map((i: any) => i.name || i.item_name || "").filter(Boolean);
  if (names.length === 0) return "";
  return `Serving ${names.slice(0, 3).join(", ")} and more`;
}

function detectSubcategoryFromMenu(menuJson: any): string {
  const items = flattenMenuItems(menuJson);
  const text = items.map((i: any) => `${i.name || ""} ${i.category || ""}`).join(" ").toLowerCase();
  
  const map: Record<string, string[]> = {
    pizza: ["pizza", "margherita", "pepperoni", "calzone"],
    burger: ["burger", "cheeseburger", "smash"],
    sushi: ["sushi", "maki", "nigiri", "sashimi"],
    bakery: ["croissant", "pastry", "bread", "cake", "muffin"],
    cafe: ["latte", "cappuccino", "espresso", "americano"],
    indian: ["biryani", "tandoori", "curry", "tikka", "naan"],
    chinese: ["dim sum", "wok", "fried rice", "chow mein"],
    lebanese: ["shawarma", "falafel", "hummus", "fattoush"],
    italian: ["pasta", "risotto", "bruschetta", "tiramisu"],
    seafood: ["fish", "shrimp", "lobster", "calamari"],
  };

  for (const [sub, kws] of Object.entries(map)) {
    const hits = kws.filter(k => text.includes(k)).length;
    if (hits >= 2) return sub;
  }
  return "general";
}
