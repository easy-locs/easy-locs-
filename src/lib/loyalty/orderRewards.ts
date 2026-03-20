import { supabase } from "@/integrations/supabase/client";
import { awardLoyaltyPoints } from "@/lib/loyalty/loyaltyEngine";

export async function rewardOrderCompletion(orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, customer_user_id, total_amount, status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("Order not found");

  const current = String((order as any).status ?? "");
  if (!["completed", "delivered"].includes(current)) {
    throw new Error("Order is not completed yet");
  }

  const points = Math.max(1, Math.floor(Number((order as any).total_amount ?? 0)));
  const reward = await awardLoyaltyPoints({
    userId: (order as any).customer_user_id,
    points,
  });

  return {
    orderId,
    awardedPoints: points,
    loyalty: reward,
  };
}

export async function rewardRecentCompletedOrders(limit = 50) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .in("status", ["completed", "delivered"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];
  for (const row of data ?? []) {
    try {
      await rewardOrderCompletion((row as any).id);
      results.push({ orderId: (row as any).id, ok: true });
    } catch (err: any) {
      results.push({
        orderId: (row as any).id,
        ok: false,
        error: err.message || "Reward failed",
      });
    }
  }

  return results;
}
