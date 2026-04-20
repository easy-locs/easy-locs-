import { db } from "@/services/db";

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + "_easylocs_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

export async function createOtpSession(
  channel: "phone" | "email",
  target: string,
  deliveryChannel: "sms" | "whatsapp" = "sms"
): Promise<{ sessionId: string }> {
  if (channel === "phone") {
    const { data, error: invokeErr } = await db.functions.invoke("send-otp", {
      body: { phone: target, channel: deliveryChannel },
    });

    if (invokeErr) {
      const errMsg = typeof invokeErr === "string" ? invokeErr : invokeErr?.message || "";
      if (errMsg.includes("429") || errMsg.includes("Too Many")) {
        throw new Error("Too many verification attempts. Please wait before trying again.");
      }
      throw new Error("SMS delivery failed. Please try again.");
    }

    if (data && !data.success) {
      if (data.error_code === "SMS_NOT_CONFIGURED") {
        throw new Error("SMS_NOT_CONFIGURED");
      }
      if (data.error_code === "RATE_LIMITED") {
        throw new Error("Too many verification attempts. Please wait before trying again.");
      }
      throw new Error(data.message || "SMS delivery failed.");
    }

    return { sessionId: "server-managed" };
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await db
    .from("phone_otp_sessions")
    .select("id")
    .eq("phone", target)
    .gte("created_at", cutoff);

  if ((recent?.length ?? 0) >= MAX_ATTEMPTS) {
    throw new Error("Too many verification attempts. Please wait before trying again.");
  }

  function generateOtp(): string {
    // Unbiased 6-digit code via rejection sampling over crypto.getRandomValues().
    // threshold = largest multiple of 900000 that fits in a Uint32, so every
    // value below threshold maps to exactly one output in [100000, 999999].
    const range = 900000;
    const threshold = 0x100000000 - (0x100000000 % range);
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= threshold);
    return String(100000 + (buf[0] % range));
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data: insertData, error } = await db
    .from("phone_otp_sessions")
    .insert({
      phone: target,
      otp_hash: otpHash,
      otp_code: null,
      status: "pending",
      attempts: 0,
      attempt_count: 0,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) throw error;

  return { sessionId: insertData.id };
}

export async function verifyOtp(
  target: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  const { data: session } = await db
    .from("phone_otp_sessions")
    .select("id, otp_hash, status, attempt_count, expires_at")
    .eq("phone", target)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { valid: false, reason: "No pending verification session." };

  if (new Date(session.expires_at) < new Date()) {
    await db
      .from("phone_otp_sessions")
      .update({ status: "expired" })
      .eq("id", session.id);
    return { valid: false, reason: "Verification code expired." };
  }

  if (session.attempt_count >= MAX_ATTEMPTS) {
    await db
      .from("phone_otp_sessions")
      .update({ status: "blocked" })
      .eq("id", session.id);
    return { valid: false, reason: "Too many incorrect attempts." };
  }

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

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^00/, "+");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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
