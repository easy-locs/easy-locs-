import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/auth/guest-session";

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function startGuestCheckoutSession(params: {
  workspaceId?: string;
  cartId?: string;
  phone: string;
}) {
  const guestId = getGuestId();

  const { data, error } = await (supabase as any)
    .from("guest_checkout_sessions")
    .insert({
      workspace_id: params.workspaceId ?? null,
      guest_id: guestId,
      cart_id: params.cartId ?? null,
      phone: params.phone,
      status: "started",
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function sendPhoneOtp(params: { phone: string }) {
  const guestId = getGuestId();
  const otpCode = generateOtpCode();

  const { data, error } = await (supabase as any)
    .from("phone_otp_sessions")
    .insert({
      phone: params.phone,
      otp_code: otpCode,
      status: "pending",
      attempts: 0,
      guest_id: guestId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[OTP DEV ONLY]", params.phone, otpCode);
  return data;
}

export async function verifyPhoneOtp(params: {
  phone: string;
  otpCode: string;
}) {
  const { data: session, error } = await (supabase as any)
    .from("phone_otp_sessions")
    .select("*")
    .eq("phone", params.phone)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!session) throw new Error("OTP session not found");
  if (new Date(session.expires_at).getTime() < Date.now()) throw new Error("OTP expired");

  if (session.otp_code !== params.otpCode) {
    await (supabase as any)
      .from("phone_otp_sessions")
      .update({ attempts: Number(session.attempts ?? 0) + 1 })
      .eq("id", session.id);
    throw new Error("Invalid OTP");
  }

  await (supabase as any)
    .from("phone_otp_sessions")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", session.id);

  await (supabase as any)
    .from("guest_checkout_sessions")
    .update({ status: "otp_verified" })
    .eq("guest_id", session.guest_id)
    .eq("phone", params.phone)
    .eq("status", "started");

  return true;
}
