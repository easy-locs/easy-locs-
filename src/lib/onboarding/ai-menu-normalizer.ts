/**
 * AI-powered merchant menu normalizer client.
 */
import { supabase } from "@/integrations/supabase/client";

export async function normalizeMenuWithAI(items: any[]) {
  const { data, error } = await supabase.functions.invoke("normalize-merchant-menu", {
    body: { items },
  });

  if (error) throw error;

  try {
    return JSON.parse(data?.result ?? "[]");
  } catch {
    return [];
  }
}
