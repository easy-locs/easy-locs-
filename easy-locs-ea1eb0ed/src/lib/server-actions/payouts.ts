import { supabase } from "@/integrations/supabase/client";

export async function serverCreatePayoutRequest(input: {
  amount: number;
  currency: string;
  destinationType?: string;
  destinationRef?: string;
  note?: string;
}) {
  const { data, error } = await supabase.functions.invoke("payout-request-create", {
    body: input,
  });
  if (error) throw error;
  return data;
}
