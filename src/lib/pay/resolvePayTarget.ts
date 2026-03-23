/**
 * resolvePayTarget — DELEGATES to unified resolver.
 * This file exists for backward compatibility with PaymentConfirmPage and WalletTransferPage.
 */
import { resolveUnifiedTarget, validatePayTarget, type UnifiedPayTarget } from "@/lib/pay/unifiedResolver";

export type ResolvedTarget = UnifiedPayTarget;

export async function resolvePayTarget(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
}): Promise<ResolvedTarget | null> {
  return resolveUnifiedTarget(input);
}

export { validatePayTarget };
