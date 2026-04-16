/**
 * wallet-pin — Server-side PIN management with Argon2id hashing
 * Actions: set_pin, change_pin, verify_pin, check_status, request_reset, reset_pin, update_daily_limit
 * Uses hash-wasm for Argon2id (WASM-based, edge-compatible)
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { argon2id, argon2Verify } from "npm:hash-wasm@4.11.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { redisGet, redisSet, redisIncr, redisExpire } from "../_shared/redis-client.ts";
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900;
const OTP_TTL_SECONDS = 600;
const OTP_LENGTH = 6;

const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 4096,
  hashLength: 32,
  outputType: "encoded" as const,
};

async function generateSalt(): Promise<Uint8Array> {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return buf;
}

async function pbkdf2HashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2-sha256:600000:${saltHex}:${hashHex}`;
}

async function hashPin(pin: string): Promise<string> {
  try {
    const salt = await generateSalt();
    const result = await argon2id({
      password: pin,
      salt,
      ...ARGON2_PARAMS,
    });
    return result;
  } catch (e) {
    console.error("[wallet-pin] Argon2id hashing failed (WASM module error), falling back to PBKDF2-SHA256:", e);
    return await pbkdf2HashPin(pin);
  }
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$argon2id$")) {
    try {
      return await argon2Verify({ password: pin, hash: storedHash });
    } catch (e) {
      console.error("[wallet-pin] Argon2id verify failed:", e);
      return false;
    }
  }
  if (storedHash.startsWith("pbkdf2-sha256:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 4) return false;
    const [, iterStr, saltHex, expectedHash] = parts;
    const iterations = parseInt(iterStr, 10);
    if (!iterations || !saltHex || !expectedHash) return false;
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hashHex.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hashHex.length; i++) {
      diff |= hashHex.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  }
  if (storedHash.startsWith("hmac-sha256:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, salt, expectedHash] = parts;
    if (!salt) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(pin));
    const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) {
      diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  }
  const [salt] = storedHash.split(":");
  if (!salt) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(pin));
  const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  const computed = `${salt}:${hash}`;
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

function generateOtp(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const num = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
  return String(num % 1000000).padStart(OTP_LENGTH, "0");
}

function validatePin(pin: unknown): string | null {
  if (!pin || typeof pin !== "string" || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return "PIN must be exactly 6 digits";
  }
  if (/^(.)\1{5}$/.test(pin)) return "PIN cannot be all the same digit";
  if ("012345678901234567890".includes(pin) || "098765432109876543210".includes(pin)) {
    return "PIN cannot be a sequential number";
  }
  return null;
}

Deno.serve(withEdgeLogging("wallet-pin", async (req, logger) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[wallet-pin] FATAL: Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variable");
    return new Response(
      JSON.stringify({ error: "Server configuration error. Please contact support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payloadB64url = serviceRoleKey.split(".")[1];
    if (!payloadB64url) throw new Error("Key has no JWT payload segment");
    const padded = payloadB64url.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payloadB64url.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload.role !== "service_role") {
      console.error("[wallet-pin] FATAL: SUPABASE_SERVICE_ROLE_KEY is not a service_role key. Got role:", payload.role);
      return new Response(
        JSON.stringify({ error: "Server configuration error — invalid service key. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("[wallet-pin] FATAL: Could not validate service role key:", e);
    return new Response(
      JSON.stringify({ error: "Server configuration error — key validation failed. Please contact support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "wallet-pin");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const body = await req.json();
    const { action, pin, current_pin, token: resetToken } = body;

    if (action === "check_status") {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        console.error("[wallet-pin] check_status profile error:", profileErr.message);
        return jsonResponse({ error: "Failed to check PIN status" }, 500);
      }

      const hasPin = !!profile?.wallet_pin_hash;
      const lockedUntil = profile?.wallet_pin_locked_until;
      const isLocked = lockedUntil && new Date(lockedUntil) > new Date();

      return jsonResponse({
        has_pin: hasPin,
        is_locked: !!isLocked,
        locked_until: isLocked ? lockedUntil : null,
        failed_attempts: profile?.wallet_pin_failed_attempts || 0,
      });
    }

    if (action === "set_pin") {
      const pinError = validatePin(pin);
      if (pinError) return jsonResponse({ error: pinError }, 400);

      const { data: existing } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", userId)
        .maybeSingle();

      if (existing?.wallet_pin_hash) {
        return jsonResponse({ error: "PIN already set. Use 'change_pin' action to update your PIN." }, 400);
      }

      const hash = await hashPin(pin);
      const hashMethod = hash.startsWith("$argon2id$") ? "argon2id" : "pbkdf2-sha256";

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ wallet_pin_hash: hash, wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null })
        .eq("id", userId);

      if (updateErr) {
        console.error("[wallet-pin] set_pin update error:", updateErr.message, "code:", updateErr.code, "details:", updateErr.details);
        return jsonResponse({ error: "Failed to save PIN. Please try again.", hint: "database_update_failed" }, 500);
      }

      const { data: verify } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", userId)
        .maybeSingle();

      if (!verify?.wallet_pin_hash) {
        console.error("[wallet-pin] set_pin: post-update verification failed for user:", userId);
        return jsonResponse({ error: "Failed to save PIN — profile not found.", hint: "profile_not_found" }, 500);
      }

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_set", metadata_json: { method: hashMethod },
      }).then(() => {}).catch((e: Error) => console.warn("[wallet-pin] audit log failed:", e.message));

      return jsonResponse({ success: true });
    }

    if (action === "change_pin") {
      if (!current_pin || typeof current_pin !== "string") {
        return jsonResponse({ error: "Current PIN is required to change your PIN" }, 400);
      }

      const pinError = validatePin(pin);
      if (pinError) return jsonResponse({ error: pinError }, 400);

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr || !profile?.wallet_pin_hash) {
        return jsonResponse({ error: "No existing PIN found. Use 'set_pin' to create one." }, 400);
      }

      if (profile.wallet_pin_locked_until && new Date(profile.wallet_pin_locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(profile.wallet_pin_locked_until).getTime() - Date.now()) / 1000);
        return jsonResponse({
          error: `Wallet locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
          locked: true,
          locked_until: profile.wallet_pin_locked_until,
        }, 403);
      }

      const currentMatches = await verifyPin(current_pin, profile.wallet_pin_hash);
      if (!currentMatches) {
        const { data: lockoutResult, error: lockoutErr } = await supabase.rpc("atomic_pin_fail_increment", {
          p_user_id: userId,
          p_max_attempts: MAX_ATTEMPTS,
          p_lockout_seconds: LOCKOUT_SECONDS,
        });

        if (lockoutErr) {
          console.error("[wallet-pin] atomic_pin_fail_increment error:", lockoutErr.message);
          return jsonResponse({ error: "Server error during PIN verification" }, 500);
        }

        const row = Array.isArray(lockoutResult) ? lockoutResult[0] : lockoutResult;
        const newAttempts = row?.new_attempts ?? (profile.wallet_pin_failed_attempts || 0) + 1;
        const isLocked = row?.is_locked ?? newAttempts >= MAX_ATTEMPTS;

        await supabase.from("audit_logs").insert({
          user_id: userId, action: "wallet_pin_change_failed",
          metadata_json: { attempts: newAttempts, locked: isLocked },
        }).then(() => {}).catch(() => {});

        if (isLocked) {
          return jsonResponse({
            error: `Wallet locked for ${Math.ceil(LOCKOUT_SECONDS / 60)} minutes due to too many failed attempts`,
            locked: true, locked_until: row?.locked_until,
          }, 403);
        }

        return jsonResponse({
          error: `Current PIN is incorrect (${MAX_ATTEMPTS - newAttempts} attempts remaining)`,
          attempts_remaining: MAX_ATTEMPTS - newAttempts,
        }, 403);
      }

      const hash = await hashPin(pin);
      const hashMethod = hash.startsWith("$argon2id$") ? "argon2id" : "pbkdf2-sha256";

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ wallet_pin_hash: hash, wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null })
        .eq("id", userId);

      if (updateErr) {
        console.error("[wallet-pin] change_pin update error:", updateErr.message, "code:", updateErr.code, "details:", updateErr.details);
        return jsonResponse({ error: "Failed to save new PIN. Please try again.", hint: "database_update_failed" }, 500);
      }

      const { data: verify } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", userId)
        .maybeSingle();

      if (!verify?.wallet_pin_hash) {
        console.error("[wallet-pin] change_pin: post-update verification failed for user:", userId);
        return jsonResponse({ error: "Failed to save new PIN — profile not found.", hint: "profile_not_found" }, 500);
      }

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_changed", metadata_json: { method: hashMethod },
      }).then(() => {}).catch(() => {});

      return jsonResponse({ success: true });
    }

    if (action === "verify_pin") {
      if (!pin || typeof pin !== "string" || pin.length !== 6) {
        return jsonResponse({ verified: false, error: "Enter your 6-digit PIN" }, 400);
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        console.error("[wallet-pin] verify_pin profile error:", profileErr.message);
        return jsonResponse({ verified: false, error: "Failed to verify PIN. Please try again." }, 500);
      }

      if (!profile?.wallet_pin_hash) {
        return jsonResponse({ verified: false, error: "No PIN set" }, 400);
      }

      if (profile.wallet_pin_locked_until && new Date(profile.wallet_pin_locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(profile.wallet_pin_locked_until).getTime() - Date.now()) / 1000);
        await supabase.from("audit_logs").insert({
          user_id: userId, action: "wallet_pin_attempt_while_locked", metadata_json: { remaining_seconds: remaining },
        }).then(() => {}).catch(() => {});
        return jsonResponse({
          verified: false, locked: true, locked_until: profile.wallet_pin_locked_until,
          error: `Wallet locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
        });
      }

      const matches = await verifyPin(pin, profile.wallet_pin_hash);

      if (matches) {
        await supabase.rpc("atomic_pin_success_reset", { p_user_id: userId })
          .then(() => {}).catch(() => {});
        await supabase.from("audit_logs").insert({
          user_id: userId, action: "wallet_pin_verified", metadata_json: {},
        }).then(() => {}).catch(() => {});
        return jsonResponse({ verified: true });
      }

      const { data: lockoutResult, error: lockoutErr } = await supabase.rpc("atomic_pin_fail_increment", {
        p_user_id: userId,
        p_max_attempts: MAX_ATTEMPTS,
        p_lockout_seconds: LOCKOUT_SECONDS,
      });

      if (lockoutErr) {
        console.error("[wallet-pin] atomic_pin_fail_increment error:", lockoutErr.message);
      }

      const row = Array.isArray(lockoutResult) ? lockoutResult[0] : lockoutResult;
      const newAttempts = row?.new_attempts ?? (profile.wallet_pin_failed_attempts || 0) + 1;
      const isLocked = row?.is_locked ?? newAttempts >= MAX_ATTEMPTS;

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_failed", metadata_json: { attempts: newAttempts, locked: isLocked },
      }).then(() => {}).catch(() => {});

      if (isLocked) {
        return jsonResponse({
          verified: false, locked: true, locked_until: row?.locked_until,
          error: `Wallet locked for ${Math.ceil(LOCKOUT_SECONDS / 60)} minutes`,
        });
      }

      return jsonResponse({
        verified: false, attempts_remaining: MAX_ATTEMPTS - newAttempts,
        error: `Wrong PIN (${MAX_ATTEMPTS - newAttempts} attempts left)`,
      });
    }

    if (action === "request_reset") {
      if (!userEmail) {
        return jsonResponse({ error: "No email address associated with your account. Contact support to reset your PIN." }, 400);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.wallet_pin_hash) {
        return jsonResponse({ error: "No PIN set. Use 'set_pin' to create one." }, 400);
      }

      const rateLimitKey = `pin_reset:${userId}`;
      const existing = await redisGet<number>(rateLimitKey);
      if (existing && existing > 2) {
        return jsonResponse({ error: "Too many reset requests. Please wait before trying again." }, 429);
      }

      const otp = generateOtp();
      const otpKey = `pin_otp:${userId}`;
      await redisSet(otpKey, otp, OTP_TTL_SECONDS);
      await redisIncr(rateLimitKey);
      await redisExpire(rateLimitKey, 3600);

      try {
        const { error: emailErr } = await supabase.functions.invoke("send-email", {
          body: {
            to: userEmail,
            subject: "Wallet PIN Reset Code",
            html: `<p>Your PIN reset code is: <strong>${otp}</strong></p><p>This code expires in ${OTP_TTL_SECONDS / 60} minutes.</p><p>If you didn't request this, please secure your account immediately.</p>`,
          },
        });
        if (emailErr) {
          console.error("[wallet-pin] send-email returned error:", emailErr);
          return jsonResponse({ error: "Failed to send reset email. Please try again." }, 500);
        }
      } catch (e) {
        console.error("[wallet-pin] Failed to send reset email:", e);
        return jsonResponse({ error: "Failed to send reset email. Please try again." }, 500);
      }

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_reset_requested",
        metadata_json: { email: userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3") },
      }).then(() => {}).catch(() => {});

      return jsonResponse({ success: true, message: "Reset code sent to your email." });
    }

    if (action === "reset_pin") {
      if (!resetToken || typeof resetToken !== "string") {
        return jsonResponse({ error: "Reset code is required" }, 400);
      }

      const pinError = validatePin(pin);
      if (pinError) return jsonResponse({ error: pinError }, 400);

      const otpKey = `pin_otp:${userId}`;
      const otpAttemptKey = `pin_otp_attempts:${userId}`;
      const MAX_OTP_ATTEMPTS = 5;

      const otpAttempts = await redisIncr(otpAttemptKey);
      if (otpAttempts === 1) {
        await redisExpire(otpAttemptKey, OTP_TTL_SECONDS);
      }
      if (otpAttempts !== null && otpAttempts > MAX_OTP_ATTEMPTS) {
        await redisSet(otpKey, "", 1);
        return jsonResponse({ error: "Too many failed attempts. Please request a new reset code." }, 429);
      }

      const storedOtp = await redisGet<string>(otpKey);

      if (!storedOtp) {
        return jsonResponse({ error: "Reset code has expired or was not requested. Please request a new one." }, 400);
      }

      if (storedOtp !== resetToken) {
        return jsonResponse({ error: "Invalid reset code. Please check and try again.", attempts_remaining: MAX_OTP_ATTEMPTS - (otpAttempts || 0) }, 400);
      }

      const hash = await hashPin(pin);
      const hashMethod = hash.startsWith("$argon2id$") ? "argon2id" : "pbkdf2-sha256";

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ wallet_pin_hash: hash, wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null })
        .eq("id", userId);

      if (updateErr) {
        console.error("[wallet-pin] reset_pin update error:", updateErr.message, "code:", updateErr.code, "details:", updateErr.details);
        return jsonResponse({ error: "Failed to reset PIN. Please try again.", hint: "database_update_failed" }, 500);
      }

      const { data: verify } = await supabase
        .from("profiles")
        .select("wallet_pin_hash")
        .eq("id", userId)
        .maybeSingle();

      if (!verify?.wallet_pin_hash) {
        console.error("[wallet-pin] reset_pin: post-update verification failed for user:", userId);
        return jsonResponse({ error: "Failed to reset PIN — profile not found.", hint: "profile_not_found" }, 500);
      }

      await redisSet(otpKey, "", 1);
      await redisSet(otpAttemptKey, "", 1);

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_reset_completed", metadata_json: { method: "otp_email", hash: hashMethod },
      }).then(() => {}).catch(() => {});

      return jsonResponse({ success: true });
    }

    if (action === "update_daily_limit") {
      const { limit } = body;
      if (!limit || typeof limit !== "number" || limit < 100) {
        return jsonResponse({ error: "Limit must be a number >= 100" }, 400);
      }

      const { data: trustProfile } = await supabase
        .from("profiles")
        .select("kyc_status, device_bound, contacts_synced, security_flag")
        .eq("id", userId)
        .maybeSingle();

      const { count: completedTxCount } = await supabase
        .from("unified_wallet_transactions")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId)
        .eq("status", "completed");

      let trustScore = 0;
      if (userData.user.phone) trustScore += 10;
      if (userData.user.email_confirmed_at) trustScore += 5;
      const kycStatus = trustProfile?.kyc_status || "not_started";
      if (kycStatus === "completed" || kycStatus === "approved") trustScore += 25;
      else if (kycStatus === "submitted" || kycStatus === "pending") trustScore += 10;
      if (trustProfile?.device_bound) trustScore += 5;
      if (trustProfile?.contacts_synced) trustScore += 5;
      if (userData.user.created_at) {
        const ageDays = Math.floor((Date.now() - new Date(userData.user.created_at).getTime()) / 86400000);
        if (ageDays >= 365) trustScore += 15;
        else if (ageDays >= 90) trustScore += 10;
        else if (ageDays >= 30) trustScore += 5;
        else if (ageDays >= 7) trustScore += 2;
      }
      const txCount = completedTxCount || 0;
      if (txCount >= 100) trustScore += 15;
      else if (txCount >= 50) trustScore += 10;
      else if (txCount >= 10) trustScore += 5;
      else if (txCount >= 1) trustScore += 2;
      trustScore = Math.min(trustScore, 100);

      let maxAllowed = 5000;
      if (trustScore >= 85) maxAllowed = 100000;
      else if (trustScore >= 60) maxAllowed = 20000;
      else if (trustScore >= 30) maxAllowed = 5000;
      else if (trustScore >= 10) maxAllowed = 2000;

      const clampedLimit = Math.min(limit, maxAllowed);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ daily_transfer_limit: clampedLimit })
        .eq("id", userId);

      if (updateErr) {
        console.error("[wallet-pin] update_daily_limit error:", updateErr.message, "code:", updateErr.code, "details:", updateErr.details);
        return jsonResponse({ error: "Failed to update limit. Please try again.", hint: "database_update_failed" }, 500);
      }

      const { data: verify } = await supabase
        .from("profiles")
        .select("daily_transfer_limit")
        .eq("id", userId)
        .maybeSingle();

      if (!verify) {
        console.error("[wallet-pin] update_daily_limit: post-update verification failed for user:", userId);
        return jsonResponse({ error: "Failed to update limit — profile not found.", hint: "profile_not_found" }, 500);
      }

      return jsonResponse({ success: true, limit: clampedLimit, max_allowed: maxAllowed });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[wallet-pin] Error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}));
