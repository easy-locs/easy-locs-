/**
 * Category-aware booking configuration for the marketplace.
 * Each service category has its own calendar mode, required fields, and display logic.
 */

export type CalendarMode = "range" | "single" | "datetime";

export interface CategoryBookingConfig {
  calendarMode: CalendarMode;
  /** Show time picker */
  showTime: boolean;
  /** Show quantity/participants field */
  showQuantity: boolean;
  /** Label for the quantity field */
  quantityLabel: string;
  /** Show pickup/dropoff location fields */
  showLocations: boolean;
  /** Show passenger count */
  showPassengers: boolean;
  /** Unit label for price display */
  priceUnit: string;
  /** Label for the date(s) field */
  dateLabel: string;
  /** Label for end date in range mode */
  endDateLabel: string;
  /** Show optional return time */
  showReturnTime: boolean;
  /** Show duration estimate */
  showDuration: boolean;
}

const DEFAULT_CONFIG: CategoryBookingConfig = {
  calendarMode: "single",
  showTime: true,
  showQuantity: true,
  quantityLabel: "Quantity",
  showLocations: false,
  showPassengers: false,
  priceUnit: "",
  dateLabel: "Date",
  endDateLabel: "End Date",
  showReturnTime: false,
  showDuration: false,
};

const CATEGORY_CONFIGS: Record<string, Partial<CategoryBookingConfig>> = {
  // ── Accommodation / Seasonal Rental ──
  accommodation: {
    calendarMode: "range",
    showTime: false,
    showQuantity: false,
    priceUnit: "/night",
    dateLabel: "Check-in",
    endDateLabel: "Check-out",
  },

  // ── Car Rental ──
  car_rental: {
    calendarMode: "range",
    showTime: true,
    showQuantity: false,
    priceUnit: "/day",
    dateLabel: "Pickup Date",
    endDateLabel: "Return Date",
    showReturnTime: true,
  },

  // ── Boat / Yacht Rental ──
  boat_rental: {
    calendarMode: "range",
    showTime: true,
    showQuantity: false,
    priceUnit: "/day",
    dateLabel: "Start Date",
    endDateLabel: "End Date",
  },
  yacht: {
    calendarMode: "range",
    showTime: true,
    showQuantity: false,
    priceUnit: "/day",
    dateLabel: "Start Date",
    endDateLabel: "End Date",
  },

  // ── Equipment Rental ──
  equipment_rental: {
    calendarMode: "range",
    showTime: false,
    showQuantity: true,
    quantityLabel: "Units",
    priceUnit: "/day",
    dateLabel: "Start Date",
    endDateLabel: "Return Date",
  },

  // ── Airport Transfer ──
  airport_transfer: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    showLocations: true,
    showPassengers: true,
    priceUnit: "/trip",
    dateLabel: "Transfer Date",
  },

  // ── Transport ──
  transport: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    showLocations: true,
    showPassengers: true,
    priceUnit: "/trip",
    dateLabel: "Date",
  },

  // ── Tours & Activities ──
  tours: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Participants",
    priceUnit: "/person",
    dateLabel: "Activity Date",
    showDuration: true,
  },

  // ── Water Sport ──
  water_sport: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Participants",
    priceUnit: "/person",
    dateLabel: "Session Date",
    showDuration: true,
  },

  // ── Wellness / Spa ──
  spa: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Guests",
    priceUnit: "/session",
    dateLabel: "Appointment Date",
    showDuration: true,
  },

  // ── Personal Services ──
  personal: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/session",
    dateLabel: "Date",
    showDuration: true,
  },

  // ── Cleaning ──
  cleaning: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/service",
    dateLabel: "Service Date",
    showDuration: true,
  },

  // ── Property Maintenance ──
  maintenance: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/service",
    dateLabel: "Scheduled Date",
    showDuration: true,
  },

  // ── Restaurant ──
  restaurant: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Guests",
    priceUnit: "/person",
    dateLabel: "Reservation Date",
  },

  // ── Coworking ──
  coworking: {
    calendarMode: "range",
    showTime: false,
    showQuantity: true,
    quantityLabel: "Desks",
    priceUnit: "/day",
    dateLabel: "Start Date",
    endDateLabel: "End Date",
  },

  // ── Events / Tickets ──
  event: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Tickets",
    priceUnit: "/ticket",
    dateLabel: "Event Date",
  },

  // ── Construction / Renovation ──
  construction: {
    calendarMode: "range",
    showTime: false,
    showQuantity: false,
    priceUnit: "/project",
    dateLabel: "Start Date",
    endDateLabel: "End Date",
  },

  // ── Sports Coach ──
  sports_coach: {
    calendarMode: "single",
    showTime: true,
    showQuantity: true,
    quantityLabel: "Participants",
    priceUnit: "/session",
    dateLabel: "Session Date",
    showDuration: true,
  },

  // ── Legal / Advocate ──
  legal: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/consultation",
    dateLabel: "Appointment Date",
  },

  // ── Business Services ──
  business_services: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/service",
    dateLabel: "Service Date",
  },

  // ── Professional Consulting ──
  consulting: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "/session",
    dateLabel: "Consultation Date",
    showDuration: true,
  },

  // ── Real Estate ──
  real_estate: {
    calendarMode: "single",
    showTime: true,
    showQuantity: false,
    priceUnit: "",
    dateLabel: "Visit Date",
  },
};

export function getCategoryBookingConfig(category: string): CategoryBookingConfig {
  const override = CATEGORY_CONFIGS[category] || {};
  return { ...DEFAULT_CONFIG, ...override };
}

export function isRangeCategory(category: string): boolean {
  return getCategoryBookingConfig(category).calendarMode === "range";
}
