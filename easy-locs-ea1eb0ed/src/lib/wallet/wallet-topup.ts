/**
 * wallet-topup — Atomic unit: top-up wallet via Stripe or other payment method.
 * Single responsibility: create payment intent for wallet top-up.
 */
import { db } from "@/services/db";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[WALLET][${step}] ${phase}:`, payload ?? {});
};

export interface TopupInput {
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  paymentMethod: "stripe" | "card" | "bank_transfer";
}

export interface TopupResult {
  success: boolean;
  intentId?: string;
  clientSecret?: string;
  error?: string;
}

export async function initiateWalletTopup(input: TopupInput): Promise<TopupResult> {
  const flow = startFlow("wallet", "topup");
  trace("topup", "input", { userId: input.userId, amount: input.amount });

  const createStep = addStep(flow, "create_intent");
  try {
    const { data, error } = await db.functions.invoke("create-wallet-topup", {
      body: {
        wallet_id: input.walletId,
        amount: input.amount,
        currency: input.currency,
        payment_method: input.paymentMethod,
      },
    });

    if (error) {
      failStep(flow, createStep, error.message);
      endFlow(flow, "failed");
      return { success: false, error: error.message };
    }

    if (data?.error) {
      const appError = typeof data.error === "string" ? data.error : "Top-up request rejected";
      failStep(flow, createStep, appError);
      endFlow(flow, "failed");
      trace("topup", "error", { appError });
      return { success: false, error: appError };
    }

    completeStep(flow, createStep, { intentId: data?.intent_id });
    endFlow(flow, "success");
    trace("topup", "output", { intentId: data?.intent_id });
    return { success: true, intentId: data?.intent_id, clientSecret: data?.client_secret };
  } catch (err: any) {
    failStep(flow, createStep, err.message);
    endFlow(flow, "failed");
    return { success: false, error: err.message };
  }
}
