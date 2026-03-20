import { supabase } from "@/integrations/supabase/client";

export async function serverApprovePayoutRequest(input: {
  payoutRequestId: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-payout-approve", {
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function serverRejectPayoutRequest(input: {
  payoutRequestId: string;
  reason?: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-payout-reject", {
    body: input,
  });
  if (error) throw error;
  return data;
}
