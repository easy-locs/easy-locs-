import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { getOrbitIdentity, requireOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { ListingCoupon } from "@/lib/types/reviews";

const db = supabase as any;

type CouponsStore = {
  items: ListingCoupon[];
  loading: boolean;
  hydrateOwnerCoupons: () => Promise<void>;
  hydratePublicCoupons: () => Promise<void>;
  createCoupon: (input: {
    listingId?: string;
    code: string;
    discountType: "flat" | "percent";
    discountValue: number;
    usageLimit?: number;
    startAt?: string;
    endAt?: string;
  }) => Promise<void>;
  toggleCoupon: (couponId: string, active: boolean) => Promise<void>;
  findValidCoupon: (code: string, listingId?: string) => ListingCoupon | null;
};

export const useCouponsStore = create<CouponsStore>((set, get) => ({
  items: [],
  loading: false,

  hydrateOwnerCoupons: async () => {
    const orbit = getOrbitIdentity();
    if (!orbit) return;

    set({ loading: true });

    const { data, error } = await db
      .from("listing_coupons")
      .select("*")
      .eq("owner_orbit_id", orbit.orbitId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    set({
      items: (data ?? []) as ListingCoupon[],
      loading: false,
    });
  },

  hydratePublicCoupons: async () => {
    set({ loading: true });

    const { data, error } = await db
      .from("listing_coupons")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    set({
      items: (data ?? []) as ListingCoupon[],
      loading: false,
    });
  },

  createCoupon: async (input) => {
    const orbit = requireOrbitIdentity();

    const row = {
      id: `cpn_${Math.random().toString(36).slice(2, 11)}`,
      owner_orbit_id: orbit.orbitId,
      listing_id: input.listingId ?? null,
      code: input.code.toUpperCase(),
      discount_type: input.discountType,
      discount_value: input.discountValue,
      active: true,
      usage_limit: input.usageLimit ?? null,
      used_count: 0,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("listing_coupons")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      items: [data as ListingCoupon, ...state.items],
    }));
  },

  toggleCoupon: async (couponId, active) => {
    const { data, error } = await db
      .from("listing_coupons")
      .update({ active })
      .eq("id", couponId)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      items: state.items.map((x) => (x.id === couponId ? (data as ListingCoupon) : x)),
    }));
  },

  findValidCoupon: (code, listingId) => {
    const now = new Date().toISOString();
    return (
      get().items.find((c) => {
        if (!c.active) return false;
        if (c.code.toUpperCase() !== code.toUpperCase()) return false;
        if (c.listing_id && listingId && c.listing_id !== listingId) return false;
        if (c.start_at && c.start_at > now) return false;
        if (c.end_at && c.end_at < now) return false;
        if (c.usage_limit !== null && c.used_count >= c.usage_limit) return false;
        return true;
      }) ?? null
    );
  },
}));
