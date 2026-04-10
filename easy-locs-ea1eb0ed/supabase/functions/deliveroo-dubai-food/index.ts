/**
 * deliveroo-dubai-food — Canonical Deliveroo Dubai food intake engine.
 * 3-layer discovery: Firecrawl map → crawl → seed URLs.
 * NEVER publishes live directly. All intake starts hidden/pending.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlMap, firecrawlCrawl, firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE = "deliveroo";
const REGION = "dubai";
const COUNTRY = "AE";
const VERTICAL = "food";

const SEED_URLS = [
  "https://deliveroo.ae/restaurants/dubai/all",
  "https://deliveroo.ae/menu/dubai",
  "https://deliveroo.ae/menu/dubai/business-bay",
  "https://deliveroo.ae/menu/dubai/dubai-marina",
  "https://deliveroo.ae/menu/dubai/jlt",
  "https://deliveroo.ae/menu/dubai/jumeirah",
  "https://deliveroo.ae/menu/dubai/downtown-dubai",
  "https://deliveroo.ae/menu/dubai/deira",
  "https://deliveroo.ae/menu/dubai/al-barsha",
];

const EXCLUDED_VERTICALS = ["flowers", "pharmacy", "groceries", "grocery", "retail", "alcohol", "pet", "gifts", "health"];
const BLOCKED_CATEGORIES = ["general", "other", "unknown", "null", "undefined", ""];
const PLACEHOLDER_PATTERNS = ["via.placeholder", "placehold.co", "dummyimage", "placeholder", "images.unsplash.com", "unsplash.com", "picsum.photos"];

function isPlaceholder(url: string | null | undefined): boolean {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some(p => url.toLowerCase().includes(p));
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/['']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function extractSourceId(url: string): string | null {
  // /menu/dubai/area/restaurant-slug or /menu/restaurant-slug
  const parts = url.split("/menu/");
  if (parts.length < 2) return null;
  const segments = parts[1].split("/").filter(Boolean).filter(s => !s.startsWith("?"));
  return segments[segments.length - 1] || null;
}

function inferCategory(text: string): string {
  const c = text.toLowerCase();
  if (c.includes("pizza")) return "pizza";
  if (c.includes("burger")) return "burger";
  if (c.includes("sushi")) return "sushi";
  if (c.includes("shawarma") || c.includes("manakish") || c.includes("hummus")) return "lebanese";
  if (c.includes("biryani") || c.includes("tandoori") || c.includes("naan")) return "indian";
  if (c.includes("noodle") || c.includes("dim sum") || c.includes("fried rice")) return "chinese";
  if (c.includes("pad thai") || c.includes("tom yum")) return "thai";
  if (c.includes("coffee") || c.includes("latte") || c.includes("espresso")) return "cafe";
  if (c.includes("cake") || c.includes("waffle") || c.includes("ice cream")) return "dessert";
  if (c.includes("chicken") || c.includes("wings")) return "chicken";
  if (c.includes("seafood") || c.includes("fish")) return "seafood";
  return "restaurant";
}

function inferCuisineTags(text: string): string[] {
  const c = text.toLowerCase();
  const tags = ["pizza","burger","sushi","indian","chinese","thai","lebanese","italian","mexican","japanese","american","dessert","cafe","healthy","grill","seafood","chicken","korean","turkish","arabic"];
  return tags.filter(t => c.includes(t));
}

interface MenuItem { id: string; name: string; slug: string; description: string; price: number; currency: string; image_url: string | null; category: string; available: boolean; }
interface MenuCategory { name: string; slug: string; items: MenuItem[]; }

function parseMenu(markdown: string, sourceId: string): { menu_items: MenuItem[]; menu_categories: MenuCategory[] } {
  const lines = markdown.split("\n");
  const categories = new Map<string, MenuItem[]>();
  let currentCategory = "Main Menu";
  let idx = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const catMatch = line.match(/^##\s+(.+)/);
    if (catMatch) { currentCategory = catMatch[1].trim() || "Main Menu"; if (!categories.has(currentCategory)) categories.set(currentCategory, []); continue; }

    const pricePatterns = [
      /^[-*•]?\s*(.+?)\s+(?:AED\s*)?(\d+(?:\.\d{1,2})?)\s*(?:AED)?$/i,
      /^[-*•]?\s*(.+?)\s+-\s+(?:AED\s*)?(\d+(?:\.\d{1,2})?)$/i,
      /^[-*•]?\s*\*\*(.+?)\*\*\s+(?:AED\s*)?(\d+(?:\.\d{1,2})?)$/i,
    ];
    for (const rx of pricePatterns) {
      const m = line.match(rx);
      if (!m) continue;
      const name = m[1].replace(/\*\*/g, "").trim();
      const price = Number(m[2]);
      if (name.length < 2 || !Number.isFinite(price) || price <= 0) continue;
      const item: MenuItem = { id: `${sourceId}-${idx++}-${slugify(name)}`, name, slug: slugify(name), description: "", price, currency: "AED", image_url: null, category: currentCategory, available: true };
      if (!categories.has(currentCategory)) categories.set(currentCategory, []);
      categories.get(currentCategory)!.push(item);
      break;
    }
  }

  const menu_categories = [...categories.entries()].filter(([, items]) => items.length > 0).map(([name, items]) => ({ name, slug: slugify(name), items })).sort((a, b) => b.items.length - a.items.length);
  return { menu_items: menu_categories.flatMap(c => c.items), menu_categories };
}

function parseRestaurantFromMarkdown(markdown: string, sourceUrl: string) {
  const sourceId = extractSourceId(sourceUrl);
  if (!sourceId || sourceId.length < 2) return null;

  const heading = markdown.match(/^#\s+(.+)$/m);
  const name = heading?.[1]?.trim() || "";
  if (name.length < 2) return null;

  const ratingMatch = markdown.match(/(\d+(?:\.\d+)?)\s*★/);
  const reviewMatch = markdown.match(/\((\d+)\+?\s*reviews?\)/i);
  const images = [...markdown.matchAll(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1]).filter(u => !isPlaceholder(u));

  const menu = parseMenu(markdown, sourceId);
  const corpus = `${name}\n${markdown}`;

  return {
    name,
    source_url: sourceUrl,
    source_entity_id: sourceId,
    address: null as string | null,
    latitude: null as number | null,
    longitude: null as number | null,
    logo_image: images[1] || null,
    cover_image: images[0] || null,
    category: inferCategory(corpus),
    subcategory: "casual_dining",
    cuisine_tags: inferCuisineTags(corpus),
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    review_count: reviewMatch ? Number(reviewMatch[1]) : null,
    menu_items: menu.menu_items,
    menu_categories: menu.menu_categories,
    raw_payload: { markdown_length: markdown.length },
  };
}

async function discoverUrls(): Promise<string[]> {
  const discovered = new Set<string>();
  const isValidUrl = (url: string) => {
    const lower = url.toLowerCase();
    return url.includes("deliveroo.ae") && url.includes("/menu/") && !EXCLUDED_VERTICALS.some(v => lower.includes(v));
  };

  // Layer 1: Firecrawl map
  for (const seed of SEED_URLS) {
    try {
      const result = await firecrawlMap(seed, { search: "menu", limit: 200 });
      const links = result?.links || result?.data || [];
      for (const raw of links) { const url = String(raw || ""); if (isValidUrl(url)) discovered.add(url); }
    } catch { /* continue */ }
  }
  console.log(`[deliveroo] Layer 1 map: ${discovered.size} URLs`);

  // Layer 2: Firecrawl crawl fallback
  if (discovered.size < 10) {
    for (const seed of SEED_URLS.slice(0, 4)) {
      try {
        const result = await firecrawlCrawl(seed, { limit: 50, maxDepth: 2, includePaths: ["/menu/"] });
        const pages = result?.data || result?.pages || [];
        for (const page of pages) { const url = String(page?.url || ""); if (isValidUrl(url)) discovered.add(url); }
      } catch { /* continue */ }
    }
    console.log(`[deliveroo] Layer 2 crawl: ${discovered.size} URLs`);
  }

  // Layer 3: Seed URLs as fallback
  for (const seed of SEED_URLS) { if (seed.includes("/menu/")) discovered.add(seed); }

  return [...discovered];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedAt = new Date().toISOString();
  const stats = { discovered: 0, scraped: 0, accepted: 0, blocked: 0, failed: 0, errors: [] as string[] };
  let scrapeRunId: string | null = null;

  try {
    // Create scrape run record
    const { data: runRow } = await supabase.from("merchant_scrape_runs").insert({
      engine_name: "deliveroo-food-intake-engine", source: SOURCE, source_type: SOURCE, region: REGION,
      started_at: startedAt, status: "running", trigger_source: "edge_function",
    }).select("id").single();
    scrapeRunId = runRow?.id || null;

    // Step 1: Discover
    const urls = await discoverUrls();
    stats.discovered = urls.length;
    console.log(`[deliveroo] Discovered ${stats.discovered} restaurant URLs`);

    if (scrapeRunId) {
      await supabase.from("merchant_scrape_runs").update({ discovered_count: stats.discovered }).eq("id", scrapeRunId);
    }

    // Step 2: Scrape batch
    const batch = urls.slice(0, 25);

    for (const url of batch) {
      try {
        const scrape = await firecrawlScrape(url, { formats: ["markdown"], onlyMainContent: true });
        const markdown = scrape?.data?.markdown || scrape?.markdown || "";
        if (!markdown) { stats.failed++; continue; }
        stats.scraped++;

        const parsed = parseRestaurantFromMarkdown(markdown, url);
        if (!parsed) { stats.failed++; continue; }

        // Validate
        const failures: string[] = [];
        if (!parsed.name || parsed.name.length < 2) failures.push("name_missing");
        if (parsed.menu_items.length < 3) failures.push("menu_too_small");
        if (isPlaceholder(parsed.logo_image) && isPlaceholder(parsed.cover_image)) failures.push("no_valid_image");
        if (BLOCKED_CATEGORIES.includes(parsed.category.toLowerCase())) failures.push("blocked_category");

        const isBlocked = failures.length > 0;

        const row = {
          source_type: SOURCE, source_entity_id: parsed.source_entity_id, source_url: parsed.source_url,
          city: REGION, country: COUNTRY, vertical: VERTICAL, is_food: true,
          name: parsed.name, slug: slugify(parsed.name), address: parsed.address,
          latitude: parsed.latitude, longitude: parsed.longitude, phone: null,
          logo_image: parsed.logo_image, cover_image: parsed.cover_image, gallery_images: [],
          category: parsed.category, subcategory: parsed.subcategory, cuisine_tags: parsed.cuisine_tags,
          rating: parsed.rating, review_count: parsed.review_count,
          menu_items_json: parsed.menu_items, menu_categories_json: parsed.menu_categories,
          raw_menu_json: { categories: parsed.menu_categories },
          visibility_mode: "hidden", publish_gate_status: isBlocked ? "failed" : "pending",
          blocking_reason: isBlocked ? failures.join(", ") : null, gate_failures: failures,
          pipeline_stage: isBlocked ? "failed" : "intake", pipeline_status: "pending",
          source_payload: parsed.raw_payload, source_last_scraped_at: new Date().toISOString(),
          is_published: false, is_coming_soon: false,
          content_status: parsed.menu_items.length >= 3 ? "partial" : "empty",
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase.from("seed_merchants").upsert(row as any, { onConflict: "source_type,source_entity_id" });
        if (upsertErr) { stats.failed++; stats.errors.push(`upsert:${parsed.source_entity_id}:${upsertErr.message}`); continue; }

        // Save snapshot
        await supabase.from("merchant_source_snapshots").insert({
          source: SOURCE, source_entity_id: parsed.source_entity_id, source_merchant_id: parsed.source_entity_id,
          source_url: parsed.source_url, raw_payload_json: { markdown }, extracted_payload_json: parsed,
          snapshot_json: parsed.raw_payload, region: REGION,
        } as any);

        if (isBlocked) stats.blocked++; else stats.accepted++;
      } catch (err) { stats.failed++; stats.errors.push(`${url}: ${String(err)}`); }

      await new Promise(r => setTimeout(r, 400));
    }

    // Finalize scrape run
    if (scrapeRunId) {
      await supabase.from("merchant_scrape_runs").update({
        finished_at: new Date().toISOString(),
        status: stats.errors.length > 0 ? "partial" : "completed",
        discovered_count: stats.discovered, scraped_count: stats.scraped,
        accepted_count: stats.accepted, blocked_count: stats.blocked, failed_count: stats.failed,
        metadata_json: { errors: stats.errors.slice(0, 20), batch_size: batch.length },
      }).eq("id", scrapeRunId);
    }

    // Engine log
    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine", started_at: startedAt, finished_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(), status: "ok",
      rows_read: stats.discovered, db_rows_affected: stats.accepted + stats.blocked, side_effect_count: stats.scraped,
      effect_summary: `Deliveroo intake: discovered=${stats.discovered}, scraped=${stats.scraped}, accepted=${stats.accepted}, blocked=${stats.blocked}, failed=${stats.failed}`,
      trigger_source: "deliveroo-dubai-food", metadata_json: stats,
    });

    return new Response(JSON.stringify({ success: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    if (scrapeRunId) {
      await supabase.from("merchant_scrape_runs").update({
        finished_at: new Date().toISOString(), status: "error", failed_count: stats.failed + 1,
        metadata_json: { errors: [...stats.errors, String(err)].slice(0, 20) },
      }).eq("id", scrapeRunId);
    }
    await supabase.from("engine_run_logs").insert({
      engine_name: "deliveroo-food-intake-engine", started_at: startedAt, finished_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(), status: "error",
      error_message: String(err), effect_summary: "Fatal error during Deliveroo intake",
      trigger_source: "deliveroo-dubai-food",
    });
    return new Response(JSON.stringify({ success: false, error: String(err), stats }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
