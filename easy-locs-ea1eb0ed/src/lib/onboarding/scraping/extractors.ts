import type { SourceName } from "../types";

const PLACEHOLDER_PATTERNS = [
  "placeholder", "default", "generic", "via.placeholder", "dummyimage",
  "placehold.co", "picsum.photos", "lorempixel", "stock-photo", "no-image",
  "noimage", "blank", "favicon", "avatar",
  "data:image", "base64",
  "svg+xml", "1x1", "pixel",
];

const JUNK_MENU_NAMES = [
  "item", "item 1", "item 2", "menu item", "product", "test",
  "sample", "placeholder", "untitled", "n/a", "null", "undefined",
  "total", "subtotal", "delivery", "tax", "fees", "coming soon",
  "tbd", "---", "none", "menu", "food", "dish", "___",
];

const GLOBAL_PHONE_PATTERNS = [
  /\+971[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/, /\+971\d{9}/, /0[45]\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+33[\s-]?\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/, /0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
  /\+1[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/, /\+44[\s-]?\d{4}[\s-]?\d{6}/,
  /\+49[\s-]?\d{3,4}[\s-]?\d{6,8}/, /\+34[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}/,
  /\+39[\s-]?\d{2,3}[\s-]?\d{6,8}/, /\+212[\s-]?\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+91[\s-]?\d{10}/, /\+81[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{4}/,
  /\+55[\s-]?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/,
  /\+90[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+7[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+82[\s-]?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}/,
  /\+61[\s-]?\d[\s-]?\d{4}[\s-]?\d{4}/,
  /\+221[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+225[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+216[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3}/,
  /\+213[\s-]?\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+20[\s-]?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}/,
  /\+966[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/, /\+966\d{9}/,
  /\+974[\s-]?\d{4}[\s-]?\d{4}/,
  /\+965[\s-]?\d{4}[\s-]?\d{4}/,
  /\+234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+27[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+254[\s-]?\d{3}[\s-]?\d{6}/,
  /\+233[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+92[\s-]?\d{3}[\s-]?\d{7}/,
  /\+880[\s-]?\d{4}[\s-]?\d{6}/,
  /\+66[\s-]?\d[\s-]?\d{4}[\s-]?\d{4}/,
  /\+84[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}/,
  /\+62[\s-]?\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}/,
  /\+60[\s-]?\d[\s-]?\d{4}[\s-]?\d{4}/,
  /\+63[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+57[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+52[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+54[\s-]?\d{1,2}[\s-]?\d{4}[\s-]?\d{4}/,
  /\+51[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+56[\s-]?\d[\s-]?\d{4}[\s-]?\d{4}/,
  /\+86[\s-]?\d{2,3}[\s-]?\d{4}[\s-]?\d{4}/,
  /\+65[\s-]?\d{4}[\s-]?\d{4}/,
  /\+64[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+962[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+968[\s-]?\d{4}[\s-]?\d{4}/,
  /\+973[\s-]?\d{4}[\s-]?\d{4}/,
  /\+961[\s-]?\d[\s-]?\d{3}[\s-]?\d{3}/,
  /\+964[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
  /\+972[\s-]?\d[\s-]?\d{3}[\s-]?\d{4}/,
  /\+380[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+48[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}/,
  /\+46[\s-]?\d{1,3}[\s-]?\d{5,8}/,
  /\+41[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\+31[\s-]?\d[\s-]?\d{4}[\s-]?\d{4}/,
  /\+32[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{3}/,
  /\+351[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}/,
  /\(\d{2,3}\)\s?\d{3,4}[\s-]?\d{4}/,
  /\+\d{1,3}[\s-]?\d{4,14}/,
];

const PRICE_PATTERNS = [
  /^(.{3,80}?)\s+(?:AED|Dhs?|د\.إ)?\s?(\d+(?:\.\d{1,2})?)\s*(?:AED|Dhs?|د\.إ)?$/i,
  /^(.{3,80}?)\s+(\d+(?:[.,]\d{1,2})?)\s*€$/i,
  /^(.{3,80}?)\s+€\s?(\d+(?:[.,]\d{1,2})?)$/i,
  /^(.{3,80}?)\s+\$\s?(\d+(?:\.\d{1,2})?)$/i,
  /^(.{3,80}?)\s+£\s?(\d+(?:\.\d{1,2})?)$/i,
  /^(.{3,80}?)\s+(\d+(?:\.\d{1,2})?)\s*(?:MAD|DH)$/i,
  /^(.{3,80}?)\s+(\d+(?:\.\d{1,2})?)$/i,
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
  thai: ["thai", "pad thai", "tom yum", "green curry"],
  mexican: ["mexican", "taco", "burrito", "enchilada", "guacamole"],
  korean: ["korean", "bibimbap", "kimchi", "bulgogi"],
};

function norm(v?: string | null): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function isPlaceholder(url?: string | null): boolean {
  if (!url) return true;
  const l = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => l.includes(p));
}

function isImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const l = url.toLowerCase();
  if (!l.startsWith("http")) return false;
  if (isPlaceholder(l)) return false;
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(l) ||
    /(cloudinary|imgix|cdn|media|images|img|uploads|static)/i.test(l);
}

function isJunkName(name?: string | null): boolean {
  const l = norm(name).toLowerCase();
  if (!l || l.length < 2) return true;
  if (JUNK_MENU_NAMES.includes(l)) return true;
  if (/^[\d\s.,€$£¥₹%+\-*/=]+$/.test(l)) return true;
  if (/^(https?:|www\.)/i.test(l)) return true;
  return false;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

const SOCIAL_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "instagram", pattern: /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/i },
  { platform: "facebook", pattern: /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9_.]+)\/?/i },
  { platform: "twitter", pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/i },
  { platform: "tiktok", pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/?/i },
  { platform: "linkedin", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)\/?/i },
  { platform: "youtube", pattern: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/)([a-zA-Z0-9_-]+)\/?/i },
];

export function extractSocialLinks(text: string): Record<string, string> {
  if (!text) return {};
  const links: Record<string, string> = {};
  for (const { platform, pattern } of SOCIAL_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      links[platform] = m[0];
    }
  }
  return links;
}

export function extractPhone(text: string): string | null {
  if (!text) return null;
  for (const p of GLOBAL_PHONE_PATTERNS) {
    const m = text.match(p);
    if (m) return norm(m[0]);
  }
  return null;
}

export function extractEmail(text: string): string | null {
  if (!text) return null;
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

export function extractAddress(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /(?:address|location|located|find us|adresse|dirección|indirizzo|عنوان|موقع|endereço|adres|Адрес|alamat|địa chỉ|ที่อยู่|주소|住所|地址)[:\s]+([^\n]{10,120})/i,
    /((?:building|tower|mall|center|centre|plaza|street|road|avenue|blvd|boulevard|rue|via|calle|strasse|straße|rua|avenida|prospekt|jalan|soi|dong|거리|通り|شارع|طريق)[\w\s,.\u0600-\u06FF\u0E00-\u0E7F\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]{8,120})/i,
    /(\d{1,5}\s+(?:[\w\u00C0-\u024F]+\s){1,3}(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|place|pl|rue|via|calle|strasse|rua|prospekt|jalan|soi|شارع|طريق)[,.\s][\w\s,.\u00C0-\u024F]{5,100})/i,
    /((?:\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b|\b\d{5}(?:-\d{4})?\b|\b\d{4,6}\b)[\s,]+[^\n]{5,80})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return norm(m[1]).slice(0, 180);
  }
  return null;
}

export function extractCoordinates(text: string, metadata?: Record<string, unknown>): { lat: number | null; lng: number | null } {
  if (metadata?.["og:latitude"] && metadata?.["og:longitude"]) {
    const lat = parseFloat(String(metadata["og:latitude"]));
    const lng = parseFloat(String(metadata["og:longitude"]));
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  const m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

export function extractOpeningHours(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /(?:hours?|timing|open|horaires?|ouvert)[:\s]+([^\n]{8,120})/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|h)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|h))/i,
    /((?:mon|tue|wed|thu|fri|sat|sun|daily|everyday)[\s\w:–-]+(?:am|pm|midnight))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return norm(m[1]);
    if (m?.[0]) return norm(m[0]);
  }
  return null;
}

export function extractDescription(markdown: string): string | null {
  if (!markdown) return null;
  const lines = markdown.split("\n").filter(
    l => l.trim().length > 40 && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("-")
  );
  return lines[0]?.trim().slice(0, 500) ?? null;
}

export function extractPhotos(markdown: string): string[] {
  if (!markdown) return [];
  const photos: string[] = [];
  const seen = new Set<string>();

  const imgPattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = imgPattern.exec(markdown)) !== null) {
    const url = match[1].trim();
    if (isImageUrl(url) && !seen.has(url.toLowerCase())) {
      seen.add(url.toLowerCase());
      photos.push(url);
    }
  }

  const urlPattern = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/gi;
  while ((match = urlPattern.exec(markdown)) !== null) {
    const url = match[0].trim();
    if (isImageUrl(url) && !seen.has(url.toLowerCase())) {
      seen.add(url.toLowerCase());
      photos.push(url);
    }
  }

  return photos.slice(0, 20);
}

export function extractMenuItems(markdown: string): Array<{ name: string; description?: string; price?: number; category?: string; photo_url?: string }> {
  if (!markdown) return [];
  const items: Array<{ name: string; description?: string; price?: number; category?: string; photo_url?: string }> = [];
  const seen = new Set<string>();
  const lines = markdown.split("\n");
  let currentCat = "";

  for (let i = 0; i < lines.length; i++) {
    const line = norm(lines[i]);
    if (!line) continue;

    if (/^#{1,3}\s/.test(line)) {
      const catName = line.replace(/^#+\s*/, "").trim();
      if (catName.length > 1 && catName.length < 50) currentCat = catName;
      continue;
    }

    if (line.length < 40 && !/\d/.test(line) && /^[A-Za-zÀ-ÿ&\s/-]+$/.test(line) && !isJunkName(line)) {
      currentCat = line;
    }

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
        break;
      }
    }

    const bullet = line.match(/^[-•*]\s+(.{3,80}?)(?:\s+(?:AED|Dhs?|€|\$|£|MAD)?\s?(\d+(?:[.,]\d{1,2})?))?$/i);
    if (bullet && !seen.has(titleCase(norm(bullet[1])).toLowerCase())) {
      const name = titleCase(norm(bullet[1]));
      const price = bullet[2] ? parseFloat(bullet[2].replace(",", ".")) : undefined;
      if (!isJunkName(name)) {
        seen.add(name.toLowerCase());
        items.push({ name, price, category: currentCat || "Main" });
      }
    }

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

export function extractWebsite(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(?:website|site|web|url)[:\s]+(https?:\/\/[^\s"'<>]+)/i);
  return m ? m[1] : null;
}

export function detectVertical(name: string, desc?: string | null): string {
  const t = `${name} ${desc ?? ""}`.toLowerCase();
  if (/(hotel|resort|hostel|suite|inn|stay|accommodation|hébergement|riad|lodge)/i.test(t)) return "hotel";
  if (/(salon|barber|spa|fitness|gym|laundry|cleaning|clinic|plumber|electrician|coiffeur|garage)/i.test(t)) return "services";
  if (/(supermarket|grocery|market|pharmacy|organic store|épicerie|marché)/i.test(t)) return "grocery";
  return "food";
}

export function detectSubcategory(text: string): string {
  const l = text.toLowerCase().slice(0, 3000);
  for (const [key, words] of Object.entries(FOOD_KEYWORDS)) {
    const hits = words.filter(w => l.includes(w)).length;
    if (hits >= 2) return key;
  }
  for (const [key, words] of Object.entries(FOOD_KEYWORDS)) {
    if (words.some(w => l.includes(w))) return key;
  }
  return "general";
}

const MENU_QUALITY_THRESHOLDS = {
  maxGenericNameRatio: 0.35,
  minPricedRatio: 0.35,
};

function isJunkMenuItemName(name?: string | null): boolean {
  return isJunkName(name);
}

export function validateMenuQuality(items: Array<{ name: string; price?: number }>): {
  cleaned: typeof items;
  pricedRatio: number;
  genericRatio: number;
  valid: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const total = items.length;
  if (total === 0) return { cleaned: [], pricedRatio: 0, genericRatio: 1, valid: false, failures: ["no_items"] };

  const pricedItems = items.filter(i => typeof i.price === "number" && i.price > 0).length;
  const genericNames = items.filter(i => isJunkMenuItemName(i.name)).length;
  const pricedRatio = pricedItems / total;
  const genericRatio = genericNames / total;

  if (genericRatio > MENU_QUALITY_THRESHOLDS.maxGenericNameRatio) {
    failures.push("too_many_generic_names");
  }
  if (pricedRatio < MENU_QUALITY_THRESHOLDS.minPricedRatio) {
    failures.push("too_few_priced_items");
  }

  const cleaned = items.filter(i => !isJunkMenuItemName(i.name));

  return { cleaned, pricedRatio, genericRatio, valid: failures.length === 0, failures };
}

export async function validatePhotoUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];

  const hasImageExtension = (u: string) => /\.(jpg|jpeg|png|webp|avif|gif)(\?|$)/i.test(u);

  const hasImageCdnPattern = (u: string) =>
    /(cloudinary|imgix|cdn|media|images|img|uploads|static|akamai|fastly)/i.test(u);

  const isWellFormedImageUrl = (u: string): boolean => {
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      if (hasImageExtension(u)) return true;
      if (hasImageCdnPattern(u)) return true;
      return false;
    } catch {
      return false;
    }
  };

  const checks = urls.slice(0, 30).map(async (url): Promise<string | null> => {
    if (!isWellFormedImageUrl(url)) return null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok || res.status === 206) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.startsWith("image/") || hasImageExtension(url)) {
          return url;
        }
        return null;
      }

      if (res.status === 404 || res.status === 410) {
        return null;
      }

      return hasImageExtension(url) ? url : null;
    } catch {
      return hasImageExtension(url) ? url : null;
    }
  });

  const results = await Promise.allSettled(checks);
  const validated: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      validated.push(r.value);
    }
  }

  return validated;
}

export interface ScrapedData {
  name: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  openingHours: string | null;
  photos: string[];
  menuItems: Array<{ name: string; description?: string; price?: number; category?: string; photo_url?: string }>;
  categories: string[];
  subcategories: string[];
  socialLinks: Record<string, string>;
  sourceUrl: string | null;
  confidence: number;
  provenance: Record<string, { source: string; confidence: number }>;
}

export function extractAllFromMarkdown(
  markdown: string,
  metadata: Record<string, unknown> = {},
  source: SourceName,
  sourceUrl?: string | null,
): ScrapedData {
  const title = metadata.title ? String(metadata.title).replace(/ - .*$/, "").replace(/ \| .*$/, "").replace(/ · .*$/, "").trim() : null;
  const desc = metadata.description ? String(metadata.description).slice(0, 500) : extractDescription(markdown);
  const phone = extractPhone(markdown);
  const email = extractEmail(markdown);
  const address = extractAddress(markdown);
  const coords = extractCoordinates(markdown, metadata);
  const hours = extractOpeningHours(markdown);
  const photos = extractPhotos(markdown);
  const rawMenuItems = extractMenuItems(markdown);
  const menuQuality = validateMenuQuality(rawMenuItems);
  const menuItems = menuQuality.valid ? menuQuality.cleaned as typeof rawMenuItems : [];
  const websiteUrl = extractWebsite(markdown);
  const socialLinks = extractSocialLinks(markdown);
  const vertical = detectVertical(title ?? "", desc);
  const subcategory = detectSubcategory(`${title ?? ""} ${desc ?? ""} ${menuItems.map(i => i.name).join(" ")}`);

  const provenance: Record<string, { source: string; confidence: number }> = {};
  if (title) provenance.name = { source, confidence: 0.8 };
  if (desc) provenance.description = { source, confidence: 0.7 };
  if (phone) provenance.phone = { source, confidence: 0.85 };
  if (email) provenance.email = { source, confidence: 0.8 };
  if (address) provenance.address = { source, confidence: 0.75 };
  if (coords.lat) provenance.coordinates = { source, confidence: 0.9 };
  if (hours) provenance.openingHours = { source, confidence: 0.7 };
  if (photos.length > 0) provenance.photos = { source, confidence: 0.85 };
  if (menuItems.length > 0) provenance.menuItems = { source, confidence: 0.8 };
  if (Object.keys(socialLinks).length > 0) provenance.socialLinks = { source, confidence: 0.9 };

  let confidence = 0;
  if (title) confidence += 15;
  if (desc) confidence += 10;
  if (phone) confidence += 15;
  if (coords.lat) confidence += 20;
  if (photos.length > 0) confidence += 10;
  if (menuItems.length >= 3) confidence += 20;
  else if (menuItems.length > 0) confidence += 10;
  confidence = Math.min(100, confidence);

  return {
    name: title,
    description: desc,
    phone,
    email,
    address,
    website: websiteUrl,
    lat: coords.lat,
    lng: coords.lng,
    openingHours: hours,
    photos,
    menuItems,
    categories: vertical === "food" ? ["restaurant"] : [vertical],
    subcategories: subcategory !== "general" ? [subcategory] : [],
    socialLinks,
    sourceUrl: sourceUrl ?? null,
    confidence,
    provenance,
  };
}
