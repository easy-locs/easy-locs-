import { supabase } from "@/integrations/supabase/client";

export async function activateManyMerchants(merchantIds: string[]) {
  if (!merchantIds.length) return [];

  const { data, error } = await (supabase as any)
    .from("seed_merchants")
    .update({
      is_active: true,
      is_open: true,
      onboarding_status: "ready",
      updated_at: new Date().toISOString(),
    })
    .in("id", merchantIds)
    .select("*");

  if (error) throw error;
  return data ?? [];
}
