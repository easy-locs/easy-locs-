/**
 * AI CORE ENGINE — Non-destructive AI layer that augments existing pipeline engines.
 * 
 * Position: Sits ABOVE the pipeline, observes all stages, suggests/applies safe fixes.
 * 
 * Modes:
 * - passive: analyze only, log suggestions
 * - safe_auto: auto-fix low-risk issues (text normalization, category correction)
 * - active: full auto optimization, triggers pipeline re-runs
 * 
 * Safety: AI never bypasses validation gates, never publishes low-quality entities,
 * never injects fake data. All actions logged in ai_decision_log.
 */

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type AiExecutionMode = "passive" | "safe_auto" | "active";

export interface AiDecision {
  entityId: string;
  module: string;
  issueDetected: string;
  actionTaken: string;
  confidence: number;
  mode: AiExecutionMode;
}

let currentMode: AiExecutionMode = "safe_auto";

export function setAiMode(mode: AiExecutionMode) { currentMode = mode; }
export function getAiMode(): AiExecutionMode { return currentMode; }

// ═══════════════════════════════════════════════════
//  AI DECISION LOG
// ═══════════════════════════════════════════════════

async function logDecision(decision: AiDecision) {
  try {
    await db.from("platform_actions_log").insert({
      engine_source: `ai-core/${decision.module}`,
      action_type: "ai_decision",
      severity: decision.confidence > 0.8 ? "info" : "warning",
      description: decision.issueDetected,
      decision: decision.actionTaken,
      auto_applied: decision.mode !== "passive",
      result: JSON.stringify({ confidence: decision.confidence, mode: decision.mode }),
    });
  } catch {}
}

// ═══════════════════════════════════════════════════
//  MODULE 1: AI DATA CLEANER
// ═══════════════════════════════════════════════════

export async function aiDataCleaner(limit = 30): Promise<{ cleaned: number; issues: string[] }> {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, description, phone, city, country")
    .eq("is_active", true)
    .limit(limit);

  let cleaned = 0;
  const issues: string[] = [];

  for (const e of entities ?? []) {
    const fixes: Record<string, any> = {};

    // Fix malformed names (excessive caps, trailing spaces, encoding artifacts)
    if (e.name) {
      const cleanName = e.name
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^\w\s\-&'àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ.,]/g, "");
      if (cleanName !== e.name && cleanName.length > 2) {
        fixes.name = cleanName;
        issues.push(`name_cleaned:${e.id}`);
      }
    }

    // Fix phone formatting
    if (e.phone) {
      const cleanPhone = e.phone.replace(/[^\d+\-() ]/g, "").trim();
      if (cleanPhone !== e.phone) {
        fixes.phone = cleanPhone;
      }
    }

    if (Object.keys(fixes).length > 0 && currentMode !== "passive") {
      await db.from("seed_merchants").update(fixes).eq("id", e.id);
      cleaned++;
      await logDecision({
        entityId: e.id,
        module: "data-cleaner",
        issueDetected: `Malformed fields: ${Object.keys(fixes).join(", ")}`,
        actionTaken: currentMode === "safe_auto" ? "auto_cleaned" : "force_cleaned",
        confidence: 0.9,
        mode: currentMode,
      });
    }
  }

  return { cleaned, issues };
}

// ═══════════════════════════════════════════════════
//  MODULE 2: AI CATEGORY CLASSIFIER
// ═══════════════════════════════════════════════════

const FOOD_KEYWORDS: Record<string, string[]> = {
  pizza: ["pizza", "pizzeria", "napoletana"],
  burger: ["burger", "burgers", "smash"],
  sushi: ["sushi", "japanese", "ramen", "maki"],
  bakery: ["bakery", "boulangerie", "pastry", "cake", "bread"],
  cafe: ["café", "cafe", "coffee", "espresso", "latte"],
  indian: ["indian", "curry", "tandoori", "biryani", "masala"],
  chinese: ["chinese", "wok", "dim sum", "noodle"],
  mexican: ["mexican", "taco", "burrito", "quesadilla"],
  thai: ["thai", "pad thai", "tom yum"],
  lebanese: ["lebanese", "libanais", "shawarma", "falafel", "hummus"],
  italian: ["italian", "italiano", "pasta", "risotto", "trattoria"],
  seafood: ["seafood", "fish", "lobster", "shrimp", "oyster"],
  arabic: ["arabic", "arabe", "manakeesh", "fattoush", "grills"],
  steakhouse: ["steak", "steakhouse", "grill", "bbq", "barbecue"],
  fast_food: ["fast food", "fried chicken", "wings", "nuggets"],
  healthy: ["healthy", "salad", "poke", "bowl", "vegan", "organic"],
  ice_cream: ["ice cream", "gelato", "frozen yogurt", "sorbet"],
  juice_bar: ["juice", "smoothie", "açaí", "detox"],
  desserts: ["dessert", "chocolate", "donut", "waffle", "crêpe"],
  breakfast: ["breakfast", "brunch", "pancake", "eggs"],
};

export function aiClassifySubcategory(name: string, description?: string, menuItems?: string[]): {
  subcategory: string;
  confidence: number;
} {
  const text = [name, description ?? "", ...(menuItems ?? [])].join(" ").toLowerCase();
  let best = { subcategory: "general", confidence: 0 };

  for (const [sub, keywords] of Object.entries(FOOD_KEYWORDS)) {
    const matches = keywords.filter(k => text.includes(k)).length;
    const confidence = Math.min(matches / Math.max(keywords.length * 0.3, 1), 1);
    if (confidence > best.confidence) {
      best = { subcategory: sub, confidence };
    }
  }

  return best;
}

export async function aiCategoryCorrector(limit = 30): Promise<{ corrected: number }> {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, description, category, subcategory, menu_items_json, vertical")
    .eq("vertical", "food")
    .or("subcategory.is.null,subcategory.eq.general,subcategory.eq.other,subcategory.eq.unknown")
    .eq("is_active", true)
    .limit(limit);

  let corrected = 0;

  for (const e of entities ?? []) {
    const menuNames = Array.isArray(e.menu_items_json)
      ? e.menu_items_json.flatMap((s: any) => (s?.items ?? [s]).map((i: any) => i?.name ?? ""))
      : [];

    const result = aiClassifySubcategory(e.name, e.description, menuNames);

    if (result.confidence >= 0.4 && result.subcategory !== "general" && currentMode !== "passive") {
      await db.from("seed_merchants")
        .update({ subcategory: result.subcategory })
        .eq("id", e.id);
      corrected++;

      await logDecision({
        entityId: e.id,
        module: "category-classifier",
        issueDetected: `Missing subcategory, detected: ${result.subcategory}`,
        actionTaken: `set_subcategory:${result.subcategory}`,
        confidence: result.confidence,
        mode: currentMode,
      });
    }
  }

  return { corrected };
}

// ═══════════════════════════════════════════════════
//  MODULE 3: AI PHOTO ANALYZER
// ═══════════════════════════════════════════════════

const PLACEHOLDER_PATTERNS = [
  "unsplash.com", "placeholder", "dummyimage", "placehold.co",
  "via.placeholder", "picsum.photos", "lorempixel", "placekitten",
  "loremflickr", "fakeimg", "fillmurray",
];

export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

export async function aiPhotoAnalyzer(limit = 50): Promise<{ flagged: number; hidden: number }> {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, cover_image, logo_image, visibility_mode")
    .eq("is_active", true)
    .limit(limit);

  let flagged = 0;
  let hidden = 0;

  for (const e of entities ?? []) {
    const coverFake = isPlaceholderUrl(e.cover_image);
    const logoFake = isPlaceholderUrl(e.logo_image);

    if (coverFake || logoFake) {
      flagged++;
      const updates: Record<string, any> = {};
      if (coverFake && e.cover_image) updates.cover_image = null;
      if (logoFake && e.logo_image) updates.logo_image = null;

      if (currentMode !== "passive") {
        // If cover is placeholder and entity is live, hide it
        if (coverFake && e.visibility_mode === "live") {
          updates.visibility_mode = "search_only";
          hidden++;
        }
        await db.from("seed_merchants").update(updates).eq("id", e.id);

        await logDecision({
          entityId: e.id,
          module: "photo-analyzer",
          issueDetected: `Placeholder image detected: cover=${coverFake}, logo=${logoFake}`,
          actionTaken: coverFake ? "removed_cover_hidden" : "removed_logo",
          confidence: 0.95,
          mode: currentMode,
        });
      }
    }
  }

  return { flagged, hidden };
}

// ═══════════════════════════════════════════════════
//  MODULE 4: AI QUALITY BOOSTER
// ═══════════════════════════════════════════════════

export async function aiQualityBooster(limit = 30): Promise<{ boosted: number; requeued: number }> {
  const { data: weak } = await db
    .from("seed_merchants")
    .select("id, name, overall_quality_score, visibility_mode, cover_image, menu_items_json, vertical")
    .lt("overall_quality_score", 50)
    .eq("is_active", true)
    .neq("visibility_mode", "hidden")
    .limit(limit);

  let boosted = 0;
  let requeued = 0;

  for (const e of weak ?? []) {
    const improvements: string[] = [];

    // Check if we can boost score by fixing subcategory
    if (e.vertical === "food") {
      const menuNames = Array.isArray(e.menu_items_json)
        ? e.menu_items_json.flatMap((s: any) => (s?.items ?? [s]).map((i: any) => i?.name ?? ""))
        : [];
      if (menuNames.length >= 3) improvements.push("menu_ok");
    }

    if (!isPlaceholderUrl(e.cover_image)) improvements.push("real_photo");

    if (improvements.length > 0 && currentMode === "active") {
      // Re-enqueue for pipeline reprocessing
      try {
        const { enqueueEntity } = await import("@/lib/pipeline/queue-driven-pipeline");
        await enqueueEntity(e.id, "seed_merchant", undefined, 7, "score");
        requeued++;
      } catch {}
    }

    if (improvements.length > 0) boosted++;
  }

  return { boosted, requeued };
}

// ═══════════════════════════════════════════════════
//  MODULE 5: AI DUPLICATE DETECTOR
// ═══════════════════════════════════════════════════

export async function aiDuplicateDetector(limit = 50): Promise<{ candidates: number }> {
  // Light duplicate detection by name + city similarity
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, city, latitude, longitude, phone")
    .eq("is_active", true)
    .limit(limit);

  let candidates = 0;
  const seen = new Map<string, string>();

  for (const e of entities ?? []) {
    const key = `${(e.name ?? "").toLowerCase().trim()}_${(e.city ?? "").toLowerCase()}`;
    if (seen.has(key) && seen.get(key) !== e.id) {
      candidates++;
      await logDecision({
        entityId: e.id,
        module: "duplicate-detector",
        issueDetected: `Potential duplicate of ${seen.get(key)}`,
        actionTaken: "flagged_for_review",
        confidence: 0.7,
        mode: currentMode,
      });
    }
    seen.set(key, e.id);
  }

  return { candidates };
}

// ═══════════════════════════════════════════════════
//  MASTER AI CORE RUNNER
// ═══════════════════════════════════════════════════

export interface AiCoreResult {
  mode: AiExecutionMode;
  dataCleaner: { cleaned: number; issues: string[] };
  categoryClassifier: { corrected: number };
  photoAnalyzer: { flagged: number; hidden: number };
  qualityBooster: { boosted: number; requeued: number };
  duplicateDetector: { candidates: number };
  duration: number;
}

export async function runAiCore(limit = 30): Promise<AiCoreResult> {
  const start = Date.now();

  const [dataCleaner, categoryClassifier, photoAnalyzer, qualityBooster, duplicateDetector] =
    await Promise.all([
      aiDataCleaner(limit),
      aiCategoryCorrector(limit),
      aiPhotoAnalyzer(limit),
      aiQualityBooster(limit),
      aiDuplicateDetector(limit),
    ]);

  const duration = Date.now() - start;

  console.log(
    `[ai-core] Mode=${currentMode} | Cleaned=${dataCleaner.cleaned} | Classified=${categoryClassifier.corrected} | Photos=${photoAnalyzer.flagged} | Boosted=${qualityBooster.boosted} | Dupes=${duplicateDetector.candidates} | ${duration}ms`
  );

  return {
    mode: currentMode,
    dataCleaner,
    categoryClassifier,
    photoAnalyzer,
    qualityBooster,
    duplicateDetector,
    duration,
  };
}
