/**
 * CANONICAL CATEGORY TREE — Single Source of Truth
 * ==================================================
 * 14 primary categories → subcategories → architecture type → fulfillment → mobility
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
//  THE CANONICAL TREE — 14 PRIMARIES
// ═══════════════════════════════════════════════════════════

export const CATEGORY_TREE: PrimaryCategory[] = [
  // ─── 1. FOOD ──────────────────────────────────────────────
  {
    key: "food",
    label: "Food",
    emoji: "🍽️",
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
      { value: "restaurant", label: "Restaurant", emoji: "🍴", cluster: "restaurant" },
      { value: "fine_dining", label: "Fine Dining", emoji: "🥂", cluster: "restaurant", tags: ["upscale", "premium", "gourmet"] },
      { value: "casual_dining", label: "Casual Dining", emoji: "🪑", cluster: "restaurant", tags: ["casual", "family dining", "sit-down"] },
      { value: "breakfast", label: "Breakfast", emoji: "🍳", cluster: "restaurant" },
      { value: "brunch", label: "Brunch", emoji: "🥞", cluster: "restaurant" },
      { value: "buffet", label: "Buffet", emoji: "🫕", cluster: "restaurant", tags: ["all you can eat", "buffet", "unlimited"] },
      { value: "steakhouse", label: "Steakhouse", emoji: "🥩", cluster: "restaurant", tags: ["steak", "meat", "premium", "grill"] },
      { value: "catering", label: "Catering", emoji: "🥄", cluster: "restaurant" },
      { value: "food_court", label: "Food Court", emoji: "🏬", cluster: "restaurant", tags: ["food court", "mall food", "multi-vendor"] },
      { value: "cloud_kitchen", label: "Cloud Kitchen", emoji: "🏭", cluster: "restaurant", tags: ["ghost kitchen", "virtual kitchen", "delivery only"] },
      { value: "fast_food", label: "Fast Food", emoji: "🍟", cluster: "fast_food" },
      { value: "burger", label: "Burger", emoji: "🍔", cluster: "fast_food" },
      { value: "fried_chicken", label: "Fried Chicken", emoji: "🍗", cluster: "fast_food" },
      { value: "shawarma", label: "Shawarma", emoji: "🌯", cluster: "fast_food" },
      { value: "food_truck", label: "Food Truck", emoji: "🚐", cluster: "fast_food", tags: ["street food", "mobile", "food truck"] },
      { value: "delivery_takeaway", label: "Delivery & Takeaway", emoji: "📲", cluster: "fast_food", tags: ["takeaway", "takeout", "delivery only"] },
      { value: "pizza", label: "Pizza", emoji: "🍕", cluster: "cuisine", tags: ["italian", "delivery"] },
      { value: "sushi", label: "Sushi", emoji: "🍣", cluster: "cuisine" },
      { value: "italian", label: "Italian", emoji: "🤌", cluster: "cuisine" },
      { value: "japanese", label: "Japanese", emoji: "🍥", cluster: "cuisine" },
      { value: "indian", label: "Indian", emoji: "🍛", cluster: "cuisine" },
      { value: "chinese", label: "Chinese", emoji: "🥡", cluster: "cuisine" },
      { value: "thai", label: "Thai", emoji: "🍜", cluster: "cuisine" },
      { value: "korean", label: "Korean", emoji: "🥢", cluster: "cuisine" },
      { value: "vietnamese", label: "Vietnamese", emoji: "🍲", cluster: "cuisine", tags: ["pho", "banh mi", "spring rolls"] },
      { value: "mexican", label: "Mexican", emoji: "🌮", cluster: "cuisine" },
      { value: "lebanese", label: "Lebanese", emoji: "🥙", cluster: "cuisine" },
      { value: "arabic", label: "Arabic", emoji: "🧆", cluster: "cuisine" },
      { value: "turkish", label: "Turkish", emoji: "🍢", cluster: "cuisine" },
      { value: "persian", label: "Persian", emoji: "🍚", cluster: "cuisine", tags: ["kebab", "tahdig", "iranian", "ghormeh sabzi"] },
      { value: "greek", label: "Greek", emoji: "🫒", cluster: "cuisine", tags: ["gyros", "souvlaki", "mediterranean"] },
      { value: "french", label: "French", emoji: "🥖", cluster: "cuisine", tags: ["croissant", "bistro", "brasserie", "patisserie"] },
      { value: "spanish", label: "Spanish", emoji: "🥘", cluster: "cuisine", tags: ["tapas", "paella", "pintxos"] },
      { value: "african", label: "African", emoji: "🍠", cluster: "cuisine", tags: ["jollof", "fufu", "injera", "west african", "east african"] },
      { value: "ethiopian", label: "Ethiopian", emoji: "🫓", cluster: "cuisine", tags: ["injera", "wot", "tibs"] },
      { value: "moroccan", label: "Moroccan", emoji: "🏺", cluster: "cuisine", tags: ["tagine", "couscous", "harira", "north african"] },
      { value: "caribbean", label: "Caribbean", emoji: "🥥", cluster: "cuisine", tags: ["jerk", "plantain", "roti", "jamaican"] },
      { value: "brazilian", label: "Brazilian", emoji: "🍖", cluster: "cuisine", tags: ["churrasco", "feijoada", "açaí"] },
      { value: "german", label: "German", emoji: "🌭", cluster: "cuisine", tags: ["bratwurst", "schnitzel", "pretzel"] },
      { value: "filipino", label: "Filipino", emoji: "🥭", cluster: "cuisine", tags: ["adobo", "sinigang", "lechon"] },
      { value: "pakistani", label: "Pakistani", emoji: "🌶️", cluster: "cuisine", tags: ["south asian", "biryani", "karahi"] },
      { value: "pasta", label: "Pasta", emoji: "🍝", cluster: "cuisine" },
      { value: "asian", label: "Asian Fusion", emoji: "🥟", cluster: "cuisine" },
      { value: "seafood", label: "Seafood", emoji: "🦐", cluster: "cuisine" },
      { value: "healthy", label: "Healthy", emoji: "🥗", cluster: "cuisine" },
      { value: "vegan", label: "Vegan", emoji: "🌱", cluster: "cuisine", tags: ["plant-based", "vegetarian", "vegan"] },
      { value: "bbq", label: "BBQ & Grill", emoji: "🔥", cluster: "cuisine", tags: ["barbecue", "grilled", "smoke", "ribs"] },
      { value: "cafe", label: "Cafe", emoji: "🫖", cluster: "cafe" },
      { value: "coffee", label: "Coffee", emoji: "☕", cluster: "cafe" },
      { value: "tea_house", label: "Tea House", emoji: "🍵", cluster: "cafe", tags: ["tea", "matcha", "chai", "herbal"] },
      { value: "juice_bar", label: "Juice Bar", emoji: "🧃", cluster: "cafe", tags: ["smoothie", "fresh juice", "acai bowl"] },
      { value: "smoothie_bar", label: "Smoothie Bar", emoji: "🥤", cluster: "cafe", tags: ["smoothie", "acai", "protein shake"] },
      { value: "beverages", label: "Beverages", emoji: "🥛", cluster: "cafe" },
      { value: "bakery", label: "Bakery", emoji: "🥐", cluster: "bakery" },
      { value: "desserts", label: "Desserts", emoji: "🍰", cluster: "desserts" },
      { value: "ice_cream", label: "Ice Cream", emoji: "🍦", cluster: "desserts", tags: ["gelato", "frozen yogurt", "sorbet"] },
      { value: "pastry", label: "Pastry", emoji: "🧁", cluster: "desserts", tags: ["pastry", "macaron", "eclair", "tart"] },
      { value: "chocolate", label: "Chocolate & Confectionery", emoji: "🍫", cluster: "desserts", tags: ["chocolate", "candy", "sweets", "confectionery"] },
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
      { value: "frozen", label: "Frozen", emoji: "🧊", cluster: "specialty", tags: ["frozen food", "ice cream"] },
      { value: "bakery_grocery", label: "Bakery", emoji: "🍞", cluster: "fresh", tags: ["bread", "pastry"] },
      { value: "baby_products", label: "Baby Products", emoji: "🍼", cluster: "specialty", tags: ["baby", "infant", "diapers"] },
      { value: "household", label: "Household", emoji: "🧹", cluster: "specialty", tags: ["cleaning", "detergent"] },
      { value: "personal_care", label: "Personal Care", emoji: "🧴", cluster: "specialty", tags: ["soap", "shampoo", "hygiene"] },
      { value: "pet_food", label: "Pet Food", emoji: "🐾", cluster: "specialty", tags: ["pet", "dog", "cat"] },
      { value: "fish_market", label: "Fish Market", emoji: "🐟", cluster: "fresh", tags: ["seafood", "fish", "shellfish"] },
      { value: "spices", label: "Spices & Herbs", emoji: "🌶️", cluster: "specialty", tags: ["spice", "herbs", "seasoning", "condiments"] },
      { value: "health_food", label: "Health Food", emoji: "🥦", cluster: "specialty", tags: ["health", "diet", "supplement", "protein"] },
      { value: "gourmet", label: "Gourmet & Deli", emoji: "🧀", cluster: "specialty", tags: ["deli", "gourmet", "cheese", "charcuterie", "specialty"] },
      { value: "water_delivery", label: "Water Delivery", emoji: "💧", cluster: "specialty", tags: ["water", "gallon", "bottled"] },
    ],
  },

  // ─── 3. SHOPS ─────────────────────────────────────────────
  {
    key: "shops",
    label: "Shops",
    emoji: "🛍️",
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
      { value: "perfume", label: "Perfume", emoji: "🌸", cluster: "beauty_retail" },
      { value: "cosmetics", label: "Cosmetics & Skincare", emoji: "💄", cluster: "beauty_retail" },
      { value: "haircare", label: "Haircare", emoji: "💇‍♀️", cluster: "beauty_retail" },
      // Jewelry & Watches
      { value: "jewelry", label: "Jewelry & Watches", emoji: "💍", cluster: "luxury" },
      { value: "luxury_brands", label: "Luxury Brands", emoji: "👑", cluster: "luxury" },
      // Electronics & Tech
      { value: "electronics", label: "Electronics", emoji: "📱", cluster: "electronics" },
      { value: "phone_accessories", label: "Phone Accessories", emoji: "🔌", cluster: "electronics" },
      // Home & Living
      { value: "home_decor", label: "Home Decor", emoji: "🛋️", cluster: "home" },
      { value: "kitchen_accessories", label: "Kitchen Accessories", emoji: "🫙", cluster: "home" },
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
      { value: "wholesale", label: "Wholesale", emoji: "📦", cluster: "specialty", tags: ["wholesale", "bulk", "trade", "b2b"] },
      { value: "digital_products", label: "Digital Products", emoji: "💻", cluster: "specialty", tags: ["digital", "software", "ebook", "online", "subscription"] },
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
      { value: "photography", label: "Photography", emoji: "📸", cluster: "professional", tags: ["photo", "portrait", "event"] },
      { value: "accounting", label: "Accounting", emoji: "📊", cluster: "professional", tags: ["tax", "bookkeeping", "finance"] },
      { value: "insurance", label: "Insurance", emoji: "🛡️", cluster: "professional", tags: ["coverage", "policy"] },
      { value: "pet_grooming", label: "Pet Grooming", emoji: "🐩", cluster: "home", tags: ["pet", "dog grooming", "cat grooming"] },
      { value: "gardening", label: "Gardening", emoji: "🌻", cluster: "home", tags: ["garden", "landscaping", "lawn"] },
      { value: "painting", label: "Painting", emoji: "🎨", cluster: "repair", tags: ["wall", "house painting", "decorator"] },
      { value: "interior_design", label: "Interior Design", emoji: "🏠", cluster: "professional", tags: ["design", "decorator", "furnishing"] },
      { value: "key_cutting", label: "Key & Lock", emoji: "🔑", cluster: "repair", tags: ["locksmith", "key", "lock"] },
      { value: "carpentry", label: "Carpentry", emoji: "🪚", cluster: "repair", tags: ["wood", "furniture repair", "carpenter"] },
      { value: "it_support", label: "IT Support", emoji: "💻", cluster: "professional", tags: ["computer", "tech", "network"] },
      { value: "consulting", label: "Consulting", emoji: "📋", cluster: "professional", tags: ["consultant", "advisory", "strategy"] },
      { value: "marketing", label: "Marketing", emoji: "📢", cluster: "professional", tags: ["marketing", "advertising", "digital marketing", "seo"] },
      { value: "hvac", label: "HVAC", emoji: "🌡️", cluster: "repair", tags: ["heating", "ventilation", "air conditioning", "hvac"] },
      { value: "tire_service", label: "Tire Service", emoji: "🛞", cluster: "repair", tags: ["tire", "tyre", "wheel", "alignment"] },
      { value: "technician", label: "Technician", emoji: "🔧", cluster: "repair", tags: ["technician", "repair", "appliance"] },
      { value: "delivery_service", label: "Delivery Service", emoji: "🚚", cluster: "home", tags: ["delivery", "courier", "on-demand"] },
    ],
  },

  // ─── 5. HEALTH & MEDICAL ──────────────────────────────────
  {
    key: "health",
    label: "Health & Medical",
    emoji: "🏥",
    vertical: "healthcare",
    architecture: "medical_catalog",
    fulfillment: "parcel_delivery",
    mobilityJobType: "parcel_delivery",
    walletFlow: "order_payment",
    orbitContext: "order",
    mapBehavior: "merchant_locations",
    route: "/browse/healthcare",
    subtitle: "Health services",
    capabilities: {
      can_delivery: true,
      can_pickup: true,
      can_schedule: true,
      requires_ready_state: true,
      requires_parcel_details: false,
      requires_calendar: true,
      requires_menu: false,
      requires_catalog: true,
      requires_service_slots: true,
      requires_rooms: false,
      requires_inventory: true,
      supports_tracking: true,
    },
    subcategories: [
      { value: "pharmacy", label: "Pharmacy", emoji: "💊", cluster: "medical", tags: ["pharmacy", "medicine", "drugs"] },
      { value: "clinic", label: "Clinic", emoji: "🏥", cluster: "medical", tags: ["clinic", "doctor", "consultation"] },
      { value: "hospital", label: "Hospital", emoji: "🏥", cluster: "medical", tags: ["hospital", "emergency", "inpatient"] },
      { value: "dentist", label: "Dentist", emoji: "🦷", cluster: "medical", tags: ["dental", "dentist", "orthodontics"] },
      { value: "physio", label: "Physiotherapy", emoji: "🩺", cluster: "medical", tags: ["physio", "rehabilitation", "physical therapy"] },
      { value: "veterinary", label: "Veterinary", emoji: "🐾", cluster: "medical", tags: ["vet", "animal", "pet clinic"] },
      { value: "optical", label: "Optical", emoji: "👓", cluster: "medical", tags: ["optical", "eye", "vision", "optician"] },
      { value: "lab", label: "Laboratory", emoji: "🔬", cluster: "medical", tags: ["lab", "blood test", "diagnostic", "analysis"] },
      { value: "mental_health", label: "Mental Health", emoji: "🧠", cluster: "medical", tags: ["psychology", "therapy", "counseling", "psychiatry"] },
      { value: "dermatology", label: "Dermatology", emoji: "🩹", cluster: "medical", tags: ["skin", "dermatologist", "cosmetic"] },
      { value: "pediatrics", label: "Pediatrics", emoji: "👶", cluster: "medical", tags: ["children", "pediatrician", "baby"] },
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
      { value: "nails", label: "Nails", emoji: "💅", cluster: "beauty", tags: ["manicure", "pedicure", "nail art"] },
      { value: "makeup", label: "Makeup Artist", emoji: "👩‍🎨", cluster: "beauty", tags: ["makeup", "bridal", "cosmetics"] },
      { value: "lashes", label: "Lashes & Brows", emoji: "👁️", cluster: "beauty", tags: ["eyelashes", "eyebrows", "extensions"] },
      { value: "tattoo", label: "Tattoo & Piercing", emoji: "🖋️", cluster: "beauty", tags: ["tattoo", "piercing", "body art"] },
      { value: "massage", label: "Massage", emoji: "💆", cluster: "beauty", tags: ["massage", "relaxation", "therapy"] },
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
      { value: "premium", label: "Premium", emoji: "🚙", cluster: "transport", tags: ["luxury", "black", "executive"] },
      { value: "bike", label: "Bike Taxi", emoji: "🏍️", cluster: "transport", tags: ["motorcycle", "two-wheeler"] },
      { value: "scooter", label: "Scooter & E-Bike", emoji: "🛴", cluster: "transport", tags: ["scooter", "e-bike", "electric", "micro-mobility"] },
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
      { value: "courier", label: "Courier", emoji: "📮", cluster: "dispatch", tags: ["courier", "express", "same day"] },
      { value: "freight", label: "Freight & Logistics", emoji: "🚛", cluster: "dispatch", tags: ["freight", "cargo", "logistics", "heavy"] },
    ],
  },

  // ─── 9. PROPERTY (Real Estate — Buy / Rent / New Projects) ──
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
    route: "/property",
    subtitle: "Buy, rent & invest",
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
      // ── Buy ──
      { value: "buy_apartment", label: "Apartment", emoji: "🏢", cluster: "buy", tags: ["buy", "purchase", "sale"] },
      { value: "buy_villa", label: "Villa", emoji: "🏡", cluster: "buy", tags: ["buy", "house"] },
      { value: "buy_townhouse", label: "Townhouse", emoji: "🏘️", cluster: "buy", tags: ["buy"] },
      { value: "buy_penthouse", label: "Penthouse", emoji: "🌆", cluster: "buy", tags: ["buy", "luxury"] },
      { value: "buy_commercial", label: "Commercial", emoji: "🏬", cluster: "buy", tags: ["buy", "investment"] },
      { value: "buy_office", label: "Office", emoji: "🏢", cluster: "buy", tags: ["buy", "commercial"] },
      { value: "buy_shop", label: "Shop", emoji: "🏪", cluster: "buy", tags: ["buy", "retail"] },
      { value: "buy_warehouse", label: "Warehouse", emoji: "🏭", cluster: "buy", tags: ["buy", "industrial"] },
      { value: "buy_land", label: "Land", emoji: "🌍", cluster: "buy", tags: ["buy", "plot"] },
      // ── Rent ──
      { value: "rent_apartment", label: "Apartment", emoji: "🏢", cluster: "rent", tags: ["rental", "lease"] },
      { value: "rent_villa", label: "Villa", emoji: "🏡", cluster: "rent", tags: ["rental", "house"] },
      { value: "rent_townhouse", label: "Townhouse", emoji: "🏘️", cluster: "rent", tags: ["rental"] },
      { value: "rent_penthouse", label: "Penthouse", emoji: "🌆", cluster: "rent", tags: ["rental", "luxury"] },
      { value: "rent_commercial", label: "Commercial", emoji: "🏬", cluster: "rent", tags: ["rental", "commercial"] },
      { value: "rent_office", label: "Office", emoji: "🏢", cluster: "rent_commercial", tags: ["rental"] },
      { value: "rent_shop", label: "Shop", emoji: "🏪", cluster: "rent_commercial", tags: ["rental"] },
      { value: "rent_warehouse", label: "Warehouse", emoji: "🏭", cluster: "rent_commercial", tags: ["rental"] },
      { value: "rent_land", label: "Land", emoji: "🌍", cluster: "rent_commercial", tags: ["rental"] },
      // ── New Projects ──
      { value: "offplan", label: "Off-Plan", emoji: "🏗️", cluster: "new_projects", tags: ["offplan", "new", "investment"] },
      { value: "developer_project", label: "Developer Projects", emoji: "🏙️", cluster: "new_projects", tags: ["developer", "new"] },
      { value: "investment", label: "Investment", emoji: "📈", cluster: "new_projects", tags: ["investment", "roi"] },
      { value: "property_management", label: "Property Management", emoji: "🔑", cluster: "services", tags: ["management", "facility", "concierge"] },
    ],
  },

  // ─── 10. STAY (Hotels / Resorts / Holiday Rentals — Booking) ──
  {
    key: "stay",
    label: "Stay",
    emoji: "🏨",
    vertical: "stay",
    architecture: "calendar_booking",
    fulfillment: "calendar_booking",
    mobilityJobType: null,
    walletFlow: "booking_deposit",
    orbitContext: "booking",
    mapBehavior: "listing_pins",
    route: "/stay",
    subtitle: "Hotels & short stays",
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
      { value: "hotel", label: "Hotel", emoji: "🏨", cluster: "hospitality", tags: ["hotel", "booking", "room"] },
      { value: "resort", label: "Resort", emoji: "🏖️", cluster: "hospitality", tags: ["resort", "vacation"] },
      { value: "boutique", label: "Boutique Hotel", emoji: "🏩", cluster: "hospitality", tags: ["boutique", "design", "luxury"] },
      { value: "hostel", label: "Hostel", emoji: "🛏️", cluster: "hospitality", tags: ["hostel", "budget", "backpacker"] },
      { value: "apartment_hotel", label: "Apartment Hotel", emoji: "🏢", cluster: "hospitality", tags: ["apart-hotel", "extended stay"] },
      { value: "holiday_rental", label: "Holiday Rental", emoji: "🏡", cluster: "hospitality", tags: ["vacation", "rental", "holiday"] },
      { value: "serviced_apartment", label: "Serviced Apartment", emoji: "🏢", cluster: "hospitality", tags: ["serviced", "apartment", "short stay"] },
      { value: "short_stay", label: "Short Stay", emoji: "🛏️", cluster: "hospitality", tags: ["short", "temporary"] },
      { value: "motel", label: "Motel", emoji: "🏨", cluster: "hospitality", tags: ["motel", "roadside", "budget"] },
      { value: "bed_breakfast", label: "Bed & Breakfast", emoji: "🏡", cluster: "hospitality", tags: ["b&b", "bnb", "guesthouse"] },
      { value: "glamping", label: "Glamping", emoji: "⛺", cluster: "hospitality", tags: ["glamping", "camping", "luxury tent", "nature"] },
      { value: "eco_lodge", label: "Eco Lodge", emoji: "🌿", cluster: "hospitality", tags: ["eco", "sustainable", "nature lodge"] },
      { value: "budget_hotel", label: "Budget Hotel", emoji: "🏨", cluster: "hospitality", tags: ["budget", "economy", "cheap", "affordable"] },
      { value: "luxury_hotel", label: "Luxury Hotel", emoji: "🏰", cluster: "hospitality", tags: ["luxury", "5 star", "premium", "five star"] },
      { value: "desert_camp", label: "Desert Camp", emoji: "🏜️", cluster: "hospitality", tags: ["desert", "camp", "bedouin", "safari camp"] },
      { value: "unique_stay", label: "Unique Stay", emoji: "🏡", cluster: "hospitality", tags: ["unique", "treehouse", "houseboat", "igloo", "cave"] },
    ],
  },

  // ─── 11. UTILITY (ATM, Fuel, Parking — Nearby Essential Places) ──
  {
    key: "utility",
    label: "Utility",
    emoji: "🏧",
    vertical: "utility",
    architecture: "listing",
    fulfillment: "none",
    mobilityJobType: null,
    walletFlow: "none",
    orbitContext: "none",
    mapBehavior: "merchant_locations",
    route: "/browse/utility",
    subtitle: "Nearby essentials",
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
      { value: "atm", label: "ATM", emoji: "🏧", cluster: "finance", tags: ["cash", "withdraw", "bank", "money"] },
      { value: "fuel_station", label: "Fuel Station", emoji: "⛽", cluster: "vehicle", tags: ["petrol", "gas", "diesel", "fuel", "essence"] },
      { value: "parking", label: "Parking", emoji: "🅿️", cluster: "vehicle", tags: ["park", "lot", "garage"] },
      { value: "ev_charging", label: "EV Charging", emoji: "🔋", cluster: "vehicle", tags: ["electric", "charge", "ev", "tesla"] },
      { value: "post_office", label: "Post Office", emoji: "📮", cluster: "services", tags: ["mail", "shipping", "postal"] },
      { value: "police_station", label: "Police Station", emoji: "🚔", cluster: "emergency", tags: ["police", "emergency", "security", "gendarmerie"] },
      { value: "poi_hospital", label: "Hospital", emoji: "🏥", cluster: "emergency", tags: ["emergency", "medical", "clinic", "health", "urgences"] },
      { value: "ambulance", label: "Ambulance", emoji: "🚑", cluster: "emergency", tags: ["ambulance", "emergency", "samu", "paramedic", "rescue"] },
      { value: "fire_station", label: "Fire Station", emoji: "🚒", cluster: "emergency", tags: ["fire", "emergency", "rescue", "pompier", "firefighter"] },
      { value: "poi_pharmacy", label: "Pharmacy", emoji: "💊", cluster: "health", tags: ["pharmacy", "medicine", "drugs", "health", "pharmacie"] },
      { value: "poi_veterinary", label: "Veterinary", emoji: "🐾", cluster: "health", tags: ["vet", "veterinary", "animal", "pet", "clinic"] },
      { value: "park", label: "Park", emoji: "🌳", cluster: "leisure", tags: ["park", "garden", "green", "nature", "playground"] },
      { value: "library", label: "Library", emoji: "📚", cluster: "services", tags: ["library", "books", "reading"] },
      { value: "school", label: "School", emoji: "🏫", cluster: "education", tags: ["school", "education", "university"] },
      { value: "mosque", label: "Mosque", emoji: "🕌", cluster: "worship", tags: ["mosque", "prayer", "islamic"] },
      { value: "church", label: "Church", emoji: "⛪", cluster: "worship", tags: ["church", "prayer", "christian"] },
      { value: "temple", label: "Temple", emoji: "🛕", cluster: "worship", tags: ["temple", "prayer", "hindu", "buddhist"] },
      { value: "synagogue", label: "Synagogue", emoji: "🕍", cluster: "worship", tags: ["synagogue", "prayer", "jewish"] },
      { value: "poi_supermarket", label: "Supermarket", emoji: "🛒", cluster: "shopping", tags: ["supermarket", "grocery", "market"] },
      { value: "bank", label: "Bank", emoji: "🏦", cluster: "finance", tags: ["bank", "finance", "account", "banque"] },
      { value: "embassy", label: "Embassy / Consulate", emoji: "🏛️", cluster: "government", tags: ["embassy", "consulate", "visa", "passport", "government"] },
      { value: "courthouse", label: "Courthouse", emoji: "⚖️", cluster: "government", tags: ["court", "justice", "tribunal", "legal"] },
      { value: "public_toilet", label: "Public Toilet", emoji: "🚻", cluster: "services", tags: ["toilet", "restroom", "wc", "bathroom"] },
      { value: "water_fountain", label: "Water Fountain", emoji: "🚰", cluster: "services", tags: ["water", "drinking", "fountain"] },
      { value: "bus_station", label: "Bus Station", emoji: "🚌", cluster: "transport", tags: ["bus", "station", "transit", "public transport"] },
      { value: "train_station", label: "Train Station", emoji: "🚆", cluster: "transport", tags: ["train", "railway", "gare", "metro", "tram"] },
      { value: "airport", label: "Airport", emoji: "✈️", cluster: "transport", tags: ["airport", "flight", "aeroport", "aviation"] },
      { value: "taxi_stand", label: "Taxi Stand", emoji: "🚕", cluster: "transport", tags: ["taxi", "cab", "uber", "vtc"] },
    ],
  },

  // ─── 12. TRAVEL (Flights, Activities, Events) ──
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
    subtitle: "Flights & experiences",
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
      requires_rooms: false,
      requires_inventory: false,
      supports_tracking: false,
    },
    subcategories: [
      { value: "flights", label: "Flights", emoji: "✈️", cluster: "travel" },
      { value: "activities", label: "Activities", emoji: "🎯", cluster: "leisure" },
      { value: "events", label: "Events", emoji: "🎫", cluster: "leisure" },
      { value: "cruise", label: "Cruise", emoji: "🚢", cluster: "travel", tags: ["cruise", "ship", "ocean", "sea"] },
      { value: "safari", label: "Safari", emoji: "🦁", cluster: "leisure", tags: ["safari", "wildlife", "nature", "desert safari"] },
      { value: "diving", label: "Diving & Snorkeling", emoji: "🤿", cluster: "leisure", tags: ["diving", "snorkeling", "scuba", "underwater"] },
      { value: "ski", label: "Ski & Snow", emoji: "⛷️", cluster: "leisure", tags: ["ski", "snowboard", "winter", "mountain"] },
      { value: "museum", label: "Museum", emoji: "🏛️", cluster: "leisure", tags: ["museum", "art", "history", "gallery"] },
      { value: "theme_park", label: "Theme Park", emoji: "🎢", cluster: "leisure", tags: ["amusement", "theme park", "rides"] },
      { value: "concert", label: "Concert & Live", emoji: "🎵", cluster: "leisure", tags: ["concert", "live music", "show", "performance"] },
      { value: "water_sports", label: "Water Sports", emoji: "🏄", cluster: "leisure", tags: ["surfing", "kayak", "jet ski", "sailing"] },
      { value: "hiking", label: "Hiking & Trekking", emoji: "🥾", cluster: "leisure", tags: ["hiking", "trekking", "trail", "mountain"] },
      { value: "city_tour", label: "City Tour", emoji: "🚌", cluster: "travel", tags: ["sightseeing", "guided tour", "bus tour"] },
      { value: "cinema", label: "Cinema", emoji: "🎬", cluster: "leisure", tags: ["cinema", "movie", "film", "theater"] },
      { value: "sports", label: "Sports & Fitness", emoji: "⚽", cluster: "leisure", tags: ["sports", "gym", "fitness", "stadium", "match"] },
      { value: "tourism", label: "Tourism", emoji: "🗺️", cluster: "travel", tags: ["tourism", "travel", "sightseeing", "package"] },
    ],
  },

  // ─── 13. EDUCATION & TRAINING ──────────────────────────────
  {
    key: "education",
    label: "Education",
    emoji: "🎓",
    vertical: "education",
    architecture: "booking",
    fulfillment: "service_booking",
    mobilityJobType: null,
    walletFlow: "booking_deposit",
    orbitContext: "booking",
    mapBehavior: "merchant_locations",
    route: "/browse/education",
    subtitle: "Learn & grow",
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
      { value: "k12_school", label: "K-12 School", emoji: "🏫", cluster: "institution", tags: ["school", "primary", "secondary", "high school"] },
      { value: "university", label: "University", emoji: "🎓", cluster: "institution", tags: ["university", "college", "higher education", "campus"] },
      { value: "courses", label: "Courses & Workshops", emoji: "📚", cluster: "learning", tags: ["course", "workshop", "class", "training"] },
      { value: "coaching", label: "Coaching & Mentoring", emoji: "🎯", cluster: "learning", tags: ["coaching", "mentor", "personal development"] },
      { value: "online_learning", label: "Online Learning", emoji: "💻", cluster: "learning", tags: ["online", "e-learning", "mooc", "remote"] },
      { value: "language_school", label: "Language School", emoji: "🗣️", cluster: "learning", tags: ["language", "english", "french", "arabic"] },
      { value: "driving_school", label: "Driving School", emoji: "🚗", cluster: "learning", tags: ["driving", "license", "permit"] },
      { value: "daycare", label: "Daycare & Nursery", emoji: "👶", cluster: "institution", tags: ["daycare", "nursery", "preschool", "childcare"] },
      { value: "vocational", label: "Vocational Training", emoji: "🔧", cluster: "learning", tags: ["vocational", "technical", "trade school"] },
      { value: "music_school", label: "Music & Arts School", emoji: "🎵", cluster: "learning", tags: ["music", "art", "dance", "creative"] },
    ],
  },

  // ─── 14. FINANCE ───────────────────────────────────────────
  {
    key: "finance",
    label: "Finance",
    emoji: "💳",
    vertical: "finance",
    architecture: "listing",
    fulfillment: "none",
    mobilityJobType: null,
    walletFlow: "order_payment",
    orbitContext: "inquiry",
    mapBehavior: "merchant_locations",
    route: "/browse/finance",
    subtitle: "Money & banking",
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
      supports_tracking: false,
    },
    subcategories: [
      { value: "payments", label: "Payments", emoji: "💳", cluster: "fintech", tags: ["payment", "pay", "transaction", "pos"] },
      { value: "transfers", label: "Transfers", emoji: "💸", cluster: "fintech", tags: ["transfer", "remittance", "send money", "wire"] },
      { value: "banking", label: "Banking", emoji: "🏦", cluster: "banking", tags: ["bank", "account", "savings", "deposit"] },
      { value: "insurance_finance", label: "Insurance", emoji: "🛡️", cluster: "banking", tags: ["insurance", "coverage", "policy", "claim"] },
      { value: "exchange", label: "Currency Exchange", emoji: "💱", cluster: "fintech", tags: ["exchange", "forex", "currency", "money change"] },
      { value: "crypto", label: "Crypto & Web3", emoji: "₿", cluster: "fintech", tags: ["crypto", "bitcoin", "blockchain", "web3", "nft"] },
      { value: "investment_finance", label: "Investment", emoji: "📈", cluster: "banking", tags: ["investment", "stocks", "funds", "portfolio"] },
      { value: "microfinance", label: "Microfinance", emoji: "🤝", cluster: "banking", tags: ["microfinance", "microloan", "lending"] },
    ],
  },

  // ─── 15. CLASSIFIED C2C ────────────────────────────────────
  {
    key: "classified_c2c",
    label: "Annonces Particuliers",
    emoji: "🏷️",
    vertical: "classified_c2c",
    architecture: "listing",
    fulfillment: "none",
    mobilityJobType: null,
    walletFlow: "inquiry_only",
    orbitContext: "inquiry",
    mapBehavior: "listing_pins",
    route: "/marketplace/c2c",
    subtitle: "Vente entre particuliers",
    capabilities: {
      can_delivery: false,
      can_pickup: true,
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
      // Véhicules
      { value: "c2c_car", label: "Voiture", emoji: "🚗", cluster: "classified_c2c", tags: ["voiture", "auto", "véhicule"] },
      { value: "c2c_moto", label: "Moto & Scooter", emoji: "🏍️", cluster: "classified_c2c", tags: ["moto", "scooter", "deux-roues"] },
      { value: "c2c_van", label: "Utilitaire", emoji: "🚐", cluster: "classified_c2c", tags: ["utilitaire", "van", "fourgon"] },
      { value: "c2c_camper", label: "Camping-car", emoji: "🚌", cluster: "classified_c2c", tags: ["camping-car", "caravane"] },
      { value: "c2c_boat", label: "Bateau", emoji: "⛵", cluster: "classified_c2c", tags: ["bateau", "nautique", "jet-ski"] },
      // Électronique
      { value: "c2c_phone", label: "Téléphone", emoji: "📱", cluster: "classified_c2c", tags: ["iphone", "samsung", "smartphone"] },
      { value: "c2c_computer", label: "Ordinateur", emoji: "💻", cluster: "classified_c2c", tags: ["pc", "mac", "laptop"] },
      { value: "c2c_tv", label: "TV & Multimédia", emoji: "📺", cluster: "classified_c2c", tags: ["télévision", "tv", "écran"] },
      { value: "c2c_console", label: "Console de jeu", emoji: "🎮", cluster: "classified_c2c", tags: ["playstation", "xbox", "nintendo"] },
      { value: "c2c_photo", label: "Photo & Caméra", emoji: "📸", cluster: "classified_c2c", tags: ["appareil photo", "caméra", "objectif"] },
      // Mode
      { value: "c2c_clothes", label: "Vêtements", emoji: "👕", cluster: "classified_c2c", tags: ["habit", "vêtement", "tenue"] },
      { value: "c2c_shoes", label: "Chaussures", emoji: "👟", cluster: "classified_c2c", tags: ["chaussures", "baskets", "sandales"] },
      { value: "c2c_bags", label: "Sacs & Maroquinerie", emoji: "👜", cluster: "classified_c2c", tags: ["sac", "maroquinerie", "handbag"] },
      { value: "c2c_jewelry", label: "Bijoux & Montres", emoji: "💍", cluster: "classified_c2c", tags: ["bijou", "montre", "collier"] },
      // Maison
      { value: "c2c_furniture", label: "Meubles", emoji: "🪑", cluster: "classified_c2c", tags: ["meuble", "table", "canapé"] },
      { value: "c2c_appliances", label: "Électroménager", emoji: "🫙", cluster: "classified_c2c", tags: ["réfrigérateur", "lave-linge", "four"] },
      { value: "c2c_decor", label: "Décoration", emoji: "🎀", cluster: "classified_c2c", tags: ["décoration", "tableau", "plante"] },
      { value: "c2c_tools", label: "Bricolage", emoji: "🔧", cluster: "classified_c2c", tags: ["outil", "perceuse", "bricolage"] },
      { value: "c2c_garden", label: "Jardin", emoji: "🌿", cluster: "classified_c2c", tags: ["jardin", "tondeuse", "plante"] },
      // Sports & Loisirs
      { value: "c2c_sport", label: "Sport", emoji: "⚽", cluster: "classified_c2c", tags: ["vélo", "randonnée", "sport"] },
      { value: "c2c_books", label: "Livres & BD", emoji: "📚", cluster: "classified_c2c", tags: ["livre", "roman", "bd"] },
      { value: "c2c_music", label: "Instruments de musique", emoji: "🎸", cluster: "classified_c2c", tags: ["guitare", "piano", "instrument"] },
      { value: "c2c_games", label: "Jeux & Jouets", emoji: "🧸", cluster: "classified_c2c", tags: ["jeu", "jouet", "enfant"] },
      // Divers
      { value: "c2c_pets", label: "Animaux", emoji: "🐾", cluster: "classified_c2c", tags: ["animal", "chien", "chat"] },
      { value: "c2c_baby", label: "Bébé & Enfant", emoji: "👶", cluster: "classified_c2c", tags: ["bébé", "poussette", "jouet"] },
      { value: "c2c_other", label: "Divers", emoji: "📦", cluster: "classified_c2c", tags: ["divers", "autres"] },
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

// ═══════════════════════════════════════════════════════════
//  BACKWARD-COMPAT EXPORTS (replacing category-hierarchy.ts + MarketplaceCategories.ts)
// ═══════════════════════════════════════════════════════════

export type SubCategoryCompat = { value: string; label: string; emoji: string };
export type CategoryGroupCompat = { value: string; label: string; emoji: string; subcategories: SubCategoryCompat[] };

/** CATEGORY_HIERARCHY — flat view grouped by vertical (replaces @/lib/category-hierarchy) */
export const CATEGORY_HIERARCHY: CategoryGroupCompat[] = CATEGORY_TREE.map(c => ({
  value: c.vertical,
  label: c.label,
  emoji: c.emoji,
  subcategories: c.subcategories.map(s => ({ value: s.value, label: s.label, emoji: s.emoji })),
}));

/** getSubcategoryInfo — lookup subcategory by value */
export function getSubcategoryInfo(value: string): SubCategoryCompat | undefined {
  const resolved = resolveSubcategory(value);
  if (!resolved) return undefined;
  return { value: resolved.subcategory.value, label: resolved.subcategory.label, emoji: resolved.subcategory.emoji };
}

/** MARKETPLACE_CATEGORIES — flat list of all subcategories with group (replaces MarketplaceCategories.ts) */
export const MARKETPLACE_CATEGORIES = CATEGORY_TREE.flatMap(primary =>
  primary.subcategories.map(sub => ({
    value: sub.value,
    label: sub.label,
    icon: sub.emoji,
    group: primary.label,
  }))
);

const VERTICAL_FALLBACK_EMOJI: Record<string, string> = {
  food: "🍽️",
  grocery: "🛒",
  shops: "🛍️",
  services: "🔧",
  healthcare: "🏥",
  beauty: "💅",
  property: "🏠",
  travel: "🏨",
  mobility: "🚗",
  experiences: "🎯",
  education: "📚",
  nightlife: "🌙",
  c2c: "🤝",
  delivery: "🚚",
};

/** getCategoryInfo — lookup marketplace category with contextual fallback */
export const getCategoryInfo = (cat: string) => {
  const found = MARKETPLACE_CATEGORIES.find(c => c.value === cat);
  if (found) return found;
  const resolved = resolveSubcategory(cat);
  const fallbackEmoji = resolved
    ? resolved.primary.emoji
    : VERTICAL_FALLBACK_EMOJI[cat] ?? "🍽️";
  return { value: cat, label: cat, icon: fallbackEmoji, group: resolved?.primary.label ?? "Other" };
};
