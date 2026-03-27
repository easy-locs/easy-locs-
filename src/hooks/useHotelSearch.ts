/**
 * useHotelSearch — Canonical hook for hotel room search.
 * Calls the DB function search_available_rooms. No client-side recalculation.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HotelSearchResult {
  room_type_id: string;
  room_name: string;
  capacity: number;
  bed_type: string;
  size_sqm: number | null;
  images: string[];
  amenities: string[];
  rate_plan_id: string;
  plan_name: string;
  meal_plan: string;
  refundable: boolean;
  includes_breakfast: boolean;
  cancellation_type: string;
  currency: string;
  nights_count: number;
  total_base: number;
  total_final: number;
  total_taxes: number;
  total_fees: number;
  price_per_night: number;
  nightly_prices: Array<{ date: string; base_price: number; final_price: number; taxes: number; fees: number }>;
  availability_status: string;
}

export interface HotelSearchParams {
  hotelId: string;
  checkIn: string;   // yyyy-MM-dd
  checkOut: string;   // yyyy-MM-dd
  adults: number;
  children: number;
}

export function useHotelSearch(params: HotelSearchParams | null) {
  return useQuery({
    queryKey: ["hotel-search", params?.hotelId, params?.checkIn, params?.checkOut, params?.adults, params?.children],
    queryFn: async (): Promise<HotelSearchResult[]> => {
      if (!params) return [];

      const { data, error } = await (supabase as any).rpc("search_available_rooms", {
        p_hotel_id: params.hotelId,
        p_checkin: params.checkIn,
        p_checkout: params.checkOut,
        p_adults: params.adults,
        p_children: params.children,
      });

      if (error) throw error;
      return (data ?? []) as HotelSearchResult[];
    },
    enabled: !!params?.hotelId && !!params?.checkIn && !!params?.checkOut,
    staleTime: 15_000,
  });
}

/** Standalone non-hook version for imperative calls */
export async function searchAvailableRooms(params: HotelSearchParams): Promise<HotelSearchResult[]> {
  const { data, error } = await (supabase as any).rpc("search_available_rooms", {
    p_hotel_id: params.hotelId,
    p_checkin: params.checkIn,
    p_checkout: params.checkOut,
    p_adults: params.adults,
    p_children: params.children,
  });
  if (error) throw error;
  return (data ?? []) as HotelSearchResult[];
}
