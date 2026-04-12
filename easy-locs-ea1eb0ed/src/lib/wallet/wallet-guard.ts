/**
 * wallet-guard — Atomic unit: validates wallet preconditions before any operation.
 * Single responsibility: balance check, account existence, limits validation.
 */
import { typedQueries } from "@/lib/db/typed-queries";
import { verifyWalletBinding, getStoredBinding } from "./wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { WALLET_FALLBACK_CURRENCY } from "./wallet-config";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[WALLET][${step}] ${phase}:`, payload ?? {});
};

export interface WalletGuardResult {
  valid: boolean;
  walletId: string | null;
  balance: number;
  currency: string;
  error?: string;
  device_changed?: boolean;
}

export async function guardWalletReady(userId: string): Promise<WalletGuardResult> {
  trace("guard.ready", "input", { userId });

  const binding = getStoredBinding();
  if (binding) {
    if (binding.userId !== userId) {
      trace("guard.ready", "error", { reason: "binding_user_mismatch" });
      return { valid: false, walletId: null, balance: 0, currency: WALLET_FALLBACK_CURRENCY, error: "Wallet identity mismatch — re-authenticate" };
    }

    try {
      const deviceId = await getDeviceFingerprint();
      const verification = await verifyWalletBinding(userId, deviceId, binding.walletId);
      if (!verification.valid) {
        trace("guard.ready", "error", { reason: verification.reason });
        if (verification.reason === "hmac_tampered") {
          return { valid: false, walletId: null, balance: 0, currency: WALLET_FALLBACK_CURRENCY, error: "Wallet binding compromised — contact support" };
        }
        if (verification.reason === "device_changed") {
          return { valid: false, walletId: binding.walletId, balance: 0, currency: WALLET_FALLBACK_CURRENCY, error: "Device changed — re-bind required", device_changed: true };
        }
        if (verification.reason === "wallet_mismatch") {
          return { valid: false, walletId: null, balance: 0, currency: WALLET_FALLBACK_CURRENCY, error: "Wallet identity mismatch — re-authenticate" };
        }
      }
    } catch {
      trace("guard.ready", "error", { reason: "verification_unavailable" });
    }
  }

  const { data, error } = await typedQueries.walletAccounts.selectByUser(userId);

  if (error || !data) {
    trace("guard.ready", "error", { error: (error as Error)?.message ?? "no_account" });
    return { valid: false, walletId: null, balance: 0, currency: WALLET_FALLBACK_CURRENCY, error: "No wallet account" };
  }

  const { data: bal } = await typedQueries.walletAccounts.selectBalanceByWallet(data.id);

  const result: WalletGuardResult = {
    valid: true,
    walletId: data.id,
    balance: bal?.available_balance ?? bal?.balance ?? 0,
    currency: bal?.currency ?? data.currency ?? WALLET_FALLBACK_CURRENCY,
  };

  trace("guard.ready", "output", { ...result });
  return result;
}

export async function guardSufficientBalance(
  userId: string,
  amount: number,
  currency: string
): Promise<WalletGuardResult> {
  trace("guard.balance", "input", { userId, amount, currency });
  const guard = await guardWalletReady(userId);
  if (!guard.valid) return guard;

  if (guard.balance < amount) {
    trace("guard.balance", "error", { available: guard.balance, required: amount });
    return { ...guard, valid: false, error: `Insufficient balance: ${guard.balance} < ${amount}` };
  }

  trace("guard.balance", "output", { sufficient: true });
  return guard;
}
