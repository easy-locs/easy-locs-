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

// ── Moderation ──
export async function fetchPendingReviews(orgId: string) {
  const { data } = await (supabase as any)
    .from("marketplace_reviews")
    .select("id, reviewer_name, rating, comment, status, created_at, service_id")
    .eq("org_id", orgId)
    .in("status", ["pending", "flagged"])
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function moderateReview(reviewId: string, action: "published" | "rejected") {
  const { error } = await supabase.from("marketplace_reviews").update({ status: action } as any).eq("id", reviewId);
  if (error) throw error;
}

export async function fetchBlockedUsers() {
  const { data } = await supabase.from("blocked_users").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function unblockUser(blockId: string) {
  const { error } = await supabase.from("blocked_users").delete().eq("id", blockId);
  if (error) throw error;
}

// ── Org Members ──
export async function fetchOrgMembers(orgId: string) {
  const { data } = await supabase.from("org_members").select("id, user_id, role, created_at").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

export async function fetchProfilesByIds(ids: string[]) {
  const { data } = await supabase.from("profiles").select("id, name, email, first_name, last_name").in("id", ids);
  return data ?? [];
}

export async function changeOrgMemberRole(memberId: string, newRole: string) {
  const { error } = await supabase.from("org_members").update({ role: newRole } as any).eq("id", memberId);
  if (error) throw error;
}

export async function removeOrgMember(memberId: string) {
  const { error } = await supabase.from("org_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function sendCollaborationInvite(record: Record<string, any>) {
  const { error } = await supabase.from("collaboration_invitations").insert(record as any);
  if (error) throw error;
}

// ── Rider Moderation ──
export async function fetchRiderPresence() {
  const { data } = await (supabase as any).from("rider_presence").select("*").limit(100);
  return data ?? [];
}

export async function updateRiderPresenceStatus(userId: string, updates: Record<string, any>) {
  await (supabase as any).from("rider_presence").update(updates).eq("user_id", userId);
}

export async function insertAppNotification(record: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(record);
}

// ── Bulk Seed ──
export async function getAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getUserOrgId(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.org_id ?? null;
}

export async function insertStorefrontPage(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("storefront_pages").insert(record).select("id").single();
  if (error) throw error;
  return data;
}

export async function insertProducts(records: Record<string, any>[]) {
  await (supabase as any).from("products").insert(records);
}

export async function bulkLaunchStorefronts() {
  const { error } = await (supabase as any).from("storefront_pages").update({ visibility_mode: "live" }).eq("visibility_mode", "coming_soon");
  if (error) throw error;
}
