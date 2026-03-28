/**
 * Billing Repository — All edge function calls for Billing page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createCheckoutSession(priceId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
  if (error) throw error;
  return data?.url;
}

export async function openCustomerPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("customer-portal");
  if (error) throw error;
  return data?.url;
}

export async function signOut() {
  await supabase.auth.signOut();
}
