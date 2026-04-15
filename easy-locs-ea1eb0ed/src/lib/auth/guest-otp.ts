import { db } from "@/services/db";
import { getGuestId } from "@/lib/guest-session";
import { checkOtpAbuse } from "@/lib/security/fraud-otp";
import { verifyOtp } from "@/lib/security/otp-hardened";

export async function startGuestCheckoutSession(params: {
  workspaceId?: string;
  cartId?: string;
  phone: string;
}) {
  const guestId = getGuestId();

  const { data, error } = await db
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

export async function sendPhoneOtp(params: { phone: string; channel?: "sms" | "whatsapp" }) {
  await checkOtpAbuse(params.phone);

  const { data, error: invokeErr } = await db.functions.invoke("send-otp", {
    body: { phone: params.phone, channel: params.channel || "sms" },
  });

  if (invokeErr) {
    throw new Error("Failed to send verification code. Please try again.");
  }

  if (data && !data.success) {
    if (data.error_code === "SMS_NOT_CONFIGURED") {
      throw new Error("SMS service is not configured.");
    }
    if (data.error_code === "RATE_LIMITED") {
      throw new Error("Too many attempts. Please wait.");
    }
    throw new Error(data.message || "Failed to send SMS.");
  }

  return { success: true };
}

export async function verifyPhoneOtp(params: {
  phone: string;
  otpCode: string;
}) {
  const result = await verifyOtp(params.phone, params.otpCode);

  if (!result.valid) {
    const reason = result.reason || "Verification failed";
    throw new Error(reason);
  }

  const guestId = getGuestId();
  await db
    .from("guest_checkout_sessions")
    .update({ status: "otp_verified" })
    .eq("guest_id", guestId)
    .eq("phone", params.phone)
    .eq("status", "started");

  return true;
}
