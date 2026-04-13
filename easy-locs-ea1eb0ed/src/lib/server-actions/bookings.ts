import { db as supabase } from "@/services/db";

export async function serverCreateBooking(input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guestInfo?: {
    fullName?: string;
    phone?: string;
    notes?: string;
    guestsCount?: number;
  };
}) {
  const { data, error } = await supabase.functions.invoke("booking-create", {
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function serverApproveBooking(input: { bookingId: string }) {
  const { data, error } = await supabase.functions.invoke("booking-approve", {
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function serverRejectBooking(input: { bookingId: string }) {
  const { data, error } = await supabase.functions.invoke("booking-reject", {
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function serverCompleteBooking(input: { bookingId: string }) {
  const { data, error } = await supabase.functions.invoke("booking-complete", {
    body: input,
  });
  if (error) throw error;
  return data;
}
