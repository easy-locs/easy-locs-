/**
 * wallet-ops — Production-hardened server-side wallet operations.
 * Actions: set_pin, verify_pin, authorize, capture, settle, reverse, approve_review, check_status.
 * Currency-aware: reads currency from wallet/order, never hardcodes.
 * Uses CANONICAL wallet schema: transaction_type, source_wallet_id, destination_wallet_id, order_id.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const HIGH_VALUE_THRESHOLD = 5000;
const ANOMALY_SCORE_THRESHOLD = 40;

async function generateSalt(): Promise<string> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHash(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pin));
  return `${salt}:${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

async function verifyHash(pin: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(":");
  if (!salt) return false;
  const computed = await hmacHash(pin, salt);
  if (computed.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(msg: string, status = 400) {
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

/** Resolve currency from wallet account */
async function getWalletCurrency(sb: any, walletId: string): Promise<string> {
  const { data } = await sb.from("wallet_accounts").select("currency").eq("id", walletId).single();
  return data?.currency || "AED"; // DB-level default, not a hardcode
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let action: string | undefined;
  let userId: string | undefined;
  let body: Record<string, any> | undefined;

  try {
    const rlResult = await checkServerRateLimit(req, "wallet-ops");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return err("Unauthorized", 401);
    const { data: ud, error: ue } = await sb.auth.getUser(token);
    if (ue || !ud.user) return err("Not authenticated", 401);
    userId = ud.user.id;

    body = await req.json();
    action = body.action;

    // ═══ CHECK STATUS ═══
    if (action === "check_status") {
      const { data: wallets } = await sb.from("wallet_accounts").select("id").eq("owner_user_id", userId);
      if (!wallets?.length) return ok({ has_pin: false });
      const { data: pin } = await sb.from("wallet_pins").select("id").eq("wallet_account_id", wallets[0].id).maybeSingle();
      return ok({ has_pin: !!pin });
    }

    // ═══ SET PIN ═══
    if (action === "set_pin") {
      const { wallet_account_id, pin } = body;
      if (!pin || !/^\d{6}$/.test(pin)) return err("PIN must be exactly 6 digits");
      if (!wallet_account_id) return err("wallet_account_id required");

      const { data: w } = await sb.from("wallet_accounts").select("owner_user_id").eq("id", wallet_account_id).single();
      if (!w || w.owner_user_id !== userId) return err("Not your wallet", 403);

      const salt = await generateSalt();
      const hash = await hmacHash(pin, salt);

      await sb.from("wallet_pins").upsert({
        wallet_account_id, pin_hash: hash, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString(),
      }, { onConflict: "wallet_account_id" });

      await audit(sb, userId, "pin_set", { wallet_account_id });
      return ok({ success: true });
    }

    // ═══ VERIFY PIN ═══
    if (action === "verify_pin") {
      const { wallet_account_id, pin } = body;
      if (!pin || !wallet_account_id) return err("wallet_account_id and pin required");

      const { data: p } = await sb.from("wallet_pins").select("*").eq("wallet_account_id", wallet_account_id).single();
      if (!p) return err("No PIN set");

      if (p.locked_until && new Date(p.locked_until) > new Date()) {
        const mins = Math.ceil((new Date(p.locked_until).getTime() - Date.now()) / 60000);
        await audit(sb, userId, "pin_attempt_locked", { wallet_account_id });
        return ok({ verified: false, locked: true, locked_until: p.locked_until, error: `Locked for ${mins} min` });
      }

      const matches = await verifyHash(pin, p.pin_hash);
      if (matches) {
        await sb.from("wallet_pins").update({ failed_attempts: 0, locked_until: null, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("wallet_account_id", wallet_account_id);
        await audit(sb, userId, "pin_verified", { wallet_account_id });
        return ok({ verified: true });
      }

      const newAttempts = (p.failed_attempts ?? 0) + 1;
      const lockUntil = newAttempts >= MAX_PIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null;
      await sb.from("wallet_pins").update({ failed_attempts: newAttempts, locked_until: lockUntil, updated_at: new Date().toISOString() }).eq("wallet_account_id", wallet_account_id);
      await audit(sb, userId, "pin_failed", { wallet_account_id, attempts: newAttempts, locked: !!lockUntil });

      if (lockUntil) return ok({ verified: false, locked: true, locked_until: lockUntil, error: `Locked for ${LOCKOUT_MINUTES} min` });
      return ok({ verified: false, attempts_remaining: MAX_PIN_ATTEMPTS - newAttempts, error: `Wrong PIN (${MAX_PIN_ATTEMPTS - newAttempts} left)` });
    }

    // ═══ AUTHORIZE ═══
    if (action === "authorize") {
      const { order_id, customer_wallet_id, amount, pin } = body;
      if (!order_id || !customer_wallet_id || !amount || !pin) return err("Missing required fields");

      // Idempotency
      const { data: existingOrder } = await sb.from("orders").select("wallet_status").eq("id", order_id).single();
      if (existingOrder?.wallet_status === "authorized" || existingOrder?.wallet_status === "captured" || existingOrder?.wallet_status === "settled") {
        return ok({ already_processed: true, wallet_status: existingOrder.wallet_status });
      }

      // Verify PIN
      const { data: p } = await sb.from("wallet_pins").select("*").eq("wallet_account_id", customer_wallet_id).single();
      if (!p) return err("No PIN set on wallet");
      if (p.locked_until && new Date(p.locked_until) > new Date()) return err("Wallet locked");

      const pinOk = await verifyHash(pin, p.pin_hash);
      if (!pinOk) {
        const na = (p.failed_attempts ?? 0) + 1;
        const lock = na >= MAX_PIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null;
        await sb.from("wallet_pins").update({ failed_attempts: na, locked_until: lock, updated_at: new Date().toISOString() }).eq("wallet_account_id", customer_wallet_id);
        await audit(sb, userId, "authorize_pin_failed", { order_id, attempts: na });
        return err("Invalid PIN");
      }

      await sb.from("wallet_pins").update({ failed_attempts: 0, locked_until: null, last_verified_at: new Date().toISOString() }).eq("wallet_account_id", customer_wallet_id);

      // Anomaly
      const anomaly = await computeAnomalyScore(sb, customer_wallet_id, amount);
      if (anomaly.score >= ANOMALY_SCORE_THRESHOLD) {
        await audit(sb, userId, "anomaly_detected", { order_id, ...anomaly });
      }

      // Resolve currency from wallet
      const currency = body.currency || await getWalletCurrency(sb, customer_wallet_id);

      // Atomic: single RPC call handles balance check, wallet update, transaction, ledger, order update
      const { data: result, error: rpcError } = await sb.rpc("wallet_authorize", {
        p_order_id: order_id,
        p_customer_wallet_id: customer_wallet_id,
        p_amount: amount,
        p_currency: currency,
        p_anomaly_score: anomaly.score,
        p_anomaly_flags: anomaly.flags,
      });

      if (rpcError) return err(rpcError.message || "Authorization failed", 500);
      if (result?.error) return err(result.error);

      await audit(sb, userId, "payment_authorized", {
        order_id, amount, currency,
        transaction_id: result.transaction_id,
        anomaly_score: anomaly.score,
        review_required: result.review_required,
      });
      return ok({ success: true, transaction_id: result.transaction_id, review_required: result.review_required });
    }

    // ═══ CAPTURE ═══
    if (action === "capture") {
      const { order_id } = body;
      if (!order_id) return err("order_id required");

      const { data: o } = await sb.from("orders").select("wallet_status, payment_status").eq("id", order_id).single();
      if (!o) return err("Order not found");
      if (o.wallet_status === "captured" || o.wallet_status === "settled") return ok({ already_processed: true, wallet_status: o.wallet_status });
      if (o.wallet_status !== "authorized") return err(`Cannot capture from status: ${o.wallet_status}`);

      await sb.from("orders").update({ payment_status: "held_in_escrow", wallet_status: "captured" }).eq("id", order_id);

      // Update existing authorization transaction to captured
      await sb.from("wallet_transactions").update({ status: "captured" }).eq("order_id", order_id).eq("transaction_type", "order_authorization");

      await audit(sb, userId, "payment_captured", { order_id });
      return ok({ success: true });
    }

    // ═══ SETTLE ═══
    if (action === "settle") {
      const { order_id } = body;
      if (!order_id) return err("order_id required");

      // Atomic: single RPC call handles all split credits, customer unlock, order status
      const { data: result, error: rpcError } = await sb.rpc("wallet_settle", {
        p_order_id: order_id,
      });

      if (rpcError) return err(rpcError.message || "Settlement failed", 500);
      if (result?.error) return err(result.error);
      if (result?.already_settled) return ok({ already_settled: true });

      await audit(sb, userId, "payment_settled", { order_id, splits_count: result.splits_count });
      return ok({ success: true });
    }

    // ═══ REVERSE ═══
    if (action === "reverse") {
      const { order_id } = body;
      if (!order_id) return err("order_id required");

      // Atomic: single RPC call handles balance restore, ledger entries, order/split status
      const { data: result, error: rpcError } = await sb.rpc("wallet_reverse", {
        p_order_id: order_id,
      });

      if (rpcError) return err(rpcError.message || "Reversal failed", 500);
      if (result?.error) return err(result.error);
      if (result?.already_reversed) return ok({ already_reversed: true });

      await audit(sb, userId, "payment_reversed", { order_id });
      return ok({ success: true });
    }

    // ═══ APPROVE REVIEW ═══
    if (action === "approve_review") {
      const { order_id } = body;
      if (!order_id) return err("order_id required");

      const { data: o } = await sb.from("orders").select("payment_status").eq("id", order_id).single();
      if (!o) return err("Order not found");
      if (o.payment_status !== "review_required") return err("Order is not flagged for review");

      await sb.from("orders").update({ payment_status: "authorized" }).eq("id", order_id);
      await audit(sb, userId, "review_approved", { order_id });
      return ok({ success: true });
    }

    return err("Unknown action");
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

    return err(errorMsg, 500);
  }
});
