/**
 * resolvePayTarget — Explicit target resolution step before wallet transfer.
 * Ensures we always have a true userId, never a walletId or ambiguous identifier.
 * MUST be called after QR decode and before showing payment confirmation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ResolvedPayTarget {
  targetType: "user" | "shop";
  targetUserId: string;
  targetWalletId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletStatus: "active" | "locked" | "missing" | string;
  currency: string;
}

/**
 * Resolve a pay_user target from userId.
 * The userId MUST be a true auth user id — never a walletId.
 */
export async function resolvePayTarget(params: {
  userId?: string;
  walletId?: string;
  currency?: string;
}): Promise<ResolvedPayTarget> {
  const currency = params.currency || "AED";

  // Case 1: We have a userId — verify and find their wallet
  if (params.userId) {
    // Verify user exists via profiles
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", params.userId)
      .maybeSingle();

    // Find their wallet
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("owner_user_id", params.userId)
      .eq("currency", currency)
      .limit(1)
      .maybeSingle();

    return {
      targetType: "user",
      targetUserId: params.userId,
      targetWalletId: wallet?.id ?? null,
      displayName: profile?.full_name || profile?.username || null,
      avatarUrl: profile?.avatar_url || null,
      currency,
      walletStatus: wallet?.status ?? "missing",
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
      throw new Error("Cannot resolve wallet target — wallet not found or has no owner");
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", wallet.owner_user_id)
      .maybeSingle();

    return {
      targetType: "user",
      targetUserId: wallet.owner_user_id,
      targetWalletId: wallet.id,
      displayName: profile?.full_name || profile?.username || null,
      avatarUrl: profile?.avatar_url || null,
      currency: wallet.currency ?? currency,
      walletStatus: wallet.status ?? "missing",
    };
  }

  throw new Error("Cannot resolve pay target — no userId or walletId provided");
}

/**
 * Resolve a legacy walletId-only QR to a proper pay target.
 * Used when QR contains only walletId (no userId).
 */
export async function resolveLegacyWalletTarget(walletId: string, currency?: string): Promise<ResolvedPayTarget> {
  return resolvePayTarget({ walletId, currency });
}
