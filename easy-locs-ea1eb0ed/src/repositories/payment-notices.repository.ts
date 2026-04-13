/**
 * payment-notices.repository — All DB operations for PaymentNotices page.
 */
import { db } from "@/services/db";

export async function fetchPaymentNoticesData(orgId: string) {
  const [{ data: n }, { data: te }, { data: p }, { data: rc }] = await Promise.all([
    db("payment_notices").select("*").eq("org_id", orgId).order("due_date", { ascending: false }),
    db("tenants").select("id, name, property_id, rent_amount, charges_amount").eq("org_id", orgId),
    db("properties").select("id, label, address, city, country").eq("org_id", orgId),
    db("rent_calls").select("id, tenant_id, month, total_amount, paid, paid_amount").eq("org_id", orgId).eq("paid", false),
  ]);
  return { notices: n || [], tenants: te || [], properties: p || [], rentCalls: rc || [] };
}

export async function insertPaymentNotices(notices: any[]) {
  const { error } = await db("payment_notices").insert(notices);
  if (error) throw error;
}

export async function sendNoticeEmail(email: string, subject: string, html: string) {
  await db.functions.invoke("send-email", { body: { to: email, subject, html } }).catch(() => {});
}

export async function fetchTenantEmail(tenantId: string) {
  const { data } = await db("tenants").select("email").eq("id", tenantId).single();
  return data?.email || null;
}

export async function regularizeRentCall(id: string, totalAmount: number) {
  await db("rent_calls").update({
    paid: true, paid_date: new Date().toISOString().split("T")[0],
    paid_amount: totalAmount, payment_status: "paid",
  }).eq("id", id);
}

export async function partialPayRentCall(id: string, newPaidAmount: number, totalAmount: number) {
  const isFullyPaid = newPaidAmount >= totalAmount;
  await db("rent_calls").update({
    paid: isFullyPaid, paid_date: new Date().toISOString().split("T")[0],
    paid_amount: newPaidAmount, payment_status: isFullyPaid ? "paid" : "partial",
  }).eq("id", id);
}
