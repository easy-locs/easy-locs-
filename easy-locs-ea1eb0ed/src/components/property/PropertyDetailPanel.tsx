import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { PropertyCalendar } from "@/components/property/PropertyCalendar";
import { usePropertyQuerySync } from "@/hooks/usePropertyQuerySync";
import { useNavigate } from "react-router-dom";

export function PropertyDetailPanel() {
  const listing = usePropertyDetailStore((s) => s.selectedListing);
  const closeListing = usePropertyDetailStore((s) => s.closeListing);
  const navigate = useNavigate();
  const openContact = (input: { orbitId: string; listingId?: string }) => {
    navigate(`/orbit?section=contacts&orbit=${input.orbitId}`);
  };
  const { setListingInUrl } = usePropertyQuerySync();

  if (!listing) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground">Property Detail</h3>
        <p className="text-xs text-muted-foreground mt-2">No listing selected</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{listing.title}</h3>
          <p className="text-xs text-muted-foreground">{listing.location.address}</p>
        </div>
        <button
          className="text-xs text-destructive hover:underline"
          onClick={() => {
            closeListing();
            setListingInUrl(null);
          }}
        >
          Close
        </button>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-foreground">
          Price/night: {listing.pricing.nightPrice} {listing.pricing.currency}
        </p>
        <p className="text-foreground">
          Monthly rent: {listing.pricing.monthlyRent ?? 0} {listing.pricing.currency}
        </p>
        <p className="text-muted-foreground text-xs">
          Owner Orbit: {listing.ownerOrbitId}
        </p>
      </div>

      <button
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        onClick={() =>
          openContact({
            orbitId: listing.ownerOrbitId,
            listingId: listing.id,
          })
        }
      >
        Contact Owner
      </button>

      <PropertyCalendar />
    </div>
  );
}
