import type { MediaFamily, MediaDomain } from "./types";

export const MEDIA_FAMILY_REGISTRY: Record<MediaFamily, { domain: MediaDomain; label: string; keywords: string[] }> = {
  food_pizza: { domain: "food", label: "Pizza", keywords: ["pizza", "margherita", "pepperoni", "calzone"] },
  food_burger: { domain: "food", label: "Burger", keywords: ["burger", "hamburger", "cheeseburger", "patty"] },
  food_shawarma: { domain: "food", label: "Shawarma", keywords: ["shawarma", "kebab", "wrap", "gyro"] },
  food_sushi: { domain: "food", label: "Sushi", keywords: ["sushi", "sashimi", "maki", "roll", "nigiri"] },
  food_dessert: { domain: "food", label: "Dessert", keywords: ["dessert", "cake", "pastry", "ice cream", "sweet"] },
  food_beverage: { domain: "food", label: "Beverage", keywords: ["coffee", "tea", "juice", "smoothie", "drink"] },
  food_general: { domain: "food", label: "Food", keywords: ["food", "meal", "dish", "restaurant", "cafe"] },
  grocery_fruit: { domain: "grocery", label: "Fruit", keywords: ["fruit", "apple", "banana", "orange", "mango", "watermelon"] },
  grocery_vegetable: { domain: "grocery", label: "Vegetable", keywords: ["vegetable", "tomato", "potato", "onion", "carrot"] },
  grocery_snack: { domain: "grocery", label: "Snack", keywords: ["snack", "chips", "chocolate", "candy", "biscuit"] },
  grocery_frozen: { domain: "grocery", label: "Frozen", keywords: ["frozen", "ice", "fries", "nuggets"] },
  grocery_dairy: { domain: "grocery", label: "Dairy", keywords: ["dairy", "milk", "cheese", "yogurt", "butter"] },
  grocery_beverage: { domain: "grocery", label: "Beverage", keywords: ["water", "soda", "cola", "energy drink"] },
  grocery_household: { domain: "grocery", label: "Household", keywords: ["detergent", "cleaner", "tissue", "soap"] },
  grocery_general: { domain: "grocery", label: "Grocery", keywords: ["grocery", "supermarket", "store", "product"] },
  property_buy: { domain: "property", label: "Property Buy", keywords: ["buy", "sale", "purchase", "apartment", "villa", "penthouse"] },
  property_rent: { domain: "property", label: "Property Rent", keywords: ["rent", "lease", "furnished", "unfurnished"] },
  property_project: { domain: "property", label: "Property Project", keywords: ["project", "off-plan", "developer", "investment"] },
  stay_hotel: { domain: "stay", label: "Hotel", keywords: ["hotel", "lobby", "reception", "concierge"] },
  stay_room: { domain: "stay", label: "Room", keywords: ["room", "bed", "suite", "bathroom", "bedroom"] },
  stay_resort: { domain: "stay", label: "Resort", keywords: ["resort", "pool", "beach", "spa"] },
  stay_general: { domain: "stay", label: "Stay", keywords: ["accommodation", "stay", "hostel", "lodge"] },
  utility_atm: { domain: "utility", label: "ATM", keywords: ["atm", "cash", "withdraw", "bank", "machine"] },
  utility_fuel: { domain: "utility", label: "Fuel", keywords: ["fuel", "gas", "petrol", "diesel", "station"] },
  utility_pharmacy: { domain: "utility", label: "Pharmacy", keywords: ["pharmacy", "medicine", "drugstore", "prescription"] },
  utility_parking: { domain: "utility", label: "Parking", keywords: ["parking", "garage", "lot", "valet"] },
  utility_general: { domain: "utility", label: "Utility", keywords: ["utility", "service point"] },
  service_provider: { domain: "service", label: "Service Provider", keywords: ["provider", "technician", "professional"] },
  service_vehicle: { domain: "service", label: "Service Vehicle", keywords: ["van", "truck", "service vehicle"] },
  service_tools: { domain: "service", label: "Tools", keywords: ["tools", "equipment", "wrench", "drill"] },
  service_general: { domain: "service", label: "Service", keywords: ["service", "repair", "fix", "maintenance"] },
  mobility_vehicle: { domain: "mobility", label: "Vehicle", keywords: ["car", "taxi", "vehicle", "sedan", "suv"] },
  mobility_driver: { domain: "mobility", label: "Driver", keywords: ["driver", "chauffeur", "rider"] },
  mobility_general: { domain: "mobility", label: "Mobility", keywords: ["mobility", "transport", "ride"] },
  shops_fashion: { domain: "shops", label: "Fashion", keywords: ["fashion", "clothing", "shoes", "dress", "shirt"] },
  shops_electronics: { domain: "shops", label: "Electronics", keywords: ["electronics", "phone", "laptop", "tablet", "gadget"] },
  shops_general: { domain: "shops", label: "Shops", keywords: ["shop", "store", "retail", "boutique"] },
  beauty_salon: { domain: "beauty", label: "Salon", keywords: ["salon", "hair", "nails", "spa", "beauty"] },
  beauty_general: { domain: "beauty", label: "Beauty", keywords: ["beauty", "cosmetics", "skincare", "makeup"] },
  experiences_general: { domain: "experiences", label: "Experiences", keywords: ["experience", "activity", "event", "tour"] },
  generic_placeholder: { domain: "food", label: "Generic", keywords: [] },
};

const VERTICAL_TO_DOMAIN: Record<string, MediaDomain> = {
  food: "food",
  grocery: "grocery",
  shops: "shops",
  services: "service",
  pharmacy: "utility",
  beauty: "beauty",
  taxi: "mobility",
  delivery: "mobility",
  property: "property",
  stay: "stay",
  utility: "utility",
  experiences: "experiences",
  mobility: "mobility",
};

const VERTICAL_DEFAULT_FAMILY: Record<string, MediaFamily> = {
  food: "food_general",
  grocery: "grocery_general",
  shops: "shops_general",
  services: "service_general",
  pharmacy: "utility_pharmacy",
  beauty: "beauty_general",
  taxi: "mobility_vehicle",
  delivery: "mobility_general",
  property: "property_buy",
  stay: "stay_hotel",
  utility: "utility_general",
  experiences: "experiences_general",
  mobility: "mobility_general",
};

export function getDomainForVertical(vertical: string): MediaDomain {
  return VERTICAL_TO_DOMAIN[vertical] ?? "food";
}

export function getDefaultFamilyForVertical(vertical: string): MediaFamily {
  return VERTICAL_DEFAULT_FAMILY[vertical] ?? "generic_placeholder";
}

export function getFamilyDomain(family: MediaFamily): MediaDomain {
  return MEDIA_FAMILY_REGISTRY[family]?.domain ?? "food";
}

export function isMediaFamilyCompatible(imageFamily: MediaFamily, entityFamily: MediaFamily): boolean {
  if (imageFamily === entityFamily) return true;
  const imgDomain = getFamilyDomain(imageFamily);
  const entDomain = getFamilyDomain(entityFamily);
  return imgDomain === entDomain;
}

export function classifyMediaFamily(entityName: string, vertical: string, subcategory?: string): MediaFamily {
  const text = `${entityName} ${subcategory ?? ""}`.toLowerCase();

  const verticalDomain = getDomainForVertical(vertical);

  const candidates = Object.entries(MEDIA_FAMILY_REGISTRY)
    .filter(([, meta]) => meta.domain === verticalDomain);

  let bestMatch: MediaFamily | null = null;
  let bestScore = 0;

  for (const [family, meta] of candidates) {
    let score = 0;
    for (const kw of meta.keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = family as MediaFamily;
    }
  }

  return bestMatch ?? getDefaultFamilyForVertical(vertical);
}

export function getAllFamiliesForDomain(domain: MediaDomain): MediaFamily[] {
  return Object.entries(MEDIA_FAMILY_REGISTRY)
    .filter(([, meta]) => meta.domain === domain)
    .map(([family]) => family as MediaFamily);
}
