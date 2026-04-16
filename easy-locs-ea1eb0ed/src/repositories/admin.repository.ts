/**
 * admin.repository — All DB operations for AdminDashboard page.
 */
import { db } from "@/services/db";

export async function checkAdminRole(userId: string): Promise<boolean> {
  const { data } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

export async function fetchAdminStats() {
  const [users, subs, props, docs, refs, bookingReqs, paidRents, confirmedRes] = await Promise.all([
    db("profiles").select("id, email, name, created_at, user_type", { count: "exact" }),
    db("subscriptions").select("id, plan, status, created_at", { count: "exact" }),
    db("properties").select("id", { count: "exact", head: true }),
    db("documents").select("id", { count: "exact", head: true }),
    db("referrals").select("id", { count: "exact", head: true }),
    db("booking_requests").select("id, status", { count: "exact" }),
    db("rent_calls").select("id, paid, total_amount, paid_date, month").eq("paid", true),
    db("reservations").select("id, amount, status, created_at").eq("status", "confirmed"),
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
  const { data } = await db
    .from("marketplace_reviews")
    .select("id, reviewer_name, rating, comment, status, created_at, service_id")
    .eq("org_id", orgId)
    .in("status", ["pending", "flagged"])
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function moderateReview(reviewId: string, action: "published" | "rejected") {
  const { error } = await db("marketplace_reviews").update({ status: action } as any).eq("id", reviewId);
  if (error) throw error;
}

export async function fetchBlockedUsers() {
  const { data } = await db("blocked_users").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function unblockUser(blockId: string) {
  const { error } = await db("blocked_users").delete().eq("id", blockId);
  if (error) throw error;
}

// ── Org Members ──
export async function fetchOrgMembers(orgId: string) {
  const { data } = await db("org_members").select("id, user_id, role, created_at").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

export async function fetchProfilesByIds(ids: string[]) {
  const { data } = await db("profiles").select("id, name, email, first_name, last_name").in("id", ids);
  return data ?? [];
}

export async function changeOrgMemberRole(memberId: string, newRole: string) {
  const { error } = await db("org_members").update({ role: newRole } as any).eq("id", memberId);
  if (error) throw error;
}

export async function removeOrgMember(memberId: string) {
  const { error } = await db("org_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function sendCollaborationInvite(record: Record<string, any>) {
  const { error } = await db("collaboration_invitations").insert(record as any);
  if (error) throw error;
}

// ── Rider Moderation ──
export async function fetchRiderPresence() {
  const { data } = await db("rider_presence").select("*").limit(100);
  return data ?? [];
}

export async function updateRiderPresenceStatus(userId: string, updates: Record<string, any>) {
  await db("rider_presence").update(updates).eq("user_id", userId);
}

export async function insertAppNotification(record: Record<string, any>) {
  await db("app_notifications").insert(record);
}

// ── Bulk Seed ──
export async function getAuthUser() {
  const { data } = await db.auth.getUser();
  return data.user;
}

export async function getUserOrgId(userId: string) {
  const { data } = await db("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.org_id ?? null;
}

export async function insertStorefrontPage(record: Record<string, any>) {
  const { data, error } = await db("storefront_pages").insert(record).select("id").single();
  if (error) throw error;
  return data;
}

export async function insertProducts(records: Record<string, any>[]) {
  await db("products").insert(records);
}

export async function bulkLaunchStorefronts() {
  const { error } = await db("storefront_pages").update({ visibility_mode: "live" }).eq("visibility_mode", "coming_soon");
  if (error) throw error;
}

export interface CronExecutionLog {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failure";
  duration_ms: number | null;
  error_message: string | null;
  rows_affected: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CronJobStats {
  job_name: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
  avg_rows_affected: number;
  last_run: string | null;
  last_status: string | null;
}

export async function fetchCronExecutionLogs(
  limit = 50,
  startDate?: string,
  endDate?: string,
): Promise<CronExecutionLog[]> {
  let query = db("cron_execution_log")
    .select("*")
    .order("started_at", { ascending: false });

  if (startDate) {
    query = query.gte("started_at", startDate);
  }
  if (endDate) {
    query = query.lte("started_at", endDate);
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CronExecutionLog[];
}

export interface CronAlertPrefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
}

export async function fetchCronAlertPrefs(userId: string): Promise<CronAlertPrefs> {
  const { data } = await db("admin_cron_alert_prefs")
    .select("in_app_enabled, email_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    in_app_enabled: data?.in_app_enabled ?? true,
    email_enabled: data?.email_enabled ?? false,
  };
}

export async function upsertCronAlertPrefs(
  userId: string,
  prefs: CronAlertPrefs
): Promise<void> {
  const { error } = await db("admin_cron_alert_prefs")
    .upsert(
      {
        user_id: userId,
        in_app_enabled: prefs.in_app_enabled,
        email_enabled: prefs.email_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

export interface FirecrawlUsageSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_estimated_cost: number;
  avg_text_length: number;
}

export async function fetchFirecrawlUsageSummary(days = 30): Promise<FirecrawlUsageSummary> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db("firecrawl_usage_log")
    .select("success, text_length, estimated_cost")
    .gte("created_at", cutoff);

  if (error) throw error;
  const rows = (data ?? []) as { success: boolean; text_length: number; estimated_cost?: number }[];
  const successful = rows.filter(r => r.success);
  const textLengths = rows.filter(r => r.text_length > 0).map(r => r.text_length);

  return {
    total_calls: rows.length,
    successful_calls: successful.length,
    failed_calls: rows.length - successful.length,
    total_estimated_cost: rows.reduce((sum, r) => sum + (r.estimated_cost ?? 0.001), 0),
    avg_text_length: textLengths.length > 0 ? Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length) : 0,
  };
}

export interface CacheMetricsHistoryEntry {
  recorded_at: string;
  hit_rate: number;
  hits: number;
  misses: number;
  current_size: number;
}

export async function fetchCacheMetricsHistory(days = 7): Promise<CacheMetricsHistoryEntry[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db("cache_metrics_history")
    .select("recorded_at, hit_rate, hits, misses, current_size")
    .gte("recorded_at", cutoff)
    .order("recorded_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CacheMetricsHistoryEntry[];
}

export interface PrayerCronHealth {
  total_runs_24h: number;
  success_count: number;
  failure_count: number;
  last_run: string | null;
  last_status: string | null;
  avg_duration_ms: number;
  notifications_sent_24h: number;
}

export async function fetchPrayerCronHealth(): Promise<PrayerCronHealth> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db("cron_execution_log")
    .select("*")
    .in("job_name", ["prayer-push-cron", "prayer-push-reconcile"])
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false });

  if (error) throw error;
  const logs = (data ?? []) as CronExecutionLog[];
  const successes = logs.filter(l => l.status === "success");
  const failures = logs.filter(l => l.status === "failure");
  const durations = logs.filter(l => l.duration_ms != null).map(l => l.duration_ms!);
  const totalSent = logs
    .filter(l => l.metadata)
    .reduce((sum, l) => {
      const meta = l.metadata as Record<string, unknown>;
      return sum + (typeof meta.sent === "number" ? meta.sent : 0);
    }, 0);

  return {
    total_runs_24h: logs.length,
    success_count: successes.length,
    failure_count: failures.length,
    last_run: logs[0]?.started_at ?? null,
    last_status: logs[0]?.status ?? null,
    avg_duration_ms: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    notifications_sent_24h: totalSent,
  };
}

export interface ReconciliationStats {
  total_reconciled_24h: number;
  failures_found: number;
  stale_no_response: number;
  edge_function_failures: number;
}

export async function fetchReconciliationStats(): Promise<ReconciliationStats> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db("cron_execution_log")
    .select("metadata")
    .not("metadata->>reconciliation", "is", null)
    .gte("started_at", cutoff);

  if (error) throw error;
  const rows = (data ?? []) as { metadata: Record<string, unknown> }[];

  return {
    total_reconciled_24h: rows.length,
    failures_found: rows.filter(r => r.metadata?.reconciliation).length,
    stale_no_response: rows.filter(r => r.metadata?.reconciliation === "stale_no_response").length,
    edge_function_failures: rows.filter(r => r.metadata?.reconciliation === "edge_function_failure").length,
  };
}

export function computeCronJobStats(logs: CronExecutionLog[]): CronJobStats[] {
  const grouped: Record<string, CronExecutionLog[]> = {};
  for (const log of logs) {
    if (!grouped[log.job_name]) grouped[log.job_name] = [];
    grouped[log.job_name].push(log);
  }

  return Object.entries(grouped).map(([job_name, entries]) => {
    const sorted = entries.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    const successes = entries.filter(e => e.status === "success");
    const failures = entries.filter(e => e.status === "failure");
    const durations = entries.filter(e => e.duration_ms != null).map(e => e.duration_ms!);
    const rows = entries.filter(e => e.rows_affected != null).map(e => e.rows_affected!);

    return {
      job_name,
      total_runs: entries.length,
      success_count: successes.length,
      failure_count: failures.length,
      avg_duration_ms: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      avg_rows_affected: rows.length > 0 ? Math.round(rows.reduce((a, b) => a + b, 0) / rows.length) : 0,
      last_run: sorted[0]?.started_at ?? null,
      last_status: sorted[0]?.status ?? null,
    };
  }).sort((a, b) => {
    if (!a.last_run) return 1;
    if (!b.last_run) return -1;
    return new Date(b.last_run).getTime() - new Date(a.last_run).getTime();
  });
}
