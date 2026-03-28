import { supabase } from "@/integrations/supabase/client";

export async function fetchTenantInfoForPay(userId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, org_id, property_id, rent_amount, charges_amount, properties(label)")
    .eq("tenant_user_id", userId)
    .limit(1)
    .single();
  return tenant;
}

export async function fetchOrgForTenant(orgId: string) {
  const { data } = await supabase
    .from("orgs")
    .select("name, email, phone, stripe_account_id, stripe_onboarding_complete")
    .eq("id", orgId)
    .single();
  return data;
}

export async function fetchOwnerBankForTenant(orgId: string) {
  const { data } = await supabase.rpc("get_owner_bank_for_tenant", { _org_id: orgId });
  return Array.isArray(data) ? data[0] || null : data;
}

export async function fetchUnpaidRentCalls(tenantId: string) {
  const { data } = await supabase
    .from("rent_calls")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("paid", false)
    .order("month", { ascending: false });
  return data || [];
}

export async function invokeRentPayment(rentCallId: string, paymentMethod: string) {
  const { data, error } = await supabase.functions.invoke("create-rent-payment", {
    body: { rent_call_id: rentCallId, payment_method: paymentMethod },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function declareTransfer(rentCallId: string) {
  await supabase
    .from("rent_calls")
    .update({ payment_status: "processing", payment_method: "bank_transfer" } as any)
    .eq("id", rentCallId);
}

export async function notifyOwnerOfTransfer(orgId: string, ownerId: string, body: string) {
  await (supabase as any).from("app_notifications").insert({
    user_id: ownerId,
    scope: "global",
    category: "payment",
    title: "🏦 Bank transfer declared",
    body,
    severity: "info",
    metadata: { module: "rental" },
  });
}

export async function fetchOrgOwner(orgId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "owner")
    .limit(1);
  return data?.[0]?.user_id ?? null;
}
