/**
 * Wallet Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
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
      p_user_id: userId,
      p_currency: currency,
    });
    if (!data) throw new Error("Failed to ensure wallet account");
    return mapWalletAccount(data);
  },

  async updateBalance(accountId: string, available: number, escrow: number): Promise<void> {
    log.info("balance_update", { accountId, available, escrow });
    // Balance updates go through ledger entries, not direct writes
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
    log.info("confirm_payment", { intentId });
    return true; // Stripe webhook handles actual confirmation
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
    // Simple risk assessment — real engine is in edge functions
    return {
      score: amount > 500000 ? 70 : amount > 100000 ? 40 : 10,
      requireMfa: amount > 500000,
    };
  },
};

// ── Mappers ──
function mapWalletAccount(row: any): WalletAccount {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    currency: row.currency ?? "XOF",
    availableBalance: row.available_balance ?? row.balance ?? 0,
    escrowBalance: row.escrow_balance ?? 0,
    pendingBalance: row.pending_balance ?? 0,
    status: row.status ?? "active",
  };
}

function mapLedgerEntry(row: any): LedgerEntry {
  return {
    id: row.id,
    walletAccountId: row.wallet_account_id,
    type: row.type ?? "credit",
    amount: row.amount ?? 0,
    currency: row.currency ?? "XOF",
    reference: row.reference ?? "",
    description: row.description,
    createdAt: row.created_at,
  };
}
