/**
 * Wallet Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import { db as supabase } from "@/services/db";
import type {
  WalletRepository, LedgerRepository, PaymentGatewayPort,
  WalletSecurityPort, WalletAccount, LedgerEntry,
} from "../ports";
import { createDomainLogger } from "../../shared/observability";
import * as payRepo from "@/repositories/payments.repository";

const log = createDomainLogger("wallet");

// ── Wallet Account Adapter ──
export const walletAccountAdapter: WalletRepository = {
  async findByOwner(userId: string): Promise<WalletAccount | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("wallet_accounts")
      .select("*")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();
    return data ? mapWalletAccount(data) : null;
  },

  async ensureAccount(userId: string, currency: string): Promise<WalletAccount> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.rpc("ensure_wallet_account", {
      target_user_id: userId,
      target_currency: currency,
    });
    if (!data) throw new Error("Failed to ensure wallet account");
    return mapWalletAccount(data);
  },

  async updateBalance(accountId: string, available: number, escrow: number): Promise<void> {
    // GUARD: Direct balance writes are NOT permitted from the client.
    // All balance mutations must go through wallet-ops edge function or ledger entries
    // to preserve atomicity, audit trail, and server-side security guards.
    // If you need to update a balance, use walletOps("debit" | "credit") via wallet-engine.ts.
    log.warn("balance_update_rejected", { accountId, available, escrow,
      reason: "Direct client-side balance writes are forbidden — route through ledger or edge function" });
    throw new Error(
      `[wallet] updateBalance is not supported on the client. ` +
      `Balance changes must go through the wallet-ops edge function or a ledger entry. ` +
      `Account: ${accountId}`
    );
  },
};

// ── Ledger Adapter ──
export const ledgerAdapter: LedgerRepository = {
  async findByAccount(accountId: string, limit = 200): Promise<LedgerEntry[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("wallet_ledger_entries")
      .select("*")
      .eq("wallet_account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map(mapLedgerEntry);
  },

  async append(entry: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("wallet_ledger_entries")
      .insert({
        wallet_account_id: entry.walletAccountId,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        reference: entry.reference,
        description: entry.description,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return mapLedgerEntry(data);
  },
};

// ── Payment Gateway Adapter (Stripe via edge functions) ──
export const paymentGateway: PaymentGatewayPort = {
  async createTopUpIntent(amount, userId) {
    const result = await payRepo.createWalletTopup({
      amount: amount.amount,
      currency: amount.currency,
      userId,
    });
    return { clientSecret: result.clientSecret };
  },

  async confirmPayment(intentId: string): Promise<boolean> {
    // GUARD: Client-side payment confirmation is NOT supported.
    // Stripe payment intent confirmation is handled exclusively by server-side Stripe webhooks
    // which post to the wallet-ops edge function. The client never directly confirms an intent.
    // Callers should NOT rely on this method — listen to webhook-triggered events instead
    // (e.g. wallet:payment_success, commerce:payment_settled).
    log.warn("confirm_payment_blocked", { intentId,
      reason: "Client cannot confirm server-side Stripe intents — confirmation is webhook-only" });
    throw new Error(
      `[wallet] confirmPayment is not supported on the client. ` +
      `Payment confirmation is handled by Stripe webhooks (server-side only). ` +
      `Listen for wallet:payment_success or commerce:payment_settled events instead. ` +
      `Intent: ${intentId}`
    );
  },
};

// ── Security Adapter ──
export const walletSecurity: WalletSecurityPort = {
  async validatePin(userId: string, pin: string): Promise<boolean> {
    const result = await payRepo.invokeWalletPin({
      action: "verify",
      userId,
      pin,
    });
    return result?.valid === true;
  },

  async assessRisk(userId: string, amount: number) {
    // CLIENT-SIDE PRE-SCREENING ONLY.
    // This provides a fast, optimistic risk score to gate the UI (e.g. show MFA prompt early).
    // The authoritative risk decision is made server-side in the wallet-ops edge function,
    // which runs the full fraud-detection pipeline. Never use this score to bypass security.
    // Thresholds (in smallest currency unit, e.g. fils/centimes):
    //   > 500,000 → high risk, require MFA
    //   > 100,000 → medium risk
    //   ≤ 100,000 → low risk
    const score = amount > 500_000 ? 70 : amount > 100_000 ? 40 : 10;
    log.info("assess_risk_client", { userId, amount, score, note: "client-side pre-screen only" });
    return {
      score,
      requireMfa: amount > 500_000,
    };
  },
};

// Validated currencies supported by the platform (must match atoms/currency-config).
// XOF is NOT in this list — its presence as a ?? fallback was a bug.
// To add a new currency, update this set AND the currency atoms/config.
const SUPPORTED_CURRENCIES = new Set(["AED", "USD", "EUR", "SAR", "GBP"]);

function assertCurrency(currency: string | undefined | null, context: string, rowId?: string): string {
  if (!currency) {
    throw new Error(
      `[wallet] ${context} row ${rowId ?? "unknown"} has no currency — cannot map. ` +
      `Supported currencies: ${[...SUPPORTED_CURRENCIES].join(", ")}`
    );
  }
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new Error(
      `[wallet] ${context} row ${rowId ?? "unknown"} has unsupported currency "${currency}". ` +
      `Supported currencies: ${[...SUPPORTED_CURRENCIES].join(", ")}. ` +
      `To add a new currency, update SUPPORTED_CURRENCIES in supabase.adapter.ts and the currency atoms.`
    );
  }
  return currency;
}

// ── Mappers ──
function mapWalletAccount(row: any): WalletAccount {
  const currency = assertCurrency(row.currency, "wallet_accounts", row.id);
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    currency,
    availableBalance: row.available_balance ?? row.balance ?? 0,
    escrowBalance: row.escrow_balance ?? 0,
    pendingBalance: row.pending_balance ?? 0,
    status: row.status ?? "active",
  };
}

function mapLedgerEntry(row: any): LedgerEntry {
  const currency = assertCurrency(row.currency, "wallet_ledger_entries", row.id);
  return {
    id: row.id,
    walletAccountId: row.wallet_account_id,
    type: row.type ?? "credit",
    amount: row.amount ?? 0,
    currency,
    reference: row.reference ?? "",
    description: row.description,
    createdAt: row.created_at,
  };
}
