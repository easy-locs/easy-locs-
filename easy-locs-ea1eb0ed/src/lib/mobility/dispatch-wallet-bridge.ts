/**
 * dispatch-wallet-bridge — Handle wallet operations for ride payments.
 *
 * SECURITY: All mutations require authenticated user, amount validation,
 * and idempotency checks to prevent duplicate charges or credits.
 * MIGRATION TARGET: Should be moved to server-side edge function.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { logger } from "@/lib/monitoring";

const MAX_RIDE_AMOUNT = 10_000;
const MIN_COMMISSION_RATE = 0.10;
const MAX_COMMISSION_RATE = 0.40;
const PLATFORM_COMMISSION_RATE = 0.20;

async function requireAuth(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Wallet operation requires authentication");
  return user.id;
}

function validateRideAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid ride amount: ${amount}`);
  }
  if (amount > MAX_RIDE_AMOUNT) {
    throw new Error(`Ride amount ${amount} exceeds safety limit`);
  }
}

export async function bridgeWalletOnComplete(
  jobId: string,
  customerId: string,
  amount: number,
  currency: string,
) {
  try {
    const authUserId = await requireAuth();
    validateRideAmount(amount);

    if (!customerId || !jobId) {
      logger.error("[WALLET_SECURITY] Missing customer/job ID for ride payment", { jobId, customerId });
      return;
    }

    logger.info("[WALLET_AUDIT] Processing ride payment", {
      jobId, customerId, amount, currency, authUser: authUserId,
    });

    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference_id", `ride_${jobId}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      logger.warn("[WALLET_SECURITY] Duplicate ride payment blocked", { jobId });
      return;
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance, currency")
      .eq("user_id", customerId)
      .maybeSingle();

    const walletBalance = wallet ? Number((wallet as any).balance ?? 0) : 0;

    let paymentMethod: "wallet" | "card" | "cash" = "card";
    let walletDeducted = 0;
    let cardCharged = amount;

    if (wallet && walletBalance >= amount) {
      paymentMethod = "wallet";
      walletDeducted = amount;
      cardCharged = 0;
    } else if (wallet && walletBalance > 0) {
      walletDeducted = walletBalance;
      cardCharged = Number((amount - walletBalance).toFixed(2));
    }

    const txnRecord = {
      user_id: customerId,
      type: "ride_payment",
      amount: -amount,
      currency,
      status: "completed",
      reference_id: `ride_${jobId}`,
      description: `Ride payment`,
      metadata: {
        job_id: jobId,
        payment_method: paymentMethod,
        wallet_deducted: walletDeducted,
        card_charged: cardCharged,
        auth_user: authUserId,
      },
      created_at: new Date().toISOString(),
    };

    const { error: txnError } = await supabase
      .from("wallet_transactions")
      .insert(txnRecord as any);

    if (txnError) {
      logger.error("[WALLET] Failed to record ride transaction", { jobId, error: txnError.message });
      return;
    }

    if (wallet && walletDeducted > 0) {
      const newBalance = Math.max(0, Number((walletBalance - walletDeducted).toFixed(2)));
      await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", (wallet as any).id);

      logger.info("[WALLET_AUDIT] Customer wallet debited for ride", {
        customerId, walletId: (wallet as any).id, deducted: walletDeducted, newBalance,
      });
    }

    const { data: job } = await supabase
      .from("mobility_jobs")
      .select("rider_user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (job && (job as any).rider_user_id) {
      const riderUserId = (job as any).rider_user_id;
      const riderEarnings = Number((amount * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2));

      const { data: existingEarning } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", `ride_earning_${jobId}`)
        .limit(1)
        .maybeSingle();

      if (existingEarning) {
        logger.warn("[WALLET_SECURITY] Duplicate rider earning blocked", { jobId, riderUserId });
        return;
      }

      const { data: riderWallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", riderUserId)
        .maybeSingle();

      await supabase.from("wallet_transactions").insert({
        user_id: riderUserId,
        type: "ride_earning",
        amount: riderEarnings,
        currency,
        status: "completed",
        reference_id: `ride_earning_${jobId}`,
        description: `Ride earning`,
        metadata: {
          job_id: jobId,
          gross_fare: amount,
          commission_rate: PLATFORM_COMMISSION_RATE,
          net_earning: riderEarnings,
          auth_user: authUserId,
        },
        created_at: new Date().toISOString(),
      } as any);

      if (riderWallet) {
        const currentRiderBalance = Number((riderWallet as any).balance ?? 0);
        const newRiderBalance = Number((currentRiderBalance + riderEarnings).toFixed(2));
        await supabase
          .from("wallets")
          .update({
            balance: newRiderBalance,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (riderWallet as any).id);

        logger.info("[WALLET_AUDIT] Rider wallet credited", {
          riderUserId, walletId: (riderWallet as any).id, credited: riderEarnings, newBalance: newRiderBalance,
        });
      }

      void eventBus.emit("wallet.rider_paid", {
        jobId,
        riderId: riderUserId,
        amount: riderEarnings,
        currency,
      });
    }

    void eventBus.emit("wallet.ride_charged", {
      jobId,
      customerId,
      amount,
      currency,
      method: paymentMethod,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[WALLET] bridgeWalletOnComplete failed", { jobId, error: msg });
  }
}

export async function estimateWalletCoverage(
  customerId: string,
  estimatedFare: number,
): Promise<{ canCover: boolean; walletBalance: number; remaining: number }> {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", customerId)
    .maybeSingle();

  const balance = wallet ? Number((wallet as any).balance ?? 0) : 0;

  return {
    canCover: balance >= estimatedFare,
    walletBalance: balance,
    remaining: Math.max(0, estimatedFare - balance),
  };
}
