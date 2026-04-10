/**
 * Category Radar Behavior — Category-specific discovery and ranking rules
 * that the Radar uses to adapt its behavior per vertical.
 * Derived from category-tree.ts canonical architecture.
 */

export type RadarCategoryBehavior = {
  vertical: string;
  /** Whether to show distance slider or auto-detect proximity */
  showDistanceSlider: boolean;
  /** Primary sort fields */
  sortFields: string[];
  /** Whether delivery zones matter */
  useDeliveryZones: boolean;
  /** Whether merchant prep time is relevant */
  usePrepTime: boolean;
  /** Whether rider ETA is relevant */
  useRiderETA: boolean;
  /** Whether to show live rider positions */
  showLiveRiders: boolean;
  /** Whether booking calendar is primary */
  useCalendar: boolean;
  /** Whether stock/availability matters */
  useStockAvailability: boolean;
  /** Max default radius km */
  defaultRadiusKm: number;
  /** Filter labels */
  filterLabels: {
    primary: string;
    secondary?: string;
  };
};

export const CATEGORY_RADAR_BEHAVIORS: Record<string, RadarCategoryBehavior> = {
  food: {
    vertical: "food",
    showDistanceSlider: false, // auto proximity detection
    sortFields: ["eta", "prep_time", "rating", "delivery_fee"],
    useDeliveryZones: true,
    usePrepTime: true,
    useRiderETA: true,
    showLiveRiders: false,
    useCalendar: false,
    useStockAvailability: false,
    defaultRadiusKm: 5,
    filterLabels: { primary: "Delivers to you", secondary: "ETA" },
  },
  grocery: {
    vertical: "grocery",
    showDistanceSlider: false,
    sortFields: ["eta", "stock_score", "prep_time", "rating"],
    useDeliveryZones: true,
    usePrepTime: true,
    useRiderETA: true,
    showLiveRiders: false,
    useCalendar: false,
    useStockAvailability: true,
    defaultRadiusKm: 8,
    filterLabels: { primary: "Delivers to you", secondary: "Availability" },
  },
  taxi: {
    vertical: "taxi",
    showDistanceSlider: false,
    sortFields: ["rider_eta", "rating", "price"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: true,
    showLiveRiders: true,
    useCalendar: false,
    useStockAvailability: false,
    defaultRadiusKm: 10,
    filterLabels: { primary: "Pickup ETA" },
  },
  delivery: {
    vertical: "delivery",
    showDistanceSlider: false,
    sortFields: ["eta", "distance", "rating"],
    useDeliveryZones: true,
    usePrepTime: true,
    useRiderETA: true,
    showLiveRiders: false,
    useCalendar: false,
    useStockAvailability: false,
    defaultRadiusKm: 10,
    filterLabels: { primary: "Delivers to you" },
  },
  parcel: {
    vertical: "parcel",
    showDistanceSlider: true,
    sortFields: ["eta", "price", "vehicle_match"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: true,
    showLiveRiders: true,
    useCalendar: false,
    useStockAvailability: false,
    defaultRadiusKm: 25,
    filterLabels: { primary: "Pickup ETA", secondary: "Size/Weight" },
  },
  services: {
    vertical: "services",
    showDistanceSlider: true,
    sortFields: ["availability", "rating", "distance", "price"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: false,
    showLiveRiders: false,
    useCalendar: true,
    useStockAvailability: false,
    defaultRadiusKm: 15,
    filterLabels: { primary: "Available now", secondary: "Rating" },
  },
  beauty: {
    vertical: "beauty",
    showDistanceSlider: true,
    sortFields: ["availability", "rating", "price"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: false,
    showLiveRiders: false,
    useCalendar: true,
    useStockAvailability: false,
    defaultRadiusKm: 10,
    filterLabels: { primary: "Available now", secondary: "Rating" },
  },
  property: {
    vertical: "property",
    showDistanceSlider: true,
    sortFields: ["price", "rating", "distance"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: false,
    showLiveRiders: false,
    useCalendar: true,
    useStockAvailability: false,
    defaultRadiusKm: 25,
    filterLabels: { primary: "Location" },
  },
  travel: {
    vertical: "travel",
    showDistanceSlider: false,
    sortFields: ["price", "rating", "availability"],
    useDeliveryZones: false,
    usePrepTime: false,
    useRiderETA: false,
    showLiveRiders: false,
    useCalendar: true,
    useStockAvailability: true,
    defaultRadiusKm: 50,
    filterLabels: { primary: "Dates", secondary: "Price" },
  },
  shops: {
    vertical: "shops",
    showDistanceSlider: true,
    sortFields: ["distance", "rating", "price"],
    useDeliveryZones: true,
    usePrepTime: true,
    useRiderETA: true,
    showLiveRiders: false,
    useCalendar: false,
    useStockAvailability: true,
    defaultRadiusKm: 10,
    filterLabels: { primary: "Delivers to you", secondary: "In stock" },
  },
};

/**
 * Resolve radar behavior for a given vertical.
 * Falls back to food behavior if unknown.
 */
export function getRadarBehavior(vertical: string): RadarCategoryBehavior {
  return CATEGORY_RADAR_BEHAVIORS[vertical] ?? CATEGORY_RADAR_BEHAVIORS.food;
}

/**
 * Get sort label for display.
 */
export function getSortLabel(field: string): string {
  const labels: Record<string, string> = {
    eta: "ETA",
    prep_time: "Prep Time",
    rating: "Rating",
    delivery_fee: "Fee",
    distance: "Distance",
    rider_eta: "Pickup ETA",
    price: "Price",
    stock_score: "Availability",
    availability: "Available",
    vehicle_match: "Vehicle",
  };
  return labels[field] ?? field;
}
