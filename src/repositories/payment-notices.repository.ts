/**
 * payment-notices.repository — All DB operations for PaymentNotices page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchPaymentNoticesData(orgId: string) {
  const [{ data: n }, { data: te }, { data: p }, { data: rc }] = await Promise.all([
    supabase.from("payment_notices").select("*").eq("org_id", orgId).order("due_date", { ascending: false }),
    supabase.from("tenants").select("id, name, property_id, rent_amount, charges_amount").eq("org_id", orgId),
    supabase.from("properties").select("id, label, address, city, country").eq("org_id", orgId),
    supabase.from("rent_calls").select("id, tenant_id, month, total_amount, paid, paid_amount").eq("org_id", orgId).eq("paid", false),
  ]);
  return { notices: n || [], tenants: te || [], properties: p || [], rentCalls: rc || [] };
}

export async function insertPaymentNotices(notices: any[]) {
  const { error } = await supabase.from("payment_notices").insert(notices);
  if (error) throw error;
}

export async function sendNoticeEmail(email: string, subject: string, html: string) {
  await supabase.functions.invoke("send-email", { body: { to: email, subject, html } }).catch(() => {});
}

export async function fetchTenantEmail(tenantId: string) {
  const { data } = await supabase.from("tenants").select("email").eq("id", tenantId).single();
  return data?.email || null;
}

export async function regularizeRentCall(id: string, totalAmount: number) {
  await supabase.from("rent_calls").update({
    paid: true, paid_date: new Date().toISOString().split("T")[0],
    paid_amount: totalAmount, payment_status: "paid",
  }).eq("id", id);
}

export async function partialPayRentCall(id: string, newPaidAmount: number, totalAmount: number) {
  const isFullyPaid = newPaidAmount >= totalAmount;
  await supabase.from("rent_calls").update({
    paid: isFullyPaid, paid_date: new Date().toISOString().split("T")[0],
    paid_amount: newPaidAmount, payment_status: isFullyPaid ? "paid" : "partial",
  }).eq("id", id);
}
