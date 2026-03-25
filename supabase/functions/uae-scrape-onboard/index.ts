import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// UAE cities and areas
const UAE_ZONES = [
  { city: "Dubai", areas: ["Dubai Marina", "Downtown Dubai", "JBR", "Business Bay", "DIFC", "Jumeirah", "Al Barsha", "Deira", "Bur Dubai", "JLT", "Palm Jumeirah", "City Walk", "Dubai Mall", "Al Karama", "Mirdif", "Dubai Silicon Oasis", "International City", "Al Quoz", "Motor City", "Sports City"] },
  { city: "Abu Dhabi", areas: ["Corniche", "Al Reem Island", "Yas Island", "Saadiyat Island", "Khalifa City", "Al Maryah Island", "Tourist Club Area", "Al Khalidiya", "Al Wahda", "Electra Street"] },
  { city: "Sharjah", areas: ["Al Majaz", "Al Nahda", "Al Khan", "Al Taawun", "University City", "Al Qasimia"] },
  { city: "Ajman", areas: ["Al Nuaimiya", "Al Rashidiya", "Ajman Corniche"] },
  { city: "Ras Al Khaimah", areas: ["Al Nakheel", "Al Hamra", "Corniche"] },
  { city: "Fujairah", areas: ["Fujairah City", "Al Faseel"] },
  { city: "Umm Al Quwain", areas: ["UAQ City Center"] },
];

const VERTICALS_QUERIES: Record<string, string[]> = {
  food: ["restaurants", "cafes", "bakeries", "fast food", "fine dining", "shawarma", "pizza", "burger", "sushi", "indian restaurant", "chinese restaurant", "italian restaurant", "lebanese restaurant"],
  hotel: ["hotels", "resorts", "serviced apartments", "boutique hotels"],
  services: ["salons", "spas", "clinics", "gyms", "car wash", "laundry", "pet grooming"],
  grocery: ["supermarkets", "grocery stores", "pharmacies", "organic stores"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { city = "Dubai", vertical = "food", area, limit = 20 } = body;

    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY not configured. Connect Firecrawl in Settings.");
    }

    const zone = UAE_ZONES.find(z => z.city.toLowerCase() === city.toLowerCase());
    const targetArea = area ?? zone?.areas?.[0] ?? city;
    const queries = VERTICALS_QUERIES[vertical] ?? VERTICALS_QUERIES.food;
    const query = `${queries[Math.floor(Math.random() * queries.length)]} in ${targetArea}, ${city}, UAE`;

    console.log(`[uae-scrape] Searching: "${query}"`);

    // Use Firecrawl search to find businesses
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 20),
        country: "ae",
        lang: "en",
      }),
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      throw new Error(`Firecrawl search failed [${searchResp.status}]: ${errText}`);
    }

    const searchData = await searchResp.json();
    const results = searchData.data ?? [];
    let onboarded = 0;
    let skipped = 0;

    for (const result of results) {
      const name = result.title?.replace(/ - .*$/, "")?.replace(/ \| .*$/, "")?.trim();
      if (!name || name.length < 2 || name.length > 100) { skipped++; continue; }

      // Skip if already exists
      const { data: existing } = await db
        .from("seed_merchants")
        .select("id")
        .eq("name", name)
        .eq("city", city)
        .limit(1);

      if (existing?.length) { skipped++; continue; }

      // Extract description from scraped content
      const description = result.description?.slice(0, 300) ?? null;

      // Detect subcategory from name + content
      const subcategory = detectSubcategory(name, description ?? "", vertical);

      await db.from("seed_merchants").insert({
        name,
        city,
        country: "AE",
        vertical,
        category: vertical,
        subcategory,
        description,
        source_type: "aggregator",
        source_key: `firecrawl_${Date.now()}_${onboarded}`,
        pipeline_stage: "source_raw",
        is_active: true,
        visibility_mode: "hidden",
        overall_quality_score: 0,
      });

      onboarded++;
    }

    // Enqueue onboarded entities for pipeline processing
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
          priority: 7,
          status: "pending",
        }));
        await db.from("entity_pipeline_queue").insert(rows);
      }
    }

    console.log(`[uae-scrape] Done: ${onboarded} onboarded, ${skipped} skipped from ${results.length} results`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        city,
        area: targetArea,
        vertical,
        resultsFound: results.length,
        onboarded,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[uae-scrape]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function detectSubcategory(name: string, description: string, vertical: string): string {
  const text = `${name} ${description}`.toLowerCase();
  
  if (vertical === "food") {
    const map: Record<string, string[]> = {
      pizza: ["pizza", "pizzeria"],
      burger: ["burger", "smash"],
      sushi: ["sushi", "japanese", "ramen"],
      bakery: ["bakery", "boulangerie", "pastry", "cake"],
      cafe: ["café", "cafe", "coffee"],
      indian: ["indian", "curry", "tandoori", "biryani"],
      chinese: ["chinese", "wok", "dim sum"],
      lebanese: ["lebanese", "shawarma", "falafel", "hummus", "manakeesh"],
      italian: ["italian", "pasta", "trattoria"],
      seafood: ["seafood", "fish", "lobster"],
      arabic: ["arabic", "grills", "fattoush"],
      steakhouse: ["steak", "steakhouse", "grill"],
      fast_food: ["fast food", "fried chicken", "wings", "kfc", "mcdonalds"],
      healthy: ["healthy", "salad", "poke", "bowl", "vegan"],
      ice_cream: ["ice cream", "gelato"],
      desserts: ["dessert", "chocolate", "donut", "waffle"],
      breakfast: ["breakfast", "brunch"],
    };
    for (const [sub, kws] of Object.entries(map)) {
      if (kws.some(k => text.includes(k))) return sub;
    }
    return "general";
  }

  if (vertical === "hotel") {
    if (text.includes("resort")) return "resort";
    if (text.includes("hostel")) return "hostel";
    if (text.includes("apartment")) return "serviced_apartment";
    if (text.includes("boutique")) return "boutique_hotel";
    if (text.includes("villa")) return "villa";
    return "hotel";
  }

  if (vertical === "services") {
    if (text.includes("salon") || text.includes("barber") || text.includes("beauty")) return "salon";
    if (text.includes("spa") || text.includes("wellness") || text.includes("massage")) return "spa";
    if (text.includes("clinic") || text.includes("medical") || text.includes("dental")) return "clinic";
    if (text.includes("gym") || text.includes("fitness")) return "fitness";
    if (text.includes("clean")) return "cleaning";
    return "general";
  }

  if (vertical === "grocery") {
    if (text.includes("pharmacy")) return "pharmacy";
    if (text.includes("organic")) return "organic";
    if (text.includes("minimart") || text.includes("mini market")) return "minimart";
    return "supermarket";
  }

  return "general";
}
