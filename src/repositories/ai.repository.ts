/**
 * ai.repository — AI edge function invocations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function invokeAIAssistant(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ai-assistant", { body });
  if (error) throw error;
  return data;
}

export async function invokeRunScheduledAudit() {
  const { data, error } = await supabase.functions.invoke("run-scheduled-audit", { body: {} });
  if (error) throw error;
  return data;
}

export async function invokeGenerateCV(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("generate-cv", { body });
  if (error) throw error;
  return data;
}

export async function invokeTranslateMessage(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("translate-message", { body });
  if (error) throw error;
  return data;
}

export async function invokeSendEmail(body: Record<string, any>) {
  const { error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
}

export async function invokeLeaseWorkflow(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("lease-workflow", { body });
  if (error) throw error;
  return data;
}

export async function invokeCheckSubscription() {
  const { data, error } = await supabase.functions.invoke("check-subscription");
  if (error) throw error;
  return data;
}

export async function invokeConciergePayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-concierge-payment", { body });
  if (error) throw error;
  return data;
}

export async function invokeCreateBookingPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-booking-payment", { body });
  if (error) throw error;
  return data;
}
