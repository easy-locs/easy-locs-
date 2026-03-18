/**
 * Refund request engine — creates refund requests with auto-approval logic.
 */
import { supabase } from "@/integrations/supabase/client";
import { shouldAutoApproveRefund } from "@/lib/refunds/auto-refund-policy";
import { applyWalletCredit } from "@/lib/wallet/apply-wallet-credit";

export async function createRefundRequest(params: {
  userId: string;
  contextType: string;
  contextId?: string | null;
  amount: number;
  currency?: string;
  reason?: string;
  riskScore?: number;
}) {
  const autoApprove = shouldAutoApproveRefund({
    contextType: params.contextType,
    amount: params.amount,
    reason: params.reason,
    riskScore: params.riskScore ?? 0,
  });

  const { data, error } = await supabase
    .from("refund_requests" as any)
    .insert({
      user_id: params.userId,
      context_type: params.contextType,
      context_id: params.contextId ?? null,
      amount: params.amount,
      currency: params.currency ?? "AED",
      reason: params.reason ?? null,
      refund_status: autoApprove ? "approved" : "pending",
      auto_approved: autoApprove,
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  if (autoApprove && data) {
    await applyWalletCredit({
      userId: params.userId,
      amount: params.amount,
      direction: "credit",
      reason: "auto_refund",
      contextType: params.contextType,
      contextId: params.contextId ?? null,
    });

    await supabase
      .from("refund_requests" as any)
      .update({ refund_status: "paid", processed_at: new Date().toISOString() } as any)
      .eq("id", (data as any).id);
  }

  return { ok: true, autoApproved: autoApprove, refund: data };
}
