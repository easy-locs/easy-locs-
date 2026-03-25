/**
 * PLATFORM CONTINUOUS ENGINE — 80 ENGINES, 24/7 AUTONOMOUS OPERATION
 * System, Digital, Quality, Data, Commerce, Finance, Delivery, Lifecycle + Vertical + Audit engines.
 */

import { runPlatformRecovery } from "./platform-recovery-engine";
import { runAutoFix } from "./platform-auto-fix";
import { runAllHealthChecks } from "./platform-health-checks";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

type IntervalJob = {
  name: string;
  intervalMs: number;
  fn: () => Promise<void> | void;
  timerId?: ReturnType<typeof setInterval>;
  lastRun?: string;
  runCount: number;
  lastStatus: "ok" | "error" | "pending" | "idle" | "warning";
  lastDetail?: string;
  itemsProcessed: number;
  rowsAffected: number;
  businessImpact: string;
  summary: string;
  category: "system" | "digital" | "quality" | "data" | "commerce" | "finance" | "delivery" | "lifecycle";
};

const jobs: IntervalJob[] = [];
let running = false;

function registerJob(
  name: string,
  intervalMs: number,
  fn: () => Promise<void> | void,
  category: IntervalJob["category"] = "system"
) {
  if (jobs.find(j => j.name === name)) return;
  jobs.push({ name, intervalMs, fn, runCount: 0, lastStatus: "pending", itemsProcessed: 0, rowsAffected: 0, businessImpact: "", summary: "", category });
}

async function executeJob(job: IntervalJob) {
  const start = Date.now();
  try {
    await job.fn();
    job.lastStatus = "ok";
    job.lastDetail = `${Date.now() - start}ms`;
  } catch (e: any) {
    job.lastStatus = "error";
    job.lastDetail = e?.message ?? "unknown";
    if (import.meta.env.DEV) console.warn(`[continuous] Job "${job.name}" failed:`, e?.message);
  }
  job.runCount++;
  job.lastRun = new Date().toISOString();
}

export function startContinuousEngine() {
  if (running) return;
  running = true;

  // ═══════════════════════════════════════════════════════════
  // SYSTEM ENGINES (1-10) — 5-10min
  // ═══════════════════════════════════════════════════════════

  registerJob("engine-health", 5 * 60_000, async () => {
    await runEngineHealthChecks();
  }, "system");

  registerJob("platform-recovery", 10 * 60_000, async () => {
    await runPlatformRecovery("cron");
  }, "system");

  registerJob("auto-fix", 5 * 60_000, async () => {
    const fixes = await runAutoFix();
    const applied = fixes.filter(f => f.applied).length;
    if (applied > 0) console.log(`[continuous] Auto-fix applied ${applied} corrections`);
  }, "system");

  registerJob("health-checks", 5 * 60_000, async () => {
    const results = await runAllHealthChecks();
    const unhealthy = results.filter(r => !r.healthy);
    if (unhealthy.length > 0) console.warn(`[continuous] ${unhealthy.length} unhealthy modules`);
  }, "system");

  registerJob("store-consistency", 5 * 60_000, async () => {
    try {
      const { useOrbitStore } = await import("@/stores/orbitStore");
      const { useWalletStore } = await import("@/stores/walletStore");
      const orbitState = useOrbitStore.getState();
      const walletState = useWalletStore.getState();
      if (orbitState.profile && !walletState.wallet) {
        await walletState.loadWallet({
          walletId: `wallet_${orbitState.profile.orbitId}`,
          ownerOrbitId: orbitState.profile.id,
          currency: "AED",
        });
      }
    } catch {}
  }, "system");

  registerJob("backend-reconnect", 5 * 60_000, async () => {
    const { checkBackendReconnect } = await import("./platform-health-checks");
    const results = await checkBackendReconnect();
    const failed = results.filter(r => !r.healthy);
    if (failed.length > 0) console.warn(`[continuous] Backend issues:`, failed.map(r => r.module));
  }, "system");

  registerJob("sla-breach-check", 5 * 60_000, async () => {
    const { checkSlaBreaches } = await import("@/lib/support/global-support-engine");
    const result = await checkSlaBreaches();
    if (result.breached > 0) console.log(`[continuous] SLA: ${result.breached} breaches escalated`);
  }, "system");

  registerJob("self-healing-scan", 10 * 60_000, async () => {
    const { runHealthScan } = await import("@/lib/platform/self-healing-engine");
    const result = await runHealthScan();
    console.log(`[continuous] Self-healing: ${result.emptyPages} empty, ${result.missingImages} no-img, ${result.autoFixed} fixed`);
  }, "system");

  registerJob("permission-check", 15 * 60_000, async () => {
    const { runPermissionCheck } = await import("@/lib/engines/permission-check-engine");
    const result = await runPermissionCheck();
    if (!result.allAccessible) console.warn(`[continuous] Permission issues detected`);
  }, "system");

  registerJob("audit-trail", 30 * 60_000, async () => {
    const { runAuditTrailCheck } = await import("@/lib/engines/audit-trail-engine");
    await runAuditTrailCheck();
  }, "system");

  // ═══════════════════════════════════════════════════════════
  // DIGITAL ORCHESTRATION ENGINES (11-18) — 5-15min
  // ═══════════════════════════════════════════════════════════

  registerJob("digital-orchestration", 15 * 60_000, async () => {
    const { runDigitalOrchestration } = await import("@/lib/engines/digital-orchestration-engine");
    const result = runDigitalOrchestration();
    console.log(`[continuous] Digital: ${result.homepageSections.length} sections, ${result.activeBanners.length} banners`);
  }, "digital");

  registerJob("global-experience-refresh", 5 * 60_000, async () => {
    const { useGlobalExperienceStore } = await import("@/stores/globalExperienceStore");
    useGlobalExperienceStore.getState().refresh();
  }, "digital");

  registerJob("content-freshness", 15 * 60_000, async () => {
    const { runContentFreshnessEngine } = await import("@/lib/engines/content-freshness-engine");
    const result = runContentFreshnessEngine();
    console.log(`[continuous] Content: ${result.totalGenerated} blocks`);
  }, "digital");

  registerJob("campaign-banner", 15 * 60_000, async () => {
    const { runCampaignBannerEngine } = await import("@/lib/engines/campaign-banner-engine");
    const result = await runCampaignBannerEngine();
    console.log(`[continuous] Banners: ${result.totalActive} active`);
  }, "digital");

  registerJob("social-proof", 5 * 60_000, async () => {
    const { runSocialProofEngine } = await import("@/lib/engines/social-proof-engine");
    const result = await runSocialProofEngine();
    console.log(`[continuous] Social proof: ${result.totalPublicEntities} public`);
  }, "digital");

  registerJob("search-intent", 15 * 60_000, async () => {
    const { analyzeSearchIntent } = await import("@/lib/engines/search-intent-engine");
    analyzeSearchIntent(""); // warm cache
  }, "digital");

  registerJob("ux-audit", 30 * 60_000, async () => {
    const { runUxAudit } = await import("@/lib/engines/ux-audit-engine");
    const result = runUxAudit();
    console.log(`[continuous] UX audit: score ${result.globalScore}, fixed ${result.totalFixed}`);
  }, "digital");

  registerJob("visual-consistency", 30 * 60_000, async () => {
    const { runVisualConsistencyAudit } = await import("@/lib/engines/visual-consistency-engine");
    const result = runVisualConsistencyAudit();
    console.log(`[continuous] Visual: score ${result.score.total}, fixed ${result.fixedCount}`);
  }, "digital");

  // ═══════════════════════════════════════════════════════════
  // QUALITY ENGINES (19-28) — 10-30min
  // ═══════════════════════════════════════════════════════════

  registerJob("coherence-sweep", 15 * 60_000, async () => {
    const { runCoherenceGate } = await import("@/lib/engines/coherence-gate");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: unchecked } = await (supabase as any)
      .from("seed_merchants")
      .select("id, name, category, subcategory, menu_items_json")
      .is("coherence_status", null)
      .limit(20);
    if (unchecked?.length) {
      for (const e of unchecked) {
        const menuItems = Array.isArray(e.menu_items_json) ? e.menu_items_json : [];
        await runCoherenceGate(e.id, "seed_merchants", {
          entity_name: e.name ?? "",
          entity_vertical: e.category ?? "food",
          entity_subcategory: e.subcategory ?? "",
          menu_items: menuItems.map((i: any) => i?.name ?? ""),
        });
      }
    }
  }, "quality");

  registerJob("shop-quality", 15 * 60_000, async () => {
    const { runShopQualityCheck } = await import("@/lib/engines/shop-quality-engine");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: shops } = await (supabase as any)
      .from("seed_merchants")
      .select("*")
      .is("visibility_score", null)
      .limit(20);
    if (shops?.length) {
      for (const shop of shops) {
        const result = runShopQualityCheck(shop);
        await (supabase as any)
          .from("seed_merchants")
          .update({ visibility_score: result.globalQualityScore, tier: result.qualityClass })
          .eq("id", shop.id);
      }
    }
  }, "quality");

  registerJob("strict-quality-gate", 10 * 60_000, async () => {
    const { runStrictQualityGate } = await import("@/lib/engines/strict-quality-gate-engine");
    const result = await runStrictQualityGate(100);
    console.log(`[continuous] Quality gate: published=${result.published} blocked=${result.blocked} unpublished=${result.unpublished}`);
  }, "quality");

  registerJob("entity-recovery", 30 * 60_000, async () => {
    const { recoverHiddenEntities } = await import("@/lib/engines/entity-recovery-engine");
    const result = await recoverHiddenEntities(10);
    if (result.recovered > 0) console.log(`[continuous] Recovered ${result.recovered} entities`);
  }, "quality");

  registerJob("data-trust-scan", 30 * 60_000, async () => {
    const { runDataTrustScan } = await import("@/lib/engines/data-trust-engine");
    const result = await runDataTrustScan(100);
    if (result.flagged > 0) console.log(`[continuous] Trust: ${result.flagged}/${result.scanned} flagged`);
  }, "quality");

  registerJob("shop-cleanup", 15 * 60_000, async () => {
    const { runShopCleanupEngine } = await import("@/lib/engines/shop-cleanup-engine");
    const result = await runShopCleanupEngine(200);
    console.log(`[continuous] Cleanup: ${result.autoFixed} fixed, ${result.downgraded} downgraded`);
  }, "quality");

  registerJob("publish-gate", 15 * 60_000, async () => {
    const { runPublishGateSweep } = await import("@/lib/engines/publish-gate-engine");
    const result = await runPublishGateSweep(200);
    console.log(`[continuous] Gate: ${result.passed} passed, ${result.blocked} blocked`);
  }, "quality");

  registerJob("food-quality", 15 * 60_000, async () => {
    const { runFoodQualityCheck } = await import("@/lib/engines/food-quality-engine");
    const result = await runFoodQualityCheck(100);
    if (result.hidden > 0) console.log(`[continuous] Food quality: ${result.hidden} hidden`);
  }, "quality");

  registerJob("franchise-dedup", 60 * 60_000, async () => {
    const { runFranchiseDedup } = await import("@/lib/engines/franchise-dedup-engine");
    const result = await runFranchiseDedup(200);
    if (result.flagged > 0) console.log(`[continuous] Dedup: ${result.flagged} flagged`);
  }, "quality");

  registerJob("seo-check", 30 * 60_000, async () => {
    const { runSeoCheck } = await import("@/lib/engines/seo-engine");
    const result = await runSeoCheck(100);
    console.log(`[continuous] SEO: ${result.optimized} optimized, ${result.issues} need work`);
  }, "quality");

  registerJob("menu-intelligence", 15 * 60_000, async () => {
    const { processMenuIntelligence } = await import("@/lib/engines/menu-intelligence-engine");
    // Warm the engine — actual processing happens per-shop
    processMenuIntelligence([]);
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // DATA ENGINES (29-35) — 15-60min
  // ═══════════════════════════════════════════════════════════

  registerJob("geo-density", 30 * 60_000, async () => {
    const { runGeoDensityEngine } = await import("@/lib/engines/geo-density-engine");
    const result = await runGeoDensityEngine();
    console.log(`[continuous] Geo: ${result.zones.length} zones`);
  }, "data");

  registerJob("data-completeness", 30 * 60_000, async () => {
    const { runDataCompletenessEngine } = await import("@/lib/engines/data-completeness-engine");
    const result = await runDataCompletenessEngine();
    console.log(`[continuous] Completeness: ${result.totalIncomplete}/${result.totalScanned} incomplete`);
  }, "data");

  registerJob("adaptive-taxonomy", 30 * 60_000, async () => {
    const { runAdaptiveTaxonomyEngine } = await import("@/lib/engines/adaptive-taxonomy-engine");
    const result = await runAdaptiveTaxonomyEngine();
    console.log(`[continuous] Taxonomy: ${result.newlyMapped} mapped`);
  }, "data");

  registerJob("onboarding-correction", 30 * 60_000, async () => {
    const { runOnboardingCorrectionLoop } = await import("@/lib/engines/onboarding-correction-engine");
    const result = await runOnboardingCorrectionLoop(100);
    console.log(`[continuous] Onboarding: ${result.reclassified} reclassified, ${result.promoted} promoted`);
  }, "data");

  registerJob("auto-source-enrich", 60 * 60_000, async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).functions.invoke("auto-onboarding-cron", { body: {} });
  }, "data");

  registerJob("fx-refresh", 60 * 60_000, async () => {
    const { runFxRefresh } = await import("@/lib/engines/fx-currency-engine");
    await runFxRefresh();
  }, "data");

  registerJob("notification-cleanup", 60 * 60_000, async () => {
    const { runNotificationCleanup } = await import("@/lib/engines/notification-cleanup-engine");
    const result = await runNotificationCleanup(200);
    if (result.archived > 0) console.log(`[continuous] Notif cleanup: ${result.archived} archived`);
  }, "data");

  // ═══════════════════════════════════════════════════════════
  // COMMERCE ENGINES (36-42) — 5-60min
  // ═══════════════════════════════════════════════════════════

  registerJob("central-ranking-rerank", 10 * 60_000, async () => {
    const { rerankAll } = await import("@/lib/ranking/ranking-batch-runner");
    const result = await rerankAll();
    if (result.candidates + result.seeds > 0) console.log(`[continuous] Reranked ${result.candidates} + ${result.seeds}`);
  }, "commerce");

  registerJob("merchandising", 15 * 60_000, async () => {
    const { runMerchandisingEngine } = await import("@/lib/engines/merchandising-engine");
    const result = await runMerchandisingEngine();
    console.log(`[continuous] Merch: ${result.bestSellers.length} bestsellers`);
  }, "commerce");

  registerJob("ai-feedback-recompute", 15 * 60_000, async () => {
    const { recomputeEntityAiScores } = await import("@/lib/ai/ai-feedback-engine");
    const result = await recomputeEntityAiScores(200);
    if (result.updated > 0) console.log(`[continuous] AI: ${result.updated} recomputed`);
  }, "commerce");

  registerJob("crm-reactivation", 60 * 60_000, async () => {
    const { runCrmReactivationEngine } = await import("@/lib/engines/crm-reactivation-engine");
    const result = await runCrmReactivationEngine();
    console.log(`[continuous] CRM: ${result.candidates.length} candidates`);
  }, "commerce");

  registerJob("boost-slot-refresh", 60 * 60_000, async () => {
    const { platformBus } = await import("@/lib/shared/platform-bus");
    platformBus.emit("boost.slots.refresh", { reason: "periodic" }, "system");
  }, "commerce");

  registerJob("boost-analytics", 30 * 60_000, async () => {
    const { runBoostAnalytics } = await import("@/lib/engines/boost-analytics-engine");
    const result = await runBoostAnalytics();
    if (result.paused > 0) console.log(`[continuous] Boost: ${result.paused} campaigns paused (budget)`);
  }, "commerce");

  registerJob("inventory-check", 15 * 60_000, async () => {
    const { runInventoryCheck } = await import("@/lib/engines/inventory-engine");
    const result = await runInventoryCheck(100);
    if (result.hidden > 0 || result.restocked > 0) console.log(`[continuous] Inventory: ${result.hidden} hidden, ${result.restocked} restocked`);
  }, "commerce");

  // ═══════════════════════════════════════════════════════════
  // FINANCE ENGINES (43-48) — 5-30min
  // ═══════════════════════════════════════════════════════════

  registerJob("finance-reconciliation", 10 * 60_000, async () => {
    const { runFinanceReconciliation } = await import("@/lib/engines/finance-reconciliation-engine");
    const result = await runFinanceReconciliation(50);
    if (result.mismatches > 0 || result.created > 0) console.log(`[continuous] Finance: ${result.mismatches} mismatches, ${result.created} auto-created`);
  }, "finance");

  registerJob("wallet-sync", 15 * 60_000, async () => {
    const { runWalletSync } = await import("@/lib/engines/wallet-sync-engine");
    const result = await runWalletSync(50);
    if (result.synced > 0) console.log(`[continuous] Wallet sync: ${result.synced} corrected`);
  }, "finance");

  registerJob("coupon-expiration", 15 * 60_000, async () => {
    const { runCouponExpiration } = await import("@/lib/engines/coupon-expiration-engine");
    const result = await runCouponExpiration(100);
    if (result.deactivated > 0) console.log(`[continuous] Coupons: ${result.deactivated} expired`);
  }, "finance");

  registerJob("qr-session-cleanup", 10 * 60_000, async () => {
    const { runQrSessionCleanup } = await import("@/lib/engines/qr-session-engine");
    const result = await runQrSessionCleanup(100);
    if (result.expired > 0) console.log(`[continuous] QR: ${result.expired} sessions expired`);
  }, "finance");

  registerJob("compliance-aml", 30 * 60_000, async () => {
    const { runComplianceScan } = await import("@/lib/engines/compliance-aml-engine");
    const result = await runComplianceScan(100);
    if (result.flagged > 0) console.log(`[continuous] AML: ${result.flagged} flagged`);
  }, "finance");

  registerJob("abandoned-cart", 15 * 60_000, async () => {
    const { runAbandonedCartRecovery } = await import("@/lib/engines/abandoned-cart-engine");
    const result = await runAbandonedCartRecovery(50);
    if (result.notified > 0) console.log(`[continuous] Cart recovery: ${result.notified} notified`);
  }, "finance");

  // ═══════════════════════════════════════════════════════════
  // DELIVERY ENGINES (49-52) — 5-15min
  // ═══════════════════════════════════════════════════════════

  registerJob("driver-availability", 10 * 60_000, async () => {
    const { runDriverAvailabilityScan } = await import("@/lib/engines/driver-availability-engine");
    const result = await runDriverAvailabilityScan(100);
    if (result.markedOffline > 0) console.log(`[continuous] Drivers: ${result.markedOffline} marked offline`);
  }, "delivery");

  registerJob("delivery-monitor", 10 * 60_000, async () => {
    const { runDeliveryMonitor } = await import("@/lib/engines/delivery-monitor-engine");
    const result = await runDeliveryMonitor(100);
    if (result.stuck > 0) console.log(`[continuous] Delivery: ${result.stuck} stuck jobs`);
  }, "delivery");

  registerJob("live-status-refresh", 5 * 60_000, async () => {
    const { runLiveStatusRefresh } = await import("@/lib/engines/live-status-engine");
    const result = await runLiveStatusRefresh(50);
    console.log(`[continuous] Live status: ${result.updated} orders tracked`);
  }, "delivery");

  registerJob("call-log-cleanup", 60 * 60_000, async () => {
    const { runCallLogCleanup } = await import("@/lib/engines/call-log-engine");
    const result = await runCallLogCleanup(100);
    if (result.cleaned > 0) console.log(`[continuous] Calls: ${result.cleaned} stale cleaned`);
  }, "delivery");

  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE ENGINES (53-57) — 5-60min
  // ═══════════════════════════════════════════════════════════

  registerJob("order-lifecycle", 15 * 60_000, async () => {
    const { runOrderLifecycle } = await import("@/lib/engines/order-lifecycle-engine");
    const result = await runOrderLifecycle(50);
    if (result.cancelled > 0) console.log(`[continuous] Orders: ${result.cancelled} stale cancelled`);
  }, "lifecycle");

  registerJob("review-trigger", 15 * 60_000, async () => {
    const { runReviewTrigger } = await import("@/lib/engines/review-trigger-engine");
    const result = await runReviewTrigger(50);
    if (result.triggered > 0) console.log(`[continuous] Reviews: ${result.triggered} requests sent`);
  }, "lifecycle");

  registerJob("loyalty-scan", 30 * 60_000, async () => {
    const { runLoyaltyScan } = await import("@/lib/engines/loyalty-engine");
    const result = await runLoyaltyScan(50);
    if (result.awarded > 0) console.log(`[continuous] Loyalty: ${result.awarded} points awarded`);
  }, "lifecycle");

  registerJob("staff-sync", 30 * 60_000, async () => {
    const { runStaffSync } = await import("@/lib/engines/staff-sync-engine");
    const result = await runStaffSync(100);
    if (result.fixed > 0) console.log(`[continuous] Staff: ${result.fixed} roles fixed`);
  }, "lifecycle");

  registerJob("reorder-check", 60 * 60_000, async () => {
    const { runReorderCheck } = await import("@/lib/engines/reorder-engine");
    const result = await runReorderCheck(50);
    if (result.triggered > 0) console.log(`[continuous] Reorder: ${result.triggered} reminders sent`);
  }, "lifecycle");

  registerJob("automation-workflows", 15 * 60_000, async () => {
    const { runAutomationWorkflows } = await import("@/lib/engines/automation-workflow-engine");
    const result = await runAutomationWorkflows(20);
    if (result.completed > 0) console.log(`[continuous] Workflows: ${result.completed} processed`);
  }, "lifecycle");

  registerJob("approval-queue", 15 * 60_000, async () => {
    const { runApprovalQueueCheck } = await import("@/lib/engines/approval-queue-engine");
    const result = await runApprovalQueueCheck(50);
    if (result.expired > 0) console.log(`[continuous] Approvals: ${result.expired} expired`);
  }, "lifecycle");

  // ═══════════════════════════════════════════════════════════
  // VERTICAL ENGINES (58-68) — Scraping, Classification, Repair
  // ═══════════════════════════════════════════════════════════

  registerJob("source-intake-scan", 30 * 60_000, async () => {
    const { runSourceIntakeScan } = await import("@/lib/engines/source-intake-engine");
    const result = await runSourceIntakeScan(50);
    if (result.snapshotted > 0) console.log(`[continuous] Source intake: ${result.snapshotted} snapshotted`);
  }, "data");

  registerJob("vertical-classifier", 15 * 60_000, async () => {
    const { runVerticalClassifier } = await import("@/lib/engines/vertical-classifier-engine");
    const result = await runVerticalClassifier(100);
    if (result.changed > 0) console.log(`[continuous] Classifier: ${result.changed} reclassified`);
  }, "quality");

  registerJob("food-menu-normalizer", 15 * 60_000, async () => {
    const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
    const result = await runFoodMenuNormalizer(50);
    if (result.normalized > 0) console.log(`[continuous] Food menu: ${result.normalized} normalized`);
  }, "quality");

  registerJob("hotel-inventory-normalizer", 30 * 60_000, async () => {
    const { runHotelInventoryNormalizer } = await import("@/lib/engines/hotel-inventory-normalizer-engine");
    const result = await runHotelInventoryNormalizer(30);
    if (result.normalized > 0) console.log(`[continuous] Hotel inventory: ${result.normalized} normalized`);
  }, "quality");

  registerJob("shop-backend-repair", 15 * 60_000, async () => {
    const { runShopBackendRepair } = await import("@/lib/engines/shop-backend-repair-engine");
    const result = await runShopBackendRepair(100);
    if (result.repaired > 0) console.log(`[continuous] Backend repair: ${result.repaired} shops fixed`);
  }, "quality");

  registerJob("category-mapping-sync", 30 * 60_000, async () => {
    const { runCategoryMappingSync } = await import("@/lib/engines/category-mapping-engine");
    const result = await runCategoryMappingSync(100);
    if (result.remapped > 0) console.log(`[continuous] Category mapping: ${result.remapped} remapped`);
  }, "data");

  registerJob("publish-gate-food", 15 * 60_000, async () => {
    const { runFoodPublishGate } = await import("@/lib/engines/publish-gate-food-engine");
    const result = await runFoodPublishGate(100);
    console.log(`[continuous] Food gate: ${result.passed} pass, ${result.blocked} block`);
  }, "quality");

  registerJob("publish-gate-hotel", 30 * 60_000, async () => {
    const { runHotelPublishGate } = await import("@/lib/engines/publish-gate-hotel-engine");
    const result = await runHotelPublishGate(50);
    console.log(`[continuous] Hotel gate: ${result.passed} pass, ${result.blocked} block`);
  }, "quality");

  registerJob("source-rescrape-monitor", 60 * 60_000, async () => {
    const { runSourceRescrapeMonitor } = await import("@/lib/engines/source-rescrape-monitor-engine");
    const result = await runSourceRescrapeMonitor(100);
    if (result.flagged > 0) console.log(`[continuous] Rescrape: ${result.flagged} stale flagged`);
  }, "data");

  // ═══════════════════════════════════════════════════════════
  // VERTICAL-SPECIFIC NORMALIZERS (69-70) — Service + Grocery
  // ═══════════════════════════════════════════════════════════

  registerJob("service-catalog-normalizer", 15 * 60_000, async () => {
    const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
    const result = await runServiceCatalogNormalizer(50);
    if (result.normalized > 0) console.log(`[continuous] Service catalog: ${result.normalized} normalized`);
  }, "quality");

  registerJob("grocery-normalizer", 15 * 60_000, async () => {
    const { runGroceryNormalizer } = await import("@/lib/engines/grocery-normalizer-engine");
    const result = await runGroceryNormalizer(50);
    if (result.normalized > 0) console.log(`[continuous] Grocery: ${result.normalized} normalized`);
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // VERTICAL-SPECIFIC PUBLISH GATES (71-72) — Service + Grocery
  // ═══════════════════════════════════════════════════════════

  registerJob("publish-gate-service", 15 * 60_000, async () => {
    const { runServicePublishGate } = await import("@/lib/engines/publish-gate-service-engine");
    const result = await runServicePublishGate(50);
    console.log(`[continuous] Service gate: ${result.passed} pass, ${result.blocked} block`);
  }, "quality");

  registerJob("publish-gate-grocery", 15 * 60_000, async () => {
    const { runGroceryPublishGate } = await import("@/lib/engines/publish-gate-grocery-engine");
    const result = await runGroceryPublishGate(50);
    console.log(`[continuous] Grocery gate: ${result.passed} pass, ${result.blocked} block`);
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // AUTO-PUBLISH PIPELINE (73-75) — Publish, Optimize, Unpublish
  // ═══════════════════════════════════════════════════════════

  registerJob("auto-publish", 15 * 60_000, async () => {
    const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
    const result = await runAutoPublish(100);
    if (result.eligible > 0) console.log(`[continuous] Auto-publish: ${result.published_live} live, ${result.published_search_only} search`);
  }, "quality");

  registerJob("visibility-optimizer", 30 * 60_000, async () => {
    const { runVisibilityOptimizer } = await import("@/lib/engines/visibility-optimizer-engine");
    const result = await runVisibilityOptimizer(100);
    if (result.promoted + result.downgraded > 0) console.log(`[continuous] Visibility: +${result.promoted} -${result.downgraded}`);
  }, "quality");

  registerJob("auto-unpublish", 30 * 60_000, async () => {
    const { runAutoUnpublish } = await import("@/lib/engines/auto-unpublish-engine");
    const result = await runAutoUnpublish(100);
    if (result.unpublished > 0) console.log(`[continuous] Auto-unpublish: ${result.unpublished} removed`);
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // PLATFORM HEALTH & AUDIT ENGINES (76-80)
  // ═══════════════════════════════════════════════════════════

  registerJob("platform-cleanup", 60 * 60_000, async () => {
    const { runPlatformCleanup } = await import("@/lib/engines/platform-cleanup-engine");
    const result = runPlatformCleanup();
    const job = jobs.find(j => j.name === "platform-cleanup");
    if (job) { job.itemsProcessed = result.totalIssues; job.summary = `${result.orphanedPages.length} orphans, ${result.heavyFiles.length} heavy files`; job.businessImpact = result.totalIssues > 0 ? "Cleanup needed" : "Clean"; }
  }, "system");

  registerJob("performance-audit", 30 * 60_000, async () => {
    const { runPerformanceAudit } = await import("@/lib/engines/performance-audit-engine");
    const result = runPerformanceAudit();
    const job = jobs.find(j => j.name === "performance-audit");
    if (job) { job.itemsProcessed = result.domNodes; job.summary = `DOM:${result.domNodes} FCP:${result.firstContentfulPaint}ms Heap:${result.jsHeapUsedMb}MB`; job.businessImpact = `${result.recommendations.length} recommendations`; }
  }, "system");

  registerJob("journey-coherence", 60 * 60_000, async () => {
    const { runJourneyCoherenceAudit } = await import("@/lib/engines/journey-coherence-engine");
    const result = runJourneyCoherenceAudit();
    const job = jobs.find(j => j.name === "journey-coherence");
    if (job) { job.itemsProcessed = result.totalRoutes; job.summary = `${result.issues.length} issues, ${result.deadEnds} dead-ends`; job.businessImpact = result.issues.length > 0 ? "Flows need fix" : "All coherent"; }
  }, "system");

  registerJob("ui-ux-consistency", 60 * 60_000, async () => {
    const { runUxConsistencyAudit } = await import("@/lib/engines/ui-ux-consistency-engine");
    const result = runUxConsistencyAudit();
    const job = jobs.find(j => j.name === "ui-ux-consistency");
    if (job) { job.itemsProcessed = result.totalComponentsAudited; job.summary = `${result.issues.length} UX issues`; job.businessImpact = `Empty:${Math.round(result.emptyStatesCoverage*100)}% Load:${Math.round(result.loadingStatesCoverage*100)}% Err:${Math.round(result.errorStatesCoverage*100)}%`; }
  }, "system");

  registerJob("i18n-integrity", 60 * 60_000, async () => {
    const { runI18nIntegrityAudit } = await import("@/lib/engines/i18n-integrity-engine");
    const result = runI18nIntegrityAudit();
    const job = jobs.find(j => j.name === "i18n-integrity");
    if (job) { job.itemsProcessed = result.totalKeysChecked; job.summary = `${result.missingKeys} missing, ${result.truncatedTexts} truncated`; job.businessImpact = `Coverage: FR ${result.coveragePercent.fr}% EN ${result.coveragePercent.en}%`; }
  }, "system");

  registerJob("global-orchestration", 15 * 60_000, async () => {
    const { runGlobalOrchestration } = await import("@/lib/engines/global-orchestration-engine");
    const result = runGlobalOrchestration();
    console.log(`[continuous] Orchestration: health=${result.healthScore} collisions=${result.collisions.length}`);
  }, "system");

  // Engine #82 — Platform Orchestrator (autonomous governance brain)
  registerJob("platform-orchestrator", 10 * 60_000, async () => {
    const { runPlatformOrchestrator } = await import("@/lib/engines/platform-orchestrator-engine");
    const result = await runPlatformOrchestrator();
    const job = jobs.find(j => j.name === "platform-orchestrator");
    if (job) {
      job.itemsProcessed = result.decisions.length;
      job.rowsAffected = result.decisions.filter(d => d.autoApplied).length;
      job.businessImpact = `Health:${result.scores.global}/100`;
      job.summary = `${result.decisions.length} decisions, ${result.warnings.length} warnings, ${result.collisions.length} collisions`;
    }
  }, "system");

  // ═══════════════════════════════════════════════════════════
  // BACKEND TRUTH ENGINES (83-86)
  // ═══════════════════════════════════════════════════════════

  registerJob("backend-connectivity", 15 * 60_000, async () => {
    const { runBackendConnectivityCheck } = await import("@/lib/engines/backend-connectivity-engine");
    const result = await runBackendConnectivityCheck(500);
    const job = jobs.find(j => j.name === "backend-connectivity");
    if (job) { job.itemsProcessed = result.totalChecked; job.rowsAffected = result.autoRepaired; job.summary = `Full:${result.fullyConnected} Partial:${result.partiallyConnected} Dead:${result.dead}`; job.businessImpact = result.dead > 0 ? `${result.dead} dead entities` : "All connected"; }
  }, "quality");

  registerJob("entity-integrity", 15 * 60_000, async () => {
    const { runEntityIntegrityCheck } = await import("@/lib/engines/entity-integrity-engine");
    const result = await runEntityIntegrityCheck(500);
    const job = jobs.find(j => j.name === "entity-integrity");
    if (job) { job.itemsProcessed = result.totalChecked; job.rowsAffected = result.autoRepaired; job.summary = `Passed:${result.passed} Failed:${result.failed}`; job.businessImpact = result.failed > 0 ? `${result.failed} integrity failures` : "All entities valid"; }
  }, "quality");

  registerJob("dead-flow-elimination", 30 * 60_000, async () => {
    const { runDeadFlowAudit } = await import("@/lib/engines/dead-flow-elimination-engine");
    const result = runDeadFlowAudit();
    const job = jobs.find(j => j.name === "dead-flow-elimination");
    if (job) { job.itemsProcessed = result.totalFlowsChecked; job.summary = `Dead:${result.deadFlows} BrokenLinks:${result.brokenModuleLinks} DeadCTAs:${result.deadCTAs}`; job.businessImpact = result.deadFlows > 0 ? `${result.deadFlows} dead flows` : "All flows alive"; }
  }, "quality");

  registerJob("full-stack-linkage", 15 * 60_000, async () => {
    const { runFullStackLinkageCheck } = await import("@/lib/engines/full-stack-linkage-engine");
    const result = await runFullStackLinkageCheck(500);
    const job = jobs.find(j => j.name === "full-stack-linkage");
    if (job) { job.itemsProcessed = result.totalEntitiesChecked; job.rowsAffected = result.autoRepaired; job.summary = `Linked:${result.fullyLinked} Partial:${result.partiallyLinked} Broken:${result.broken}`; job.businessImpact = result.broken > 0 ? `${result.broken} broken chains, ${result.publicationBlocked} blocked` : "Full-stack OK"; }
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // MECHANICS ENGINES (87-89) — Auto-repair Layer
  // ═══════════════════════════════════════════════════════════

  registerJob("auto-repair", 10 * 60_000, async () => {
    const { runAutoRepairEngine } = await import("@/lib/engines/auto-repair-engine");
    const result = await runAutoRepairEngine(200);
    const job = jobs.find(j => j.name === "auto-repair");
    if (job) { job.itemsProcessed = result.totalScanned; job.rowsAffected = result.autoFixed; job.summary = `Fixed:${result.autoFixed} Blocked:${result.blocked} Review:${result.sentToReview}`; job.businessImpact = result.autoFixed > 0 ? `${result.autoFixed} auto-repaired` : "All clean"; }
  }, "quality");

  registerJob("module-link-repair", 15 * 60_000, async () => {
    const { runModuleLinkRepair } = await import("@/lib/engines/module-link-repair-engine");
    const result = await runModuleLinkRepair();
    const job = jobs.find(j => j.name === "module-link-repair");
    if (job) { job.itemsProcessed = result.totalLinksChecked; job.rowsAffected = result.repaired; job.summary = `Connected:${result.connected} Broken:${result.broken} Repaired:${result.repaired}`; job.businessImpact = result.broken > 0 ? `${result.broken} broken links` : "All modules linked"; }
  }, "quality");

  registerJob("entity-state-healing", 10 * 60_000, async () => {
    const { runEntityStateHealing } = await import("@/lib/engines/entity-state-healing-engine");
    const result = await runEntityStateHealing(300);
    const job = jobs.find(j => j.name === "entity-state-healing");
    if (job) { job.itemsProcessed = result.totalScanned; job.rowsAffected = result.healed + result.unpublished; job.summary = `Healed:${result.healed} Unpublished:${result.unpublished} Review:${result.sentToReview}`; job.businessImpact = result.healed > 0 ? `${result.healed} states healed` : "All states coherent"; }
  }, "quality");

  // ── MENU REBUILD ENGINE ──
  registerJob("menu-rebuild", 10 * 60_000, async () => {
    const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
    const result = await runMenuRebuildEngine(100);
    const job = jobs.find(j => j.name === "menu-rebuild");
    if (job) { job.itemsProcessed = result.total; job.rowsAffected = result.rebuilt + result.blocked; job.summary = `Rebuilt:${result.rebuilt} Blocked:${result.blocked} Clean:${result.alreadyClean}`; job.businessImpact = result.rebuilt > 0 ? `${result.rebuilt} menus rebuilt` : "All menus processed"; }
  }, "quality");

  // ── TAXONOMY REMAP ENGINE ──
  registerJob("taxonomy-remap", 12 * 60_000, async () => {
    const { runTaxonomyRemapEngine } = await import("@/lib/engines/taxonomy-remap-engine");
    const result = await runTaxonomyRemapEngine(100);
    const job = jobs.find(j => j.name === "taxonomy-remap");
    if (job) { job.itemsProcessed = result.total; job.rowsAffected = result.remapped + result.blocked; job.summary = `OK:${result.ok} Remapped:${result.remapped} Blocked:${result.blocked}`; job.businessImpact = result.remapped > 0 ? `${result.remapped} taxonomy corrected` : "Taxonomy coherent"; }
  }, "quality");

  // ═══════════════════════════════════════════════════════════
  // START ALL — Staggered boot
  // ═══════════════════════════════════════════════════════════

  for (const job of jobs) {
    const idx = jobs.indexOf(job);
    setTimeout(() => void executeJob(job), 5000 + idx * 1500);
    job.timerId = setInterval(() => void executeJob(job), job.intervalMs);
  }

  const cats = {
    system: jobs.filter(j => j.category === "system").length,
    digital: jobs.filter(j => j.category === "digital").length,
    quality: jobs.filter(j => j.category === "quality").length,
    data: jobs.filter(j => j.category === "data").length,
    commerce: jobs.filter(j => j.category === "commerce").length,
    finance: jobs.filter(j => j.category === "finance").length,
    delivery: jobs.filter(j => j.category === "delivery").length,
    lifecycle: jobs.filter(j => j.category === "lifecycle").length,
  };

  console.log(`[continuous] 🚀 ${jobs.length} engines started — system:${cats.system} digital:${cats.digital} quality:${cats.quality} data:${cats.data} commerce:${cats.commerce} finance:${cats.finance} delivery:${cats.delivery} lifecycle:${cats.lifecycle}`);
}

export function stopContinuousEngine() {
  for (const job of jobs) {
    if (job.timerId) clearInterval(job.timerId);
  }
  running = false;
  console.log("[continuous] Engine stopped");
}

export function getContinuousEngineStatus() {
  return {
    running,
    totalJobs: jobs.length,
    categories: {
      system: jobs.filter(j => j.category === "system").length,
      digital: jobs.filter(j => j.category === "digital").length,
      quality: jobs.filter(j => j.category === "quality").length,
      data: jobs.filter(j => j.category === "data").length,
      commerce: jobs.filter(j => j.category === "commerce").length,
      finance: jobs.filter(j => j.category === "finance").length,
      delivery: jobs.filter(j => j.category === "delivery").length,
      lifecycle: jobs.filter(j => j.category === "lifecycle").length,
    },
    jobs: jobs.map(j => ({
      name: j.name,
      category: j.category,
      intervalMs: j.intervalMs,
      intervalLabel: j.intervalMs >= 3600000 ? `${j.intervalMs / 3600000}h` : `${j.intervalMs / 60000}min`,
      lastRun: j.lastRun ?? null,
      runCount: j.runCount,
      lastStatus: j.lastStatus,
      lastDetail: j.lastDetail,
      itemsProcessed: j.itemsProcessed,
      rowsAffected: j.rowsAffected,
      businessImpact: j.businessImpact,
      summary: j.summary,
    })),
  };
}
