/**
 * Canonical listing types for public_listings.
 * Maps to the DB enum: public.listing_type
 */
export const LISTING_TYPES = {
  SHORT_TERM_STAY: "short_term_stay",
  LONG_TERM_RENTAL: "long_term_rental",
  HOTEL: "hotel",
  SALE: "sale",
} as const;

export type ListingType = typeof LISTING_TYPES[keyof typeof LISTING_TYPES];

/** Types considered "stays" (short-term, nightly) */
export const STAY_TYPES: ListingType[] = ["short_term_stay", "hotel"];

/** Types considered "rentals" (long-term, monthly) */
export const RENTAL_TYPES: ListingType[] = ["long_term_rental"];

/** Human-readable labels */
export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  short_term_stay: "Short-term Stay",
  long_term_rental: "Long-term Rental",
  hotel: "Hotel",
  sale: "For Sale",
};

/** Icons per type */
export const LISTING_TYPE_ICONS: Record<ListingType, string> = {
  short_term_stay: "🏨",
  long_term_rental: "🔑",
  hotel: "🏩",
  sale: "🏷️",
};
