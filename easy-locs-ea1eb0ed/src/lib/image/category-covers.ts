import { GRADIENT_TONES as G } from "@/config/colors";

const ICON_PATHS: Record<string, string> = {
  building: "M3 21V3h8v4h8v14H3zm2-2h4v-2H5v2zm0-4h4v-2H5v2zm0-4h4V9H5v2zm6 8h4v-2h-4v2zm0-4h4v-2h-4v2zm0-4h4V9h-4v2z",
  house: "M12 3L2 12h3v8h5v-5h4v5h5v-8h3L12 3z",
  hotel: "M2 17h20v2H2v-2zm1-8h18v1H3V9zm3 2h3v4H6v-4zm5 0h3v4h-3v-4zm5 0h3v4h-3v-4zM4 5l8-3 8 3v3H4V5z",
  food: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  coffee: "M2 19h18v2H2v-2zm2-2h14c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2h-1V5H5v3H4c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2zm14-7v5h-2v-5h2zM6 7h8v3H6V7z",
  shop: "M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z",
  car: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  cart: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020.01 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
  wrench: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  medical: "M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z",
  camera: "M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm8-9h-3.17L15 4H9L7.17 6H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z",
  leaf: "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z",
  globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  box: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  gem: "M19 3H5L2 9l10 12L22 9l-3-6zM9.62 8l1.5-3h1.76l1.5 3H9.62zM11 10v6.68L5.44 10H11zm2 0h5.56L13 16.68V10zm6.26-2h-2.65l-1.5-3h2.65l1.5 3zM6.24 5h2.65l-1.5 3H4.74l1.5-3z",
  bed: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2V10c0-2.21-1.79-4-4-4z",
  plane: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  sparkle: "M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z",
  fitness: "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
  droplet: "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z",
  bolt: "M7 2v11h3v9l7-12h-4l4-8z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  buy_apartment: "building", buy_villa: "house", buy_penthouse: "building", buy_townhouse: "house",
  buy_land: "globe", buy_office: "building", rent_apartment: "building", rent_villa: "house",
  rent_office: "building", developer_project: "building", investment: "star",
  hotel: "hotel", resort: "plane", holiday_rental: "house", serviced_apartment: "house",
  shawarma: "food", pizza: "food", sushi: "food", burger: "food", coffee: "coffee",
  bakery: "food", cafe: "coffee", indian: "food", chinese: "food", thai: "food",
  mexican: "food", pasta: "food", healthy: "leaf", breakfast: "food", desserts: "food",
  seafood: "food", lebanese: "food", japanese: "food",
  supermarket: "cart", organic: "leaf", atm: "building", fuel: "bolt",
  pharmacy: "medical", parking: "car",
  taxi: "car", chauffeur: "car", delivery: "box",
  fashion: "gem", electronics: "bolt", cosmetics: "sparkle", home_decor: "house",
  sportswear: "fitness", perfume: "droplet", jewelry: "gem", toys: "star",
  plumbing: "droplet", electrical: "bolt", cleaning: "sparkle", ac_repair: "wrench",
  salon: "sparkle", handyman: "wrench", movers: "box", car_wash: "car",
  pest_control: "shield", laundry: "droplet", fitness: "fitness", tutoring: "star", gym: "fitness",
};

const VERTICAL_ICON_MAP: Record<string, string> = {
  property: "house", stay: "hotel", food: "food", grocery: "cart",
  utility: "wrench", mobility: "car", shops: "shop", services: "wrench",
  healthcare: "medical", experiences: "sparkle",
};

const CATEGORY_THEMES: Record<string, { gradient: string; label: string }> = {
  buy_apartment: { gradient: `135deg, ${G.blue900}, ${G.gray700}`, label: "Apartment" },
  buy_villa: { gradient: `135deg, ${G.blue900}, ${G.green900}`, label: "Villa" },
  buy_penthouse: { gradient: `135deg, ${G.gray900}, ${G.gray700}`, label: "Penthouse" },
  buy_townhouse: { gradient: `135deg, ${G.gray700}, ${G.blue900}`, label: "Townhouse" },
  buy_land: { gradient: `135deg, ${G.gray700}, ${G.green900}`, label: "Land" },
  buy_office: { gradient: `135deg, ${G.blue900}, ${G.gray900}`, label: "Office" },
  rent_apartment: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, label: "Rental" },
  rent_villa: { gradient: `135deg, ${G.blue700}, ${G.green700}`, label: "Villa Rental" },
  rent_office: { gradient: `135deg, ${G.blue700}, ${G.gray700}`, label: "Office Rental" },
  developer_project: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, label: "Off-Plan" },
  investment: { gradient: `135deg, ${G.blue900}, ${G.gray600}`, label: "Investment" },
  hotel: { gradient: `135deg, ${G.purple900}, ${G.purple700}`, label: "Hotel" },
  resort: { gradient: `135deg, ${G.green900}, ${G.green800}`, label: "Resort" },
  holiday_rental: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, label: "Holiday Home" },
  serviced_apartment: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, label: "Serviced Apt" },
  shawarma: { gradient: `135deg, ${G.yellow700}, ${G.orange500}`, label: "Shawarma" },
  pizza: { gradient: `135deg, ${G.red700}, ${G.red500}`, label: "Pizza" },
  sushi: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, label: "Sushi" },
  burger: { gradient: `135deg, ${G.orange800}, ${G.orange700}`, label: "Burger" },
  coffee: { gradient: `135deg, ${G.brown700}, ${G.brown500}`, label: "Coffee" },
  bakery: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Bakery" },
  cafe: { gradient: `135deg, ${G.brown700}, ${G.brown600}`, label: "Café" },
  indian: { gradient: `135deg, ${G.red700}, ${G.yellow700}`, label: "Indian" },
  chinese: { gradient: `135deg, ${G.red700}, ${G.red600}`, label: "Chinese" },
  thai: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Thai" },
  mexican: { gradient: `135deg, ${G.green700}, ${G.orange500}`, label: "Mexican" },
  pasta: { gradient: `135deg, ${G.yellow700}, ${G.orange700}`, label: "Pasta" },
  healthy: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Healthy" },
  breakfast: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Breakfast" },
  desserts: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, label: "Desserts" },
  seafood: { gradient: `135deg, ${G.blue600}, ${G.blue500}`, label: "Seafood" },
  lebanese: { gradient: `135deg, ${G.green700}, ${G.yellow700}`, label: "Lebanese" },
  japanese: { gradient: `135deg, ${G.gray700}, ${G.red700}`, label: "Japanese" },
  supermarket: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Supermarket" },
  organic: { gradient: `135deg, ${G.green700}, ${G.green400}`, label: "Organic" },
  atm: { gradient: `135deg, ${G.blue700}, ${G.blue600}`, label: "ATM" },
  fuel: { gradient: `135deg, ${G.orange700}, ${G.orange500}`, label: "Fuel" },
  pharmacy: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Pharmacy" },
  parking: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Parking" },
  taxi: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Taxi" },
  chauffeur: { gradient: `135deg, ${G.gray900}, ${G.gray700}`, label: "Chauffeur" },
  delivery: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Delivery" },
  fashion: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, label: "Fashion" },
  electronics: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Electronics" },
  cosmetics: { gradient: `135deg, ${G.pink700}, ${G.pink400}`, label: "Cosmetics" },
  home_decor: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Home" },
  sportswear: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Sports" },
  perfume: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, label: "Perfume" },
  jewelry: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Jewelry" },
  toys: { gradient: `135deg, ${G.red700}, ${G.blue400}`, label: "Toys" },
  plumbing: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Plumbing" },
  electrical: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Electrical" },
  cleaning: { gradient: `135deg, ${G.blue600}, ${G.green500}`, label: "Cleaning" },
  ac_repair: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "AC Repair" },
  salon: { gradient: `135deg, ${G.pink700}, ${G.pink500}`, label: "Salon" },
  handyman: { gradient: `135deg, ${G.orange700}, ${G.orange500}`, label: "Handyman" },
  movers: { gradient: `135deg, ${G.gray700}, ${G.gray600}`, label: "Movers" },
  car_wash: { gradient: `135deg, ${G.blue600}, ${G.blue400}`, label: "Car Wash" },
  pest_control: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Pest Control" },
  laundry: { gradient: `135deg, ${G.blue600}, ${G.blue500}`, label: "Laundry" },
  fitness: { gradient: `135deg, ${G.red700}, ${G.red500}`, label: "Fitness" },
  tutoring: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Tutoring" },
  gym: { gradient: `135deg, ${G.red700}, ${G.red500}`, label: "Gym" },
};

const VERTICAL_THEMES: Record<string, { gradient: string; label: string }> = {
  property: { gradient: `135deg, ${G.blue900}, ${G.gray700}`, label: "Property" },
  stay: { gradient: `135deg, ${G.purple900}, ${G.purple700}`, label: "Stay" },
  food: { gradient: `135deg, ${G.yellow700}, ${G.orange500}`, label: "Food" },
  grocery: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Grocery" },
  utility: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Utility" },
  mobility: { gradient: `135deg, ${G.yellow700}, ${G.yellow500}`, label: "Mobility" },
  shops: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, label: "Shop" },
  services: { gradient: `135deg, ${G.blue700}, ${G.blue400}`, label: "Service" },
  healthcare: { gradient: `135deg, ${G.green700}, ${G.green500}`, label: "Healthcare" },
  experiences: { gradient: `135deg, ${G.purple700}, ${G.purple500}`, label: "Experiences" },
};

function getIconPath(subcategory: string): string {
  const iconKey = CATEGORY_ICON_MAP[subcategory] || VERTICAL_ICON_MAP[subcategory] || "star";
  return ICON_PATHS[iconKey] || ICON_PATHS.star;
}

function buildSvg(
  gradient: string,
  iconPath: string,
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

  const iconSize = Math.min(w, h) * 0.12;
  const iconX = (w - iconSize) / 2;
  const iconY = h * 0.30;
  const iconScale = iconSize / 24;

  let labelLine = "";
  if (showLabel) {
    const labelY = h * 0.62;
    const labelSize = Math.min(w, h) * 0.055;
    const subLabelY = labelY + labelSize * 1.4;
    const subSize = Math.min(w, h) * 0.03;
    labelLine = `<text x="${w / 2}" y="${labelY}" font-family="system-ui,-apple-system,sans-serif" font-size="${labelSize}" font-weight="700" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="2">${label.toUpperCase()}</text>
<text x="${w / 2}" y="${subLabelY}" font-family="system-ui,-apple-system,sans-serif" font-size="${subSize}" font-weight="400" fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="3">EASY-LOCS</text>`;
  }

  const patternSize = Math.min(w, h) * 0.06;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
</linearGradient>
<radialGradient id="rg" cx="30%" cy="30%" r="70%">
<stop offset="0%" stop-color="rgba(255,255,255,0.08)"/><stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
</radialGradient>
<pattern id="dots" x="0" y="0" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
<circle cx="${patternSize / 2}" cy="${patternSize / 2}" r="1" fill="rgba(255,255,255,0.06)"/>
</pattern>
<filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#rg)"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<line x1="0" y1="${h * 0.75}" x2="${w}" y2="${h * 0.75}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<g transform="translate(${iconX},${iconY}) scale(${iconScale})" filter="url(#ds)">
<path d="${iconPath}" fill="rgba(255,255,255,0.7)"/>
</g>
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
  const iconPath = getIconPath(subcategory);

  if (!theme) {
    const fallback = VERTICAL_THEMES.services;
    const svg = buildSvg(fallback.gradient, iconPath, subcategory || "Item", w, h, demo, showLabel);
    const uri = toDataUri(svg);
    coverCache.set(cacheKey, uri);
    return uri;
  }

  const svg = buildSvg(theme.gradient, iconPath, theme.label, w, h, demo, showLabel);
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
