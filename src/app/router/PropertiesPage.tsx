import { AppPageShell } from "@/components/layout/AppPageShell";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyDetailPanel } from "@/components/property/PropertyDetailPanel";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { FavoriteListingButton } from "@/components/property/FavoriteListingButton";
import { ShareListingButton } from "@/components/property/ShareListingButton";
import { ReviewPanel } from "@/components/property/ReviewPanel";

export default function PropertiesPage() {
  const listing = usePropertyDetailStore((s) => s.selectedListing);

  return (
    <AppPageShell
      title="Properties"
      actions={
        listing ? (
          <div className="flex gap-2">
            <FavoriteListingButton listingId={listing.id} />
            <ShareListingButton listingId={listing.id} title={listing.title} />
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PropertyList />
          <PropertyDetailPanel />
          <ReviewPanel />
        </div>

        <div>
          <PropertyGallery />
        </div>
      </div>
    </AppPageShell>
  );
}
