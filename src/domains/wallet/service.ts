/**
 * Wallet Domain Service — Use-case implementations.
 */
import type { WalletUseCases, TransferIntent } from "./ports";
import type { Money, DomainResult } from "../shared/types";
import { walletAccountAdapter, ledgerAdapter, paymentGateway, walletSecurity } from "./adapters/supabase.adapter";
import { walletEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, rateLimit, type SecurityContext } from "../shared/security-guards";

const log = createDomainLogger("wallet");

export function createWalletService(ctx: SecurityContext | null): WalletUseCases {
  return {
    async getBalance(userId: string) {
      requireAuth(ctx);
      try {
        const account = await walletAccountAdapter.findByOwner(userId);
        if (!account) return { ok: false as const, error: "No wallet account found" };
        return { ok: true as const, data: account };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async topUp(userId: string, amount: Money, _paymentMethodId: string) {
      requireAuth(ctx);
      rateLimit(`topup:${userId}`, 5);
      const timer = log.timed("top_up", { userId, amount: amount.amount });

      try {
        const account = await walletAccountAdapter.ensureAccount(userId, amount.currency);
        const intent = await paymentGateway.createTopUpIntent(amount, userId);
        const entry = await ledgerAdapter.append({
          walletAccountId: account.id,
          type: "credit",
          amount: amount.amount,
          currency: amount.currency,
          reference: `topup_${Date.now()}`,
          description: "Wallet top-up",
        });
        walletEvents.topUpCompleted(userId, amount);
        timer.done();
        return { ok: true as const, data: entry };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async transfer(intent: TransferIntent) {
      requireAuth(ctx);
      rateLimit(`transfer:${intent.fromUserId}`, 10);
      const timer = log.timed("transfer", { from: intent.fromUserId, to: intent.toUserId });

      try {
        // Validate PIN
        const pinValid = await walletSecurity.validatePin(intent.fromUserId, intent.pin);
        if (!pinValid) return { ok: false as const, error: "Invalid PIN" };

        // Risk assessment
        const risk = await walletSecurity.assessRisk(intent.fromUserId, intent.amount.amount);
        if (risk.requireMfa) {
          return { ok: false as const, error: "Additional verification required", code: "MFA_REQUIRED" };
        }

        // Execute transfer via ledger
        const entry = await ledgerAdapter.append({
          walletAccountId: intent.fromUserId, // simplified — real impl resolves account
          type: "debit",
          amount: intent.amount.amount,
          currency: intent.amount.currency,
          reference: intent.reference ?? `transfer_${Date.now()}`,
          description: `Transfer to ${intent.toUserId}`,
        });

        walletEvents.transferCompleted(intent.fromUserId, intent.toUserId, intent.amount);
        timer.done();
        return { ok: true as const, data: entry };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getActivity(userId: string, limit = 200) {
      requireAuth(ctx);
      try {
        const account = await walletAccountAdapter.findByOwner(userId);
        if (!account) return { ok: true as const, data: [] };
        const entries = await ledgerAdapter.findByAccount(account.id, limit);
        return { ok: true as const, data: entries };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async verifyPin(userId: string, pin: string) {
      requireAuth(ctx);
      try {
        const valid = await walletSecurity.validatePin(userId, pin);
        return { ok: true as const, data: valid };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
