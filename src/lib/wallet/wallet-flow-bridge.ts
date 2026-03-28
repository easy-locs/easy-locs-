/**
 * wallet-flow-bridge — Wires wallet mutations into the smart flow system.
 * Adds event emission + propagation tracking to wallet transfer and topup.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { APP_EVENTS } from "@/lib/platform/events";
import { executeWalletTransfer, type TransferInput, type TransferResult } from "./wallet-transfer";
import { initiateWalletTopup, type TopupInput, type TopupResult } from "./wallet-topup";

/**
 * Smart wallet transfer — wraps atomic transfer with event propagation.
 */
export async function smartWalletTransfer(input: TransferInput): Promise<TransferResult> {
  const result = await executeWalletTransfer(input);

  if (result.success) {
    platformBus.emit(APP_EVENTS.WALLET_PAYMENT_SUCCESS, {
      transactionId: result.transactionId,
      amount: input.amount,
      currency: input.currency,
    }, "wallet");

    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "wallet");
    platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "wallet");

    trackPropagation({
      flowId: `wallet-transfer-${result.transactionId}`,
      domain: "wallet",
      action: "transfer",
      dbWriteSuccess: true,
      eventEmitted: APP_EVENTS.WALLET_PAYMENT_SUCCESS,
      cacheInvalidated: ["wallet-balance"],
    });
  } else {
    platformBus.emit(APP_EVENTS.WALLET_PAYMENT_FAILED, {
      error: result.error,
      amount: input.amount,
    }, "wallet");

    trackPropagation({
      flowId: `wallet-transfer-failed`,
      domain: "wallet",
      action: "transfer",
      dbWriteSuccess: false,
      eventEmitted: APP_EVENTS.WALLET_PAYMENT_FAILED,
      cacheInvalidated: [],
    });
  }

  return result;
}

/**
 * Smart wallet topup — wraps topup with event propagation.
 */
export async function smartWalletTopup(input: TopupInput): Promise<TopupResult> {
  const result = await initiateWalletTopup(input);

  if (result.success) {
    platformBus.emit("wallet:topup_initiated", {
      intentId: result.intentId,
      amount: input.amount,
      currency: input.currency,
    }, "wallet");

    reportHealth("wallet", "ok");

    trackPropagation({
      flowId: `wallet-topup-${result.intentId}`,
      domain: "wallet",
      action: "topup",
      dbWriteSuccess: true,
      eventEmitted: "wallet:topup_initiated",
      cacheInvalidated: [],
    });
  } else {
    reportHealth("wallet", "degraded", undefined, result.error);

    trackPropagation({
      flowId: `wallet-topup-failed`,
      domain: "wallet",
      action: "topup",
      dbWriteSuccess: false,
      eventEmitted: null,
      cacheInvalidated: [],
    });
  }

  return result;
}
