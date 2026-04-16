/**
 * Canonical listing types for public_listings.
 * Maps to the DB enum: public.listing_type
 */
export const LISTING_TYPES = {
  SHORT_STAY: "short_stay",
  LONG_STAY: "long_stay",
  HOTEL: "hotel",
  SALE: "sale",
  /** @deprecated Use SHORT_STAY */
  SHORT_TERM_STAY: "short_stay",
  /** @deprecated Use LONG_STAY */
  LONG_TERM_RENTAL: "long_stay",
} as const;

export type ListingType = "short_stay" | "long_stay" | "hotel" | "sale";

/** Types considered "stays" (short-term, nightly) */
export const STAY_TYPES: string[] = ["short_stay", "hotel"];

/** Types considered "rentals" (long-term, monthly) */
export const RENTAL_TYPES: string[] = ["long_stay"];

/** Human-readable labels */
export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  short_stay: "Short-term Stay",
  long_stay: "Long-term Rental",
  hotel: "Hotel",
  sale: "For Sale",
};

/** Icons per type */
export const LISTING_TYPE_ICONS: Record<ListingType, string> = {
  short_stay: "🏨",
  long_stay: "🔑",
  hotel: "🏩",
  sale: "🏷️",
};
