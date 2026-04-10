import { supabase } from "@/integrations/supabase/client";

export async function computePlatformRevenue(params: {
  start: string;
  end: string;
}) {
  const { data } = await supabase
    .from("wallet_ledger_entries")
    .select("*")
    .eq("entry_type", "fee")
    .gte("created_at", params.start)
    .lte("created_at", params.end);

  const total = (data as any[] ?? []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  return total;
}

export async function triggerMerchantPayout(params: {
  merchantId: string;
  amount: number;
}) {
  return supabase.from("approval_queues").insert({
    queue_name: "payout",
    entity_type: "merchant",
    entity_id: params.merchantId,
    approval_type: "release",
    payload: { amount: params.amount },
  });
}
