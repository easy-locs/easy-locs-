/**
 * addLoyaltyPoints — Award loyalty points after ride completion.
 */
import { supabase } from "@/integrations/supabase/client";

export async function addLoyaltyPoints(params: {
  userId: string;
  points: number;
  referenceId?: string;
}) {
  const { userId, points, referenceId } = params;

  const { data } = await supabase
    .from("user_loyalty" as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  const currentPoints = (data as any)?.points ?? 0;
  const newPoints = currentPoints + points;

  const tier =
    newPoints > 1000 ? "gold" :
    newPoints > 300 ? "silver" :
    "bronze";

  await supabase.from("user_loyalty" as any).upsert({
    user_id: userId,
    points: newPoints,
    tier,
    updated_at: new Date().toISOString(),
  } as any);

  await supabase.from("loyalty_transactions" as any).insert({
    user_id: userId,
    points,
    type: "ride_reward",
    reference_id: referenceId ?? null,
  } as any);

  return { ok: true, points: newPoints, tier };
}
