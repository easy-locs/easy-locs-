/**
 * Merchant Visibility Engine — boost/penalize based on operational state.
 */
import type { ArbitrationInput, ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function arbitrateMerchantVisibility(input: ArbitrationInput): ArbitrationDecision[] {
  const decisions: ArbitrationDecision[] = [];

  for (const m of input.merchants) {
    if (!m.accepting_orders && m.is_open_now) {
      decisions.push({
        module: "merchant", action: "lower_visibility",
        merchantId: m.merchant_id, newScore: -20,
        reason: "Open but not accepting orders",
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }

    if (m.prep_time_minutes > 45) {
      decisions.push({
        module: "merchant", action: "lower_visibility",
        merchantId: m.merchant_id, newScore: -15,
        reason: `Prep time ${m.prep_time_minutes}min exceeds 45min threshold`,
        priority: DecisionPriority.CUSTOMER_PROMISE,
      });
    }

    if (m.queue_load > 0.9 && m.active_orders_count > 10) {
      decisions.push({
        module: "merchant", action: "lower_visibility",
        merchantId: m.merchant_id, newScore: -10,
        reason: `Queue overloaded (${(m.queue_load * 100).toFixed(0)}% load, ${m.active_orders_count} orders)`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
    }

    if (m.delivery_capacity_score < 0.2 && m.active_delivery_jobs_count > 3) {
      decisions.push({
        module: "merchant", action: "hide_merchant",
        merchantId: m.merchant_id,
        reason: `Delivery capacity exhausted (score ${m.delivery_capacity_score.toFixed(2)})`,
        priority: DecisionPriority.OPERATIONAL_TRUTH,
      });
    }

    if (m.prep_time_minutes <= 10 && m.queue_load < 0.4 && m.delivery_capacity_score > 0.8) {
      decisions.push({
        module: "merchant", action: "boost_visibility",
        merchantId: m.merchant_id, boostScore: 15,
        reason: "Fast prep, low queue, high capacity",
        priority: DecisionPriority.GROWTH,
      });
    }
  }

  return decisions;
}
