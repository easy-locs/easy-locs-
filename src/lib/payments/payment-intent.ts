/**
 * payment-intent — Atomic unit: create and manage payment intents.
 * Single responsibility: payment intent lifecycle.
 */
import { supabase } from "@/integrations/supabase/client";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[PAYMENTS][${step}] ${phase}:`, payload ?? {});
};

export interface PaymentIntentInput {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  entityType: string;
  entityId: string;
  paymentMethod: "wallet" | "stripe" | "qr";
}

export interface PaymentIntentResult {
  success: boolean;
  intentId?: string;
  status?: string;
  clientSecret?: string;
  error?: string;
}

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
  const flow = startFlow("payments", "create_intent");
  trace("intent.create", "input", { amount: input.amount, method: input.paymentMethod });

  const createStep = addStep(flow, "create");
  try {
    if (input.paymentMethod === "wallet") {
      // Wallet payment — direct transfer
      completeStep(flow, createStep, { method: "wallet" });
      endFlow(flow, "success");
      return { success: true, status: "wallet_pending" };
    }

    // Stripe payment
    const { data, error } = await supabase.functions.invoke("create-payment-intent", {
      body: {
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        entity_type: input.entityType,
        entity_id: input.entityId,
      },
    });

    if (error) {
      failStep(flow, createStep, error.message);
      reportHealth("payments", "degraded", undefined, error.message);
      endFlow(flow, "failed");
      return { success: false, error: error.message };
    }

    completeStep(flow, createStep, { intentId: data?.id });
    reportHealth("payments", "ok", flow.totalLatencyMs);
    endFlow(flow, "success");
    trace("intent.create", "output", { intentId: data?.id });
    return { success: true, intentId: data?.id, clientSecret: data?.client_secret, status: data?.status };
  } catch (err: any) {
    failStep(flow, createStep, err.message);
    reportHealth("payments", "down", undefined, err.message);
    endFlow(flow, "failed");
    return { success: false, error: err.message };
  }
}
