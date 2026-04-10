const CATEGORY_THEMES: Record<string, { gradient: string; emoji: string; label: string }> = {
  buy_apartment: { gradient: "135deg, #1a365d, #2d3748", emoji: "🏢", label: "Apartment" },
  buy_villa: { gradient: "135deg, #1a365d, #234e52", emoji: "🏡", label: "Villa" },
  buy_penthouse: { gradient: "135deg, #1a202c, #2d3748", emoji: "🌇", label: "Penthouse" },
  buy_townhouse: { gradient: "135deg, #2d3748, #1a365d", emoji: "🏘️", label: "Townhouse" },
  buy_land: { gradient: "135deg, #2d3748, #234e52", emoji: "🗺️", label: "Land" },
  buy_office: { gradient: "135deg, #1a365d, #1a202c", emoji: "🏛️", label: "Office" },
  rent_apartment: { gradient: "135deg, #2c5282, #2b6cb0", emoji: "🔑", label: "Rental" },
  rent_villa: { gradient: "135deg, #2c5282, #276749", emoji: "🔑", label: "Villa Rental" },
  rent_office: { gradient: "135deg, #2c5282, #2d3748", emoji: "🏢", label: "Office Rental" },
  developer_project: { gradient: "135deg, #2d3748, #4a5568", emoji: "🏗️", label: "Off-Plan" },
  investment: { gradient: "135deg, #1a365d, #4a5568", emoji: "📈", label: "Investment" },
  hotel: { gradient: "135deg, #44337a, #553c9a", emoji: "🏨", label: "Hotel" },
  resort: { gradient: "135deg, #234e52, #285e61", emoji: "🏖️", label: "Resort" },
  holiday_rental: { gradient: "135deg, #2c5282, #2b6cb0", emoji: "🌴", label: "Holiday Home" },
  serviced_apartment: { gradient: "135deg, #2d3748, #4a5568", emoji: "🏠", label: "Serviced Apt" },
  shawarma: { gradient: "135deg, #b7791f, #dd6b20", emoji: "🌯", label: "Shawarma" },
  pizza: { gradient: "135deg, #c53030, #e53e3e", emoji: "🍕", label: "Pizza" },
  sushi: { gradient: "135deg, #2d3748, #4a5568", emoji: "🍣", label: "Sushi" },
  burger: { gradient: "135deg, #9c4221, #c05621", emoji: "🍔", label: "Burger" },
  coffee: { gradient: "135deg, #5d4037, #795548", emoji: "☕", label: "Coffee" },
  bakery: { gradient: "135deg, #b7791f, #d69e2e", emoji: "🥐", label: "Bakery" },
  cafe: { gradient: "135deg, #5d4037, #6d4c41", emoji: "☕", label: "Café" },
  indian: { gradient: "135deg, #c53030, #b7791f", emoji: "🍛", label: "Indian" },
  chinese: { gradient: "135deg, #c53030, #9b2c2c", emoji: "🥡", label: "Chinese" },
  thai: { gradient: "135deg, #276749, #38a169", emoji: "🍜", label: "Thai" },
  mexican: { gradient: "135deg, #276749, #dd6b20", emoji: "🌮", label: "Mexican" },
  pasta: { gradient: "135deg, #b7791f, #c05621", emoji: "🍝", label: "Pasta" },
  healthy: { gradient: "135deg, #276749, #38a169", emoji: "🥗", label: "Healthy" },
  breakfast: { gradient: "135deg, #b7791f, #d69e2e", emoji: "🥞", label: "Breakfast" },
  desserts: { gradient: "135deg, #b83280, #d53f8c", emoji: "🍰", label: "Desserts" },
  seafood: { gradient: "135deg, #2b6cb0, #3182ce", emoji: "🦐", label: "Seafood" },
  lebanese: { gradient: "135deg, #276749, #b7791f", emoji: "🧆", label: "Lebanese" },
  japanese: { gradient: "135deg, #2d3748, #c53030", emoji: "🎌", label: "Japanese" },
  supermarket: { gradient: "135deg, #276749, #38a169", emoji: "🛒", label: "Supermarket" },
  organic: { gradient: "135deg, #276749, #48bb78", emoji: "🥬", label: "Organic" },
  atm: { gradient: "135deg, #2c5282, #2b6cb0", emoji: "🏧", label: "ATM" },
  fuel: { gradient: "135deg, #c05621, #dd6b20", emoji: "⛽", label: "Fuel" },
  pharmacy: { gradient: "135deg, #276749, #38a169", emoji: "💊", label: "Pharmacy" },
  parking: { gradient: "135deg, #2c5282, #4299e1", emoji: "🅿️", label: "Parking" },
  taxi: { gradient: "135deg, #b7791f, #d69e2e", emoji: "🚕", label: "Taxi" },
  chauffeur: { gradient: "135deg, #1a202c, #2d3748", emoji: "🚘", label: "Chauffeur" },
  delivery: { gradient: "135deg, #2c5282, #4299e1", emoji: "📦", label: "Delivery" },
  fashion: { gradient: "135deg, #b83280, #d53f8c", emoji: "👗", label: "Fashion" },
  electronics: { gradient: "135deg, #2c5282, #4299e1", emoji: "📱", label: "Electronics" },
  cosmetics: { gradient: "135deg, #b83280, #ed64a6", emoji: "💄", label: "Cosmetics" },
  home_decor: { gradient: "135deg, #b7791f, #d69e2e", emoji: "🛋️", label: "Home" },
  sportswear: { gradient: "135deg, #2c5282, #4299e1", emoji: "👟", label: "Sports" },
  perfume: { gradient: "135deg, #553c9a, #805ad5", emoji: "🌸", label: "Perfume" },
  jewelry: { gradient: "135deg, #b7791f, #d69e2e", emoji: "💎", label: "Jewelry" },
  toys: { gradient: "135deg, #c53030, #4299e1", emoji: "🧸", label: "Toys" },
  plumbing: { gradient: "135deg, #2c5282, #4299e1", emoji: "🔧", label: "Plumbing" },
  electrical: { gradient: "135deg, #b7791f, #d69e2e", emoji: "⚡", label: "Electrical" },
  cleaning: { gradient: "135deg, #2b6cb0, #38a169", emoji: "🧹", label: "Cleaning" },
  ac_repair: { gradient: "135deg, #2c5282, #4299e1", emoji: "❄️", label: "AC Repair" },
  salon: { gradient: "135deg, #b83280, #d53f8c", emoji: "💇", label: "Salon" },
  handyman: { gradient: "135deg, #c05621, #dd6b20", emoji: "🔨", label: "Handyman" },
  movers: { gradient: "135deg, #2d3748, #4a5568", emoji: "🚚", label: "Movers" },
  car_wash: { gradient: "135deg, #2b6cb0, #4299e1", emoji: "🚗", label: "Car Wash" },
  pest_control: { gradient: "135deg, #276749, #38a169", emoji: "🐛", label: "Pest Control" },
  laundry: { gradient: "135deg, #2b6cb0, #3182ce", emoji: "👔", label: "Laundry" },
  fitness: { gradient: "135deg, #c53030, #e53e3e", emoji: "💪", label: "Fitness" },
  tutoring: { gradient: "135deg, #2c5282, #4299e1", emoji: "📚", label: "Tutoring" },
  gym: { gradient: "135deg, #c53030, #e53e3e", emoji: "🏋️", label: "Gym" },
};

const VERTICAL_THEMES: Record<string, { gradient: string; emoji: string; label: string }> = {
  property: { gradient: "135deg, #1a365d, #2d3748", emoji: "🏠", label: "Property" },
  stay: { gradient: "135deg, #44337a, #553c9a", emoji: "🏨", label: "Stay" },
  food: { gradient: "135deg, #b7791f, #dd6b20", emoji: "🍽️", label: "Food" },
  grocery: { gradient: "135deg, #276749, #38a169", emoji: "🛒", label: "Grocery" },
  utility: { gradient: "135deg, #2c5282, #4299e1", emoji: "⚙️", label: "Utility" },
  mobility: { gradient: "135deg, #b7791f, #d69e2e", emoji: "🚗", label: "Mobility" },
  shops: { gradient: "135deg, #553c9a, #805ad5", emoji: "🛍️", label: "Shop" },
  services: { gradient: "135deg, #2c5282, #4299e1", emoji: "🔧", label: "Service" },
  healthcare: { gradient: "135deg, #276749, #38a169", emoji: "🏥", label: "Healthcare" },
  experiences: { gradient: "135deg, #553c9a, #805ad5", emoji: "✨", label: "Experiences" },
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
