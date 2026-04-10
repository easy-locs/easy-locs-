import { supabase } from "@/integrations/supabase/client";

export async function checkConnectStatus() {
  const { data, error } = await supabase.functions.invoke("check-connect-status");
  if (error) throw error;
  return data as { connected: boolean; onboarding_complete: boolean; charges_enabled?: boolean; payouts_enabled?: boolean };
}

export async function createConnectAccount() {
  const { data, error } = await supabase.functions.invoke("create-connect-account");
  if (error) throw error;
  return data as { url?: string };
}

export async function disconnectStripe() {
  const { data, error } = await supabase.functions.invoke("disconnect-stripe");
  if (error) throw error;
  return data;
}

export async function fetchFinancialData(orgId: string, countryFilter?: string | null) {
  let propsQuery = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
  if (countryFilter) propsQuery = propsQuery.eq("country", countryFilter);
  const { data: props } = await propsQuery;
  const filteredProps = (props || []) as Array<{ id: string; label: string; country: string }>;
  const propIds = filteredProps.map(p => p.id);

  let rentCalls: any[] = [];
  let expenses: any[] = [];

  if (propIds.length > 0) {
    const [{ data: rc }, { data: exp }] = await Promise.all([
      supabase.from("rent_calls").select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id, payment_status, payment_method").eq("org_id", orgId).in("property_id", propIds).order("month", { ascending: true }),
      supabase.from("expenses").select("id, label, amount, category, expense_date, property_id").eq("org_id", orgId).in("property_id", propIds).order("expense_date", { ascending: false }),
    ]);
    rentCalls = rc || [];
    expenses = exp || [];
  } else if (!countryFilter) {
    const [{ data: rc }, { data: exp }] = await Promise.all([
      supabase.from("rent_calls").select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id, payment_status, payment_method").eq("org_id", orgId).order("month", { ascending: true }),
      supabase.from("expenses").select("id, label, amount, category, expense_date, property_id").eq("org_id", orgId).order("expense_date", { ascending: false }),
    ]);
    rentCalls = rc || [];
    expenses = exp || [];
  }

  return { properties: filteredProps, rentCalls, expenses };
}
