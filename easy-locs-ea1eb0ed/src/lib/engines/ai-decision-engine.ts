import type { UnifiedEngineReport } from "./unified-global-engine";

export interface Decision {
  id: string;
  module: string;
  action: string;
  reason: string;
  priority: number;
  autoExecute: boolean;
}

export interface DecisionResult {
  decisions: Decision[];
  confidence: number;
  executed: Decision[];
}

export function runAIDecisionEngine(report: UnifiedEngineReport): DecisionResult {
  const decisions: Decision[] = [];
  const executed: Decision[] = [];
  const now = Date.now();

  if (report.scores.uxQuality < 70) {
    decisions.push({
      id: `dec_ux_${now}`,
      module: "ux_quality",
      action: "trigger_layout_audit",
      reason: `UX score ${report.scores.uxQuality} below threshold (70)`,
      priority: 90,
      autoExecute: false,
    });
  }

  if (report.scores.paymentConversion < 80) {
    decisions.push({
      id: `dec_pay_${now}`,
      module: "payment_conversion",
      action: "simplify_checkout_flow",
      reason: `Payment conversion score ${report.scores.paymentConversion} — friction detected`,
      priority: 85,
      autoExecute: false,
    });
  }

  if (report.scores.walletUsage < 60) {
    const d: Decision = {
      id: `dec_wallet_${now}`,
      module: "wallet_optimization",
      action: "activate_cashback_incentive",
      reason: `Wallet usage ${report.scores.walletUsage}% — incentives needed`,
      priority: 70,
      autoExecute: true,
    };
    decisions.push(d);
    executed.push(d);
  }

  if (report.scores.orbitEngagement < 50) {
    const d: Decision = {
      id: `dec_orbit_${now}`,
      module: "orbit_actions",
      action: "send_reengagement_prompt",
      reason: `Orbit engagement ${report.scores.orbitEngagement}% — re-engagement needed`,
      priority: 75,
      autoExecute: true,
    };
    decisions.push(d);
    executed.push(d);
  }

  if (report.scores.marketplaceHealth < 70) {
    decisions.push({
      id: `dec_mkt_${now}`,
      module: "marketplace_quality",
      action: "flag_low_quality_listings",
      reason: `Marketplace health ${report.scores.marketplaceHealth} — quality sweep needed`,
      priority: 65,
      autoExecute: false,
    });
  }

  for (const event of report.activeEvents) {
    const d: Decision = {
      id: `dec_event_${event.eventKey}_${now}`,
      module: "digital_content",
      action: "activate_seasonal_campaign",
      reason: `${event.eventName} active in ${event.country} — campaign auto-activated`,
      priority: 80,
      autoExecute: true,
    };
    decisions.push(d);
    executed.push(d);
  }

  const confidence = Math.min(
    100,
    Math.round(report.scores.overallHealth * 0.6 + (decisions.length > 0 ? 30 : 0) + 10)
  );

  return {
    decisions: decisions.sort((a, b) => b.priority - a.priority),
    confidence,
    executed,
  };
}
