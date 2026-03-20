export interface ListingReview {
  id: string;
  listing_id: string;
  booking_id: string | null;
  reviewer_orbit_id: string;
  owner_orbit_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ListingCoupon {
  id: string;
  owner_orbit_id: string;
  listing_id: string | null;
  code: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  active: boolean;
  usage_limit: number | null;
  used_count: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}
