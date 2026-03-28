import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ListingViewRow = {
  id: string;
  listing_id: string;
  user_id: string | null;
  orbit_id: string | null;
  source: string | null;
  created_at: string;
};

type SellerKpiSnapshot = {
  id: string;
  owner_orbit_id: string;
  total_listings: number;
  published_listings: number;
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  gross_revenue: number;
  pending_rent_amount: number;
  paid_rent_amount: number;
  created_at: string;
};

type AnalyticsStore = {
  listingViews: ListingViewRow[];
  kpiSnapshots: SellerKpiSnapshot[];
  loading: boolean;
  trackListingView: (listingId: string, source?: string) => Promise<void>;
  hydrateKpiSnapshots: () => Promise<void>;
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  listingViews: [],
  kpiSnapshots: [],
  loading: false,

  trackListingView: async (listingId, source) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();

    const row = {
      id: `view_${Math.random().toString(36).slice(2, 11)}`,
      listing_id: listingId,
      user_id: user?.id ?? null,
      orbit_id: orbit?.orbitId ?? null,
      source: source ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("listing_views")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to track listing view:", error);
      return;
    }

    set((state) => ({
      listingViews: [data as ListingViewRow, ...state.listingViews],
    }));
  },

  hydrateKpiSnapshots: async () => {
    const orbit = getOrbitIdentity();
    if (!orbit) return;

    set({ loading: true });

    const { data, error } = await db
      .from("seller_kpi_snapshots")
      .select("*")
      .eq("owner_orbit_id", orbit.orbitId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Failed to hydrate KPI snapshots:", error);
      set({ loading: false });
      return;
    }

    set({ kpiSnapshots: (data ?? []) as SellerKpiSnapshot[], loading: false });
  },
}));
