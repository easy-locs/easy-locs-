import { Heart } from "lucide-react";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { Button } from "@/components/ui/button";

export function FavoriteListingButton(props: { listingId: string }) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(props.listingId));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        void (isFavorite
          ? removeFavorite(props.listingId)
          : addFavorite(props.listingId))
      }
    >
      <Heart
        className={`h-4 w-4 mr-1 ${isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
      />
      {isFavorite ? "Unfavorite" : "Favorite"}
    </Button>
  );
}
