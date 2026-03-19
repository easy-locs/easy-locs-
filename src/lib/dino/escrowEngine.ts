/**
 * DINO V13 — Escrow Engine
 * Secure Payments + Delivery Validation + Dispute System
 * Integrates with existing: escrow_payments, storefront_p2p_transactions,
 * wallet_accounts, wallet_ledger_entries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export interface EscrowRequest {
  orderId: string;        // maps to escrow_payments.job_id or p2p transaction
  buyerId: string;        // payer_id
  sellerId: string;       // payee_id
  orgId: string;
  amount: number;
  currency: string;
  buyerWalletId: string;
  sellerWalletId: string;
  context: "delivery" | "p2p";
}

export interface DeliveryProof {
  orderId: string;
  photoUrl?: string;
  signature?: string;
  geoLat?: number;
  geoLng?: number;
}

export type EscrowStatus = "held" | "released" | "disputed" | "refunded";

const AUTO_RELEASE_HOURS = 2;

// =============================
// 1) CREATE ESCROW (PAYMENT LOCK)
// =============================

export async function createEscrow(req: EscrowRequest): Promise<string> {
  // 1) Lock buyer funds via ledger debit
  const { error: debitErr } = await supabase.from("wallet_ledger_entries").insert({
    wallet_account_id: req.buyerWalletId,
    amount: req.amount,
    currency: req.currency,
    direction: "debit",
    entry_type: "escrow_hold",
    reference_id: req.orderId,
    reference_type: req.context === "p2p" ? "p2p_transaction" : "delivery_job",
    status: "completed",
    metadata: { escrow: true, seller: req.sellerId } as Json,
  });
  if (debitErr) throw new Error(`Escrow debit failed: ${debitErr.message}`);

  // 2) Create escrow record
  const { data, error } = await supabase.from("escrow_payments").insert({
    job_id: req.orderId,
    payer_id: req.buyerId,
    payee_id: req.sellerId,
    org_id: req.orgId,
    amount: req.amount,
    currency: req.currency,
    status: "held",
    held_at: new Date().toISOString(),
    metadata_json: { context: req.context, buyer_wallet: req.buyerWalletId, seller_wallet: req.sellerWalletId } as Json,
  }).select("id").single();

  if (error) throw new Error(`Escrow creation failed: ${error.message}`);

  // 3) If P2P, update transaction escrow status
  if (req.context === "p2p") {
    await supabase.from("storefront_p2p_transactions")
      .update({ escrow_status: "held" })
      .eq("id", req.orderId);
  }

  return data.id;
}

// =============================
// 2) CONFIRM DELIVERY
// =============================

export async function confirmDelivery(proof: DeliveryProof): Promise<{ success: boolean }> {
  // Validate at least one proof element
  if (!proof.photoUrl && !proof.signature && !proof.geoLat) {
    throw new Error("At least one proof required: photo, signature, or geolocation");
  }

  // Find the held escrow
  const { data: escrow, error: fetchErr } = await supabase
    .from("escrow_payments")
    .select("id, payee_id, amount, currency, metadata_json")
    .eq("job_id", proof.orderId)
    .eq("status", "held")
    .maybeSingle();

  if (fetchErr) throw new Error(`Escrow lookup failed: ${fetchErr.message}`);
  if (!escrow) throw new Error("No held escrow found for this order");

  // Release funds
  await releaseEscrow(escrow.id);

  // Record learning event with delivery proof metadata
  await supabase.from("dino_learning_events").insert([{
    event_type: "delivery_confirmed",
    entity_id: proof.orderId,
    entity_type: "escrow",
    metric: "delivery_proof",
    metadata_json: {
      hasPhoto: !!proof.photoUrl,
      hasSignature: !!proof.signature,
      hasGeo: !!proof.geoLat,
      geoLat: proof.geoLat,
      geoLng: proof.geoLng,
    } as unknown as Json,
    new_value: 1,
    previous_value: 0,
  }]);

  return { success: true };
}

// =============================
// 3) RELEASE FUNDS
// =============================

export async function releaseEscrow(escrowId: string, reason?: string): Promise<void> {
  const { data: escrow, error } = await supabase
    .from("escrow_payments")
    .select("id, job_id, payee_id, amount, currency, status, metadata_json")
    .eq("id", escrowId)
    .single();

  if (error || !escrow) throw new Error("Escrow not found");
  if (escrow.status !== "held") throw new Error(`Cannot release escrow in "${escrow.status}" status`);

  const meta = (escrow.metadata_json as Record<string, unknown>) ?? {};
  const sellerWalletId = meta.seller_wallet as string | undefined;

  // Credit seller via ledger
  if (sellerWalletId) {
    await supabase.from("wallet_ledger_entries").insert({
      wallet_account_id: sellerWalletId,
      amount: escrow.amount,
      currency: escrow.currency,
      direction: "credit",
      entry_type: "escrow_release",
      reference_id: escrow.job_id,
      reference_type: "escrow",
      status: "completed",
      metadata: { escrow_id: escrowId, reason: reason ?? "delivery_confirmed" } as Json,
    });
  }

  // Update escrow status
  await supabase.from("escrow_payments")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
      release_reason: reason ?? "delivery_confirmed",
    })
    .eq("id", escrowId);

  // Update P2P transaction if applicable
  const context = meta.context as string | undefined;
  if (context === "p2p") {
    await supabase.from("storefront_p2p_transactions")
      .update({ escrow_status: "released", buyer_confirmed: true, completed_at: new Date().toISOString() })
      .eq("id", escrow.job_id);
  }
}

// =============================
// 4) AUTO RELEASE (TIMEOUT)
// =============================

export async function autoReleaseExpiredEscrows(): Promise<number> {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 3600 * 1000).toISOString();

  const { data } = await supabase
    .from("escrow_payments")
    .select("id")
    .eq("status", "held")
    .lt("held_at", cutoff)
    .limit(50);

  if (!data?.length) return 0;

  let released = 0;
  for (const row of data) {
    try {
      await releaseEscrow(row.id, "auto_timeout");
      released++;
    } catch {
      // Skip failed releases, will retry next cycle
    }
  }

  if (released > 0) {
    await supabase.from("dino_learning_events").insert([{
      event_type: "v13_auto_release",
      entity_id: "batch",
      entity_type: "escrow",
      metric: "auto_released",
      metadata_json: { count: released, cutoffHours: AUTO_RELEASE_HOURS } as unknown as Json,
      new_value: released,
      previous_value: 0,
    }]);
  }

  return released;
}

// =============================
// 5) DISPUTE SYSTEM
// =============================

export async function openDispute(orderId: string, reason: string): Promise<void> {
  // Update escrow to disputed
  const { error: escrowErr } = await supabase
    .from("escrow_payments")
    .update({ status: "disputed" })
    .eq("job_id", orderId)
    .eq("status", "held");

  if (escrowErr) throw new Error(`Dispute escrow update failed: ${escrowErr.message}`);

  // Update P2P transaction if applicable
  await supabase.from("storefront_p2p_transactions")
    .update({ escrow_status: "disputed", dispute_reason: reason })
    .eq("id", orderId);

  // Create admin alert for dispute resolution
  await supabase.from("admin_alerts").insert({
    alert_type: "escrow_dispute",
    severity: "high",
    status: "new",
    title: `Dispute opened: ${orderId}`,
    body: reason,
    entity_id: orderId,
    entity_type: "escrow",
    metadata_json: { reason, opened_at: new Date().toISOString() } as Json,
  });
}

// =============================
// 6) REFUND SYSTEM
// =============================

export async function refundEscrow(escrowId: string, reason: string): Promise<void> {
  const { data: escrow, error } = await supabase
    .from("escrow_payments")
    .select("id, job_id, payer_id, amount, currency, status, metadata_json")
    .eq("id", escrowId)
    .single();

  if (error || !escrow) throw new Error("Escrow not found");
  if (escrow.status !== "held" && escrow.status !== "disputed") {
    throw new Error(`Cannot refund escrow in "${escrow.status}" status`);
  }

  const meta = (escrow.metadata_json as Record<string, unknown>) ?? {};
  const buyerWalletId = meta.buyer_wallet as string | undefined;

  // Credit buyer via ledger (reversal)
  if (buyerWalletId) {
    await supabase.from("wallet_ledger_entries").insert({
      wallet_account_id: buyerWalletId,
      amount: escrow.amount,
      currency: escrow.currency,
      direction: "credit",
      entry_type: "escrow_refund",
      reference_id: escrow.job_id,
      reference_type: "escrow",
      status: "completed",
      metadata: { escrow_id: escrowId, reason } as Json,
    });
  }

  // Update escrow
  await supabase.from("escrow_payments")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: reason,
    })
    .eq("id", escrowId);

  // Update P2P transaction
  const context = meta.context as string | undefined;
  if (context === "p2p") {
    await supabase.from("storefront_p2p_transactions")
      .update({ escrow_status: "refunded", status: "refunded" })
      .eq("id", escrow.job_id);
  }
}
