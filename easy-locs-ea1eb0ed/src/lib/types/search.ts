import type { CurrencyCode } from "@/domains/shared/canonical-types";

export interface ListingSearchFilters {
  city?: string;
  country?: string;
  minNightPrice?: number;
  maxNightPrice?: number;
  currency?: CurrencyCode;
  guests?: number;
  text?: string;
}
