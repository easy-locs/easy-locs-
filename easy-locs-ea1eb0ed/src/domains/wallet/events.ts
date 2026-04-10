/**
 * Wallet Domain — Event adapter (outbound port implementation).
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { WalletEventPort, WalletAccount } from "./ports";
import type { Money } from "../shared/types";

export const walletEvents: WalletEventPort = {
  balanceUpdated(account: WalletAccount) {
    publishDomainEvent(
      createDomainEvent("wallet:balance_updated", account.id, "wallet_account", {
        ownerUserId: account.ownerUserId,
        available: account.availableBalance,
        currency: account.currency,
      }, "wallet")
    );
  },

  transferCompleted(from: string, to: string, amount: Money) {
    publishDomainEvent(
      createDomainEvent("wallet:transfer_sent", from, "wallet_account", {
        from, to, amount: amount.amount, currency: amount.currency,
      }, "wallet")
    );
  },

  topUpCompleted(userId: string, amount: Money) {
    publishDomainEvent(
      createDomainEvent("wallet:locs_purchased", userId, "wallet_account", {
        userId, amount: amount.amount, currency: amount.currency,
      }, "wallet")
    );
  },

  securityAlert(userId: string, reason: string) {
    publishDomainEvent(
      createDomainEvent("wallet:security_alert", userId, "wallet_account", {
        userId, reason,
      }, "wallet")
    );
  },
};
