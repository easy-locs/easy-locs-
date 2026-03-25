import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Multi-Source Scraper — Extracts from Deliveroo, Talabat, Careem, Booking, Expedia
 * via Firecrawl search API. Each source has tailored query templates.
 */

interface SourceConfig {
  name: string;
  searchTemplate: (area: string, city: string) => string[];
  vertical: string;
  detectSubcategory: (name: string, desc: string) => string;
}

const SOURCES: Record<string, SourceConfig> = {
  deliveroo: {
    name: "Deliveroo",
    searchTemplate: (area, city) => [
      `site:deliveroo.ae restaurants ${area} ${city}`,
      `deliveroo ${area} ${city} best restaurants`,
    ],
    vertical: "food",
    detectSubcategory: (name, desc) => detectFoodSub(name, desc),
  },
  talabat: {
    name: "Talabat",
    searchTemplate: (area, city) => [
      `site:talabat.com ${area} ${city} restaurants`,
      `talabat ${area} ${city} food delivery`,
    ],
    vertical: "food",
    detectSubcategory: (name, desc) => detectFoodSub(name, desc),
  },
  careem: {
    name: "Careem",
    searchTemplate: (area, city) => [
      `site:careem.com food ${area} ${city}`,
      `careem now ${area} ${city} restaurants`,
    ],
    vertical: "food",
    detectSubcategory: (name, desc) => detectFoodSub(name, desc),
  },
  booking: {
    name: "Booking.com",
    searchTemplate: (area, city) => [
      `site:booking.com hotels ${area} ${city} UAE`,
      `booking.com ${area} ${city} hotel deals`,
    ],
    vertical: "hotel",
    detectSubcategory: (name, desc) => detectHotelSub(name, desc),
  },
  expedia: {
    name: "Expedia",
    searchTemplate: (area, city) => [
      `site:expedia.com ${area} ${city} hotels UAE`,
      `expedia ${area} ${city} hotel booking`,
    ],
    vertical: "hotel",
    detectSubcategory: (name, desc) => detectHotelSub(name, desc),
  },
  google: {
    name: "Google",
    searchTemplate: (area, city) => [
      `best restaurants ${area} ${city} UAE`,
      `top hotels ${area} ${city} UAE`,
    ],
    vertical: "food",
    detectSubcategory: (name, desc) => detectFoodSub(name, desc),
  },
};

const PLACEHOLDER_PATTERNS = [
  "placeholder", "unsplash.com", "dummyimage", "placehold.co",
  "picsum.photos", "lorempixel", "stock-photo", "data:image",
  "favicon", "logo", "icon", "avatar", "1x1",
];

function isRealPhoto(url: string): boolean {
  if (!url || url.length < 15) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;
  if (PLACEHOLDER_PATTERNS.some(p => lower.includes(p))) return false;
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(url) ||
    /(cloudinary|imgix|cdn|media|images|photos|uploads|static)/i.test(url);
}

function detectFoodSub(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  const map: Record<string, string[]> = {
    pizza: ["pizza", "pizzeria"],
    burger: ["burger", "burgers"],
    sushi: ["sushi", "japanese", "ramen"],
    shawarma: ["shawarma", "kebab", "grill"],
    indian: ["indian", "biryani", "curry", "tandoori"],
    chinese: ["chinese", "dim sum", "wok", "noodles"],
    italian: ["italian", "pasta", "risotto"],
    lebanese: ["lebanese", "hummus", "falafel", "manoushe"],
    cafe: ["cafe", "coffee", "espresso", "latte"],
    bakery: ["bakery", "pastry", "croissant", "cake"],
    seafood: ["seafood", "fish", "lobster", "shrimp"],
    fine_dining: ["fine dining", "michelin", "gourmet"],
    fast_food: ["fast food", "kfc", "mcdonald", "subway"],
  };
  for (const [sub, keywords] of Object.entries(map)) {
    if (keywords.some(k => text.includes(k))) return sub;
  }
  return "restaurant";
}

function detectHotelSub(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  if (text.includes("resort") || text.includes("beach resort")) return "resort";
  if (text.includes("apartment") || text.includes("serviced")) return "serviced_apartment";
  if (text.includes("boutique")) return "boutique_hotel";
  if (text.includes("hostel")) return "hostel";
  return "hotel";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      sources = ["deliveroo", "talabat", "booking"],
      city = "Dubai",
      area,
      limit = 5,
    } = body;

    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const results: Record<string, { onboarded: number; skipped: number }> = {};

    for (const sourceKey of sources) {
      const config = SOURCES[sourceKey];
      if (!config) continue;

      const queries = config.searchTemplate(area ?? city, city);
      const query = queries[Math.floor(Math.random() * queries.length)];

      console.log(`[multi-scrape] ${config.name}: "${query}"`);

      const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          limit: Math.min(limit, 10),
          country: "ae",
          lang: "en",
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!searchResp.ok) {
        const errText = await searchResp.text();
        console.error(`[multi-scrape] ${config.name} search failed: ${errText}`);
        results[sourceKey] = { onboarded: 0, skipped: 0 };
        continue;
      }

      const searchData = await searchResp.json();
      const items = searchData.data ?? [];
      let onboarded = 0;
      let skipped = 0;

      for (const item of items) {
        const name = item.title
          ?.replace(/ - .*$/, "")?.replace(/ \| .*$/, "")?.replace(/ · .*$/, "")
          ?.replace(/Deliveroo|Talabat|Careem|Booking\.com|Expedia/gi, "")
          ?.trim();
        if (!name || name.length < 2 || name.length > 100) { skipped++; continue; }

        // Check duplicate
        const { data: existing } = await db.from("seed_merchants")
          .select("id").ilike("name", name).eq("city", city).limit(1);
        if (existing?.length) { skipped++; continue; }

        const content = item.markdown ?? item.description ?? "";
        const sourceUrl = item.url ?? "";

        // Extract photos
        const photos: string[] = [];
        const imgPattern = /!\[[^\]]*\]\(([^)]+)\)/g;
        let m;
        while ((m = imgPattern.exec(content)) !== null) {
          if (isRealPhoto(m[1])) photos.push(m[1]);
        }
        const urlPattern = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/gi;
        while ((m = urlPattern.exec(content)) !== null) {
          if (isRealPhoto(m[0]) && !photos.includes(m[0])) photos.push(m[0]);
        }

        // Extract phone
        const phoneMatch = content.match(/\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/) ??
          content.match(/0[45]\d[\s-]?\d{3}[\s-]?\d{4}/);
        const phone = phoneMatch?.[0]?.trim() ?? null;

        // Extract menu items (food only)
        const menuItems: any[] = [];
        if (config.vertical === "food") {
          const pricePattern = /^(.{3,60}?)\s*[–—-]?\s*(?:AED|Dhs?)?\s*(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?)?/gim;
          let pm;
          while ((pm = pricePattern.exec(content)) !== null) {
            const itemName = pm[1].replace(/[\*\|#]+/g, "").trim();
            const price = parseFloat(pm[2]);
            if (itemName.length >= 3 && price > 0 && price < 5000) {
              menuItems.push({ name: itemName, price });
            }
          }
        }

        // Extract rating
        const ratingMatch = content.match(/(\d+\.?\d?)\s*(?:\/\s*5|stars?|★)/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        const subcategory = config.detectSubcategory(name, content);

        await db.from("seed_merchants").insert({
          name,
          city,
          country: "AE",
          vertical: config.vertical,
          category: config.vertical,
          subcategory,
          description: (item.description ?? "").slice(0, 500) || null,
          phone,
          cover_image: photos[0] ?? null,
          gallery_images: photos.slice(0, 10),
          menu_items_json: menuItems.length > 0 ? menuItems : null,
          rating: rating && rating <= 5 ? rating : null,
          source_type: "aggregator",
          source_key: `${sourceKey}_${Date.now()}_${onboarded}`,
          source_url: sourceUrl,
          pipeline_stage: "source_raw",
          is_active: true,
          visibility_mode: "hidden",
          overall_quality_score: 0,
          source_snapshot_json: {
            source: config.name,
            scraped_at: new Date().toISOString(),
            source_url: sourceUrl,
            raw_title: item.title,
            photos_found: photos.length,
            menu_items_found: menuItems.length,
          },
          source_snapshot_at: new Date().toISOString(),
        });

        onboarded++;
      }

      // Enqueue new entities for pipeline
      if (onboarded > 0) {
        const { data: newEntities } = await db
          .from("seed_merchants")
          .select("id")
          .eq("city", city)
          .eq("pipeline_stage", "source_raw")
          .eq("source_type", "aggregator")
          .order("created_at", { ascending: false })
          .limit(onboarded);

        if (newEntities?.length) {
          const rows = newEntities.map((e: any) => ({
            entity_id: e.id,
            entity_type: "seed_merchant",
            current_stage: "source",
            next_stage: "classify",
            priority: 8,
            status: "pending",
          }));
          await db.from("entity_pipeline_queue").insert(rows);
        }
      }

      results[sourceKey] = { onboarded, skipped };
      console.log(`[multi-scrape] ${config.name}: ${onboarded} onboarded, ${skipped} skipped`);
    }

    return new Response(
      JSON.stringify({ success: true, city, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[multi-scrape]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
