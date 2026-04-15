/**
 * AUTH DEPENDENCY: phone-identity.ts — Phone OTP verification via Supabase Auth.
 * Contact points:
 *   - PhoneOTPFlow.tsx: sendPhoneVerification, verifyPhoneCode
 *   - identity-activation-pipeline.ts: normalizePhone
 *   - Calls: db.auth.signInWithOtp (phone), db.auth.verifyOtp (sms)
 *   - Reads: db.from("profiles") for isNewUser detection
 */
import { db } from "@/services/db";
import { normalizePhone } from "@/lib/security/otp-hardened";

export interface PhoneOtpResult {
  success: boolean;
  error?: string;
}

export interface PhoneVerifyResult {
  valid: boolean;
  userId?: string;
  isNewUser?: boolean;
  reason?: string;
}

const TWILIO_NOT_CONFIGURED_PATTERNS = [
  "phone provider is not enabled",
  "sms provider",
  "twilio",
  "phone signups are disabled",
  "phone logins are disabled",
];

function isTwilioConfigError(message: string): boolean {
  const lower = message.toLowerCase();
  return TWILIO_NOT_CONFIGURED_PATTERNS.some((p) => lower.includes(p));
}

export async function sendPhoneVerification(phone: string): Promise<PhoneOtpResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 8) {
    throw new Error("Invalid phone number");
  }

  const { error } = await db.auth.signInWithOtp({ phone: normalized });

  if (error) {
    if (isTwilioConfigError(error.message)) {
      throw new Error(
        "Phone authentication is not configured yet. Please set up Twilio credentials in your Supabase dashboard under Authentication → Providers → Phone."
      );
    }
    throw error;
  }

  return { success: true };
}

export async function verifyPhoneCode(phone: string, code: string): Promise<PhoneVerifyResult> {
  const normalized = normalizePhone(phone);

  const { data, error } = await db.auth.verifyOtp({
    phone: normalized,
    token: code,
    type: "sms",
  });

  if (error) {
    if (error.message?.toLowerCase().includes("expired")) {
      return { valid: false, reason: "Verification code expired." };
    }
    if (error.message?.toLowerCase().includes("invalid") || error.message?.toLowerCase().includes("incorrect")) {
      return { valid: false, reason: "Incorrect verification code." };
    }
    return { valid: false, reason: error.message || "Verification failed." };
  }

  if (!data.user) {
    return { valid: false, reason: "Verification failed — no user returned." };
  }

  if (!data.session) {
    return { valid: false, reason: "Verification succeeded but no session was created. Please try again." };
  }

  const { data: existingProfile } = await db
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  const isNewUser = !existingProfile;

  return {
    valid: true,
    userId: data.user.id,
    isNewUser,
  };
}

export { normalizePhone };
