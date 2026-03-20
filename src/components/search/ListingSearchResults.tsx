import { useSearchStore } from "@/stores/searchStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useMapStore } from "@/stores/mapStore";

export function ListingSearchResults() {
  const results = useSearchStore((s) => s.results);
  const openListing = usePropertyDetailStore((s) => s.openListing);
  const selectMarker = useMapStore((s) => s.selectMarker);

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Search Results</h3>

      <div className="space-y-1">
        {results.map((listing) => (
          <div
            key={listing.id}
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => {
              openListing(listing.id);
              selectMarker(`marker_${listing.id}`);
            }}
          >
            <p className="text-sm font-medium text-foreground">{listing.title}</p>
            <p className="text-xs text-muted-foreground">{listing.location.address}</p>
            <p className="text-xs text-primary font-medium">
              {listing.pricing.nightPrice} {listing.pricing.currency} / night
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
