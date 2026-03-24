/**
 * CRM REACTIVATION ENGINE
 * Detects inactive users, abandoned carts, reorder opportunities.
 * Outputs notification/prompt candidates for bringing users back.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ReactivationCandidate {
  type: "abandoned_cart" | "inactive_customer" | "reorder_opportunity" | "loyalty_nudge";
  entityId: string;
  userId?: string;
  reason: string;
  suggestedAction: string;
  priority: number;
}

export interface CrmReactivationReport {
  candidates: ReactivationCandidate[];
  abandonedCarts: number;
  inactiveCustomers: number;
  reorderOpportunities: number;
  computedAt: string;
}

export async function runCrmReactivationEngine(): Promise<CrmReactivationReport> {
  const candidates: ReactivationCandidate[] = [];

  try {
    // 1. Abandoned carts (last 48h, not converted)
    const twoDaysAgo = new Date(Date.now() - 48 * 3600_000).toISOString();
    const { data: carts } = await (supabase as any)
      .from("abandoned_cart_events")
      .select("id, customer_user_id, subtotal, item_count, status")
      .eq("status", "abandoned")
      .gte("created_at", twoDaysAgo)
      .is("converted_at", null)
      .limit(50);

    if (carts?.length) {
      for (const cart of carts) {
        candidates.push({
          type: "abandoned_cart",
          entityId: cart.id,
          userId: cart.customer_user_id,
          reason: `Cart with ${cart.item_count || 0} items worth ${cart.subtotal || 0}`,
          suggestedAction: "send_reminder_notification",
          priority: 80,
        });
      }
    }

    // 2. Count metrics
    const abandonedCarts = carts?.length || 0;

    return {
      candidates,
      abandonedCarts,
      inactiveCustomers: 0, // Future: detect from order history
      reorderOpportunities: 0, // Future: detect repeat patterns
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[crm-reactivation] Error:", err);
    return { candidates: [], abandonedCarts: 0, inactiveCustomers: 0, reorderOpportunities: 0, computedAt: new Date().toISOString() };
  }
}
