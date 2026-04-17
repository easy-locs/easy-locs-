import { db } from "@/services/db";

import { ctFrom as cFrom, ctRpc as cRpc } from "@/lib/execution/contacts-mutation";
export async function fetchTenantInfoForPay(userId: string) {
  const { data: tenant } = await cFrom("tenants")
    .select("id, org_id, property_id, rent_amount, charges_amount, properties(label)")
    .eq("tenant_user_id", userId)
    .limit(1)
    .single();
  return tenant;
}

export async function fetchOrgForTenant(orgId: string) {
  const { data } = await cFrom("orgs")
    .select("name, email, phone, stripe_account_id, stripe_onboarding_complete")
    .eq("id", orgId)
    .single();
  return data;
}

export async function fetchOwnerBankForTenant(orgId: string) {
  const { data } = await cRpc("get_owner_bank_for_tenant", { _org_id: orgId });
  return Array.isArray(data) ? data[0] || null : data;
}

export async function fetchUnpaidRentCalls(tenantId: string) {
  const { data } = await cFrom("rent_calls")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("paid", false)
    .order("month", { ascending: false });
  return data || [];
}

export async function invokeRentPayment(rentCallId: string, paymentMethod: string) {
  const { data, error } = await db.functions.invoke("rent-payment", {
    body: { rent_call_id: rentCallId, payment_method: paymentMethod, mode: "checkout" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function declareTransfer(rentCallId: string) {
  await cFrom("rent_calls")
    .update({ payment_status: "processing", payment_method: "bank_transfer" } as any)
    .eq("id", rentCallId);
}

export async function notifyOwnerOfTransfer(orgId: string, ownerId: string, body: string) {
  await cFrom("app_notifications").insert({
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
  const { data } = await cFrom("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "owner")
    .limit(1);
  return data?.[0]?.user_id ?? null;
}
