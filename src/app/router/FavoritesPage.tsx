import { useEffect } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useListingStore } from "@/stores/listingStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { usePropertyQuerySync } from "@/hooks/usePropertyQuerySync";

export default function FavoritesPage() {
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const favorites = useFavoritesStore((s) => s.items);
  const getListingById = useListingStore((s) => s.getListingById);
  const openListing = usePropertyDetailStore((s) => s.openListing);
  const { setListingInUrl } = usePropertyQuerySync();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <AppPageShell title="Favorites">
      <div className="flex flex-col gap-2">
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favorites yet</p>
        ) : (
          favorites.map((fav) => {
            const listing = getListingById(fav.listing_id);
            if (!listing) return null;

            return (
              <button
                key={fav.id}
                className="rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors"
                onClick={() => {
                  openListing(listing.id);
                  setListingInUrl(listing.id);
                }}
              >
                <p className="font-medium text-foreground">{listing.title}</p>
                <p className="text-sm text-muted-foreground">{listing.location.address}</p>
              </button>
            );
          })
        )}
      </div>
    </AppPageShell>
  );
}
