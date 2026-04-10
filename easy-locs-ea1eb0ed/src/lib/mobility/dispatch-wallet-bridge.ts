import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export async function bridgeWalletOnComplete(
  jobId: string,
  customerId: string,
  amount: number,
  currency: string,
) {
  try {
    if (!customerId || !amount || amount <= 0) return;

    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference_id", `ride_${jobId}`)
      .limit(1)
      .maybeSingle();

    if (existing) return;

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
      cardCharged = amount - walletBalance;
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
      },
      created_at: new Date().toISOString(),
    };

    const { error: txnError } = await supabase
      .from("wallet_transactions")
      .insert(txnRecord as any);

    if (txnError) return;

    if (wallet && walletDeducted > 0) {
      const newBalance = paymentMethod === "wallet" ? walletBalance - amount : 0;
      await supabase
        .from("wallets")
        .update({
          balance: Math.max(0, newBalance),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", (wallet as any).id);
    }

    const { data: job } = await supabase
      .from("mobility_jobs")
      .select("rider_user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (job && (job as any).rider_user_id) {
      const riderUserId = (job as any).rider_user_id;
      const riderEarnings = Math.round(amount * 0.80);

      const { data: existingEarning } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", `ride_earning_${jobId}`)
        .limit(1)
        .maybeSingle();

      if (existingEarning) return;

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
          commission_rate: 0.20,
          net_earning: riderEarnings,
        },
        created_at: new Date().toISOString(),
      } as any);

      if (riderWallet) {
        await supabase
          .from("wallets")
          .update({
            balance: Number((riderWallet as any).balance ?? 0) + riderEarnings,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (riderWallet as any).id);
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
  } catch {
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
