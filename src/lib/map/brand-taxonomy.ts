/**
 * Brand + Service Taxonomy — Canonical visual mapping for map markers.
 * Single source of truth for brand logos, service icons, and category colors.
 */

// ── SERVICE ICON TOKENS ──
export interface ServiceVisualToken {
  iconEmoji: string;
  iconLabel: string;
  primaryColor: string;
  fallbackMonogram: string;
  keywords: string[];
}

export const SERVICE_TAXONOMY: Record<string, ServiceVisualToken> = {
  // Food
  restaurant: { iconEmoji: "🍽️", iconLabel: "Restaurant", primaryColor: "#f97316", fallbackMonogram: "RE", keywords: ["restaurant", "dining", "food"] },
  fast_food: { iconEmoji: "🍔", iconLabel: "Fast Food", primaryColor: "#f97316", fallbackMonogram: "FF", keywords: ["fast food", "burger", "frites"] },
  pizza: { iconEmoji: "🍕", iconLabel: "Pizza", primaryColor: "#ef4444", fallbackMonogram: "PZ", keywords: ["pizza", "pizzeria"] },
  cafe: { iconEmoji: "☕", iconLabel: "Café", primaryColor: "#92400e", fallbackMonogram: "CA", keywords: ["cafe", "coffee", "café"] },
  bakery: { iconEmoji: "🥐", iconLabel: "Bakery", primaryColor: "#d97706", fallbackMonogram: "BK", keywords: ["bakery", "boulangerie", "patisserie"] },
  bar: { iconEmoji: "🍸", iconLabel: "Bar", primaryColor: "#7c3aed", fallbackMonogram: "BR", keywords: ["bar", "pub", "lounge"] },
  ice_cream: { iconEmoji: "🍦", iconLabel: "Ice Cream", primaryColor: "#ec4899", fallbackMonogram: "IC", keywords: ["ice cream", "glacier", "gelato"] },

  // Services
  plumber: { iconEmoji: "🔧", iconLabel: "Plumber", primaryColor: "#3b82f6", fallbackMonogram: "PL", keywords: ["plumber", "plombier", "plumbing", "fuite", "pipe", "canalisation", "plomb"] },
  electrician: { iconEmoji: "⚡", iconLabel: "Electrician", primaryColor: "#eab308", fallbackMonogram: "EL", keywords: ["electrician", "électricien", "electric", "power", "wiring", "elec", "courant"] },
  locksmith: { iconEmoji: "🔑", iconLabel: "Locksmith", primaryColor: "#6b7280", fallbackMonogram: "LS", keywords: ["locksmith", "serrurier", "lock", "key"] },
  cleaner: { iconEmoji: "🧹", iconLabel: "Cleaner", primaryColor: "#06b6d4", fallbackMonogram: "CL", keywords: ["cleaner", "cleaning", "ménage", "nettoyage"] },
  barber: { iconEmoji: "✂️", iconLabel: "Barber", primaryColor: "#8b5cf6", fallbackMonogram: "BB", keywords: ["barber", "coiffeur", "coiffure", "haircut", "hairdresser"] },
  beauty_salon: { iconEmoji: "💅", iconLabel: "Beauty", primaryColor: "#ec4899", fallbackMonogram: "BS", keywords: ["beauty", "salon", "esthétique", "spa", "nail"] },
  dentist: { iconEmoji: "🦷", iconLabel: "Dentist", primaryColor: "#06b6d4", fallbackMonogram: "DN", keywords: ["dentist", "dentiste", "dental"] },
  doctor: { iconEmoji: "🩺", iconLabel: "Doctor", primaryColor: "#ef4444", fallbackMonogram: "DR", keywords: ["doctor", "médecin", "clinic", "clinique"] },
  pharmacy: { iconEmoji: "💊", iconLabel: "Pharmacy", primaryColor: "#22c55e", fallbackMonogram: "PH", keywords: ["pharmacy", "pharmacie", "drugstore", "apotheke"] },
  garage: { iconEmoji: "🔩", iconLabel: "Garage", primaryColor: "#6b7280", fallbackMonogram: "GA", keywords: ["garage", "car repair", "mechanic", "mécanicien", "auto repair"] },
  car_wash: { iconEmoji: "🚿", iconLabel: "Car Wash", primaryColor: "#3b82f6", fallbackMonogram: "CW", keywords: ["car wash", "lavage auto", "lavage"] },
  towing: { iconEmoji: "🚛", iconLabel: "Towing", primaryColor: "#f97316", fallbackMonogram: "TW", keywords: ["towing", "dépannage", "remorquage"] },

  // Stay
  hotel: { iconEmoji: "🏨", iconLabel: "Hotel", primaryColor: "#3b82f6", fallbackMonogram: "HT", keywords: ["hotel", "hôtel", "inn", "lodge"] },
  hostel: { iconEmoji: "🛏️", iconLabel: "Hostel", primaryColor: "#6366f1", fallbackMonogram: "HS", keywords: ["hostel", "auberge"] },
  resort: { iconEmoji: "🏖️", iconLabel: "Resort", primaryColor: "#0ea5e9", fallbackMonogram: "RS", keywords: ["resort", "resort hotel"] },

  // Utility
  gas_station: { iconEmoji: "⛽", iconLabel: "Gas Station", primaryColor: "#ef4444", fallbackMonogram: "GS", keywords: ["gas station", "station essence", "fuel", "petrol", "essence", "station service"] },
  atm: { iconEmoji: "🏧", iconLabel: "ATM", primaryColor: "#3b82f6", fallbackMonogram: "AT", keywords: ["atm", "cash", "distributeur"] },
  supermarket: { iconEmoji: "🛒", iconLabel: "Supermarket", primaryColor: "#22c55e", fallbackMonogram: "SM", keywords: ["supermarket", "supermarché", "grocery"] },
  convenience: { iconEmoji: "🏪", iconLabel: "Convenience", primaryColor: "#22c55e", fallbackMonogram: "CV", keywords: ["convenience", "épicerie", "dépanneur"] },
  parking: { iconEmoji: "🅿️", iconLabel: "Parking", primaryColor: "#3b82f6", fallbackMonogram: "PK", keywords: ["parking", "park"] },
  laundry: { iconEmoji: "👕", iconLabel: "Laundry", primaryColor: "#06b6d4", fallbackMonogram: "LA", keywords: ["laundry", "laverie", "pressing", "dry cleaning"] },
  school: { iconEmoji: "🏫", iconLabel: "School", primaryColor: "#6366f1", fallbackMonogram: "SC", keywords: ["school", "école", "education"] },
  bank: { iconEmoji: "🏦", iconLabel: "Bank", primaryColor: "#1d4ed8", fallbackMonogram: "BN", keywords: ["bank", "banque"] },
  post_office: { iconEmoji: "📮", iconLabel: "Post Office", primaryColor: "#dc2626", fallbackMonogram: "PO", keywords: ["post office", "poste", "mail"] },
  hospital: { iconEmoji: "🏥", iconLabel: "Hospital", primaryColor: "#ef4444", fallbackMonogram: "HP", keywords: ["hospital", "hôpital", "emergency"] },

  // Transport
  taxi: { iconEmoji: "🚕", iconLabel: "Taxi", primaryColor: "#eab308", fallbackMonogram: "TX", keywords: ["taxi", "cab", "vtc"] },
  bus_station: { iconEmoji: "🚌", iconLabel: "Bus", primaryColor: "#22c55e", fallbackMonogram: "BU", keywords: ["bus", "bus stop"] },

  // Shopping
  clothes: { iconEmoji: "👗", iconLabel: "Clothes", primaryColor: "#ec4899", fallbackMonogram: "CL", keywords: ["clothes", "vêtements", "fashion", "mode"] },
  electronics: { iconEmoji: "📱", iconLabel: "Electronics", primaryColor: "#3b82f6", fallbackMonogram: "EE", keywords: ["electronics", "phone", "tech"] },
  jewelry: { iconEmoji: "💎", iconLabel: "Jewelry", primaryColor: "#d97706", fallbackMonogram: "JW", keywords: ["jewelry", "bijoux", "jewellery"] },
  furniture: { iconEmoji: "🪑", iconLabel: "Furniture", primaryColor: "#92400e", fallbackMonogram: "FU", keywords: ["furniture", "meuble", "meubles"] },
  mall: { iconEmoji: "🏬", iconLabel: "Mall", primaryColor: "#8b5cf6", fallbackMonogram: "ML", keywords: ["mall", "shopping center", "centre commercial"] },
  fitness: { iconEmoji: "💪", iconLabel: "Fitness", primaryColor: "#ef4444", fallbackMonogram: "FI", keywords: ["fitness", "gym", "sport"] },
};

// ── BRAND DATABASE ──
export interface BrandEntry {
  canonicalName: string;
  logoUrl: string | null;
  primaryColor: string;
  aliases: string[];
  category: string;
}

export const BRAND_DATABASE: Record<string, BrandEntry> = {
  mcdonalds: {
    canonicalName: "McDonald's",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/120px-McDonald%27s_Golden_Arches.svg.png",
    primaryColor: "#FFC72C",
    aliases: ["mcdo", "mcdonald", "mcdonalds", "mcd", "mac do", "macdo"],
    category: "fast_food",
  },
  kfc: {
    canonicalName: "KFC",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/KFC_logo.svg/120px-KFC_logo.svg.png",
    primaryColor: "#E4002B",
    aliases: ["kfc", "kentucky", "kentucky fried chicken", "kentucky fried"],
    category: "fast_food",
  },
  burger_king: {
    canonicalName: "Burger King",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/120px-Burger_King_logo_%281999%29.svg.png",
    primaryColor: "#FF8732",
    aliases: ["burger king", "bk", "burgerking"],
    category: "fast_food",
  },
  starbucks: {
    canonicalName: "Starbucks",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/120px-Starbucks_Corporation_Logo_2011.svg.png",
    primaryColor: "#00704A",
    aliases: ["starbucks", "starbuck", "sbux", "star bucks"],
    category: "cafe",
  },
  subway: {
    canonicalName: "Subway",
    logoUrl: null,
    primaryColor: "#008C15",
    aliases: ["subway", "sub way"],
    category: "fast_food",
  },
  dominos: {
    canonicalName: "Domino's",
    logoUrl: null,
    primaryColor: "#006491",
    aliases: ["dominos", "domino", "domino's"],
    category: "pizza",
  },
  pizza_hut: {
    canonicalName: "Pizza Hut",
    logoUrl: null,
    primaryColor: "#EE3A43",
    aliases: ["pizza hut", "pizzahut"],
    category: "pizza",
  },
  albert_heijn: {
    canonicalName: "Albert Heijn",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Albert_Heijn_Logo.svg/120px-Albert_Heijn_Logo.svg.png",
    primaryColor: "#00A0E2",
    aliases: ["albert heijn", "ah", "appie"],
    category: "supermarket",
  },
};

// ── ALIAS LOOKUP (pre-built for O(1) search) ──
const _aliasMap = new Map<string, string>();
for (const [key, brand] of Object.entries(BRAND_DATABASE)) {
  for (const alias of brand.aliases) {
    _aliasMap.set(alias.toLowerCase(), key);
  }
}

const _serviceAliasMap = new Map<string, string>();
for (const [key, svc] of Object.entries(SERVICE_TAXONOMY)) {
  for (const kw of svc.keywords) {
    _serviceAliasMap.set(kw.toLowerCase(), key);
  }
}

// ── RESOLVE BRAND ──
export function resolveBrand(query: string): BrandEntry | null {
  const q = query.toLowerCase().trim();
  const key = _aliasMap.get(q);
  return key ? BRAND_DATABASE[key] : null;
}

// ── RESOLVE SERVICE TYPE ──
export function resolveServiceType(query: string): { key: string; token: ServiceVisualToken } | null {
  const q = query.toLowerCase().trim();
  const key = _serviceAliasMap.get(q);
  if (key) return { key, token: SERVICE_TAXONOMY[key] };
  // Partial match
  for (const [kw, svcKey] of _serviceAliasMap.entries()) {
    if (q.includes(kw) || kw.includes(q)) {
      return { key: svcKey, token: SERVICE_TAXONOMY[svcKey] };
    }
  }
  return null;
}

// ── RESOLVE VISUAL FOR OSM ENTITY ──
export function resolveEntityVisual(entity: {
  name?: string;
  title?: string;
  category?: string;
  type?: string;
  tags?: Record<string, string>;
}): {
  iconType: "brand" | "service" | "category" | "monogram";
  iconEmoji: string;
  primaryColor: string;
  logoUrl: string | null;
  displayName: string;
  monogram: string;
} {
  const name = (entity.name || entity.title || "").trim();
  const nameNorm = name.toLowerCase();

  // 1. Try brand match
  for (const [, brand] of Object.entries(BRAND_DATABASE)) {
    for (const alias of brand.aliases) {
      if (nameNorm.includes(alias)) {
        return {
          iconType: "brand",
          iconEmoji: SERVICE_TAXONOMY[brand.category]?.iconEmoji || "🏪",
          primaryColor: brand.primaryColor,
          logoUrl: brand.logoUrl,
          displayName: brand.canonicalName,
          monogram: brand.canonicalName.slice(0, 2).toUpperCase(),
        };
      }
    }
  }

  // 2. Try OSM tags mapping
  const tags = entity.tags || {};
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const tourism = tags.tourism || "";
  const leisure = tags.leisure || "";

  const osmKey = amenity || shop || tourism || leisure || entity.category || entity.type || "";
  const osmNorm = osmKey.toLowerCase().replace(/_/g, " ");

  // Map OSM amenity/shop to service taxonomy
  const osmMappings: Record<string, string> = {
    restaurant: "restaurant", cafe: "cafe", fast_food: "fast_food", bar: "bar",
    bakery: "bakery", ice_cream: "ice_cream",
    pharmacy: "pharmacy", hospital: "hospital", clinic: "doctor", dentist: "dentist",
    bank: "bank", atm: "atm", fuel: "gas_station",
    car_wash: "car_wash", car_repair: "garage",
    school: "school", kindergarten: "school", post_office: "post_office",
    supermarket: "supermarket", convenience: "convenience",
    greengrocer: "supermarket", butcher: "supermarket",
    clothes: "clothes", shoes: "clothes",
    electronics: "electronics", mobile_phone: "electronics",
    jewelry: "jewelry", books: "mall",
    furniture: "furniture", hardware: "mall",
    mall: "mall", department_store: "mall",
    hairdresser: "barber", beauty: "beauty_salon",
    laundry: "laundry",
    hotel: "hotel",
    fitness_centre: "fitness", gym: "fitness",
  };

  const mappedKey = osmMappings[osmNorm] || osmMappings[osmKey];
  if (mappedKey && SERVICE_TAXONOMY[mappedKey]) {
    const svc = SERVICE_TAXONOMY[mappedKey];
    return {
      iconType: "service",
      iconEmoji: svc.iconEmoji,
      primaryColor: svc.primaryColor,
      logoUrl: null,
      displayName: name || svc.iconLabel,
      monogram: svc.fallbackMonogram,
    };
  }

  // 3. Fallback monogram
  const words = name.split(/\s+/).filter(Boolean);
  const monogram = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase() || "??";

  return {
    iconType: "monogram",
    iconEmoji: "📍",
    primaryColor: "#6b7280",
    logoUrl: null,
    displayName: name || "Unknown",
    monogram,
  };
}

// ── RESOLVE BY CATEGORY STRING ──
export function getCategoryVisual(category: string): ServiceVisualToken {
  return SERVICE_TAXONOMY[category] || SERVICE_TAXONOMY[category.toLowerCase()] || {
    iconEmoji: "📍",
    iconLabel: category,
    primaryColor: "#6b7280",
    fallbackMonogram: category.slice(0, 2).toUpperCase(),
    keywords: [],
  };
}
