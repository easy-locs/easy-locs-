/**
 * wallet-transfer — Atomic unit: execute a single wallet transfer via RPC.
 * Single responsibility: call atomic_wallet_transfer RPC, log result, emit event.
 */
import { supabase } from "@/integrations/supabase/client";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[WALLET][${step}] ${phase}:`, payload ?? {});
};

export interface TransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  description: string;
  transactionType: string;
  reference?: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export async function executeWalletTransfer(input: TransferInput): Promise<TransferResult> {
  const flow = startFlow("wallet", "transfer");
  trace("transfer", "input", { ...input });

  const rpcStep = addStep(flow, "rpc_call");
  try {
    const { data, error } = await (supabase as any).rpc("atomic_wallet_transfer", {
      p_from_wallet: input.fromWalletId,
      p_to_wallet: input.toWalletId,
      p_amount: input.amount,
      p_currency: input.currency,
      p_description: input.description,
      p_type: input.transactionType,
      p_reference: input.reference ?? null,
    });

    if (error) {
      failStep(flow, rpcStep, error.message);
      reportHealth("wallet", "degraded", undefined, error.message);
      endFlow(flow, "failed");
      return { success: false, error: error.message };
    }

    completeStep(flow, rpcStep, { transactionId: data });
    reportHealth("wallet", "ok", flow.totalLatencyMs);
    endFlow(flow, "success");
    trace("transfer", "output", { transactionId: data });
    return { success: true, transactionId: data };
  } catch (err: any) {
    failStep(flow, rpcStep, err.message);
    reportHealth("wallet", "down", undefined, err.message);
    endFlow(flow, "failed");
    trace("transfer", "error", { message: err.message });
    return { success: false, error: err.message };
  }
}
