import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { ListingReview } from "@/lib/types/reviews";

const db = supabase as any;

type ReviewsStore = {
  items: ListingReview[];
  loading: boolean;
  hydrateListingReviews: (listingId: string) => Promise<void>;
  createReview: (input: {
    listingId: string;
    bookingId?: string;
    ownerOrbitId: string;
    rating: number;
    comment?: string;
  }) => Promise<void>;
  getListingReviews: (listingId: string) => ListingReview[];
  getListingAverage: (listingId: string) => number;
};

export const useReviewsStore = create<ReviewsStore>((set, get) => ({
  items: [],
  loading: false,

  hydrateListingReviews: async (listingId) => {
    set({ loading: true });

    const { data, error } = await db
      .from("listing_reviews")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    set((state) => ({
      items: [
        ...(data as ListingReview[]),
        ...state.items.filter((x) => x.listing_id !== listingId),
      ],
      loading: false,
    }));
  },

  createReview: async (input) => {
    const orbit = requireOrbitIdentity();

    const row: ListingReview = {
      id: `rev_${Math.random().toString(36).slice(2, 11)}`,
      listing_id: input.listingId,
      booking_id: input.bookingId ?? null,
      reviewer_orbit_id: orbit.orbitId,
      owner_orbit_id: input.ownerOrbitId,
      rating: input.rating,
      comment: input.comment ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("listing_reviews")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      items: [data as ListingReview, ...state.items],
    }));
  },

  getListingReviews: (listingId) => {
    return get().items.filter((x) => x.listing_id === listingId);
  },

  getListingAverage: (listingId) => {
    const rows = get().items.filter((x) => x.listing_id === listingId);
    if (rows.length === 0) return 0;
    return rows.reduce((sum, x) => sum + x.rating, 0) / rows.length;
  },
}));
