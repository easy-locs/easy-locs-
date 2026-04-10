/**
 * resolvePayTarget — CANONICAL resolver wrapper.
 * Single source of truth delegating to unifiedResolver.
 * Used by: QrScannerPage, WalletTransferPage, PaymentConfirmPage.
 */
import { resolveUnifiedTarget, validatePayTarget, type UnifiedPayTarget } from "@/lib/pay/unifiedResolver";

export interface ResolvedPayTarget {
  targetType: "user" | "shop";
  targetUserId: string;
  targetWalletId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletStatus: "active" | "locked" | "missing" | string;
  currency: string;
  timings?: {
    recipientResolveMs: number;
    walletResolveMs: number;
  };
}

function toResolvedPayTarget(result: UnifiedPayTarget): ResolvedPayTarget {
  return {
    targetType: "user",
    targetUserId: result.id,
    targetWalletId: result.wallet_id,
    displayName: result.display_name,
    avatarUrl: result.avatar_url,
    walletStatus: result.wallet_status,
    currency: result.currency,
    timings: result.timings,
  };
}

export async function resolvePayTarget(params: {
  userId?: string;
  walletId?: string;
  email?: string;
  orbitId?: string;
  phone?: string;
  currency?: string;
}): Promise<ResolvedPayTarget> {
  const result = await resolveUnifiedTarget({
    userId: params.userId,
    orbitId: params.orbitId,
    email: params.email,
    phone: params.phone,
    walletId: params.walletId,
    currency: params.currency,
  });

  if (!result) {
    throw new Error("Cannot resolve pay target — recipient not found");
  }

  return toResolvedPayTarget(result);
}

export { validatePayTarget, type UnifiedPayTarget };
