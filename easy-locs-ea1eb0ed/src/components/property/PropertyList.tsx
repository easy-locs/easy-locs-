import { useRef } from "react";
import { useListingStore } from "@/stores/listingStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useMapStore } from "@/stores/propertyMapStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { usePropertyQuerySync } from "@/hooks/usePropertyQuerySync";
import { useVirtualizer } from "@tanstack/react-virtual";

export function PropertyList() {
  const listings = useListingStore((s) => s.getPublishedListings());
  const openListing = usePropertyDetailStore((s) => s.openListing);
  const selectMarker = useMapStore((s) => s.selectMarker);
  const trackListingView = useAnalyticsStore((s) => s.trackListingView);
  const { setListingInUrl } = usePropertyQuerySync();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 6,
    getItemKey: (index) => listings[index]?.id ?? index,
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-foreground">Published Properties</h3>
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: "60vh" }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const listing = listings[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "8px",
                }}
              >
                <button
                  className="rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors w-full"
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
