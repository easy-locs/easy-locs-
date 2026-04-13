import { db } from "@/services/db";
import { normalizePhone } from "@/lib/security/otp-hardened";

const MAX_OTP_SESSIONS_PER_30MIN = 5;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + "_easylocs_phone_identity_v2");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

export interface PhoneOtpResult {
  sessionId: string;
  expiresAt: string;
  devOtp?: string;
}

export async function sendPhoneVerification(phone: string): Promise<PhoneOtpResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 8) {
    throw new Error("Invalid phone number");
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await db
    .from("phone_otp_sessions")
    .select("id")
    .eq("phone", normalized)
    .gte("created_at", cutoff);

  if ((recent?.length ?? 0) >= MAX_OTP_SESSIONS_PER_30MIN) {
    throw new Error("Too many verification attempts. Please wait before trying again.");
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("phone_otp_sessions")
    .insert({
      phone: normalized,
      otp_hash: otpHash,
      otp_code: otpHash,
      status: "pending",
      attempts: 0,
      attempt_count: 0,
      expires_at: expiresAt,
      purpose: "identity_activation",
    })
    .select("id")
    .single();

  if (error) throw error;

  try {
    await db.functions.invoke("send-otp", {
      body: { phone: normalized, otp },
    });
  } catch (e) {
    console.warn("[PhoneIdentity] Edge function call failed, OTP still stored:", e);
  }

  const result: PhoneOtpResult = { sessionId: data.id, expiresAt };
  if (import.meta.env.DEV) {
    console.log("[PhoneIdentity DEV]", normalized, otp);
    result.devOtp = otp;
  }
  return result;
}

export interface PhoneVerifyResult {
  valid: boolean;
  reason?: string;
  sessionId?: string;
}

export async function verifyPhoneCode(phone: string, code: string): Promise<PhoneVerifyResult> {
  const normalized = normalizePhone(phone);

  const { data: session } = await db
    .from("phone_otp_sessions")
    .select("id, otp_hash, otp_code, status, attempts, attempt_count, expires_at")
    .eq("phone", normalized)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { valid: false, reason: "No pending verification session." };

  if (new Date(session.expires_at) < new Date()) {
    await db.from("phone_otp_sessions").update({ status: "expired" }).eq("id", session.id);
    return { valid: false, reason: "Verification code expired." };
  }

  const attempts = Number(session.attempts ?? session.attempt_count ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    await db.from("phone_otp_sessions").update({ status: "blocked" }).eq("id", session.id);
    return { valid: false, reason: "Too many incorrect attempts." };
  }

  const codeHash = await hashOtp(code);
  const storedHash = session.otp_hash || session.otp_code;
  const isValid = codeHash === storedHash;

  await db
    .from("phone_otp_sessions")
    .update({
      status: isValid ? "verified" : "pending",
      attempts: attempts + 1,
      attempt_count: attempts + 1,
      ...(isValid ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq("id", session.id);

  if (!isValid) {
    return { valid: false, reason: "Incorrect verification code." };
  }

  return { valid: true, sessionId: session.id };
}

export async function signInOrSignUpWithPhone(phone: string): Promise<{
  userId: string;
  isNewUser: boolean;
}> {
  const normalized = normalizePhone(phone);

  const { data: existingProfile } = await db
    .from("profiles")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: signInData, error: signInError } = await db.auth.signInWithOtp({
      phone: normalized,
    });
    if (signInError) {
      console.warn("[PhoneIdentity] Supabase phone OTP fallback:", signInError.message);
    }
    void signInData;
    return { userId: existingProfile.id, isNewUser: false };
  }

  const { data: signUpData, error: signUpError } = await db.auth.signUp({
    phone: normalized,
    password: crypto.randomUUID(),
    options: {
      data: { phone: normalized, signup_method: "phone" },
    },
  });

  if (signUpError) throw signUpError;
  if (!signUpData.user) throw new Error("Failed to create account");

  return { userId: signUpData.user.id, isNewUser: true };
}

export { normalizePhone };
