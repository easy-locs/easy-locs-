/**
 * Financial reconciliation engine — compare expected vs actual amounts.
 */
import { supabase } from "@/integrations/supabase/client";

export async function reconcileTransaction(params: {
  workspaceId?: string;
  entityType: string;
  entityId: string;
  expected: number;
  actual: number;
  currency?: string;
  notes?: string;
}) {
  const delta = Number((params.actual - params.expected).toFixed(2));
  const status = Math.abs(delta) < 0.01 ? "matched" : "mismatch";

  const { data, error } = await supabase
    .from("financial_reconciliation" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      expected_amount: params.expected,
      actual_amount: params.actual,
      delta,
      currency: params.currency ?? "USD",
      notes: params.notes ?? null,
      status,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function resolveReconciliation(params: {
  reconId: string;
  notes?: string;
  resolvedBy?: string;
}) {
  const { data, error } = await supabase
    .from("financial_reconciliation" as any)
    .update({
      status: "resolved",
      notes: params.notes ?? null,
      resolved_by: params.resolvedBy ?? null,
      resolved_at: new Date().toISOString(),
    } as any)
    .eq("id", params.reconId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
