import { db as supabase } from "@/services/db";

export async function serverRequestBookingRefund(input: {
  bookingId: string;
  reason?: string;
}) {
  const { data, error } = await supabase.functions.invoke("refund-request-booking", {
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function serverProcessBookingRefund(input: {
  refundRequestId: string;
}) {
  const { data, error } = await supabase.functions.invoke("refund-process-booking", {
    body: input,
  });
  if (error) throw error;
  return data;
}
