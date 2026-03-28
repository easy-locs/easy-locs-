/**
 * Expenses Repository — All DB access for Expenses page.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseRecord {
  id: string;
  property_id: string | null;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  notes: string;
}

export interface PropertyOption {
  id: string;
  label: string;
}

export async function fetchExpensesProperties(orgId: string, country?: string | null): Promise<PropertyOption[]> {
  let q = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
  if (country) q = q.eq("country", country);
  const { data } = await q;
  return (data || []).map((p: any) => ({ id: p.id, label: p.label }));
}

export async function fetchExpenses(orgId: string, propertyIds?: string[]): Promise<ExpenseRecord[]> {
  let q = supabase.from("expenses").select("*").eq("org_id", orgId).order("expense_date", { ascending: false });
  if (propertyIds && propertyIds.length > 0) {
    q = q.in("property_id", propertyIds);
  }
  const { data } = await q;
  return (data || []) as ExpenseRecord[];
}

export async function insertExpense(params: {
  org_id: string;
  user_id: string;
  property_id: string | null;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  notes: string;
}) {
  const { error } = await supabase.from("expenses").insert(params);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
