/**
 * PLATFORM CONTINUOUS ENGINE
 * Client-side interval-based automation layer.
 * Runs ALL digital engines at fixed intervals with logging, metrics, and safe isolation.
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
  lastStatus: "ok" | "error" | "pending";
  lastDetail?: string;
  itemsProcessed: number;
  category: "system" | "digital" | "quality" | "data" | "commerce";
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
  jobs.push({ name, intervalMs, fn, runCount: 0, lastStatus: "pending", itemsProcessed: 0, category });
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
    console.warn(`[continuous] Job "${job.name}" failed:`, e);
  }
  job.runCount++;
  job.lastRun = new Date().toISOString();
}

// ── Public API ──────────────────────────────────────────────

export function startContinuousEngine() {
  if (running) return;
  running = true;

  // ═══════════════════════════════════════════════════════════
  // SYSTEM ENGINES (5min)
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

  // ═══════════════════════════════════════════════════════════
  // DIGITAL ORCHESTRATION ENGINES (5-15min)
  // ═══════════════════════════════════════════════════════════

  // B) Digital Orchestration — master decision layer (15min)
  registerJob("digital-orchestration", 15 * 60_000, async () => {
    const { runDigitalOrchestration } = await import("@/lib/engines/digital-orchestration-engine");
    const result = runDigitalOrchestration();
    const job = jobs.find(j => j.name === "digital-orchestration");
    if (job) job.itemsProcessed = result.homepageSections.length;
    console.log(`[continuous] Digital orchestration: ${result.homepageSections.length} sections, ${result.activeBanners.length} banners, ${result.eventOverrides.length} events`);
  }, "digital");

  // C) Global Experience refresh (5min)
  registerJob("global-experience-refresh", 5 * 60_000, async () => {
    const { useGlobalExperienceStore } = await import("@/stores/globalExperienceStore");
    useGlobalExperienceStore.getState().refresh();
  }, "digital");

  // D) Homepage Freshness via content engine (15min)
  registerJob("content-freshness", 15 * 60_000, async () => {
    const { runContentFreshnessEngine } = await import("@/lib/engines/content-freshness-engine");
    const result = runContentFreshnessEngine();
    const job = jobs.find(j => j.name === "content-freshness");
    if (job) job.itemsProcessed = result.totalGenerated;
    console.log(`[continuous] Content freshness: ${result.totalGenerated} blocks generated`);
  }, "digital");

  // E) Campaign & Banner Engine (15min)
  registerJob("campaign-banner", 15 * 60_000, async () => {
    const { runCampaignBannerEngine } = await import("@/lib/engines/campaign-banner-engine");
    const result = await runCampaignBannerEngine();
    const job = jobs.find(j => j.name === "campaign-banner");
    if (job) job.itemsProcessed = result.totalActive;
    console.log(`[continuous] Campaign banners: ${result.totalActive} active`);
  }, "digital");

  // I) Social Proof refresh (5min)
  registerJob("social-proof", 5 * 60_000, async () => {
    const { runSocialProofEngine } = await import("@/lib/engines/social-proof-engine");
    const result = await runSocialProofEngine();
    const job = jobs.find(j => j.name === "social-proof");
    if (job) job.itemsProcessed = result.totalPublicEntities;
    console.log(`[continuous] Social proof: ${result.totalPublicEntities} public, ${result.openNowCount} open now`);
  }, "digital");

  // H) Merchandising Engine (15min)
  registerJob("merchandising", 15 * 60_000, async () => {
    const { runMerchandisingEngine } = await import("@/lib/engines/merchandising-engine");
    const result = await runMerchandisingEngine();
    const job = jobs.find(j => j.name === "merchandising");
    if (job) job.itemsProcessed = result.bestSellers.length;
    console.log(`[continuous] Merchandising: ${result.bestSellers.length} bestsellers, ${result.openNow.length} open now`);
  }, "commerce");

  // ═══════════════════════════════════════════════════════════
  // QUALITY & DATA ENGINES (15-30min)
  // ═══════════════════════════════════════════════════════════

  // Coherence sweep (15min)
  registerJob("coherence-sweep", 15 * 60_000, async () => {
    const { runCoherenceGate } = await import("@/lib/engines/coherence-gate");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: unchecked } = await (supabase as any)
      .from("seed_merchants")
      .select("id, name, category, subcategory, menu_items_json")
      .is("coherence_status", null)
      .limit(20);
    if (unchecked?.length) {
      let checked = 0;
      for (const e of unchecked) {
        const menuItems = Array.isArray(e.menu_items_json) ? e.menu_items_json : [];
        await runCoherenceGate(e.id, "seed_merchants", {
          entity_name: e.name ?? "",
          entity_vertical: e.category ?? "food",
          entity_subcategory: e.subcategory ?? "",
          menu_items: menuItems.map((i: any) => i?.name ?? ""),
        });
        checked++;
      }
      const job = jobs.find(j => j.name === "coherence-sweep");
      if (job) job.itemsProcessed += checked;
      if (checked > 0) console.log(`[continuous] Coherence checked ${checked} entities`);
    }
  }, "quality");

  // Shop quality (15min)
  registerJob("shop-quality", 15 * 60_000, async () => {
    const { runShopQualityCheck } = await import("@/lib/engines/shop-quality-engine");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: shops } = await (supabase as any)
      .from("seed_merchants")
      .select("*")
      .is("visibility_score", null)
      .limit(20);
    if (shops?.length) {
      let scored = 0;
      for (const shop of shops) {
        const result = runShopQualityCheck(shop);
        await (supabase as any)
          .from("seed_merchants")
          .update({ visibility_score: result.globalQualityScore, tier: result.qualityClass })
          .eq("id", shop.id);
        scored++;
      }
      const job = jobs.find(j => j.name === "shop-quality");
      if (job) job.itemsProcessed += scored;
      if (scored > 0) console.log(`[continuous] Quality scored ${scored} shops`);
    }
  }, "quality");

  // Entity recovery (30min)
  registerJob("entity-recovery", 30 * 60_000, async () => {
    const { recoverHiddenEntities } = await import("@/lib/engines/entity-recovery-engine");
    const result = await recoverHiddenEntities(10);
    const job = jobs.find(j => j.name === "entity-recovery");
    if (job) job.itemsProcessed += result.recovered;
    if (result.recovered > 0) console.log(`[continuous] Recovered ${result.recovered}/${result.total} entities`);
  }, "quality");

  // G) Geo Density Engine (30min)
  registerJob("geo-density", 30 * 60_000, async () => {
    const { runGeoDensityEngine } = await import("@/lib/engines/geo-density-engine");
    const result = await runGeoDensityEngine();
    const job = jobs.find(j => j.name === "geo-density");
    if (job) job.itemsProcessed = result.zones.length;
    console.log(`[continuous] Geo density: ${result.zones.length} zones mapped, top: ${result.topCityVerticals.slice(0, 3).join(", ")}`);
  }, "data");

  // M) Data Completeness Engine (30min)
  registerJob("data-completeness", 30 * 60_000, async () => {
    const { runDataCompletenessEngine } = await import("@/lib/engines/data-completeness-engine");
    const result = await runDataCompletenessEngine();
    const job = jobs.find(j => j.name === "data-completeness");
    if (job) job.itemsProcessed = result.totalScanned;
    console.log(`[continuous] Data completeness: ${result.totalIncomplete}/${result.totalScanned} incomplete (photos:${result.missingPhotos}, geo:${result.missingGeo}, menu:${result.missingMenu})`);
  }, "data");

  // N) Adaptive Taxonomy Engine (30min)
  registerJob("adaptive-taxonomy", 30 * 60_000, async () => {
    const { runAdaptiveTaxonomyEngine } = await import("@/lib/engines/adaptive-taxonomy-engine");
    const result = await runAdaptiveTaxonomyEngine();
    const job = jobs.find(j => j.name === "adaptive-taxonomy");
    if (job) job.itemsProcessed = result.entitiesAnalyzed;
    console.log(`[continuous] Taxonomy: ${result.newlyMapped} newly mapped, ${result.gapCandidates.length} gap candidates, ${result.unmappable} unmappable`);
  }, "data");

  // ═══════════════════════════════════════════════════════════
  // COMMERCE ENGINES (1h)
  // ═══════════════════════════════════════════════════════════

  // Central ranking rerank (10min)
  registerJob("central-ranking-rerank", 10 * 60_000, async () => {
    const { rerankAll } = await import("@/lib/ranking/ranking-batch-runner");
    const result = await rerankAll();
    const job = jobs.find(j => j.name === "central-ranking-rerank");
    if (job) job.itemsProcessed = result.candidates + result.seeds;
    if (result.candidates + result.seeds > 0) {
      console.log(`[continuous] Reranked ${result.candidates} candidates + ${result.seeds} seeds`);
    }
  }, "commerce");

  // Boost slot refresh (1h)
  registerJob("boost-slot-refresh", 60 * 60_000, async () => {
    const { platformBus } = await import("@/lib/shared/platform-bus");
    platformBus.emit("boost.slots.refresh", { reason: "periodic" }, "system");
  }, "commerce");

  // Auto-source enrichment (1h)
  registerJob("auto-source-enrich", 60 * 60_000, async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).functions.invoke("auto-onboarding-cron", { body: {} });
    console.log("[continuous] Auto-onboarding cron triggered");
  }, "data");

  // AI Feedback Recompute (15min)
  registerJob("ai-feedback-recompute", 15 * 60_000, async () => {
    const { recomputeEntityAiScores } = await import("@/lib/ai/ai-feedback-engine");
    const result = await recomputeEntityAiScores(200);
    const job = jobs.find(j => j.name === "ai-feedback-recompute");
    if (job) job.itemsProcessed = result.updated;
    if (result.updated > 0) console.log(`[continuous] AI feedback recomputed ${result.updated} entities`);
  }, "commerce");

  // F) CRM Reactivation Engine (1h)
  registerJob("crm-reactivation", 60 * 60_000, async () => {
    const { runCrmReactivationEngine } = await import("@/lib/engines/crm-reactivation-engine");
    const result = await runCrmReactivationEngine();
    const job = jobs.find(j => j.name === "crm-reactivation");
    if (job) job.itemsProcessed = result.candidates.length;
    console.log(`[continuous] CRM reactivation: ${result.candidates.length} candidates (${result.abandonedCarts} abandoned carts)`);
  }, "commerce");

  // G) SLA Breach Check (5min)
  registerJob("sla-breach-check", 5 * 60_000, async () => {
    const { checkSlaBreaches } = await import("@/lib/support/global-support-engine");
    const result = await checkSlaBreaches();
    const job = jobs.find(j => j.name === "sla-breach-check");
    if (job) job.itemsProcessed = result.checked;
    if (result.breached > 0) console.log(`[continuous] SLA: ${result.breached} breaches escalated`);
  }, "system");

  // H) Self-Healing Health Scan (10min)
  registerJob("self-healing-scan", 10 * 60_000, async () => {
    const { runHealthScan } = await import("@/lib/platform/self-healing-engine");
    const result = await runHealthScan();
    const job = jobs.find(j => j.name === "self-healing-scan");
    if (job) job.itemsProcessed = result.emptyPages + result.missingImages + result.brokenScores;
    console.log(`[continuous] Self-healing: ${result.emptyPages} empty, ${result.missingImages} no-img, ${result.autoFixed} fixed`);
  }, "quality");

  // I) Data Trust Scan (30min)
  registerJob("data-trust-scan", 30 * 60_000, async () => {
    const { runDataTrustScan } = await import("@/lib/engines/data-trust-engine");
    const result = await runDataTrustScan(100);
    const job = jobs.find(j => j.name === "data-trust-scan");
    if (job) job.itemsProcessed = result.scanned;
    if (result.flagged > 0) console.log(`[continuous] Data trust: ${result.flagged}/${result.scanned} flagged`);
  }, "quality");

  // J) Shop Cleanup Engine (15min)
  registerJob("shop-cleanup", 15 * 60_000, async () => {
    const { runShopCleanupEngine } = await import("@/lib/engines/shop-cleanup-engine");
    const result = await runShopCleanupEngine(200);
    const job = jobs.find(j => j.name === "shop-cleanup");
    if (job) job.itemsProcessed = result.scanned;
    console.log(`[continuous] Shop cleanup: ${result.autoFixed} fixed, ${result.downgraded} downgraded, ${result.duplicateCoverCount} dup covers`);
  }, "quality");

  // K) Publish Gate Sweep (15min)
  registerJob("publish-gate", 15 * 60_000, async () => {
    const { runPublishGateSweep } = await import("@/lib/engines/publish-gate-engine");
    const result = await runPublishGateSweep(200);
    const job = jobs.find(j => j.name === "publish-gate");
    if (job) job.itemsProcessed = result.checked;
    console.log(`[continuous] Publish gate: ${result.passed} passed, ${result.blocked} blocked, ${result.promoted} promoted`);
  }, "quality");

  // L) Onboarding Correction Loop (30min)
  registerJob("onboarding-correction", 30 * 60_000, async () => {
    const { runOnboardingCorrectionLoop } = await import("@/lib/engines/onboarding-correction-engine");
    const result = await runOnboardingCorrectionLoop(100);
    const job = jobs.find(j => j.name === "onboarding-correction");
    if (job) job.itemsProcessed = result.processed;
    console.log(`[continuous] Onboarding correction: ${result.reclassified} reclassified, ${result.promoted} promoted, ${result.blocked} blocked`);
  }, "data");

  // Start all intervals staggered
  for (const job of jobs) {
    const idx = jobs.indexOf(job);
    setTimeout(() => void executeJob(job), 8000 + idx * 2000);
    job.timerId = setInterval(() => void executeJob(job), job.intervalMs);
  }

  console.log(`[continuous] 🚀 Engine started with ${jobs.length} jobs (${jobs.filter(j => j.category === "digital").length} digital, ${jobs.filter(j => j.category === "quality").length} quality, ${jobs.filter(j => j.category === "data").length} data, ${jobs.filter(j => j.category === "commerce").length} commerce)`);
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
    })),
  };
}
