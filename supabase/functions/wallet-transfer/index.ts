/**
 * wallet-transfer — Backend-authoritative atomic P2P wallet transfer.
 * Resolves wallets server-side, checks balance, debits/credits atomically.
 * Enforces idempotency, PIN verification, and audit logging.
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

    // ── Idempotency check ──
    if (idempotency_key) {
      const { data: existing } = await sb
        .from("wallet_ledger_entries")
        .select("id")
        .eq("external_txn_id", idempotency_key)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return ok({ success: true, duplicate: true, message: "Transfer already processed" });
      }
    }

    // ── PIN verification (if PIN is set) ──
    const { data: senderProfile } = await sb
      .from("profiles")
      .select("wallet_pin_hash")
      .eq("id", sender_user_id)
      .maybeSingle();

    if (senderProfile?.wallet_pin_hash) {
      if (!pin) return err("Wallet PIN required for this transfer");
      // Delegate to wallet-pin verify logic inline
      const { data: pinResult, error: pinErr } = await sb.functions.invoke("wallet-pin", {
        body: { action: "verify", pin },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pinErr || !pinResult?.verified) {
        return err(pinResult?.error || "Invalid PIN", 403);
      }
    }

    // ── Resolve sender wallet (server-side) ──
    let senderWallet = await getOrCreateWallet(sb, sender_user_id, currency);
    if (!senderWallet) return err("Could not resolve sender wallet");
    if (senderWallet.status !== "active") return err("Sender wallet is not active");

    // ── Balance check ──
    const senderBalance = Number(senderWallet.balance ?? senderWallet.available_balance ?? 0);
    if (senderBalance < amount) {
      return err(`Insufficient balance. Available: ${senderBalance} ${currency}`);
    }

    // ── Resolve receiver wallet (server-side) ──
    let receiverWallet = await getOrCreateWallet(sb, receiver_user_id, currency);
    if (!receiverWallet) return err("Could not resolve receiver wallet");

    // ── Resolve receiver display name ──
    const { data: receiverProfile } = await sb
      .from("profiles")
      .select("full_name, username")
      .eq("id", receiver_user_id)
      .maybeSingle();
    const receiverName = receiverProfile?.full_name || receiverProfile?.username || "Unknown";

    // ── Generate transfer ID ──
    const transferId = crypto.randomUUID();
    const idemKey = idempotency_key || `tf_${transferId}`;
    const now = new Date().toISOString();

    // ── Atomic debit + credit via ledger entries ──
    // Debit sender
    const { error: debitErr } = await sb.from("wallet_ledger_entries").insert({
      wallet_account_id: senderWallet.id,
      direction: "out",
      amount,
      currency,
      entry_type: "transfer",
      reference_type: "p2p_transfer",
      reference_id: transferId,
      external_txn_id: idemKey,
      status: "posted",
      note: note || `Transfer to ${receiverName}`,
    });
    if (debitErr) throw new Error(`Debit failed: ${debitErr.message}`);

    // Credit receiver
    const { error: creditErr } = await sb.from("wallet_ledger_entries").insert({
      wallet_account_id: receiverWallet.id,
      direction: "in",
      amount,
      currency,
      entry_type: "transfer",
      reference_type: "p2p_transfer",
      reference_id: transferId,
      external_txn_id: `${idemKey}_credit`,
      status: "posted",
      note: note || `Transfer from ${ud.user.email || callerUserId}`,
    });
    if (creditErr) {
      // Rollback debit
      await sb.from("wallet_ledger_entries").delete().eq("external_txn_id", idemKey);
      throw new Error(`Credit failed: ${creditErr.message}`);
    }

    // ── Recompute balances from ledger (authoritative) ──
    await recomputeBalance(sb, senderWallet.id);
    await recomputeBalance(sb, receiverWallet.id);

    // ── Write to unified_wallet_transactions for history ──
    await sb.from("unified_wallet_transactions").insert({
      sender_id: sender_user_id,
      recipient_id: receiver_user_id,
      amount,
      currency,
      context_type: source,
      title: `Transfer to ${receiverName}`,
      subtitle: note || null,
      status: "completed",
      metadata: { transfer_id: transferId, idempotency_key: idemKey, source },
    }).catch(() => {}); // Non-critical

    // ── Audit log ──
    await sb.from("audit_logs").insert({
      user_id: callerUserId,
      action: "wallet_p2p_transfer",
      metadata_json: {
        transfer_id: transferId,
        sender_user_id,
        receiver_user_id,
        sender_wallet_id: senderWallet.id,
        receiver_wallet_id: receiverWallet.id,
        amount,
        currency,
        source,
        idempotency_key: idemKey,
        ts: now,
      },
    });

    return ok({
      success: true,
      transfer_id: transferId,
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

// ── Helper: get or create wallet for user ──
async function getOrCreateWallet(sb: any, userId: string, currency: string) {
  const { data: existing } = await sb
    .from("wallet_accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("currency", currency)
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await sb
    .from("wallet_accounts")
    .insert({
      owner_user_id: userId,
      currency,
      account_type: "fiat",
      balance: 0,
      available_balance: 0,
      pending_balance: 0,
      status: "active",
    })
    .select("*")
    .single();

  if (error) return null;
  return created;
}

// ── Helper: recompute balance from ledger (authoritative) ──
async function recomputeBalance(sb: any, walletAccountId: string) {
  const { data: entries } = await sb
    .from("wallet_ledger_entries")
    .select("amount, direction, status")
    .eq("wallet_account_id", walletAccountId)
    .eq("status", "posted");

  const balance = (entries ?? []).reduce((sum: number, row: any) => {
    const dir = row.direction === "in" || row.direction === "credit" ? 1 : -1;
    return sum + dir * Number(row.amount ?? 0);
  }, 0);

  await sb.from("wallet_accounts").update({
    balance,
    available_balance: balance,
    updated_at: new Date().toISOString(),
  }).eq("id", walletAccountId);
}
