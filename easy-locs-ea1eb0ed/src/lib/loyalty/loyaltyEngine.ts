import { db } from "@/services/db";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export function getLoyaltyTier(points: number): LoyaltyTier {
  if (points >= 5000) return "platinum";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

export async function getOrCreateLoyaltyAccount(userId: string) {
  const { data: existing, error: findErr } = await db
    .from("loyalty_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data, error } = await db
    .from("loyalty_accounts")
    .insert({
      user_id: userId,
      points_balance: 0,
      tier: "bronze",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function awardLoyaltyPoints(params: {
  userId: string;
  points: number;
}) {
  const account = await getOrCreateLoyaltyAccount(params.userId);
  const nextPoints = Number(account.points_balance ?? 0) + Number(params.points ?? 0);
  const nextTier = getLoyaltyTier(nextPoints);

  const { data, error } = await db
    .from("loyalty_accounts")
    .update({
      points_balance: nextPoints,
      tier: nextTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function spendLoyaltyPoints(params: {
  userId: string;
  points: number;
}) {
  const account = await getOrCreateLoyaltyAccount(params.userId);
  const nextPoints = Math.max(0, Number(account.points_balance ?? 0) - Number(params.points ?? 0));
  const nextTier = getLoyaltyTier(nextPoints);

  const { data, error } = await db
    .from("loyalty_accounts")
    .update({
      points_balance: nextPoints,
      tier: nextTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getLoyaltySnapshot(userId: string) {
  return getOrCreateLoyaltyAccount(userId);
}
