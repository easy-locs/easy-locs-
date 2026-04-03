import { useListingStore } from "@/stores/listingStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { usePropertyQuerySync } from "@/hooks/usePropertyQuerySync";

export function PropertyList() {
  const listings = useListingStore((s) => s.getPublishedListings());
  const openListing = usePropertyDetailStore((s) => s.openListing);
  const selectMarker = useUnifiedMapStore((s) => s.selectEntity);
  const trackListingView = useAnalyticsStore((s) => s.trackListingView);
  const { setListingInUrl } = usePropertyQuerySync();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-foreground">Published Properties</h3>
      <div className="flex flex-col gap-2">
        {listings.map((listing) => (
          <button
            key={listing.id}
            className="rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors"
            onClick={() => {
              openListing(listing.id);
              selectMarker(`marker_${listing.id}`);
              setListingInUrl(listing.id);
              void trackListingView(listing.id, "property_list");
            }}
          >
            <p className="font-medium text-foreground">{listing.title}</p>
            <p className="text-sm text-muted-foreground">{listing.location.address}</p>
            <p className="text-xs text-muted-foreground">
              {listing.pricing.nightPrice} {listing.pricing.currency} / night
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
