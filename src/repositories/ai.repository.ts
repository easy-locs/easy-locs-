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
