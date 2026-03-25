import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UAE_ZONES = [
  { city: "Dubai", areas: ["Dubai Marina", "Downtown Dubai", "JBR", "Business Bay", "DIFC", "Jumeirah", "Al Barsha", "Deira", "Bur Dubai", "JLT", "Palm Jumeirah", "City Walk", "Dubai Mall", "Al Karama", "Mirdif"] },
  { city: "Abu Dhabi", areas: ["Corniche", "Al Reem Island", "Yas Island", "Saadiyat Island", "Khalifa City", "Al Maryah Island"] },
  { city: "Sharjah", areas: ["Al Majaz", "Al Nahda", "Al Khan", "Al Taawun"] },
  { city: "Ajman", areas: ["Al Nuaimiya", "Al Rashidiya", "Ajman Corniche"] },
  { city: "Ras Al Khaimah", areas: ["Al Nakheel", "Al Hamra"] },
  { city: "Fujairah", areas: ["Fujairah City"] },
];

const VERTICALS_QUERIES: Record<string, string[]> = {
  food: ["restaurants", "cafes", "bakeries", "fast food", "fine dining", "shawarma", "pizza", "burger", "sushi", "indian restaurant", "chinese restaurant", "italian restaurant", "lebanese restaurant"],
  hotel: ["hotels", "resorts", "serviced apartments", "boutique hotels"],
  services: ["salons", "spas", "clinics", "gyms", "car wash", "laundry"],
  grocery: ["supermarkets", "grocery stores", "pharmacies"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { city = "Dubai", vertical = "food", area, limit = 10 } = body;

    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY not configured. Connect Firecrawl in Settings.");
    }

    const zone = UAE_ZONES.find(z => z.city.toLowerCase() === city.toLowerCase());
    const targetArea = area ?? zone?.areas?.[0] ?? city;
    const queries = VERTICALS_QUERIES[vertical] ?? VERTICALS_QUERIES.food;
    const query = `${queries[Math.floor(Math.random() * queries.length)]} in ${targetArea}, ${city}, UAE`;

    console.log(`[uae-scrape] Deep search: "${query}"`);

    // Step 1: Search for businesses
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
      throw new Error(`Firecrawl search failed [${searchResp.status}]: ${errText}`);
    }

    const searchData = await searchResp.json();
    const results = searchData.data ?? [];
    let onboarded = 0;
    let skipped = 0;
    const deepResults: any[] = [];

    for (const result of results) {
      const name = result.title?.replace(/ - .*$/, "")?.replace(/ \| .*$/, "")?.replace(/ · .*$/, "")?.trim();
      if (!name || name.length < 2 || name.length > 100) { skipped++; continue; }

      // Skip if already exists
      const { data: existing } = await db.from("seed_merchants").select("id").ilike("name", name).eq("city", city).limit(1);
      if (existing?.length) { skipped++; continue; }

      // Step 2: Deep scrape the result URL to extract interior data
      const pageContent = result.markdown ?? result.description ?? "";
      const sourceUrl = result.url ?? "";
      
      let deepData: DeepScrapeResult = {
        menuItems: [],
        photos: [],
        phone: null,
        address: null,
        latitude: null,
        longitude: null,
        description: null,
        openingHours: null,
        subcategory: "general",
      };

      // Try to deep-scrape the actual page for interior data
      if (sourceUrl && sourceUrl.startsWith("http")) {
        try {
          deepData = await deepScrapePage(firecrawlApiKey, sourceUrl, pageContent);
        } catch (e) {
          console.log(`[uae-scrape] Deep scrape failed for ${name}: ${(e as Error).message}`);
        }
      }

      // Fallback: extract from search result content
      if (!deepData.description && result.description) {
        deepData.description = result.description.slice(0, 500);
      }
      if (deepData.menuItems.length === 0 && pageContent) {
        deepData.menuItems = extractMenuFromMarkdown(pageContent);
      }
      if (deepData.photos.length === 0 && pageContent) {
        deepData.photos = extractPhotosFromMarkdown(pageContent);
      }
      if (!deepData.phone && pageContent) {
        deepData.phone = extractPhone(pageContent);
      }
      if (!deepData.address && pageContent) {
        deepData.address = extractAddress(pageContent, targetArea, city);
      }

      const subcategory = deepData.subcategory !== "general" 
        ? deepData.subcategory 
        : detectSubcategory(name, deepData.description ?? "", vertical);

      // Build the full entity
      const coverImage = deepData.photos.length > 0 ? deepData.photos[0] : null;
      const menuJson = deepData.menuItems.length > 0 
        ? deepData.menuItems.map((item, idx) => ({
            ...item,
            id: `item_${idx}`,
          }))
        : null;

      const insertData: Record<string, any> = {
        name,
        city,
        country: "AE",
        vertical,
        category: vertical,
        subcategory,
        description: deepData.description,
        phone: deepData.phone,
        cover_image: coverImage,
        menu_items_json: menuJson,
        latitude: deepData.latitude,
        longitude: deepData.longitude,
        source_type: "aggregator",
        source_key: `firecrawl_deep_${Date.now()}_${onboarded}`,
        source_url: sourceUrl,
        pipeline_stage: "source_raw",
        is_active: true,
        visibility_mode: "hidden",
        overall_quality_score: 0,
        source_snapshot_json: {
          scraped_at: new Date().toISOString(),
          source_url: sourceUrl,
          raw_title: result.title,
          raw_description: result.description,
          photos_found: deepData.photos.length,
          menu_items_found: deepData.menuItems.length,
          has_phone: !!deepData.phone,
          has_address: !!deepData.address,
          has_coordinates: !!(deepData.latitude && deepData.longitude),
          opening_hours: deepData.openingHours,
          address: deepData.address,
        },
        source_snapshot_at: new Date().toISOString(),
      };

      // Store gallery photos if multiple
      if (deepData.photos.length > 1) {
        insertData.gallery_images = deepData.photos.slice(0, 10);
      }

      await db.from("seed_merchants").insert(insertData);
      onboarded++;

      deepResults.push({
        name,
        menuItems: deepData.menuItems.length,
        photos: deepData.photos.length,
        hasPhone: !!deepData.phone,
        hasCoords: !!(deepData.latitude && deepData.longitude),
        subcategory,
      });
    }

    // Enqueue for pipeline
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

    console.log(`[uae-scrape] Done: ${onboarded} deep-onboarded, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        query, city, area: targetArea, vertical,
        resultsFound: results.length,
        onboarded, skipped,
        deepResults,
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

// ═══════════════════════════════════════
//  DEEP SCRAPE — Extract full interior
// ═══════════════════════════════════════

interface DeepScrapeResult {
  menuItems: { name: string; description?: string; price?: number; category?: string; photo_url?: string }[];
  photos: string[];
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  openingHours: string | null;
  subcategory: string;
}

async function deepScrapePage(apiKey: string, url: string, fallbackContent: string): Promise<DeepScrapeResult> {
  const result: DeepScrapeResult = {
    menuItems: [], photos: [], phone: null, address: null,
    latitude: null, longitude: null, description: null,
    openingHours: null, subcategory: "general",
  };

  // Scrape the actual page with full content + links
  const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: false,
      waitFor: 2000,
    }),
  });

  if (!scrapeResp.ok) {
    throw new Error(`Scrape failed: ${scrapeResp.status}`);
  }

  const scrapeData = await scrapeResp.json();
  const markdown = scrapeData.data?.markdown ?? scrapeData.markdown ?? fallbackContent;
  const metadata = scrapeData.data?.metadata ?? scrapeData.metadata ?? {};

  // Extract description from meta or first paragraph
  result.description = metadata.description ?? extractDescription(markdown);

  // Extract phone numbers
  result.phone = extractPhone(markdown);

  // Extract address
  result.address = extractAddress(markdown, "", "");

  // Extract coordinates from content or metadata
  const coords = extractCoordinates(markdown, metadata);
  result.latitude = coords.lat;
  result.longitude = coords.lng;

  // Extract opening hours
  result.openingHours = extractOpeningHours(markdown);

  // Extract photos (real ones only, no placeholders)
  result.photos = extractPhotosFromMarkdown(markdown);

  // Extract menu items with prices, descriptions, and individual photos
  result.menuItems = extractMenuFromMarkdown(markdown);

  // Detect subcategory from full content
  result.subcategory = detectSubcategoryFromContent(markdown);

  return result;
}

// ═══════════════════════════════════════
//  EXTRACTORS — Parse real data from markdown
// ═══════════════════════════════════════

function extractDescription(markdown: string): string | null {
  if (!markdown) return null;
  // Take first meaningful paragraph (skip headers and short lines)
  const lines = markdown.split("\n").filter(l => l.trim().length > 40 && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("-"));
  return lines[0]?.trim().slice(0, 500) ?? null;
}

function extractPhone(content: string): string | null {
  if (!content) return null;
  // UAE phone patterns: +971, 04-, 050-, 055-, etc.
  const patterns = [
    /\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
    /\+971\d{9}/,
    /0[45]\d[\s-]?\d{3}[\s-]?\d{4}/,
    /\(\d{2,3}\)\s?\d{3,4}[\s-]?\d{4}/,
    /\d{2,4}[\s-]\d{3,4}[\s-]\d{4}/,
  ];
  for (const p of patterns) {
    const match = content.match(p);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

function extractAddress(content: string, area: string, city: string): string | null {
  if (!content) return null;
  // Look for address-like patterns
  const addressPatterns = [
    /(?:address|location|located|find us)[:\s]+([^\n]{10,100})/i,
    /(?:ground floor|floor \d|level \d)[,\s]+([^\n]{10,80})/i,
    /((?:building|tower|mall|center|centre|plaza|street|road|avenue|blvd)[\w\s,]+(?:dubai|abu dhabi|sharjah|ajman))/i,
  ];
  for (const p of addressPatterns) {
    const match = content.match(p);
    if (match) return match[1]?.trim().slice(0, 200) ?? match[0]?.trim().slice(0, 200);
  }
  if (area && city) return `${area}, ${city}, UAE`;
  return null;
}

function extractCoordinates(content: string, metadata: any): { lat: number | null; lng: number | null } {
  // Check metadata for og:latitude/longitude
  if (metadata?.["og:latitude"] && metadata?.["og:longitude"]) {
    return {
      lat: parseFloat(metadata["og:latitude"]),
      lng: parseFloat(metadata["og:longitude"]),
    };
  }
  // Check for Google Maps links with coordinates
  const geoPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = content.match(geoPattern);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat > 20 && lat < 30 && lng > 50 && lng < 60) {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

function extractOpeningHours(content: string): string | null {
  if (!content) return null;
  const patterns = [
    /(?:hours?|timing|open)[:\s]+([^\n]{10,120})/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /((?:mon|tue|wed|thu|fri|sat|sun|daily|everyday)[\s\w:–-]+(?:am|pm|midnight))/i,
  ];
  for (const p of patterns) {
    const match = content.match(p);
    if (match) return match[1]?.trim() ?? match[0]?.trim();
  }
  return null;
}

const PLACEHOLDER_PATTERNS = [
  "placeholder", "default", "generic", "via.placeholder",
  "dummyimage", "placehold.co", "unsplash.com", "picsum.photos",
  "lorempixel", "stock-photo", "no-image", "noimage", "blank",
  "data:image", "base64", "svg+xml", "1x1", "pixel",
  "icon", "favicon", "logo", "avatar",
];

function isRealPhoto(url: string): boolean {
  if (!url || url.length < 15) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;
  if (PLACEHOLDER_PATTERNS.some(p => lower.includes(p))) return false;
  // Must end with image extension or be from known CDN
  const hasImageExt = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(url);
  const isKnownCDN = /(cloudinary|imgix|res\.cloudinary|cdn|media|images|photos|img|uploads|static)/i.test(url);
  return hasImageExt || isKnownCDN;
}

function extractPhotosFromMarkdown(markdown: string): string[] {
  if (!markdown) return [];
  const photos: string[] = [];
  const seen = new Set<string>();

  // Match markdown image syntax ![alt](url) and raw URLs
  const imgPattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = imgPattern.exec(markdown)) !== null) {
    const url = match[1].trim();
    if (isRealPhoto(url) && !seen.has(url.toLowerCase())) {
      seen.add(url.toLowerCase());
      photos.push(url);
    }
  }

  // Match raw image URLs in text
  const urlPattern = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/gi;
  while ((match = urlPattern.exec(markdown)) !== null) {
    const url = match[0].trim();
    if (isRealPhoto(url) && !seen.has(url.toLowerCase())) {
      seen.add(url.toLowerCase());
      photos.push(url);
    }
  }

  return photos.slice(0, 20);
}

function extractMenuFromMarkdown(markdown: string): { name: string; description?: string; price?: number; category?: string; photo_url?: string }[] {
  if (!markdown) return [];
  const items: { name: string; description?: string; price?: number; category?: string; photo_url?: string }[] = [];
  const seen = new Set<string>();
  const lines = markdown.split("\n");

  let currentCategory = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect category headers
    if (/^#{1,3}\s/.test(line)) {
      const catName = line.replace(/^#+\s*/, "").trim();
      if (catName.length > 1 && catName.length < 50) {
        currentCategory = catName;
      }
      continue;
    }

    // Pattern 1: "Item Name ... AED 25" or "Item Name ... 25 AED"  
    const pricePatternAED = /^(.{3,60}?)\s*[–—-]?\s*(?:AED|Dhs?|د\.إ)?\s*(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?|د\.إ)?/i;
    const match1 = line.match(pricePatternAED);
    if (match1) {
      const name = match1[1].replace(/[\*\|]+/g, "").trim();
      const price = parseFloat(match1[2]);
      if (name.length >= 3 && price > 0 && price < 5000 && !isJunkName(name)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          // Look for description on next line
          const nextLine = lines[i + 1]?.trim() ?? "";
          const desc = (nextLine && !pricePatternAED.test(nextLine) && nextLine.length > 10 && nextLine.length < 200 && !nextLine.startsWith("#"))
            ? nextLine.replace(/[\*\|]+/g, "").trim()
            : undefined;
          // Check for image reference near this item
          const nearbyImg = findNearbyImage(lines, i);
          items.push({ name, description: desc, price, category: currentCategory || undefined, photo_url: nearbyImg });
        }
      }
      continue;
    }

    // Pattern 2: Table rows "| Item | Description | Price |"
    if (line.startsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        const name = cells[0].replace(/[\*]+/g, "").trim();
        const priceCell = cells.find(c => /\d+(?:\.\d{1,2})?/.test(c) && c.length < 15);
        const descCell = cells.length >= 3 && !priceCell ? cells[1] : (cells.length >= 3 ? cells[1] : undefined);
        const price = priceCell ? parseFloat(priceCell.replace(/[^\d.]/g, "")) : undefined;
        if (name.length >= 3 && !isJunkName(name) && !name.includes("---")) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              name,
              description: descCell && descCell.length > 5 ? descCell : undefined,
              price: (price && price > 0 && price < 5000) ? price : undefined,
              category: currentCategory || undefined,
            });
          }
        }
      }
      continue;
    }

    // Pattern 3: Bullet list "- Item Name (AED 25)"
    const bulletPattern = /^[-*•]\s+(.{3,60}?)\s*(?:\(?\s*(?:AED|Dhs?)?\s*(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?)?\s*\)?)?$/i;
    const match3 = line.match(bulletPattern);
    if (match3) {
      const name = match3[1].replace(/[\*\|]+/g, "").trim();
      const price = match3[2] ? parseFloat(match3[2]) : undefined;
      if (name.length >= 3 && !isJunkName(name)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ name, price: (price && price > 0 && price < 5000) ? price : undefined, category: currentCategory || undefined });
        }
      }
    }
  }

  return items.slice(0, 100);
}

function findNearbyImage(lines: string[], idx: number): string | undefined {
  // Check ±3 lines for an image reference
  for (let j = Math.max(0, idx - 2); j <= Math.min(lines.length - 1, idx + 2); j++) {
    const imgMatch = lines[j].match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (imgMatch && isRealPhoto(imgMatch[1])) return imgMatch[1];
  }
  return undefined;
}

const JUNK_NAMES = ["item", "menu", "food", "dish", "test", "sample", "placeholder", "n/a", "tbd", "null", "---", "___", "total", "subtotal", "delivery"];

function isJunkName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (lower.length < 2) return true;
  if (JUNK_NAMES.some(j => lower === j)) return true;
  if (/^[\d\s.,€$£¥₹%+\-*/=]+$/.test(name)) return true;
  if (/^(https?:|www\.)/i.test(name)) return true;
  return false;
}

function detectSubcategoryFromContent(markdown: string): string {
  if (!markdown) return "general";
  const text = markdown.toLowerCase().slice(0, 3000);
  const map: Record<string, string[]> = {
    pizza: ["pizza", "pizzeria", "margherita", "pepperoni"],
    burger: ["burger", "smash burger", "cheeseburger", "patty"],
    sushi: ["sushi", "sashimi", "maki", "nigiri", "ramen", "japanese"],
    bakery: ["bakery", "pastry", "croissant", "cake", "bread", "boulangerie"],
    cafe: ["café", "cafe", "coffee shop", "espresso", "latte", "cappuccino"],
    indian: ["indian", "tandoori", "biryani", "curry", "tikka masala", "naan"],
    chinese: ["chinese", "dim sum", "wok", "noodles", "fried rice"],
    lebanese: ["lebanese", "shawarma", "falafel", "hummus", "manakeesh", "fattoush"],
    italian: ["italian", "pasta", "risotto", "trattoria", "bruschetta"],
    seafood: ["seafood", "fish", "lobster", "shrimp", "calamari", "crab"],
    steakhouse: ["steak", "steakhouse", "grill house", "wagyu", "ribeye", "tenderloin"],
    fast_food: ["fast food", "fried chicken", "wings", "nuggets"],
    healthy: ["healthy", "salad", "poke bowl", "acai", "vegan", "organic"],
    ice_cream: ["ice cream", "gelato", "frozen yogurt"],
    desserts: ["dessert", "chocolate", "waffle", "donut", "kunafa", "baklava"],
    thai: ["thai", "pad thai", "tom yum", "green curry"],
    mexican: ["mexican", "taco", "burrito", "enchilada", "guacamole", "quesadilla"],
    korean: ["korean", "bibimbap", "kimchi", "bulgogi", "kbbq"],
  };
  for (const [sub, kws] of Object.entries(map)) {
    const hits = kws.filter(k => text.includes(k)).length;
    if (hits >= 2) return sub;
  }
  for (const [sub, kws] of Object.entries(map)) {
    if (kws.some(k => text.includes(k))) return sub;
  }
  return "general";
}

function detectSubcategory(name: string, description: string, vertical: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (vertical === "food") return detectSubcategoryFromContent(text);
  if (vertical === "hotel") {
    if (text.includes("resort")) return "resort";
    if (text.includes("hostel")) return "hostel";
    if (text.includes("apartment")) return "serviced_apartment";
    if (text.includes("boutique")) return "boutique_hotel";
    return "hotel";
  }
  if (vertical === "services") {
    if (text.includes("salon") || text.includes("barber") || text.includes("beauty")) return "salon";
    if (text.includes("spa") || text.includes("massage")) return "spa";
    if (text.includes("clinic") || text.includes("dental")) return "clinic";
    if (text.includes("gym") || text.includes("fitness")) return "fitness";
    return "general";
  }
  if (vertical === "grocery") {
    if (text.includes("pharmacy")) return "pharmacy";
    if (text.includes("organic")) return "organic";
    return "supermarket";
  }
  return "general";
}
