/**
 * useHotelDetail — Fetches hotel, rooms, rate plans, and availability from DB.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

const db = supabase as any;

export interface HotelRoom {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  bed_type: string;
  size_m2: number | null;
  amenities_json: string[];
  images_json: string[];
  rate_plans: HotelRatePlan[];
  availability: HotelAvailDay[];
  lowestPrice: number | null;
}

export interface HotelRatePlan {
  id: string;
  name: string;
  cancellation_policy: string | null;
  meal_plan: string;
  refundable: boolean;
}

export interface HotelAvailDay {
  date: string;
  available: boolean;
  price: number;
  currency: string;
  min_stay: number;
  max_stay: number;
}

export interface HotelData {
  id: string;
  name: string;
  description: string | null;
  stars: number;
  rating: number;
  reviews_count: number;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  checkin_time: string;
  checkout_time: string;
  policies_json: any;
  amenities_json: string[];
  cover_image: string | null;
  gallery_json: string[];
  source_type: string;
  visibility_mode: string;
  overall_quality_score: number;
  rooms: HotelRoom[];
}

export function useHotelDetail(hotelId: string | undefined) {
  return useQuery({
    queryKey: ["hotel-detail", hotelId],
    queryFn: async (): Promise<HotelData | null> => {
      if (!hotelId) return null;

      const { data: hotel, error } = await db
        .from("hotels")
        .select("*")
        .eq("id", hotelId)
        .single();

      if (error || !hotel) return null;

      // Fetch rooms
      const { data: rooms } = await db
        .from("hotel_rooms")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("capacity");

      const enrichedRooms: HotelRoom[] = [];
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addDays(new Date(), 90), "yyyy-MM-dd");

      for (const room of rooms ?? []) {
        // Rate plans
        const { data: plans } = await db
          .from("hotel_rate_plans")
          .select("*")
          .eq("room_id", room.id);

        // Availability
        const { data: avail } = await db
          .from("hotel_availability")
          .select("*")
          .eq("room_id", room.id)
          .gte("date", from)
          .lte("date", to)
          .order("date");

        const availDays: HotelAvailDay[] = (avail ?? []).map((a: any) => ({
          date: a.date,
          available: a.available,
          price: Number(a.price),
          currency: a.currency,
          min_stay: a.min_stay,
          max_stay: a.max_stay,
        }));

        const prices = availDays.filter(d => d.available).map(d => d.price);

        enrichedRooms.push({
          id: room.id,
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          bed_type: room.bed_type,
          size_m2: room.size_m2 ? Number(room.size_m2) : null,
          amenities_json: room.amenities_json ?? [],
          images_json: room.images_json ?? [],
          rate_plans: (plans ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            cancellation_policy: p.cancellation_policy,
            meal_plan: p.meal_plan,
            refundable: p.refundable,
          })),
          availability: availDays,
          lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
        });
      }

      return {
        ...hotel,
        amenities_json: hotel.amenities_json ?? [],
        gallery_json: hotel.gallery_json ?? [],
        rooms: enrichedRooms,
      };
    },
    enabled: !!hotelId,
    staleTime: 60_000,
  });
}

export function useHotelsList(city?: string) {
  return useQuery({
    queryKey: ["hotels-list", city],
    queryFn: async () => {
      let q = db
        .from("hotels")
        .select("id, name, stars, rating, reviews_count, city, country, cover_image, visibility_mode, overall_quality_score")
        .in("visibility_mode", ["live", "search_only", "coming_soon"])
        .order("overall_quality_score", { ascending: false })
        .limit(50);

      if (city) q = q.eq("city", city);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}
