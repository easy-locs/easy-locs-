import { supabase } from "@/integrations/supabase/client";

// ─── Super Dashboard ───
export async function fetchSuperDashboardOrders() {
  const { data, error } = await supabase.from("orders").select("id,status,total_amount,payment_status").limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuperDashboardMerchants() {
  const { data, error } = await (supabase as any).from("seed_merchants").select("id,is_active,is_open,promo_active").limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuperDashboardDrivers() {
  const { data, error } = await (supabase as any).from("driver_profiles").select("id,is_online,is_available").limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuperDashboardTickets() {
  const { data, error } = await (supabase as any).from("support_tickets").select("id,status").limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuperDashboardLedger() {
  const { data, error } = await supabase.from("wallet_ledger_entries").select("id,amount,direction,entry_type").limit(1000);
  if (error) throw error;
  return data ?? [];
}

// ─── Ops Dashboard ───
export async function fetchOpsDashboardData() {
  const [{ data: orders }, { data: merchants }, { data: tickets }] = await Promise.all([
    supabase.from("orders").select("id,status,total_amount").limit(500),
    (supabase as any).from("seed_merchants").select("id,is_active,is_open").limit(500),
    (supabase as any).from("support_tickets").select("id,status,ticket_type").limit(500),
  ]);
  return { orders: orders ?? [], merchants: merchants ?? [], tickets: tickets ?? [] };
}

// ─── Finance Summary ───
export async function fetchFinanceSummaryData() {
  const [{ data: orders }, { data: ledger }, { data: wallets }] = await Promise.all([
    supabase.from("orders").select("total_amount,payment_status,status,currency").limit(5000),
    supabase.from("wallet_ledger_entries").select("amount,direction,entry_type").limit(5000),
    supabase.from("wallet_accounts").select("balance").limit(2000),
  ]);
  return { orders: orders ?? [], ledger: ledger ?? [], wallets: wallets ?? [] };
}

// ─── Growth Dashboard ───
export async function fetchGrowthDashboardData() {
  const [{ count: users }, { count: merchants }, { count: orders }, { count: favorites }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    (supabase as any).from("seed_merchants").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("user_favorites").select("*", { count: "exact", head: true }),
  ]);
  return { users: users ?? 0, merchants: merchants ?? 0, orders: orders ?? 0, favorites: favorites ?? 0 };
}

// ─── System Health ───
export async function fetchSystemHealthData() {
  const [{ count: users }, { count: orders }, { count: tickets }, { count: wallets }, { count: notifications }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    (supabase as any).from("support_tickets").select("*", { count: "exact", head: true }),
    supabase.from("wallet_accounts").select("*", { count: "exact", head: true }),
    (supabase as any).from("app_notifications").select("*", { count: "exact", head: true }),
  ]);
  return { users: users ?? 0, orders: orders ?? 0, tickets: tickets ?? 0, wallets: wallets ?? 0, notifications: notifications ?? 0 };
}

// ─── User Lookup ───
export async function fetchUserLookupData(userId: string) {
  const [{ data: favorites }, { data: tickets }, { data: orders }, { data: wallets }] = await Promise.all([
    supabase.from("user_favorites").select("*").eq("user_id", userId).limit(200),
    (supabase as any).from("support_tickets").select("*").eq("requester_user_id", userId).limit(200),
    supabase.from("orders").select("*").eq("customer_user_id", userId).limit(200),
    supabase.from("wallet_accounts").select("*").eq("owner_user_id", userId).limit(50),
  ]);
  return { favorites: favorites ?? [], tickets: tickets ?? [], orders: orders ?? [], wallets: wallets ?? [] };
}

// ─── Wallet Watch ───
export async function fetchWalletWatchData() {
  const [{ data: accounts }, { data: ledger }] = await Promise.all([
    supabase.from("wallet_accounts").select("*").limit(2000),
    supabase.from("wallet_ledger_entries").select("*").limit(5000),
  ]);
  return { accounts: accounts ?? [], ledger: ledger ?? [] };
}

// ─── Platform Alerts ───
export async function fetchPlatformAlertsData() {
  const [{ data: tickets }, { data: notifications }, { data: orders }] = await Promise.all([
    (supabase as any).from("support_tickets").select("id,status").limit(2000),
    (supabase as any).from("app_notifications").select("id,type").limit(2000),
    supabase.from("orders").select("id,status,payment_status").limit(3000),
  ]);
  return { tickets: tickets ?? [], notifications: notifications ?? [], orders: orders ?? [] };
}

// ─── CRM Ops ───
export async function fetchCrmOpsData() {
  const [{ data: loyalty }, { data: favorites }, { data: tickets }] = await Promise.all([
    (supabase as any).from("loyalty_accounts").select("*").limit(500),
    supabase.from("user_favorites").select("*").limit(1000),
    (supabase as any).from("support_tickets").select("*").limit(1000),
  ]);
  return { loyalty: loyalty ?? [], favorites: favorites ?? [], tickets: tickets ?? [] };
}

// ─── Growth Ops ───
export async function fetchGrowthOpsData() {
  const [{ data: merchants }, { data: promos }, { data: favorites }, { data: events }] = await Promise.all([
    (supabase as any).from("seed_merchants").select("*").limit(1000),
    (supabase as any).from("seed_merchant_promos").select("*").limit(1000),
    supabase.from("user_favorites").select("*").limit(2000),
    (supabase as any).from("activity_logs").select("action").in("action", ["home_view", "merchant_view", "product_add_to_cart", "order_created"]).limit(5000),
  ]);
  return { merchants: merchants ?? [], promos: promos ?? [], favorites: favorites ?? [], events: events ?? [] };
}

// ─── Retention Ops ───
export async function fetchRetentionOpsData() {
  const [{ data: orders }, { data: favorites }, { data: loyalty }, { data: searches }] = await Promise.all([
    supabase.from("orders").select("customer_user_id,status,total_amount").limit(2000),
    supabase.from("user_favorites").select("user_id").limit(2000),
    (supabase as any).from("loyalty_accounts").select("*").limit(2000),
    (supabase as any).from("activity_logs").select("entity_id,action").eq("action", "search_used").limit(2000),
  ]);
  return { orders: orders ?? [], favorites: favorites ?? [], loyalty: loyalty ?? [], searches: searches ?? [] };
}

// ─── Central Control Panel ───
export async function triggerEngineCron() {
  const { data, error } = await supabase.functions.invoke("engine-cron-server", { body: {} });
  if (error) throw error;
  return data;
}

export async function toggleEngineStatus(name: string, current: boolean) {
  await (supabase as any).from("engine_supervisor").update({ enabled: !current }).eq("engine_name", name);
}

// ─── Owner Cockpit ───
export async function fetchOwnerCockpitStats() {
  const queries = [
    { key: "merchants", table: "seed_merchants" },
    { key: "notifications", table: "app_notifications" },
    { key: "conversations", table: "conversations_v2" },
    { key: "aiSignals", table: "entity_feedback_signals" },
    { key: "rankings", table: "ranking_snapshots" },
    { key: "recovery", table: "platform_recovery_runs" },
    { key: "support", table: "support_tickets" },
    { key: "reviews", table: "verified_reviews" },
    { key: "orders", table: "storefront_orders" },
    { key: "wallets", table: "wallet_accounts" },
  ];
  const results = await Promise.all(
    queries.map(q => (supabase as any).from(q.table).select("*", { count: "exact", head: true }).catch(() => ({ count: 0 })))
  );
  const s: Record<string, number> = {};
  queries.forEach((q, i) => { s[q.key] = results[i]?.count ?? 0; });
  return s;
}

export async function invokeOwnerAction(action: string) {
  const { error } = await supabase.functions.invoke(action);
  if (error) throw error;
}

// ─── Pipeline ───
export async function invokeUaeScrape(city: string, vertical: string) {
  const { data, error } = await supabase.functions.invoke("uae-scrape-onboard", {
    body: { city, vertical, limit: 20 },
  });
  if (error) throw error;
  return data;
}

// ─── Platform Recovery ───
export async function fetchPlatformRecoveryRuns() {
  const { data } = await (supabase as any)
    .from("platform_recovery_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function invokeServerRecovery(job: string) {
  await supabase.functions.invoke("platform-recovery", { body: { job } });
}
