import { useEffect } from "react";
import { usePropertyQuerySync } from "@/hooks/usePropertyQuerySync";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyDetailPanel } from "@/components/property/PropertyDetailPanel";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { ReviewPanel } from "@/components/property/ReviewPanel";
import { FavoriteListingButton } from "@/components/property/FavoriteListingButton";
import { ShareListingButton } from "@/components/property/ShareListingButton";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFavoritesRealtime } from "@/hooks/useFavoritesRealtime";

export default function PropertiesPage() {
  usePropertyQuerySync();

  const listing = usePropertyDetailStore((s) => s.selectedListing);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);

  useFavoritesRealtime();

  useEffect(() => {
    void hydrateFavorites();
  }, [hydrateFavorites]);

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
