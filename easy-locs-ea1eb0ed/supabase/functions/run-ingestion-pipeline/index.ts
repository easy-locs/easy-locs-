import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Source confidence by vertical ──
const SOURCE_CONFIDENCE: Record<string, Record<string, number>> = {
  food: { deliveroo: 95, talabat: 90, careem: 90, google_maps: 80, google: 80, import_ai: 60, aggregator: 50 },
  grocery: { deliveroo: 90, talabat: 90, careem: 85, google_maps: 75, import_ai: 60 },
  property: { booking: 95, agoda: 90, google_maps: 80, import_ai: 60 },
  services: { google_maps: 85, google: 85, import_ai: 60 },
};

// ── Field-level source priority ──
const FIELD_PRIORITY: Record<string, string[]> = {
  menu_items_json: ["deliveroo", "talabat", "careem"],
  menu_sections_json: ["deliveroo", "talabat", "careem"],
  rating: ["google_maps", "google", "booking", "deliveroo", "talabat"],
  review_count: ["google_maps", "google", "booking", "deliveroo", "talabat"],
  latitude: ["google_maps", "google", "booking", "deliveroo", "talabat"],
  longitude: ["google_maps", "google", "booking", "deliveroo", "talabat"],
  phone: ["google_maps", "google", "deliveroo", "talabat"],
  website: ["google_maps", "google", "booking"],
  opening_hours: ["google_maps", "google", "deliveroo", "talabat"],
  cover_image: ["deliveroo", "talabat", "careem", "booking", "google_maps"],
  logo_image: ["deliveroo", "talabat", "careem"],
  images: ["deliveroo", "talabat", "booking", "google_maps"],
  description: ["google_maps", "booking", "deliveroo", "talabat"],
};

// ── Coherence keywords by subcategory ──
const COHERENCE_KEYWORDS: Record<string, string[]> = {
  sushi: ["sushi", "maki", "nigiri", "sashimi", "roll", "tempura", "edamame", "wasabi", "teriyaki", "udon", "ramen"],
  pizza: ["pizza", "margherita", "pepperoni", "calzone", "dough", "mozzarella", "napoletana", "quattro"],
  burger: ["burger", "patty", "bun", "fries", "cheese burger", "wagyu", "smash"],
  shawarma: ["shawarma", "wrap", "hummus", "falafel", "tahini", "pita", "fattoush", "tabouleh"],
  bakery: ["bread", "croissant", "pastry", "cake", "cookie", "danish", "baguette", "muffin", "scone"],
  coffee: ["coffee", "latte", "espresso", "cappuccino", "americano", "mocha", "frappe", "cold brew"],
  indian: ["curry", "naan", "biryani", "tikka", "masala", "tandoori", "dal", "paneer", "samosa"],
  chinese: ["noodle", "dim sum", "wonton", "fried rice", "kung pao", "sweet sour", "spring roll", "dumpling"],
  thai: ["pad thai", "tom yum", "curry", "satay", "som tam", "thai", "coconut"],
  mexican: ["taco", "burrito", "quesadilla", "guacamole", "nacho", "enchilada", "salsa"],
  italian: ["pasta", "risotto", "lasagna", "bruschetta", "tiramisu", "gnocchi", "ravioli", "penne"],
};

interface PipelineResult {
  entity_id: string;
  entity_name: string;
  accepted: boolean;
  source_key: string;
  confidence: number;
  integrity_score: number;
  coherence_score: number;
  freshness_score: number;
  field_sources: Record<string, string>;
  warnings: string[];
  auto_fixes: string[];
  menu_item_count: number;
  rejection_reason: string | null;
}

function getConfidence(vertical: string, sourceKey: string): number {
  const v = SOURCE_CONFIDENCE[vertical] || SOURCE_CONFIDENCE.services;
  return v[sourceKey] ?? 40;
}

function computeCoherence(name: string, subcategory: string | null, menuItems: any[]): { score: number; status: string; conflicts: string[] } {
  if (!subcategory || !menuItems || menuItems.length === 0) {
    return { score: 70, status: "review_required", conflicts: [] };
  }

  const subKey = subcategory.toLowerCase().replace(/[^a-z]/g, "");
  const keywords = COHERENCE_KEYWORDS[subKey];
  if (!keywords) return { score: 75, status: "publishable", conflicts: [] };

  const itemNames = menuItems.map((i: any) => (i.name || "").toLowerCase());
  const allText = itemNames.join(" ");
  
  let matches = 0;
  for (const kw of keywords) {
    if (allText.includes(kw)) matches++;
  }

  const ratio = matches / Math.min(keywords.length, 5);
  const score = Math.min(100, Math.round(ratio * 100));
  
  // Check for contamination
  const conflicts: string[] = [];
  for (const [cat, kws] of Object.entries(COHERENCE_KEYWORDS)) {
    if (cat === subKey) continue;
    const foreignMatches = kws.filter(kw => allText.includes(kw)).length;
    if (foreignMatches > 3 && foreignMatches > matches) {
      conflicts.push(`Menu looks more like ${cat} than ${subcategory} (${foreignMatches} foreign keywords vs ${matches} expected)`);
    }
  }

  const status = conflicts.length > 0 && score < 50 ? "blocked" : score < 50 ? "review_required" : score >= 75 ? "premium_confident" : "publishable";
  
  return { score, status, conflicts };
}

function computeFreshness(sourceUpdatedAt: string | null, lastSeenAt: string | null): number {
  const now = Date.now();
  const ref = sourceUpdatedAt || lastSeenAt;
  if (!ref) return 30;
  
  const ageMs = now - new Date(ref).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  if (ageDays < 1) return 100;
  if (ageDays < 7) return 90;
  if (ageDays < 30) return 75;
  if (ageDays < 90) return 50;
  return 30;
}

function computeIntegrity(data: any): { score: number; violations: string[] } {
  const violations: string[] = [];
  let score = 100;
  
  if (!data.name?.trim()) { violations.push("Missing name"); score -= 40; }
  if (data.rating && (data.rating < 0 || data.rating > 5)) { violations.push("Invalid rating"); score -= 10; }
  
  const menuItems = data.menu_items_json || [];
  if (Array.isArray(menuItems)) {
    const names = menuItems.map((i: any) => (i.name || "").toLowerCase().trim());
    const dupes = names.filter((n: string, i: number) => names.indexOf(n) !== i);
    if (dupes.length > 0) { violations.push(`${dupes.length} duplicate items`); score -= 5; }
    
    const badPrices = menuItems.filter((i: any) => i.price != null && (i.price < 0 || i.price > 50000));
    if (badPrices.length > 0) { violations.push(`${badPrices.length} invalid prices`); score -= 5; }
  }
  
  return { score: Math.max(0, score), violations };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 50;
    const targetIds: string[] | null = body.entity_ids || null;

    // Fetch entities to process
    let query = db.from("seed_merchants").select("*");
    if (targetIds && targetIds.length > 0) {
      query = query.in("id", targetIds);
    } else {
      // Process pending or stale entities
      query = query.or("pipeline_status.eq.pending,pipeline_status.is.null,pipeline_last_run_at.is.null")
        .limit(batchSize);
    }

    const { data: entities, error: fetchErr } = await query;
    if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);
    if (!entities || entities.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No entities to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: PipelineResult[] = [];
    const now = new Date().toISOString();

    for (const entity of entities) {
      const vertical = detectVertical(entity);
      const sourceKey = entity.source_key || "import_ai";
      const confidence = getConfidence(vertical, sourceKey);
      
      // Build field sources tracking
      const fieldSources: Record<string, string> = entity.field_sources_json || {};
      
      const mergeableFields = [
        "name", "description", "category", "subcategory", "rating", "review_count",
        "cover_image", "logo_image", "latitude", "longitude", "phone", "website",
        "opening_hours", "images", "cuisine_tags", "menu_items_json", "menu_sections_json"
      ];
      
      for (const field of mergeableFields) {
        const val = entity[field];
        if (val != null && val !== "") {
          fieldSources[field] = fieldSources[field] || sourceKey;
        }
      }

      // Compute integrity
      const integrity = computeIntegrity(entity);
      
      // Compute coherence
      const menuItems = entity.menu_items_json || [];
      const coherence = computeCoherence(entity.name, entity.subcategory, Array.isArray(menuItems) ? menuItems : []);
      
      // Compute freshness
      const freshness = computeFreshness(entity.source_updated_at, entity.last_seen_at);

      // Auto-fixes
      const autoFixes: string[] = [];
      const warnings: string[] = [];
      
      // Fix rating if on 0-10 scale
      let fixedRating = entity.rating;
      if (fixedRating && fixedRating > 5 && fixedRating <= 10) {
        fixedRating = Math.round((fixedRating / 2) * 10) / 10;
        autoFixes.push("Normalized rating from 0-10 to 0-5");
      }
      
      // Determine acceptance
      const accepted = integrity.score > 20 && coherence.status !== "blocked";
      const rejectionReason = !accepted ? 
        (coherence.status === "blocked" ? coherence.conflicts.join("; ") : integrity.violations.join("; ")) : null;
      
      // Determine visibility
      let visibilityMode = entity.visibility_mode || "coming_soon";
      let coherenceStatus = coherence.status;
      if (coherence.status === "blocked") {
        visibilityMode = "hidden";
      } else if (coherence.score >= 75 && integrity.score >= 60) {
        visibilityMode = entity.visibility_mode === "hidden" ? "coming_soon" : entity.visibility_mode;
      }

      // Update entity
      const updatePayload: Record<string, any> = {
        source_confidence: confidence,
        freshness_score: freshness,
        integrity_score: integrity.score,
        coherence_score: coherence.score,
        coherence_status: coherenceStatus === "premium_confident" ? "publishable" : coherenceStatus,
        field_sources_json: fieldSources,
        pipeline_status: accepted ? "processed" : "rejected",
        pipeline_last_run_at: now,
        last_verified_at: now,
        ingestion_warnings: [...(integrity.violations || []), ...coherence.conflicts],
      };
      
      if (fixedRating !== entity.rating) {
        updatePayload.rating = fixedRating;
      }
      
      // Only downgrade visibility, never upgrade without explicit rules
      if (coherence.status === "blocked" && entity.visibility_mode !== "hidden") {
        updatePayload.visibility_mode = "hidden";
      }

      const { error: updateErr } = await db.from("seed_merchants").update(updatePayload).eq("id", entity.id);
      if (updateErr) {
        warnings.push(`Update failed: ${updateErr.message}`);
      }

      results.push({
        entity_id: entity.id,
        entity_name: entity.name,
        accepted,
        source_key: sourceKey,
        confidence,
        integrity_score: integrity.score,
        coherence_score: coherence.score,
        freshness_score: freshness,
        field_sources: fieldSources,
        warnings: [...warnings, ...integrity.violations],
        auto_fixes: autoFixes,
        menu_item_count: Array.isArray(menuItems) ? menuItems.length : 0,
        rejection_reason: rejectionReason,
      });
    }

    // Summary stats
    const summary = {
      total_processed: results.length,
      accepted: results.filter(r => r.accepted).length,
      rejected: results.filter(r => !r.accepted).length,
      blocked_coherence: results.filter(r => r.rejection_reason?.includes("Menu looks")).length,
      avg_coherence: Math.round(results.reduce((s, r) => s + r.coherence_score, 0) / results.length),
      avg_integrity: Math.round(results.reduce((s, r) => s + r.integrity_score, 0) / results.length),
      avg_freshness: Math.round(results.reduce((s, r) => s + r.freshness_score, 0) / results.length),
      with_menu: results.filter(r => r.menu_item_count > 0).length,
      without_menu: results.filter(r => r.menu_item_count === 0).length,
      sources: Object.entries(
        results.reduce((acc, r) => { acc[r.source_key] = (acc[r.source_key] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).map(([k, v]) => ({ source: k, count: v })),
    };

    return new Response(JSON.stringify({ summary, results: results.slice(0, 30) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function detectVertical(entity: any): string {
  const cat = (entity.category || "").toLowerCase();
  const sub = (entity.subcategory || "").toLowerCase();
  const name = (entity.name || "").toLowerCase();
  
  if (["hotel", "resort", "apartment", "villa"].some(k => cat.includes(k) || name.includes(k))) return "property";
  if (["grocery", "supermarket", "minimart"].some(k => cat.includes(k) || name.includes(k))) return "grocery";
  if (["pharmacy", "clinic", "hospital", "dental"].some(k => cat.includes(k) || name.includes(k))) return "healthcare";
  if (["salon", "spa", "repair", "cleaning", "laundry"].some(k => cat.includes(k) || name.includes(k))) return "services";
  return "food";
}
