/**
 * admin.repository — All DB operations for AdminDashboard page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function checkAdminRole(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

export async function fetchAdminStats() {
  const [users, subs, props, docs, refs, bookingReqs, paidRents, confirmedRes] = await Promise.all([
    supabase.from("profiles").select("id, email, name, created_at, user_type", { count: "exact" }),
    supabase.from("subscriptions").select("id, plan, status, created_at", { count: "exact" }),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("referrals").select("id", { count: "exact", head: true }),
    supabase.from("booking_requests").select("id, status", { count: "exact" }),
    supabase.from("rent_calls").select("id, paid, total_amount, paid_date, month").eq("paid", true),
    supabase.from("reservations").select("id, amount, status, created_at").eq("status", "confirmed"),
  ]);

  return {
    users: { data: users.data || [], count: users.count || 0 },
    subs: { data: subs.data || [], count: subs.count || 0 },
    propsCount: props.count || 0,
    docsCount: docs.count || 0,
    refsCount: refs.count || 0,
    bookingReqs: { data: bookingReqs.data || [], count: bookingReqs.count || 0 },
    paidRents: paidRents.data || [],
    confirmedRes: confirmedRes.data || [],
  };
}
