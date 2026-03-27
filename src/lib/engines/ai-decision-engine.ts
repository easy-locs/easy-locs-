/**
 * AI DECISION ENGINE (Phase 2)
 * Reads UnifiedEngineReport → generates prioritized decisions → executes safe ones.
 */

import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import type { UnifiedEngineReport, EngineModule } from "./unified-global-engine";

// ─── Types ───────────────────────────────────────────────────

export type DecisionPriority = "critical" | "high" | "medium" | "low";

export type DecisionType =
  | "ux_fix"
  | "payment_boost"
  | "lead_inject"
  | "wallet_activate"
  | "orbit_engage"
  | "marketplace_improve"
  | "event_activate"
  | "revenue_boost";

export interface AIDecision {
  id: string;
  type: DecisionType;
  module: EngineModule;
  reason: string;
  expectedImpact: string;
  priority: DecisionPriority;
  impactScore: number; // 0-100
  autoExecute: boolean;
  action: DecisionAction;
}

export interface DecisionAction {
  actionType: string;
  payload: Record<string, unknown>;
}

export interface DecisionResult {
  decisions: AIDecision[];
  executed: AIDecision[];
  flagged: AIDecision[];
  totalImpact: number;
}

// ─── Decision Generation ─────────────────────────────────────

function generateUxDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { uxQuality } = report.scores;

  if (uxQuality < 70) {
    const overflows = report.issues.filter(i => i.type === "horizontal_overflow");
    if (overflows.length > 0) {
      decisions.push({
        id: `dec_ux_overflow_${Date.now()}`,
        type: "ux_fix",
        module: "ux_quality",
        reason: `UX score ${uxQuality}/100 — ${overflows.length} overflow issues detected`,
        expectedImpact: "Fix layout overflow to improve visual quality +15 points",
        priority: "high",
        impactScore: 85,
        autoExecute: true,
        action: { actionType: "fix_overflow", payload: { count: overflows.length } },
      });
    }

    const truncations = report.issues.filter(i => i.type === "text_truncation");
    if (truncations.length > 3) {
      decisions.push({
        id: `dec_ux_trunc_${Date.now()}`,
        type: "ux_fix",
        module: "ux_quality",
        reason: `${truncations.length} text truncation issues on ${report.issues[0]?.route}`,
        expectedImpact: "Improve text readability and reduce user confusion",
        priority: "medium",
        impactScore: 60,
        autoExecute: false,
        action: { actionType: "flag_truncation", payload: { routes: [...new Set(truncations.map(t => t.route))] } },
      });
    }

    const missingCta = report.issues.filter(i => i.type === "missing_primary_cta");
    if (missingCta.length > 0) {
      decisions.push({
        id: `dec_ux_cta_${Date.now()}`,
        type: "ux_fix",
        module: "ux_quality",
        reason: "No primary CTA above fold — high conversion risk",
        expectedImpact: "Adding CTA could improve conversion by 20-35%",
        priority: "critical",
        impactScore: 92,
        autoExecute: false,
        action: { actionType: "inject_primary_cta", payload: { route: missingCta[0].route } },
      });
    }
  }

  return decisions;
}

function generatePaymentDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { paymentConversion } = report.scores;

  if (paymentConversion < 80) {
    decisions.push({
      id: `dec_pay_boost_${Date.now()}`,
      type: "payment_boost",
      module: "payment_conversion",
      reason: `Payment conversion score ${paymentConversion}/100 — below 80 threshold`,
      expectedImpact: "Highlight pay button and reduce checkout steps",
      priority: "high",
      impactScore: 88,
      autoExecute: true,
      action: { actionType: "boost_pay_visibility", payload: { currentScore: paymentConversion } },
    });
  }

  return decisions;
}

function generateLeadDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { leadConversion } = report.scores;

  if (leadConversion < 80) {
    decisions.push({
      id: `dec_lead_inject_${Date.now()}`,
      type: "lead_inject",
      module: "lead_conversion",
      reason: `Lead conversion score ${leadConversion}/100 — contact CTAs missing or weak`,
      expectedImpact: "Inject contact CTA on listing pages to capture leads",
      priority: "high",
      impactScore: 82,
      autoExecute: true,
      action: { actionType: "inject_contact_cta", payload: { score: leadConversion } },
    });
  }

  return decisions;
}

function generateWalletDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { walletUsage } = report.scores;

  if (walletUsage < 70) {
    decisions.push({
      id: `dec_wallet_cashback_${Date.now()}`,
      type: "wallet_activate",
      module: "wallet_optimization",
      reason: `Wallet usage at ${walletUsage}/100 — below activation threshold`,
      expectedImpact: "Show cashback incentive + quick-pay CTA to boost wallet adoption",
      priority: "medium",
      impactScore: 72,
      autoExecute: true,
      action: { actionType: "show_wallet_incentive", payload: { incentiveType: "cashback", walletScore: walletUsage } },
    });
  }

  return decisions;
}

function generateOrbitDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { orbitEngagement } = report.scores;

  if (orbitEngagement < 60) {
    decisions.push({
      id: `dec_orbit_engage_${Date.now()}`,
      type: "orbit_engage",
      module: "orbit_actions",
      reason: `Orbit engagement at ${orbitEngagement}/100 — users not interacting`,
      expectedImpact: "Trigger smart message prompts and highlight unread chats",
      priority: "medium",
      impactScore: 65,
      autoExecute: true,
      action: { actionType: "trigger_orbit_prompt", payload: { engagementScore: orbitEngagement } },
    });
  }

  return decisions;
}

function generateEventDecisions(report: UnifiedEngineReport): AIDecision[] {
  return report.activeEvents.map(event => ({
    id: `dec_event_${event.eventKey}_${Date.now()}`,
    type: "event_activate" as DecisionType,
    module: "digital_content" as EngineModule,
    reason: `${event.eventName} is active in ${event.country}`,
    expectedImpact: `Apply ${event.eventName} theme, banners, and boost related listings`,
    priority: "high" as DecisionPriority,
    impactScore: 90,
    autoExecute: true,
    action: {
      actionType: "activate_event_mode",
      payload: {
        eventKey: event.eventKey,
        eventName: event.eventName,
        country: event.country,
        bannerConfig: event.bannerConfig,
        modules: event.activatedModules,
      },
    },
  }));
}

function generateMarketplaceDecisions(report: UnifiedEngineReport): AIDecision[] {
  const decisions: AIDecision[] = [];
  const { marketplaceHealth } = report.scores;

  if (marketplaceHealth < 75) {
    decisions.push({
      id: `dec_mkt_improve_${Date.now()}`,
      type: "marketplace_improve",
      module: "marketplace_quality",
      reason: `Marketplace health at ${marketplaceHealth}/100 — weak listings detected`,
      expectedImpact: "Flag listings missing photos/descriptions for improvement",
      priority: "medium",
      impactScore: 70,
      autoExecute: false,
      action: { actionType: "flag_weak_listings", payload: { healthScore: marketplaceHealth } },
    });
  }

  return decisions;
}

// ─── Decision Execution ──────────────────────────────────────

function executeDecision(decision: AIDecision): boolean {
  try {
    switch (decision.action.actionType) {
      case "fix_overflow":
        document.documentElement.style.overflowX = "hidden";
        return true;

      case "boost_pay_visibility":
        document.querySelectorAll("[data-pay], button").forEach(el => {
          if (!(el instanceof HTMLElement)) return;
          const text = el.textContent?.toLowerCase() || "";
          if (text.includes("pay") || text.includes("confirm")) {
            el.style.transform = "scale(1.05)";
            el.style.boxShadow = "0 0 20px hsl(var(--primary) / 0.4)";
          }
        });
        return true;

      case "inject_contact_cta":
      case "show_wallet_incentive":
      case "trigger_orbit_prompt":
      case "activate_event_mode":
        // These emit events for UI consumers to react
        eventBus.emit("AI_DECISION_EXECUTED", {
          decisionId: decision.id,
          type: decision.type,
          action: decision.action,
        });
        return true;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ─── Persistence ─────────────────────────────────────────────

async function persistDecisions(decisions: AIDecision[], executed: AIDecision[]) {
  const db = supabase as any;
  const rows = decisions.map(d => ({
    decision_type: d.type,
    module: d.module,
    reason: d.reason,
    priority: d.priority,
    impact_score: d.impactScore,
    auto_execute: d.autoExecute,
    executed: executed.some(e => e.id === d.id),
    executed_at: executed.some(e => e.id === d.id) ? new Date().toISOString() : null,
    context_json: { action: d.action, expectedImpact: d.expectedImpact },
  }));

  if (rows.length > 0) {
    try {
      await db.from("ai_decision_logs").insert(rows);
    } catch {}
  }
}

// ─── Main Runner ─────────────────────────────────────────────

export function runAIDecisionEngine(report: UnifiedEngineReport): DecisionResult {
  // Generate all decisions
  const allDecisions = [
    ...generateUxDecisions(report),
    ...generatePaymentDecisions(report),
    ...generateLeadDecisions(report),
    ...generateWalletDecisions(report),
    ...generateOrbitDecisions(report),
    ...generateEventDecisions(report),
    ...generateMarketplaceDecisions(report),
  ].sort((a, b) => b.impactScore - a.impactScore);

  // Execute auto-executable decisions
  const executed: AIDecision[] = [];
  const flagged: AIDecision[] = [];

  for (const decision of allDecisions) {
    if (decision.autoExecute) {
      const success = executeDecision(decision);
      if (success) {
        executed.push(decision);
        eventBus.emit("AI_DECISION_MADE", {
          decisionId: decision.id,
          type: decision.type,
          priority: decision.priority,
          autoExecuted: true,
        });
      }
    } else {
      flagged.push(decision);
      eventBus.emit("AI_DECISION_MADE", {
        decisionId: decision.id,
        type: decision.type,
        priority: decision.priority,
        autoExecuted: false,
      });
    }
  }

  const totalImpact = allDecisions.reduce((s, d) => s + d.impactScore, 0);

  // Persist async — fire and forget
  persistDecisions(allDecisions, executed);

  return { decisions: allDecisions, executed, flagged, totalImpact };
}
