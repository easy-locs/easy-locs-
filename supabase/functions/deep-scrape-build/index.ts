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

const GLOBAL_PHONE_PATTERNS = [
  /\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/, /\+971\d{9}/, /0[45]\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+33[\s-]?\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/, /0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
  /\+1[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/, /\+44[\s-]?\d{4}[\s-]?\d{6}/,
  /\+49[\s-]?\d{3,4}[\s-]?\d{6,8}/, /\+34[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}/,
  /\+39[\s-]?\d{2,3}[\s-]?\d{6,8}/, /\+212[\s-]?\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+91[\s-]?\d{10}/, /\+81[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{4}/,
  /\+\d{1,3}[\s-]?\d{4,14}/, // generic international
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

// Currency patterns for global price extraction
const PRICE_PATTERNS = [
  // AED / Dirham
  /^(.{3,80}?)\s+(?:AED|Dhs?|د\.إ)?\s?(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?|د\.إ)?$/i,
  // EUR
  /^(.{3,80}?)\s+(\d+(?:[.,]\d{1,2})?)\s*€$/i,
  /^(.{3,80}?)\s+€\s?(\d+(?:[.,]\d{1,2})?)$/i,
  // USD / GBP
  /^(.{3,80}?)\s+\$\s?(\d+(?:\.\d{1,2})?)$/i,
  /^(.{3,80}?)\s+£\s?(\d+(?:\.\d{1,2})?)$/i,
  // MAD
  /^(.{3,80}?)\s+(\d+(?:\.\d{1,2})?)\s*(?:MAD|DH)$/i,
  // Generic: "Item 25.00"
  /^(.{3,80}?)\s+(\d+(?:\.\d{1,2})?)$/i,
];

const THRESHOLDS = {
  minFoodItems: 3,
  minScoreLive: 70,
  minScoreSearchOnly: 50,
  maxGenericNameRatio: 0.35,
  minPricedRatio: 0.35,
  maxDuplicateImageRatio: 0.25,
};

// Country → default currency
const COUNTRY_CURRENCY: Record<string, string> = {
  AE: "AED", SA: "SAR", US: "USD", GB: "GBP", FR: "EUR", DE: "EUR",
  ES: "EUR", IT: "EUR", MA: "MAD", TN: "TND", EG: "EGP", IN: "INR",
  JP: "JPY", CN: "CNY", BR: "BRL", TR: "TRY", CA: "CAD", AU: "AUD",
  NG: "NGN", ZA: "ZAR", SN: "XOF", CM: "XAF", KE: "KES",
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
  for (const p of GLOBAL_PHONE_PATTERNS) {
    const m = text.match(p);
    if (m) return norm(m[0]);
  }
  return null;
}

function extractAddress(text: string): string | null {
  const patterns = [
    /(?:address|location|located|find us|adresse|dirección|indirizzo)[:\s]+([^\n]{10,120})/i,
    /((?:building|tower|mall|center|centre|plaza|street|road|avenue|blvd|rue|via|calle)[\w\s,.-]{8,120})/i,
    /((?:dubai|abu dhabi|sharjah|paris|london|new york|tokyo|casablanca|dakar|berlin|madrid|rome)[\w\s,.-]{0,120})/i,
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
    /(?:hours?|timing|open|horaires?|ouvert)[:\s]+([^\n]{8,120})/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|h)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|h))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return norm(m[1]);
  }
  return null;
}

function detectVertical(name: string, desc?: string | null): string {
  const t = `${name} ${desc ?? ""}`.toLowerCase();
  if (/(hotel|resort|hostel|suite|inn|stay|accommodation|hébergement|riad|lodge)/i.test(t)) return "hotel";
  if (/(salon|barber|spa|fitness|gym|laundry|cleaning|clinic|plumber|electrician|coiffeur|garage)/i.test(t)) return "services";
  if (/(supermarket|grocery|market|pharmacy|organic store|épicerie|marché)/i.test(t)) return "grocery";
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
// DEEP LINK DISCOVERY — follow menu/about/contact pages
// ======================================================

async function discoverDeepLinks(links: string[], baseUrl: string, firecrawlKey: string): Promise<{
  menuMarkdown: string | null;
  aboutMarkdown: string | null;
  extraImages: string[];
  extraPhone: string | null;
  extraAddress: string | null;
  extraCoords: { latitude: number | null; longitude: number | null };
}> {
  const result = {
    menuMarkdown: null as string | null,
    aboutMarkdown: null as string | null,
    extraImages: [] as string[],
    extraPhone: null as string | null,
    extraAddress: null as string | null,
    extraCoords: { latitude: null as number | null, longitude: null as number | null },
  };

  // Classify links by intent
  const menuLinks = links.filter(l =>
    /menu|carte|speisekarte|carta|cardápio/i.test(l) && l.startsWith("http")
  ).slice(0, 2);

  const aboutLinks = links.filter(l =>
    /about|contact|us|a-propos|qui-sommes|kontakt|contacto|info/i.test(l) && l.startsWith("http") &&
    !menuLinks.includes(l)
  ).slice(0, 2);

  const deepLinks = [...menuLinks, ...aboutLinks].slice(0, 3); // max 3 deep crawls

  for (const deepUrl of deepLinks) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: deepUrl, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 2000 }),
      });
      const data = await res.json();
      const md = data?.data?.markdown || data?.markdown || "";

      if (!md || md.length < 30) continue;

      const isMenuPage = menuLinks.includes(deepUrl);
      if (isMenuPage && !result.menuMarkdown) {
        result.menuMarkdown = md;
      } else if (!isMenuPage && !result.aboutMarkdown) {
        result.aboutMarkdown = md;
      }

      // Extract additional signals
      if (!result.extraPhone) result.extraPhone = extractPhone(md);
      if (!result.extraAddress) result.extraAddress = extractAddress(md);
      if (!result.extraCoords.latitude) result.extraCoords = extractCoords(md);

      const imgMatches = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)];
      result.extraImages.push(...imgMatches.map(m => m[1]).filter(u => isImageUrl(u)));
    } catch (e) {
      console.warn(`[deep-link] Failed: ${deepUrl}`, e);
    }
  }

  return result;
}

// ======================================================
// MULTI-SOURCE TRUTH COMPARISON
// ======================================================

interface FieldCandidate {
  value: any;
  confidence: number;
  source: string;
}

function chooseBestTruth(candidates: FieldCandidate[]): any {
  if (candidates.length === 0) return null;
  // Sort by confidence descending, pick first non-null
  const sorted = candidates.filter(c => c.value != null && c.value !== "").sort((a, b) => b.confidence - a.confidence);
  return sorted[0]?.value ?? null;
}

function buildTruthMap(mainData: any, deepData: any) {
  const fields: Record<string, FieldCandidate[]> = {
    phone: [],
    address: [],
    latitude: [],
    longitude: [],
    description: [],
  };

  // Main page (confidence 0.9)
  if (mainData.phone) fields.phone.push({ value: mainData.phone, confidence: 0.9, source: "main" });
  if (mainData.address) fields.address.push({ value: mainData.address, confidence: 0.8, source: "main" });
  if (mainData.latitude) fields.latitude.push({ value: mainData.latitude, confidence: 0.9, source: "main" });
  if (mainData.longitude) fields.longitude.push({ value: mainData.longitude, confidence: 0.9, source: "main" });
  if (mainData.description) fields.description.push({ value: mainData.description, confidence: 0.7, source: "main" });

  // Deep links (confidence 0.7-0.85)
  if (deepData.extraPhone) fields.phone.push({ value: deepData.extraPhone, confidence: 0.85, source: "deep" });
  if (deepData.extraAddress) fields.address.push({ value: deepData.extraAddress, confidence: 0.75, source: "deep" });
  if (deepData.extraCoords.latitude) {
    fields.latitude.push({ value: deepData.extraCoords.latitude, confidence: 0.85, source: "deep" });
    fields.longitude.push({ value: deepData.extraCoords.longitude, confidence: 0.85, source: "deep" });
  }

  return {
    phone: chooseBestTruth(fields.phone),
    address: chooseBestTruth(fields.address),
    latitude: chooseBestTruth(fields.latitude),
    longitude: chooseBestTruth(fields.longitude),
    description: chooseBestTruth(fields.description) || mainData.description,
  };
}

// ======================================================
// MENU EXTRACTION FROM MARKDOWN (global currency support)
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
    if (line.length < 40 && !/\d/.test(line) && /^[A-Za-zÀ-ÿ&\s/-]+$/.test(line) && !isJunkName(line)) {
      currentCat = line;
    }

    // Try all price patterns
    for (const pattern of PRICE_PATTERNS) {
      const priceMatch = line.match(pattern);
      if (priceMatch) {
        const name = titleCase(norm(priceMatch[1]));
        const price = parseFloat(priceMatch[2].replace(",", "."));
        if (!isJunkName(name) && price > 0 && price < 50000) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            const nextLine = norm(lines[i + 1] || "");
            const desc = nextLine && nextLine.length > 10 && nextLine.length < 180 &&
              !/\b(?:AED|Dhs?|د\.إ|€|\$|£|MAD)\b/i.test(nextLine) ? nextLine : undefined;
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
        break; // stop trying other patterns once matched
      }
    }

    // Bullet items
    const bullet = line.match(/^[-•*]\s+(.{3,80}?)(?:\s+(?:AED|Dhs?|€|\$|£|MAD)?\s?(\d+(?:[.,]\d{1,2})?))?$/i);
    if (bullet && !seen.has(titleCase(norm(bullet[1])).toLowerCase())) {
      const name = titleCase(norm(bullet[1]));
      const price = bullet[2] ? parseFloat(bullet[2].replace(",", ".")) : undefined;
      if (!isJunkName(name)) {
        seen.add(name.toLowerCase());
        items.push({ name, price, category: currentCat || "Main" });
      }
    }

    // Table row: | Name | Price |
    const tableMatch = line.match(/^\|?\s*([^|]{3,60})\s*\|\s*(?:AED|Dhs?|€|\$|£)?\s*(\d+(?:[.,]\d{1,2})?)\s*\|?$/i);
    if (tableMatch && !seen.has(titleCase(norm(tableMatch[1])).toLowerCase())) {
      const name = titleCase(norm(tableMatch[1]));
      const price = parseFloat(tableMatch[2].replace(",", "."));
      if (!isJunkName(name) && price > 0 && price < 50000) {
        seen.add(name.toLowerCase());
        items.push({ name, price, category: currentCat || "Main" });
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
      price: typeof item.price === "number" && item.price > 0 && item.price < 50000 ? item.price : undefined,
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
// READINESS
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
// CONFIDENCE SCORE
// ======================================================

function computeConfidence(args: {
  hasTitle: boolean; hasDesc: boolean; hasPhone: boolean;
  hasGeo: boolean; hasCover: boolean; menuScore: number;
  deepLinksFollowed: number; sourcesCompared: number;
}): number {
  let c = 0;
  if (args.hasTitle) c += 15;
  if (args.hasDesc) c += 10;
  if (args.hasPhone) c += 15;
  if (args.hasGeo) c += 20;
  if (args.hasCover) c += 10;
  c += Math.round(args.menuScore * 0.2);
  c += Math.min(10, args.deepLinksFollowed * 5); // bonus for deep link data
  c += Math.min(5, args.sourcesCompared * 2.5); // bonus for multi-source
  return Math.max(0, Math.min(100, c));
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

    const currency = COUNTRY_CURRENCY[country] || "AED";
    const results: any[] = [];

    for (const targetUrl of targetUrls.slice(0, 10)) {
      try {
        console.log(`[deep-scrape] Processing: ${targetUrl}`);

        // ── STEP 1: Main page scrape ──
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
        const links: string[] = scrapeData?.data?.links || scrapeData?.links || [];

        if (!markdown || markdown.length < 50) {
          results.push({ url: targetUrl, success: false, error: "No content extracted" });
          continue;
        }

        // ── STEP 2: Classify page type ──
        const pageType = classifyPageType(markdown, links, targetUrl);
        console.log(`[deep-scrape] Page type: ${pageType}`);

        // ── STEP 3: Follow deep links (menu, about, contact) ──
        const deepData = await discoverDeepLinks(links, targetUrl, firecrawlKey);
        const deepLinksFollowed = (deepData.menuMarkdown ? 1 : 0) + (deepData.aboutMarkdown ? 1 : 0);
        console.log(`[deep-scrape] Deep links followed: ${deepLinksFollowed}`);

        // ── STEP 4: Extract fields from main page ──
        const title = metadata.title || null;
        const rawDesc = (metadata.description || "").slice(0, 500) || null;
        const mainPhone = extractPhone(markdown);
        const mainAddress = extractAddress(markdown);
        const mainCoords = extractCoords(markdown);
        const hours = extractHours(markdown);

        // ── STEP 5: Compare sources & choose best truth per field ──
        const truth = buildTruthMap(
          { phone: mainPhone, address: mainAddress, latitude: mainCoords.latitude, longitude: mainCoords.longitude, description: rawDesc },
          deepData
        );

        // ── STEP 6: Collect all images ──
        const imgMatches = [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)];
        const rawImages = imgMatches.map(m => m[1]).filter(u => isImageUrl(u));
        const allImages = [...new Set([...rawImages, ...deepData.extraImages])].filter(u => isImageUrl(u));
        const gallery_images = allImages.slice(0, 20);
        const cover_image = gallery_images[0] || (metadata.ogImage && !isPlaceholder(metadata.ogImage) ? metadata.ogImage : null);

        // ── STEP 7: Extract & validate menu (main + deep menu page) ──
        const mainMenuItems = extractMenuFromMarkdown(markdown);
        const deepMenuItems = deepData.menuMarkdown ? extractMenuFromMarkdown(deepData.menuMarkdown) : [];
        // Merge: deep menu items take priority if we got more from the menu page
        const allMenuItems = deepMenuItems.length > mainMenuItems.length ? deepMenuItems : mainMenuItems;

        const vertical = detectVertical(title || "", truth.description);
        const subcategory = vertical === "food"
          ? detectSubcategory(`${title || ""} ${truth.description || ""} ${allMenuItems.map((m: any) => m.name).join(" ")}`)
          : "general";

        // ── STEP 8: Validate menu ──
        const validated = validateAndCleanMenu(allMenuItems, cover_image);

        // ── STEP 9: Validate images ──
        const validatedImages = gallery_images.filter(img => !isPlaceholder(img));

        // ── STEP 10: Compute scores ──
        const quality_score = computeQualityScore({
          cover_image, phone: truth.phone, latitude: truth.latitude, longitude: truth.longitude,
          description: truth.description, menuScore: validated.score,
          galleryCount: validatedImages.length, vertical,
        });

        const confidence = computeConfidence({
          hasTitle: !!title, hasDesc: !!truth.description, hasPhone: !!truth.phone,
          hasGeo: truth.latitude != null, hasCover: !!cover_image,
          menuScore: validated.score, deepLinksFollowed,
          sourcesCompared: 1 + deepLinksFollowed,
        });

        const visibility_mode =
          quality_score >= THRESHOLDS.minScoreLive && validated.valid ? "live"
            : quality_score >= THRESHOLDS.minScoreSearchOnly ? "search_only"
              : "hidden";

        // ── STEP 11: Check duplicates ──
        const { data: existing } = await db.from("seed_merchants")
          .select("id").ilike("name", title || "---impossible---")
          .eq("city", city).limit(1);

        if (existing?.length) {
          results.push({ url: targetUrl, success: false, error: "Duplicate detected", existing_id: existing[0].id });
          continue;
        }

        // ── STEP 12: Build entity ──
        const insertPayload: Record<string, any> = {
          name: title || "Untitled Business",
          city, country, vertical,
          category: vertical,
          subcategory,
          area: truth.address?.split(",")[0]?.trim() || city,
          description: truth.description,
          phone: truth.phone,
          address: truth.address,
          cover_image,
          gallery_images: validatedImages,
          menu_items_json: validated.cleaned_menu,
          latitude: truth.latitude,
          longitude: truth.longitude,
          opening_hours: hours,
          visibility_mode,
          overall_quality_score: quality_score,
          visibility_score: quality_score,
          publish_gate_status: validated.valid ? "passed" : "failed",
          gate_failures: validated.failures,
          source_url: targetUrl,
          source_type: "deep_scrape",
          source_snapshot_json: {
            markdown_length: markdown.length, links_count: links.length, metadata,
            deep_links_followed: deepLinksFollowed, confidence, page_type: pageType,
          },
          source_snapshot_at: new Date().toISOString(),
          pipeline_stage: "source_raw",
          is_active: true,
          currency,
          menu_quality_score: validated.score,
          menu_quality_flag: validated.valid ? "clean" : validated.failures[0] || "failed",
        };

        const { data: inserted, error: insertErr } = await db
          .from("seed_merchants").insert(insertPayload).select("id").single();

        if (insertErr || !inserted?.id) {
          results.push({ url: targetUrl, success: false, error: insertErr?.message || "Insert failed" });
          continue;
        }

        // ── STEP 13: Compute readiness ──
        const readiness = computeReadiness({
          visibility_mode, quality_score,
          has_menu: validated.cleaned_menu.totalItems >= 3,
          has_phone: !!truth.phone, has_geo: truth.latitude != null && truth.longitude != null,
          has_cover: !!cover_image, vertical,
        });

        const isLive = visibility_mode === "live";
        const truth_status = isLive && quality_score >= 70 ? "live"
          : isLive || quality_score >= 50 ? "partially_live"
            : "draft";
        const publish_status = isLive ? "live" : quality_score >= 50 ? "ready_for_review" : "draft";

        const activeModules = Object.values(readiness).filter(v => v === "ready").length;

        await db.from("seed_merchants").update({
          storefront_status: readiness.storefront_status,
          orbit_status: readiness.orbit_status,
          wallet_status: readiness.wallet_status,
          delivery_status: readiness.delivery_status,
          analytics_status: readiness.analytics_status,
          radar_status: readiness.radar_status,
          menu_status: readiness.menu_status,
          boost_status: readiness.boost_status,
          truth_status, publish_status,
          active_modules: activeModules,
        }).eq("id", inserted.id);

        // ── STEP 14: Enqueue to pipeline ──
        await db.from("entity_pipeline_queue").insert({
          entity_id: inserted.id,
          entity_type: "seed_merchant",
          current_stage: "source_raw",
          next_stage: "classify",
          priority: 9,
          status: "pending",
          retries: 0,
        }).catch(() => null);

        results.push({
          url: targetUrl, success: true,
          entity_id: inserted.id, quality_score, confidence,
          visibility_mode, truth_status, publish_status,
          menu: { items: validated.cleaned_menu.totalItems, score: validated.score, valid: validated.valid },
          readiness, active_modules: `${activeModules}/8`,
          deep_links_followed: deepLinksFollowed,
          page_type: pageType,
          hints: generateHints(readiness, validated, truth),
        });

      } catch (e: any) {
        console.error(`[deep-scrape] Error for ${targetUrl}:`, e);
        results.push({ url: targetUrl, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[deep-scrape] Fatal:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ======================================================
// PAGE TYPE CLASSIFIER
// ======================================================

function classifyPageType(markdown: string, links: string[], url: string): string {
  const lower = markdown.toLowerCase();
  const urlLower = url.toLowerCase();

  if (/menu|carte|speisekarte/i.test(urlLower)) return "menu_page";
  if (/about|a-propos|qui-sommes/i.test(urlLower)) return "about_page";
  if (/contact|kontakt|contacto/i.test(urlLower)) return "contact_page";

  // Content analysis
  const hasMenu = lower.includes("menu") || lower.includes("carte") || /\d+[.,]\d{2}\s*(?:€|\$|£|AED)/i.test(lower);
  const hasBooking = /book|réserver|buchen|reservar/i.test(lower);
  const hasMultipleLinks = links.length > 10;

  if (hasMenu && !hasMultipleLinks) return "restaurant_page";
  if (hasBooking) return "booking_page";
  if (hasMultipleLinks && links.length > 50) return "directory_page";

  return "business_page";
}

// ======================================================
// HINT GENERATOR
// ======================================================

function generateHints(readiness: any, validated: any, truth: any): string[] {
  const hints: string[] = [];
  if (readiness.menu_status === "locked") hints.push("Add at least 3 menu items to unlock menu module");
  if (readiness.radar_status !== "ready") hints.push("Add GPS coordinates to activate radar discovery");
  if (readiness.orbit_status !== "ready") hints.push("Add phone number to enable Orbit contact");
  if (!truth.description || truth.description.length < 30) hints.push("Add a detailed description for better visibility");
  if (validated.score < 50) hints.push("Improve menu quality: add prices and descriptions");
  if (readiness.boost_status === "locked") hints.push("Reach quality score 70+ to unlock boost campaigns");
  return hints;
}
