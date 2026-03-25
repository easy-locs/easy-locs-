/**
 * Menu Intelligence Engine
 * Auto-structures, cleans, sorts, and optimizes menus.
 * Works as a layer above existing catalog_items — no duplication.
 */

// ── Types ──

export interface RawMenuItem {
  id?: string;
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  tags?: string[];
  photo_url?: string | null;
  available?: boolean;
}

export interface SmartMenuItem extends RawMenuItem {
  cleanName: string;
  cleanDescription: string;
  smartCategory: string;
  sortPriority: number;
  isAutoBestseller: boolean;
  bestsellerScore: number;
  hasValidImage: boolean;
  imageQualityScore: number;
}

export interface SmartMenuSection {
  key: string;
  label: string;
  emoji: string;
  items: SmartMenuItem[];
  sortOrder: number;
}

export interface SmartMenuResult {
  sections: SmartMenuSection[];
  totalItems: number;
  bestsellerCount: number;
  imagesCoverage: number;
  menuQualityScore: number;
}

// ── Category detection keywords ──

const CATEGORY_PATTERNS: Array<{ key: string; label: string; emoji: string; keywords: string[]; sortOrder: number }> = [
  { key: "bestsellers", label: "Best Sellers", emoji: "⭐", keywords: [], sortOrder: 0 },
  { key: "starters", label: "Starters", emoji: "🥗", keywords: ["starter", "appetizer", "soup", "salad", "edamame", "spring roll", "bruschetta", "hummus", "miso"], sortOrder: 1 },
  { key: "sushi", label: "Sushi & Rolls", emoji: "🍣", keywords: ["sushi", "maki", "nigiri", "sashimi", "roll", "california", "dragon", "rainbow", "tempura roll"], sortOrder: 2 },
  { key: "mains", label: "Main Dishes", emoji: "🍽️", keywords: ["main", "entree", "plate", "meal", "combo", "special", "grilled", "roasted", "pan"], sortOrder: 3 },
  { key: "pizza", label: "Pizza", emoji: "🍕", keywords: ["pizza", "margherita", "pepperoni", "calzone"], sortOrder: 3 },
  { key: "burgers", label: "Burgers", emoji: "🍔", keywords: ["burger", "patty", "cheeseburger"], sortOrder: 3 },
  { key: "pasta", label: "Pasta", emoji: "🍝", keywords: ["pasta", "spaghetti", "penne", "linguine", "fettuccine", "lasagna", "carbonara", "bolognese"], sortOrder: 4 },
  { key: "noodles", label: "Noodles", emoji: "🍜", keywords: ["noodle", "ramen", "udon", "soba", "pad thai", "chow mein", "pho"], sortOrder: 4 },
  { key: "rice", label: "Rice Dishes", emoji: "🍚", keywords: ["rice", "biryani", "fried rice", "risotto", "pilaf"], sortOrder: 5 },
  { key: "bread", label: "Bread & Bakery", emoji: "🍞", keywords: ["bread", "baguette", "naan", "pita", "croissant", "brioche", "roll", "flatbread"], sortOrder: 5 },
  { key: "sides", label: "Sides & Extras", emoji: "🍟", keywords: ["side", "fries", "extra", "garlic bread", "onion ring", "coleslaw", "rice", "chips"], sortOrder: 6 },
  { key: "drinks", label: "Drinks", emoji: "🥤", keywords: ["drink", "beverage", "water", "juice", "soda", "cola", "coke", "pepsi", "sprite", "coffee", "tea", "lemonade", "smoothie", "milkshake", "beer", "wine", "cocktail", "mocktail"], sortOrder: 7 },
  { key: "desserts", label: "Desserts", emoji: "🍰", keywords: ["dessert", "cake", "ice cream", "gelato", "chocolate", "brownie", "cheesecake", "tiramisu", "pudding", "pie", "cookie", "muffin", "donut", "crème brûlée", "mousse", "pastry", "sweet"], sortOrder: 8 },
];

// ── Title Cleaning ──

export function cleanProductTitle(name: string): string {
  if (!name) return name;
  let clean = name.trim();
  // Remove excessive symbols
  clean = clean.replace(/[*#@!]+/g, "").trim();
  // Remove trailing dots/dashes
  clean = clean.replace(/[\.\-]+$/, "").trim();
  // Normalize multiple spaces
  clean = clean.replace(/\s{2,}/g, " ");
  // Title case
  clean = clean.replace(/\b\w/g, c => c.toUpperCase());
  // Cap length
  if (clean.length > 60) clean = clean.slice(0, 57) + "...";
  return clean;
}

export function cleanProductDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  let clean = desc.trim();
  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, "");
  // Normalize whitespace
  clean = clean.replace(/\s{2,}/g, " ");
  // Cap length
  if (clean.length > 150) clean = clean.slice(0, 147) + "...";
  // Ensure ends with period if long enough
  if (clean.length > 20 && !clean.endsWith(".") && !clean.endsWith("!")) {
    clean += ".";
  }
  return clean;
}

// ── Category Detection ──

function detectCategory(item: RawMenuItem): string {
  const text = `${item.name} ${item.description ?? ""} ${item.category ?? ""}`.toLowerCase();

  // If item already has a meaningful category, try to map it
  if (item.category) {
    const catLower = item.category.toLowerCase();
    const match = CATEGORY_PATTERNS.find(p => p.key === catLower || p.keywords.some(kw => catLower.includes(kw)));
    if (match) return match.key;
  }

  // Detect from name/description
  for (const pattern of CATEGORY_PATTERNS) {
    if (pattern.key === "bestsellers") continue; // Bestsellers are computed, not detected
    if (pattern.keywords.some(kw => text.includes(kw))) return pattern.key;
  }

  return "mains";
}

// ── Bestseller Scoring ──

function computeBestsellerScore(item: RawMenuItem): number {
  let score = 0;

  // Name simplicity (short, clear names are usually bestsellers)
  const nameLen = item.name?.length ?? 0;
  if (nameLen > 5 && nameLen < 25) score += 25;
  else if (nameLen <= 40) score += 15;

  // Has image
  if (item.photo_url) score += 25;

  // Has description
  if (item.description && item.description.length > 10) score += 15;

  // Has price
  if (item.price && item.price > 0) score += 15;

  // Common bestseller keywords
  const text = `${item.name} ${item.description ?? ""}`.toLowerCase();
  const bestsellerWords = ["classic", "signature", "special", "popular", "best", "original", "house", "famous", "favorite", "deluxe", "premium"];
  if (bestsellerWords.some(w => text.includes(w))) score += 20;

  return Math.min(100, score);
}

// ── Image Quality ──

const PLACEHOLDER_IMAGE_PATTERNS = [
  "placeholder", "default", "generic", "via.placeholder",
  "dummyimage", "placehold.co", "unsplash.com", "images.unsplash.com",
  "lorempixel", "picsum", "stock-photo",
];

function assessImageQuality(url: string | null | undefined): { hasValidImage: boolean; imageQualityScore: number } {
  if (!url) return { hasValidImage: false, imageQualityScore: 0 };
  const lower = url.toLowerCase();
  const isPlaceholder = PLACEHOLDER_IMAGE_PATTERNS.some(p => lower.includes(p));
  const isValid = url.startsWith("http") && !isPlaceholder && url.length > 10;
  return { hasValidImage: isValid, imageQualityScore: isValid ? 70 : 0 };
}

/**
 * Detect and strip duplicate images within a menu.
 * If multiple items share the exact same photo_url, it's fake/scraped data — strip them all.
 */
function deduplicateMenuImages(items: RawMenuItem[]): RawMenuItem[] {
  const imageCounts = new Map<string, number>();
  for (const item of items) {
    if (item.photo_url) {
      const key = item.photo_url.toLowerCase().trim();
      imageCounts.set(key, (imageCounts.get(key) || 0) + 1);
    }
  }
  return items.map(item => {
    if (!item.photo_url) return item;
    const key = item.photo_url.toLowerCase().trim();
    // If same image used by >1 item → strip it (it's not a real per-item photo)
    if ((imageCounts.get(key) || 0) > 1) {
      return { ...item, photo_url: null };
    }
    return item;
  });
}

// ── Main Engine ──

export function processMenuIntelligence(
  rawItems: RawMenuItem[],
  options?: {
    maxBestsellers?: number;
    subcategory?: string;
  }
): SmartMenuResult {
  const maxBestsellers = options?.maxBestsellers ?? 4;

  // Step 0: Strip duplicate images (same photo across multiple items = fake scraped data)
  const cleanedItems = deduplicateMenuImages(rawItems);

  // Step 1: Transform each item
  const smartItems: SmartMenuItem[] = cleanedItems.map(item => {
    const { hasValidImage, imageQualityScore } = assessImageQuality(item.photo_url);
    const bestsellerScore = computeBestsellerScore(item);
    return {
      ...item,
      cleanName: cleanProductTitle(item.name),
      cleanDescription: cleanProductDescription(item.description),
      smartCategory: detectCategory(item),
      sortPriority: 0,
      isAutoBestseller: false,
      bestsellerScore,
      hasValidImage,
      imageQualityScore,
    };
  });

  // Step 2: Pick bestsellers
  const sortedByBestseller = [...smartItems].sort((a, b) => b.bestsellerScore - a.bestsellerScore);
  const bestsellerIds = new Set<string>();
  for (let i = 0; i < Math.min(maxBestsellers, sortedByBestseller.length); i++) {
    if (sortedByBestseller[i].bestsellerScore >= 50) {
      sortedByBestseller[i].isAutoBestseller = true;
      bestsellerIds.add(sortedByBestseller[i].id ?? sortedByBestseller[i].name);
    }
  }

  // Step 3: Group into sections
  const sectionMap = new Map<string, SmartMenuItem[]>();
  
  // Add bestsellers section
  const bestsellers = smartItems.filter(i => i.isAutoBestseller);
  if (bestsellers.length > 0) {
    sectionMap.set("bestsellers", bestsellers);
  }

  // Add regular sections
  for (const item of smartItems) {
    const cat = item.smartCategory;
    if (!sectionMap.has(cat)) sectionMap.set(cat, []);
    sectionMap.get(cat)!.push(item);
  }

  // Step 4: Build sorted sections
  const sections: SmartMenuSection[] = [];
  for (const [key, items] of sectionMap) {
    const pattern = CATEGORY_PATTERNS.find(p => p.key === key) ?? {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      emoji: "📦",
      sortOrder: 5,
    };

    // Sort items within section: bestsellers first, then by price desc
    const sorted = items.sort((a, b) => {
      if (a.isAutoBestseller !== b.isAutoBestseller) return a.isAutoBestseller ? -1 : 1;
      return (b.bestsellerScore ?? 0) - (a.bestsellerScore ?? 0);
    });

    sections.push({
      key: pattern.key,
      label: pattern.label,
      emoji: pattern.emoji,
      items: sorted,
      sortOrder: pattern.sortOrder,
    });
  }

  // Sort sections
  sections.sort((a, b) => a.sortOrder - b.sortOrder);

  // Step 5: Compute quality score
  const withImage = smartItems.filter(i => i.hasValidImage).length;
  const imagesCoverage = smartItems.length ? Math.round((withImage / smartItems.length) * 100) : 0;
  const avgBestseller = smartItems.reduce((s, i) => s + i.bestsellerScore, 0) / (smartItems.length || 1);
  const sectionCount = sections.length;
  const menuQualityScore = Math.min(100, Math.round(
    imagesCoverage * 0.3 +
    Math.min(100, sectionCount * 15) * 0.2 +
    avgBestseller * 0.2 +
    Math.min(100, smartItems.length * 5) * 0.3
  ));

  return {
    sections,
    totalItems: smartItems.length,
    bestsellerCount: bestsellers.length,
    imagesCoverage,
    menuQualityScore,
  };
}
