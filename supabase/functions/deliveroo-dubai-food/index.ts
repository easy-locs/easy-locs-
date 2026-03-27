/**
 * deliveroo-dubai-food — Dedicated Deliveroo Dubai food intake engine.
 * Scrapes public Deliveroo pages for Dubai restaurants, normalizes, and writes staging.
 * NEVER publishes live directly.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlScrape, firecrawlMap } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEED_URL = "https://deliveroo.ae/restaurants/dubai/all";
const SOURCE = "deliveroo";
const REGION = "dubai";
const VERTICAL = "food";
const COUNTRY = "ae";

// ── Blocklists ──
const EXCLUDED_VERTICALS = ["grocery", "pharmacy", "flowers", "gifts", "pet", "health"];
const BLOCKED_CATEGORIES = ["general", "other", "unknown", "null", "undefined", ""];
const PLACEHOLDER_PATTERNS = [
  "via.placeholder", "placehold.co", "dummyimage",
  "images.unsplash.com", "unsplash.com",
];

function isPlaceholder(url: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function extractSourceId(url: string): string | null {
  // Extract restaurant slug from Deliveroo URL
  const match = url.match(/\/menu\/([^/?#]+)/);
  return match?.[1] || null;
}

interface ParsedRestaurant {
  name: string;
  source_url: string;
  source_entity_id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category: string;
  subcategory: string;
  cuisine_tags: string[];
  rating: number | null;
  review_count: number | null;
  menu_items: any[];
  menu_categories: any[];
  currency: string;
  raw_payload: any;
}

function parseRestaurantFromMarkdown(markdown: string, sourceUrl: string): ParsedRestaurant | null {
  const sourceId = extractSourceId(sourceUrl);
  if (!sourceId) return null;

  // Extract name from first heading
  const nameMatch = markdown.match(/^#\s+(.+)/m);
  const name = nameMatch?.[1]?.trim() || "";
  if (!name || name.length < 2) return null;

  // Extract rating
  const ratingMatch = markdown.match(/(\d+\.?\d*)\s*★/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // Extract review count
  const reviewMatch = markdown.match(/\((\d+)\+?\s*reviews?\)/i);
  const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : null;

  // Extract images
  const imageMatches = [...markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)];
  const images = imageMatches.map(m => m[1]).filter(u => !isPlaceholder(u));
  const coverImage = images[0] || null;
  const logoImage = images.length > 1 ? images[1] : null;

  // Extract menu items
  const menuItems: any[] = [];
  const menuCategories: any[] = [];
  let currentCategory = "";

  const lines = markdown.split("\n");
  for (const line of lines) {
    const catMatch = line.match(/^##\s+(.+)/);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      if (!BLOCKED_CATEGORIES.includes(currentCategory.toLowerCase())) {
        menuCategories.push({
          name: currentCategory,
          slug: slugify(currentCategory),
          items: [],
        });
      }
      continue;
    }

    // Look for price patterns (AED XX.XX or XX.XX AED)
    const itemMatch = line.match(/^[\-\*]?\s*(.+?)\s*(?:AED\s*)?(\d+\.?\d*)\s*(?:AED)?/);
    if (itemMatch && currentCategory) {
      const itemName = itemMatch[1].replace(/\*\*/g, "").trim();
      const price = parseFloat(itemMatch[2]);
      if (itemName && price > 0 && itemName.length > 1) {
        const item = {
          id: `${sourceId}-${slugify(itemName)}`,
          name: itemName,
          slug: slugify(itemName),
          description: "",
          price,
          currency: "AED",
          image_url: null,
          category_name: currentCategory,
          available: true,
          modifiers: [],
        };
        menuItems.push(item);
        const cat = menuCategories.find(c => c.name === currentCategory);
        if (cat) cat.items.push(item);
      }
    }
  }

  // Infer category from cuisine
  const cuisineMatch = markdown.match(/(?:cuisine|type|category)[\s:]+([^\n]+)/i);
  const category = cuisineMatch?.[1]?.trim() || "restaurant";
  const subcategory = "";

  // Infer cuisine tags
  const cuisineTags: string[] = [];
  const tagPatterns = ["pizza", "burger", "sushi", "indian", "chinese", "thai", "lebanese", "italian", "mexican", "japanese", "korean", "american", "arabic", "turkish"];
  const lowerMd = markdown.toLowerCase();
  for (const tag of tagPatterns) {
    if (lowerMd.includes(tag)) cuisineTags.push(tag);
  }

  return {
    name,
    source_url: sourceUrl,
    source_entity_id: sourceId,
    address: null,
    latitude: null,
    longitude: null,
    logo_url: logoImage,
    cover_image_url: coverImage,
    category: BLOCKED_CATEGORIES.includes(category.toLowerCase()) ? "restaurant" : category,
    subcategory,
    cuisine_tags: cuisineTags,
    rating,
    review_count: reviewCount,
    menu_items: menuItems,
    menu_categories: menuCategories,
    currency: "AED",
    raw_payload: { markdown_length: markdown.length },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stats = {
    discovered: 0,
    scraped: 0,
    accepted: 0,
    blocked: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // ── Step 1: Discover restaurant URLs ──
    console.log("[deliveroo-dubai-food] Step 1: Discovering restaurant URLs...");
    let restaurantUrls: string[] = [];

    try {
      const mapResult = await firecrawlMap(SEED_URL, {
        search: "menu",
        limit: 200,
      });
      const allLinks = mapResult?.links || mapResult?.data || [];
      restaurantUrls = allLinks.filter((url: string) =>
        url.includes("/menu/") &&
        url.includes("deliveroo.ae") &&
        !EXCLUDED_VERTICALS.some(v => url.toLowerCase().includes(v))
      );
      stats.discovered = restaurantUrls.length;
    } catch (err) {
      console.error("[deliveroo-dubai-food] Map failed:", err);
      stats.errors.push(`Map failed: ${err}`);
    }

    console.log(`[deliveroo-dubai-food] Discovered ${stats.discovered} restaurant URLs`);

    // ── Step 2: Scrape each restaurant (limited batch) ──
    const BATCH_LIMIT = 20; // Process in small batches
    const batch = restaurantUrls.slice(0, BATCH_LIMIT);

    for (const url of batch) {
      try {
        const scrapeResult = await firecrawlScrape(url, {
          formats: ["markdown"],
          onlyMainContent: true,
        });
        stats.scraped++;

        const markdown = scrapeResult?.data?.markdown || scrapeResult?.markdown || "";
        if (!markdown) {
          stats.failed++;
          continue;
        }

        const parsed = parseRestaurantFromMarkdown(markdown, url);
        if (!parsed) {
          stats.failed++;
          continue;
        }

        // ── Step 3: Validate mandatory fields ──
        const failures: string[] = [];
        if (!parsed.name || parsed.name.length < 2) failures.push("name_missing");
        if (parsed.menu_items.length < 3) failures.push("menu_too_small");
        if (isPlaceholder(parsed.cover_image_url) && isPlaceholder(parsed.logo_url)) failures.push("no_valid_image");
        if (BLOCKED_CATEGORIES.includes(parsed.category.toLowerCase())) failures.push("blocked_category");

        const isBlocked = failures.length > 0;
        const visibilityMode = isBlocked ? "hidden" : "hidden"; // Always hidden on intake
        const pipelineStage = isBlocked ? "failed" : "intake";

        // ── Step 4: Upsert into seed_merchants ──
        const merchantRow = {
          source: SOURCE,
          source_entity_id: parsed.source_entity_id,
          source_url: parsed.source_url,
          city: REGION,
          country: COUNTRY,
          vertical: VERTICAL,
          name: parsed.name,
          slug: slugify(parsed.name),
          address: parsed.address,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          phone: null,
          logo_image: parsed.logo_url,
          cover_image: parsed.cover_image_url,
          source_type: SOURCE,
          gallery_images: [],
          category: parsed.category,
          subcategory: parsed.subcategory,
          cuisine_tags: parsed.cuisine_tags,
          rating: parsed.rating,
          review_count: parsed.review_count,
          menu_items_json: parsed.menu_items,
          menu_categories_json: parsed.menu_categories,
          visibility_mode: visibilityMode,
          publish_gate_status: isBlocked ? "failed" : "pending",
          blocking_reason: isBlocked ? failures.join(", ") : null,
          gate_failures: failures,
          pipeline_stage: pipelineStage,
          source_payload: parsed.raw_payload,
          source_last_scraped_at: new Date().toISOString(),
          is_published: false,
          is_food: true,
          is_coming_soon: false,
          content_status: parsed.menu_items.length >= 3 ? "partial" : "empty",
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from("seed_merchants")
          .upsert(merchantRow, { onConflict: "source,source_entity_id" });

        if (upsertErr) {
          console.error("[deliveroo-dubai-food] Upsert error:", upsertErr);
          stats.failed++;
          continue;
        }

        // ── Step 5: Save snapshot ──
        await supabase.from("merchant_source_snapshots").insert({
          source: SOURCE,
          source_merchant_id: parsed.source_entity_id,
          source_url: parsed.source_url,
          raw_payload_json: { markdown },
          extracted_payload_json: parsed,
        });

        if (isBlocked) {
          stats.blocked++;
        } else {
          stats.accepted++;
        }
      } catch (err) {
        console.error("[deliveroo-dubai-food] Scrape error for", url, err);
        stats.failed++;
        stats.errors.push(`${url}: ${err}`);
      }

      // Small delay between scrapes to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    // ── Step 6: Log scrape run ──
    await supabase.from("merchant_scrape_runs").insert({
      source: SOURCE,
      region: REGION,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: stats.errors.length > 0 ? "partial" : "ok",
      discovered_count: stats.discovered,
      scraped_count: stats.scraped,
      accepted_count: stats.accepted,
      blocked_count: stats.blocked,
      failed_count: stats.failed,
      trigger_source: "edge_function",
      metadata_json: { errors: stats.errors.slice(0, 10), batch_limit: BATCH_LIMIT },
    });

    // ── Step 7: Log engine run ──
    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      status: "ok",
      rows_read: stats.discovered,
      db_rows_affected: stats.accepted + stats.blocked,
      side_effect_count: stats.scraped,
      effect_summary: `Discovered ${stats.discovered}, scraped ${stats.scraped}, accepted ${stats.accepted}, blocked ${stats.blocked}, failed ${stats.failed}`,
      trigger_source: "deliveroo-dubai-food",
      metadata_json: stats,
    });

    return new Response(JSON.stringify({
      success: true,
      stats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[deliveroo-dubai-food] Fatal:", err);

    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      status: "error",
      rows_read: 0,
      db_rows_affected: 0,
      side_effect_count: 0,
      error_message: String(err),
      effect_summary: "Fatal error during intake",
      trigger_source: "deliveroo-dubai-food",
    });

    return new Response(JSON.stringify({
      success: false,
      error: String(err),
      stats,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
