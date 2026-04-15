import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { GRADIENT_TONES as G } from "@/config/colors";

const _treeEmojis: Record<string, string> = {};
const _verticalEmojis: Record<string, string> = {};
for (const primary of CATEGORY_TREE) {
  _verticalEmojis[primary.vertical] = primary.emoji;
  for (const sub of primary.subcategories) {
    _treeEmojis[sub.value] = sub.emoji;
  }
}

function treeVerticalEmoji(key: string, fallback: string): string {
  return _verticalEmojis[key] ?? fallback;
}

function treeEmoji(key: string, fallback: string): string {
  return _treeEmojis[key] ?? fallback;
}

const CATEGORY_THEMES: Record<string, { gradient: string; emoji: string; label: string }> = {
  buy_apartment: { gradient: `135deg, ${G.blue900}, ${G.gray700}`, emoji: treeEmoji("buy_apartment", "🏢"), label: "Apartment" },
  buy_villa: { gradient: `135deg, ${G.blue900}, ${G.green900}`, emoji: treeEmoji("buy_villa", "🏡"), label: "Villa" },
  buy_penthouse: { gradient: `135deg, ${G.gray900}, ${G.gray700}`, emoji: treeEmoji("buy_penthouse", "🌆"), label: "Penthouse" },
  buy_townhouse: { gradient: `135deg, ${G.gray700}, ${G.blue900}`, emoji: treeEmoji("buy_townhouse", "🏘️"), label: "Townhouse" },
  buy_land: { gradient: `135deg, ${G.gray700}, ${G.green900}`, emoji: treeEmoji("buy_land", "🌍"), label: "Land" },
  buy_office: { gradient: `135deg, ${G.blue900}, ${G.gray900}`, emoji: treeEmoji("buy_office", "🏢"), label: "Office" },
  rent_apartment: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, emoji: treeEmoji("rent_apartment", "🏢"), label: "Rental" },
  rent_villa: { gradient: `135deg, ${G.blue700}, ${G.green700}`, emoji: treeEmoji("rent_villa", "🏡"), label: "Villa Rental" },
  rent_office: { gradient: `135deg, ${G.blue700}, ${G.gray700}`, emoji: treeEmoji("rent_office", "🏢"), label: "Office Rental" },
  developer_project: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, emoji: treeEmoji("developer_project", "🏙️"), label: "Off-Plan" },
  investment: { gradient: `135deg, ${G.blue900}, ${G.gray600}`, emoji: treeEmoji("investment", "📈"), label: "Investment" },
  hotel: { gradient: `135deg, ${G.purple900}, ${G.purple700}`, emoji: treeEmoji("hotel", "🏨"), label: "Hotel" },
  resort: { gradient: `135deg, ${G.green900}, ${G.green800}`, emoji: treeEmoji("resort", "🏖️"), label: "Resort" },
  holiday_rental: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, emoji: treeEmoji("holiday_rental", "🌴"), label: "Holiday Home" },
  serviced_apartment: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, emoji: treeEmoji("serviced_apartment", "🏠"), label: "Serviced Apt" },
  shawarma: { gradient: `135deg, ${G.yellow700}, ${G.orange500}`, emoji: treeEmoji("shawarma", "🌯"), label: "Shawarma" },
  pizza: { gradient: `135deg, ${G.red700}, ${G.red500}`, emoji: treeEmoji("pizza", "🍕"), label: "Pizza" },
  sushi: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, emoji: treeEmoji("sushi", "🍣"), label: "Sushi" },
  burger: { gradient: `135deg, ${G.orange800}, ${G.orange700}`, emoji: treeEmoji("burger", "🍔"), label: "Burger" },
  coffee: { gradient: `135deg, ${G.brown700}, ${G.brown500}`, emoji: treeEmoji("coffee", "☕"), label: "Coffee" },
  bakery: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("bakery", "🥐"), label: "Bakery" },
  cafe: { gradient: `135deg, ${G.brown700}, ${G.brown600}`, emoji: treeEmoji("cafe", "🫖"), label: "Café" },
  indian: { gradient: `135deg, ${G.red700}, ${G.yellow700}`, emoji: treeEmoji("indian", "🍛"), label: "Indian" },
  chinese: { gradient: `135deg, ${G.red700}, ${G.red600}`, emoji: treeEmoji("chinese", "🥡"), label: "Chinese" },
  thai: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeEmoji("thai", "🍜"), label: "Thai" },
  mexican: { gradient: `135deg, ${G.green700}, ${G.orange500}`, emoji: treeEmoji("mexican", "🌮"), label: "Mexican" },
  pasta: { gradient: `135deg, ${G.yellow700}, ${G.orange700}`, emoji: treeEmoji("pasta", "🍝"), label: "Pasta" },
  healthy: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeEmoji("healthy", "🥗"), label: "Healthy" },
  breakfast: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("breakfast", "🍳"), label: "Breakfast" },
  desserts: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, emoji: treeEmoji("desserts", "🍰"), label: "Desserts" },
  seafood: { gradient: `135deg, ${G.blue600}, ${G.blue500}`, emoji: treeEmoji("seafood", "🦐"), label: "Seafood" },
  lebanese: { gradient: `135deg, ${G.green700}, ${G.yellow700}`, emoji: treeEmoji("lebanese", "🥙"), label: "Lebanese" },
  japanese: { gradient: `135deg, ${G.gray700}, ${G.red700}`, emoji: treeEmoji("japanese", "🍥"), label: "Japanese" },
  supermarket: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeEmoji("supermarket", "🏬"), label: "Supermarket" },
  organic: { gradient: `135deg, ${G.green700}, ${G.green400}`, emoji: treeEmoji("organic_store", "🌿"), label: "Organic" },
  atm: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, emoji: treeEmoji("atm", "🏧"), label: "ATM" },
  fuel: { gradient: `135deg, ${G.orange700}, ${G.orange500}`, emoji: treeEmoji("fuel_station", "⛽"), label: "Fuel" },
  pharmacy: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeEmoji("pharmacy", "💊"), label: "Pharmacy" },
  parking: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("parking", "🅿️"), label: "Parking" },
  taxi: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("taxi", "🚕"), label: "Taxi" },
  chauffeur: { gradient: `135deg, ${G.gray900}, ${G.gray700}`, emoji: treeEmoji("chauffeur", "🚘"), label: "Chauffeur" },
  delivery: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("parcel_delivery", "📦"), label: "Delivery" },
  fashion: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, emoji: treeEmoji("fashion", "👗"), label: "Fashion" },
  electronics: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("electronics", "📱"), label: "Electronics" },
  cosmetics: { gradient: `135deg, ${G.pink700}, ${G.pink400}`, emoji: treeEmoji("cosmetics", "💄"), label: "Cosmetics" },
  home_decor: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("home_decor", "🛋️"), label: "Home" },
  sportswear: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("sportswear", "🏃"), label: "Sports" },
  perfume: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, emoji: treeEmoji("perfume", "🌸"), label: "Perfume" },
  jewelry: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("jewelry", "💍"), label: "Jewelry" },
  toys: { gradient: `135deg, ${G.red700}, ${G.blue400}`, emoji: treeEmoji("toys", "🧸"), label: "Toys" },
  plumbing: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("plumbing", "🚰"), label: "Plumbing" },
  electrical: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeEmoji("electrical", "💡"), label: "Electrical" },
  cleaning: { gradient: `135deg, ${G.blue600}, ${G.green500}`, emoji: treeEmoji("cleaning", "🧼"), label: "Cleaning" },
  ac_repair: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("ac_repair", "❄️"), label: "AC Repair" },
  salon: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, emoji: treeEmoji("salon", "💇"), label: "Salon" },
  handyman: { gradient: `135deg, ${G.orange700}, ${G.orange500}`, emoji: treeEmoji("handyman", "🛠️"), label: "Handyman" },
  movers: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, emoji: treeEmoji("movers", "📦"), label: "Movers" },
  car_wash: { gradient: `135deg, ${G.blue600}, ${G.blue400}`, emoji: treeEmoji("car_wash", "🚘"), label: "Car Wash" },
  pest_control: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeEmoji("pest_control", "🐜"), label: "Pest Control" },
  laundry: { gradient: `135deg, ${G.blue600}, ${G.blue500}`, emoji: treeEmoji("laundry", "🧺"), label: "Laundry" },
  fitness: { gradient: `135deg, ${G.red700}, ${G.red500}`, emoji: treeEmoji("sports", "💪"), label: "Fitness" },
  tutoring: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeEmoji("tutoring", "📚"), label: "Tutoring" },
  gym: { gradient: `135deg, ${G.red700}, ${G.red500}`, emoji: treeEmoji("sports", "🏋️"), label: "Gym" },
};

const VERTICAL_THEMES: Record<string, { gradient: string; emoji: string; label: string }> = {
  property: { gradient: `135deg, ${G.blue900}, ${G.gray700}`, emoji: treeVerticalEmoji("property", "🏠"), label: "Property" },
  stay: { gradient: `135deg, ${G.purple900}, ${G.purple700}`, emoji: treeVerticalEmoji("stay", "🏨"), label: "Stay" },
  food: { gradient: `135deg, ${G.yellow700}, ${G.orange500}`, emoji: treeVerticalEmoji("food", "🍽️"), label: "Food" },
  grocery: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeVerticalEmoji("grocery", "🛒"), label: "Grocery" },
  utility: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeVerticalEmoji("utility", "⚙️"), label: "Utility" },
  mobility: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, emoji: treeVerticalEmoji("mobility", "🚗"), label: "Mobility" },
  shops: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, emoji: treeVerticalEmoji("shops", "🛍️"), label: "Shop" },
  services: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, emoji: treeVerticalEmoji("services", "🔧"), label: "Service" },
  healthcare: { gradient: `135deg, ${G.green700}, ${G.green500}`, emoji: treeVerticalEmoji("healthcare", "🏥"), label: "Healthcare" },
  experiences: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, emoji: treeVerticalEmoji("experiences", "✨"), label: "Experiences" },
};

function buildSvg(
  gradient: string,
  emoji: string,
  label: string,
  w: number,
  h: number,
  showDemo: boolean,
  showLabel: boolean = true,
): string {
  const parts = gradient.split(",").map(s => s.trim());
  const angle = parts[0] || "135deg";
  const c1 = parts[1] || "#1a202c";
  const c2 = parts[2] || "#2d3748";

  const angleRad = (parseFloat(angle) * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(angleRad);
  const y1 = 50 - 50 * Math.sin(angleRad);
  const x2 = 50 + 50 * Math.cos(angleRad);
  const y2 = 50 + 50 * Math.sin(angleRad);

  const emojiY = h * 0.42;
  const emojiSize = Math.min(w, h) * 0.2;

  let labelLine = "";
  if (showLabel) {
    const labelY = showDemo ? h * 0.62 : h * 0.65;
    const labelSize = Math.min(w, h) * 0.06;
    labelLine = `<text x="${w / 2}" y="${labelY}" font-family="system-ui,sans-serif" font-size="${labelSize}" font-weight="700" fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="1">${label.toUpperCase()}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="rgba(255,255,255,0.03)"/>
<text x="${w / 2}" y="${emojiY}" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
${labelLine}
</svg>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const coverCache = new Map<string, string>();

export function categoryCover(
  subcategory: string,
  opts?: { w?: number; h?: number; demo?: boolean; showLabel?: boolean },
): string {
  const w = opts?.w ?? 800;
  const h = opts?.h ?? 800;
  const demo = opts?.demo ?? false;
  const showLabel = opts?.showLabel ?? true;
  const cacheKey = `${subcategory}:${w}:${h}:${demo}:${showLabel}`;

  const cached = coverCache.get(cacheKey);
  if (cached) return cached;

  const theme = CATEGORY_THEMES[subcategory] || VERTICAL_THEMES[subcategory];
  if (!theme) {
    const fallback = VERTICAL_THEMES.services;
    const svg = buildSvg(fallback.gradient, fallback.emoji, subcategory || "Item", w, h, demo, showLabel);
    const uri = toDataUri(svg);
    coverCache.set(cacheKey, uri);
    return uri;
  }

  const svg = buildSvg(theme.gradient, theme.emoji, theme.label, w, h, demo, showLabel);
  const uri = toDataUri(svg);
  coverCache.set(cacheKey, uri);
  return uri;
}

export function storyCover(subcategory: string): string {
  return categoryCover(subcategory, { w: 720, h: 1280 });
}

export function bannerCover(subcategory: string): string {
  return categoryCover(subcategory, { w: 800, h: 400 });
}

export function menuItemCover(subcategory: string): string {
  return categoryCover(subcategory, { w: 400, h: 400 });
}

export function roomCover(subcategory: string): string {
  return categoryCover(subcategory, { w: 400, h: 300 });
}

export function heroCover(subcategory: string): string {
  return categoryCover(subcategory, { w: 800, h: 400, showLabel: false });
}

export function taxonomyCovers(subcategory: string): string[] {
  return [categoryCover(subcategory, { w: 800, h: 800 })];
}

export function verticalCovers(vertical: string): string[] {
  return [categoryCover(vertical, { w: 800, h: 800 })];
}
