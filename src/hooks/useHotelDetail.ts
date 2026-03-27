/**
 * useHotelDetail — Canonical hook for hotel data from hotels/hotel_rooms/hotel_rate_plans/hotel_availability.
 * Single source of truth — no legacy stay_availability or seed_merchants reads.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

const db = supabase as any;

export interface HotelRatePlan {
  id: string;
  name: string;
  normalized_plan_name: string | null;
  cancellation_policy: string | null;
  cancellation_type: string;
  meal_plan: string;
  refundable: boolean;
  includes_breakfast: boolean;
  includes_taxes: boolean;
  pay_later: boolean;
  pay_now: boolean;
  currency: string;
}

export interface HotelAvailDay {
  date: string;
  available: boolean;
  available_units: number;
  price: number;
  base_price: number | null;
  final_price: number | null;
  taxes_amount: number;
  fees_amount: number;
  currency: string;
  min_stay: number;
  max_stay: number;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  restriction_notes: string | null;
}

export interface HotelRoom {
  id: string;
  name: string;
  normalized_room_name: string | null;
  description: string | null;
  capacity: number;
  adults: number;
  children: number;
  bed_type: string;
  size_m2: number | null;
  smoking_allowed: boolean;
  amenities_json: string[];
  images_json: string[];
  rate_plans: HotelRatePlan[];
  availability: HotelAvailDay[];
  lowestPrice: number | null;
  lowestFinalPrice: number | null;
}

export interface HotelData {
  id: string;
  name: string;
  slug: string | null;
  hotel_type: string;
  description: string | null;
  stars: number;
  rating: number;
  reviews_count: number;
  address: string | null;
  area: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  checkin_time: string;
  checkout_time: string;
  policies_json: any;
  amenities_json: string[];
  cover_image: string | null;
  logo_image: string | null;
  gallery_json: string[];
  source_type: string;
  source_url: string | null;
  visibility_mode: string;
  publish_gate_status: string;
  overall_quality_score: number;
  pipeline_stage: string;
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

      // Fetch rooms (active only)
      const { data: rooms } = await db
        .from("hotel_rooms")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("active", true)
        .order("capacity");

      const enrichedRooms: HotelRoom[] = [];
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addDays(new Date(), 90), "yyyy-MM-dd");

      for (const room of rooms ?? []) {
        // Rate plans (active only)
        const { data: plans } = await db
          .from("hotel_rate_plans")
          .select("*")
          .eq("room_id", room.id)
          .eq("active", true);

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
          available_units: a.available_units ?? 1,
          price: Number(a.price),
          base_price: a.base_price ? Number(a.base_price) : null,
          final_price: a.final_price ? Number(a.final_price) : null,
          taxes_amount: Number(a.taxes_amount ?? 0),
          fees_amount: Number(a.fees_amount ?? 0),
          currency: a.currency || "AED",
          min_stay: a.min_stay ?? 1,
          max_stay: a.max_stay ?? 30,
          closed_to_arrival: a.closed_to_arrival ?? false,
          closed_to_departure: a.closed_to_departure ?? false,
          restriction_notes: a.restriction_notes ?? null,
        }));

        const availPrices = availDays.filter(d => d.available).map(d => d.price);
        const finalPrices = availDays.filter(d => d.available && d.final_price).map(d => d.final_price!);

        enrichedRooms.push({
          id: room.id,
          name: room.name,
          normalized_room_name: room.normalized_room_name,
          description: room.description,
          capacity: room.capacity,
          adults: room.adults ?? room.capacity,
          children: room.children ?? 0,
          bed_type: room.bed_type || "double",
          size_m2: room.room_size_sqm ? Number(room.room_size_sqm) : (room.size_m2 ? Number(room.size_m2) : null),
          smoking_allowed: room.smoking_allowed ?? false,
          amenities_json: room.amenities_json ?? [],
          images_json: room.images_json ?? [],
          rate_plans: (plans ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            normalized_plan_name: p.normalized_plan_name,
            cancellation_policy: p.cancellation_policy,
            cancellation_type: p.cancellation_type || "free_cancellation",
            meal_plan: p.meal_plan || "none",
            refundable: p.refundable ?? true,
            includes_breakfast: p.includes_breakfast ?? false,
            includes_taxes: p.includes_taxes ?? false,
            pay_later: p.pay_later ?? false,
            pay_now: p.pay_now ?? true,
            currency: p.currency || "AED",
          })),
          availability: availDays,
          lowestPrice: availPrices.length > 0 ? Math.min(...availPrices) : null,
          lowestFinalPrice: finalPrices.length > 0 ? Math.min(...finalPrices) : null,
        });
      }

      return {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        hotel_type: hotel.hotel_type || "hotel",
        description: hotel.description,
        stars: hotel.stars ?? 0,
        rating: Number(hotel.rating ?? 0),
        reviews_count: hotel.reviews_count ?? 0,
        address: hotel.address,
        area: hotel.area,
        city: hotel.city,
        country: hotel.country,
        lat: hotel.lat ? Number(hotel.lat) : null,
        lng: hotel.lng ? Number(hotel.lng) : null,
        phone: hotel.phone,
        email: hotel.email,
        checkin_time: hotel.checkin_time || "15:00",
        checkout_time: hotel.checkout_time || "11:00",
        policies_json: hotel.policies_json ?? {},
        amenities_json: hotel.amenities_json ?? [],
        cover_image: hotel.cover_image,
        logo_image: hotel.logo_image,
        gallery_json: hotel.gallery_json ?? [],
        source_type: hotel.source_type || "web",
        source_url: hotel.source_url,
        visibility_mode: hotel.visibility_mode || "hidden",
        publish_gate_status: hotel.publish_gate_status || "pending",
        overall_quality_score: hotel.overall_quality_score ?? 0,
        pipeline_stage: hotel.pipeline_stage || "intake",
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
        .select("id, name, slug, hotel_type, stars, rating, reviews_count, city, country, cover_image, visibility_mode, overall_quality_score, publish_gate_status, area")
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

/** Check range availability for a room */
export function checkRoomAvailability(
  availability: HotelAvailDay[],
  checkIn: string,
  checkOut: string
): { available: boolean; totalPrice: number; totalFinal: number; totalTaxes: number; totalFees: number; nights: number; restrictions: string[] } {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  let totalPrice = 0, totalFinal = 0, totalTaxes = 0, totalFees = 0;
  const restrictions: string[] = [];

  for (let d = 0; d < nights; d++) {
    const dateStr = format(addDays(start, d), "yyyy-MM-dd");
    const day = availability.find(a => a.date === dateStr);
    if (!day || !day.available) return { available: false, totalPrice: 0, totalFinal: 0, totalTaxes: 0, totalFees: 0, nights, restrictions: ["dates_unavailable"] };
    if (d === 0 && day.closed_to_arrival) restrictions.push("closed_to_arrival");
    if (d === nights - 1 && day.closed_to_departure) restrictions.push("closed_to_departure");
    if (day.min_stay > nights) restrictions.push(`min_stay_${day.min_stay}`);
    totalPrice += day.price;
    totalFinal += day.final_price ?? day.price;
    totalTaxes += day.taxes_amount;
    totalFees += day.fees_amount;
  }

  return { available: restrictions.length === 0, totalPrice, totalFinal, totalTaxes, totalFees, nights, restrictions };
}
