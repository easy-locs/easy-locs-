import type { CurrencyCode } from "@/lib/types/domain";

export interface ListingSearchFilters {
  city?: string;
  country?: string;
  minNightPrice?: number;
  maxNightPrice?: number;
  currency?: CurrencyCode;
  guests?: number;
  text?: string;
}
