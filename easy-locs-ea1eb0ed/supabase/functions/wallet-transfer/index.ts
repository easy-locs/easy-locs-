/**
 * wallet-transfer — Backend-authoritative atomic P2P wallet transfer.
 * Uses atomic_wallet_transfer RPC for single-transaction execution.
 * Handles: auth, PIN verification (inline), limit checks, audit.
 * No partial success — all or nothing.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** HMAC-SHA256 PIN hash (matches wallet-pin edge function) */
async function hashPin(pin: string): Promise<string> {
  const secret = Deno.env.get("WALLET_PIN_SECRET") || "default-wallet-pin-secret";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pin));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // ── Auth ──
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return err("Unauthorized", 401);
    const { data: ud, error: ue } = await sb.auth.getUser(token);
    if (ue || !ud.user) return err("Not authenticated", 401);
    const callerUserId = ud.user.id;

    const body = await req.json();
    const {
      sender_user_id,
      receiver_user_id,
      amount,
      currency = "AED",
      idempotency_key,
      source = "manual",
      note,
      pin,
    } = body;

    // ── Validation ──
    if (!sender_user_id || !receiver_user_id) return err("sender_user_id and receiver_user_id required");
    if (sender_user_id !== callerUserId) return err("Cannot transfer from another user's wallet", 403);
    if (sender_user_id === receiver_user_id) return err("Cannot transfer to yourself");
    if (!amount || typeof amount !== "number" || amount <= 0) return err("Amount must be a positive number");
    if (amount > 50000) return err("Transfer exceeds maximum limit");

    // ── Verify receiver exists ──
    const { data: receiverProfile } = await sb
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", receiver_user_id)
      .maybeSingle();
    if (!receiverProfile) return err("Recipient not found — cannot transfer to unknown user");

    // ── PIN verification (inline, no cross-function call) ──
    const { data: senderProfile } = await sb
      .from("profiles")
      .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
      .eq("id", sender_user_id)
      .maybeSingle();

    if (senderProfile?.wallet_pin_hash) {
      // Check lock
      if (senderProfile.wallet_pin_locked_until && new Date(senderProfile.wallet_pin_locked_until) > new Date()) {
        return err("Wallet PIN is temporarily locked. Try again later.", 403);
      }
      if (!pin) return err("Wallet PIN required for this transfer");

      const pinHash = await hashPin(pin);
      if (pinHash !== senderProfile.wallet_pin_hash) {
        const attempts = (senderProfile.wallet_pin_failed_attempts || 0) + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
        await sb.from("profiles").update({
          wallet_pin_failed_attempts: attempts,
          wallet_pin_locked_until: lockUntil,
        }).eq("id", sender_user_id);
        return err(`Invalid PIN (${attempts}/5 attempts)`, 403);
      }
      // Reset failed attempts on success
      if (senderProfile.wallet_pin_failed_attempts > 0) {
        await sb.from("profiles").update({ wallet_pin_failed_attempts: 0, wallet_pin_locked_until: null }).eq("id", sender_user_id);
      }
    }

    // ── Limit check ──
    const { data: limits } = await sb
      .from("wallet_limit_profiles")
      .select("single_tx_limit, daily_send_limit")
      .eq("user_id", sender_user_id)
      .maybeSingle();

    if (limits) {
      if (amount > Number(limits.single_tx_limit || 100)) {
        return err(`Amount exceeds single transaction limit of ${limits.single_tx_limit} ${currency}`);
      }
      // Daily check: sum today's outgoing
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: todayEntries } = await sb
        .from("wallet_ledger_entries")
        .select("amount")
        .eq("status", "posted")
        .eq("direction", "out")
        .eq("entry_type", "transfer")
        .gte("created_at", todayStart.toISOString())
        .in("wallet_account_id", (await sb.from("wallet_accounts").select("id").eq("owner_user_id", sender_user_id).eq("currency", currency)).data?.map((w: any) => w.id) || []);
      const todayTotal = (todayEntries || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      if (todayTotal + amount > Number(limits.daily_send_limit || 500)) {
        return err(`Would exceed daily send limit of ${limits.daily_send_limit} ${currency}`);
      }
    }

    // ── Execute atomic transfer via RPC ──
    const { data: result, error: rpcError } = await sb.rpc("atomic_wallet_transfer", {
      p_sender_user_id: sender_user_id,
      p_receiver_user_id: receiver_user_id,
      p_amount: amount,
      p_currency: currency,
      p_idempotency_key: idempotency_key || null,
      p_source: source,
      p_note: note || null,
    });

    if (rpcError) {
      console.error("[wallet-transfer] RPC error:", rpcError.message);
      // Parse specific errors from RPC
      if (rpcError.message.includes("Insufficient balance")) return err(rpcError.message);
      if (rpcError.message.includes("Sender wallet not found")) return err("Wallet not found for this currency");
      return err(rpcError.message || "Transfer failed", 500);
    }

    const receiverName = receiverProfile.full_name || receiverProfile.username || "Unknown";

    return ok({
      success: true,
      transfer_id: result?.transfer_id,
      duplicate: result?.duplicate || false,
      amount,
      currency,
      receiver_name: receiverName,
      receiver_user_id,
    });
  } catch (e) {
    console.error("[wallet-transfer] Error:", e);
    return err(e instanceof Error ? e.message : "Transfer failed", 500);
  }
});
