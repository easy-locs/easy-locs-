/**
 * subscription.repository — Subscription check via edge function.
 */
import { supabase } from "@/integrations/supabase/client";

export async function checkSubscription() {
  const { data, error } = await supabase.functions.invoke("check-subscription");
  if (error) throw error;
  return data;
}
