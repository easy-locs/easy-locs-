/**
 * subscription.repository — Subscription check via edge function.
 */
import { db as supabase } from "@/services/db";

export async function checkSubscription() {
  const { data, error } = await supabase.functions.invoke("check-subscription");
  if (error) throw error;
  return data;
}
