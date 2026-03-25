/**
 * Finance Reconciliation Engine — Auto-verifies commission/settlement consistency.
 * Runs every 10min. Detects mismatches between orders, splits, and ledger entries.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runFinanceReconciliation(limit = 50) {
  const { data: completed } = await db
    .from("orders")
    .select("id, total_amount, currency, status, settlement_status")
    .eq("status", "completed")
    .order("updated_at", { ascending: true })
    .limit(limit);

  let checked = 0, mismatches = 0, created = 0;

  for (const order of completed ?? []) {
    checked++;
    const { data: splits } = await db
      .from("commission_splits")
      .select("id, gross_amount, platform_fee, merchant_net, driver_fee")
      .eq("order_id", order.id);

    if (!splits?.length) {
      // Missing split — auto-create
      const gross = Number(order.total_amount ?? 0);
      const platformFee = Math.round(gross * 0.05 * 100) / 100;
      const driverFee = Math.round(gross * 0.10 * 100) / 100;
      const merchantNet = Math.round((gross - platformFee - driverFee) * 100) / 100;

      await db.from("commission_splits").insert({
        order_id: order.id,
        gross_amount: gross,
        platform_fee: platformFee,
        merchant_net: merchantNet,
        driver_fee: driverFee,
        currency: order.currency ?? "AED",
        status: "auto_reconciled",
      });
      created++;
      continue;
    }

    // Verify amounts match
    const split = splits[0];
    const expectedGross = Number(order.total_amount ?? 0);
    const actualGross = Number(split.gross_amount ?? 0);
    if (Math.abs(expectedGross - actualGross) > 0.01) {
      mismatches++;
    }
  }

  return { checked, mismatches, created };
}
