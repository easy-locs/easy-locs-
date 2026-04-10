import { db } from "./db";


export const adminOpsService = {
  async fetchAllSupportTickets(limit = 100) {
    const { data, error } = await db("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchStorefrontSources() {
    const { data, error } = await db("storefront_pages")
      .select("source_type, source_confidence, is_claimed") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRankingDistribution() {
    const { data, error } = await db("current_ranking_state")
      .select("visibility_class, global_rank_score, entity_type") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchShopsByUser(userId: string) {
    const { data, error } = await db("storefront_pages")
      .select("id, name, shop_visibility, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOrdersByShopIds(shopIds: string[]) {
    if (shopIds.length === 0) return [];
    const { data, error } = await db("storefront_orders")
      .select("id, status, total, created_at")
      .in("shop_id", shopIds) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchLaunchAudits(userId: string) {
    const { data, error } = await db("orbit_launch_audits")
      .select("*")
      .eq("user_id", userId)
      .order("checked_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchDriverLocations(limit = 200) {
    const { data, error } = await db("driver_locations")
      .select("lat, lng")
      .order("recorded_at", { ascending: false })
      .limit(limit) as { data: Array<{ lat: number; lng: number }> | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchReconAlerts(limit = 100) {
    const { data, error } = await db("recon_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async countByStatus(table: string, statusField: string, statusValues: string[]) {
    const { count, error } = await db(table)
      .select("id", { count: "exact", head: true })
      .in(statusField, statusValues) as { count: number | null; error: unknown };
    if (error) throw error;
    return count ?? 0;
  },

  async countAll(table: string) {
    const { count, error } = await db(table)
      .select("id", { count: "exact", head: true }) as { count: number | null; error: unknown };
    if (error) throw error;
    return count ?? 0;
  },

  async countWhere(table: string, field: string, value: unknown) {
    const { count, error } = await db(table)
      .select("id", { count: "exact", head: true })
      .eq(field, value) as { count: number | null; error: unknown };
    if (error) throw error;
    return count ?? 0;
  },

  async fetchMerchantOnboardingCities() {
    const { data, error } = await db("merchant_onboarding_profiles")
      .select("city")
      .not("city", "is", null) as { data: Array<{ city: string }> | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOrderForDiagnostics(orderId: string) {
    const { data, error } = await db("orders")
      .select("id, status, payment_status, wallet_status, settlement_status, gross_amount, delivery_fee, platform_commission_amount, merchant_net_amount, driver_amount, order_mode, payment_mode, currency, customer_wallet_id, created_at")
      .eq("id", orderId)
      .single() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchWalletOrderSplits(orderId: string) {
    const { data, error } = await db("wallet_order_splits")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchWalletTransactionsByContext(contextId: string) {
    const { data, error } = await db("unified_wallet_transactions")
      .select("*")
      .eq("context_id", contextId)
      .order("created_at") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchWalletAuditLogs(limit = 20) {
    const { data, error } = await db("audit_logs")
      .select("*")
      .ilike("action", "wallet_%")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchLedgerByTransactionIds(txIds: string[]) {
    if (txIds.length === 0) return [];
    const { data, error } = await db("wallet_ledger_entries")
      .select("*")
      .in("transaction_id", txIds)
      .order("created_at") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertQrOrderTargets(rows: Record<string, unknown>[]) {
    const { data, error } = await db("qr_order_targets")
      .insert(rows)
      .select("*") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchUnclaimedMerchants(limit = 50) {
    const { data, error } = await db("merchant_onboarding_profiles")
      .select("*")
      .eq("status", "imported_not_claimed")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRideDisputes() {
    const { data, error } = await db("ride_disputes")
      .select("*")
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateDisputeStatus(disputeId: string, status: string) {
    const { error } = await db("ride_disputes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", disputeId);
    if (error) throw error;
  },

  async cancelMobilityJob(jobId: string, reason: string) {
    const { error } = await db("mobility_jobs")
      .update({ status: "cancelled", cancel_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) throw error;
  },

  async fetchActivityLogs(actions: string[], limit = 300) {
    const { data, error } = await db("activity_logs")
      .select("action,created_at,entity_id,entity_type")
      .in("action", actions)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCouponsWithMerchant(limit = 500) {
    const { data, error } = await db("seed_merchant_promos")
      .select("*, seed_merchants(name)")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchAppNotifications(limit = 300) {
    const { data, error } = await db("app_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchAllReviews(limit = 500) {
    const { data, error } = await db("reviews")
      .select("*")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchAllLoyaltyAccounts(limit = 500) {
    const { data, error } = await db("loyalty_accounts")
      .select("*")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMerchantApprovalQueue(limit = 200) {
    const { data, error } = await db("seed_merchants")
      .select("*")
      .neq("onboarding_status", "ready")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async approveMerchant(merchantId: string) {
    const { error } = await db("seed_merchants")
      .update({
        onboarding_status: "ready",
        is_active: true,
        is_open: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId);
    if (error) throw error;
  },

  async fetchMerchantHealthData() {
    const [merchantsRes, productsRes, promosRes] = await Promise.all([
      db("seed_merchants").select("*").limit(500),
      db("seed_products").select("*").limit(5000),
      db("seed_merchant_promos").select("*").limit(2000),
    ]);
    if (merchantsRes.error) throw merchantsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (promosRes.error) throw promosRes.error;
    return {
      merchants: (merchantsRes.data ?? []) as any[],
      products: (productsRes.data ?? []) as any[],
      promos: (promosRes.data ?? []) as any[],
    };
  },

  async fetchSeedMerchantsForScoring(limit = 150) {
    const { data, error } = await db("seed_merchants")
      .select("id, rating, review_count, is_featured, is_open, promo_active")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateMerchantVisibilityScore(merchantId: string, score: number) {
    const { error } = await db("seed_merchants")
      .update({ visibility_score: score, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    if (error) throw error;
  },

  async fetchRankingStats() {
    const { data, error } = await db("current_ranking_state")
      .select("entity_type, visibility_class, global_rank_score, claim_ready, boost_ready") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRankingEntities(limit = 50) {
    const { data, error } = await db("current_ranking_state")
      .select("*")
      .order("global_rank_score", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchSeedMerchantCategories() {
    const { data, error } = await db("seed_merchants")
      .select("category")
      .eq("is_active", true) as { data: Array<{ category: string }> | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchImportDashboard() {
    const [batchRes, candRes, stateRes] = await Promise.all([
      db("import_batches").select("*").order("created_at", { ascending: false }).limit(20),
      db("onboarding_shop_candidates").select("*").order("created_at", { ascending: false }).limit(200),
      db("merchant_onboarding_state").select("entity_id, ui_quality_status, menu_visual_status, storefront_ready_status, menu_display_score, visual_completeness_score, storefront_readiness_score, visual_flags_json").limit(500),
    ]);
    if (batchRes.error) throw batchRes.error;
    if (candRes.error) throw candRes.error;
    if (stateRes.error) throw stateRes.error;
    return {
      batches: batchRes.data ?? [],
      candidates: candRes.data ?? [],
      onboardingStates: stateRes.data ?? [],
    };
  },

  async updateCandidateStatus(id: string, status: string) {
    const { error } = await db("onboarding_shop_candidates")
      .update({ candidate_status: status })
      .eq("id", id);
    if (error) throw error;
  },

  async fetchAdminAlerts(limit = 50) {
    const { data, error } = await db("admin_alerts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchTestBatches(limit = 20) {
    const { data, error } = await db("import_test_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertTestBatch(payload: Record<string, unknown>) {
    const { data, error } = await db("import_test_batches")
      .insert(payload)
      .select("*")
      .single() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateTestBatch(batchId: string, patch: Record<string, unknown>) {
    const { error } = await db("import_test_batches")
      .update(patch)
      .eq("id", batchId);
    if (error) throw error;
  },

  async insertOnboardingProfiles(rows: Record<string, unknown>[]) {
    const { data, error } = await db("merchant_onboarding_profiles")
      .insert(rows)
      .select("id") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async deleteMenuItemsByBatch(batchId: string) {
    const { error } = await db("menu_items")
      .delete()
      .eq("test_batch_id", batchId);
    if (error) throw error;
  },

  async fetchOnboardingProfile(profileId: string) {
    const { data, error } = await db("merchant_onboarding_profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchConversations(userId: string, limit = 20) {
    const { data, error } = await db("orbit_conversations")
      .select("id, created_at, participant_ids, last_message_at")
      .contains("participant_ids", [userId])
      .order("last_message_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMessages(conversationId: string, limit = 30) {
    const { data, error } = await db("chat_messages_v2")
      .select("id, body, type, sender_user_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertTestMessage(payload: Record<string, unknown>) {
    const { data, error } = await db("chat_messages_v2")
      .insert(payload)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async deleteTestMessage(messageId: string) {
    const { error } = await db("chat_messages_v2")
      .delete()
      .eq("id", messageId);
    if (error) throw error;
  },

  async fetchCallLogs(limit = 3) {
    const { data, error } = await db("call_logs")
      .select("id, status, call_type")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRawConversationsV2(limit = 10) {
    const { data, error } = await db("conversations_v2")
      .select("*")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRawMessagesV2(limit = 5) {
    const { data, error } = await db("chat_messages_v2")
      .select("id, body, sender_user_id, conversation_id")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async wipeTestOnboardingProfiles() {
    const { error } = await db("merchant_onboarding_profiles")
      .delete()
      .ilike("business_name", "TEST %");
    if (error) throw error;
  },

  async markTestBatchDeleted(batchId: string) {
    const { error } = await db("import_test_batches")
      .update({ status: "deleted", completed_at: new Date().toISOString() })
      .eq("id", batchId);
    if (error) throw error;
  },
};
