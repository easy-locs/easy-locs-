import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ======================================================
// CONSTANTS
// ======================================================

const PLACEHOLDER_PATTERNS = [
  "placeholder", "default", "generic", "via.placeholder", "dummyimage",
  "placehold.co", "picsum.photos", "lorempixel", "stock-photo", "no-image",
  "noimage", "blank", "favicon", "logo", "avatar", "icon",
  "unsplash.com", "images.unsplash.com",
];

const JUNK_MENU_NAMES = [
  "item", "item 1", "item 2", "menu item", "product", "test",
  "sample", "placeholder", "untitled", "n/a", "null", "undefined",
  "total", "subtotal", "delivery", "tax", "fees", "coming soon",
  "tbd", "---", "none",
];

const UAE_PHONE_PATTERNS = [
  /\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+971\d{9}/,
  /0[45]\d[\s-]?\d{3}[\s-]?\d{4}/,
];

const FOOD_KEYWORDS: Record<string, string[]> = {
  pizza: ["pizza", "margherita", "pepperoni", "calzone"],
  burger: ["burger", "cheeseburger", "smash", "patty"],
  sushi: ["sushi", "sashimi", "maki", "nigiri", "ramen"],
  bakery: ["bakery", "croissant", "pastry", "bread", "cake", "muffin"],
  cafe: ["cafe", "coffee", "latte", "espresso", "cappuccino"],
  indian: ["biryani", "tandoori", "curry", "naan", "masala", "tikka"],
  chinese: ["wok", "dim sum", "fried rice", "chow mein", "dumpling"],
  lebanese: ["shawarma", "falafel", "hummus", "fattoush", "manakeesh"],
  italian: ["pasta", "risotto", "bruschetta", "lasagna", "tiramisu"],
  seafood: ["shrimp", "lobster", "fish", "crab", "calamari"],
  steakhouse: ["steak", "wagyu", "ribeye", "tenderloin", "grill"],
  desserts: ["dessert", "waffle", "donut", "baklava", "kunafa"],
  healthy: ["salad", "poke", "vegan", "organic", "bowl"],
};

const THRESHOLDS = {
  minFoodItems: 3,
  minScoreLive: 70,
  minScoreSearchOnly: 50,
  maxGenericNameRatio: 0.35,
  minPricedRatio: 0.35,
  maxDuplicateImageRatio: 0.25,
};

// ======================================================
// HELPERS
// ======================================================

function norm(v?: string | null) { return (v ?? "").replace(/\s+/g, " ").trim(); }

function isPlaceholder(url?: string | null) {
  if (!url) return true;
  const l = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => l.includes(p));
}

function isImageUrl(url?: string | null) {
  if (!url) return false;
  const l = url.toLowerCase();
  if (!l.startsWith("http")) return false;
  if (isPlaceholder(l)) return false;
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(l) ||
    /(cloudinary|imgix|cdn|media|images|img|uploads|static)/i.test(l);
}

function isJunkName(name?: string | null) {
  const l = norm(name).toLowerCase();
  if (!l) return true;
  if (JUNK_MENU_NAMES.includes(l)) return true;
  if (/^[\d\s.,€$£¥₹%+\-*/=]+$/.test(l)) return true;
  if (/^(https?:|www\.)/i.test(l)) return true;
  return false;
}

function titleCase(s: string) { return s.replace(/\b\w/g, c => c.toUpperCase()); }

function extractPhone(text: string): string | null {
  for (const p of UAE_PHONE_PATTERNS) {
    const m = text.match(p);
    if (m) return norm(m[0]);
  }
  return null;
}

function extractAddress(text: string): string | null {
  const patterns = [
    /(?:address|location|located|find us)[:\s]+([^\n]{10,120})/i,
    /((?:building|tower|mall|center|centre|plaza|street|road)[\w\s,.-]{8,120})/i,
    /((?:dubai|abu dhabi|sharjah|ajman|uae)[\w\s,.-]{0,120})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return norm(m[1]).slice(0, 180);
  }
  return null;
}

function extractCoords(text: string) {
  const m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }
  return { latitude: null as number | null, longitude: null as number | null };
}

function extractHours(text: string): string | null {
  const patterns = [
    /(?:hours?|timing|open)[:\s]+([^\n]{8,120})/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return norm(m[1]);
  }
  return null;
}

function detectVertical(name: string, desc?: string | null): string {
  const t = `${name} ${desc ?? ""}`.toLowerCase();
  if (/(hotel|resort|hostel|suite|inn|stay|accommodation)/i.test(t)) return "hotel";
  if (/(salon|barber|spa|fitness|gym|laundry|cleaning|clinic)/i.test(t)) return "services";
  if (/(supermarket|grocery|market|pharmacy|organic store)/i.test(t)) return "grocery";
  return "food";
}

function detectSubcategory(text: string): string {
  const l = text.toLowerCase();
  let best = { key: "general", score: 0 };
  for (const [key, words] of Object.entries(FOOD_KEYWORDS)) {
    const score = words.filter(w => l.includes(w)).length;
    if (score > best.score) best = { key, score };
  }
  return best.key;
}

// ======================================================
// MENU EXTRACTION FROM MARKDOWN
// ======================================================

function extractMenuFromMarkdown(md: string): any[] {
  const lines = md.split("\n");
  const items: any[] = [];
  const seen = new Set<string>();
  let currentCat = "";

  for (let i = 0; i < lines.length; i++) {
    const line = norm(lines[i]);
    if (!line) continue;

    // Detect category headers
    if (line.length < 40 && !/\d/.test(line) && /^[A-Za-z&\s/-]+$/.test(line) && !isJunkName(line)) {
      currentCat = line;
    }

    // Price pattern: "Item Name AED 35" or "Item Name 35 AED"
    const priceMatch = line.match(/^(.{3,80}?)\s+(?:AED|Dhs?|د\.إ)?\s?(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?|د\.إ)?$/i);
    if (priceMatch) {
      const name = titleCase(norm(priceMatch[1]));
      const price = parseFloat(priceMatch[2]);
      if (!isJunkName(name) && price > 0 && price < 5000) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const nextLine = norm(lines[i + 1] || "");
          const desc = nextLine && nextLine.length > 10 && nextLine.length < 180 &&
            !/\b(?:AED|Dhs?|د\.إ)\b/i.test(nextLine) ? nextLine : undefined;
          // Find nearby image
          let photo_url: string | undefined;
          for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
            const imgMatch = lines[j].match(/!\[[^\]]*\]\(([^)]+)\)/);
            if (imgMatch?.[1] && isImageUrl(imgMatch[1])) { photo_url = imgMatch[1]; break; }
            const rawImg = lines[j].match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/i);
            if (rawImg?.[0] && isImageUrl(rawImg[0])) { photo_url = rawImg[0]; break; }
          }
          items.push({ name, description: desc, price, category: currentCat || "Main", photo_url });
        }
      }
      continue;
    }

    // Bullet items
    const bullet = line.match(/^[-•*]\s+(.{3,80}?)(?:\s+(?:AED|Dhs?|د\.إ)?\s?(\d+(?:\.\d{1,2})?))?$/i);
    if (bullet) {
      const name = titleCase(norm(bullet[1]));
      const price = bullet[2] ? parseFloat(bullet[2]) : undefined;
      if (!isJunkName(name)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ name, price, category: currentCat || "Main" });
        }
      }
    }

    // Table row: | Name | Price |
    const tableMatch = line.match(/^\|?\s*([^|]{3,60})\s*\|\s*(?:AED|Dhs?)?\s*(\d+(?:\.\d{1,2})?)\s*\|?$/i);
    if (tableMatch) {
      const name = titleCase(norm(tableMatch[1]));
      const price = parseFloat(tableMatch[2]);
      if (!isJunkName(name) && price > 0 && price < 5000) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ name, price, category: currentCat || "Main" });
        }
      }
    }
  }

  return items.slice(0, 120);
}

// ======================================================
// MENU VALIDATOR
// ======================================================

function validateAndCleanMenu(menuItems: any[], coverImage?: string | null) {
  const failures: string[] = [];

  let cleaned = menuItems
    .map(item => ({
      name: titleCase(norm(item.name)),
      description: norm(item.description || "") || undefined,
      price: typeof item.price === "number" && item.price > 0 && item.price < 5000 ? item.price : undefined,
      category: norm(item.category || "") || "Main",
      photo_url: norm(item.photo_url || "") || undefined,
    }))
    .filter(item => !isJunkName(item.name));

  // Dedup by name
  const seenNames = new Set<string>();
  cleaned = cleaned.filter(item => {
    const k = item.name.toLowerCase();
    if (seenNames.has(k)) return false;
    seenNames.add(k);
    return true;
  });

  // Remove cover-copy & placeholder images
  cleaned = cleaned.map(item => {
    const sameAsCover = item.photo_url && coverImage &&
      item.photo_url.toLowerCase().trim() === coverImage.toLowerCase().trim();
    if (sameAsCover || isPlaceholder(item.photo_url)) return { ...item, photo_url: undefined };
    return item;
  });

  // Strip duplicate menu images (1 image = 1 item rule)
  const imgCounts = new Map<string, number>();
  for (const item of cleaned) {
    if (item.photo_url) {
      const k = item.photo_url.toLowerCase().trim();
      imgCounts.set(k, (imgCounts.get(k) || 0) + 1);
    }
  }
  let duplicatedImages = 0;
  cleaned = cleaned.map(item => {
    if (!item.photo_url) return item;
    if ((imgCounts.get(item.photo_url.toLowerCase().trim()) || 0) > 1) {
      duplicatedImages++;
      return { ...item, photo_url: undefined };
    }
    return item;
  });

  const total = cleaned.length;
  const pricedItems = cleaned.filter(i => typeof i.price === "number").length;
  const withDesc = cleaned.filter(i => !!i.description && i.description.length > 10).length;
  const uniqueNames = new Set(cleaned.map(i => i.name.toLowerCase())).size;
  const genericNames = cleaned.filter(i => isJunkName(i.name)).length;
  const withSections = cleaned.filter(i => !!i.category && i.category !== "Main").length;
  const genericRatio = total > 0 ? genericNames / total : 1;
  const pricedRatio = total > 0 ? pricedItems / total : 0;
  const dupImgRatio = total > 0 ? duplicatedImages / total : 0;

  if (total < THRESHOLDS.minFoodItems) failures.push("insufficient_menu_items");
  if (genericRatio > THRESHOLDS.maxGenericNameRatio) failures.push("too_many_generic_names");
  if (pricedRatio < THRESHOLDS.minPricedRatio) failures.push("too_few_priced_items");
  if (dupImgRatio > THRESHOLDS.maxDuplicateImageRatio) failures.push("duplicated_item_images");

  let score = 0;
  if (total >= 10) score += 30; else if (total >= 5) score += 20; else if (total >= 3) score += 10;
  score += Math.round(pricedRatio * 25);
  score += Math.round((withDesc / Math.max(total, 1)) * 15);
  score += Math.round((withSections / Math.max(total, 1)) * 10);
  score += Math.round((uniqueNames / Math.max(total, 1)) * 10);
  if (dupImgRatio === 0) score += 10;
  if (failures.length > 0) score -= failures.length * 8;
  score = Math.max(0, Math.min(100, score));

  // Group into sections
  const groups: Record<string, any[]> = {};
  for (const item of cleaned) {
    const cat = item.category || "Main";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  const sections = Object.entries(groups).map(([name, items]) => ({ name, items }));

  return {
    valid: failures.length === 0 && score >= THRESHOLDS.minScoreSearchOnly,
    score, failures,
    stats: { totalItems: total, pricedItems, uniqueNames, duplicatedImages, genericNames, withDesc, withSections },
    cleaned_menu: { sections, totalItems: total },
  };
}

// ======================================================
// QUALITY SCORE
// ======================================================

function computeQualityScore(args: {
  cover_image?: string | null; phone?: string | null;
  latitude?: number | null; longitude?: number | null;
  description?: string | null; menuScore: number;
  galleryCount: number; vertical: string;
}) {
  let s = 0;
  if (args.cover_image && !isPlaceholder(args.cover_image)) s += 15;
  if (args.phone && args.phone.length >= 6) s += 10;
  if (args.latitude != null && args.longitude != null) s += 15;
  if (args.description && args.description.length > 30) s += 10;
  if (args.vertical === "food") s += Math.round(args.menuScore * 0.4);
  else s += 20;
  if (args.galleryCount >= 5) s += 10; else if (args.galleryCount >= 2) s += 5;
  return Math.max(0, Math.min(100, s));
}

// ======================================================
// READINESS COMPUTATION
// ======================================================

function computeReadiness(args: {
  visibility_mode: string; quality_score: number;
  has_menu: boolean; has_phone: boolean; has_geo: boolean;
  has_cover: boolean; vertical: string;
}) {
  const isLive = args.visibility_mode === "live";
  const isVisible = args.visibility_mode !== "hidden";
  return {
    storefront_status: isLive ? "ready" : isVisible ? "partial" : "locked",
    menu_status: args.vertical === "food"
      ? (args.has_menu ? (args.quality_score >= 60 ? "ready" : "partial") : "locked")
      : "ready",
    radar_status: args.has_geo && isVisible ? "ready" : args.has_geo ? "partial" : "locked",
    orbit_status: args.has_phone && isVisible ? "ready" : args.has_phone ? "partial" : "locked",
    wallet_status: isVisible ? "partial" : "locked",
    delivery_status: args.vertical === "food"
      ? (args.has_geo && args.has_menu ? "ready" : "partial")
      : "not_applicable",
    boost_status: args.quality_score >= 70 && isLive ? "ready" : args.quality_score >= 50 ? "partial" : "locked",
    analytics_status: isVisible ? "partial" : "locked",
  };
}

// ======================================================
// MAIN HANDLER
// ======================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
  const db = createClient(supabaseUrl, supabaseKey);

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { url, urls, city = "Dubai", country = "AE" } = body;
    const targetUrls: string[] = urls || (url ? [url] : []);

    if (targetUrls.length === 0) {
      return new Response(JSON.stringify({ error: "url or urls required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const targetUrl of targetUrls.slice(0, 10)) {
      try {
        console.log(`[deep-scrape] Scraping: ${targetUrl}`);

        // Step 1: Firecrawl deep scrape
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            formats: ["markdown", "links"],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });
        const scrapeData = await scrapeRes.json();
        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
        const metadata = scrapeData?.data?.metadata || scrapeData?.metadata || {};
        const links = scrapeData?.data?.links || scrapeData?.links || [];

        if (!markdown || markdown.length < 50) {
          results.push({ url: targetUrl, success: false, error: "No content extracted" });
          continue;
        }

        // Step 2: Extract structured data from markdown
        const title = metadata.title || null;
        const description = (metadata.description || "").slice(0, 500) || null;
        const phone = extractPhone(markdown);
        const address = extractAddress(markdown);
        const { latitude, longitude } = extractCoords(markdown);
        const hours = extractHours(markdown);

        // Extract images from markdown
        const imgMatches = [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)];
        const rawImages = imgMatches.map(m => m[1]).filter(u => isImageUrl(u));
        const gallery_images = [...new Set(rawImages)].slice(0, 20);
        const cover_image = gallery_images[0] || (metadata.ogImage && !isPlaceholder(metadata.ogImage) ? metadata.ogImage : null);

        // Step 3: Extract menu items
        const menuItems = extractMenuFromMarkdown(markdown);

        // Step 4: Classify
        const vertical = detectVertical(title || "", description);
        const subcategory = vertical === "food"
          ? detectSubcategory(`${title || ""} ${description || ""} ${menuItems.map((m: any) => m.name).join(" ")}`)
          : "general";

        // Step 5: Validate menu
        const validated = validateAndCleanMenu(menuItems, cover_image);

        // Step 6: Compute quality score
        const quality_score = computeQualityScore({
          cover_image, phone, latitude, longitude, description,
          menuScore: validated.score,
          galleryCount: gallery_images.length,
          vertical,
        });

        // Step 7: Determine visibility
        const visibility_mode =
          quality_score >= THRESHOLDS.minScoreLive && validated.valid ? "live"
            : quality_score >= THRESHOLDS.minScoreSearchOnly ? "search_only"
              : "hidden";

        // Step 8: Check for existing duplicate
        const { data: existing } = await db.from("seed_merchants")
          .select("id").ilike("name", title || "---impossible---")
          .eq("city", city).limit(1);

        if (existing?.length) {
          results.push({ url: targetUrl, success: false, error: "Duplicate detected", existing_id: existing[0].id });
          continue;
        }

        // Step 9: Insert entity
        const insertPayload: Record<string, any> = {
          name: title || "Untitled Business",
          city, country, vertical,
          category: vertical,
          subcategory,
          description,
          phone,
          address,
          cover_image,
          gallery_images,
          menu_items_json: validated.cleaned_menu,
          latitude, longitude,
          opening_hours: hours,
          visibility_mode,
          overall_quality_score: quality_score,
          visibility_score: quality_score,
          publish_gate_status: validated.valid ? "passed" : "failed",
          gate_failures: validated.failures,
          source_url: targetUrl,
          source_type: "deep_scrape",
          source_snapshot_json: { markdown_length: markdown.length, links_count: links.length, metadata },
          source_snapshot_at: new Date().toISOString(),
          pipeline_stage: "source_raw",
          is_active: true,
          menu_quality_score: validated.score,
          menu_quality_flag: validated.valid ? "clean" : validated.failures[0] || "failed",
        };

        const { data: inserted, error: insertErr } = await db
          .from("seed_merchants").insert(insertPayload).select("id").single();

        if (insertErr || !inserted?.id) {
          results.push({ url: targetUrl, success: false, error: insertErr?.message || "Insert failed" });
          continue;
        }

        // Step 10: Compute readiness & update module statuses
        const readiness = computeReadiness({
          visibility_mode, quality_score,
          has_menu: validated.cleaned_menu.totalItems >= 3,
          has_phone: !!phone, has_geo: latitude != null && longitude != null,
          has_cover: !!cover_image, vertical,
        });

        // Compute truth/publish status
        const isLive = visibility_mode === "live";
        const truth_status = isLive && quality_score >= 70 ? "live"
          : isLive || quality_score >= 50 ? "partially_live"
            : quality_score >= 40 ? "ready_for_review" : "draft";
        const publish_status = isLive && quality_score >= 70 ? "live"
          : isLive ? "partially_live"
            : quality_score >= 50 ? "ready_for_review" : "draft";

        const modules = Object.values(readiness);
        const active_modules = modules.filter(s => s === "ready").length;
        const total_modules = modules.filter(s => s !== "not_applicable").length;

        // Build hints
        const hints: string[] = [];
        if (readiness.menu_status === "locked" && vertical === "food") hints.push("Add 3+ menu items to unlock boost");
        if (!latitude) hints.push("Add location to activate delivery & radar");
        if (!cover_image || isPlaceholder(cover_image)) hints.push("Add a cover photo to improve visibility");
        if (!phone) hints.push("Add phone number to enable Orbit contact");

        await db.from("seed_merchants").update({
          ...readiness,
          truth_status, publish_status,
          active_modules, total_modules,
          module_summary_json: { ...readiness, hints },
          last_sync_at: new Date().toISOString(),
        }).eq("id", inserted.id);

        // Step 11: Enqueue in pipeline
        await db.from("entity_pipeline_queue").insert({
          entity_id: inserted.id,
          entity_type: "seed_merchant",
          current_stage: "source",
          next_stage: "classify",
          priority: 9,
          status: "pending",
        });

        results.push({
          url: targetUrl, success: true,
          entity_id: inserted.id,
          quality_score, visibility_mode,
          truth_status, publish_status,
          menu: { items: validated.cleaned_menu.totalItems, score: validated.score, valid: validated.valid },
          readiness,
          active_modules: `${active_modules}/${total_modules}`,
          hints,
        });

        console.log(`[deep-scrape] ✅ ${title} → score=${quality_score} vis=${visibility_mode} modules=${active_modules}/${total_modules}`);

      } catch (urlErr: any) {
        console.error(`[deep-scrape] Error for ${targetUrl}:`, urlErr.message);
        results.push({ url: targetUrl, success: false, error: urlErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[deep-scrape]", err);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
