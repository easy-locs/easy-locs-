/**
 * payment-providers.repository — DB operations for PaymentProvidersSettings.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrgPaymentSettings(orgId: string) {
  const { data } = await supabase
    .from("orgs")
    .select("paypal_email, default_payment_provider, stripe_account_id, stripe_onboarding_complete, country, bank_holder_name, bank_iban, bank_bic, bank_name, payment_link_url")
    .eq("id", orgId)
    .single();
  return data as any;
}

export async function checkConnectStatus() {
  const { data } = await supabase.functions.invoke("check-connect-status");
  return data;
}

export async function createConnectAccount() {
  const { data, error } = await supabase.functions.invoke("create-connect-account");
  if (error) throw error;
  return data;
}

export async function disconnectStripe() {
  const { data, error } = await supabase.functions.invoke("disconnect-stripe");
  if (error) throw error;
  return data;
}

export async function savePaymentSettings(orgId: string, settings: Record<string, any>) {
  await supabase.from("orgs").update(settings as any).eq("id", orgId);
}
