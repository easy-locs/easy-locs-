/**
 * useStayAvailability — Fetches real availability + pricing from stay_availability table.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, parseISO } from "date-fns";

export interface StayAvailabilityDay {
  date: string;
  available: boolean;
  pricePerNight: number | null;
  currency: string;
  roomsLeft: number;
  minNights: number;
  maxGuests: number;
  blackout: boolean;
}

export interface StayRoomType {
  roomType: string;
  days: StayAvailabilityDay[];
}

export function useStayAvailability(merchantId: string | undefined, checkIn?: string, checkOut?: string) {
  return useQuery({
    queryKey: ["stay-availability", merchantId, checkIn, checkOut],
    queryFn: async () => {
      const from = checkIn || format(new Date(), "yyyy-MM-dd");
      const to = checkOut || format(new Date(Date.now() + 90 * 86400000), "yyyy-MM-dd");

      const { data, error } = await (supabase as any)
        .from("stay_availability")
        .select("*")
        .eq("merchant_id", merchantId)
        .gte("date", from)
        .lte("date", to)
        .order("date");

      if (error) throw error;

      // Group by room_type
      const byRoom: Record<string, StayAvailabilityDay[]> = {};
      for (const row of data || []) {
        const rt = row.room_type || "standard";
        if (!byRoom[rt]) byRoom[rt] = [];
        byRoom[rt].push({
          date: row.date,
          available: row.available && !row.blackout && (row.rooms_total - row.rooms_booked > 0),
          pricePerNight: row.price_per_night ? Number(row.price_per_night) : null,
          currency: row.currency || "AED",
          roomsLeft: Math.max(0, (row.rooms_total || 0) - (row.rooms_booked || 0)),
          minNights: row.min_nights || 1,
          maxGuests: row.max_guests || 2,
          blackout: row.blackout || false,
        });
      }

      return Object.entries(byRoom).map(([roomType, days]) => ({
        roomType,
        days,
      })) as StayRoomType[];
    },
    enabled: !!merchantId,
    staleTime: 30_000,
  });
}

/** Check if a date range is fully available for a given room type */
export function isRangeAvailable(
  rooms: StayRoomType[],
  roomType: string,
  checkIn: string,
  checkOut: string
): { available: boolean; totalPrice: number; currency: string; nights: number } {
  const room = rooms.find(r => r.roomType === roomType);
  if (!room) return { available: false, totalPrice: 0, currency: "AED", nights: 0 };

  const days = eachDayOfInterval({
    start: parseISO(checkIn),
    end: new Date(parseISO(checkOut).getTime() - 86400000),
  });

  let totalPrice = 0;
  let currency = "AED";

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const avail = room.days.find(d => d.date === dateStr);
    if (!avail || !avail.available) {
      return { available: false, totalPrice: 0, currency, nights: days.length };
    }
    totalPrice += avail.pricePerNight || 0;
    currency = avail.currency;
  }

  return { available: true, totalPrice, currency, nights: days.length };
}
