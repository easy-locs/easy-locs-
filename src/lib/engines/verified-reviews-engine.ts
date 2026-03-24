/**
 * Verified Reviews Engine — Only allows reviews from verified purchasers.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface ReviewInput {
  userId: string;
  orderId: string;
  merchantId: string;
  rating: number;
  comment?: string;
}

export async function checkReviewEligibility(userId: string, orderId: string, merchantId: string): Promise<{ eligible: boolean; reason?: string }> {
  // Check order exists, is completed, belongs to user and merchant
  const { data: order, error } = await db
    .from("orders")
    .select("id, status, user_id, shop_id, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return { eligible: false, reason: "Order not found" };
  if (order.user_id !== userId) return { eligible: false, reason: "Order does not belong to you" };
  if (order.shop_id !== merchantId) return { eligible: false, reason: "Order does not match merchant" };
  if (!["completed", "delivered"].includes(order.status)) return { eligible: false, reason: "Order not yet completed" };
  if (order.payment_status && order.payment_status !== "paid") return { eligible: false, reason: "Payment not confirmed" };

  // Check duplicate
  const { data: existing } = await db
    .from("verified_reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) return { eligible: false, reason: "Already reviewed this order" };

  return { eligible: true };
}

export async function submitVerifiedReview(input: ReviewInput): Promise<{ success: boolean; error?: string }> {
  const eligibility = await checkReviewEligibility(input.userId, input.orderId, input.merchantId);
  if (!eligibility.eligible) return { success: false, error: eligibility.reason };

  if (input.rating < 1 || input.rating > 5) return { success: false, error: "Rating must be 1-5" };

  const { error } = await db
    .from("verified_reviews")
    .insert({
      user_id: input.userId,
      order_id: input.orderId,
      merchant_id: input.merchantId,
      rating: input.rating,
      comment: input.comment?.slice(0, 1000) ?? null,
      verified: true,
    });

  if (error) {
    if (error.code === "23505") return { success: false, error: "Already reviewed this order" };
    console.error("[verified-reviews] insert error", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
