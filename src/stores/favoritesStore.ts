import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type FavoriteRow = {
  id: string;
  user_id: string;
  orbit_id: string;
  listing_id: string;
  created_at: string;
};

type FavoritesStore = {
  items: FavoriteRow[];
  loading: boolean;
  hydrate: () => Promise<void>;
  addFavorite: (listingId: string) => Promise<void>;
  removeFavorite: (listingId: string) => Promise<void>;
  isFavorite: (listingId: string) => boolean;
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    const { data, error } = await db
      .from("favorite_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to hydrate favorites:", error);
      set({ loading: false });
      return;
    }

    set({ items: (data ?? []) as FavoriteRow[], loading: false });
  },

  addFavorite: async (listingId) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();
    if (!user || !orbit) return;

    const row = {
      id: `fav_${Math.random().toString(36).slice(2, 11)}`,
      user_id: user.id,
      orbit_id: orbit.orbitId,
      listing_id: listingId,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("favorite_listings")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to add favorite:", error);
      return;
    }

    set((state) => ({
      items: [data as FavoriteRow, ...state.items.filter((x) => x.listing_id !== listingId)],
    }));
  },

  removeFavorite: async (listingId) => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    const { error } = await db
      .from("favorite_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (error) {
      console.error("Failed to remove favorite:", error);
      return;
    }

    set((state) => ({
      items: state.items.filter((x) => x.listing_id !== listingId),
    }));
  },

  isFavorite: (listingId) => {
    return get().items.some((x) => x.listing_id === listingId);
  },
}));
