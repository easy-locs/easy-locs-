/**
 * addLoyaltyPoints — Award loyalty points after ride completion.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
interface LoyaltyRow {
  user_id: string;
  points: number;
  tier: string;
  updated_at: string;
}

export async function addLoyaltyPoints(params: {
  userId: string;
  points: number;
  referenceId?: string;
}) {
  const { userId, points, referenceId } = params;

  const { data } = await cFrom("user_loyalty")
    .select("*")
    .eq("user_id", userId)
    .single();

  const row = data as LoyaltyRow | null;
  const currentPoints = row?.points ?? 0;
  const newPoints = currentPoints + points;

  const tier =
    newPoints > 1000 ? "gold" :
    newPoints > 300 ? "silver" :
    "bronze";

  await cFrom("user_loyalty").upsert({
    user_id: userId,
    points: newPoints,
    tier,
    updated_at: new Date().toISOString(),
  });

  await cFrom("loyalty_transactions").insert({
    user_id: userId,
    points,
    type: "ride_reward",
    reference_id: referenceId ?? null,
  });

  return { ok: true, points: newPoints, tier };
}
