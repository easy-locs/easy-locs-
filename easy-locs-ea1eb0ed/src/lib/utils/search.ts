import type { PropertyListingV2 } from "@/lib/types/domain";
import type { ListingSearchFilters } from "@/lib/types/search";

export function filterListings(
  listings: PropertyListingV2[],
  filters: ListingSearchFilters
): PropertyListingV2[] {
  return listings.filter((listing) => {
    if (filters.city && listing.location.city?.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }

    if (
      filters.country &&
      listing.location.country?.toLowerCase() !== filters.country.toLowerCase()
    ) {
      return false;
    }

    if (
      typeof filters.minNightPrice === "number" &&
      listing.pricing.nightPrice < filters.minNightPrice
    ) {
      return false;
    }

    if (
      typeof filters.maxNightPrice === "number" &&
      listing.pricing.nightPrice > filters.maxNightPrice
    ) {
      return false;
    }

    if (filters.currency && listing.pricing.currency !== filters.currency) {
      return false;
    }

    if (
      typeof filters.guests === "number" &&
      (listing.capacity?.guests ?? 0) < filters.guests
    ) {
      return false;
    }

    if (filters.text) {
      const q = filters.text.toLowerCase();
      const haystack = [
        listing.title,
        listing.description ?? "",
        listing.location.address,
        listing.location.city ?? "",
        listing.location.country ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}
