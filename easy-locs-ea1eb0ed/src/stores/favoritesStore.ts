import { create } from "zustand";
import { db } from "@/services/db";
import { useAuthStore } from "@/stores/auth.store";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";


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
  _inflight: Set<string>;
  hydrate: () => Promise<void>;
  addFavorite: (listingId: string) => Promise<void>;
  removeFavorite: (listingId: string) => Promise<void>;
  isFavorite: (listingId: string) => boolean;
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  items: [],
  loading: false,
  _inflight: new Set<string>(),

  hydrate: async () => {
    const user = useAuthStore.getState().user;
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

    set({ items: (data ?? []) as FavoriteRow[], loading: false, _inflight: new Set() });
  },

  addFavorite: async (listingId) => {
    const user = useAuthStore.getState().user;
    const orbit = getOrbitIdentity();
    if (!user || !orbit) return;

    if (get().items.some((x) => x.listing_id === listingId)) return;
    if (get()._inflight.has(listingId)) return;

    const inflight = new Set(get()._inflight);
    inflight.add(listingId);
    set({ _inflight: inflight });

    const row = {
      id: `fav_${Math.random().toString(36).slice(2, 11)}`,
      user_id: user.id,
      orbit_id: orbit.orbitId,
      listing_id: listingId,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      items: [row as FavoriteRow, ...state.items],
    }));

    try {
      const { data, error } = await db
        .from("favorite_listings")
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error("Failed to add favorite:", error);
        set((state) => ({
          items: state.items.filter((x) => x.listing_id !== listingId),
        }));
        return;
      }

      set((state) => ({
        items: [data as FavoriteRow, ...state.items.filter((x) => x.listing_id !== listingId)],
      }));
    } finally {
      const updated = new Set(get()._inflight);
      updated.delete(listingId);
      set({ _inflight: updated });
    }
  },

  removeFavorite: async (listingId) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (!get().items.some((x) => x.listing_id === listingId)) return;
    if (get()._inflight.has(listingId)) return;

    const inflight = new Set(get()._inflight);
    inflight.add(listingId);
    set({ _inflight: inflight });

    const removedItems = get().items.filter((x) => x.listing_id === listingId);

    set((state) => ({
      items: state.items.filter((x) => x.listing_id !== listingId),
    }));

    try {
      const { error } = await db
        .from("favorite_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) {
        console.error("Failed to remove favorite:", error);
        set((state) => ({
          items: [...removedItems, ...state.items],
        }));
      }
    } finally {
      const updated = new Set(get()._inflight);
      updated.delete(listingId);
      set({ _inflight: updated });
    }
  },

  isFavorite: (listingId) => {
    return get().items.some((x) => x.listing_id === listingId);
  },
}));
