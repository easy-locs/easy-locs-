/**
 * Brand + Service Taxonomy — Canonical visual mapping for map markers.
 * Single source of truth for brand logos, service icons, and category colors.
 */
import { CATEGORY_COLORS } from "@/config/colors";

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
  restaurant: { iconEmoji: "🍽️", iconLabel: "Restaurant", primaryColor: CATEGORY_COLORS.restaurant, fallbackMonogram: "RE", keywords: ["restaurant", "dining", "food"] },
  fast_food: { iconEmoji: "🍔", iconLabel: "Fast Food", primaryColor: CATEGORY_COLORS.fast_food, fallbackMonogram: "FF", keywords: ["fast food", "burger", "frites"] },
  pizza: { iconEmoji: "🍕", iconLabel: "Pizza", primaryColor: CATEGORY_COLORS.pizza, fallbackMonogram: "PZ", keywords: ["pizza", "pizzeria"] },
  cafe: { iconEmoji: "☕", iconLabel: "Café", primaryColor: CATEGORY_COLORS.cafe, fallbackMonogram: "CA", keywords: ["cafe", "coffee", "café"] },
  bakery: { iconEmoji: "🥐", iconLabel: "Bakery", primaryColor: CATEGORY_COLORS.bakery, fallbackMonogram: "BK", keywords: ["bakery", "boulangerie", "patisserie"] },
  bar: { iconEmoji: "🍸", iconLabel: "Bar", primaryColor: CATEGORY_COLORS.bar, fallbackMonogram: "BR", keywords: ["bar", "pub", "lounge"] },
  ice_cream: { iconEmoji: "🍦", iconLabel: "Ice Cream", primaryColor: CATEGORY_COLORS.ice_cream, fallbackMonogram: "IC", keywords: ["ice cream", "glacier", "gelato"] },

  // Services
  plumber: { iconEmoji: "🔧", iconLabel: "Plumber", primaryColor: CATEGORY_COLORS.plumber, fallbackMonogram: "PL", keywords: ["plumber", "plombier", "plumbing", "fuite", "pipe", "canalisation", "plomb"] },
  electrician: { iconEmoji: "⚡", iconLabel: "Electrician", primaryColor: CATEGORY_COLORS.electrician, fallbackMonogram: "EL", keywords: ["electrician", "électricien", "electric", "power", "wiring", "elec", "courant"] },
  locksmith: { iconEmoji: "🔑", iconLabel: "Locksmith", primaryColor: CATEGORY_COLORS.locksmith, fallbackMonogram: "LS", keywords: ["locksmith", "serrurier", "lock", "key"] },
  cleaner: { iconEmoji: "🧹", iconLabel: "Cleaner", primaryColor: CATEGORY_COLORS.cleaner, fallbackMonogram: "CL", keywords: ["cleaner", "cleaning", "ménage", "nettoyage"] },
  barber: { iconEmoji: "✂️", iconLabel: "Barber", primaryColor: CATEGORY_COLORS.barber, fallbackMonogram: "BB", keywords: ["barber", "coiffeur", "coiffure", "haircut", "hairdresser"] },
  beauty_salon: { iconEmoji: "💅", iconLabel: "Beauty", primaryColor: CATEGORY_COLORS.beauty_salon, fallbackMonogram: "BS", keywords: ["beauty", "salon", "esthétique", "spa", "nail"] },
  dentist: { iconEmoji: "🦷", iconLabel: "Dentist", primaryColor: CATEGORY_COLORS.dentist, fallbackMonogram: "DN", keywords: ["dentist", "dentiste", "dental"] },
  doctor: { iconEmoji: "🩺", iconLabel: "Doctor", primaryColor: CATEGORY_COLORS.doctor, fallbackMonogram: "DR", keywords: ["doctor", "médecin", "clinic", "clinique"] },
  pharmacy: { iconEmoji: "💊", iconLabel: "Pharmacy", primaryColor: CATEGORY_COLORS.pharmacy, fallbackMonogram: "PH", keywords: ["pharmacy", "pharmacie", "drugstore", "apotheke"] },
  garage: { iconEmoji: "🔩", iconLabel: "Garage", primaryColor: CATEGORY_COLORS.garage, fallbackMonogram: "GA", keywords: ["garage", "car repair", "mechanic", "mécanicien", "auto repair"] },
  car_wash: { iconEmoji: "🚿", iconLabel: "Car Wash", primaryColor: CATEGORY_COLORS.car_wash, fallbackMonogram: "CW", keywords: ["car wash", "lavage auto", "lavage"] },
  towing: { iconEmoji: "🚛", iconLabel: "Towing", primaryColor: CATEGORY_COLORS.towing, fallbackMonogram: "TW", keywords: ["towing", "dépannage", "remorquage"] },

  // Stay
  hotel: { iconEmoji: "🏨", iconLabel: "Hotel", primaryColor: CATEGORY_COLORS.hotel, fallbackMonogram: "HT", keywords: ["hotel", "hôtel", "inn", "lodge"] },
  hostel: { iconEmoji: "🛏️", iconLabel: "Hostel", primaryColor: CATEGORY_COLORS.hostel, fallbackMonogram: "HS", keywords: ["hostel", "auberge"] },
  resort: { iconEmoji: "🏖️", iconLabel: "Resort", primaryColor: CATEGORY_COLORS.resort, fallbackMonogram: "RS", keywords: ["resort", "resort hotel"] },

  // Utility
  gas_station: { iconEmoji: "⛽", iconLabel: "Gas Station", primaryColor: CATEGORY_COLORS.gas_station, fallbackMonogram: "GS", keywords: ["gas station", "station essence", "fuel", "petrol", "essence", "station service"] },
  atm: { iconEmoji: "🏧", iconLabel: "ATM", primaryColor: CATEGORY_COLORS.atm, fallbackMonogram: "AT", keywords: ["atm", "cash", "distributeur"] },
  supermarket: { iconEmoji: "🛒", iconLabel: "Supermarket", primaryColor: CATEGORY_COLORS.supermarket, fallbackMonogram: "SM", keywords: ["supermarket", "supermarché", "grocery"] },
  convenience: { iconEmoji: "🏪", iconLabel: "Convenience", primaryColor: CATEGORY_COLORS.convenience, fallbackMonogram: "CV", keywords: ["convenience", "épicerie", "dépanneur"] },
  parking: { iconEmoji: "🅿️", iconLabel: "Parking", primaryColor: CATEGORY_COLORS.parking, fallbackMonogram: "PK", keywords: ["parking", "park"] },
  laundry: { iconEmoji: "👕", iconLabel: "Laundry", primaryColor: CATEGORY_COLORS.laundry, fallbackMonogram: "LA", keywords: ["laundry", "laverie", "pressing", "dry cleaning"] },
  school: { iconEmoji: "🏫", iconLabel: "School", primaryColor: CATEGORY_COLORS.school, fallbackMonogram: "SC", keywords: ["school", "école", "education"] },
  bank: { iconEmoji: "🏦", iconLabel: "Bank", primaryColor: CATEGORY_COLORS.bank, fallbackMonogram: "BN", keywords: ["bank", "banque"] },
  post_office: { iconEmoji: "📮", iconLabel: "Post Office", primaryColor: CATEGORY_COLORS.post_office, fallbackMonogram: "PO", keywords: ["post office", "poste", "mail"] },
  hospital: { iconEmoji: "🏥", iconLabel: "Hospital", primaryColor: CATEGORY_COLORS.hospital, fallbackMonogram: "HP", keywords: ["hospital", "hôpital", "emergency"] },

  // Transport
  taxi: { iconEmoji: "🚕", iconLabel: "Taxi", primaryColor: CATEGORY_COLORS.taxi, fallbackMonogram: "TX", keywords: ["taxi", "cab", "vtc"] },
  bus_station: { iconEmoji: "🚌", iconLabel: "Bus", primaryColor: CATEGORY_COLORS.bus_station, fallbackMonogram: "BU", keywords: ["bus", "bus stop"] },

  // Shopping
  clothes: { iconEmoji: "👗", iconLabel: "Clothes", primaryColor: CATEGORY_COLORS.clothes, fallbackMonogram: "CL", keywords: ["clothes", "vêtements", "fashion", "mode"] },
  electronics: { iconEmoji: "📱", iconLabel: "Electronics", primaryColor: CATEGORY_COLORS.electronics, fallbackMonogram: "EE", keywords: ["electronics", "phone", "tech"] },
  jewelry: { iconEmoji: "💎", iconLabel: "Jewelry", primaryColor: CATEGORY_COLORS.jewelry, fallbackMonogram: "JW", keywords: ["jewelry", "bijoux", "jewellery"] },
  furniture: { iconEmoji: "🪑", iconLabel: "Furniture", primaryColor: CATEGORY_COLORS.furniture, fallbackMonogram: "FU", keywords: ["furniture", "meuble", "meubles"] },
  mall: { iconEmoji: "🏬", iconLabel: "Mall", primaryColor: CATEGORY_COLORS.mall, fallbackMonogram: "ML", keywords: ["mall", "shopping center", "centre commercial"] },
  fitness: { iconEmoji: "💪", iconLabel: "Fitness", primaryColor: CATEGORY_COLORS.fitness, fallbackMonogram: "FI", keywords: ["fitness", "gym", "sport"] },
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
