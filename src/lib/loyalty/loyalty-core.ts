import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/auth/guest-session";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getOrCreateLoyaltyAccount(params: {
  workspaceId?: string;
}) {
  const userId = await tryGetCurrentUserId();
  const guestId = userId ? null : getGuestId();

  let query = (supabase as any)
    .from("loyalty_accounts")
    .select("*");

  if (params.workspaceId) {
    query = query.eq("workspace_id", params.workspaceId);
  }

  if (userId) query = query.eq("user_id", userId);
  else query = query.eq("guest_id", guestId);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from("loyalty_accounts")
    .insert({
      workspace_id: params.workspaceId ?? null,
      user_id: userId,
      guest_id: guestId,
      points_balance: 0,
      tier: "bronze",
      lifetime_points: 0,
      total_cashback: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addLoyaltyEntry(params: {
  loyaltyAccountId: string;
  entryType: "earn" | "redeem" | "cashback" | "expire" | "adjust";
  points?: number;
  cashbackAmount?: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("loyalty_ledger")
    .insert({
      loyalty_account_id: params.loyaltyAccountId,
      entry_type: params.entryType,
      points: params.points ?? 0,
      cashback_amount: params.cashbackAmount ?? 0,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  await rebuildLoyaltyAccount(params.loyaltyAccountId);
  return data;
}

export async function rebuildLoyaltyAccount(loyaltyAccountId: string) {
  const { data: entries, error: entriesError } = await (supabase as any)
    .from("loyalty_ledger")
    .select("*")
    .eq("loyalty_account_id", loyaltyAccountId);

  if (entriesError) throw entriesError;

  const pointsBalance = (entries ?? []).reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0);
  const lifetimePoints = (entries ?? [])
    .filter((row: any) => Number(row.points ?? 0) > 0)
    .reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0);
  const totalCashback = Number(
    (entries ?? []).reduce((sum: number, row: any) => sum + Number(row.cashback_amount ?? 0), 0).toFixed(2)
  );

  let tier = "bronze";
  if (lifetimePoints >= 5000) tier = "platinum";
  else if (lifetimePoints >= 2000) tier = "gold";
  else if (lifetimePoints >= 500) tier = "silver";

  const { data, error } = await (supabase as any)
    .from("loyalty_accounts")
    .update({ points_balance: pointsBalance, lifetime_points: lifetimePoints, total_cashback: totalCashback, tier })
    .eq("id", loyaltyAccountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function rewardOrderLoyalty(params: {
  workspaceId?: string;
  orderId: string;
  totalAmount: number;
}) {
  const account = await getOrCreateLoyaltyAccount({ workspaceId: params.workspaceId });
  const points = Math.floor(Number(params.totalAmount));
  const cashback = Number((Number(params.totalAmount) * 0.01).toFixed(2));

  await addLoyaltyEntry({
    loyaltyAccountId: account.id,
    entryType: "earn",
    points,
    referenceType: "order",
    referenceId: params.orderId,
  });

  await addLoyaltyEntry({
    loyaltyAccountId: account.id,
    entryType: "cashback",
    cashbackAmount: cashback,
    referenceType: "order",
    referenceId: params.orderId,
  });

  return rebuildLoyaltyAccount(account.id);
}
