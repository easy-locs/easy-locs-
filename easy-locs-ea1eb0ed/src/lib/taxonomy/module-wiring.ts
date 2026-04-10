/**
 * MODULE WIRING — Canonical end-to-end mapping between taxonomy verticals and the 5 pillars.
 * ========================================================================================
 * Every vertical (food, services, stay, health, education, finance…) knows exactly:
 *   - How it appears on DASHBOARD (shortcuts, recents, actions)
 *   - How it is discovered on RADAR (filters, map, sort)
 *   - How it is contacted via ORBIT (thread types, entity links)
 *   - How it is paid via WALLET (payment flows, tips, deposits)
 *   - How it is stored in ME (history, favorites, preferences)
 *
 * NO module may invent its own local taxonomy. All behavior derives from HERE + category-tree.ts.
 */

import { CATEGORY_TREE, type PrimaryCategory } from "./category-tree";

export type VerticalKey =
  | "food" | "grocery" | "shops" | "services" | "beauty"
  | "health" | "taxi" | "delivery" | "property" | "stay"
  | "travel" | "utility" | "education" | "finance";

export interface DashboardWiring {
  shortcuts: string[];
  recentItemType: string;
  activeItemType: string | null;
  quickActions: { icon: string; label: string; route: string }[];
  showPromotions: boolean;
  showRecommendations: boolean;
  showActiveOrders: boolean;
  showUpcomingBookings: boolean;
  previewWidget: "orders" | "bookings" | "listings" | "appointments" | "courses" | "transactions" | "none";
}

export interface RadarWiring {
  discoveryMode: "proximity" | "search" | "map" | "calendar" | "listing";
  entityType: string;
  primaryFilters: string[];
  mapPinType: "merchant" | "listing" | "poi" | "vehicle" | "event" | "none";
  showAvailability: boolean;
  showPricing: boolean;
  showRating: boolean;
  showDistance: boolean;
  showETA: boolean;
  defaultSortBy: string;
  radarCategory: string;
}

export interface OrbitWiring {
  threadTypes: string[];
  contactLabel: string;
  entityLink: "order" | "booking" | "job" | "inquiry" | "listing" | "enrollment" | "transaction" | "none";
  supportsGroupThread: boolean;
  supportsAttachments: boolean;
  supportsLocation: boolean;
  supportsMeta: boolean;
}

export interface WalletWiring {
  paymentFlow: string;
  supportsTips: boolean;
  supportsDeposit: boolean;
  supportsRefund: boolean;
  supportsInstallment: boolean;
  supportsSubscription: boolean;
  billingType: "per_order" | "per_booking" | "per_ride" | "per_listing" | "per_enrollment" | "per_transaction" | "none";
  currencyAware: boolean;
}

export interface MeWiring {
  historyType: string;
  favoritesType: string;
  preferencesKeys: string[];
  documentsType: string | null;
  addressRelevance: "delivery" | "intervention" | "visit" | "travel" | "billing" | "none";
  showInProfile: boolean;
}

export interface ModuleWiring {
  vertical: VerticalKey;
  label: string;
  emoji: string;
  dashboard: DashboardWiring;
  radar: RadarWiring;
  orbit: OrbitWiring;
  wallet: WalletWiring;
  me: MeWiring;
}

export const MODULE_WIRING: Record<VerticalKey, ModuleWiring> = {
  food: {
    vertical: "food",
    label: "Food & Beverage",
    emoji: "🍕",
    dashboard: {
      shortcuts: ["pizza", "burger", "sushi", "cafe", "fast_food"],
      recentItemType: "restaurant",
      activeItemType: "order",
      quickActions: [
        { icon: "🍕", label: "Order food", route: "/browse/food" },
        { icon: "🔄", label: "Reorder", route: "/orders?reorder=true" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: true,
      showUpcomingBookings: false,
      previewWidget: "orders",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "restaurant",
      primaryFilters: ["cuisine", "price", "rating", "delivery_time", "distance", "dietary"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: true,
      defaultSortBy: "eta",
      radarCategory: "food",
    },
    orbit: {
      threadTypes: ["order_support", "restaurant_contact", "delivery_issue", "special_request"],
      contactLabel: "Contact restaurant",
      entityLink: "order",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "order_payment",
      supportsTips: true,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_order",
      currencyAware: true,
    },
    me: {
      historyType: "orders",
      favoritesType: "restaurants",
      preferencesKeys: ["dietary", "cuisine_preferences", "delivery_addresses", "default_tip"],
      documentsType: null,
      addressRelevance: "delivery",
      showInProfile: true,
    },
  },

  grocery: {
    vertical: "grocery",
    label: "Grocery",
    emoji: "🛒",
    dashboard: {
      shortcuts: ["supermarket", "mini_mart", "organic_store", "fruits_vegetables"],
      recentItemType: "store",
      activeItemType: "order",
      quickActions: [
        { icon: "🛒", label: "Grocery", route: "/browse/grocery" },
        { icon: "🔄", label: "Reorder", route: "/orders?reorder=true&type=grocery" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: true,
      showUpcomingBookings: false,
      previewWidget: "orders",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "store",
      primaryFilters: ["category", "availability", "price", "distance"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: true,
      defaultSortBy: "eta",
      radarCategory: "grocery",
    },
    orbit: {
      threadTypes: ["order_support", "store_contact", "product_question"],
      contactLabel: "Contact store",
      entityLink: "order",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "order_payment",
      supportsTips: true,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_order",
      currencyAware: true,
    },
    me: {
      historyType: "orders",
      favoritesType: "stores",
      preferencesKeys: ["grocery_lists", "delivery_addresses", "product_preferences"],
      documentsType: null,
      addressRelevance: "delivery",
      showInProfile: true,
    },
  },

  shops: {
    vertical: "shops",
    label: "Shopping & Marketplace",
    emoji: "🛍️",
    dashboard: {
      shortcuts: ["fashion", "electronics", "jewelry", "home_decor"],
      recentItemType: "shop",
      activeItemType: "order",
      quickActions: [
        { icon: "🛍️", label: "Shop", route: "/browse/shops" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: true,
      showUpcomingBookings: false,
      previewWidget: "orders",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "shop",
      primaryFilters: ["category", "price", "rating", "distance", "in_stock"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "distance",
      radarCategory: "shops",
    },
    orbit: {
      threadTypes: ["order_support", "product_question", "return_request"],
      contactLabel: "Contact shop",
      entityLink: "order",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: false,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "order_payment",
      supportsTips: false,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: false,
      billingType: "per_order",
      currencyAware: true,
    },
    me: {
      historyType: "purchases",
      favoritesType: "shops",
      preferencesKeys: ["size_preferences", "style_preferences", "wishlist"],
      documentsType: null,
      addressRelevance: "delivery",
      showInProfile: true,
    },
  },

  services: {
    vertical: "services",
    label: "Services",
    emoji: "🔧",
    dashboard: {
      shortcuts: ["cleaning", "plumbing", "electrical", "handyman", "ac_repair"],
      recentItemType: "provider",
      activeItemType: "booking",
      quickActions: [
        { icon: "🔧", label: "Book service", route: "/browse/services" },
        { icon: "🚨", label: "Urgent", route: "/browse/services?urgent=true" },
      ],
      showPromotions: false,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "appointments",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "provider",
      primaryFilters: ["service_type", "availability", "rating", "price", "distance"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "availability",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["quote_request", "availability_check", "booking_support", "aftercare"],
      contactLabel: "Contact provider",
      entityLink: "booking",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: true,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: false,
      billingType: "per_booking",
      currencyAware: true,
    },
    me: {
      historyType: "services",
      favoritesType: "providers",
      preferencesKeys: ["intervention_addresses", "preferred_providers", "service_notes"],
      documentsType: null,
      addressRelevance: "intervention",
      showInProfile: true,
    },
  },

  beauty: {
    vertical: "beauty",
    label: "Beauty & Wellness",
    emoji: "💅",
    dashboard: {
      shortcuts: ["salon", "barber", "spa", "nails", "massage"],
      recentItemType: "salon",
      activeItemType: "booking",
      quickActions: [
        { icon: "💅", label: "Book beauty", route: "/browse/beauty" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "appointments",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "salon",
      primaryFilters: ["service_type", "availability", "rating", "price", "distance"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "rating",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["booking_support", "availability_check", "special_request"],
      contactLabel: "Contact salon",
      entityLink: "booking",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: false,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: true,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_booking",
      currencyAware: true,
    },
    me: {
      historyType: "appointments",
      favoritesType: "salons",
      preferencesKeys: ["preferred_stylists", "service_preferences"],
      documentsType: null,
      addressRelevance: "none",
      showInProfile: true,
    },
  },

  health: {
    vertical: "health",
    label: "Health & Medical",
    emoji: "🏥",
    dashboard: {
      shortcuts: ["pharmacy", "clinic", "dentist", "hospital", "optical"],
      recentItemType: "provider",
      activeItemType: "booking",
      quickActions: [
        { icon: "🏥", label: "Health", route: "/browse/healthcare" },
        { icon: "💊", label: "Pharmacy", route: "/radar?category=utility&subcategory=poi_pharmacy" },
      ],
      showPromotions: false,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "appointments",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "health_provider",
      primaryFilters: ["specialty", "availability", "distance", "rating", "insurance"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "distance",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["appointment_confirm", "medical_inquiry", "prescription_support"],
      contactLabel: "Contact clinic",
      entityLink: "booking",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: false,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: false,
      billingType: "per_booking",
      currencyAware: true,
    },
    me: {
      historyType: "appointments",
      favoritesType: "providers",
      preferencesKeys: ["insurance_info", "medical_preferences", "emergency_contacts"],
      documentsType: "medical_records",
      addressRelevance: "none",
      showInProfile: true,
    },
  },

  taxi: {
    vertical: "taxi",
    label: "Transport & Mobility",
    emoji: "🚕",
    dashboard: {
      shortcuts: ["taxi", "chauffeur", "car_rental", "premium"],
      recentItemType: "destination",
      activeItemType: "ride",
      quickActions: [
        { icon: "🚕", label: "Book ride", route: "/mobility/taxi" },
        { icon: "📍", label: "Frequent", route: "/mobility/taxi?frequent=true" },
      ],
      showPromotions: true,
      showRecommendations: false,
      showActiveOrders: true,
      showUpcomingBookings: false,
      previewWidget: "orders",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "driver",
      primaryFilters: ["vehicle_type", "price", "eta"],
      mapPinType: "vehicle",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: false,
      showETA: true,
      defaultSortBy: "eta",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["ride_support", "driver_contact", "lost_item"],
      contactLabel: "Contact driver",
      entityLink: "job",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "fare_hold",
      supportsTips: true,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_ride",
      currencyAware: true,
    },
    me: {
      historyType: "rides",
      favoritesType: "destinations",
      preferencesKeys: ["home_address", "work_address", "vehicle_preference", "payment_method"],
      documentsType: null,
      addressRelevance: "delivery",
      showInProfile: true,
    },
  },

  delivery: {
    vertical: "delivery",
    label: "Delivery & Logistics",
    emoji: "📦",
    dashboard: {
      shortcuts: ["food_delivery", "grocery_delivery", "parcel_delivery", "courier"],
      recentItemType: "delivery",
      activeItemType: "delivery",
      quickActions: [
        { icon: "📦", label: "Send package", route: "/mobility/delivery" },
      ],
      showPromotions: false,
      showRecommendations: false,
      showActiveOrders: true,
      showUpcomingBookings: false,
      previewWidget: "orders",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "courier",
      primaryFilters: ["package_size", "speed", "price"],
      mapPinType: "vehicle",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: true,
      defaultSortBy: "eta",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["delivery_tracking", "courier_contact", "pickup_issue"],
      contactLabel: "Contact courier",
      entityLink: "job",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "order_payment",
      supportsTips: true,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_order",
      currencyAware: true,
    },
    me: {
      historyType: "deliveries",
      favoritesType: "addresses",
      preferencesKeys: ["pickup_addresses", "delivery_addresses"],
      documentsType: null,
      addressRelevance: "delivery",
      showInProfile: false,
    },
  },

  property: {
    vertical: "property",
    label: "Real Estate",
    emoji: "🏠",
    dashboard: {
      shortcuts: ["rent", "sale", "villa", "apartment", "commercial_lease"],
      recentItemType: "listing",
      activeItemType: "inquiry",
      quickActions: [
        { icon: "🏠", label: "Find property", route: "/browse/property" },
      ],
      showPromotions: false,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "listings",
    },
    radar: {
      discoveryMode: "listing",
      entityType: "listing",
      primaryFilters: ["type", "price", "bedrooms", "area", "neighborhood", "amenities"],
      mapPinType: "listing",
      showAvailability: true,
      showPricing: true,
      showRating: false,
      showDistance: true,
      showETA: false,
      defaultSortBy: "price",
      radarCategory: "property",
    },
    orbit: {
      threadTypes: ["property_inquiry", "visit_schedule", "agent_contact", "document_request"],
      contactLabel: "Contact agent",
      entityLink: "inquiry",
      supportsGroupThread: true,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "inquiry_only",
      supportsTips: false,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: false,
      billingType: "per_listing",
      currencyAware: true,
    },
    me: {
      historyType: "searches",
      favoritesType: "properties",
      preferencesKeys: ["search_alerts", "budget_range", "preferred_areas", "property_type"],
      documentsType: "contracts",
      addressRelevance: "visit",
      showInProfile: true,
    },
  },

  stay: {
    vertical: "stay",
    label: "Hotel & Accommodation",
    emoji: "🏨",
    dashboard: {
      shortcuts: ["hotel", "resort", "boutique", "hostel", "apartment_hotel"],
      recentItemType: "hotel",
      activeItemType: "booking",
      quickActions: [
        { icon: "🏨", label: "Book stay", route: "/browse/stay" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "bookings",
    },
    radar: {
      discoveryMode: "calendar",
      entityType: "accommodation",
      primaryFilters: ["dates", "guests", "price", "stars", "amenities", "zone"],
      mapPinType: "listing",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "price",
      radarCategory: "property",
    },
    orbit: {
      threadTypes: ["booking_support", "hotel_contact", "special_request", "concierge"],
      contactLabel: "Contact hotel",
      entityLink: "booking",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: false,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: false,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: false,
      billingType: "per_booking",
      currencyAware: true,
    },
    me: {
      historyType: "bookings",
      favoritesType: "hotels",
      preferencesKeys: ["traveler_profiles", "room_preferences", "loyalty_programs"],
      documentsType: "travel_docs",
      addressRelevance: "travel",
      showInProfile: true,
    },
  },

  travel: {
    vertical: "travel",
    label: "Entertainment & Activities",
    emoji: "✈️",
    dashboard: {
      shortcuts: ["cruise", "safari", "museum", "theme_park", "concert"],
      recentItemType: "activity",
      activeItemType: "booking",
      quickActions: [
        { icon: "✈️", label: "Explore", route: "/browse/travel" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "bookings",
    },
    radar: {
      discoveryMode: "search",
      entityType: "activity",
      primaryFilters: ["type", "date", "price", "rating", "distance"],
      mapPinType: "event",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "rating",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["booking_support", "organizer_contact", "activity_question"],
      contactLabel: "Contact organizer",
      entityLink: "booking",
      supportsGroupThread: true,
      supportsAttachments: true,
      supportsLocation: true,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: false,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "per_booking",
      currencyAware: true,
    },
    me: {
      historyType: "activities",
      favoritesType: "experiences",
      preferencesKeys: ["activity_interests", "travel_style", "group_size"],
      documentsType: "tickets",
      addressRelevance: "travel",
      showInProfile: true,
    },
  },

  utility: {
    vertical: "utility",
    label: "Utility & Essential Places",
    emoji: "🏧",
    dashboard: {
      shortcuts: ["atm", "fuel_station", "parking", "poi_pharmacy", "poi_hospital"],
      recentItemType: "poi",
      activeItemType: null,
      quickActions: [
        { icon: "🏧", label: "Nearby", route: "/radar?category=utility" },
      ],
      showPromotions: false,
      showRecommendations: false,
      showActiveOrders: false,
      showUpcomingBookings: false,
      previewWidget: "none",
    },
    radar: {
      discoveryMode: "map",
      entityType: "poi",
      primaryFilters: ["type", "distance", "open_now"],
      mapPinType: "poi",
      showAvailability: true,
      showPricing: false,
      showRating: false,
      showDistance: true,
      showETA: false,
      defaultSortBy: "distance",
      radarCategory: "utility",
    },
    orbit: {
      threadTypes: [],
      contactLabel: "Contact",
      entityLink: "none",
      supportsGroupThread: false,
      supportsAttachments: false,
      supportsLocation: true,
      supportsMeta: false,
    },
    wallet: {
      paymentFlow: "none",
      supportsTips: false,
      supportsDeposit: false,
      supportsRefund: false,
      supportsInstallment: false,
      supportsSubscription: false,
      billingType: "none",
      currencyAware: false,
    },
    me: {
      historyType: "visits",
      favoritesType: "places",
      preferencesKeys: [],
      documentsType: null,
      addressRelevance: "none",
      showInProfile: false,
    },
  },

  education: {
    vertical: "education",
    label: "Education & Training",
    emoji: "🎓",
    dashboard: {
      shortcuts: ["courses", "language_school", "driving_school", "university"],
      recentItemType: "institution",
      activeItemType: "enrollment",
      quickActions: [
        { icon: "🎓", label: "Learn", route: "/browse/education" },
      ],
      showPromotions: true,
      showRecommendations: true,
      showActiveOrders: false,
      showUpcomingBookings: true,
      previewWidget: "courses",
    },
    radar: {
      discoveryMode: "search",
      entityType: "institution",
      primaryFilters: ["type", "subject", "level", "price", "rating", "distance", "online"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: true,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "rating",
      radarCategory: "services",
    },
    orbit: {
      threadTypes: ["enrollment_support", "instructor_contact", "course_question", "schedule_change"],
      contactLabel: "Contact school",
      entityLink: "enrollment",
      supportsGroupThread: true,
      supportsAttachments: true,
      supportsLocation: false,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "booking_deposit",
      supportsTips: false,
      supportsDeposit: true,
      supportsRefund: true,
      supportsInstallment: true,
      supportsSubscription: true,
      billingType: "per_enrollment",
      currencyAware: true,
    },
    me: {
      historyType: "enrollments",
      favoritesType: "courses",
      preferencesKeys: ["learning_interests", "skill_level", "certifications", "schedule_preference"],
      documentsType: "certificates",
      addressRelevance: "none",
      showInProfile: true,
    },
  },

  finance: {
    vertical: "finance",
    label: "Finance & Wallet",
    emoji: "💳",
    dashboard: {
      shortcuts: ["payments", "transfers", "banking", "exchange"],
      recentItemType: "transaction",
      activeItemType: "transaction",
      quickActions: [
        { icon: "💳", label: "Pay", route: "/wallet" },
        { icon: "💸", label: "Transfer", route: "/wallet/transfer" },
      ],
      showPromotions: true,
      showRecommendations: false,
      showActiveOrders: false,
      showUpcomingBookings: false,
      previewWidget: "transactions",
    },
    radar: {
      discoveryMode: "proximity",
      entityType: "financial_service",
      primaryFilters: ["type", "distance", "service"],
      mapPinType: "merchant",
      showAvailability: true,
      showPricing: false,
      showRating: true,
      showDistance: true,
      showETA: false,
      defaultSortBy: "distance",
      radarCategory: "utility",
    },
    orbit: {
      threadTypes: ["transaction_support", "bank_contact", "dispute"],
      contactLabel: "Contact service",
      entityLink: "transaction",
      supportsGroupThread: false,
      supportsAttachments: true,
      supportsLocation: false,
      supportsMeta: true,
    },
    wallet: {
      paymentFlow: "order_payment",
      supportsTips: false,
      supportsDeposit: false,
      supportsRefund: true,
      supportsInstallment: false,
      supportsSubscription: true,
      billingType: "per_transaction",
      currencyAware: true,
    },
    me: {
      historyType: "transactions",
      favoritesType: "services",
      preferencesKeys: ["default_currency", "payment_methods", "security_settings", "kyc_status"],
      documentsType: "financial_docs",
      addressRelevance: "billing",
      showInProfile: true,
    },
  },
};

export function getModuleWiring(vertical: VerticalKey): ModuleWiring {
  return MODULE_WIRING[vertical];
}

export function getDashboardWiring(vertical: VerticalKey): DashboardWiring {
  return MODULE_WIRING[vertical].dashboard;
}

export function getRadarWiring(vertical: VerticalKey): RadarWiring {
  return MODULE_WIRING[vertical].radar;
}

export function getOrbitWiring(vertical: VerticalKey): OrbitWiring {
  return MODULE_WIRING[vertical].orbit;
}

export function getWalletWiring(vertical: VerticalKey): WalletWiring {
  return MODULE_WIRING[vertical].wallet;
}

export function getMeWiring(vertical: VerticalKey): MeWiring {
  return MODULE_WIRING[vertical].me;
}

export function getVerticalForCategoryKey(categoryKey: string): VerticalKey | null {
  const primary = CATEGORY_TREE.find(c => c.key === categoryKey);
  if (!primary) return null;
  const keyMap: Record<string, VerticalKey> = {
    food: "food",
    grocery: "grocery",
    shops: "shops",
    services: "services",
    beauty: "beauty",
    health: "health",
    pharmacy: "health",
    taxi: "taxi",
    delivery: "delivery",
    property: "property",
    stay: "stay",
    travel: "travel",
    utility: "utility",
    education: "education",
    finance: "finance",
  };
  return keyMap[primary.key] ?? null;
}

export function getAllDashboardShortcuts(): { vertical: VerticalKey; shortcuts: string[] }[] {
  return Object.values(MODULE_WIRING).map(w => ({
    vertical: w.vertical,
    shortcuts: w.dashboard.shortcuts,
  }));
}

export function getVerticalsWithActiveTracking(): VerticalKey[] {
  return Object.values(MODULE_WIRING)
    .filter(w => w.dashboard.showActiveOrders || w.dashboard.showUpcomingBookings)
    .map(w => w.vertical);
}

export function getVerticalsWithPayment(): VerticalKey[] {
  return Object.values(MODULE_WIRING)
    .filter(w => w.wallet.paymentFlow !== "none")
    .map(w => w.vertical);
}

export function getVerticalsWithOrbit(): VerticalKey[] {
  return Object.values(MODULE_WIRING)
    .filter(w => w.orbit.threadTypes.length > 0)
    .map(w => w.vertical);
}
