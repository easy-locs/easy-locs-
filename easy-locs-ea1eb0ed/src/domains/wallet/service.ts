/**
 * Wallet Domain Service — Use-case implementations.
 * ALL write-paths are guarded with idempotency + single-path enforcement.
 *
 * AUDIT STATUS: HARDENED
 * ✅ Guards on all write actions
 * ✅ Single-path on non-parallel flows
 * ✅ requestId + correlationId propagated
 * ✅ Input validation via microns
 * ✅ Structured logging
 * ✅ Repository-only data access
 * ✅ Typed returns
 */
import type { WalletUseCases, TransferIntent } from "./ports";
import type { Money, DomainResult } from "../shared/types";
import { walletAccountAdapter, ledgerAdapter, paymentGateway, walletSecurity } from "./adapters/supabase.adapter";
import { walletEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, rateLimit, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { validatePaymentInput } from "./microns/validate-payment-input.micron";

const log = createDomainLogger("wallet");

// ── Guards (module-level singletons) ──
const topUpGuard = createActionGuard("wallet.topup");
const transferGuard = createActionGuard("wallet.transfer");

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

    async topUp(userId: string, amount: Money, _paymentMethodId: string, requestId?: string) {
      requireAuth(ctx);
      rateLimit(`topup:${userId}`, 5);

      // ── Input validation ──
      const validation = validatePaymentInput({
        amount: amount.amount,
        currency: amount.currency as any,
        userId,
      });
      if (!validation.ok) {
        return { ok: false as const, error: (validation as { ok: false; reason: string }).reason };
      }

      // ── Single-path: prevent double top-up ──
      const flowKey = `wallet.topup:${userId}:${amount.amount}:${Date.now().toString().slice(0, -3)}`;
      const release = acquireSinglePath(flowKey);
      if (!release) {
        return { ok: false as const, error: "topup_already_in_progress" };
      }

      try {
        const result = await topUpGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("top_up", {
              userId,
              amount: amount.amount,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });

            try {
              const account = await walletAccountAdapter.ensureAccount(userId, amount.currency);
              const intent = await paymentGateway.createTopUpIntent(amount, userId);
              const entry = await ledgerAdapter.append({
                walletAccountId: account.id,
                type: "credit",
                amount: amount.amount,
                currency: amount.currency,
                reference: `topup_${actionCtx.requestId}`,
                description: "Wallet top-up",
              });
              walletEvents.topUpCompleted(userId, amount);
              timer.done();
              return entry;
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          {
            requestId,
            metadata: { userId, amount: amount.amount, currency: amount.currency },
          }
        );

        if (result.deduplicated) {
          return { ok: true as const, data: result.data! };
        }
        if (!result.ok) {
          return { ok: false as const, error: result.error ?? "Unknown error" };
        }
        return { ok: true as const, data: result.data! };
      } finally {
        release();
      }
    },

    async transfer(intent: TransferIntent, requestId?: string) {
      requireAuth(ctx);
      rateLimit(`transfer:${intent.fromUserId}`, 10);

      // ── Input validation ──
      const validation = validatePaymentInput({
        amount: intent.amount.amount,
        currency: intent.amount.currency as any,
        userId: intent.fromUserId,
      });
      if (!validation.ok) {
        return { ok: false as const, error: (validation as { ok: false; reason: string }).reason };
      }

      if (!intent.toUserId) {
        return { ok: false as const, error: "Missing recipient" };
      }

      if (!intent.pin) {
        return { ok: false as const, error: "PIN required" };
      }

      // ── Single-path: prevent double transfer (keyed on reference or amount+users) ──
      const flowKey = intent.reference
        ? `wallet.transfer:${intent.reference}`
        : `wallet.transfer:${intent.fromUserId}:${intent.toUserId}:${intent.amount.amount}:${Date.now().toString().slice(0, -3)}`;
      const release = acquireSinglePath(flowKey);
      if (!release) {
        return { ok: false as const, error: "transfer_already_in_progress" };
      }

      try {
        const result = await transferGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("transfer", {
              from: intent.fromUserId,
              to: intent.toUserId,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });

            try {
              // Validate PIN
              const pinValid = await walletSecurity.validatePin(intent.fromUserId, intent.pin);
              if (!pinValid) throw new Error("Invalid PIN");

              // Risk assessment
              const risk = await walletSecurity.assessRisk(intent.fromUserId, intent.amount.amount);
              if (risk.requireMfa) {
                throw new Error("Additional verification required");
              }

              // Execute transfer via ledger
              const entry = await ledgerAdapter.append({
                walletAccountId: intent.fromUserId,
                type: "debit",
                amount: intent.amount.amount,
                currency: intent.amount.currency,
                reference: intent.reference ?? `transfer_${actionCtx.requestId}`,
                description: `Transfer to ${intent.toUserId}`,
              });

              walletEvents.transferCompleted(intent.fromUserId, intent.toUserId, intent.amount);
              timer.done();
              return entry;
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          {
            requestId,
            metadata: {
              fromUserId: intent.fromUserId,
              toUserId: intent.toUserId,
              amount: intent.amount.amount,
            },
          }
        );

        if (result.deduplicated) {
          return { ok: true as const, data: result.data! };
        }
        if (!result.ok) {
          return { ok: false as const, error: result.error ?? "Unknown error" };
        }
        return { ok: true as const, data: result.data! };
      } finally {
        release();
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
