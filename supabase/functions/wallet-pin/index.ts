/**
 * wallet-pin — Server-side PIN management with HMAC-SHA256 hashing
 * Actions: set_pin, verify_pin, check_status
 * Uses Web Crypto API (native in Deno edge runtime, no Worker needed)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 300;

// ── Crypto helpers using Web Crypto API ──
async function generateSalt(): Promise<string> {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(pin));
  const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hash}`;
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt] = storedHash.split(":");
  if (!salt) return false;
  const computed = await hashPin(pin, salt);
  // Constant-time comparison
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { action, pin } = await req.json();

    // ─── check_status ───
    if (action === "check_status") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", userId)
        .maybeSingle();

      const hasPin = !!profile?.wallet_pin_hash;
      const lockedUntil = profile?.wallet_pin_locked_until;
      const isLocked = lockedUntil && new Date(lockedUntil) > new Date();

      return new Response(JSON.stringify({
        has_pin: hasPin,
        is_locked: !!isLocked,
        locked_until: isLocked ? lockedUntil : null,
        failed_attempts: profile?.wallet_pin_failed_attempts || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── set_pin ───
    if (action === "set_pin") {
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return new Response(JSON.stringify({ error: "PIN must be exactly 6 digits" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const salt = await generateSalt();
      const hash = await hashPin(pin, salt);

      await supabase
        .from("profiles")
        .update({ wallet_pin_hash: hash, wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null })
        .eq("id", userId);

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_set", metadata_json: { method: "hmac-sha256" },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── verify_pin ───
    if (action === "verify_pin") {
      if (!pin || pin.length !== 6) {
        return new Response(JSON.stringify({ verified: false, error: "Enter your 6-digit PIN" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.wallet_pin_hash) {
        return new Response(JSON.stringify({ verified: false, error: "No PIN set" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check lockout
      if (profile.wallet_pin_locked_until && new Date(profile.wallet_pin_locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(profile.wallet_pin_locked_until).getTime() - Date.now()) / 1000);
        await supabase.from("audit_logs").insert({
          user_id: userId, action: "wallet_pin_attempt_while_locked", metadata_json: { remaining_seconds: remaining },
        });
        return new Response(JSON.stringify({
          verified: false, locked: true, locked_until: profile.wallet_pin_locked_until,
          error: `Wallet locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const matches = await verifyPin(pin, profile.wallet_pin_hash);

      if (matches) {
        await supabase.from("profiles").update({ wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null }).eq("id", userId);
        await supabase.from("audit_logs").insert({ user_id: userId, action: "wallet_pin_verified", metadata_json: {} });
        return new Response(JSON.stringify({ verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Failed attempt
      const newAttempts = (profile.wallet_pin_failed_attempts || 0) + 1;
      const updates: Record<string, any> = { wallet_pin_failed_attempts: newAttempts };
      if (newAttempts >= MAX_ATTEMPTS) {
        updates.wallet_pin_locked_until = new Date(Date.now() + LOCKOUT_SECONDS * 1000).toISOString();
      }
      await supabase.from("profiles").update(updates).eq("id", userId);
      await supabase.from("audit_logs").insert({
        user_id: userId, action: "wallet_pin_failed", metadata_json: { attempts: newAttempts, locked: newAttempts >= MAX_ATTEMPTS },
      });

      if (newAttempts >= MAX_ATTEMPTS) {
        return new Response(JSON.stringify({
          verified: false, locked: true, locked_until: updates.wallet_pin_locked_until, error: "Wallet locked for 5 minutes",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        verified: false, attempts_remaining: MAX_ATTEMPTS - newAttempts,
        error: `Wrong PIN (${MAX_ATTEMPTS - newAttempts} attempts left)`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wallet-pin] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});