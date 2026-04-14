import { db as supabase } from "@/services/db";
import { executeFastPath } from "@/lib/runtime/path-discipline";

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
  const result = await executeFastPath("booking", async () => {
    const { data, error } = await supabase.functions.invoke("booking-create", {
      body: input,
    });
    if (error) throw error;
    return data;
  });
  if (!result.ok) {
    throw new Error("Booking creation failed after budget-exceeded fallback");
  }
  return result.result;
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
