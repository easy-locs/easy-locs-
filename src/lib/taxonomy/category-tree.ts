/**
 * CANONICAL CATEGORY TREE — Single Source of Truth
 * ==================================================
 * 10 primary categories → subcategories → architecture type → fulfillment → mobility
 *
 * ALL systems MUST read from this file:
 * - Dashboard cards (smart-home-engine)
 * - Search indexing
 * - Scraping / import pipeline
 * - Onboarding rendering
 * - Fulfillment resolver
 * - Wallet / Orbit / Map / Radar routing
 * - Merchant menu/catalog/calendar structure
 *
 * NO OTHER CATEGORY SOURCE IS ALLOWED.
 */

// ═══════════════════════════════════════════════════════════
//  ARCHITECTURE TYPES
// ═══════════════════════════════════════════════════════════

export type ArchitectureType =
  | "menu"              // food: menu_items, categories, modifiers
  | "catalog"           // grocery/shops: products, stock, filters
  | "catalog_parcel"    // shops with delivery: catalog + parcel dispatch
  | "booking"           // services: service packages, time slots, calendar
  | "medical_catalog"   // pharmacy: regulated catalog + delivery rules
  | "listing"           // property: listing facts, inquiry, visit
  | "calendar_booking"  // travel/stays: room types, nightly rates, calendar
  | "mobility_taxi"     // taxi: pickup/dropoff, fare quote, dispatch
  | "mobility_delivery" // delivery: parcel/food/grocery dispatcher
  ;

export type FulfillmentType =
  | "food_delivery"
  | "grocery_delivery"
  | "parcel_delivery"
  | "taxi"
  | "service_booking"
  | "property_listing"
  | "calendar_booking"
  | "none"
  ;

export type MobilityJobType =
  | "food_delivery"
  | "grocery_delivery"
  | "parcel_delivery"
  | "taxi"
  | null
  ;

export type WalletFlow =
  | "order_payment"     // food/grocery/shops: order → payment → settlement
  | "fare_hold"         // taxi: hold → capture on completion
  | "booking_deposit"   // services/travel: deposit or full prepay
  | "inquiry_only"      // property: no payment, inquiry flow
  | "none"
  ;

export type OrbitContext =
  | "order"             // food/grocery/shops: order-linked chat
  | "job"               // taxi/delivery: job-linked chat
  | "booking"           // services/travel: booking-linked chat
  | "inquiry"           // property: inquiry-linked chat
  | "none"
  ;

export type MapBehavior =
  | "merchant_locations" // show merchant pins
  | "live_tracking"      // show rider/driver live position
  | "listing_pins"       // show property/hotel pins
  | "none"
  ;

// ═══════════════════════════════════════════════════════════
//  SUBCATEGORY DEFINITION
// ═══════════════════════════════════════════════════════════

export interface CategorySubcategory {
  value: string;
  label: string;
  emoji: string;
  /** Cluster grouping within the vertical */
  cluster: string;
  /** Tags for search / discovery */
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════
//  PRIMARY CATEGORY DEFINITION
// ═══════════════════════════════════════════════════════════

export interface PrimaryCategory {
  key: string;
  label: string;
  emoji: string;
  /** Maps to world-class-taxonomy vertical */
  vertical: string;
  /** UI architecture to render */
  architecture: ArchitectureType;
  /** Fulfillment type for dispatch */
  fulfillment: FulfillmentType;
  /** Mobility job_type if applicable */
  mobilityJobType: MobilityJobType;
  /** Wallet flow type */
  walletFlow: WalletFlow;
  /** Orbit context type */
  orbitContext: OrbitContext;
  /** Map rendering behavior */
  mapBehavior: MapBehavior;
  /** Canonical route */
  route: string;
  /** Subtitle for dashboard */
  subtitle: string;
  /** Fulfillment capabilities */
  capabilities: {
    can_delivery: boolean;
    can_pickup: boolean;
    can_schedule: boolean;
    requires_ready_state: boolean;
    requires_parcel_details: boolean;
    requires_calendar: boolean;
    requires_menu: boolean;
    requires_catalog: boolean;
    requires_service_slots: boolean;
    requires_rooms: boolean;
    requires_inventory: boolean;
    supports_tracking: boolean;
  };
  /** Subcategories */
  subcategories: CategorySubcategory[];
}

// ═══════════════════════════════════════════════════════════
//  THE CANONICAL TREE — 10 PRIMARIES
// ═══════════════════════════════════════════════════════════

export const CATEGORY_TREE: PrimaryCategory[] = [
  // ─── 1. FOOD ──────────────────────────────────────────────
  {
    key: "food",
    label: "Food",
    emoji: "🍕",
    vertical: "food",
    architecture: "menu",
    fulfillment: "food_delivery",
    mobilityJobType: "food_delivery",
    walletFlow: "order_payment",
    orbitContext: "order",
    mapBehavior: "merchant_locations",
    route: "/browse/food",
    subtitle: "Order now",
    capabilities: {
      can_delivery: true,
      can_pickup: true,
      can_schedule: true,
      requires_ready_state: true,
      requires_parcel_details: false,
      requires_calendar: false,
      requires_menu: true,
      requires_catalog: false,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: true,
    },
    subcategories: [
      { value: "restaurant", label: "Restaurant", emoji: "🍽️", cluster: "restaurant" },
      { value: "fast_food", label: "Fast Food", emoji: "🍔", cluster: "fast_food" },
      { value: "pizza", label: "Pizza", emoji: "🍕", cluster: "cuisine", tags: ["italian", "delivery"] },
      { value: "burger", label: "Burger", emoji: "🍔", cluster: "fast_food" },
      { value: "fried_chicken", label: "Fried Chicken", emoji: "🍗", cluster: "fast_food" },
      { value: "shawarma", label: "Shawarma", emoji: "🌯", cluster: "fast_food" },
      { value: "sushi", label: "Sushi", emoji: "🍣", cluster: "cuisine" },
      { value: "cafe", label: "Cafe", emoji: "☕", cluster: "cafe" },
      { value: "coffee", label: "Coffee", emoji: "☕", cluster: "cafe" },
      { value: "bakery", label: "Bakery", emoji: "🥐", cluster: "bakery" },
      { value: "desserts", label: "Desserts", emoji: "🍰", cluster: "desserts" },
      { value: "italian", label: "Italian", emoji: "🍝", cluster: "cuisine" },
      { value: "japanese", label: "Japanese", emoji: "🍣", cluster: "cuisine" },
      { value: "indian", label: "Indian", emoji: "🍛", cluster: "cuisine" },
      { value: "chinese", label: "Chinese", emoji: "🥡", cluster: "cuisine" },
      { value: "lebanese", label: "Lebanese", emoji: "🥙", cluster: "cuisine" },
      { value: "arabic", label: "Arabic", emoji: "🧆", cluster: "cuisine" },
      { value: "turkish", label: "Turkish", emoji: "🥘", cluster: "cuisine" },
      { value: "mexican", label: "Mexican", emoji: "🌮", cluster: "cuisine" },
      { value: "thai", label: "Thai", emoji: "🍜", cluster: "cuisine" },
      { value: "korean", label: "Korean", emoji: "🍱", cluster: "cuisine" },
      { value: "seafood", label: "Seafood", emoji: "🦞", cluster: "cuisine" },
      { value: "healthy", label: "Healthy", emoji: "🥗", cluster: "cuisine" },
      { value: "breakfast", label: "Breakfast", emoji: "🍳", cluster: "restaurant" },
      { value: "brunch", label: "Brunch", emoji: "🥂", cluster: "restaurant" },
      { value: "catering", label: "Catering", emoji: "🍴", cluster: "restaurant" },
      { value: "pasta", label: "Pasta", emoji: "🍝", cluster: "cuisine" },
      { value: "asian", label: "Asian Fusion", emoji: "🍜", cluster: "cuisine" },
      { value: "beverages", label: "Beverages", emoji: "🥤", cluster: "cafe" },
    ],
  },

  // ─── 2. GROCERY ───────────────────────────────────────────
  {
    key: "grocery",
    label: "Grocery",
    emoji: "🛒",
    vertical: "grocery",
    architecture: "catalog",
    fulfillment: "grocery_delivery",
    mobilityJobType: "grocery_delivery",
    walletFlow: "order_payment",
    orbitContext: "order",
    mapBehavior: "merchant_locations",
    route: "/browse/grocery",
    subtitle: "Fresh & fast",
    capabilities: {
      can_delivery: true,
      can_pickup: true,
      can_schedule: true,
      requires_ready_state: true,
      requires_parcel_details: false,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: true,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: true,
      supports_tracking: true,
    },
    subcategories: [
      { value: "supermarket", label: "Supermarket", emoji: "🏬", cluster: "market" },
      { value: "mini_mart", label: "Mini Mart", emoji: "🏪", cluster: "market" },
      { value: "organic_store", label: "Organic Store", emoji: "🌿", cluster: "specialty" },
      { value: "fruits_vegetables", label: "Fruits & Vegetables", emoji: "🥬", cluster: "fresh" },
      { value: "butcher", label: "Butcher", emoji: "🥩", cluster: "fresh" },
      { value: "dairy", label: "Dairy", emoji: "🥛", cluster: "specialty" },
      { value: "beverages_store", label: "Beverages", emoji: "🥤", cluster: "specialty" },
      { value: "snacks", label: "Snacks", emoji: "🍿", cluster: "specialty" },
    ],
  },

  // ─── 3. SHOPS ─────────────────────────────────────────────
  {
    key: "shops",
    label: "Shops",
    emoji: "🏪",
    vertical: "shops",
    architecture: "catalog_parcel",
    fulfillment: "parcel_delivery",
    mobilityJobType: "parcel_delivery",
    walletFlow: "order_payment",
    orbitContext: "order",
    mapBehavior: "merchant_locations",
    route: "/browse/retail",
    subtitle: "Browse stores",
    capabilities: {
      can_delivery: true,
      can_pickup: true,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: true,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: true,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: true,
      supports_tracking: true,
    },
    subcategories: [
      // Fashion & Apparel
      { value: "fashion", label: "Fashion", emoji: "👗", cluster: "fashion", tags: ["clothing", "ready-to-wear", "apparel"] },
      { value: "fashion_men", label: "Men's Fashion", emoji: "👔", cluster: "fashion" },
      { value: "fashion_women", label: "Women's Fashion", emoji: "👠", cluster: "fashion" },
      { value: "fashion_kids", label: "Kids' Fashion", emoji: "👶", cluster: "fashion" },
      { value: "sportswear", label: "Sportswear", emoji: "🏃", cluster: "fashion" },
      { value: "shoes", label: "Shoes", emoji: "👟", cluster: "fashion" },
      { value: "bags", label: "Bags & Leather", emoji: "👜", cluster: "fashion" },
      // Beauty & Fragrance
      { value: "perfume", label: "Perfume", emoji: "🧴", cluster: "beauty_retail" },
      { value: "cosmetics", label: "Cosmetics & Skincare", emoji: "💄", cluster: "beauty_retail" },
      { value: "haircare", label: "Haircare", emoji: "💇", cluster: "beauty_retail" },
      // Jewelry & Watches
      { value: "jewelry", label: "Jewelry & Watches", emoji: "💍", cluster: "luxury" },
      { value: "luxury_brands", label: "Luxury Brands", emoji: "✨", cluster: "luxury" },
      // Electronics & Tech
      { value: "electronics", label: "Electronics", emoji: "📱", cluster: "electronics" },
      { value: "phone_accessories", label: "Phone Accessories", emoji: "📲", cluster: "electronics" },
      // Home & Living
      { value: "home_decor", label: "Home Decor", emoji: "🛋️", cluster: "home" },
      { value: "kitchen_accessories", label: "Kitchen Accessories", emoji: "🍳", cluster: "home" },
      { value: "furniture", label: "Furniture", emoji: "🪑", cluster: "home" },
      // Specialty
      { value: "accessories", label: "Accessories", emoji: "🕶️", cluster: "specialty" },
      { value: "optics", label: "Optics & Eyewear", emoji: "👓", cluster: "specialty" },
      { value: "gifts", label: "Gifts", emoji: "🎁", cluster: "specialty" },
      { value: "toys", label: "Toys & Kids", emoji: "🧸", cluster: "specialty" },
      { value: "sports_retail", label: "Sports Equipment", emoji: "⚽", cluster: "specialty" },
      { value: "luggage", label: "Luggage & Travel", emoji: "🧳", cluster: "specialty" },
      { value: "books_stationery", label: "Books & Stationery", emoji: "📚", cluster: "specialty" },
      { value: "pets", label: "Pets", emoji: "🐾", cluster: "specialty" },
      { value: "flowers", label: "Flowers", emoji: "💐", cluster: "specialty" },
      { value: "department_store", label: "Department Store", emoji: "🏬", cluster: "mall" },
    ],
  },

  // ─── 4. SERVICES ──────────────────────────────────────────
  {
    key: "services",
    label: "Services",
    emoji: "🔧",
    vertical: "services",
    architecture: "booking",
    fulfillment: "service_booking",
    mobilityJobType: null,
    walletFlow: "booking_deposit",
    orbitContext: "booking",
    mapBehavior: "merchant_locations",
    route: "/browse/services",
    subtitle: "Near you",
    capabilities: {
      can_delivery: false,
      can_pickup: false,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: false,
      requires_calendar: true,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: true,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: false,
    },
    subcategories: [
      { value: "cleaning", label: "Cleaning", emoji: "🧼", cluster: "home" },
      { value: "laundry", label: "Laundry", emoji: "🧺", cluster: "home" },
      { value: "handyman", label: "Handyman", emoji: "🛠️", cluster: "repair" },
      { value: "plumbing", label: "Plumbing", emoji: "🚰", cluster: "repair" },
      { value: "electrical", label: "Electrical", emoji: "💡", cluster: "repair" },
      { value: "ac_repair", label: "AC Repair", emoji: "❄️", cluster: "repair" },
      { value: "movers", label: "Movers", emoji: "📦", cluster: "home" },
      { value: "pest_control", label: "Pest Control", emoji: "🐜", cluster: "home" },
      { value: "tailoring", label: "Tailoring", emoji: "🧵", cluster: "professional" },
      { value: "printing", label: "Printing", emoji: "🖨️", cluster: "professional" },
      { value: "tutoring", label: "Tutoring", emoji: "📚", cluster: "professional" },
      { value: "legal", label: "Legal", emoji: "⚖️", cluster: "professional" },
      { value: "car_repair", label: "Car Repair", emoji: "🚗", cluster: "repair" },
      { value: "car_wash", label: "Car Wash", emoji: "🚘", cluster: "repair" },
      { value: "mobile_repair", label: "Mobile Repair", emoji: "📱", cluster: "repair" },
    ],
  },

  // ─── 5. PHARMACY ──────────────────────────────────────────
  {
    key: "pharmacy",
    label: "Pharmacy",
    emoji: "💊",
    vertical: "healthcare",
    architecture: "medical_catalog",
    fulfillment: "parcel_delivery",
    mobilityJobType: "parcel_delivery",
    walletFlow: "order_payment",
    orbitContext: "order",
    mapBehavior: "merchant_locations",
    route: "/browse/healthcare?sub=pharmacy",
    subtitle: "Medicines",
    capabilities: {
      can_delivery: true,
      can_pickup: true,
      can_schedule: true,
      requires_ready_state: true,
      requires_parcel_details: false,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: true,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: true,
      supports_tracking: true,
    },
    subcategories: [
      { value: "pharmacy", label: "Pharmacy", emoji: "💊", cluster: "medical" },
      { value: "clinic", label: "Clinic", emoji: "🏥", cluster: "medical" },
      { value: "dentist", label: "Dentist", emoji: "🦷", cluster: "medical" },
      { value: "physio", label: "Physio", emoji: "🩺", cluster: "medical" },
    ],
  },

  // ─── 6. BEAUTY ────────────────────────────────────────────
  {
    key: "beauty",
    label: "Beauty",
    emoji: "💅",
    vertical: "services",
    architecture: "booking",
    fulfillment: "service_booking",
    mobilityJobType: null,
    walletFlow: "booking_deposit",
    orbitContext: "booking",
    mapBehavior: "merchant_locations",
    route: "/browse/services?sub=beauty",
    subtitle: "Salon & spa",
    capabilities: {
      can_delivery: false,
      can_pickup: false,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: false,
      requires_calendar: true,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: true,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: false,
    },
    subcategories: [
      { value: "salon", label: "Salon", emoji: "💇‍♀️", cluster: "beauty" },
      { value: "barber", label: "Barber", emoji: "💈", cluster: "beauty" },
      { value: "spa", label: "Spa", emoji: "🧖", cluster: "beauty" },
      { value: "beauty", label: "Beauty", emoji: "💄", cluster: "beauty" },
    ],
  },

  // ─── 7. TAXI ──────────────────────────────────────────────
  {
    key: "taxi",
    label: "Taxi",
    emoji: "🚕",
    vertical: "mobility",
    architecture: "mobility_taxi",
    fulfillment: "taxi",
    mobilityJobType: "taxi",
    walletFlow: "fare_hold",
    orbitContext: "job",
    mapBehavior: "live_tracking",
    route: "/mobility/taxi",
    subtitle: "Book a ride",
    capabilities: {
      can_delivery: false,
      can_pickup: false,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: false,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: true,
    },
    subcategories: [
      { value: "taxi", label: "Taxi", emoji: "🚕", cluster: "transport" },
      { value: "chauffeur", label: "Chauffeur", emoji: "🚘", cluster: "transport" },
      { value: "car_rental", label: "Car Rental", emoji: "🚗", cluster: "transport" },
    ],
  },

  // ─── 8. DELIVERY ──────────────────────────────────────────
  {
    key: "delivery",
    label: "Delivery",
    emoji: "🚚",
    vertical: "mobility",
    architecture: "mobility_delivery",
    fulfillment: "parcel_delivery",
    mobilityJobType: "parcel_delivery",
    walletFlow: "fare_hold",
    orbitContext: "job",
    mapBehavior: "live_tracking",
    route: "/mobility/delivery",
    subtitle: "Send & track",
    capabilities: {
      can_delivery: true,
      can_pickup: false,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: true,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: true,
    },
    subcategories: [
      { value: "food_delivery", label: "Food Delivery", emoji: "🍕", cluster: "dispatch" },
      { value: "grocery_delivery", label: "Grocery Delivery", emoji: "🛒", cluster: "dispatch" },
      { value: "parcel_delivery", label: "Parcel", emoji: "📦", cluster: "dispatch" },
    ],
  },

  // ─── 9. PROPERTY ──────────────────────────────────────────
  {
    key: "property",
    label: "Property",
    emoji: "🏠",
    vertical: "property",
    architecture: "listing",
    fulfillment: "property_listing",
    mobilityJobType: null,
    walletFlow: "inquiry_only",
    orbitContext: "inquiry",
    mapBehavior: "listing_pins",
    route: "/browse/real_estate",
    subtitle: "Rent & buy",
    capabilities: {
      can_delivery: false,
      can_pickup: false,
      can_schedule: false,
      requires_ready_state: false,
      requires_parcel_details: false,
      requires_calendar: false,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: false,
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: false,
    },
    subcategories: [
      // ── Rent ──
      { value: "rent_apartment", label: "Apartment (Rent)", emoji: "🏢", cluster: "rent", tags: ["rental", "lease"] },
      { value: "rent_villa", label: "Villa (Rent)", emoji: "🏡", cluster: "rent", tags: ["rental", "house"] },
      { value: "rent_studio", label: "Studio (Rent)", emoji: "🛏️", cluster: "rent", tags: ["rental", "compact"] },
      { value: "rent_townhouse", label: "Townhouse (Rent)", emoji: "🏘️", cluster: "rent" },
      { value: "rent_penthouse", label: "Penthouse (Rent)", emoji: "🌆", cluster: "rent" },
      { value: "rent_office", label: "Office (Rent)", emoji: "🏢", cluster: "rent_commercial" },
      { value: "rent_shop", label: "Shop (Rent)", emoji: "🏪", cluster: "rent_commercial" },
      { value: "rent_warehouse", label: "Warehouse (Rent)", emoji: "🏭", cluster: "rent_commercial" },
      { value: "rent_land", label: "Land (Rent)", emoji: "🌍", cluster: "rent_commercial" },
      // ── Sale ──
      { value: "sale_apartment", label: "Apartment (Sale)", emoji: "🏢", cluster: "sale", tags: ["buy", "purchase"] },
      { value: "sale_villa", label: "Villa (Sale)", emoji: "🏡", cluster: "sale", tags: ["buy", "house"] },
      { value: "sale_studio", label: "Studio (Sale)", emoji: "🛏️", cluster: "sale", tags: ["buy", "compact"] },
      { value: "sale_townhouse", label: "Townhouse (Sale)", emoji: "🏘️", cluster: "sale" },
      { value: "sale_penthouse", label: "Penthouse (Sale)", emoji: "🌆", cluster: "sale" },
      { value: "sale_office", label: "Office (Sale)", emoji: "🏢", cluster: "sale_commercial" },
      { value: "sale_shop", label: "Shop (Sale)", emoji: "🏪", cluster: "sale_commercial" },
      { value: "sale_warehouse", label: "Warehouse (Sale)", emoji: "🏭", cluster: "sale_commercial" },
      { value: "sale_land", label: "Land (Sale)", emoji: "🌍", cluster: "sale_commercial" },
      // ── Other ──
      { value: "short_stay", label: "Short Stay", emoji: "🛏️", cluster: "stays" },
      { value: "commercial_space", label: "Commercial Space", emoji: "🏬", cluster: "sale_commercial" },
    ],
  },

  // ─── 10. TRAVEL ───────────────────────────────────────────
  {
    key: "travel",
    label: "Travel",
    emoji: "✈️",
    vertical: "experiences",
    architecture: "calendar_booking",
    fulfillment: "calendar_booking",
    mobilityJobType: null,
    walletFlow: "booking_deposit",
    orbitContext: "booking",
    mapBehavior: "listing_pins",
    route: "/travel",
    subtitle: "Flights & hotels",
    capabilities: {
      can_delivery: false,
      can_pickup: false,
      can_schedule: true,
      requires_ready_state: false,
      requires_parcel_details: false,
      requires_calendar: true,
      requires_menu: false,
      requires_catalog: false,
      requires_service_slots: false,
      requires_rooms: true,
      requires_inventory: false,
      supports_tracking: false,
    },
    subcategories: [
      { value: "hotel", label: "Hotel", emoji: "🏨", cluster: "hospitality" },
      { value: "resort", label: "Resort", emoji: "🏖️", cluster: "hospitality" },
      { value: "serviced_apartment", label: "Serviced Apartment", emoji: "🏢", cluster: "hospitality" },
      { value: "hostel", label: "Hostel", emoji: "🛏️", cluster: "hospitality" },
      { value: "activities", label: "Activities", emoji: "🎯", cluster: "leisure" },
      { value: "events", label: "Events", emoji: "🎫", cluster: "leisure" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
//  LOOKUP HELPERS
// ═══════════════════════════════════════════════════════════

/** Get a primary category by key */
export function getPrimaryCategory(key: string): PrimaryCategory | undefined {
  return CATEGORY_TREE.find(c => c.key === key);
}

/** Get primary category by vertical name */
export function getCategoryByVertical(vertical: string): PrimaryCategory | undefined {
  return CATEGORY_TREE.find(c => c.vertical === vertical);
}

/** Resolve the full category context from a subcategory value */
export function resolveSubcategory(subValue: string): {
  primary: PrimaryCategory;
  subcategory: CategorySubcategory;
} | undefined {
  for (const primary of CATEGORY_TREE) {
    const sub = primary.subcategories.find(s => s.value === subValue);
    if (sub) return { primary, subcategory: sub };
  }
  return undefined;
}

/** Get architecture type for a vertical */
export function getArchitectureForVertical(vertical: string): ArchitectureType {
  const cat = getCategoryByVertical(vertical);
  return cat?.architecture ?? "catalog";
}

/** Get fulfillment type for a vertical */
export function getFulfillmentForVertical(vertical: string): FulfillmentType {
  const cat = getCategoryByVertical(vertical);
  return cat?.fulfillment ?? "none";
}

/** Get mobility job type for a vertical + category */
export function getMobilityJobType(vertical: string, category?: string): MobilityJobType {
  // Exact key match first
  if (category) {
    const byKey = getPrimaryCategory(category);
    if (byKey) return byKey.mobilityJobType;
  }
  const cat = getCategoryByVertical(vertical);
  return cat?.mobilityJobType ?? null;
}

/** Get wallet flow for a vertical */
export function getWalletFlow(vertical: string): WalletFlow {
  const cat = getCategoryByVertical(vertical);
  return cat?.walletFlow ?? "none";
}

/** Get orbit context for a vertical */
export function getOrbitContext(vertical: string): OrbitContext {
  const cat = getCategoryByVertical(vertical);
  return cat?.orbitContext ?? "none";
}

/** Get map behavior for a vertical */
export function getMapBehavior(vertical: string): MapBehavior {
  const cat = getCategoryByVertical(vertical);
  return cat?.mapBehavior ?? "none";
}

/** All primary category keys */
export function getAllPrimaryCategoryKeys(): string[] {
  return CATEGORY_TREE.map(c => c.key);
}

/** All subcategory values across all primaries */
export function getAllSubcategoryValues(): string[] {
  return CATEGORY_TREE.flatMap(c => c.subcategories.map(s => s.value));
}

// ═══════════════════════════════════════════════════════════
//  VEHICLE → JOB TYPE MAPPING
// ═══════════════════════════════════════════════════════════

export const VEHICLE_JOB_ELIGIBILITY: Record<string, MobilityJobType[]> = {
  bicycle:      ["parcel_delivery"],
  moto:         ["food_delivery", "parcel_delivery"],
  car:          ["taxi", "parcel_delivery", "grocery_delivery"],
  car_premium:  ["taxi"],
  car_xl:       ["taxi", "grocery_delivery"],
  van:          ["parcel_delivery", "grocery_delivery"],
};

/** Check if a vehicle type can handle a given job type */
export function isVehicleEligible(vehicleType: string, jobType: MobilityJobType): boolean {
  if (!jobType) return false;
  const allowed = VEHICLE_JOB_ELIGIBILITY[vehicleType];
  if (!allowed) return false;
  return allowed.includes(jobType);
}
