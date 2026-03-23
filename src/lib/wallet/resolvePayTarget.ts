/**
 * resolvePayTarget — DELEGATES to unified resolver.
 * Backward-compatible wrapper for QrScannerPage and legacy wallet flows.
 */
import { resolveUnifiedTarget, type UnifiedPayTarget } from "@/lib/pay/unifiedResolver";

export interface ResolvedPayTarget {
  targetType: "user" | "shop";
  targetUserId: string;
  targetWalletId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletStatus: "active" | "locked" | "missing" | string;
  currency: string;
}

export async function resolvePayTarget(params: {
  userId?: string;
  walletId?: string;
  currency?: string;
}): Promise<ResolvedPayTarget> {
  const result = await resolveUnifiedTarget({
    userId: params.userId,
    walletId: params.walletId,
    currency: params.currency,
  });

  if (!result) {
    throw new Error("Cannot resolve pay target — recipient not found");
  }

  return {
    targetType: "user",
    targetUserId: result.id,
    targetWalletId: result.wallet_id,
    displayName: result.display_name,
    avatarUrl: result.avatar_url,
    walletStatus: result.wallet_status,
    currency: result.currency,
  };
}

export async function resolveLegacyWalletTarget(walletId: string, currency?: string): Promise<ResolvedPayTarget> {
  return resolvePayTarget({ walletId, currency });
}
