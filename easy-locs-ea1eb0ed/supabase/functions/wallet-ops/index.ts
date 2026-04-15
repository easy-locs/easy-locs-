/**
 * wallet-ops — Production-hardened server-side wallet operations.
 * Actions: authorize, capture, settle, reverse, approve_review.
 * PIN actions (set_pin, verify_pin, check_status) are handled by wallet-pin edge function.
 * Currency-aware: reads currency from wallet/order, never hardcodes.
 * Uses CANONICAL wallet schema: transaction_type, source_wallet_id, destination_wallet_id, order_id.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { argon2Verify } from "npm:hash-wasm@4.11.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900;
const HIGH_VALUE_THRESHOLD = 5000;
const ANOMALY_SCORE_THRESHOLD = 40;

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$argon2id$")) {
    try {
      return await argon2Verify({ password: pin, hash: storedHash });
    } catch (e) {
      console.error("[wallet-ops] Argon2id verify failed:", e);
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

function ok(data: unknown, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(msg: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function audit(sb: any, userId: string, action: string, meta: Record<string, unknown> = {}) {
  await sb.from("audit_logs").insert({ user_id: userId, action: `wallet_${action}`, metadata_json: { ...meta, ts: new Date().toISOString() } });
}

async function computeAnomalyScore(sb: any, walletId: string, amount: number): Promise<{ score: number; flags: string[] }> {
  const flags: string[] = [];
  let score = 0;
  if (amount >= HIGH_VALUE_THRESHOLD) { score += 25; flags.push("high_value"); }
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await sb.from("wallet_ledger_entries").select("id").eq("wallet_account_id", walletId).gte("created_at", fiveMinAgo);
  if (recent && recent.length > 3) { score += 30; flags.push("rapid_transactions"); }
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 5) { score += 15; flags.push("late_night"); }
  const { data: w } = await sb.from("wallet_accounts").select("balance_cash").eq("id", walletId).single();
  if (w && amount > Number(w.balance_cash) * 0.9) { score += 20; flags.push("near_full_drain"); }
  return { score, flags };
}

async function getWalletCurrency(sb: any, walletId: string): Promise<string> {
  const { data } = await sb.from("wallet_accounts").select("currency").eq("id", walletId).single();
  return data?.currency || "AED";
}

async function getOwnerUserId(sb: any, walletId: string): Promise<string | null> {
  const { data } = await sb.from("wallet_accounts").select("owner_user_id").eq("id", walletId).single();
  return data?.owner_user_id ?? null;
}


Deno.serve(withEdgeLogging("wallet-ops", async (req, logger) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let action: string | undefined;
  let userId: string | undefined;
  let body: Record<string, any> | undefined;

  try {
    const rlResult = await checkServerRateLimit(req, "wallet-ops");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return err("Unauthorized", 401, corsHeaders);
    const { data: ud, error: ue } = await sb.auth.getUser(token);
    if (ue || !ud.user) return err("Not authenticated", 401, corsHeaders);
    userId = ud.user.id;

    body = await req.json();
    action = body.action;

    if (action === "check_status" || action === "set_pin" || action === "verify_pin") {
      return err("This action has moved to the wallet-pin edge function. Use wallet-pin instead.", 410, corsHeaders);
    }

    // ═══ AUTHORIZE ═══
    if (action === "authorize") {
      const { order_id, customer_wallet_id, amount, pin } = body;
      if (!order_id || !customer_wallet_id || !amount || !pin) return err("Missing required fields", 400, corsHeaders);

      const { data: existingOrder } = await sb.from("orders").select("wallet_status").eq("id", order_id).single();
      if (existingOrder?.wallet_status === "authorized" || existingOrder?.wallet_status === "captured" || existingOrder?.wallet_status === "settled") {
        return ok({ already_processed: true, wallet_status: existingOrder.wallet_status }, corsHeaders);
      }

      const walletOwnerUserId = await getOwnerUserId(sb, customer_wallet_id);
      if (!walletOwnerUserId) return err("Wallet not found", 400, corsHeaders);

      if (walletOwnerUserId !== userId) return err("Forbidden", 403, corsHeaders);

      const { data: profile } = await sb.from("profiles")
        .select("wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until")
        .eq("id", walletOwnerUserId)
        .single();

      if (!profile?.wallet_pin_hash) return err("No PIN set on wallet", 400, corsHeaders);

      if (profile.wallet_pin_locked_until && new Date(profile.wallet_pin_locked_until) > new Date()) {
        return err("Wallet locked", 400, corsHeaders);
      }

      const pinOk = await verifyPin(pin, profile.wallet_pin_hash);
      if (!pinOk) {
        const { error: lockErr } = await sb.rpc("atomic_pin_fail_increment", {
          p_user_id: walletOwnerUserId,
          p_max_attempts: MAX_PIN_ATTEMPTS,
          p_lockout_seconds: LOCKOUT_SECONDS,
        });
        if (lockErr) {
          console.error("[wallet-ops] atomic_pin_fail_increment failed:", lockErr);
          return err("PIN verification failed", 500, corsHeaders);
        }
        await audit(sb, userId, "authorize_pin_failed", { order_id });
        return err("Invalid PIN", 400, corsHeaders);
      }

      const { error: resetErr } = await sb.rpc("atomic_pin_success_reset", { p_user_id: walletOwnerUserId });
      if (resetErr) {
        console.error("[wallet-ops] atomic_pin_success_reset failed (fail-open: authorization proceeds, stale lockout counters may persist):", resetErr);
      }

      const anomaly = await computeAnomalyScore(sb, customer_wallet_id, amount);
      if (anomaly.score >= ANOMALY_SCORE_THRESHOLD) {
        await audit(sb, userId, "anomaly_detected", { order_id, ...anomaly });
      }

      const currency = body.currency || await getWalletCurrency(sb, customer_wallet_id);

      const { data: result, error: rpcError } = await sb.rpc("wallet_authorize", {
        p_order_id: order_id,
        p_customer_wallet_id: customer_wallet_id,
        p_amount: amount,
        p_currency: currency,
        p_anomaly_score: anomaly.score,
        p_anomaly_flags: anomaly.flags,
      });

      if (rpcError) return err(rpcError.message || "Authorization failed", 500, corsHeaders);
      if (result?.error) return err(result.error, 400, corsHeaders);

      await audit(sb, userId, "payment_authorized", {
        order_id, amount, currency,
        transaction_id: result.transaction_id,
        anomaly_score: anomaly.score,
        review_required: result.review_required,
      });
      return ok({ success: true, transaction_id: result.transaction_id, review_required: result.review_required }, corsHeaders);
    }

    // ═══ CAPTURE ═══
    if (action === "capture") {
      const { order_id } = body;
      if (!order_id) return err("order_id required", 400, corsHeaders);

      const { data: o } = await sb.from("orders").select("wallet_status, payment_status").eq("id", order_id).single();
      if (!o) return err("Order not found", 400, corsHeaders);
      if (o.wallet_status === "captured" || o.wallet_status === "settled") return ok({ already_processed: true, wallet_status: o.wallet_status }, corsHeaders);
      if (o.wallet_status !== "authorized") return err(`Cannot capture from status: ${o.wallet_status}`, 400, corsHeaders);

      await sb.from("orders").update({ payment_status: "held_in_escrow", wallet_status: "captured" }).eq("id", order_id);

      await sb.from("wallet_transactions").update({ status: "captured" }).eq("order_id", order_id).eq("transaction_type", "order_authorization");

      await audit(sb, userId, "payment_captured", { order_id });
      return ok({ success: true }, corsHeaders);
    }

    // ═══ SETTLE ═══
    if (action === "settle") {
      const { order_id } = body;
      if (!order_id) return err("order_id required", 400, corsHeaders);

      const { data: result, error: rpcError } = await sb.rpc("wallet_settle", {
        p_order_id: order_id,
      });

      if (rpcError) return err(rpcError.message || "Settlement failed", 500, corsHeaders);
      if (result?.error) return err(result.error, 400, corsHeaders);
      if (result?.already_settled) return ok({ already_settled: true }, corsHeaders);

      await audit(sb, userId, "payment_settled", { order_id, splits_count: result.splits_count });
      return ok({ success: true }, corsHeaders);
    }

    // ═══ REVERSE ═══
    if (action === "reverse") {
      const { order_id } = body;
      if (!order_id) return err("order_id required", 400, corsHeaders);

      const { data: result, error: rpcError } = await sb.rpc("wallet_reverse", {
        p_order_id: order_id,
      });

      if (rpcError) return err(rpcError.message || "Reversal failed", 500, corsHeaders);
      if (result?.error) return err(result.error, 400, corsHeaders);
      if (result?.already_reversed) return ok({ already_reversed: true }, corsHeaders);

      await audit(sb, userId, "payment_reversed", { order_id });
      return ok({ success: true }, corsHeaders);
    }

    // ═══ APPROVE REVIEW ═══
    if (action === "approve_review") {
      const { order_id } = body;
      if (!order_id) return err("order_id required", 400, corsHeaders);

      const { data: o } = await sb.from("orders").select("payment_status").eq("id", order_id).single();
      if (!o) return err("Order not found", 400, corsHeaders);
      if (o.payment_status !== "review_required") return err("Order is not flagged for review", 400, corsHeaders);

      await sb.from("orders").update({ payment_status: "authorized" }).eq("id", order_id);
      await audit(sb, userId, "review_approved", { order_id });
      return ok({ success: true }, corsHeaders);
    }

    return err("Unknown action", 400, corsHeaders);
  } catch (e) {
    console.error("[wallet-ops]", e);
    const errorMsg = e instanceof Error ? e.message : "Internal error";

    if (typeof action === "string" && ["settle", "reverse", "capture"].includes(action)) {
      try {
        await sb.rpc("insert_into_dlq", {
          p_source_system: "wallet",
          p_operation_type: action,
          p_payload: { action, user_id: userId, body },
          p_error: errorMsg,
          p_max_retries: 5,
        });
      } catch {}
    }

    return err(errorMsg, 500, corsHeaders);
  }
}));
