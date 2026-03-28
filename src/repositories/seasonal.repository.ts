/**
 * Seasonal Repository — DB access for SeasonalRentals inline calls.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchBookingRequest(id: string) {
  const { data } = await supabase.from("booking_requests").select("*").eq("id", id).single();
  return data;
}

export async function deleteBookingRequest(id: string) {
  const { error } = await supabase.from("booking_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBookingRequestDates(id: string, checkIn: string, checkOut: string) {
  const { error } = await supabase.from("booking_requests").update({
    check_in: checkIn,
    check_out: checkOut,
  }).eq("id", id);
  if (error) throw error;
}

export async function updateSeasonalBookingDates(orgId: string, guestEmail: string, oldCheckIn: string, checkIn: string, checkOut: string) {
  await supabase.from("seasonal_bookings").update({
    check_in: checkIn,
    check_out: checkOut,
  }).eq("org_id", orgId)
    .eq("guest_email", guestEmail)
    .eq("check_in", oldCheckIn);
}

export async function insertSeasonalBookings(bookings: any[]) {
  const { error } = await supabase.from("seasonal_bookings").insert(bookings);
  if (error) throw error;
}
