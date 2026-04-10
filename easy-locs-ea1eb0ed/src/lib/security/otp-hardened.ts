/**
 * Hardened OTP system — hash-based, expiring, attempt-limited.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

/** Simple hash for OTP (client-side). In production, hash server-side. */
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + "_easylocs_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a 6-digit OTP */
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;

export interface OtpSession {
  id: string;
  channel: "phone" | "email";
  target: string;
  otp_hash: string;
  status: string;
  attempt_count: number;
  expires_at: string;
  created_at: string;
}

/** Create and send an OTP. Returns the raw OTP for dev (in prod, only sent via SMS/email). */
export async function createOtpSession(
  channel: "phone" | "email",
  target: string
): Promise<{ sessionId: string; otp: string }> {
  // Rate limit: max 5 sessions per target in 30 min
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await db
    .from("phone_otp_sessions")
    .select("id")
    .eq("phone", target)
    .gte("created_at", cutoff);

  if ((recent?.length ?? 0) >= MAX_ATTEMPTS) {
    throw new Error("Too many verification attempts. Please wait before trying again.");
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("phone_otp_sessions")
    .insert({
      phone: target,
      otp_hash: otpHash,
      status: "pending",
      attempt_count: 0,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Send via edge function (phone) or log (email)
  if (channel === "phone") {
    await supabase.functions.invoke("send-otp", { body: { phone: target, otp } });
  } else {
    console.log(`[EMAIL OTP] Code ${otp} → ${target}`);
  }

  return { sessionId: data.id, otp };
}

/** Verify an OTP against the latest pending session */
export async function verifyOtp(
  target: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  // Find latest pending session
  const { data: session } = await db
    .from("phone_otp_sessions")
    .select("id, otp_hash, status, attempt_count, expires_at")
    .eq("phone", target)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { valid: false, reason: "No pending verification session." };

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    await db
      .from("phone_otp_sessions")
      .update({ status: "expired" })
      .eq("id", session.id);
    return { valid: false, reason: "Verification code expired." };
  }

  // Check max attempts
  if (session.attempt_count >= MAX_ATTEMPTS) {
    await db
      .from("phone_otp_sessions")
      .update({ status: "blocked" })
      .eq("id", session.id);
    return { valid: false, reason: "Too many incorrect attempts." };
  }

  // Hash the provided code and compare
  const codeHash = await hashOtp(code);
  const isValid = codeHash === session.otp_hash;

  await db
    .from("phone_otp_sessions")
    .update({
      status: isValid ? "verified" : "pending",
      attempt_count: session.attempt_count + 1,
    })
    .eq("id", session.id);

  if (!isValid) {
    return { valid: false, reason: "Incorrect verification code." };
  }

  return { valid: true };
}

/** Normalize phone for comparison */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^00/, "+");
}

/** Normalize email for comparison */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Check if verification contact matches imported merchant contact */
export function contactMatchesMerchant(
  method: "phone" | "email",
  value: string,
  merchant: { phone?: string | null; email?: string | null }
): boolean {
  if (method === "phone" && merchant.phone) {
    return normalizePhone(value) === normalizePhone(merchant.phone);
  }
  if (method === "email" && merchant.email) {
    return normalizeEmail(value) === normalizeEmail(merchant.email);
  }
  return false;
}
