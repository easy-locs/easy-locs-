/**
 * Compliance / AML Engine — Monitors suspicious transactions and flags high-risk activity.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const HIGH_AMOUNT_THRESHOLD = 5000;
const RAPID_TX_COUNT = 10;
const RAPID_TX_WINDOW_MIN = 30;

export async function runComplianceScan(limit = 100) {
  const windowCutoff = new Date(Date.now() - RAPID_TX_WINDOW_MIN * 60_000).toISOString();

  // High-value transactions
  const { data: highValue } = await db
    .from("wallet_ledger_entries")
    .select("id, wallet_id, amount, direction, created_at")
    .gte("amount", HIGH_AMOUNT_THRESHOLD)
    .gte("created_at", windowCutoff)
    .limit(limit);

  let flagged = 0;
  for (const tx of highValue ?? []) {
    await db.from("aml_events").insert({
      event_type: "high_value_transaction",
      severity: "high",
      entity_type: "wallet_ledger_entry",
      entity_id: tx.id,
      user_id: null,
      score: Number(tx.amount),
      status: "pending",
      metadata_json: { amount: tx.amount, direction: tx.direction },
    });
    flagged++;
  }

  return { scanned: highValue?.length ?? 0, flagged };
}
