/**
 * AUTONOMOUS BUSINESS ENGINE (Phase 1)
 * Transforms analytics into active decisions and automated growth actions.
 */

import { eventBus } from "@/lib/core/event-bus";
import type { UnifiedEngineReport } from "./unified-global-engine";
import { runAIDecisionEngine, type DecisionResult } from "./ai-decision-engine";

// ─── Types ───────────────────────────────────────────────────

export interface BusinessEngineState {
  lastRunAt: string | null;
  decisionResult: DecisionResult | null;
  activeCampaigns: ActiveCampaign[];
  walletIncentives: WalletIncentive[];
  orbitPrompts: OrbitPrompt[];
  marketplaceFlags: MarketplaceFlag[];
}

export interface ActiveCampaign {
  id: string;
  eventKey: string;
  eventName: string;
  country: string;
  bannerGradient: string;
  emoji: string;
  activatedAt: string;
}

export interface WalletIncentive {
  id: string;
  type: "cashback" | "quick_pay" | "qr_promo";
  title: string;
  description: string;
  triggerScore: number;
}

export interface OrbitPrompt {
  id: string;
  type: "reengagement" | "conversation_starter" | "unread_highlight";
  message: string;
  priority: number;
}

export interface MarketplaceFlag {
  id: string;
  issue: "missing_photos" | "missing_description" | "weak_cta" | "low_conversion";
  entityId?: string;
  suggestion: string;
}

// ─── Engine State ────────────────────────────────────────────

let _state: BusinessEngineState = {
  lastRunAt: null,
  decisionResult: null,
  activeCampaigns: [],
  walletIncentives: [],
  orbitPrompts: [],
  marketplaceFlags: [],
};

export function getBusinessEngineState(): BusinessEngineState {
  return _state;
}

// ─── Revenue Boost from Events ───────────────────────────────

function processEventCampaigns(report: UnifiedEngineReport): ActiveCampaign[] {
  return report.activeEvents.map(ev => ({
    id: `campaign_${ev.eventKey}_${Date.now()}`,
    eventKey: ev.eventKey,
    eventName: ev.eventName,
    country: ev.country,
    bannerGradient: ev.bannerConfig?.gradient ?? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
    emoji: ev.bannerConfig?.emoji ?? "🎉",
    activatedAt: new Date().toISOString(),
  }));
}

// ─── Wallet Activation ───────────────────────────────────────

function processWalletActivation(report: UnifiedEngineReport): WalletIncentive[] {
  const incentives: WalletIncentive[] = [];
  const { walletUsage } = report.scores;

  if (walletUsage < 70) {
    incentives.push({
      id: `wallet_cashback_${Date.now()}`,
      type: "cashback",
      title: "Earn 5% Cashback",
      description: "Pay with your wallet and get instant cashback on every transaction",
      triggerScore: walletUsage,
    });
  }

  if (walletUsage < 50) {
    incentives.push({
      id: `wallet_quickpay_${Date.now()}`,
      type: "quick_pay",
      title: "Quick Pay Enabled",
      description: "One-tap payments — no friction, instant confirmation",
      triggerScore: walletUsage,
    });

    incentives.push({
      id: `wallet_qr_${Date.now()}`,
      type: "qr_promo",
      title: "Scan & Pay",
      description: "Use QR payments for a faster checkout experience",
      triggerScore: walletUsage,
    });
  }

  return incentives;
}

// ─── Orbit Engagement ────────────────────────────────────────

function processOrbitEngagement(report: UnifiedEngineReport): OrbitPrompt[] {
  const prompts: OrbitPrompt[] = [];
  const { orbitEngagement } = report.scores;

  if (orbitEngagement < 60) {
    prompts.push({
      id: `orbit_reengage_${Date.now()}`,
      type: "reengagement",
      message: "You have conversations waiting — check your messages",
      priority: 80,
    });

    prompts.push({
      id: `orbit_starter_${Date.now()}`,
      type: "conversation_starter",
      message: "Connect with merchants near you for exclusive deals",
      priority: 60,
    });
  }

  if (orbitEngagement < 40) {
    prompts.push({
      id: `orbit_unread_${Date.now()}`,
      type: "unread_highlight",
      message: "Important messages need your attention",
      priority: 95,
    });
  }

  return prompts;
}

// ─── Marketplace Flags ───────────────────────────────────────

function processMarketplaceFlags(report: UnifiedEngineReport): MarketplaceFlag[] {
  const flags: MarketplaceFlag[] = [];
  const { marketplaceHealth } = report.scores;

  if (marketplaceHealth < 75) {
    flags.push({
      id: `mkt_photos_${Date.now()}`,
      issue: "missing_photos",
      suggestion: "Add at least 3 high-quality photos to improve visibility by 40%",
    });

    flags.push({
      id: `mkt_desc_${Date.now()}`,
      issue: "missing_description",
      suggestion: "Complete your listing description to rank higher in search",
    });
  }

  if (marketplaceHealth < 60) {
    flags.push({
      id: `mkt_cta_${Date.now()}`,
      issue: "weak_cta",
      suggestion: "Your call-to-action buttons need stronger placement and contrast",
    });
  }

  return flags;
}

// ─── Main Runner ─────────────────────────────────────────────

export function runAutonomousBusinessEngine(report: UnifiedEngineReport): BusinessEngineState {
  // Phase 2: AI Decision Engine
  const decisionResult = runAIDecisionEngine(report);

  // Phase 1: Business-specific processing
  const activeCampaigns = processEventCampaigns(report);
  const walletIncentives = processWalletActivation(report);
  const orbitPrompts = processOrbitEngagement(report);
  const marketplaceFlags = processMarketplaceFlags(report);

  _state = {
    lastRunAt: new Date().toISOString(),
    decisionResult,
    activeCampaigns,
    walletIncentives,
    orbitPrompts,
    marketplaceFlags,
  };

  // Emit consolidated event
  eventBus.emit("BUSINESS_ENGINE_CYCLE", {
    decisionsCount: decisionResult.decisions.length,
    executedCount: decisionResult.executed.length,
    campaigns: activeCampaigns.length,
    incentives: walletIncentives.length,
    prompts: orbitPrompts.length,
    flags: marketplaceFlags.length,
  });

  return _state;
}
