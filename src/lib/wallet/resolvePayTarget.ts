/**
 * resolvePayTarget — Explicit target resolution step before wallet transfer.
 * Ensures we always have a true userId, never a walletId or ambiguous identifier.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ResolvedPayTarget {
  targetUserId: string;
  targetWalletId: string | null;
  displayName: string | null;
  currency: string;
  walletStatus: string | null;
}

/**
 * Resolve a pay_user target. The userId MUST be a true auth user id.
 * If walletId is provided instead, we look up the owning user.
 */
export async function resolvePayTarget(params: {
  userId?: string;
  walletId?: string;
  currency?: string;
}): Promise<ResolvedPayTarget> {
  const currency = params.currency || "AED";

  // Case 1: We have a userId — verify it exists and find their wallet
  if (params.userId) {
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("owner_user_id", params.userId)
      .eq("currency", currency)
      .limit(1)
      .maybeSingle();

    // Try to get display name from profiles
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name, username")
      .eq("id", params.userId)
      .maybeSingle();

    return {
      targetUserId: params.userId,
      targetWalletId: wallet?.id ?? null,
      displayName: profile?.full_name || profile?.username || null,
      currency,
      walletStatus: wallet?.status ?? null,
    };
  }

  // Case 2: We only have a walletId — resolve to owning user
  if (params.walletId) {
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("id", params.walletId)
      .maybeSingle();

    if (!wallet?.owner_user_id) {
      throw new Error("Cannot resolve wallet target — wallet not found");
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name, username")
      .eq("id", wallet.owner_user_id)
      .maybeSingle();

    return {
      targetUserId: wallet.owner_user_id,
      targetWalletId: wallet.id,
      displayName: profile?.full_name || profile?.username || null,
      currency: wallet.currency ?? currency,
      walletStatus: wallet.status ?? null,
    };
  }

  throw new Error("Cannot resolve pay target — no userId or walletId provided");
}
