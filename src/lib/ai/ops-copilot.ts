/**
 * AI Ops Copilot — suggestion engine for support, refunds, escalations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createOpsSuggestion(params: {
  workspaceId?: string | null;
  suggestionType: "reply" | "refund" | "escalation" | "fraud_review" | "payout_action";
  contextType?: string | null;
  contextId?: string | null;
  title: string;
  suggestionText: string;
}) {
  const { error } = await supabase
    .from("ai_ops_suggestions" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      suggestion_type: params.suggestionType,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      title: params.title,
      suggestion_text: params.suggestionText,
      status: "open",
    } as any);

  if (error) throw error;
  return { ok: true };
}

export async function suggestRefundDecision(params: {
  workspaceId?: string | null;
  refundId: string;
  amount: number;
  reason?: string | null;
}) {
  const decision =
    params.amount <= 20
      ? "Recommend auto-approve and pay to wallet credit."
      : "Recommend manual review before payout.";

  return createOpsSuggestion({
    workspaceId: params.workspaceId ?? null,
    suggestionType: "refund",
    contextType: "refund_request",
    contextId: params.refundId,
    title: "Refund decision suggestion",
    suggestionText: `${decision} Reason: ${params.reason ?? "n/a"}`,
  });
}
