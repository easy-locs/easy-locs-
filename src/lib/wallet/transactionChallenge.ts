/**
 * transactionChallenge — Pre-transfer challenge flow for wallet security.
 * Creates a short-lived challenge that must be validated before transfer execution.
 */
import { supabase } from "@/integrations/supabase/client";

export interface TransactionChallenge {
  challengeId: string;
  nonce: string;
  expiresAt: string;
  amount: number;
  currency: string;
  receiverUserId: string;
}

const CHALLENGE_TTL_MS = 120_000; // 2 minutes

/**
 * Create a transaction challenge before executing a wallet transfer.
 * The challenge must be validated with PIN or biometrics before the transfer proceeds.
 */
export function createTransactionChallenge(params: {
  amount: number;
  currency: string;
  receiverUserId: string;
}): TransactionChallenge {
  return {
    challengeId: `txc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    nonce: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    amount: params.amount,
    currency: params.currency,
    receiverUserId: params.receiverUserId,
  };
}

/**
 * Validate that a challenge is still valid (not expired).
 */
export function isChallengeValid(challenge: TransactionChallenge): boolean {
  return new Date(challenge.expiresAt) > new Date();
}

/**
 * Verify wallet PIN via the backend edge function.
 */
export async function verifyWalletPin(pin: string): Promise<{ verified: boolean; error?: string; locked?: boolean }> {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "verify", pin },
  });

  if (error) return { verified: false, error: error.message };
  return data as { verified: boolean; error?: string; locked?: boolean };
}

/**
 * Check if the user has a wallet PIN set.
 */
export async function hasWalletPin(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "status" },
  });

  if (error) return false;
  return !!data?.has_pin;
}

/**
 * Generate an idempotency key for a transfer to prevent duplicates.
 */
export function generateIdempotencyKey(params: {
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  nonce: string;
}): string {
  return `txf_${params.senderUserId}_${params.receiverUserId}_${params.amount}_${params.nonce}`;
}
