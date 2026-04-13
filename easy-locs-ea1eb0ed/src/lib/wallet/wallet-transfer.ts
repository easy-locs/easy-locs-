/**
 * wallet-transfer — Atomic unit: execute a wallet transfer via Edge Function.
 * Single responsibility: call wallet-transfer Edge Function (with server-side security:
 * PIN verification, limits, fraud checks), log result, emit event.
 *
 * SECURITY: Never call atomic_wallet_transfer RPC directly from client —
 * always route through the Edge Function which enforces PIN hashing,
 * transfer limits, and security guards.
 */
import { db } from "@/services/db";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { APP_EVENTS } from "@/lib/platform/events";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[WALLET][${step}] ${phase}:`, payload ?? {});
};

export interface TransferInput {
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  currency: string;
  description: string;
  transactionType: string;
  reference?: string;
  pin?: string;
  idempotencyKey?: string;
  /** @deprecated Use senderUserId instead */
  fromWalletId?: string;
  /** @deprecated Use receiverUserId instead */
  toWalletId?: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  transferId?: string;
  receiverName?: string;
  error?: string;
}

export async function executeWalletTransfer(input: TransferInput): Promise<TransferResult> {
  const flow = startFlow("wallet", "transfer");
  const senderId = input.senderUserId || input.fromWalletId || "";
  const receiverId = input.receiverUserId || input.toWalletId || "";

  trace("transfer", "input", { receiverId, amount: input.amount, currency: input.currency });

  const edgeFnStep = addStep(flow, "edge_function_call");
  try {
    const { data, error } = await db.functions.invoke("wallet-transfer", {
      body: {
        sender_user_id: senderId,
        receiver_user_id: receiverId,
        amount: input.amount,
        currency: input.currency,
        note: input.description,
        source: input.transactionType,
        idempotency_key: input.idempotencyKey ?? `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        pin: input.pin ?? null,
      },
    });

    if (error) {
      failStep(flow, edgeFnStep, error.message);
      reportHealth("wallet", "degraded", undefined, error.message);
      endFlow(flow, "failed");
      return { success: false, error: error.message };
    }

    if (data?.error) {
      failStep(flow, edgeFnStep, data.error);
      reportHealth("wallet", "degraded", undefined, data.error);
      endFlow(flow, "failed");
      return { success: false, error: data.error };
    }

    const transferId = data?.transfer_id ?? data?.transactionId ?? null;

    if (!transferId) {
      failStep(flow, edgeFnStep, "No transfer ID returned");
      reportHealth("wallet", "degraded", undefined, "Transfer succeeded but no transfer ID returned");
      endFlow(flow, "failed");
      return { success: false, error: "Transfer completed but no confirmation received" };
    }

    completeStep(flow, edgeFnStep, { transferId });

    platformBus.emit(APP_EVENTS.WALLET_TRANSFER_COMPLETED, {
      transactionId: transferId, amount: input.amount, currency: input.currency,
    }, "wallet");

    trackPropagation({
      flowId: flow.flowId, domain: "wallet", action: "transfer",
      dbWriteSuccess: true, eventEmitted: APP_EVENTS.WALLET_TRANSFER_COMPLETED, cacheInvalidated: ["wallet-balance"],
    });

    reportHealth("wallet", "ok", flow.totalLatencyMs);
    endFlow(flow, "success");
    trace("transfer", "output", { transferId });
    return {
      success: true,
      transactionId: transferId,
      transferId,
      receiverName: data?.receiver_name,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    failStep(flow, edgeFnStep, message);
    reportHealth("wallet", "down", undefined, message);
    endFlow(flow, "failed");
    trace("transfer", "error", { message });
    return { success: false, error: message };
  }
}
