import { supabase } from "@/integrations/supabase/client";

/**
 * Rate-limit OTP requests per phone number.
 * Throws if more than maxAttempts in the window.
 */
export async function checkOtpAbuse(
  phone: string,
  windowMinutes = 10,
  maxAttempts = 5
) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { data, error } = await (supabase as any)
    .from("phone_otp_sessions")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", cutoff);

  if (error) throw error;

  if ((data?.length ?? 0) >= maxAttempts) {
    throw new Error("Too many OTP requests. Please wait before trying again.");
  }
}
