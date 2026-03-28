import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { ListingSearchFilters } from "@/lib/types/search";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type SavedSearchRow = {
  id: string;
  user_id: string;
  orbit_id: string;
  name: string;
  filters: ListingSearchFilters;
  created_at: string;
};

type SavedSearchStore = {
  items: SavedSearchRow[];
  loading: boolean;
  hydrate: () => Promise<void>;
  saveSearch: (name: string, filters: ListingSearchFilters) => Promise<void>;
  deleteSearch: (id: string) => Promise<void>;
};

export const useSavedSearchStore = create<SavedSearchStore>((set) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    const { data, error } = await db
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to hydrate saved searches:", error);
      set({ loading: false });
      return;
    }

    set({ items: (data ?? []) as SavedSearchRow[], loading: false });
  },

  saveSearch: async (name, filters) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();
    if (!user || !orbit) return;

    const row = {
      id: `search_${Math.random().toString(36).slice(2, 11)}`,
      user_id: user.id,
      orbit_id: orbit.orbitId,
      name,
      filters,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("saved_searches")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to save search:", error);
      return;
    }

    set((state) => ({
      items: [data as SavedSearchRow, ...state.items],
    }));
  },

  deleteSearch: async (id) => {
    const { error } = await db
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete search:", error);
      return;
    }

    set((state) => ({
      items: state.items.filter((x) => x.id !== id),
    }));
  },
}));
