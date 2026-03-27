/**
 * useHotelBooking — Canonical hook for creating hotel bookings.
 * Calls the DB function create_hotel_booking which validates price server-side.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BookingResult {
  booking_id: string;
  booking_reference: string;
  total_price: number;
  taxes: number;
  fees: number;
  currency: string;
  nights: number;
  price_per_night: number;
  status: string;
  error?: string;
}

export interface CreateBookingParams {
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkinDate: string;
  checkoutDate: string;
  adults: number;
  children: number;
}

export function useHotelBooking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateBookingParams): Promise<BookingResult> => {
      if (!user?.id) throw new Error("Authentication required");

      const { data, error } = await (supabase as any).rpc("create_hotel_booking", {
        p_user_id: user.id,
        p_hotel_id: params.hotelId,
        p_room_type_id: params.roomTypeId,
        p_rate_plan_id: params.ratePlanId,
        p_checkin: params.checkinDate,
        p_checkout: params.checkoutDate,
        p_adults: params.adults,
        p_children: params.children,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as BookingResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-search"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-detail"] });
      queryClient.invalidateQueries({ queryKey: ["my-hotel-bookings"] });
    },
  });
}

export function useMyHotelBookings() {
  const { user } = useAuth();
  return {
    queryKey: ["my-hotel-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("hotel_bookings")
        .select("*, hotels(name, city, cover_image, stars)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  };
}
